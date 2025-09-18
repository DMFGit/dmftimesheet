-- Phase 1: Critical Security Triggers

-- 1. Attach security triggers to Employees table (drop first if exists)
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public."Employees";
CREATE TRIGGER prevent_role_escalation_trigger
    BEFORE UPDATE ON public."Employees"
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

DROP TRIGGER IF EXISTS log_employee_changes_trigger ON public."Employees";
CREATE TRIGGER log_employee_changes_trigger
    AFTER UPDATE ON public."Employees"
    FOR EACH ROW EXECUTE FUNCTION public.log_employee_changes();

-- Phase 2: Clean up duplicate RLS policies

-- Drop duplicate policies on Employees table
DROP POLICY IF EXISTS "Admin full access" ON public."Employees";
DROP POLICY IF EXISTS "Users can update profile only" ON public."Employees";

-- Drop duplicate policies on Time_Entries table  
DROP POLICY IF EXISTS "Employees can update draft and rejected entries" ON public."Time_Entries";

-- Drop the conflicting safe fields policy to avoid conflicts
DROP POLICY IF EXISTS "Users can update safe profile fields only" ON public."Employees";