import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Package, ShieldCheck } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  price: number;
  category: string | null;
  image_url: string | null;
  user_id: string;
  seller_verified?: boolean;
}

interface Props {
  currentProductId?: string;
  category?: string | null;
  sellerId?: string;
  title?: string;
  limit?: number;
}

const ProductRecommendations = ({ currentProductId, category, sellerId, title = 'You might also like', limit = 4 }: Props) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Fetch same-category products first, then fill with others
      let query = supabase
        .from('products')
        .select('id, title, price, category, image_url, user_id')
        .eq('status', 'active')
        .limit(limit + 1);

      if (category) query = query.eq('category', category);
      if (currentProductId) query = query.neq('id', currentProductId);

      const { data: sameCat } = await query.order('created_at', { ascending: false });
      let results = (sameCat || []).filter(p => p.id !== currentProductId).slice(0, limit);

      // If not enough, fetch more from other categories
      if (results.length < limit) {
        const excludeIds = [currentProductId, ...results.map(r => r.id)].filter(Boolean) as string[];
        const { data: others } = await supabase
          .from('products')
          .select('id, title, price, category, image_url, user_id')
          .eq('status', 'active')
          .not('id', 'in', `(${excludeIds.join(',')})`)
          .order('created_at', { ascending: false })
          .limit(limit - results.length);
        results = [...results, ...(others || [])];
      }

      // Enrich with seller verification
      if (results.length > 0) {
        const userIds = [...new Set(results.map(p => p.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, status').in('id', userIds);
        const verifiedSet = new Set((profiles || []).filter(p => p.status === 'verified').map(p => p.id));
        results = results.map(p => ({ ...p, seller_verified: verifiedSet.has(p.user_id) }));
      }

      setProducts(results);
      setLoading(false);
    };
    fetch();
  }, [currentProductId, category, limit]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">{title}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(limit)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-muted" />
              <CardContent className="p-2 space-y-1">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {products.map(product => (
          <Link key={product.id} to={`/product/${product.id}`}>
            <Card className="overflow-hidden hover:shadow-md transition-all group border">
              <div className="aspect-square bg-muted relative overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {product.seller_verified && (
                  <div className="absolute top-1.5 right-1.5">
                    <Badge variant="secondary" className="gap-0.5 text-[9px] bg-background/90 backdrop-blur px-1.5 py-0.5">
                      <ShieldCheck className="h-2.5 w-2.5" /> Verified
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-2">
                <h4 className="font-medium text-xs truncate">{product.title}</h4>
                <p className="font-bold text-sm mt-0.5">₱{product.price.toLocaleString()}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ProductRecommendations;
