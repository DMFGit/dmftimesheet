-- Create employee-safe function to get project hierarchy without financial data
CREATE OR REPLACE FUNCTION public.get_project_hierarchy_employee()
RETURNS TABLE(
  wbs_code text, 
  project_number bigint, 
  project_name text, 
  contract text, 
  task_number bigint, 
  task_description text, 
  task_unit text, 
  subtask_number double precision, 
  subtask_description text, 
  fee_structure text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only active employees can access this
  IF NOT EXISTS (
    SELECT 1 FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Must be an active employee';
  END IF;
  
  -- Return project hierarchy without budget amounts
  RETURN QUERY 
  SELECT 
    pb."WBS Code"::text as wbs_code,
    pb."Project_#"::bigint as project_number,
    pb."Project_Name"::text as project_name,
    pb."Contract"::text as contract,
    pb."Task_#"::bigint as task_number,
    pb."Task_Description"::text as task_description,
    pb."Task_Unit"::text as task_unit,
    pb."Subtask_#"::double precision as subtask_number,
    pb."Subtask_Description"::text as subtask_description,
    pb."Fee_Structure"::text as fee_structure
  FROM "Project_Budgets" pb
  WHERE pb."WBS Code" IS NOT NULL;
END;
$$;