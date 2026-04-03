import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';
import { checkPasswordStrength, sanitizeInput, logSecurityEvent, logSessionActivity } from '@/lib/security';
import { supabase } from '@/integrations/supabase/client';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedFirst = sanitizeInput(firstName);
    const sanitizedLast = sanitizeInput(lastName);

    if (!sanitizedFirst || !sanitizedLast) {
      toast.error('Please provide valid names');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const strength = checkPasswordStrength(password);
    if (strength.score < 4) {
      toast.error('Password is too weak. Please use a stronger password.');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, { first_name: sanitizedFirst, last_name: sanitizedLast });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! You can now sign in.');

      // Log registration event
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await logSecurityEvent(session.user.id, 'registration', 'info', 'New account registered');
        await logSessionActivity(session.user.id, 'register');
      }

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
                <Input id="firstName" placeholder="Juan" value={firstName} onChange={e => setFirstName(e.target.value)} required maxLength={50} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                <Input id="lastName" placeholder="Dela Cruz" value={lastName} onChange={e => setLastName(e.target.value)} required maxLength={50} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters, mixed case + numbers"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <PasswordStrengthMeter password={password} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[11px] text-destructive">Passwords do not match</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90" disabled={loading || (password !== confirmPassword) || checkPasswordStrength(password).score < 4}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
          <div className="flex items-center gap-1.5 mt-4 p-2.5 rounded-lg bg-muted/50 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 flex-shrink-0" />
            <span>Passwords checked against known breaches (HIBP). Your data is encrypted at rest.</span>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Already have an account? <Link to="/login" className="font-medium underline underline-offset-2 text-foreground">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
