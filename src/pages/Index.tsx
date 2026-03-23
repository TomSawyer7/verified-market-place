import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Shield, UserCheck, Store, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="container py-24 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Shield className="h-4 w-4" />
              PhilSys-Verified Marketplace
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Trade with confidence on the{' '}
              <span className="text-primary">most secure</span> P2P marketplace
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every seller is verified through PhilSys National ID and biometric liveness checks.
              No scammers, no fakes — just trusted transactions.
            </p>
            <div className="flex items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link to="/marketplace">
                  <Button size="lg" className="gap-2">
                    Browse Marketplace <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="gap-2">
                      Get Started <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg">Sign In</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">How TrustMart.ph Keeps You Safe</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, title: 'PhilSys ID Verification', desc: 'Every user must verify their PhilSys National ID through the official eVerify portal with automated anti-tampering detection.' },
              { icon: UserCheck, title: 'Biometric Liveness Check', desc: 'Real-time webcam-based liveness detection with randomized challenges prevents spoofing and impersonation.' },
              { icon: Store, title: 'Verified-Only Marketplace', desc: 'Only fully verified users can sell products. Face re-authentication is required for every transaction.' },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold">Ready to trade safely?</h2>
            <p className="text-muted-foreground">Join thousands of verified Filipino traders on TrustMart.ph</p>
            <Link to="/register">
              <Button size="lg" className="gap-2">Create Your Account <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
