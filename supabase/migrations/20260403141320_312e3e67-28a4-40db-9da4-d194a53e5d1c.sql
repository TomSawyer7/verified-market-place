
-- Security events table for comprehensive logging
CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  description TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all security events" ON public.security_events
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert security events" ON public.security_events
FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_security_events_user ON public.security_events(user_id);
CREATE INDEX idx_security_events_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_created ON public.security_events(created_at DESC);

-- Login attempts tracking
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login attempts" ON public.login_attempts
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert login attempts" ON public.login_attempts
FOR INSERT TO authenticated WITH CHECK (true);

-- Allow anon to insert login attempts (for failed logins before auth)
CREATE POLICY "Anon can insert login attempts" ON public.login_attempts
FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_created ON public.login_attempts(created_at DESC);

-- Session activity log
CREATE TABLE public.session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.session_logs
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions" ON public.session_logs
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own sessions" ON public.session_logs
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_session_logs_user ON public.session_logs(user_id);
