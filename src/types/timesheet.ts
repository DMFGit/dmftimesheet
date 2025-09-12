export interface Project {
  id: string;
  name: string;
  number: string;
}

export interface Task {
  id: string;
  number: string;
  unit: string;
  description: string;
  projectId: string;
}

export interface Subtask {
  id: string;
  number: string;
  description: string;
  taskId: string;
  wbsCode: string;
  budget: number;
  feeStructure: string;
}

export interface TimeEntry {
  id: string;
  employee_id: string;
  project_id: string;
  task_id: string;
  subtask_id?: string | null;
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