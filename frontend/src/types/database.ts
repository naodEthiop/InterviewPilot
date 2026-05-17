export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      answers: {
        Row: {
          created_at: string;
          evaluation: Json | null;
          id: string;
          question_id: string;
          score: number | null;
          text: string;
        };
        Insert: {
          created_at?: string;
          evaluation?: Json | null;
          id?: string;
          question_id: string;
          score?: number | null;
          text: string;
        };
        Update: {
          created_at?: string;
          evaluation?: Json | null;
          id?: string;
          question_id?: string;
          score?: number | null;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      interviews: {
        Row: {
          created_at: string;
          ended_at: string | null;
          id: string;
          question_count: number;
          role: string;
          started_at: string;
          status: string;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          question_count?: number;
          role?: string;
          started_at?: string;
          status?: string;
          title?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          question_count?: number;
          role?: string;
          started_at?: string;
          status?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          created_at: string;
          focus_area: string | null;
          id: string;
          interview_id: string;
          sequence: number;
          text: string;
        };
        Insert: {
          created_at?: string;
          focus_area?: string | null;
          id?: string;
          interview_id: string;
          sequence: number;
          text: string;
        };
        Update: {
          created_at?: string;
          focus_area?: string | null;
          id?: string;
          interview_id?: string;
          sequence?: number;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: false;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          full_report: Json;
          id: string;
          interview_id: string;
          overall_score: number | null;
          recommendations: Json;
          strengths: Json;
          summary: string;
          weaknesses: Json;
        };
        Insert: {
          created_at?: string;
          full_report?: Json;
          id?: string;
          interview_id: string;
          overall_score?: number | null;
          recommendations?: Json;
          strengths?: Json;
          summary: string;
          weaknesses?: Json;
        };
        Update: {
          created_at?: string;
          full_report?: Json;
          id?: string;
          interview_id?: string;
          overall_score?: number | null;
          recommendations?: Json;
          strengths?: Json;
          summary?: string;
          weaknesses?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "reports_interview_id_fkey";
            columns: ["interview_id"];
            isOneToOne: true;
            referencedRelation: "interviews";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
