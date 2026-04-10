
-- Add location to products
ALTER TABLE public.products ADD COLUMN location text DEFAULT NULL;

-- Add bio to profiles
ALTER TABLE public.profiles ADD COLUMN bio text DEFAULT '';

-- Create reported_listings table
CREATE TABLE public.reported_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reported_listings ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports (cannot report own listings)
CREATE POLICY "Users can create reports"
ON public.reported_listings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reporter_id
  AND product_id NOT IN (SELECT id FROM public.products WHERE user_id = auth.uid())
);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.reported_listings
FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.reported_listings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update reports
CREATE POLICY "Admins can update reports"
ON public.reported_listings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete reports
CREATE POLICY "Admins can delete reports"
ON public.reported_listings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
