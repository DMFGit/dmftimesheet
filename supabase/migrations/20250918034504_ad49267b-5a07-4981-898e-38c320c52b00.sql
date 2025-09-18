-- Phase 1: Critical Data Protection (Fixed Syntax)

-- Budget data is already secured via Project_Budgets table RLS policies
-- The budget_items view inherits security from the underlying Project_Budgets table

-- 1. Attach security triggers to Employees table (drop first if exists)
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public."Employees";
CREATE TRIGGER prevent_role_escalation_trigger
    BEFORE UPDATE ON public."Employees"
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

DROP TRIGGER IF EXISTS log_employee_changes_trigger ON public."Employees";
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

-- Create a single, secure employee update policy that prevents role/billing rate changes
CREATE POLICY "Users can update own profile (safe fields only)" 
ON public."Employees" 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
    auth.uid() = user_id AND
    -- Prevent changes to sensitive fields (triggers will also prevent these)
    OLD.role = NEW.role AND 
    OLD.active = NEW.active AND 
    OLD."Default Billing Rate" = NEW."Default Billing Rate"
);