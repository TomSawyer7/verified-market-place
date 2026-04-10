import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Package, MapPin, Calendar, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import SellerReviews, { SellerRatingBadge } from '@/components/SellerReviews';

interface SellerProduct {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  category: string | null;
  location: string | null;
}

const SellerProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const isOwner = user?.id === id;

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const [{ data: prof }, { data: prods }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('products').select('id, title, price, image_url, category, location').eq('user_id', id).eq('status', 'active').order('created_at', { ascending: false }),
      ]);
      if (prof) {
        setProfile(prof);
        setEditBio(prof.bio || '');
        setEditMobile(prof.mobile_number || '');
        setEditAddress(prof.address || '');
      }
      setProducts((prods || []) as SellerProduct[]);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      bio: editBio,
      mobile_number: editMobile,
      address: editAddress,
    }).eq('id', id);
    setSaving(false);
    if (error) {
      toast.error('Failed to update profile');
    } else {
      setProfile((p: any) => ({ ...p, bio: editBio, mobile_number: editMobile, address: editAddress }));
      setEditing(false);
      toast.success('Profile updated!');
    }
  };

  if (loading) {
    return <div className="container py-8"><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>;
  }

  if (!profile) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-xl font-bold">Seller not found</h2>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-foreground/5 border flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold">{profile.first_name?.[0]}{profile.last_name?.[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{profile.first_name} {profile.last_name}</h1>
                {profile.status === 'verified' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </Badge>
                )}
                <SellerRatingBadge sellerId={id!} />
              </div>

              {editing ? (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Bio</Label>
                    <Textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={2} placeholder="Tell buyers about yourself..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Mobile</Label>
                      <Input value={editMobile} onChange={e => setEditMobile(e.target.value)} placeholder="09XX XXX XXXX" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Address</Label>
                      <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="City, Province" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1 bg-foreground text-background hover:bg-foreground/90" onClick={handleSave} disabled={saving}>
                      <Save className="h-3 w-3" /> {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing(false)}>
                      <X className="h-3 w-3" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {profile.bio && <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    {profile.address && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.address}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {isOwner && (
                    <Button size="sm" variant="outline" className="mt-3 gap-1 text-xs" onClick={() => setEditing(true)}>
                      <Edit2 className="h-3 w-3" /> Edit Profile
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="listings">
        <TabsList>
          <TabsTrigger value="listings" className="text-xs">Listings ({products.length})</TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-4">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active listings</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map(p => (
                <Link key={p.id} to={`/product/${p.id}`}>
                  <Card className="overflow-hidden hover:shadow-md transition-all group border">
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="flex items-center justify-center h-full"><Package className="h-10 w-10 text-muted-foreground" /></div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm truncate">{p.title}</h3>
                      <p className="font-bold mt-1">₱{p.price.toLocaleString()}</p>
                      {p.location && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {p.location}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <SellerReviews sellerId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SellerProfile;
