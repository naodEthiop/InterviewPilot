import type { InterviewTurn, ReportAgentResult } from "../types/index.js";
import { parseAgentJson } from "../utils/json-parse.js";
import { runAgentPrompt, streamAgentPrompt, type StreamChunk } from "./base.js";

const REPORT_SYSTEM = `You are an expert interview coach generating a final performance report.
Be constructive, specific, and actionable.
Always respond with ONLY valid JSON. No markdown outside JSON.`;

export interface ReportInput {
  role: string;
  title: string;
  turns: InterviewTurn[];
}

function buildReportPrompt(input: ReportInput): string {
  const transcript = input.turns
    .map(
      (t, i) =>
        `--- Turn ${i + 1} ---
Q: ${t.question}
A: ${t.answer}
${
  t.evaluation
    ? `Score: ${t.evaluation.score}/10 | Feedback: ${t.evaluation.feedback}
Strengths: ${t.evaluation.strengths.join(", ")}
Weaknesses: ${t.evaluation.weaknesses.join(", ")}`
    : ""
}`
    )
    .join("\n\n");

  return `${REPORT_SYSTEM}

Role: ${input.role}
Session: ${input.title}

Full interview transcript:
${transcript}

Respond with JSON only:
{
  "summary": "string - executive summary paragraph",
  "overallScore": number (1-10),
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string - actionable improvement tips"],
  "sections": {
    "communication": "string",
    "technicalDepth": "string",
    "problemSolving": "string",
    "nextSteps": "string"
  }
}`;
}

export async function generateReport(
  input: ReportInput
): Promise<ReportAgentResult> {
  const prompt = buildReportPrompt(input);
  const { text } = await runAgentPrompt(prompt);
  return parseAgentJson<ReportAgentResult>(text);
}

export async function* generateReportStream(
  input: ReportInput
): AsyncGenerator<StreamChunk> {
  const prompt = buildReportPrompt(input);
  yield* streamAgentPrompt(prompt);
}

export function parseReportResponse(text: string): ReportAgentResult {
  return parseAgentJson<ReportAgentResult>(text);
}
