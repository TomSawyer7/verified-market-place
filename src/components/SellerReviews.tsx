import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  reviewer_id: string;
  seller_id: string;
  product_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name?: string;
}

interface SellerReviewsProps {
  sellerId: string;
  productId?: string;
  compact?: boolean;
}

const StarRating = ({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <button
        key={i}
        type="button"
        disabled={!interactive}
        onClick={() => onRate?.(i)}
        className={cn("transition-colors", interactive && "cursor-pointer hover:scale-110")}
      >
        <Star className={cn("h-4 w-4", i <= rating ? "fill-foreground text-foreground" : "text-muted-foreground/30")} />
      </button>
    ))}
  </div>
);

export const SellerRatingBadge = ({ sellerId }: { sellerId: string }) => {
  const [avg, setAvg] = useState<number>(0);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    supabase
      .from('reviews')
      .select('rating')
      .eq('seller_id', sellerId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCount(data.length);
          setAvg(data.reduce((s, r) => s + r.rating, 0) / data.length);
        }
      });
  }, [sellerId]);

  if (count === 0) return <span className="text-[11px] text-muted-foreground">No reviews</span>;

  return (
    <div className="flex items-center gap-1">
      <Star className="h-3 w-3 fill-foreground text-foreground" />
      <span className="text-xs font-medium">{avg.toFixed(1)}</span>
      <span className="text-[11px] text-muted-foreground">({count})</span>
    </div>
  );
};

const SellerReviews = ({ sellerId, productId, compact = false }: SellerReviewsProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const fetchReviews = async () => {
    let query = supabase.from('reviews').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false });
    if (compact) query = query.limit(3);
    const { data } = await query;

    if (data && data.length > 0) {
      const reviewerIds = [...new Set(data.map(r => r.reviewer_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', reviewerIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p] as const));
      const enriched = data.map(r => ({
        ...r,
        reviewer_name: profileMap.get(r.reviewer_id) ? `${profileMap.get(r.reviewer_id)!.first_name} ${profileMap.get(r.reviewer_id)!.last_name}` : 'Anonymous',
      }));
      setReviews(enriched);

      if (user && productId) {
        setHasReviewed(data.some(r => r.reviewer_id === user.id && r.product_id === productId));
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [sellerId, user]);

  const handleSubmit = async () => {
    if (!user || !productId) return;
    setSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      reviewer_id: user.id,
      seller_id: sellerId,
      product_id: productId,
      rating,
      comment: comment.trim() || null,
    });
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'You already reviewed this product' : error.message);
    } else {
      toast.success('Review submitted!');
      setComment('');
      setRating(5);
      setHasReviewed(true);
      fetchReviews();
    }
    setSubmitting(false);
  };

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Seller Reviews</h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-xs text-muted-foreground">{avgRating.toFixed(1)} ({reviews.length})</span>
          </div>
        )}
      </div>

      {/* Review form */}
      {user && productId && user.id !== sellerId && !hasReviewed && (
        <Card className="border">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-medium">Leave a review</p>
            <StarRating rating={rating} onRate={setRating} interactive />
            <Textarea
              placeholder="Share your experience..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
            <Button size="sm" onClick={handleSubmit} disabled={submitting} className="gap-1 bg-foreground text-background hover:bg-foreground/90">
              <Send className="h-3 w-3" /> {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No reviews yet</p>
      ) : (
        <div className="space-y-2">
          {reviews.map(r => (
            <div key={r.id} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{r.reviewer_name}</span>
                  <StarRating rating={r.rating} />
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerReviews;
