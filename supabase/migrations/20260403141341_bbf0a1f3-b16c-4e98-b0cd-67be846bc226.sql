
-- Fix security_events insert policy - restrict to own user_id
DROP POLICY "System can insert security events" ON public.security_events;
CREATE POLICY "Users can insert own security events" ON public.security_events
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Allow anon insert for security events (pre-auth events)
CREATE POLICY "Anon can insert security events" ON public.security_events
FOR INSERT TO anon WITH CHECK (user_id IS NULL);
