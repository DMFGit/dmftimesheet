-- Fix security linter issues: Function Search Path Mutable

-- Update functions that don't have proper search_path set
ALTER FUNCTION public.log_security_event(TEXT, TEXT, UUID, JSONB) SET search_path = public;
ALTER FUNCTION public.trigger_security_log() SET search_path = public;