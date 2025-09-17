export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      Employees: {
        Row: {
          active: boolean
          "Default Billing Rate": number | null
          email: string | null
          id: string
          name: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          "Default Billing Rate"?: number | null
          email?: string | null
          id?: string
          name: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          "Default Billing Rate"?: number | null
          email?: string | null
          id?: string
          name?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      Project_Budgets: {
        Row: {
          Budget: string | null
          Contract: string | null
          DMF_Budget: string | null
          Fee_Structure: string | null
          "Project_#": number | null
          Project_Name: string | null
          "Subtask_#": number | null
          Subtask_Description: string | null
          "Task_#": number | null
          Task_Description: string | null
          Task_Unit: string | null
          Vendor: string | null
          Vendor_Budget: string | null
          "WBS Code": string
        }
        Insert: {
          Budget?: string | null
          Contract?: string | null
          DMF_Budget?: string | null
          Fee_Structure?: string | null
          "Project_#"?: number | null
          Project_Name?: string | null
          "Subtask_#"?: number | null
          Subtask_Description?: string | null
          "Task_#"?: number | null
          Task_Description?: string | null
          Task_Unit?: string | null
          Vendor?: string | null
          Vendor_Budget?: string | null
          "WBS Code": string
        }
        Update: {
          Budget?: string | null
          Contract?: string | null
          DMF_Budget?: string | null
          Fee_Structure?: string | null
          "Project_#"?: number | null
          Project_Name?: string | null
          "Subtask_#"?: number | null
          Subtask_Description?: string | null
          "Task_#"?: number | null
          Task_Description?: string | null
          Task_Unit?: string | null
          Vendor?: string | null
          Vendor_Budget?: string | null
          "WBS Code"?: string
        }
        Relationships: []
      }
      Projects: {
        Row: {
          active: boolean
          contract: string | null
          created_at: string
          dmf_budget: string | null
          id: string
          name: string
          project_number: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          contract?: string | null
          created_at?: string
          dmf_budget?: string | null
          id?: string
          name: string
          project_number: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          contract?: string | null
          created_at?: string
          dmf_budget?: string | null
          id?: string
          name?: string
          project_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      Subtasks: {
        Row: {
          active: boolean
          budget: number | null
          created_at: string
          description: string
          fee_structure: string | null
          id: string
          subtask_number: number
          task_id: string
          updated_at: string
          vendor: string | null
          vendor_budget: string | null
          wbs_code: string
        }
        Insert: {
          active?: boolean
          budget?: number | null
          created_at?: string
          description: string
          fee_structure?: string | null
          id?: string
          subtask_number: number
          task_id: string
          updated_at?: string
          vendor?: string | null
          vendor_budget?: string | null
          wbs_code: string
        }
        Update: {
          active?: boolean
          budget?: number | null
          created_at?: string
          description?: string
          fee_structure?: string | null
          id?: string
          subtask_number?: number
          task_id?: string
          updated_at?: string
          vendor?: string | null
          vendor_budget?: string | null
          wbs_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "Subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "Tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      Tasks: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          project_id: string
          task_number: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          id?: string
          project_id: string
          task_number: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          task_number?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "Tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "Projects"
            referencedColumns: ["id"]
          },
        ]
      }
      Time_Entries: {
        Row: {
          created_at: string
          description: string | null
          employee_id: string
          entry_date: string
          hours: number
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          wbs_code: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          employee_id: string
          entry_date: string
          hours: number
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          wbs_code: string
        }
        Update: {
          created_at?: string
          description?: string | null
          employee_id?: string
          entry_date?: string
          hours?: number
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          wbs_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_time_entries_wbs_code"
            columns: ["wbs_code"]
            isOneToOne: false
            referencedRelation: "budget_items"
            referencedColumns: ["wbs_code"]
          },
          {
            foreignKeyName: "fk_time_entries_wbs_code"
            columns: ["wbs_code"]
            isOneToOne: false
            referencedRelation: "Project_Budgets"
            referencedColumns: ["WBS Code"]
          },
          {
            foreignKeyName: "Time_Entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "Employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Time_Entries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "Employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      budget_items: {
        Row: {
          budget_amount: number | null
          contract: string | null
          dmf_budget_amount: number | null
          fee_structure: string | null
          project_name: string | null
          project_number: number | null
          subtask_description: string | null
          subtask_number: number | null
          task_description: string | null
          task_number: number | null
          task_unit: string | null
          wbs_code: string | null
        }
        Insert: {
          budget_amount?: never
          contract?: string | null
          dmf_budget_amount?: never
          fee_structure?: string | null
          project_name?: string | null
          project_number?: number | null
          subtask_description?: string | null
          subtask_number?: number | null
          task_description?: string | null
          task_number?: number | null
          task_unit?: string | null
          wbs_code?: string | null
        }
        Update: {
          budget_amount?: never
          contract?: string | null
          dmf_budget_amount?: never
          fee_structure?: string | null
          project_name?: string | null
          project_number?: number | null
          subtask_description?: string | null
          subtask_number?: number | null
          task_description?: string | null
          task_number?: number | null
          task_unit?: string | null
          wbs_code?: string | null
        }
        Relationships: []
      }
      project_hierarchy: {
        Row: {
          contract: string | null
          project_name: string | null
          project_number: number | null
        }
        Relationships: []
      }
      task_hierarchy: {
        Row: {
          project_number: number | null
          task_description: string | null
          task_number: number | null
          task_unit: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_budget_items: {
        Args: Record<PropertyKey, never>
        Returns: {
          budget_amount: number | null
          contract: string | null
          dmf_budget_amount: number | null
          fee_structure: string | null
          project_name: string | null
          project_number: number | null
          subtask_description: string | null
          subtask_number: number | null
          task_description: string | null
          task_number: number | null
          task_unit: string | null
          wbs_code: string | null
        }[]
      }
      get_project_hierarchy: {
        Args: Record<PropertyKey, never>
        Returns: {
          contract: string | null
          project_name: string | null
          project_number: number | null
        }[]
      }
      get_task_hierarchy: {
        Args: Record<PropertyKey, never>
        Returns: {
          project_number: number | null
          task_description: string | null
          task_number: number | null
          task_unit: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
