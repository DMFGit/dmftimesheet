-- SECURITY FIX: Update functions to enforce proper access control

-- Update get_project_hierarchy to only allow authenticated users
CREATE OR REPLACE FUNCTION public.get_project_hierarchy()
RETURNS SETOF project_hierarchy
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only authenticated users can access project hierarchy
  SELECT * FROM project_hierarchy
  WHERE auth.role() = 'authenticated';
$$;

-- Update get_task_hierarchy to only allow authenticated users  
CREATE OR REPLACE FUNCTION public.get_task_hierarchy()
RETURNS SETOF task_hierarchy
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only authenticated users can access task hierarchy
  SELECT * FROM task_hierarchy
  WHERE auth.role() = 'authenticated';
$$;

-- Ensure budget_items access is admin-only (function already exists but let's verify)
CREATE OR REPLACE FUNCTION public.get_budget_items()
RETURNS SETOF budget_items
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- CRITICAL: Only admin can access financial budget data
  SELECT * FROM budget_items 
  WHERE (auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text;
$$;

-- Add function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(table_name text, action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access to sensitive data
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, new_values
  ) VALUES (
    auth.uid(),
    action,
    table_name,
    jsonb_build_object(
      'access_time', now(), 
      'user_email', auth.jwt() ->> 'email',
      'ip_address', current_setting('request.headers', true)::json ->> 'x-forwarded-for'
    )
  );
END;
$$;

-- Create secure wrapper for budget access with logging
CREATE OR REPLACE FUNCTION public.get_budget_items_secure()
RETURNS SETOF budget_items
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admin can access financial data
  IF (auth.jwt() ->> 'email'::text) != 'dina@dmfengineering.com'::text THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges for financial data';
  END IF;
  
  -- Log the access
  PERFORM log_sensitive_access('budget_items', 'view_budget_data');
  
  -- Return the data
  RETURN QUERY SELECT * FROM budget_items;
END;
$$;