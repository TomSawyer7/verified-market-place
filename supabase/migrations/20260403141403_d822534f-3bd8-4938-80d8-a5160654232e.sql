
-- Fix login_attempts - restrict authenticated insert to match email
DROP POLICY "Anyone can insert login attempts" ON public.login_attempts;
CREATE POLICY "Authenticated can log own attempts" ON public.login_attempts
FOR INSERT TO authenticated WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Fix notifications insert policy - remove the overly permissive one
DROP POLICY IF EXISTS "Users can insert notifications for others" ON public.notifications;
