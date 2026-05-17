import type { AnswerEvaluation } from "../types/index.js";
import { parseAgentJson } from "../utils/json-parse.js";
import { runAgentPrompt } from "./base.js";

const EVALUATOR_SYSTEM = `You are an expert interview evaluator.
Analyze candidate answers objectively. Score 1-10.
Always respond with ONLY valid JSON. No markdown outside JSON.`;

export interface EvaluatorInput {
  role: string;
  question: string;
  answer: string;
}

function buildEvaluatorPrompt(input: EvaluatorInput): string {
  return `${EVALUATOR_SYSTEM}

Role: ${input.role}
Question: ${input.question}
Candidate answer: ${input.answer}

Respond with JSON only:
{
  "score": number (1-10),
  "strengths": ["string"],
  "weaknesses": ["string"],
  "feedback": "string - 2-3 sentences of constructive feedback",
  "clarity": number (1-10),
  "depth": number (1-10),
  "relevance": number (1-10)
}`;
}

export async function evaluateAnswer(
  input: EvaluatorInput
): Promise<AnswerEvaluation> {
  const prompt = buildEvaluatorPrompt(input);
  const { text } = await runAgentPrompt(prompt);
  return parseAgentJson<AnswerEvaluation>(text);
}
