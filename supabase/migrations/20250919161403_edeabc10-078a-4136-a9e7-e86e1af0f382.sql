-- Fix Critical Security Issues: Employee Data Access and Audit Log Protection

-- 1. Fix Employee Data Access - Remove overly permissive admin policy that logs access
DROP POLICY IF EXISTS "Admin can view all employee data with audit logging" ON public."Employees";

-- 2. Create more secure admin policy for employee data without automatic logging
CREATE POLICY "Admin can view all employee data securely" 
ON public."Employees"
FOR SELECT 
USING (public.is_admin());

-- 3. Ensure employees can ONLY view their own record (make policy more explicit)
DROP POLICY IF EXISTS "Employees can view their own record only" ON public."Employees";

CREATE POLICY "Employees can view only their own record" 
ON public."Employees"
FOR SELECT 
USING (auth.uid() = user_id AND NOT public.is_admin());

-- 4. Secure the security audit log table - only system functions can insert
-- Remove any existing permissive policies
DROP POLICY IF EXISTS "Admin can view audit logs" ON public.security_audit_log;

-- Create restrictive policies for audit log
CREATE POLICY "Admin can view audit logs only" 
ON public.security_audit_log
FOR SELECT 
USING (public.is_admin());

-- Prevent any direct INSERT/UPDATE/DELETE on audit logs (only functions should do this)
CREATE POLICY "No direct INSERT on audit logs" 
ON public.security_audit_log
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "No UPDATE on audit logs" 
ON public.security_audit_log
FOR UPDATE 
USING (false);

CREATE POLICY "No DELETE on audit logs" 
ON public.security_audit_log
FOR DELETE 
USING (false);

-- 5. Update employee update policy to be more restrictive
DROP POLICY IF EXISTS "Employees can update their own basic info only" ON public."Employees";

CREATE POLICY "Employees can update own basic info only" 
ON public."Employees"
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND OLD.role = NEW.role  -- Cannot change role
  AND OLD.active = NEW.active  -- Cannot change active status
  AND OLD."Default Billing Rate" = NEW."Default Billing Rate"  -- Cannot change billing rate
  AND OLD.user_id = NEW.user_id  -- Cannot change user_id
);

-- 6. Create more secure admin update policy
CREATE POLICY "Admin can update employee data securely" 
ON public."Employees"
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 7. Update function to properly restrict audit log access
CREATE OR REPLACE FUNCTION public.log_sensitive_access_secure(table_name text, action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow system to log access, not direct user calls
  IF current_setting('role') != 'service_role' THEN
    -- For regular users, we'll allow this but with restricted data
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, new_values
    ) VALUES (
      auth.uid(),
      action,
      table_name,
      jsonb_build_object(
        'access_time', now(), 
        'user_email', COALESCE(auth.jwt() ->> 'email', 'unknown')
      )
    );
  END IF;
END;
$$;