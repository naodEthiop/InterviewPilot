const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiFailure {
  success: false;
  error: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

async function request<T>(
  path: string,
  options: RequestInit & { token: string }
): Promise<ApiResult<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.token}`,
      ...options.headers,
    },
  });

  const json = (await res.json()) as ApiResult<T>;
  return json;
}

export interface Interview {
  id: string;
  title: string;
  role: string;
  status: string;
  question_count: number;
  started_at: string;
  ended_at: string | null;
}

export interface Question {
  id: string;
  interview_id: string;
  sequence: number;
  text: string;
  focus_area: string | null;
}

export interface AnswerEvaluation {
  score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
}

export interface Report {
  id: string;
  interview_id: string;
  summary: string;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  full_report: Record<string, unknown>;
}

export const api = {
  startInterview: (token: string, body: { role: string; title?: string }) =>
    request<{ interview: Interview; question: Question }>("/interview/start", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }),

  submitAnswer: (
    token: string,
    body: { interviewId: string; answer: string }
  ) =>
    request<{
      evaluation: AnswerEvaluation;
      nextQuestion: Question | null;
      interview: Interview;
    }>("/interview/answer", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }),

  endInterview: (token: string, body: { interviewId: string }) =>
    request<{ interview: Interview; report: Report }>("/interview/end", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }),

  getHistory: (token: string) =>
    request<{ interviews: Array<Interview & { report?: { overall_score: number; summary: string } | null }> }>(
      "/interview/history",
      { method: "GET", token }
    ),

  getInterview: (token: string, id: string) =>
    request<{
      interview: Interview;
      questions: Array<Question & { answer?: { text: string; evaluation: AnswerEvaluation } }>;
      report: Report | null;
    }>(`/interview/${id}`, { method: "GET", token }),
};
