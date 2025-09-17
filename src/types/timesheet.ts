export interface ProjectHierarchy {
  project_number: number;
  project_name: string;
  contract: string;
}

export interface TaskHierarchy {
  project_number: number;
  task_number: number;
  task_description: string;
  task_unit: string;
}

export interface BudgetItem {
  wbs_code: string;
  project_number: number;
  project_name: string;
  contract: string;
  task_number: number;
  task_description: string;
  task_unit: string;
  subtask_number: number;
  subtask_description: string;
  fee_structure: string;
  budget_amount: number;
  dmf_budget_amount: number;
}

export interface TimeEntry {
  id: string;
  employee_id: string;
  wbs_code: string;
  entry_date: string;
  hours: number;
  description: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
}

export interface TimesheetSummary {
  date: string;
  totalHours: number;
  entries: TimeEntry[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}