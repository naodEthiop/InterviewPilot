import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { captainAskQuestionStream, parseCaptainResponse } from "../agents/captain.js";
import { generateReportStream, parseReportResponse } from "../agents/report.js";
import { env } from "../config/env.js";
import { createUserClient } from "../db/supabase.js";
import type { AuthVariables } from "../middleware/auth.js";
import { InterviewService } from "../services/interview.service.js";
import { jsonError, jsonSuccess } from "../utils/response.js";

type AuthedContext = Context<{ Variables: AuthVariables }>;

const startSchema = z.object({
  role: z.string().min(1).max(120),
  title: z.string().max(200).optional(),
});

const answerSchema = z.object({
  interviewId: z.string().uuid(),
  answer: z.string().min(1).max(10000),
});

const endSchema = z.object({
  interviewId: z.string().uuid(),
});

function interviewService(c: AuthedContext): InterviewService {
  return new InterviewService(createUserClient(c.get("accessToken")));
}

export async function startInterview(c: AuthedContext) {
  const body = await c.req.json();
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(c, parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const userId = c.get("userId");
  const result = await interviewService(c).startInterview({
    userId,
    role: parsed.data.role,
    title: parsed.data.title,
  });

  return jsonSuccess(
    c,
    result,
    "Interview started. Captain has your first question."
  );
}

export async function submitAnswer(c: AuthedContext) {
  const body = await c.req.json();
  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(c, parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const userId = c.get("userId");
  const result = await interviewService(c).submitAnswer({
    userId,
    interviewId: parsed.data.interviewId,
    answerText: parsed.data.answer,
  });

  return jsonSuccess(c, result, "Answer evaluated. Next question ready.");
}

export async function endInterview(c: AuthedContext) {
  const body = await c.req.json();
  const parsed = endSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(c, parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const userId = c.get("userId");
  const result = await interviewService(c).endInterview({
    userId,
    interviewId: parsed.data.interviewId,
  });

  return jsonSuccess(c, result, "Interview complete. Report generated.");
}

export async function getHistory(c: AuthedContext) {
  const userId = c.get("userId");
  const history = await interviewService(c).getInterviewHistory(userId);
  return jsonSuccess(c, { interviews: history });
}

export async function getInterview(c: AuthedContext) {
  const interviewId = c.req.param("id");
  if (!interviewId) {
    return jsonError(c, "Interview ID required");
  }

  const userId = c.get("userId");
  const detail = await interviewService(c).getInterviewDetail(userId, interviewId);
  return jsonSuccess(c, detail);
}

/** SSE stream for Captain generating next question (demo-friendly) */
export async function streamCaptainQuestion(c: AuthedContext) {
  const interviewId = c.req.query("interviewId");
  const role = c.req.query("role") ?? "Software Engineer";

  if (!interviewId) {
    return jsonError(c, "interviewId query param required");
  }

  const userId = c.get("userId");
  const detail = await interviewService(c).getInterviewDetail(userId, interviewId);
  const turns = detail.questions
    .filter((q) => q.answer)
    .map((q) => ({
      question: q.text,
      answer: q.answer!.text,
      evaluation: q.answer!.evaluation ?? undefined,
    }));

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({ event: "start", data: JSON.stringify({ agent: "captain" }) });

    let fullText = "";
    for await (const chunk of captainAskQuestionStream({
      role: detail.interview.role || role,
      title: detail.interview.title,
      turns,
      isFirstQuestion: turns.length === 0,
    })) {
      if (chunk.type === "text" && chunk.text) {
        fullText += chunk.text;
        await stream.writeSSE({ event: "chunk", data: JSON.stringify({ text: chunk.text }) });
      } else if (chunk.type === "error") {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ message: chunk.error }),
        });
        return;
      } else if (chunk.type === "done" && chunk.result) {
        fullText = chunk.result.text;
      }
    }

    try {
      const parsed = parseCaptainResponse(fullText);
      await stream.writeSSE({ event: "complete", data: JSON.stringify(parsed) });
    } catch {
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ message: "Failed to parse Captain response" }),
      });
    }
  });
}

/** SSE stream for Report Agent */
export async function streamReport(c: AuthedContext) {
  const interviewId = c.req.query("interviewId");
  if (!interviewId) {
    return jsonError(c, "interviewId query param required");
  }

  const userId = c.get("userId");
  const detail = await interviewService(c).getInterviewDetail(userId, interviewId);
  const turns = detail.questions
    .filter((q) => q.answer)
    .map((q) => ({
      question: q.text,
      answer: q.answer!.text,
      evaluation: q.answer!.evaluation ?? undefined,
    }));

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({ event: "start", data: JSON.stringify({ agent: "report" }) });

    let fullText = "";
    for await (const chunk of generateReportStream({
      role: detail.interview.role,
      title: detail.interview.title,
      turns,
    })) {
      if (chunk.type === "text" && chunk.text) {
        fullText += chunk.text;
        await stream.writeSSE({ event: "chunk", data: JSON.stringify({ text: chunk.text }) });
      } else if (chunk.type === "error") {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ message: chunk.error }),
        });
        return;
      } else if (chunk.type === "done" && chunk.result) {
        fullText = chunk.result.text;
      }
    }

    try {
      const parsed = parseReportResponse(fullText);
      await stream.writeSSE({ event: "complete", data: JSON.stringify(parsed) });
    } catch {
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ message: "Failed to parse report" }),
      });
    }
  });
}

export async function healthCheck(c: Context) {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true });

  return jsonSuccess(c, {
    status: "ok",
    database: error ? "degraded" : "connected",
    supabaseProject: "ivoyhrmpojvyersxbmoo",
    agents: ["captain", "evaluator", "report"],
    cursorConfigured: Boolean(env.CURSOR_API_KEY && env.CURSOR_API_KEY !== "REPLACE_ME"),
  });
}
