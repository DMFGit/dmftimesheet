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
  employeeId: string;
  employeeName: string;
  date: string;
  projectId: string;
  taskId: string;
  subtaskId?: string;
  hours: number;
  description: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
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