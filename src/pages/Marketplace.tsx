import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { TrustScoreBadge } from '@/components/TrustBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShieldCheck, MapPin } from 'lucide-react';
import { useState } from 'react';

const Marketplace = () => {
  const { listings } = useMarketplace();
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const categories = ['all', ...new Set(listings.map(l => l.category))];

  const filtered = listings
    .filter(l => l.status === 'active')
    .filter(l => category === 'all' || l.category === category)
    .filter(l => l.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
        <p className="text-muted-foreground">Browse trusted listings from verified sellers</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          placeholder="Search listings..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((listing, i) => (
          <Link key={listing.id} to={`/listing/${listing.id}`} className="group">
            <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <span className="text-4xl opacity-50">📦</span>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {listing.title}
                  </h3>
                </div>
                <p className="text-xl font-bold text-primary mb-3">
                  ₱{listing.price.toLocaleString()}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{listing.sellerName}</span>
                    {listing.sellerVerified && (
                      <ShieldCheck className="h-4 w-4 text-verified" />
                    )}
                  </div>
                  <TrustScoreBadge score={listing.sellerTrustScore} size="sm" />
                </div>
                <Badge variant="secondary" className="mt-2">{listing.category}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No listings found</p>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
