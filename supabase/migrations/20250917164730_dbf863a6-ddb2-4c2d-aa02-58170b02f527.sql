-- Fix security linter warnings: Function Search Path Mutable
-- Set proper search_path for all functions to prevent security issues

-- Fix prevent_role_escalation function
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Check if non-admin is trying to change sensitive fields
  IF auth.uid() IS NOT NULL AND (auth.jwt() ->> 'email'::text) != 'dina@dmfengineering.com'::text THEN
    -- Prevent role changes
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Permission denied: Cannot modify role';
    END IF;
    
    -- Prevent status changes  
    IF OLD.active IS DISTINCT FROM NEW.active THEN
      RAISE EXCEPTION 'Permission denied: Cannot modify active status';
    END IF;
    
    -- Prevent billing rate changes
    IF OLD."Default Billing Rate" IS DISTINCT FROM NEW."Default Billing Rate" THEN
      RAISE EXCEPTION 'Permission denied: Cannot modify billing rate';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix log_employee_changes function
CREATE OR REPLACE FUNCTION public.log_employee_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Log role changes (only admins can do this)
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
$$;