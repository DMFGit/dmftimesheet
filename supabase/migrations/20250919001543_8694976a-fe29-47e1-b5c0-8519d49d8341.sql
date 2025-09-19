-- Create additional security validation triggers for time entries
CREATE OR REPLACE FUNCTION public.validate_time_entry_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate hours are reasonable (between 0.25 and 24)
  IF NEW.hours < 0.25 OR NEW.hours > 24 THEN
    RAISE EXCEPTION 'Invalid hours: Must be between 0.25 and 24';
  END IF;
  
  -- Validate entry date is not in the future
  IF NEW.entry_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Invalid date: Cannot enter time for future dates';
  END IF;
  
  -- Validate entry date is not too old (more than 90 days)
  IF NEW.entry_date < CURRENT_DATE - INTERVAL '90 days' THEN
    RAISE EXCEPTION 'Invalid date: Cannot enter time for dates older than 90 days';
  END IF;
  
  -- Validate WBS code format (basic check)
  IF NEW.wbs_code IS NULL OR LENGTH(NEW.wbs_code) < 3 THEN
    RAISE EXCEPTION 'Invalid WBS code: Must be at least 3 characters';
  END IF;
  
  -- Log security events for sensitive operations
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, record_id, old_values, new_values
    ) VALUES (
      auth.uid(),
      'status_change',
      'Time_Entries',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for time entry validation
DROP TRIGGER IF EXISTS validate_time_entry_security_trigger ON public."Time_Entries";
CREATE TRIGGER validate_time_entry_security_trigger
  BEFORE INSERT OR UPDATE ON public."Time_Entries"
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_time_entry_security();

-- Create function to validate employee data changes
CREATE OR REPLACE FUNCTION public.validate_employee_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate email format
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate role values
  IF NEW.role IS NOT NULL AND NEW.role NOT IN ('admin', 'employee', 'contractor') THEN
    RAISE EXCEPTION 'Invalid role: Must be admin, employee, or contractor';
  END IF;
  
  -- Validate billing rate
  IF NEW."Default Billing Rate" IS NOT NULL AND NEW."Default Billing Rate" < 0 THEN
    RAISE EXCEPTION 'Invalid billing rate: Must be non-negative';
  END IF;
  
  -- Prevent creating duplicate active employees with same email
  IF TG_OP = 'INSERT' AND NEW.active = true THEN
    IF EXISTS (
      SELECT 1 FROM "Employees" 
      WHERE email = NEW.email 
      AND active = true 
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Employee with this email already exists';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for employee validation
DROP TRIGGER IF EXISTS validate_employee_security_trigger ON public."Employees";
CREATE TRIGGER validate_employee_security_trigger
  BEFORE INSERT OR UPDATE ON public."Employees"
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_employee_security();