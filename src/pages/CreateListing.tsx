import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Upload } from 'lucide-react';

const CATEGORIES = ['Electronics', 'Fashion', 'Home & Living', 'Sports', 'Books', 'Toys', 'Automotive', 'General'];

const CreateListing = () => {
  const { user, isVerified } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('General');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user || !isVerified) {
    return (
      <div className="container py-20 text-center">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Verification Required</h2>
        <p className="text-muted-foreground mb-4">You must be fully verified to create listings.</p>
        <Button onClick={() => navigate('/verification')}>Go to Verification</Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return;
    setLoading(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('product-images').upload(path, imageFile);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('products').insert({
      user_id: user.id,
      title,
      description,
      price: parseFloat(price),
      category,
      image_url: imageUrl,
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to create listing');
    } else {
      toast.success('Listing created!');
      navigate('/marketplace');
    }
  };

  return (
    <div className="container py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Listing</CardTitle>
          <CardDescription>List a product on the verified marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Product name" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Describe your product..." value={description} onChange={e => setDescription(e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₱)</Label>
                <Input id="price" type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Product Image</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => document.getElementById('img-upload')?.click()}>
                {imageFile ? (
                  <p className="text-sm text-muted-foreground">{imageFile.name}</p>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload image</p>
                  </>
                )}
                <input id="img-upload" type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Listing'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateListing;
