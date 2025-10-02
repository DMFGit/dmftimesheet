-- Fix read-only transaction errors by removing INSERT operations from read-only functions

-- Update get_budget_data_admin_only to remove logging
CREATE OR REPLACE FUNCTION public.get_budget_data_admin_only()
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
  fee_structure text,
  budget_amount numeric,
  dmf_budget_amount numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admin can access financial data
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges for financial data';
  END IF;
  
  -- Return the budget data without logging (logging removed to fix read-only transaction error)
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
    pb."Fee_Structure"::text as fee_structure,
    CASE 
      WHEN pb."Budget" ~ '^[0-9]+\.?[0-9]*$' THEN pb."Budget"::numeric 
      ELSE 0 
    END as budget_amount,
    CASE 
      WHEN pb."DMF_Budget" ~ '^[0-9]+\.?[0-9]*$' THEN pb."DMF_Budget"::numeric 
      ELSE 0 
    END as dmf_budget_amount
  FROM "Project_Budgets" pb
  WHERE pb."WBS Code" IS NOT NULL;
END;
$$;

-- Update get_project_data_admin_only to remove logging
CREATE OR REPLACE FUNCTION public.get_project_data_admin_only()
RETURNS TABLE(
  project_number bigint,
  project_name text,
  contract text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admin can access project data
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges for project data';
  END IF;
  
  -- Return project hierarchy without logging
  RETURN QUERY 
  SELECT DISTINCT
    pb."Project_#"::bigint as project_number,
    pb."Project_Name"::text as project_name,
    pb."Contract"::text as contract
  FROM "Project_Budgets" pb
  WHERE pb."Project_#" IS NOT NULL
    AND pb."Project_Name" IS NOT NULL;
END;
$$;

-- Update get_task_data_admin_only to remove logging
CREATE OR REPLACE FUNCTION public.get_task_data_admin_only()
RETURNS TABLE(
  project_number bigint,
  task_number bigint,
  task_description text,
  task_unit text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admin can access task data  
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges for task data';
  END IF;
  
  -- Return task hierarchy without logging
  RETURN QUERY 
  SELECT DISTINCT
    pb."Project_#"::bigint as project_number,
    pb."Task_#"::bigint as task_number,
    pb."Task_Description"::text as task_description,
    pb."Task_Unit"::text as task_unit
  FROM "Project_Budgets" pb
  WHERE pb."Project_#" IS NOT NULL
    AND pb."Task_#" IS NOT NULL
    AND pb."Task_Description" IS NOT NULL;
END;
$$;