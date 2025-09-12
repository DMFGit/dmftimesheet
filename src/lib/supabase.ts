import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a fallback client or null if environment variables are missing
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string;
          role: 'admin' | 'employee';
          hourly_rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email: string;
          role?: 'admin' | 'employee';
          hourly_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          email?: string;
          role?: 'admin' | 'employee';
          hourly_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          number: string;
          description: string | null;
          status: 'active' | 'inactive' | 'completed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          number: string;
          description?: string | null;
          status?: 'active' | 'inactive' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          number?: string;
          description?: string | null;
          status?: 'active' | 'inactive' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          number: string;
          unit: string | null;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          number: string;
          unit?: string | null;
          description: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          number?: string;
          unit?: string | null;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      subtasks: {
        Row: {
          id: string;
          task_id: string;
          number: string;
          description: string;
          wbs_code: string | null;
          budget: number;
          fee_structure: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          number: string;
          description: string;
          wbs_code?: string | null;
          budget?: number;
          fee_structure?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          number?: string;
          description?: string;
          wbs_code?: string | null;
          budget?: number;
          fee_structure?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      time_entries: {
        Row: {
          id: string;
          employee_id: string;
          project_id: string;
          task_id: string;
          subtask_id: string | null;
          entry_date: string;
          hours: number;
          description: string | null;
          status: 'draft' | 'submitted' | 'approved' | 'rejected';
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          review_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          project_id: string;
          task_id: string;
          subtask_id?: string | null;
          entry_date: string;
          hours: number;
          description?: string | null;
          status?: 'draft' | 'submitted' | 'approved' | 'rejected';
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          project_id?: string;
          task_id?: string;
          subtask_id?: string | null;
          entry_date?: string;
          hours?: number;
          description?: string | null;
          status?: 'draft' | 'submitted' | 'approved' | 'rejected';
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};