-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID NULL, -- Can reference time entry id or other related records
  related_type TEXT NULL, -- 'time_entry', 'approval', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid()::text IN (
  SELECT user_id::text FROM public."Employees" WHERE id = notifications.user_id::text
));

CREATE POLICY "Admin can create notifications for users" 
ON public.notifications 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'dina@dmfengineering.com'::text);

CREATE POLICY "Users can update their own notifications (mark as read)" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid()::text IN (
  SELECT user_id::text FROM public."Employees" WHERE id = notifications.user_id::text
));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();