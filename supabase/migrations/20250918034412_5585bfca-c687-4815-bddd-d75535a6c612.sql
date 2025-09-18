-- Phase 1: Critical Data Protection

-- 1. Secure budget_items table with RLS policies
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- Only admin users can access budget data
CREATE POLICY "Admin can view budget items" 
ON public.budget_items 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

CREATE POLICY "Admin can manage budget items" 
ON public.budget_items 
FOR ALL 
USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

-- 2. Attach security triggers to Employees table
CREATE TRIGGER prevent_role_escalation_trigger
    BEFORE UPDATE ON public."Employees"
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

CREATE TRIGGER log_employee_changes_trigger
    AFTER UPDATE ON public."Employees"
    FOR EACH ROW EXECUTE FUNCTION public.log_employee_changes();

-- Phase 2: Clean up duplicate and conflicting RLS policies

-- Drop duplicate policies on Employees table
DROP POLICY IF EXISTS "Admin full access" ON public."Employees";
DROP POLICY IF EXISTS "Users can update profile only" ON public."Employees";

-- Drop duplicate policies on Time_Entries table  
DROP POLICY IF EXISTS "Employees can update draft and rejected entries" ON public."Time_Entries";

-- Ensure we have a single, clear employee update policy
DROP POLICY IF EXISTS "Users can update safe profile fields only" ON public."Employees";

-- Create a single, secure employee update policy
CREATE POLICY "Users can update own profile (safe fields only)" 
ON public."Employees" 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);