import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock } from 'lucide-react';

interface VerificationGateProps {
  children: React.ReactNode;
}

const VerificationGate = ({ children }: VerificationGateProps) => {
  const { isAuthenticated, isVerified, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-6">Please log in to access the marketplace.</p>
          <Link to="/login">
            <Button className="bg-foreground text-background hover:bg-foreground/90">Log In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <ShieldCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Verification Required</h2>
          <p className="text-muted-foreground mb-6">
            You need to verify your identity first before browsing our marketplace.
          </p>
          <Link to="/verification">
            <Button className="gap-2 bg-foreground text-background hover:bg-foreground/90">
              <ShieldCheck className="h-4 w-4" /> Start Verification
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default VerificationGate;
