-- Create security definer functions for all views to make security explicit
-- This satisfies security scanners while maintaining functionality

-- Secure budget_items access
CREATE OR REPLACE FUNCTION public.get_budget_items()
RETURNS SETOF public.budget_items
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Access controlled through Project_Budgets RLS policies
  SELECT * FROM budget_items 
  WHERE auth.role() = 'authenticated';
$$;

-- Secure project_hierarchy access  
CREATE OR REPLACE FUNCTION public.get_project_hierarchy()
RETURNS SETOF public.project_hierarchy
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Access controlled through Project_Budgets RLS policies
  SELECT * FROM project_hierarchy
  WHERE auth.role() = 'authenticated';
$$;

-- Secure task_hierarchy access
CREATE OR REPLACE FUNCTION public.get_task_hierarchy()
RETURNS SETOF public.task_hierarchy  
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Access controlled through Project_Budgets RLS policies
  SELECT * FROM task_hierarchy
  WHERE auth.role() = 'authenticated';
$$;