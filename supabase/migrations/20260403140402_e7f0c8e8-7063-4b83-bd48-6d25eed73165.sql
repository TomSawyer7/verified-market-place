
-- Reviews table for seller ratings
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reviewer_id, product_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT TO authenticated USING (true);

-- Authenticated users can create reviews (not for own products)
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reviewer_id AND reviewer_id != seller_id);

-- Users can update own reviews
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = reviewer_id);

-- Users can delete own reviews
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE TO authenticated
  USING (auth.uid() = reviewer_id);

-- Enable realtime for reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
