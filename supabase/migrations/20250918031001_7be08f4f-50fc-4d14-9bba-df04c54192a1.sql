-- Update RLS policy to allow employees to update their own draft AND rejected time entries
DROP POLICY IF EXISTS "Employees can update their own draft time entries" ON "Time_Entries";

CREATE POLICY "Employees can update draft and rejected entries" 
ON "Time_Entries" 
FOR UPDATE 
USING (
  (EXISTS ( 
    SELECT 1
    FROM "Employees"
    WHERE (("Employees".id = "Time_Entries".employee_id) AND ("Employees".user_id = auth.uid()))
  )) AND (status IN ('draft'::text, 'rejected'::text))
);