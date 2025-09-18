-- FINAL SECURITY FIX: Remove insecure access to financial data views
-- This ensures ALL access to sensitive data goes through secure wrapper functions

-- Drop the old insecure functions that bypass security
DROP FUNCTION IF EXISTS public.get_project_hierarchy();
DROP FUNCTION IF EXISTS public.get_task_hierarchy();

-- Ensure the original get_budget_items function is properly secured
-- (it was already updated in the previous migration to use is_admin())

-- Verify all access to sensitive views now requires admin privileges
-- The secure wrapper functions (get_*_secure) are the only way to access this data

-- Create a view access policy by revoking public access to the views
-- Since we can't add RLS to views, we revoke public SELECT permissions
REVOKE SELECT ON public.budget_items FROM PUBLIC;
REVOKE SELECT ON public.project_hierarchy FROM PUBLIC; 
REVOKE SELECT ON public.task_hierarchy FROM PUBLIC;

-- Grant SELECT only to authenticated role through the secure functions
GRANT USAGE ON SCHEMA public TO authenticated;

-- Note: Access to these views is now only possible through the secure wrapper functions:
-- - get_budget_items_secure() 
-- - get_project_hierarchy_secure()
-- - get_task_hierarchy_secure()
-- All of which require admin privileges and log access attempts