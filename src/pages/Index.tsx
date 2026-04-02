import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Shield, UserCheck, Store, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Hero */}
      <section className="border-b">
        <div className="container py-24 md:py-32">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium tracking-wide uppercase">
              <Lock className="h-3 w-3" />
              PhilSys-Verified Marketplace
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              The marketplace where every seller is verified.
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              PhilSys National ID verification and biometric liveness checks. No scammers — only trusted transactions.
            </p>
            <div className="flex items-center gap-3 pt-2">
              {isAuthenticated ? (
                <Link to="/marketplace">
                  <Button size="lg" className="gap-2 bg-foreground text-background hover:bg-foreground/90">
                    Browse Marketplace <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="gap-2 bg-foreground text-background hover:bg-foreground/90">
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

      {/* Features */}
      <section className="py-20 border-b">
        <div className="container">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-8">How it works</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, title: 'PhilSys ID Check', desc: 'Every user verifies through the official PhilSys eVerify portal with automated anti-tampering detection.' },
              { icon: UserCheck, title: 'Biometric Liveness', desc: 'Real-time webcam liveness detection with randomized challenges prevents spoofing and impersonation.' },
              { icon: Store, title: 'Verified-Only Market', desc: 'Only fully verified users can sell. Face re-authentication is required for every transaction.' },
            ].map((f, i) => (
              <div key={i} className="space-y-3">
                <div className="h-10 w-10 rounded-md border flex items-center justify-center">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-lg">
            <h2 className="text-2xl font-bold mb-3">Ready to trade safely?</h2>
            <p className="text-muted-foreground mb-6">Join thousands of verified Filipino traders.</p>
            <Link to="/register">
              <Button size="lg" className="gap-2 bg-foreground text-background hover:bg-foreground/90">
                Create Account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
