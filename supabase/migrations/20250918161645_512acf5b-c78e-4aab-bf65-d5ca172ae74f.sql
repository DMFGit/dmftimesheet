-- Allow users to create their own employee record during signup
CREATE POLICY "Users can create their own employee record" 
ON public."Employees" 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create a secure function to handle OAuth user employee creation
CREATE OR REPLACE FUNCTION public.create_employee_for_oauth_user(
  p_user_id UUID,
  p_name TEXT,
  p_email TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  employee_id UUID;
BEGIN
  -- Check if employee already exists
  SELECT id INTO employee_id 
  FROM "Employees" 
  WHERE user_id = p_user_id;
  
  -- If employee doesn't exist, create one
  IF employee_id IS NULL THEN
    INSERT INTO "Employees" (user_id, name, email, role, active, "Default Billing Rate")
    VALUES (p_user_id, p_name, p_email, 'employee', true, 0)
    RETURNING id INTO employee_id;
  END IF;
  
  RETURN employee_id;
END;
$$;