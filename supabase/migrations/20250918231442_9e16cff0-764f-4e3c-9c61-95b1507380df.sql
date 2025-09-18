-- Phase 2: Fix critical employee data exposure issue
-- Create secure function for admin access to employee data with proper logging

CREATE OR REPLACE FUNCTION public.get_employee_data_admin_only()
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  role text,
  active boolean,
  user_id uuid,
  default_billing_rate bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only admin can access employee data
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges for employee data';
  END IF;
  
  -- Log the access for security audit
  PERFORM log_sensitive_access('employee_data', 'view_employee_data_admin');
  
  -- Return employee data
  RETURN QUERY 
  SELECT 
    e.id,
    e.name,
    e.email,
    e.role,
    e.active,
    e.user_id,
    e."Default Billing Rate" as default_billing_rate
  FROM "Employees" e
  WHERE e.active = true;
END;
$$;

-- Create secure function to get employee name by ID for time entry reviews
CREATE OR REPLACE FUNCTION public.get_employee_name_by_id(employee_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  employee_name TEXT;
BEGIN
  -- Only admin can access this function for time entry reviews
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges';
  END IF;
  
  -- Get employee name
  SELECT name INTO employee_name
  FROM "Employees" 
  WHERE id = employee_id AND active = true;
  
  RETURN COALESCE(employee_name, 'Unknown Employee');
END;
$$;

-- Update RLS policies to be more restrictive
-- Drop the existing admin policy and recreate with more specific permissions
DROP POLICY IF EXISTS "Admin full employee access" ON "Employees";

-- Create more specific admin policies
CREATE POLICY "Admin can view employee data for business purposes" 
ON "Employees" 
FOR SELECT 
USING (
  public.is_admin() AND 
  -- Log access attempt
  (SELECT log_sensitive_access('Employees', 'admin_view_employee') IS NOT NULL OR true)
);

CREATE POLICY "Admin can update employee data" 
ON "Employees" 
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can insert employee data" 
ON "Employees" 
FOR INSERT 
WITH CHECK (public.is_admin());

-- Prevent delete operations on employee records for data integrity
-- (Employees should be deactivated, not deleted)