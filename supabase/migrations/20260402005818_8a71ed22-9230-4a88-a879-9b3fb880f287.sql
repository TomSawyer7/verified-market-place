
DROP POLICY "Authenticated can insert notifications" ON public.notifications;
DROP POLICY "Admins can insert any notification" ON public.notifications;

CREATE POLICY "Users can insert notifications for others" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id != auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System and admins can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
