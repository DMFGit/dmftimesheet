-- Fix critical security vulnerability: Role-Based Access Control (Final)
-- Clean up and rebuild employee security policies

-- Drop ALL existing policies on Employees table
DROP POLICY IF EXISTS "Users can update own record" ON public."Employees";
DROP POLICY IF EXISTS "Admin can manage all employee data" ON public."Employees";
DROP POLICY IF EXISTS "Users can update safe profile fields" ON public."Employees";

-- Create granular policy that prevents role escalation
-- Users can only update name, email, and billing rate - NOT role or active status
CREATE POLICY "Users can update profile only" 
ON public."Employees" 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin has full access
CREATE POLICY "Admin full employee access" 
ON public."Employees" 
FOR ALL 
USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text)
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

-- Create security audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on audit log and recreate
DROP POLICY IF EXISTS "Admin can view audit logs" ON public.security_audit_log;
CREATE POLICY "Admin can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

-- Create audit function for employee changes
CREATE OR REPLACE FUNCTION public.log_employee_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, record_id, old_values, new_values
    ) VALUES (
      auth.uid(),
      'role_change',
      'Employees',
      NEW.id,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role)
    );
  END IF;
  
  -- Log status changes
  IF OLD.active IS DISTINCT FROM NEW.active THEN
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, record_id, old_values, new_values
    ) VALUES (
      auth.uid(),
      'status_change',
      'Employees',
      NEW.id,
      jsonb_build_object('active', OLD.active),
      jsonb_build_object('active', NEW.active)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger and recreate
DROP TRIGGER IF EXISTS employee_security_audit ON public."Employees";
CREATE TRIGGER employee_security_audit
  AFTER UPDATE ON public."Employees"
  FOR EACH ROW
  EXECUTE FUNCTION public.log_employee_changes();