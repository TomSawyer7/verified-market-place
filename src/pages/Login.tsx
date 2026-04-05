import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, AlertTriangle, Lock, Eye, EyeOff, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { checkRateLimit, resetRateLimit, logSecurityEvent, logSessionActivity } from '@/lib/security';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('trustmart_remember_email');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (lockTimer <= 0) { setLocked(false); return; }
    const interval = setInterval(() => setLockTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [lockTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rateCheck = checkRateLimit(email);
    if (!rateCheck.allowed) {
      setLocked(true);
      setLockTimer(rateCheck.waitSeconds);
      toast.error(`Too many attempts. Try again in ${Math.ceil(rateCheck.waitSeconds / 60)} minutes.`);
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);

      try {
        await supabase.from('login_attempts').insert({
          email,
          success: false,
          user_agent: navigator.userAgent,
        });
      } catch {}

      // Detect unverified email
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        toast.error('Please verify your email before signing in. Check your inbox for a confirmation link.');
      } else if (attempts >= 3) {
        toast.error(`Login failed (${attempts}/5 attempts). Account will be temporarily locked.`);
      } else {
        toast.error('Invalid credentials. Please check your email and password.');
      }
    } else {
      // Remember me
      if (rememberMe) {
        localStorage.setItem('trustmart_remember_email', email);
      } else {
        localStorage.removeItem('trustmart_remember_email');
      }

      resetRateLimit(email);
      setFailedAttempts(0);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await logSessionActivity(session.user.id, 'login');
        await logSecurityEvent(session.user.id, 'login_success', 'info', 'User logged in successfully');
      }

      toast.success('Welcome back!');
      navigate('/marketplace');
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
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription className="text-xs">Sign in to TrustMart</CardDescription>
        </CardHeader>
        <CardContent>
          {locked && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg mb-4 text-xs" role="alert">
              <Lock className="h-4 w-4 flex-shrink-0" />
              <span>Account temporarily locked. Try again in {Math.floor(lockTimer / 60)}:{(lockTimer % 60).toString().padStart(2, '0')}</span>
            </div>
          )}
          {failedAttempts >= 3 && !locked && (
            <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg mb-4 text-xs" role="alert">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{5 - failedAttempts} attempts remaining before temporary lockout.</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={locked} className="pl-10" aria-label="Email address" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <Link to="/forgot-password" className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2" tabIndex={-1}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required disabled={locked} aria-label="Password" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" checked={rememberMe} onCheckedChange={(c) => setRememberMe(!!c)} aria-label="Remember me" />
              <Label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">Remember me</Label>
            </div>
            <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90" disabled={loading || locked || !email || !password}>
              {loading ? 'Signing in...' : locked ? 'Locked' : 'Sign in'}
            </Button>
          </form>
          <div className="flex items-center gap-1.5 mt-4 p-2.5 rounded-lg bg-muted/50 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 flex-shrink-0" />
            <span>Protected by rate limiting, breach detection, and session monitoring.</span>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">
            No account? <Link to="/register" className="font-medium underline underline-offset-2 text-foreground">Create one</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
