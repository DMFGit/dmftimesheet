-- Create normalized Projects table
CREATE TABLE public."Projects" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contract TEXT,
  dmf_budget TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create normalized Tasks table
CREATE TABLE public."Tasks" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public."Projects"(id) ON DELETE CASCADE,
  task_number INTEGER NOT NULL,
  unit TEXT,
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, task_number)
);

-- Create normalized Subtasks table
CREATE TABLE public."Subtasks" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public."Tasks"(id) ON DELETE CASCADE,
  subtask_number DECIMAL NOT NULL,
  description TEXT NOT NULL,
  wbs_code TEXT NOT NULL UNIQUE,
  budget DECIMAL,
  fee_structure TEXT,
  vendor TEXT,
  vendor_budget TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, subtask_number)
);

-- Create Time_Entries table
CREATE TABLE public."Time_Entries" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public."Employees"(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public."Projects"(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public."Tasks"(id) ON DELETE CASCADE,
  subtask_id UUID REFERENCES public."Subtasks"(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  hours DECIMAL(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public."Employees"(id),
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public."Projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subtasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Time_Entries" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Projects
CREATE POLICY "Authenticated users can view projects" ON public."Projects"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage projects" ON public."Projects"
  FOR ALL TO authenticated 
  USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

-- RLS Policies for Tasks
CREATE POLICY "Authenticated users can view tasks" ON public."Tasks"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage tasks" ON public."Tasks"
  FOR ALL TO authenticated 
  USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

-- RLS Policies for Subtasks
CREATE POLICY "Authenticated users can view subtasks" ON public."Subtasks"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage subtasks" ON public."Subtasks"
  FOR ALL TO authenticated 
  USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

-- RLS Policies for Time_Entries
CREATE POLICY "Employees can view their own time entries" ON public."Time_Entries"
  FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public."Employees" 
    WHERE "Employees".id = "Time_Entries".employee_id 
    AND "Employees".user_id = auth.uid()
  ));

CREATE POLICY "Employees can create their own time entries" ON public."Time_Entries"
  FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public."Employees" 
    WHERE "Employees".id = "Time_Entries".employee_id 
    AND "Employees".user_id = auth.uid()
  ));

CREATE POLICY "Employees can update their own draft time entries" ON public."Time_Entries"
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public."Employees" 
      WHERE "Employees".id = "Time_Entries".employee_id 
      AND "Employees".user_id = auth.uid()
    ) 
    AND status = 'draft'
  );

CREATE POLICY "Admin can manage all time entries" ON public."Time_Entries"
  FOR ALL TO authenticated 
  USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public."Projects"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public."Tasks"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subtasks_updated_at
  BEFORE UPDATE ON public."Subtasks"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public."Time_Entries"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_tasks_project_id ON public."Tasks"(project_id);
CREATE INDEX idx_subtasks_task_id ON public."Subtasks"(task_id);
CREATE INDEX idx_time_entries_employee_id ON public."Time_Entries"(employee_id);
CREATE INDEX idx_time_entries_project_id ON public."Time_Entries"(project_id);
CREATE INDEX idx_time_entries_entry_date ON public."Time_Entries"(entry_date);
CREATE INDEX idx_time_entries_status ON public."Time_Entries"(status);

-- Populate Projects table from Project_Budgets
INSERT INTO public."Projects" (project_number, name, contract, dmf_budget)
SELECT DISTINCT 
  COALESCE("Project_#"::text, 'Unknown'), 
  COALESCE("Project_Name", 'Unnamed Project'),
  "Contract",
  "DMF_Budget"
FROM public."Project_Budgets" 
WHERE "Project_#" IS NOT NULL
ON CONFLICT (project_number) DO NOTHING;

-- Populate Tasks table from Project_Budgets
INSERT INTO public."Tasks" (project_id, task_number, unit, description)
SELECT DISTINCT 
  p.id,
  pb."Task_#"::integer,
  pb."Task_Unit",
  pb."Task_Description"
FROM public."Project_Budgets" pb
JOIN public."Projects" p ON p.project_number = pb."Project_#"::text
WHERE pb."Task_#" IS NOT NULL AND pb."Task_Description" IS NOT NULL
ON CONFLICT (project_id, task_number) DO NOTHING;

-- Populate Subtasks table from Project_Budgets
INSERT INTO public."Subtasks" (task_id, subtask_number, description, wbs_code, budget, fee_structure, vendor, vendor_budget)
SELECT DISTINCT 
  t.id,
  pb."Subtask_#",
  pb."Subtask_Description",
  pb."WBS Code",
  CASE 
    WHEN pb."Budget" ~ '^[0-9]+\.?[0-9]*$' THEN pb."Budget"::decimal
    ELSE NULL
  END,
  pb."Fee_Structure",
  pb."Vendor",
  pb."Vendor_Budget"
FROM public."Project_Budgets" pb
JOIN public."Projects" p ON p.project_number = pb."Project_#"::text
JOIN public."Tasks" t ON t.project_id = p.id AND t.task_number = pb."Task_#"::integer
WHERE pb."Subtask_#" IS NOT NULL AND pb."Subtask_Description" IS NOT NULL AND pb."WBS Code" IS NOT NULL
ON CONFLICT (wbs_code) DO NOTHING;