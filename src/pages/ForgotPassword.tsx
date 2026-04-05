import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    // Always show success to prevent user enumeration
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    setSent(true);
    toast.success('If an account exists with that email, a reset link has been sent.');
  };

  if (sent) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h2 className="text-lg font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link. The link expires in 15 minutes.
            </p>
            <p className="text-xs text-muted-foreground">
              Didn't receive it? Check your spam folder or{' '}
              <button onClick={() => setSent(false)} className="underline font-medium text-foreground">try again</button>.
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full mt-2">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to sign in
              </Button>
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
          <CardTitle className="text-xl">Forgot password?</CardTitle>
          <CardDescription className="text-xs">Enter your email and we'll send a reset link</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="pl-10"
                  aria-describedby="email-help"
                />
              </div>
              <p id="email-help" className="text-[11px] text-muted-foreground">We'll send a secure reset link to this address.</p>
            </div>
            <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90" disabled={loading || !email.trim()}>
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-4">
            <Link to="/login" className="font-medium underline underline-offset-2 text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
