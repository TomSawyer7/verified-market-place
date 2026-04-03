import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, { first_name: firstName, last_name: lastName });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! You can now sign in.');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="h-10 w-10 rounded-md bg-foreground flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-background" />
            </div>
          </div>
          <CardTitle className="text-xl">Create account</CardTitle>
          <CardDescription className="text-xs">Join TrustMart — Verified P2P Marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs">First Name</Label>
                <Input id="firstName" placeholder="Juan" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                <Input id="lastName" placeholder="Dela Cruz" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input id="password" type="password" placeholder="Minimum 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Already have an account? <Link to="/login" className="font-medium underline underline-offset-2 text-foreground">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
