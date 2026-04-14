import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Lock, Eye, EyeOff, Mail } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Load saved email
  useEffect(() => {
    const saved = localStorage.getItem('trustmart_remember_email');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        // Importante: Patayin ang loading spinner kapag may error
        setLoading(false); 
        
        if (error.message?.toLowerCase().includes('confirm')) {
          toast.error('Email confirmation is required. Please check your inbox.');
        } else {
          toast.error('Invalid email or password. Please try again.');
        }
        return;
      }

      // Success logic
      if (rememberMe) {
        localStorage.setItem('trustmart_remember_email', email);
      } else {
        localStorage.removeItem('trustmart_remember_email');
      }

      toast.success('Welcome back!');
      navigate('/marketplace');

    } catch (err) {
      console.error("Login failed:", err);
      setLoading(false);
      toast.error("An unexpected error occurred. Please refresh.");
    }
  };

  const canSubmit = email && password && !loading;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm border shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription className="text-sm">Enter your credentials to access TrustMart</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  disabled={loading}
                  className="pl-10 h-11" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" name="password" className="text-sm font-medium">Password</Label>
                <Link to="/forgot-password" name="forgot" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  disabled={loading}
                  className="h-11" 
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-0 top-0 h-11 w-11 text-muted-foreground" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2 py-1">
              <Checkbox 
                id="remember" 
                checked={rememberMe} 
                onCheckedChange={(c) => setRememberMe(!!c)} 
              />
              <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Keep me signed in
              </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold transition-all" 
              disabled={!canSubmit}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">New to TrustMart?</span>
            </div>
          </div>

          <Button variant="outline" className="w-full h-11" asChild>
            <Link to="/register">Create an account</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;