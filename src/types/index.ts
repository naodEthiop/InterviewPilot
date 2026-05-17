export type InterviewStatus = "in_progress" | "completed" | "cancelled";

export interface Interview {
  id: string;
  user_id: string;
  title: string;
  role: string;
  status: InterviewStatus;
  question_count: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  interview_id: string;
  sequence: number;
  text: string;
  focus_area: string | null;
  created_at: string;
}

export interface Answer {
  id: string;
  question_id: string;
  text: string;
  evaluation: AnswerEvaluation | null;
  score: number | null;
  created_at: string;
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
  created_at: string;
}

export interface AnswerEvaluation {
  score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  clarity: number;
  depth: number;
  relevance: number;
}

export interface CaptainQuestionResult {
  question: string;
  focusArea: string;
  interviewerNote?: string;
}

export interface ReportAgentResult {
  summary: string;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  sections: {
    communication: string;
    technicalDepth: string;
    problemSolving: string;
    nextSteps: string;
  };
}

export interface InterviewTurn {
  question: string;
  answer: string;
  evaluation?: AnswerEvaluation;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
