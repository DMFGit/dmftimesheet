-- Fix project data exposure by restricting RLS policies to admin access only
-- The application already uses secure admin-only functions for data access

-- Update Projects table policies
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public."Projects";

-- Create new restrictive policy for Projects table
CREATE POLICY "Admin can view all projects" 
ON public."Projects" 
FOR SELECT 
USING (public.is_admin());

-- Update Tasks table policies  
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public."Tasks";

-- Create new restrictive policy for Tasks table
CREATE POLICY "Admin can view all tasks" 
ON public."Tasks" 
FOR SELECT 
USING (public.is_admin());

-- Update Subtasks table policies
DROP POLICY IF EXISTS "Authenticated users can view subtasks" ON public."Subtasks";

-- Create new restrictive policy for Subtasks table  
CREATE POLICY "Admin can view all subtasks"
ON public."Subtasks"
FOR SELECT 
USING (public.is_admin());

-- The Project_Budgets table already has proper admin-only restrictions
-- No changes needed there since it already uses is_admin() checks

-- Add security audit logging for sensitive table access
CREATE POLICY "Log admin project access"
ON public."Projects"
FOR SELECT
USING (public.is_admin() AND (SELECT (log_sensitive_access('Projects', 'admin_view_projects') IS NOT NULL) OR true));

CREATE POLICY "Log admin task access" 
ON public."Tasks"
FOR SELECT
USING (public.is_admin() AND (SELECT (log_sensitive_access('Tasks', 'admin_view_tasks') IS NOT NULL) OR true));

CREATE POLICY "Log admin subtask access"
ON public."Subtasks" 
FOR SELECT
USING (public.is_admin() AND (SELECT (log_sensitive_access('Subtasks', 'admin_view_subtasks') IS NOT NULL) OR true));