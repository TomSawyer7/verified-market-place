import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ShieldCheck, Shield, UserCheck, Store, ArrowRight, Lock,
  Fingerprint, Eye, FileWarning, Activity, Globe, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { isAuthenticated } = useAuth();

  const securityFeatures = [
    { icon: ShieldCheck, title: 'PhilSys ID Verification', desc: 'Government-issued National ID verification through the official PhilSys eVerify portal with 8-check automated anti-tampering engine.' },
    { icon: Fingerprint, title: 'Biometric Liveness Detection', desc: 'Real-time webcam liveness detection with randomized challenges (blink, smile, head turn, nod) using face-api.js to prevent spoofing.' },
    { icon: Eye, title: 'Face Re-Authentication', desc: 'Mandatory real-time Face ID re-authentication required before every high-stakes action like buying or chatting.' },
    { icon: Lock, title: 'Brute Force Protection', desc: 'Client-side rate limiting with progressive lockouts after failed login attempts. Account temporarily locked after 5 failures.' },
    { icon: FileWarning, title: 'HIBP Breach Detection', desc: 'Passwords checked against the Have I Been Pwned database to prevent use of compromised credentials.' },
    { icon: Shield, title: 'Row-Level Security (RLS)', desc: 'PostgreSQL Row-Level Security policies enforce data isolation — users can only access their own data.' },
    { icon: Activity, title: 'Comprehensive Audit Trail', desc: 'Every security event is logged with timestamps, user agents, and metadata for forensic analysis.' },
    { icon: Globe, title: 'Session Monitoring', desc: 'All login/logout events tracked with device fingerprinting for suspicious activity detection.' },
  ];

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
              PhilSys National ID verification, biometric liveness checks, and Face ID re-authentication. No scammers — only trusted transactions.
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

      {/* How it works */}
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

      {/* Security Features */}
      <section className="py-20 border-b bg-muted/30">
        <div className="container">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium tracking-wide uppercase mb-4">
              <Shield className="h-3 w-3" />
              Security Architecture
            </div>
            <h2 className="text-3xl font-bold mb-2">Built for Cybersecurity</h2>
            <p className="text-muted-foreground max-w-lg">Multi-layered security architecture protecting every user interaction from registration to transaction.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {securityFeatures.map((f, i) => (
              <Card key={i} className="border bg-background">
                <CardContent className="p-5">
                  <div className="h-9 w-9 rounded-md border flex items-center justify-center mb-3">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 border-b">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '8-Check', label: 'Anti-Tampering Engine' },
              { value: 'Real-time', label: 'Liveness Detection' },
              { value: 'HIBP', label: 'Breach Protection' },
              { value: 'RLS', label: 'Data Isolation' },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
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
            <p className="text-muted-foreground mb-6">Join the most secure P2P marketplace in the Philippines.</p>
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
