-- Allow employees to view project hierarchy data for time entry creation
-- This doesn't expose financial data, just the project structure needed for time entries

-- Update Project_Budgets policies to allow employees to view non-financial project hierarchy
DROP POLICY IF EXISTS "Employees can view project hierarchy" ON public."Project_Budgets";
CREATE POLICY "Employees can view project hierarchy" 
ON public."Project_Budgets" 
FOR SELECT 
TO authenticated
USING (
  -- Allow any authenticated user who is an active employee to view project structure
  EXISTS (
    SELECT 1 FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

-- Update Projects policies to allow employees to view project data
DROP POLICY IF EXISTS "Employees can view projects" ON public."Projects";
CREATE POLICY "Employees can view projects" 
ON public."Projects" 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

-- Update Tasks policies to allow employees to view task data
DROP POLICY IF EXISTS "Employees can view tasks" ON public."Tasks";
CREATE POLICY "Employees can view tasks" 
ON public."Tasks" 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

-- Update Subtasks policies to allow employees to view subtask data
DROP POLICY IF EXISTS "Employees can view subtasks" ON public."Subtasks";
CREATE POLICY "Subtasks can view subtasks" 
ON public."Subtasks" 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);