import { BudgetItem, Employee, TimeEntry } from '@/types/timesheet';

export const mockBudgetItems: BudgetItem[] = [
  {
    wbs_code: '25002-01.1',
    project_number: 25002,
    project_name: 'Arverne East – Building E & Building I',
    contract: 'Original',
    task_number: 1,
    task_description: 'Construction Documents',
    task_unit: 'Building E',
    subtask_number: 1.1,
    subtask_description: 'Schematic Design',
    fee_structure: 'Lump Sum',
    budget_amount: 18000,
    dmf_budget_amount: 18000
  },
  {
    wbs_code: '25002-01.2',
    project_number: 25002,
    project_name: 'Arverne East – Building E & Building I',
    contract: 'Original',
    task_number: 1,
    task_description: 'Construction Documents',
    task_unit: 'Building E',
    subtask_number: 1.2,
    subtask_description: 'Design Development',
    fee_structure: 'Lump Sum',
    budget_amount: 20000,
    dmf_budget_amount: 20000
  },
  {
    wbs_code: '25002-01.3',
    project_number: 25002,
    project_name: 'Arverne East – Building E & Building I',
    contract: 'Original',
    task_number: 1,
    task_description: 'Construction Documents',
    task_unit: 'Building E',
    subtask_number: 1.3,
    subtask_description: '50% Construction Documents',
    fee_structure: 'Lump Sum',
    budget_amount: 10000,
    dmf_budget_amount: 10000
  },
  {
    wbs_code: '25002-01.4',
    project_number: 25002,
    project_name: 'Arverne East – Building E & Building I',
    contract: 'Original',
    task_number: 1,
    task_description: 'Construction Documents',
    task_unit: 'Building E',
    subtask_number: 1.4,
    subtask_description: '100% Construction Documents',
    fee_structure: 'Lump Sum',
    budget_amount: 10000,
    dmf_budget_amount: 10000
  },
  {
    wbs_code: '25002-02.1',
    project_number: 25002,
    project_name: 'Arverne East – Building E & Building I',
    contract: 'Original',
    task_number: 2,
    task_description: 'Permits & Approvals',
    task_unit: 'Building E',
    subtask_number: 2.1,
    subtask_description: 'NYCDOB Builders Pavement Plan',
    fee_structure: 'Lump Sum',
    budget_amount: 5000,
    dmf_budget_amount: 5000
  },
  {
    wbs_code: '25002-02.2',
    project_number: 25002,
    project_name: 'Arverne East – Building E & Building I',
    contract: 'Original',
    task_number: 2,
    task_description: 'Permits & Approvals',
    task_unit: 'Building E',
    subtask_number: 2.2,
    subtask_description: 'NYCDPR Street Tree Application',
    fee_structure: 'Lump Sum',
    budget_amount: 5000,
    dmf_budget_amount: 5000
  },
  {
    wbs_code: '25002-04.1',
    project_number: 25002,
    project_name: 'Arverne East – Building E & Building I',
    contract: 'CA1',
    task_number: 4,
    task_description: 'Construction Documents',
    task_unit: 'Building I',
    subtask_number: 4.1,
    subtask_description: 'Schematic Design',
    fee_structure: 'Lump Sum',
    budget_amount: 18000,
    dmf_budget_amount: 18000
  },
  {
    wbs_code: '25002-04.2',
    project_number: 25002,
    project_name: 'Arverne East – Building E & Building I',
    contract: 'CA1',
    task_number: 4,
    task_description: 'Construction Documents',
    task_unit: 'Building I',
    subtask_number: 4.2,
    subtask_description: 'Design Development',
    fee_structure: 'Lump Sum',
    budget_amount: 20000,
    dmf_budget_amount: 20000
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
    wbs_code: '25002-01.1',
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
    wbs_code: '25002-02.1',
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