import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const categories = ['Electronics', 'Fashion', 'Vehicles', 'Furniture', 'Gadgets', 'Sports', 'Books', 'Other'];

const CreateListing = () => {
  const { user } = useAuth();
  const { addListing } = useMarketplace();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addListing({
      title,
      description,
      price: Number(price),
      imageUrl: '',
      category,
      sellerId: user.id,
      sellerName: user.name,
      sellerTrustScore: user.trustScore,
      sellerVerified: user.verificationStatus === 'fully_verified',
    });
    toast.success('Listing created successfully!');
    navigate('/marketplace');
  };

  return (
    <div className="container py-8 max-w-2xl">
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>Create New Listing</CardTitle>
          <CardDescription>List an item for sale on the marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="What are you selling?" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (₱)</Label>
              <Input id="price" type="number" min="1" placeholder="0" value={price} onChange={e => setPrice(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" placeholder="Describe your item..." rows={4} value={description} onChange={e => setDescription(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Post Listing</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateListing;
