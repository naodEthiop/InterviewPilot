import type { CaptainQuestionResult, InterviewTurn } from "../types/index.js";
import { parseAgentJson } from "../utils/json-parse.js";
import { runAgentPrompt, streamAgentPrompt, type StreamChunk } from "./base.js";

const CAPTAIN_SYSTEM = `You are Captain, an expert technical interviewer.
You conduct realistic, adaptive interviews. Be professional, concise, and challenging but fair.
Always respond with ONLY valid JSON matching the requested schema. No markdown outside JSON.`;

export interface CaptainAskInput {
  role: string;
  title?: string;
  turns: InterviewTurn[];
  isFirstQuestion: boolean;
}

function buildCaptainPrompt(input: CaptainAskInput): string {
  const history =
    input.turns.length === 0
      ? "No prior questions yet."
      : input.turns
          .map(
            (t, i) =>
              `Q${i + 1}: ${t.question}\nA${i + 1}: ${t.answer}${
                t.evaluation
                  ? `\n(Evaluator score: ${t.evaluation.score}/10 — ${t.evaluation.feedback})`
                  : ""
              }`
          )
          .join("\n\n");

  const instruction = input.isFirstQuestion
    ? `Generate the FIRST interview question for role: "${input.role}".`
    : `Based on the candidate's previous answers, generate the NEXT adaptive question. Probe weaknesses, follow up on strong answers, or increase difficulty appropriately.`;

  return `${CAPTAIN_SYSTEM}

${instruction}
Session title: ${input.title ?? "Interview Session"}
Role: ${input.role}

Interview history:
${history}

Respond with JSON only:
{
  "question": "string - the interview question to ask",
  "focusArea": "string - e.g. algorithms, system design, behavioral",
  "interviewerNote": "string - brief internal note on why you chose this question"
}`;
}

export async function captainAskQuestion(
  input: CaptainAskInput
): Promise<CaptainQuestionResult> {
  const prompt = buildCaptainPrompt(input);
  const { text } = await runAgentPrompt(prompt);
  return parseAgentJson<CaptainQuestionResult>(text);
}

export async function* captainAskQuestionStream(
  input: CaptainAskInput
): AsyncGenerator<StreamChunk> {
  const prompt = buildCaptainPrompt(input);
  yield* streamAgentPrompt(prompt);
}

export function parseCaptainResponse(text: string): CaptainQuestionResult {
  return parseAgentJson<CaptainQuestionResult>(text);
}
