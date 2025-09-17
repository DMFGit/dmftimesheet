-- Drop the overly permissive policy that allows all authenticated users to view budget data
DROP POLICY IF EXISTS "Authenticated users view projects" ON public."Project_Budgets";

-- Create a more restrictive policy that only allows admin users to read budget data
CREATE POLICY "Admin users can view budget data" 
ON public."Project_Budgets" 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

-- The existing "Admin manage projects" policy already handles INSERT/UPDATE/DELETE for admins