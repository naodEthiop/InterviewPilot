import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { generateText, Output } from "ai";
import { z } from "zod";

const MODEL = "google/gemini-3-flash-preview";

function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return createLovableAiGatewayProvider(key)(MODEL);
}

/* ============ RESUME ANALYSIS ============ */

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { resumeId: string; rawText: string }) =>
    z.object({ resumeId: z.string().uuid(), rawText: z.string().min(20).max(50000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { output } = await generateText({
      model: gateway(),
      output: Output.object({
        schema: z.object({
          summary: z.string().describe("2-3 sentence professional summary of this candidate"),
          skills: z.array(z.string()).max(20).describe("Technical and soft skills extracted"),
          weaknesses: z.array(z.string()).max(8).describe("Likely interview-relevant gaps or weaknesses"),
        }),
      }),
      prompt: `You are a senior technical recruiter. Analyze this resume and extract a concise candidate brief.\n\nRESUME:\n${data.rawText}`,
    });

    const { data: resume, error } = await supabase
      .from("resumes")
      .update({
        raw_text: data.rawText,
        extracted_skills: output.skills,
        weaknesses: output.weaknesses,
        summary: output.summary,
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

export const createInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    mode: (typeof INTERVIEW_MODES)[number];
    role: string;
    persona: (typeof PERSONAS)[number];
    difficulty: "easy" | "medium" | "hard";
    resumeId?: string;
  }) =>
    z.object({
      mode: z.enum(INTERVIEW_MODES),
      role: z.string().min(1).max(100),
      persona: z.enum(PERSONAS),
      difficulty: z.enum(["easy", "medium", "hard"]),
      resumeId: z.string().uuid().optional(),
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

    const { output } = await generateText({
      model: gateway(),
      output: Output.object({
        schema: z.object({
          opening: z.string().describe("Warm opening line the interviewer says first"),
          questions: z.array(z.string()).min(5).max(8).describe("Core questions to cover, ordered"),
        }),
      }),
      prompt: `You are designing a ${data.difficulty} ${data.mode} interview for a ${data.role}. Persona: ${data.persona}. Generate an opening line and 5-8 sharp, role-specific questions.${resumeContext}`,
    });

    const { data: interview, error } = await supabase
      .from("interviews")
      .insert({
        user_id: userId,
        mode: data.mode,
        role: data.role,
        difficulty: data.difficulty,
        interviewer_persona: data.persona,
        resume_id: data.resumeId ?? null,
        questions: { opening: output.opening, list: output.questions },
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

    const { text } = await generateText({
      model: gateway(),
      system: `You are conducting a ${interview.mode} interview for a ${interview.role} (${interview.difficulty}). Tone: ${personaTone[interview.interviewer_persona ?? "friendly"] ?? "professional"}.

Topics to cover (in roughly this order, but adapt):
${q.list.map((x, i) => `${i + 1}. ${x}`).join("\n")}

Rules:
- Output ONE thing only: your next spoken line. No stage directions, no quotes, no "Interviewer:" prefix.
- If the candidate's answer is shallow, ask a sharp follow-up before moving on.
- If they answered well, transition to the next topic naturally.
- Keep responses to 1-3 sentences. This is spoken aloud.
- If all topics covered, say a brief thank-you closing line containing the word "concludes".`,
      prompt: `Conversation so far:\n${transcript}\nCANDIDATE: ${data.candidateMessage}\n\nYour next line:`,
    });

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
        .update({ status: "completed", completed_at: new Date().toISOString() })
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

    // Agent 1: Evaluator — scores
    const evaluator = await generateText({
      model: gateway(),
      output: Output.object({
        schema: z.object({
          overall_score: z.number().min(0).max(100),
          communication_score: z.number().min(0).max(100),
          technical_score: z.number().min(0).max(100),
          confidence_score: z.number().min(0).max(100),
          clarity_score: z.number().min(0).max(100),
          summary: z.string().describe("2-3 sentence overall verdict"),
        }),
      }),
      prompt: `You are the Evaluator Agent. Score this ${interview.mode} interview for a ${interview.role} on a 0-100 scale. Be honest, not generous.\n\nTRANSCRIPT:\n${transcript}`,
    });

    // Agent 2: Coach — strengths/weaknesses/opportunities
    const coach = await generateText({
      model: gateway(),
      output: Output.object({
        schema: z.object({
          strengths: z.array(z.string()).max(5),
          weaknesses: z.array(z.string()).max(5),
          missed_opportunities: z.array(z.string()).max(5).describe("Things the candidate could have said but didn't"),
        }),
      }),
      prompt: `You are the Coach Agent. Identify specific strengths, weaknesses, and missed opportunities from this interview. Be specific and quote where relevant.\n\nTRANSCRIPT:\n${transcript}`,
    });

    // Agent 3: Report Agent — ideal answers + roadmap
    const reportAgent = await generateText({
      model: gateway(),
      output: Output.object({
        schema: z.object({
          ideal_answers: z.array(z.object({
            question: z.string(),
            ideal: z.string(),
          })).max(4).describe("For up to 4 weakest answers, the question and an ideal answer"),
          improvement_roadmap: z.array(z.string()).min(3).max(6).describe("Concrete next steps, ordered by priority"),
          recommendations: z.array(z.object({
            title: z.string(),
            type: z.enum(["course", "video", "exercise", "reading"]),
            note: z.string(),
          })).max(5),
        }),
      }),
      prompt: `You are the Report Agent. Based on this interview, produce ideal answers for the weakest spots, a prioritized improvement roadmap, and concrete learning recommendations.\n\nTRANSCRIPT:\n${transcript}`,
    });

    const { data: report, error } = await supabase
      .from("reports")
      .insert({
        interview_id: data.interviewId,
        user_id: userId,
        overall_score: Math.round(evaluator.output.overall_score),
        communication_score: Math.round(evaluator.output.communication_score),
        technical_score: Math.round(evaluator.output.technical_score),
        confidence_score: Math.round(evaluator.output.confidence_score),
        clarity_score: Math.round(evaluator.output.clarity_score),
        summary: evaluator.output.summary,
        strengths: coach.output.strengths,
        weaknesses: coach.output.weaknesses,
        missed_opportunities: coach.output.missed_opportunities,
        ideal_answers: reportAgent.output.ideal_answers,
        improvement_roadmap: reportAgent.output.improvement_roadmap,
        recommendations: reportAgent.output.recommendations,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabase
      .from("interviews")
      .update({ status: "completed", completed_at: new Date().toISOString() })
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
