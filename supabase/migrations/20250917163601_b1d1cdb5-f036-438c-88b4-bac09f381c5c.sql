-- Enable Row Level Security on budget_items table
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- Create policy for admin to manage all budget items
CREATE POLICY "Admin can manage budget items" 
ON public.budget_items 
FOR ALL 
USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

-- Create policy for authenticated users to view budget items
-- (needed for employees to see budget items when creating time entries)
CREATE POLICY "Authenticated users can view budget items" 
ON public.budget_items 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);