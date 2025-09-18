-- COMPLETE SECURITY FIX: Remove insecure views and replace with secure-only access
-- This eliminates the security scan warnings by removing all direct access to sensitive data

-- First, store the view definitions in secure functions and then drop the views
-- This ensures only admin users can access the data through controlled functions

-- Create the secure data access functions that replace the views
CREATE OR REPLACE FUNCTION public.get_budget_data_admin_only()
RETURNS TABLE (
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
SET search_path = 'public'
AS $function$
BEGIN
  -- Only admin can access financial data
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges for financial data';
  END IF;
  
  -- Log the access
  PERFORM log_sensitive_access('budget_data', 'view_budget_data_admin');
  
  -- Return the budget data from the original source tables
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
$function$;

CREATE OR REPLACE FUNCTION public.get_project_data_admin_only()
RETURNS TABLE (
    project_number bigint,
    project_name text,
    contract text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only admin can access project data
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges for project data';
  END IF;
  
  -- Log the access
  PERFORM log_sensitive_access('project_data', 'view_project_data_admin');
  
  -- Return project hierarchy from source
  RETURN QUERY 
  SELECT DISTINCT
    pb."Project_#"::bigint as project_number,
    pb."Project_Name"::text as project_name,
    pb."Contract"::text as contract
  FROM "Project_Budgets" pb
  WHERE pb."Project_#" IS NOT NULL
    AND pb."Project_Name" IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_task_data_admin_only()
RETURNS TABLE (
    project_number bigint,
    task_number bigint,
    task_description text,
    task_unit text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only admin can access task data  
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges for task data';
  END IF;
  
  -- Log the access
  PERFORM log_sensitive_access('task_data', 'view_task_data_admin');
  
  -- Return task hierarchy from source
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
$function$;

-- Now drop the insecure views that were causing security warnings
DROP VIEW IF EXISTS public.budget_items CASCADE;
DROP VIEW IF EXISTS public.project_hierarchy CASCADE;  
DROP VIEW IF EXISTS public.task_hierarchy CASCADE;

-- Update the secure wrapper functions to use the new admin-only functions
CREATE OR REPLACE FUNCTION public.get_budget_items_secure()
RETURNS TABLE (
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
SET search_path = 'public'
AS $function$
BEGIN
  -- Access control is handled in get_budget_data_admin_only
  RETURN QUERY SELECT * FROM get_budget_data_admin_only();
END;
$function$;

-- Update get_budget_items to use the new secure function
CREATE OR REPLACE FUNCTION public.get_budget_items()
RETURNS TABLE (
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
SET search_path = 'public'
AS $function$
BEGIN
  -- Access control is handled in get_budget_data_admin_only
  RETURN QUERY SELECT * FROM get_budget_data_admin_only();
END;
$function$;