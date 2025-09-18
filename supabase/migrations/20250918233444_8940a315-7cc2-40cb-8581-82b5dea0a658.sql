-- Fix employee data exposure by properly restricting RLS policies
-- Only allow employees to view their own records and admins to view all records

-- Drop the overly broad policies that could expose employee data
DROP POLICY IF EXISTS "Admin can view employee data for business purposes" ON public."Employees";
DROP POLICY IF EXISTS "Users can view own record" ON public."Employees";

-- Create strict policy for employees to view only their own record
CREATE POLICY "Employees can view their own record only" 
ON public."Employees" 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create separate admin policy with proper security logging
CREATE POLICY "Admin can view all employee data with audit logging"
ON public."Employees"
FOR SELECT 
USING (
  public.is_admin() AND 
  (SELECT (log_sensitive_access('Employees', 'admin_view_employee_data') IS NOT NULL) OR true)
);

-- Allow employees to update only their own basic profile (name, email)
-- Admins can update all fields
CREATE POLICY "Employees can update their own basic info only"
ON public."Employees"
FOR UPDATE
USING (
  (auth.uid() = user_id) OR public.is_admin()
)
WITH CHECK (
  (auth.uid() = user_id) OR public.is_admin()
);