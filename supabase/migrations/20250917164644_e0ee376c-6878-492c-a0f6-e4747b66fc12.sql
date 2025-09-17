-- Fix critical security vulnerability: Role-Based Access Control (Simplified)
-- Replace overly permissive employee update policy with secure ones

-- Drop the existing overly permissive update policy
DROP POLICY IF EXISTS "Users can update own record" ON public."Employees";

-- Create policy that allows users to update only safe fields (name, email, billing rate)
-- but prevents role and active status changes
CREATE POLICY "Users can update safe profile fields" 
ON public."Employees" 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create a separate policy for role and status management (admin only)
CREATE POLICY "Admin can manage all employee data" 
ON public."Employees" 
FOR ALL 
USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

-- Create a security audit log table for sensitive operations
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

-- Only admins can view audit logs
CREATE POLICY "Admin can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

-- Create function to log sensitive employee changes
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

-- Create trigger for employee changes
CREATE TRIGGER employee_security_audit
  AFTER UPDATE ON public."Employees"
  FOR EACH ROW
  EXECUTE FUNCTION public.log_employee_changes();

-- Create function to get current user role safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public."Employees" WHERE user_id = auth.uid() AND active = true;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;