import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { TrustScoreBadge, VerificationBadge } from '@/components/TrustBadge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Shield, LogOut, LayoutDashboard, User, Plus } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <span className="text-foreground">TrustMart</span>
          <span className="text-primary">.ph</span>
        </Link>

        <nav className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/marketplace">
                <Button variant={location.pathname === '/marketplace' ? 'default' : 'ghost'} size="sm">
                  <ShoppingBag className="h-4 w-4 mr-1" /> Browse
                </Button>
              </Link>
              <Link to="/create-listing">
                <Button variant={location.pathname === '/create-listing' ? 'default' : 'ghost'} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Sell
                </Button>
              </Link>
              <Link to="/verification">
                <Button variant={location.pathname === '/verification' ? 'default' : 'ghost'} size="sm">
                  <Shield className="h-4 w-4 mr-1" /> Verify
                </Button>
              </Link>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant={location.pathname.startsWith('/admin') ? 'default' : 'ghost'} size="sm">
                    <LayoutDashboard className="h-4 w-4 mr-1" /> Admin
                  </Button>
                </Link>
              )}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                <TrustScoreBadge score={user!.trustScore} size="sm" />
                <VerificationBadge status={user!.verificationStatus} size="sm" />
                <Link to="/profile">
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
