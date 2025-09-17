-- Enable Row Level Security on budget_items table
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to restrict access to admin users only
CREATE POLICY "Admin only access to budget items" 
ON public.budget_items 
FOR ALL 
USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

-- Also create a more restrictive policy for SELECT operations for authenticated users
-- This allows the RPC functions to work while still protecting direct table access
CREATE POLICY "Authenticated users via RPC only" 
ON public.budget_items 
FOR SELECT 
USING (false); -- This effectively blocks direct SELECT unless overridden by admin policy