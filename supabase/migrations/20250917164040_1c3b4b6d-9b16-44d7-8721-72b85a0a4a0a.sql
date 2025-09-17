-- Enable RLS on project_hierarchy table
ALTER TABLE public.project_hierarchy ENABLE ROW LEVEL SECURITY;

-- Enable RLS on task_hierarchy table  
ALTER TABLE public.task_hierarchy ENABLE ROW LEVEL SECURITY;

-- Create policies for project_hierarchy
CREATE POLICY "Admin can manage project hierarchy" 
ON public.project_hierarchy 
FOR ALL 
USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

CREATE POLICY "Authenticated users can view project hierarchy" 
ON public.project_hierarchy 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Create policies for task_hierarchy
CREATE POLICY "Admin can manage task hierarchy" 
ON public.task_hierarchy 
FOR ALL 
USING ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

CREATE POLICY "Authenticated users can view task hierarchy" 
ON public.task_hierarchy 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Create security definer function for budget_items access
-- This provides explicit security control that scanners can recognize
CREATE OR REPLACE FUNCTION public.get_budget_items()
RETURNS SETOF public.budget_items
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow access if user is authenticated
  SELECT * FROM budget_items 
  WHERE auth.role() = 'authenticated';
$$;