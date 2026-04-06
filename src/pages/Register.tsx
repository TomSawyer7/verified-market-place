import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle, XCircle, Mail, User } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';
import { checkPasswordStrength, sanitizeInput } from '@/lib/security';
import { supabase } from '@/integrations/supabase/client';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const markTouched = (field: string) => setTouched(t => ({ ...t, [field]: true }));

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const strength = useMemo(() => checkPasswordStrength(password), [password]);
  const passwordsMatch = password === confirmPassword;

  const validations = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^a-zA-Z0-9]/.test(password) },
  ], [password]);

  const allValid = firstName.trim() && lastName.trim() && emailValid && strength.score >= 4 && passwordsMatch && password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedFirst = sanitizeInput(firstName);
    const sanitizedLast = sanitizeInput(lastName);

    if (!sanitizedFirst || !sanitizedLast) {
      toast.error('Please provide valid names');
      return;
    }

    if (!emailValid) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (strength.score < 4) {
      toast.error('Password is too weak. Please use a stronger password.');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, { first_name: sanitizedFirst, last_name: sanitizedLast });
    setLoading(false);

    if (error) {
      if (error.message?.toLowerCase().includes('already registered')) {
        toast.error('An account with this email already exists.');
      } else {
        toast.error(error.message);
      }
    } else {
      setSuccess(true);
      toast.success('Account created! Please check your email for a verification link.');
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h2 className="text-lg font-semibold">Verify your email</h2>
            <p className="text-sm text-muted-foreground">
              We've sent a verification link to <strong>{email}</strong>. Please click the link to activate your account.
            </p>
            <p className="text-xs text-muted-foreground">
              Didn't receive it? Check your spam folder.
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full mt-2">Go to sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="firstName" placeholder="Juan" value={firstName} onChange={e => setFirstName(e.target.value)} onBlur={() => markTouched('firstName')} required maxLength={50} className="pl-10" aria-label="First name" />
                </div>
                {touched.firstName && !firstName.trim() && <p className="text-[11px] text-destructive" role="alert">Required</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                <Input id="lastName" placeholder="Dela Cruz" value={lastName} onChange={e => setLastName(e.target.value)} onBlur={() => markTouched('lastName')} required maxLength={50} aria-label="Last name" />
                {touched.lastName && !lastName.trim() && <p className="text-[11px] text-destructive" role="alert">Required</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => markTouched('email')} required maxLength={255} className="pl-10" aria-label="Email address" aria-describedby="email-error" />
              </div>
              {touched.email && email && !emailValid && <p id="email-error" className="text-[11px] text-destructive" role="alert">Please enter a valid email</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => markTouched('password')}
                  required
                  minLength={8}
                  maxLength={128}
                  aria-label="Password"
                  aria-describedby="password-rules"
                />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <PasswordStrengthMeter password={password} />
              {password && (
                <ul id="password-rules" className="space-y-0.5 mt-1" aria-label="Password requirements">
                  {validations.map((v, i) => (
                    <li key={i} className={`text-[11px] flex items-center gap-1 ${v.met ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {v.met ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {v.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onBlur={() => markTouched('confirmPassword')}
                required
                aria-label="Confirm password"
              />
              {touched.confirmPassword && confirmPassword && !passwordsMatch && (
                <p className="text-[11px] text-destructive" role="alert">Passwords do not match</p>
              )}
              {confirmPassword && passwordsMatch && (
                <p className="text-[11px] text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Passwords match</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90" disabled={loading || !allValid}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
          <div className="flex items-center gap-1.5 mt-4 p-2.5 rounded-lg bg-muted/50 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 flex-shrink-0" />
            <span>Protected by breach detection (HIBP) and encrypted storage.</span>
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
