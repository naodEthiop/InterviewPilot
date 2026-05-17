import type { SupabaseClient } from "@supabase/supabase-js";
import { captainAskQuestion } from "../agents/captain.js";
import { evaluateAnswer } from "../agents/evaluator.js";
import { generateReport } from "../agents/report.js";
import type {
  Answer,
  Interview,
  InterviewTurn,
  Question,
  Report,
} from "../types/index.js";

export interface StartInterviewInput {
  userId: string;
  role: string;
  title?: string;
}

export interface AnswerInterviewInput {
  userId: string;
  interviewId: string;
  answerText: string;
}

export interface EndInterviewInput {
  userId: string;
  interviewId: string;
}

export class InterviewService {
  constructor(private readonly db: SupabaseClient) {}

  private async getInterviewForUser(
    interviewId: string,
    userId: string
  ): Promise<Interview> {
    const { data, error } = await this.db
      .from("interviews")
      .select("*")
      .eq("id", interviewId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new Error("Interview not found");
    }
    return data as Interview;
  }

  private async buildTurns(interviewId: string): Promise<InterviewTurn[]> {
    const { data: questions, error: qErr } = await this.db
      .from("questions")
      .select("id, sequence, text")
      .eq("interview_id", interviewId)
      .order("sequence", { ascending: true });

    if (qErr || !questions?.length) return [];

    const turns: InterviewTurn[] = [];

    for (const q of questions) {
      const { data: answers } = await this.db
        .from("answers")
        .select("text, evaluation")
        .eq("question_id", q.id)
        .limit(1);

      const answer = answers?.[0];
      if (!answer) continue;

      turns.push({
        question: q.text,
        answer: answer.text,
        evaluation: answer.evaluation as InterviewTurn["evaluation"],
      });
    }

    return turns;
  }

  async startInterview(
    input: StartInterviewInput
  ): Promise<{ interview: Interview; question: Question }> {
    const { data: interview, error: iErr } = await this.db
      .from("interviews")
      .insert({
        user_id: input.userId,
        role: input.role,
        title: input.title ?? `${input.role} Interview`,
        status: "in_progress",
        question_count: 1,
      })
      .select()
      .single();

    if (iErr || !interview) {
      throw new Error(`Failed to create interview: ${iErr?.message}`);
    }

    const captainResult = await captainAskQuestion({
      role: input.role,
      title: interview.title,
      turns: [],
      isFirstQuestion: true,
    });

    const { data: question, error: qErr } = await this.db
      .from("questions")
      .insert({
        interview_id: interview.id,
        sequence: 1,
        text: captainResult.question,
        focus_area: captainResult.focusArea,
      })
      .select()
      .single();

    if (qErr || !question) {
      throw new Error(`Failed to save question: ${qErr?.message}`);
    }

    return {
      interview: interview as Interview,
      question: question as Question,
    };
  }

  async submitAnswer(input: AnswerInterviewInput): Promise<{
    evaluation: InterviewTurn["evaluation"];
    nextQuestion: Question | null;
    interview: Interview;
  }> {
    const interview = await this.getInterviewForUser(
      input.interviewId,
      input.userId
    );

    if (interview.status !== "in_progress") {
      throw new Error("Interview is not active");
    }

    const { data: currentQuestion, error: qErr } = await this.db
      .from("questions")
      .select("*")
      .eq("interview_id", input.interviewId)
      .order("sequence", { ascending: false })
      .limit(1)
      .single();

    if (qErr || !currentQuestion) {
      throw new Error("No active question found");
    }

    const { data: existingAnswer } = await this.db
      .from("answers")
      .select("id")
      .eq("question_id", currentQuestion.id)
      .maybeSingle();

    if (existingAnswer) {
      throw new Error("This question has already been answered");
    }

    const evaluation = await evaluateAnswer({
      role: interview.role,
      question: currentQuestion.text,
      answer: input.answerText,
    });

    const { error: aErr } = await this.db.from("answers").insert({
      question_id: currentQuestion.id,
      text: input.answerText,
      evaluation,
      score: evaluation.score,
    });

    if (aErr) {
      throw new Error(`Failed to save answer: ${aErr.message}`);
    }

    const turns = await this.buildTurns(input.interviewId);
    const maxQuestions = 5;

    let nextQuestion: Question | null = null;

    if (turns.length < maxQuestions) {
      const captainResult = await captainAskQuestion({
        role: interview.role,
        title: interview.title,
        turns,
        isFirstQuestion: false,
      });

      const nextSequence = currentQuestion.sequence + 1;

      const { data: newQ, error: nqErr } = await this.db
        .from("questions")
        .insert({
          interview_id: input.interviewId,
          sequence: nextSequence,
          text: captainResult.question,
          focus_area: captainResult.focusArea,
        })
        .select()
        .single();

      if (nqErr || !newQ) {
        throw new Error(`Failed to create next question: ${nqErr?.message}`);
      }

      nextQuestion = newQ as Question;

      await this.db
        .from("interviews")
        .update({ question_count: nextSequence })
        .eq("id", input.interviewId);
    }

    const { data: updatedInterview } = await this.db
      .from("interviews")
      .select("*")
      .eq("id", input.interviewId)
      .single();

    return {
      evaluation,
      nextQuestion,
      interview: (updatedInterview ?? interview) as Interview,
    };
  }

  async endInterview(input: EndInterviewInput): Promise<{
    interview: Interview;
    report: Report;
  }> {
    const interview = await this.getInterviewForUser(
      input.interviewId,
      input.userId
    );

    if (interview.status === "completed") {
      const { data: existingReport } = await this.db
        .from("reports")
        .select("*")
        .eq("interview_id", input.interviewId)
        .single();

      if (existingReport) {
        return {
          interview,
          report: existingReport as Report,
        };
      }
    }

    const turns = await this.buildTurns(input.interviewId);

    if (turns.length === 0) {
      throw new Error("Cannot end interview with no answers");
    }

    const reportResult = await generateReport({
      role: interview.role,
      title: interview.title,
      turns,
    });

    const { data: report, error: rErr } = await this.db
      .from("reports")
      .insert({
        interview_id: input.interviewId,
        summary: reportResult.summary,
        overall_score: reportResult.overallScore,
        strengths: reportResult.strengths,
        weaknesses: reportResult.weaknesses,
        recommendations: reportResult.recommendations,
        full_report: reportResult,
      })
      .select()
      .single();

    if (rErr || !report) {
      throw new Error(`Failed to save report: ${rErr?.message}`);
    }

    const { data: updatedInterview, error: uErr } = await this.db
      .from("interviews")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", input.interviewId)
      .select()
      .single();

    if (uErr) {
      throw new Error(`Failed to update interview: ${uErr.message}`);
    }

    return {
      interview: updatedInterview as Interview,
      report: report as Report,
    };
  }

  async getInterviewHistory(userId: string): Promise<InterviewHistoryItem[]> {
    const { data: interviews, error } = await this.db
      .from("interviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch history: ${error.message}`);
    }

    const items: InterviewHistoryItem[] = [];

    for (const interview of interviews ?? []) {
      const { data: report } = await this.db
        .from("reports")
        .select("id, overall_score, summary")
        .eq("interview_id", interview.id)
        .maybeSingle();

      items.push({
        ...(interview as Interview),
        report: report ?? null,
      });
    }

    return items;
  }

  async getInterviewDetail(
    userId: string,
    interviewId: string
  ): Promise<{
    interview: Interview;
    questions: Array<Question & { answer?: Answer }>;
    report: Report | null;
  }> {
    const interview = await this.getInterviewForUser(interviewId, userId);

    const { data: questions } = await this.db
      .from("questions")
      .select("*")
      .eq("interview_id", interviewId)
      .order("sequence", { ascending: true });

    const enriched = [];

    for (const q of questions ?? []) {
      const { data: answers } = await this.db
        .from("answers")
        .select("*")
        .eq("question_id", q.id)
        .limit(1);

      enriched.push({
        ...(q as Question),
        answer: answers?.[0] as Answer | undefined,
      });
    }

    const { data: report } = await this.db
      .from("reports")
      .select("*")
      .eq("interview_id", interviewId)
      .maybeSingle();

    return {
      interview,
      questions: enriched,
      report: (report as Report) ?? null,
    };
  }
}

export interface InterviewHistoryItem extends Interview {
  report?: Pick<Report, "id" | "overall_score" | "summary"> | null;
}
