import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Shield, ShieldCheck, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const Index = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="container py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <ShieldCheck className="h-4 w-4" /> Verified & Trusted Marketplace
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Buy & Sell with
            <span className="text-primary"> Confidence</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            TrustMart.ph is a marketplace powered by identity verification and trust scores. 
            Trade safely with verified Filipino sellers and buyers.
          </p>
          <div className="flex gap-4 justify-center">
            {isAuthenticated ? (
              <Link to="/marketplace">
                <Button size="lg" className="text-lg px-8">
                  <ShoppingBag className="h-5 w-5 mr-2" /> Browse Marketplace
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button size="lg" className="text-lg px-8">Get Started</Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="text-lg px-8">Sign In</Button>
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: ShieldCheck,
              title: '2-Step Verification',
              description: 'PhilSys ID + biometric verification ensures every user is who they claim to be.',
            },
            {
              icon: Shield,
              title: 'Trust Scores',
              description: 'Dynamic trust scores based on transaction history, verification, and community feedback.',
            },
            {
              icon: TrendingUp,
              title: 'Safe Transactions',
              description: 'COD unlocked for trusted users. Online payments available for everyone.',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              className="p-6 rounded-xl border bg-card"
            >
              <feature.icon className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
