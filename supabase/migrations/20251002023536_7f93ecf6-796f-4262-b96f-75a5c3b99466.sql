-- Drop the trigger that's causing the "no field id" error
-- The trigger_security_log function assumes all tables have an 'id' field,
-- but Project_Budgets uses 'WBS Code' as its primary key
DROP TRIGGER IF EXISTS security_log_project_budgets ON public."Project_Budgets";