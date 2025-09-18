-- CRITICAL SECURITY FIX: Protect financial data with RLS policies
-- This addresses the exposure of budget_items, project_hierarchy, and task_hierarchy tables

-- Create centralized admin check function to replace hardcoded email
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND active = true
  );
$$;

-- Enable RLS on financial data tables
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_hierarchy ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.task_hierarchy ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for budget_items (admin-only access)
CREATE POLICY "Admin only access to budget items"
ON public.budget_items
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Create RLS policies for project_hierarchy (admin-only access) 
CREATE POLICY "Admin only access to project hierarchy"
ON public.project_hierarchy
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Create RLS policies for task_hierarchy (admin-only access)
CREATE POLICY "Admin only access to task hierarchy" 
ON public.task_hierarchy
FOR ALL
TO authenticated  
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Update existing functions to use centralized admin check
CREATE OR REPLACE FUNCTION public.get_budget_items_secure()
RETURNS SETOF budget_items
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Use centralized admin check instead of hardcoded email
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges for financial data';
  END IF;
  
  -- Log the access
  PERFORM log_sensitive_access('budget_items', 'view_budget_data');
  
  -- Return the data
  RETURN QUERY SELECT * FROM budget_items;
END;
$function$;

-- Update get_budget_items function
CREATE OR REPLACE FUNCTION public.get_budget_items()
RETURNS SETOF budget_items
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  -- Use centralized admin check
  SELECT * FROM budget_items 
  WHERE public.is_admin();
$function$;

-- Update prevent_role_escalation function to use centralized admin check
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Check if non-admin is trying to change sensitive fields
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    -- Prevent role changes
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Permission denied: Cannot modify role';
    END IF;
    
    -- Prevent status changes  
    IF OLD.active IS DISTINCT FROM NEW.active THEN
      RAISE EXCEPTION 'Permission denied: Cannot modify active status';
    END IF;
    
    -- Prevent billing rate changes
    IF OLD."Default Billing Rate" IS DISTINCT FROM NEW."Default Billing Rate" THEN
      RAISE EXCEPTION 'Permission denied: Cannot modify billing rate';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update existing RLS policies to use centralized function
DROP POLICY IF EXISTS "Admin full employee access" ON public."Employees";
CREATE POLICY "Admin full employee access"
ON public."Employees"
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manage projects" ON public."Project_Budgets";
CREATE POLICY "Admin manage projects"
ON public."Project_Budgets"  
FOR ALL
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin users can view budget data" ON public."Project_Budgets";
CREATE POLICY "Admin users can view budget data"
ON public."Project_Budgets"
FOR SELECT
TO authenticated  
USING (public.is_admin());

-- Update other admin policies
DROP POLICY IF EXISTS "Admin can manage projects" ON public."Projects";
CREATE POLICY "Admin can manage projects"
ON public."Projects"
FOR ALL
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage tasks" ON public."Tasks";
CREATE POLICY "Admin can manage tasks"  
ON public."Tasks"
FOR ALL
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage subtasks" ON public."Subtasks";
CREATE POLICY "Admin can manage subtasks"
ON public."Subtasks"
FOR ALL  
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage all time entries" ON public."Time_Entries";
CREATE POLICY "Admin can manage all time entries"
ON public."Time_Entries"
FOR ALL
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can create notifications for users" ON public.notifications;
CREATE POLICY "Admin can create notifications for users"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can view audit logs" ON public.security_audit_log;
CREATE POLICY "Admin can view audit logs"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (public.is_admin());