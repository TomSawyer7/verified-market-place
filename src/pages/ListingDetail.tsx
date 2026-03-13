import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { TrustScoreBadge, VerificationBadge } from '@/components/TrustBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ArrowLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { listings, createTransaction } = useMarketplace();

  const listing = listings.find(l => l.id === id);
  if (!listing) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground text-lg">Listing not found</p>
        <Button variant="ghost" onClick={() => navigate('/marketplace')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Marketplace
        </Button>
      </div>
    );
  }

  const canUseCOD = user && user.trustScore >= 50;
  const isSeller = user?.id === listing.sellerId;

  const handleBuy = (method: 'online' | 'cod') => {
    if (!user) return;
    createTransaction({
      listingId: listing.id,
      listingTitle: listing.title,
      buyerId: user.id,
      sellerId: listing.sellerId,
      amount: listing.price,
      method,
    });
    toast.success(`Transaction created! Payment method: ${method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}`);
    navigate('/marketplace');
  };

  return (
    <div className="container py-8 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate('/marketplace')} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
        <div className="aspect-square rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
          <span className="text-8xl opacity-40">📦</span>
        </div>

        <div className="space-y-6">
          <div>
            <Badge variant="secondary" className="mb-2">{listing.category}</Badge>
            <h1 className="text-2xl font-bold text-foreground">{listing.title}</h1>
            <p className="text-3xl font-bold text-primary mt-2">₱{listing.price.toLocaleString()}</p>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {listing.sellerName[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{listing.sellerName}</span>
                    {listing.sellerVerified && <ShieldCheck className="h-4 w-4 text-verified" />}
                  </div>
                  <TrustScoreBadge score={listing.sellerTrustScore} size="sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="font-semibold mb-2 text-foreground">Description</h3>
            <p className="text-muted-foreground leading-relaxed">{listing.description}</p>
          </div>

          {isAuthenticated && !isSeller && (
            <div className="space-y-3">
              <Button className="w-full" size="lg" onClick={() => handleBuy('online')}>
                Buy Now — Online Payment
              </Button>
              {canUseCOD ? (
                <Button variant="outline" className="w-full" size="lg" onClick={() => handleBuy('cod')}>
                  Cash on Delivery
                </Button>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-trust-low/10 text-trust-low text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Trust score of 50+ required for COD. Current: {user?.trustScore ?? 0}</span>
                </div>
              )}
            </div>
          )}

          {isSeller && (
            <div className="p-3 rounded-lg bg-muted text-muted-foreground text-sm">
              This is your listing.
            </div>
          )}

          {!isAuthenticated && (
            <Button className="w-full" size="lg" onClick={() => navigate('/login')}>
              Sign in to purchase
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListingDetail;
