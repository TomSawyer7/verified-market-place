import { useAuth } from '@/contexts/AuthContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { TrustScoreBadge, VerificationBadge } from '@/components/TrustBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user } = useAuth();
  const { listings, transactions } = useMarketplace();
  const navigate = useNavigate();

  if (!user) { navigate('/login'); return null; }

  const myListings = listings.filter(l => l.sellerId === user.id);
  const myTransactions = transactions.filter(t => t.buyerId === user.id || t.sellerId === user.id);

  return (
    <div className="container py-8 max-w-3xl">
      <Card className="mb-6 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {user.name[0]}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex gap-2 mt-2">
                <TrustScoreBadge score={user.trustScore} />
                <VerificationBadge status={user.verificationStatus} />
                <Badge variant="secondary">{user.role}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">My Listings ({myListings.length})</CardTitle></CardHeader>
          <CardContent>
            {myListings.length === 0 ? (
              <p className="text-muted-foreground text-sm">No listings yet</p>
            ) : (
              <div className="space-y-3">
                {myListings.map(l => (
                  <div key={l.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium text-foreground">{l.title}</span>
                    <span className="text-sm font-bold text-primary">₱{l.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Transactions ({myTransactions.length})</CardTitle></CardHeader>
          <CardContent>
            {myTransactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {myTransactions.map(t => (
                  <div key={t.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                    <div>
                      <span className="text-sm font-medium text-foreground">{t.listingTitle}</span>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">{t.method.toUpperCase()}</Badge>
                        <Badge variant={t.status === 'completed' ? 'default' : 'secondary'} className="text-xs">{t.status}</Badge>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary">₱{t.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
