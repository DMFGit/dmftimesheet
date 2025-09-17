-- Enable RLS on budget_items view and restrict to admin access only
ALTER VIEW public.budget_items SET (security_barrier = true);

-- Create policy to allow only admin users to view budget data
CREATE POLICY "Admin can view budget items" 
ON public.budget_items 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);