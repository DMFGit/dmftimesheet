-- Create secure function to access budget items (admin only)
CREATE OR REPLACE FUNCTION public.get_budget_items_secure()
RETURNS SETOF budget_items
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Only allow admin access to budget data
  SELECT * FROM budget_items 
  WHERE (auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text;
$$;

-- Update the existing get_budget_items function to be admin-only
CREATE OR REPLACE FUNCTION public.get_budget_items()
RETURNS SETOF budget_items
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Only allow admin access to budget data
  SELECT * FROM budget_items 
  WHERE (auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text;
$$;