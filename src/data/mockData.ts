import { Project, Task, Subtask, Employee, TimeEntry } from '@/types/timesheet';

export const mockProjects: Project[] = [
  {
    id: '25002',
    name: 'Arverne East – Building E & Building I',
    number: '25002'
  }
];

export const mockTasks: Task[] = [
  {
    id: '1',
    number: '1',
    unit: 'Building E',
    description: 'Construction Documents',
    projectId: '25002'
  },
  {
    id: '2',
    number: '2',
    unit: 'Building E',
    description: 'Permits & Approvals',
    projectId: '25002'
  },
  {
    id: '3',
    number: '3',
    unit: 'Building E',
    description: 'Construction Support Services',
    projectId: '25002'
  },
  {
    id: '4',
    number: '4',
    unit: 'Building I',
    description: 'Construction Documents',
    projectId: '25002'
  },
  {
    id: '5',
    number: '5',
    unit: 'Building I',
    description: 'Permits & Approvals',
    projectId: '25002'
  },
  {
    id: '7',
    number: '7',
    unit: 'Parking Lot 3',
    description: 'Construction Documents',
    projectId: '25002'
  }
];

export const mockSubtasks: Subtask[] = [
  {
    id: '1.1',
    number: '1.1',
    description: 'Schematic Design',
    taskId: '1',
    wbsCode: '25002-01.1',
    budget: 18000,
    feeStructure: 'Lump Sum'
  },
  {
    id: '1.2',
    number: '1.2',
    description: 'Design Development',
    taskId: '1',
    wbsCode: '25002-01.2',
    budget: 20000,
    feeStructure: 'Lump Sum'
  },
  {
    id: '1.3',
    number: '1.3',
    description: '50% Construction Documents',
    taskId: '1',
    wbsCode: '25002-01.3',
    budget: 10000,
    feeStructure: 'Lump Sum'
  },
  {
    id: '1.4',
    number: '1.4',
    description: '100% Construction Documents',
    taskId: '1',
    wbsCode: '25002-01.4',
    budget: 10000,
    feeStructure: 'Lump Sum'
  },
  {
    id: '2.1',
    number: '2.1',
    description: 'NYCDOB Builders Pavement Plan',
    taskId: '2',
    wbsCode: '25002-02.1',
    budget: 5000,
    feeStructure: 'Lump Sum'
  },
  {
    id: '2.2',
    number: '2.2',
    description: 'NYCDPR Street Tree Application',
    taskId: '2',
    wbsCode: '25002-02.2',
    budget: 5000,
    feeStructure: 'Lump Sum'
  },
  {
    id: '4.1',
    number: '4.1',
    description: 'Schematic Design',
    taskId: '4',
    wbsCode: '25002-04.1',
    budget: 18000,
    feeStructure: 'Lump Sum'
  },
  {
    id: '4.2',
    number: '4.2',
    description: 'Design Development',
    taskId: '4',
    wbsCode: '25002-04.2',
    budget: 20000,
    feeStructure: 'Lump Sum'
  }
];

export const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john@dmfengineering.com',
    role: 'employee'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@dmfengineering.com',
    role: 'employee'
  },
  {
    id: '3',
    name: 'DMF Admin',
    email: 'admin@dmfengineering.com',
    role: 'admin'
  }
];

export const mockTimeEntries: TimeEntry[] = [
  {
    id: '1',
    employee_id: '1',
    entry_date: '2024-01-15',
    project_id: '1',
    task_id: '1',
    subtask_id: '1',
    hours: 4,
    description: 'Working on schematic design drawings',
    status: 'approved',
    submitted_at: '2024-01-15T17:00:00Z',
    reviewed_at: '2024-01-16T09:00:00Z',
    reviewed_by: '2',
    review_notes: null,
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2024-01-16T09:00:00Z'
  },
  {
    id: '2',
    employee_id: '2',
    entry_date: '2024-01-15',
    project_id: '1',
    task_id: '2',
    subtask_id: '2',
    hours: 6,
    description: 'Preparing pavement plan documentation',
    status: 'submitted',
    submitted_at: '2024-01-15T18:00:00Z',
    reviewed_at: null,
    reviewed_by: null,
    review_notes: null,
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T18:00:00Z'
  }
];