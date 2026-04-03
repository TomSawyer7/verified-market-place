import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Search, ShieldCheck, Package, Star } from 'lucide-react';
import ProductRecommendations from '@/components/ProductRecommendations';

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  seller_name?: string;
  seller_verified?: boolean;
}

const Marketplace = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (data) {
        const userIds = [...new Set(data.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, status')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p] as const));
        const enriched: Product[] = data.map(p => {
          const prof = profileMap.get(p.user_id);
          return {
            ...p,
            seller_name: prof ? `${prof.first_name} ${prof.last_name}` : 'Unknown',
            seller_verified: prof?.status === 'verified',
          };
        });
        setProducts(enriched);
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.category?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Marketplace</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Browse verified seller products</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-muted" />
                <CardContent className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No products found</h3>
            <p className="text-sm text-muted-foreground">
              {products.length === 0 ? 'Be the first to list a product!' : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(product => (
              <Link key={product.id} to={`/product/${product.id}`}>
                <Card className="overflow-hidden hover:shadow-md transition-all group border">
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    {product.seller_verified && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="gap-1 text-[10px] bg-background/90 backdrop-blur">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm truncate">{product.title}</h3>
                    <p className="font-bold mt-1">₱{product.price.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">by {product.seller_name}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Recommendations when products exist */}
        {products.length > 0 && (
          <div className="mt-12 border-t pt-8">
            <ProductRecommendations title="Trending Products" limit={4} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
