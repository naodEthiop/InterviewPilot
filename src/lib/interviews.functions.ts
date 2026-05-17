import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cursorText, cursorStructured } from "@/lib/cursor-llm";
import { z } from "zod";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type ProfileInsert = TablesInsert<"profiles">;
type ProfileUpdate = TablesUpdate<"profiles">;

/** Persisted on interviews.questions JSONB */
export type InterviewQuestionsBlob = {
  opening?: string;
  list?: string[];
  voice_gender?: string;
  time_limit_seconds?: number;
  run_mode?: "practice" | "real";
  integrity_flags?: Array<{
    kind: "tab_switch" | "fullscreen_exit" | "blocked_paste" | "blocked_devtools";
    at: string;
  }>;
  end_reason?: "completed" | "time_up" | "forfeit";
};

function asQuestionsBlob(q: unknown): InterviewQuestionsBlob {
  return q && typeof q === "object" && !Array.isArray(q) ? (q as InterviewQuestionsBlob) : {};
}

function mergeQuestions(q: unknown, patch: Partial<InterviewQuestionsBlob>): InterviewQuestionsBlob {
  return { ...asQuestionsBlob(q), ...patch };
}

const TIME_LIMIT_SECONDS = [900, 1800, 2700, 3600] as const;

/* ============ RESUME ANALYSIS ============ */

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { resumeId: string; rawText: string }) =>
    z.object({ resumeId: z.string().uuid(), rawText: z.string().min(20).max(50000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const analysisSchema = z.object({
      summary: z.string(),
      skills: z.array(z.string()).max(20),
      weaknesses: z.array(z.string()).max(8),
    });

    const analysis = await cursorStructured(
      `Analyze this resume and extract a concise candidate brief.
- summary: 2-3 sentence professional summary of this candidate.
- skills: technical and soft skills extracted (max 20).
- weaknesses: likely interview-relevant gaps or weaknesses (max 8).

RESUME:
${data.rawText}`,
      analysisSchema,
      { system: "You are a senior technical recruiter." },
    );

    const { data: resume, error } = await supabase
      .from("resumes")
      .update({
        raw_text: data.rawText,
        extracted_skills: analysis.skills,
        weaknesses: analysis.weaknesses,
        summary: analysis.summary,
      })
      .eq("id", data.resumeId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return resume;
  });

/* ============ INTERVIEW: CREATE + QUESTIONS ============ */

const INTERVIEW_MODES = ["hr", "technical", "behavioral", "system_design"] as const;
const PERSONAS = ["friendly", "strict", "faang", "founder"] as const;
const VOICE_GENDERS = ["male", "female"] as const;

export const createInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    mode: (typeof INTERVIEW_MODES)[number];
    role: string;
    persona: (typeof PERSONAS)[number];
    difficulty: "easy" | "medium" | "hard";
    voiceGender?: (typeof VOICE_GENDERS)[number];
    resumeId?: string;
    timeLimitSeconds?: (typeof TIME_LIMIT_SECONDS)[number];
    runMode?: "practice" | "real";
  }) =>
    z.object({
      mode: z.enum(INTERVIEW_MODES),
      role: z.string().min(1).max(100),
      persona: z.enum(PERSONAS),
      difficulty: z.enum(["easy", "medium", "hard"]),
      voiceGender: z.enum(VOICE_GENDERS).default("female"),
      resumeId: z.string().uuid().optional(),
      timeLimitSeconds: z
        .union([z.literal(900), z.literal(1800), z.literal(2700), z.literal(3600)])
        .default(1800),
      runMode: z.enum(["practice", "real"]).default("practice"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let resumeContext = "";
    if (data.resumeId) {
      const { data: r } = await supabase
        .from("resumes")
        .select("summary, extracted_skills, weaknesses")
        .eq("id", data.resumeId)
        .maybeSingle();
      if (r) {
        resumeContext = `\n\nCandidate context:\nSummary: ${r.summary}\nSkills: ${(r.extracted_skills ?? []).join(", ")}\nKnown gaps: ${(r.weaknesses ?? []).join(", ")}`;
      }
    }

    const planSchema = z.object({
      opening: z.string(),
      questions: z.array(z.string()).min(5).max(8),
    });

    const plan = await cursorStructured(
      `Design a ${data.difficulty} ${data.mode} interview for a ${data.role}. Persona: ${data.persona}.
- opening: a warm opening line the interviewer says first.
- questions: 5-8 sharp, role-specific questions, ordered.${resumeContext}`,
      planSchema,
      { system: "You are an interview designer for top tech recruiters." },
    );

    const { data: interview, error } = await supabase
      .from("interviews")
      .insert({
        user_id: userId,
        mode: data.mode,
        role: data.role,
        difficulty: data.difficulty,
        interviewer_persona: data.persona,
        resume_id: data.resumeId ?? null,
        questions: {
          opening: plan.opening,
          list: plan.questions,
          voice_gender: data.voiceGender,
          time_limit_seconds: data.timeLimitSeconds,
          run_mode: data.runMode,
        },
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return interview;
  });

/* ============ INTERVIEWER TURN (adaptive) ============ */

export const interviewerTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { interviewId: string; candidateMessage: string }) =>
    z.object({
      interviewId: z.string().uuid(),
      candidateMessage: z.string().min(1).max(8000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: interview } = await supabase
      .from("interviews")
      .select("*")
      .eq("id", data.interviewId)
      .eq("user_id", userId)
      .single();
    if (!interview) throw new Error("Interview not found");

    const qFull = mergeQuestions(interview.questions, {});
    const limitSec = qFull.time_limit_seconds ?? 1800;
    const started = interview.started_at ? new Date(interview.started_at).getTime() : Date.now();
    const elapsedSec = (Date.now() - started) / 1000;

    if (elapsedSec > limitSec) {
      const closing =
        "We're out of time. This concludes the interview. Thanks for your time.";
      await supabase.from("interview_messages").insert({
        interview_id: data.interviewId,
        user_id: userId,
        role: "candidate",
        content: data.candidateMessage,
      });
      await supabase.from("interview_messages").insert({
        interview_id: data.interviewId,
        user_id: userId,
        role: "interviewer",
        content: closing,
      });
      await supabase
        .from("interviews")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          questions: mergeQuestions(interview.questions, { end_reason: "time_up" }),
        })
        .eq("id", data.interviewId);
      return { reply: closing, done: true };
    }

    const { data: history } = await supabase
      .from("interview_messages")
      .select("role, content")
      .eq("interview_id", data.interviewId)
      .order("created_at", { ascending: true });

    await supabase.from("interview_messages").insert({
      interview_id: data.interviewId,
      user_id: userId,
      role: "candidate",
      content: data.candidateMessage,
    });

    const q = interview.questions as { opening: string; list: string[] };
    const transcript = (history ?? [])
      .map((m) => `${m.role === "interviewer" ? "INTERVIEWER" : "CANDIDATE"}: ${m.content}`)
      .join("\n");

    const personaTone: Record<string, string> = {
      friendly: "warm, encouraging, conversational",
      strict: "direct, exacting, minimal pleasantries, probe weak answers hard",
      faang: "FAANG-style: structured, deep-dive on trade-offs, follow up on every claim",
      founder: "scrappy startup founder energy, focused on ownership and impact",
    };

    const system = `You are conducting a ${interview.mode} interview for a ${interview.role} (${interview.difficulty}). Tone: ${personaTone[interview.interviewer_persona ?? "friendly"] ?? "professional"}.

Topics to cover (in roughly this order, but adapt):
${q.list.map((x, i) => `${i + 1}. ${x}`).join("\n")}

Rules:
- Output ONE thing only: your next spoken line. No stage directions, no quotes, no "Interviewer:" prefix.
- If the candidate's answer is shallow, ask a sharp follow-up before moving on.
- If they answered well, transition to the next topic naturally.
- Keep responses to 1-3 sentences. This is spoken aloud.
- If all topics covered, say a brief thank-you closing line containing the word "concludes".`;

    const text = await cursorText(
      `Conversation so far:\n${transcript}\nCANDIDATE: ${data.candidateMessage}\n\nYour next line:`,
      { system },
    );

    const reply = text.trim().replace(/^["']|["']$/g, "");

    await supabase.from("interview_messages").insert({
      interview_id: data.interviewId,
      user_id: userId,
      role: "interviewer",
      content: reply,
    });

    const done = /concludes/i.test(reply);
    if (done) {
      await supabase
        .from("interviews")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          questions: mergeQuestions(interview.questions, { end_reason: "completed" }),
        })
        .eq("id", data.interviewId);
    }

    return { reply, done };
  });

/* ============ START: OPENING LINE ============ */

export const startInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { interviewId: string }) =>
    z.object({ interviewId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: interview } = await supabase
      .from("interviews")
      .select("*")
      .eq("id", data.interviewId)
      .eq("user_id", userId)
      .single();
    if (!interview) throw new Error("Interview not found");

    const { data: existing } = await supabase
      .from("interview_messages")
      .select("id")
      .eq("interview_id", data.interviewId)
      .limit(1);

    if (existing && existing.length > 0) return { opening: (interview.questions as any).opening };

    const opening = (interview.questions as any).opening as string;
    await supabase.from("interview_messages").insert({
      interview_id: data.interviewId,
      user_id: userId,
      role: "interviewer",
      content: opening,
    });
    return { opening };
  });

/* ============ END / INTEGRITY ============ */

const INTEGRITY_KINDS = [
  "tab_switch",
  "fullscreen_exit",
  "blocked_paste",
  "blocked_devtools",
] as const;

export const flagInterviewIntegrity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    interviewId: string;
    kind: (typeof INTEGRITY_KINDS)[number];
  }) =>
    z
      .object({
        interviewId: z.string().uuid(),
        kind: z.enum(INTEGRITY_KINDS),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: interview } = await supabase
      .from("interviews")
      .select("questions")
      .eq("id", data.interviewId)
      .eq("user_id", userId)
      .single();
    if (!interview) throw new Error("Interview not found");

    const base = asQuestionsBlob(interview.questions);
    const flags = [...(base.integrity_flags ?? [])];
    flags.push({ kind: data.kind, at: new Date().toISOString() });
    const { error } = await supabase
      .from("interviews")
      .update({ questions: mergeQuestions(interview.questions, { integrity_flags: flags }) })
      .eq("id", data.interviewId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const endInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { interviewId: string; reason: "completed" | "time_up" | "forfeit" }) =>
    z
      .object({
        interviewId: z.string().uuid(),
        reason: z.enum(["completed", "time_up", "forfeit"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: interview } = await supabase
      .from("interviews")
      .select("questions")
      .eq("id", data.interviewId)
      .eq("user_id", userId)
      .single();
    if (!interview) throw new Error("Interview not found");

    const existing = asQuestionsBlob(interview.questions).end_reason;
    const reason =
      data.reason === "forfeit" || data.reason === "time_up"
        ? data.reason
        : existing === "time_up" || existing === "forfeit"
          ? existing
          : data.reason;

    const { error } = await supabase
      .from("interviews")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        questions: mergeQuestions(interview.questions, { end_reason: reason }),
      })
      .eq("id", data.interviewId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ MULTI-AGENT REPORT ============ */

export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { interviewId: string }) =>
    z.object({ interviewId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("reports")
      .select("*")
      .eq("interview_id", data.interviewId)
      .maybeSingle();
    if (existing) return existing;

    const { data: interview } = await supabase
      .from("interviews")
      .select("*")
      .eq("id", data.interviewId)
      .eq("user_id", userId)
      .single();
    if (!interview) throw new Error("Interview not found");

    const { data: msgs } = await supabase
      .from("interview_messages")
      .select("role, content")
      .eq("interview_id", data.interviewId)
      .order("created_at", { ascending: true });

    const transcript = (msgs ?? [])
      .map((m) => `${m.role === "interviewer" ? "INTERVIEWER" : "CANDIDATE"}: ${m.content}`)
      .join("\n");

    const qmeta = asQuestionsBlob(interview.questions);
    const integritySummary =
      (qmeta.integrity_flags ?? [])
        .map((f) => `${f.kind} at ${f.at}`)
        .join("; ") || "none";
    const sessionMeta = `SESSION CONTEXT (for scoring context only):
- Run mode: ${qmeta.run_mode ?? "practice"}
- Time limit (seconds): ${qmeta.time_limit_seconds ?? "unknown"}
- End reason: ${qmeta.end_reason ?? "unknown"}
- Integrity events: ${integritySummary}
`;

    const evaluatorSchema = z.object({
      overall_score: z.number().min(0).max(100),
      communication_score: z.number().min(0).max(100),
      technical_score: z.number().min(0).max(100),
      confidence_score: z.number().min(0).max(100),
      clarity_score: z.number().min(0).max(100),
      summary: z.string(),
    });

    const coachSchema = z.object({
      strengths: z.array(z.string()).max(5),
      weaknesses: z.array(z.string()).max(5),
      missed_opportunities: z.array(z.string()).max(5),
    });

    const reportSchema = z.object({
      ideal_answers: z
        .array(z.object({ question: z.string(), ideal: z.string() }))
        .max(4),
      improvement_roadmap: z.array(z.string()).min(3).max(6),
      recommendations: z
        .array(
          z.object({
            title: z.string(),
            type: z.enum(["course", "video", "exercise", "reading"]),
            note: z.string(),
          }),
        )
        .max(5),
    });

    const [evaluator, coach, reportAgent] = await Promise.all([
      cursorStructured(
        `${sessionMeta}
Score this ${interview.mode} interview for a ${interview.role} on a 0-100 scale. Be honest, not generous.
If the session ended due to time_up or forfeit, or integrity events indicate tab switches / leaving fullscreen, reflect that honestly in scores and summary (do not treat as a full completed interview).
- overall_score, communication_score, technical_score, confidence_score, clarity_score: integers 0-100.
- summary: 2-3 sentence overall verdict.

TRANSCRIPT:
${transcript}`,
        evaluatorSchema,
        { system: "You are the Evaluator Agent in a multi-agent interview review pipeline." },
      ),
      cursorStructured(
        `${sessionMeta}
Identify specific strengths, weaknesses, and missed opportunities from this interview. Be specific and quote where relevant.
Mention integrity / early termination in weaknesses if applicable.
- strengths: up to 5.
- weaknesses: up to 5.
- missed_opportunities: up to 5 things the candidate could have said but didn't.

TRANSCRIPT:
${transcript}`,
        coachSchema,
        { system: "You are the Coach Agent in a multi-agent interview review pipeline." },
      ),
      cursorStructured(
        `${sessionMeta}
Based on this interview, produce ideal answers for the weakest spots, a prioritized improvement roadmap, and concrete learning recommendations.
If the interview was cut short (time up / forfeit), prioritize recovery and honest practice advice.
- ideal_answers: for up to 4 weakest answers, give {question, ideal}.
- improvement_roadmap: 3-6 concrete next steps, ordered by priority.
- recommendations: up to 5 items, each {title, type: course|video|exercise|reading, note}.

TRANSCRIPT:
${transcript}`,
        reportSchema,
        { system: "You are the Report Agent in a multi-agent interview review pipeline." },
      ),
    ]);

    const { data: report, error } = await supabase
      .from("reports")
      .insert({
        interview_id: data.interviewId,
        user_id: userId,
        overall_score: Math.round(evaluator.overall_score),
        communication_score: Math.round(evaluator.communication_score),
        technical_score: Math.round(evaluator.technical_score),
        confidence_score: Math.round(evaluator.confidence_score),
        clarity_score: Math.round(evaluator.clarity_score),
        summary: evaluator.summary,
        strengths: coach.strengths,
        weaknesses: coach.weaknesses,
        missed_opportunities: coach.missed_opportunities,
        ideal_answers: reportAgent.ideal_answers,
        improvement_roadmap: reportAgent.improvement_roadmap,
        recommendations: reportAgent.recommendations,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const qAfter = asQuestionsBlob(interview.questions);
    const questionsPatch =
      qAfter.end_reason != null
        ? interview.questions
        : mergeQuestions(interview.questions, { end_reason: "completed" });

    await supabase
      .from("interviews")
      .update({
        status: "completed",
        completed_at: interview.completed_at ?? new Date().toISOString(),
        questions: questionsPatch as typeof interview.questions,
      })
      .eq("id", data.interviewId);

    return report;
  });

/* ============ QUERIES ============ */

export const listInterviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("interviews")
      .select("id, mode, role, status, interviewer_persona, difficulty, created_at, completed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("reports")
      .select("id, interview_id, overall_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const getInterviewBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { interviewId: string }) =>
    z.object({ interviewId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: interview }, { data: messages }, { data: report }] = await Promise.all([
      supabase.from("interviews").select("*").eq("id", data.interviewId).eq("user_id", userId).single(),
      supabase.from("interview_messages").select("*").eq("interview_id", data.interviewId).order("created_at"),
      supabase.from("reports").select("*").eq("interview_id", data.interviewId).maybeSingle(),
    ]);
    return { interview, messages: messages ?? [], report };
  });

export const listResumes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("resumes")
      .select("id, file_name, summary, extracted_skills, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const createResumeRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileName: string; filePath?: string }) =>
    z.object({ fileName: z.string().min(1).max(255), filePath: z.string().max(500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("resumes")
      .insert({ user_id: userId, file_name: data.fileName, file_path: data.filePath ?? null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ============ AGGREGATE LEARN ============ */

export const listAllRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("reports")
      .select("id, interview_id, recommendations, improvement_roadmap, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const recs: Array<{
      title: string;
      type: "course" | "video" | "exercise" | "reading";
      note: string;
      reportId: string;
      interviewId: string;
      createdAt: string;
    }> = [];
    const roadmap: Array<{ step: string; reportId: string; interviewId: string; createdAt: string }> = [];

    for (const row of data ?? []) {
      const list =
        (row.recommendations as Array<{
          title?: string;
          type?: string;
          note?: string;
        }> | null) ?? [];
      for (const r of list) {
        if (!r?.title) continue;
        recs.push({
          title: String(r.title),
          type: (r.type ?? "reading") as "course" | "video" | "exercise" | "reading",
          note: String(r.note ?? ""),
          reportId: row.id,
          interviewId: row.interview_id,
          createdAt: row.created_at,
        });
      }
      const rm = (row.improvement_roadmap ?? []) as string[];
      for (const step of rm) {
        roadmap.push({
          step: String(step),
          reportId: row.id,
          interviewId: row.interview_id,
          createdAt: row.created_at,
        });
      }
    }
    return { recommendations: recs, roadmap };
  });

/* ============ PROFILE ============ */

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, target_role, experience_level, skills, avatar_url, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  });

const EXPERIENCE_LEVELS = ["entry", "mid", "senior", "staff", "principal"] as const;

export const upsertProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    display_name?: string | null;
    target_role?: string | null;
    experience_level?: (typeof EXPERIENCE_LEVELS)[number] | null;
    skills?: string[] | null;
  }) =>
    z
      .object({
        display_name: z.string().max(120).optional().nullable(),
        target_role: z.string().max(120).optional().nullable(),
        experience_level: z.enum(EXPERIENCE_LEVELS).optional().nullable(),
        skills: z.array(z.string().max(60)).max(40).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: ProfileUpdate = {};
    if (data.display_name !== undefined && data.display_name !== null && data.display_name.trim())
      patch.display_name = data.display_name.trim();
    if (data.target_role !== undefined && data.target_role !== null && data.target_role.trim())
      patch.target_role = data.target_role.trim();
    if (data.experience_level !== undefined && data.experience_level !== null)
      patch.experience_level = data.experience_level;
    if (data.skills !== undefined && data.skills !== null)
      patch.skills = data.skills.filter((s) => s.trim().length > 0);

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { data: row, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const insertRow: ProfileInsert = { user_id: userId, ...patch };
    const { data: row, error } = await supabase
      .from("profiles")
      .insert(insertRow)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ============ RESUME DELETE ============ */

export const deleteResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { resumeId: string }) =>
    z.object({ resumeId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("resumes")
      .select("id, file_path")
      .eq("id", data.resumeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Resume not found");

    if (row.file_path) {
      await supabase.storage.from("resumes").remove([row.file_path]);
    }
    const { error } = await supabase
      .from("resumes")
      .delete()
      .eq("id", data.resumeId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ PDF RESUME INTAKE ============ */

export const uploadAndParseResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileBase64: string; fileName: string }) =>
    z
      .object({
        fileBase64: z.string().min(10),
        fileName: z.string().min(1).max(255),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const bytes = Buffer.from(data.fileBase64, "base64");
    if (bytes.length === 0) throw new Error("Empty file");
    if (bytes.length > 5 * 1024 * 1024) throw new Error("File exceeds 5MB limit");

    const head = bytes.subarray(0, 4).toString("utf8");
    if (head !== "%PDF") {
      throw new Error("File is not a PDF");
    }

    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "resume.pdf";
    const uid =
      (globalThis.crypto?.randomUUID?.() as string | undefined) ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storagePath = `${userId}/${uid}.pdf`;

    const { error: upErr } = await supabase.storage
      .from("resumes")
      .upload(storagePath, bytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    let rawText = "";
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const out = await extractText(pdf, { mergePages: true });
      rawText = Array.isArray(out.text) ? out.text.join("\n") : (out.text ?? "");
    } catch (err) {
      console.error("PDF parse error", err);
      throw new Error("Could not parse PDF. Try a text-based PDF, not a scan.");
    }

    const cleaned = rawText.replace(/\s+/g, " ").trim();
    if (cleaned.length < 200) {
      await supabase.storage.from("resumes").remove([storagePath]).catch(() => {});
      return {
        ok: false as const,
        reason: "low_text" as const,
        message:
          "We couldn't read enough text from that PDF — it may be a scan. Please upload a text-based PDF.",
      };
    }

    const { data: resumeRow, error: insErr } = await supabase
      .from("resumes")
      .insert({
        user_id: userId,
        file_name: safeName,
        file_path: storagePath,
        raw_text: cleaned.slice(0, 50000),
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    const extractedSchema = z.object({
      summary: z.string(),
      skills: z.array(z.string()).max(30),
      weaknesses: z.array(z.string()).max(8),
      full_name: z.string().nullable(),
      target_role: z.string().nullable(),
      experience_level: z.enum(EXPERIENCE_LEVELS).nullable(),
      years_experience: z.number().int().min(0).max(60).nullable(),
    });

    let extracted: z.infer<typeof extractedSchema> | null = null;
    try {
      extracted = await cursorStructured(
        `Analyze this resume.

- summary: 2-3 sentence professional summary.
- skills: technical and soft skills (max 30).
- weaknesses: likely interview-relevant gaps (max 8).
- full_name: candidate's full name, or null if not present.
- target_role: the role they're aiming for next based on their resume, or null.
- experience_level: one of entry, mid, senior, staff, principal, or null if unclear.
- years_experience: integer years of professional experience, or null.

RESUME:
${cleaned.slice(0, 30000)}`,
        extractedSchema,
        { system: "You are a senior technical recruiter extracting structured candidate data." },
      );
    } catch (err) {
      console.error("Resume analysis failed", err);
    }

    if (extracted) {
      await supabase
        .from("resumes")
        .update({
          summary: extracted.summary,
          extracted_skills: extracted.skills,
          weaknesses: extracted.weaknesses,
        })
        .eq("id", resumeRow.id)
        .eq("user_id", userId);
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("display_name, target_role, experience_level, skills")
      .eq("user_id", userId)
      .maybeSingle();

    if (extracted) {
      const profilePatch: ProfileUpdate = {};
      if (!existingProfile?.display_name && extracted.full_name)
        profilePatch.display_name = extracted.full_name;
      if (!existingProfile?.target_role && extracted.target_role)
        profilePatch.target_role = extracted.target_role;
      if (!existingProfile?.experience_level && extracted.experience_level)
        profilePatch.experience_level = extracted.experience_level;
      const existingSkills = existingProfile?.skills ?? [];
      if (existingSkills.length === 0 && extracted.skills.length > 0)
        profilePatch.skills = extracted.skills.slice(0, 30);

      if (Object.keys(profilePatch).length > 0) {
        if (existingProfile) {
          await supabase.from("profiles").update(profilePatch).eq("user_id", userId);
        } else {
          const insertRow: ProfileInsert = { user_id: userId, ...profilePatch };
          await supabase.from("profiles").insert(insertRow);
        }
      }
    }

    const finalProfile = {
      display_name:
        existingProfile?.display_name ?? extracted?.full_name ?? null,
      target_role: existingProfile?.target_role ?? extracted?.target_role ?? null,
      experience_level:
        existingProfile?.experience_level ?? extracted?.experience_level ?? null,
      skills:
        (existingProfile?.skills && existingProfile.skills.length > 0)
          ? existingProfile.skills
          : (extracted?.skills ?? []),
    };

    const missing = {
      target_role: !finalProfile.target_role,
      experience_level: !finalProfile.experience_level,
      skills: (finalProfile.skills ?? []).length < 3,
    };

    return {
      ok: true as const,
      resume: {
        id: resumeRow.id,
        file_name: resumeRow.file_name,
        summary: extracted?.summary ?? null,
        extracted_skills: extracted?.skills ?? [],
      },
      profile: finalProfile,
      missing,
    };
  });
