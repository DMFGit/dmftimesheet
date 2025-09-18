-- CRITICAL SECURITY FIX: Add RLS policies to prevent data exposure

-- Enable RLS on budget_items view (if not already enabled)
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

-- Enable RLS on project_hierarchy view (if not already enabled) 
ALTER TABLE project_hierarchy ENABLE ROW LEVEL SECURITY;

-- Enable RLS on task_hierarchy view (if not already enabled)
ALTER TABLE task_hierarchy ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Restrict budget_items to admin only (contains sensitive financial data)
CREATE POLICY "Admin only access to budget items" 
ON budget_items 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

-- Restrict project_hierarchy to authenticated users only
CREATE POLICY "Authenticated users can view project hierarchy" 
ON project_hierarchy 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Restrict task_hierarchy to authenticated users only  
CREATE POLICY "Authenticated users can view task hierarchy"
ON task_hierarchy 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add security audit logging for sensitive data access
CREATE OR REPLACE FUNCTION public.log_budget_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log budget data access attempts
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id, new_values
  ) VALUES (
    auth.uid(),
    'budget_access',
    'budget_items', 
    NULL,
    jsonb_build_object('access_time', now(), 'user_email', auth.jwt() ->> 'email')
  );
  
  RETURN NEW;
END;
$$;