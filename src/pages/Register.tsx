import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle, XCircle, Mail, User } from 'lucide-react';
import { toast } from 'sonner';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordsMatch = password === confirmPassword;
  const isPasswordStrong = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !emailValid || !passwordsMatch || !isPasswordStrong) {
      toast.error("Please check your details and try again.");
      return;
    }

    setLoading(true);

    try {
      // Ang signUp function na ang bahala sa lahat. 
      // Ang database trigger na ang gagawa ng profile record mo.
      const { error } = await signUp(email, password, { 
        first_name: firstName, 
        last_name: lastName 
      });

      if (error) {
        setLoading(false);
        toast.error(error.message);
        return;
      }

      // Success!
      setLoading(false);
      setSuccess(true);
      toast.success('Registration successful!');

    } catch (err) {
      setLoading(false);
      console.error("Registration Error:", err);
      toast.error("Something went wrong. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border text-center">
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold">Check your email!</h2>
            <p className="text-sm text-muted-foreground">
              We sent a link to <b>{email}</b>. (Kung in-OFF mo na ang confirm email sa Supabase, pwede ka na dumiretso sa Login).
            </p>
            <Button variant="default" className="w-full" onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border shadow-lg">
        <CardHeader className="text-center">
          <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-primary" />
          <CardTitle className="text-xl font-bold">Create Account</CardTitle>
          <CardDescription>Join TrustMart — Verified Marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">First Name</Label>
                <Input placeholder="Juan" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last Name</Label>
                <Input placeholder="Dela Cruz" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Min. 8 chars, 1 Uppercase, 1 Number.</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              {confirmPassword && !passwordsMatch && <p className="text-[10px] text-destructive">Passwords don't match</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
          <p className="text-center text-xs mt-4">
            Already have an account? <Link to="/login" className="underline font-bold">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;