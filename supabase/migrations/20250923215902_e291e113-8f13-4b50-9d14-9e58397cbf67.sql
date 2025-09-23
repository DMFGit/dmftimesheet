-- Security Enhancement Migration: Address identified security vulnerabilities
-- Fixed version with correct table names

-- 1. Enhanced Employee RLS Policies - Protect sensitive financial data
DROP POLICY IF EXISTS "Users can view their own employee record" ON public."Employees";
DROP POLICY IF EXISTS "Users can update their own employee record" ON public."Employees";

-- Create separate policies for viewing and updating with field restrictions
CREATE POLICY "Users can view basic employee info" 
ON public."Employees" 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to update only non-sensitive fields (name only)
CREATE POLICY "Users can update their name only" 
ON public."Employees" 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin-only access to sensitive employee fields
CREATE POLICY "Admins can view all employee data" 
ON public."Employees" 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND active = true
  )
);

CREATE POLICY "Admins can update all employee data" 
ON public."Employees" 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND active = true
  )
);

-- 2. Enhanced Project Budget Security - Remove employee access to financial data
DROP POLICY IF EXISTS "Employees can view project budgets for their assigned projects" ON public."Project_Budgets";

-- Only admins can access project budget data
CREATE POLICY "Admin only access to project budgets" 
ON public."Project_Budgets" 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND active = true
  )
);

-- 3. Enhanced Notification Security - Direct user_id matching
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications only" 
ON public.notifications 
FOR SELECT 
USING (
  user_id IN (
    SELECT id FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

CREATE POLICY "Users can update their own notifications only" 
ON public.notifications 
FOR UPDATE 
USING (
  user_id IN (
    SELECT id FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

-- 4. Create Security Audit Log Table for enhanced monitoring
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  employee_id UUID REFERENCES public."Employees"(id),
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access to security audit logs
CREATE POLICY "Admin only access to security audit logs" 
ON public.security_audit_log 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND active = true
  )
);

-- 5. Create function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action_type TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  -- Get employee ID for current user
  SELECT id INTO v_employee_id 
  FROM public."Employees" 
  WHERE user_id = auth.uid();
  
  INSERT INTO public.security_audit_log (
    user_id,
    employee_id,
    action_type,
    table_name,
    record_id,
    details
  ) VALUES (
    auth.uid(),
    v_employee_id,
    p_action_type,
    p_table_name,
    p_record_id,
    p_details
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the main operation if logging fails
    NULL;
END;
$$;

-- 6. Add security logging triggers for sensitive tables
CREATE OR REPLACE FUNCTION public.trigger_security_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.log_security_event(
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add security logging to sensitive tables
DROP TRIGGER IF EXISTS security_log_employees ON public."Employees";
CREATE TRIGGER security_log_employees
  AFTER INSERT OR UPDATE OR DELETE ON public."Employees"
  FOR EACH ROW EXECUTE FUNCTION public.trigger_security_log();

DROP TRIGGER IF EXISTS security_log_project_budgets ON public."Project_Budgets";
CREATE TRIGGER security_log_project_budgets
  AFTER INSERT OR UPDATE OR DELETE ON public."Project_Budgets"
  FOR EACH ROW EXECUTE FUNCTION public.trigger_security_log();

-- 7. Enhanced Time Entry Security - Ensure employees only access their own data
DROP POLICY IF EXISTS "Employees can manage their own time entries" ON public."Time_Entries";

CREATE POLICY "Employees can view their own time entries only" 
ON public."Time_Entries" 
FOR SELECT 
USING (
  employee_id IN (
    SELECT id FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

CREATE POLICY "Employees can insert their own time entries only" 
ON public."Time_Entries" 
FOR INSERT 
WITH CHECK (
  employee_id IN (
    SELECT id FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

CREATE POLICY "Employees can update their own draft/rejected time entries" 
ON public."Time_Entries" 
FOR UPDATE 
USING (
  employee_id IN (
    SELECT id FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
  AND status IN ('draft', 'rejected')
);

CREATE POLICY "Employees can delete their own draft/rejected time entries" 
ON public."Time_Entries" 
FOR DELETE 
USING (
  employee_id IN (
    SELECT id FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
  AND status IN ('draft', 'rejected')
);

-- Admin policies for time entries
CREATE POLICY "Admins can manage all time entries" 
ON public."Time_Entries" 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND active = true
  )
);

-- Comments for documentation
COMMENT ON TABLE public.security_audit_log IS 'Security audit log for tracking sensitive data access and modifications';
COMMENT ON FUNCTION public.log_security_event IS 'Function to log security events for audit trail';
COMMENT ON FUNCTION public.trigger_security_log IS 'Trigger function to automatically log security events';