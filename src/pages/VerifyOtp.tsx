import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = (location.state as { email?: string } | null)?.email ?? '';
  const [email] = useState(emailFromState);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Invalid or expired code.');
      return;
    }
    toast.success('Email verified! Welcome.');
    navigate('/marketplace');
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success('A new code was sent to your email.');
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold">Verify your email</CardTitle>
          <CardDescription>
            Enter the 6-digit code sent to <b>{email}</b>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button className="w-full" onClick={handleVerify} disabled={loading || code.length !== 6}>
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
          <div className="text-center text-xs text-muted-foreground">
            Didn't get a code?{' '}
            <button onClick={handleResend} disabled={resending} className="underline font-semibold">
              {resending ? 'Sending...' : 'Resend'}
            </button>
          </div>
          <div className="text-center text-xs">
            <Link to="/login" className="underline">Back to login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyOtp;
