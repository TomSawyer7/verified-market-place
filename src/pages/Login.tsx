import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { checkRateLimit, resetRateLimit, logSecurityEvent, logSessionActivity } from '@/lib/security';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { signIn } = useAuth();
  const navigate = useNavigate();

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

      // Log failed attempt
      try {
        await supabase.from('login_attempts').insert({
          email,
          success: false,
          user_agent: navigator.userAgent,
        });
      } catch {}

      if (attempts >= 3) {
        toast.error(`Login failed (${attempts}/5 attempts). Account will be temporarily locked.`);
      } else {
        toast.error('Invalid credentials. Please check your email and password.');
      }
    } else {
      resetRateLimit(email);
      setFailedAttempts(0);

      // Log successful login
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
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg mb-4 text-xs">
              <Lock className="h-4 w-4 flex-shrink-0" />
              <span>Account temporarily locked. Try again in {Math.floor(lockTimer / 60)}:{(lockTimer % 60).toString().padStart(2, '0')}</span>
            </div>
          )}
          {failedAttempts >= 3 && !locked && (
            <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg mb-4 text-xs">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{5 - failedAttempts} attempts remaining before temporary lockout.</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={locked} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required disabled={locked} />
            </div>
            <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90" disabled={loading || locked}>
              {loading ? 'Signing in...' : locked ? 'Locked' : 'Sign in'}
            </Button>
          </form>
          <div className="flex items-center gap-1.5 mt-4 p-2.5 rounded-lg bg-muted/50 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 flex-shrink-0" />
            <span>Protected by rate limiting, HIBP breach detection, and session monitoring.</span>
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
