-- CRITICAL SECURITY FIX: Secure view access through functions

-- Create secure function for budget items (admin only)
CREATE OR REPLACE FUNCTION public.get_budget_items_secure()
RETURNS SETOF budget_items
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow admin access to budget data
  SELECT * FROM budget_items 
  WHERE (auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text;
$$;

-- Create secure function for project hierarchy (authenticated users only)
CREATE OR REPLACE FUNCTION public.get_project_hierarchy_secure()
RETURNS SETOF project_hierarchy
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow authenticated users access
  SELECT * FROM project_hierarchy
  WHERE auth.role() = 'authenticated';
$$;

-- Create secure function for task hierarchy (authenticated users only)
CREATE OR REPLACE FUNCTION public.get_task_hierarchy_secure()
RETURNS SETOF task_hierarchy
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow authenticated users access
  SELECT * FROM task_hierarchy
  WHERE auth.role() = 'authenticated';
$$;

-- Add security audit logging for sensitive operations
INSERT INTO public.security_audit_log (
  user_id, action, table_name, record_id, new_values
) VALUES (
  NULL,
  'security_policy_update',
  'system',
  NULL,
  jsonb_build_object(
    'event', 'Added RLS equivalent protections for views',
    'timestamp', now(),
    'tables_secured', ARRAY['budget_items', 'project_hierarchy', 'task_hierarchy']
  )
);

-- Grant execute permissions on secure functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_project_hierarchy_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_task_hierarchy_secure() TO authenticated;

-- Only grant budget access to admin (will be controlled by function logic)
GRANT EXECUTE ON FUNCTION public.get_budget_items_secure() TO authenticated;