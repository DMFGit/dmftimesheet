-- Fix Security Issues: Remove infinite recursion and implement proper policies

-- 1. First, drop all conflicting policies to start clean
DROP POLICY IF EXISTS "Users can view basic employee info" ON public."Employees";
DROP POLICY IF EXISTS "Users can update their name only" ON public."Employees";
DROP POLICY IF EXISTS "Admins can view all employee data" ON public."Employees";  
DROP POLICY IF EXISTS "Admins can update all employee data" ON public."Employees";
DROP POLICY IF EXISTS "Admin only access to project budgets" ON public."Project_Budgets";
DROP POLICY IF EXISTS "Users can view their own notifications only" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications only" ON public.notifications;
DROP POLICY IF EXISTS "Employees can view their own time entries only" ON public."Time_Entries";
DROP POLICY IF EXISTS "Employees can insert their own time entries only" ON public."Time_Entries";
DROP POLICY IF EXISTS "Employees can update their own draft/rejected time entries" ON public."Time_Entries";
DROP POLICY IF EXISTS "Employees can delete their own draft/rejected time entries" ON public."Time_Entries";
DROP POLICY IF EXISTS "Admins can manage all time entries" ON public."Time_Entries";

-- 2. Create proper Employee policies using existing is_admin() function
CREATE POLICY "Users can view basic employee info" 
ON public."Employees" 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update name only" 
ON public."Employees" 
FOR UPDATE 
USING (auth.uid() = user_id AND NOT is_admin())
WITH CHECK (auth.uid() = user_id AND NOT is_admin());

CREATE POLICY "Admins can view all employees" 
ON public."Employees" 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can update all employees" 
ON public."Employees" 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

-- 3. Secure Project Budgets (admin only access to financial data)
CREATE POLICY "Admin only project budgets" 
ON public."Project_Budgets" 
FOR ALL 
USING (is_admin());

-- 4. Secure Time Entries
CREATE POLICY "Users view own time entries" 
ON public."Time_Entries" 
FOR SELECT 
USING (
  employee_id IN (
    SELECT id FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

CREATE POLICY "Users insert own time entries" 
ON public."Time_Entries" 
FOR INSERT 
WITH CHECK (
  employee_id IN (
    SELECT id FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

CREATE POLICY "Users update own draft/rejected time entries" 
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

CREATE POLICY "Users delete own draft/rejected time entries" 
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

CREATE POLICY "Admin manage all time entries" 
ON public."Time_Entries" 
FOR ALL 
USING (is_admin());

-- 5. Fix Notifications to use employee_id instead of user_id for lookups
-- (The notifications table uses employee_id, not user_id directly)
CREATE POLICY "Users view own notifications" 
ON public.notifications 
FOR SELECT 
USING (
  user_id IN (
    SELECT id FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

CREATE POLICY "Users update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (
  user_id IN (
    SELECT id FROM public."Employees" 
    WHERE user_id = auth.uid() 
    AND active = true
  )
);

-- 6. Create security audit table if not exists and secure it
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

-- Enable RLS on audit log if not already enabled
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop and recreate audit log policy
DROP POLICY IF EXISTS "Admin only access to security audit logs" ON public.security_audit_log;
CREATE POLICY "Admin only audit logs" 
ON public.security_audit_log 
FOR ALL 
USING (is_admin());

-- Comments for documentation
COMMENT ON POLICY "Users can view basic employee info" ON public."Employees" IS 'Allows users to view their own employee record only';
COMMENT ON POLICY "Admin only project budgets" ON public."Project_Budgets" IS 'Restricts all project budget access to administrators only';