-- Fix Critical Security Issues: Clean and Secure RLS Policies

-- 1. Drop all existing employee policies to start clean
DROP POLICY IF EXISTS "Admin can view all employee data with audit logging" ON public."Employees";
DROP POLICY IF EXISTS "Admin can view all employee data securely" ON public."Employees";
DROP POLICY IF EXISTS "Employees can view their own record only" ON public."Employees";
DROP POLICY IF EXISTS "Employees can view only their own record" ON public."Employees";
DROP POLICY IF EXISTS "Employees can update their own basic info only" ON public."Employees";
DROP POLICY IF EXISTS "Employees can update own basic info only" ON public."Employees";
DROP POLICY IF EXISTS "Employees can update own name and email only" ON public."Employees";
DROP POLICY IF EXISTS "Admin can update employee data" ON public."Employees";
DROP POLICY IF EXISTS "Admin can update employee data securely" ON public."Employees";

-- 2. Create secure employee policies
CREATE POLICY "secure_admin_view_employees" 
ON public."Employees"
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "secure_employee_view_own" 
ON public."Employees"
FOR SELECT 
USING (auth.uid() = user_id AND NOT public.is_admin());

CREATE POLICY "secure_employee_update_own" 
ON public."Employees"
FOR UPDATE 
USING (auth.uid() = user_id AND NOT public.is_admin())
WITH CHECK (auth.uid() = user_id AND NOT public.is_admin());

CREATE POLICY "secure_admin_update_employees" 
ON public."Employees"
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Drop all existing audit log policies
DROP POLICY IF EXISTS "Admin can view audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Admin can view audit logs only" ON public.security_audit_log;
DROP POLICY IF EXISTS "No direct INSERT on audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "No UPDATE on audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "No DELETE on audit logs" ON public.security_audit_log;

-- 4. Create secure audit log policies
CREATE POLICY "secure_admin_view_audit_logs" 
ON public.security_audit_log
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "secure_no_insert_audit_logs" 
ON public.security_audit_log
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "secure_no_update_audit_logs" 
ON public.security_audit_log
FOR UPDATE 
USING (false);

CREATE POLICY "secure_no_delete_audit_logs" 
ON public.security_audit_log
FOR DELETE 
USING (false);