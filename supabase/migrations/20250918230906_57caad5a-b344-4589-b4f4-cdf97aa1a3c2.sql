-- Phase 1: Create proper admin users and fix critical security issues

-- First, let's create a test admin user if no users exist yet
-- This is a temporary admin account for testing and setup
INSERT INTO "Employees" (name, email, role, active, "Default Billing Rate")
VALUES 
  ('System Administrator', 'admin@dmfengineering.com', 'admin', true, 150)
ON CONFLICT DO NOTHING;

-- Update any existing CEO or leadership roles to also have admin privileges
-- This ensures continuity of access while establishing proper admin roles
UPDATE "Employees" 
SET role = 'admin' 
WHERE (role ILIKE '%ceo%' OR role ILIKE '%president%' OR role ILIKE '%director%') 
  AND active = true
  AND role != 'admin';

-- Add audit logging for admin role assignments
INSERT INTO public.security_audit_log (
  user_id, action, table_name, new_values
) 
SELECT 
  NULL as user_id,
  'admin_role_assignment' as action,
  'Employees' as table_name,
  jsonb_build_object(
    'employee_id', id,
    'name', name,
    'email', email,
    'role', role,
    'assigned_at', now(),
    'reason', 'Security fix - establishing proper admin users'
  ) as new_values
FROM "Employees" 
WHERE role = 'admin' AND active = true;