import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, LayoutDashboard, User, Plus, Store, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const Navbar = () => {
  const { isAuthenticated, isAdmin, isVerified, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b glass">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            TrustMart<span className="text-primary">.ph</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link to="/marketplace">
                <Button variant={location.pathname === '/marketplace' ? 'default' : 'ghost'} size="sm">
                  <Store className="h-4 w-4 mr-1" /> Marketplace
                </Button>
              </Link>
              {isVerified && (
                <Link to="/create-listing">
                  <Button variant={location.pathname === '/create-listing' ? 'default' : 'ghost'} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Sell
                  </Button>
                </Link>
              )}
              <Link to="/verification">
                <Button variant={location.pathname === '/verification' ? 'default' : 'ghost'} size="sm">
                  <Shield className="h-4 w-4 mr-1" /> Verify
                </Button>
              </Link>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant={location.pathname === '/admin' ? 'default' : 'ghost'} size="sm">
                    <LayoutDashboard className="h-4 w-4 mr-1" /> Admin
                  </Button>
                </Link>
              )}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                <Badge variant={isVerified ? 'default' : 'secondary'} className="text-xs">
                  {isVerified ? 'Verified' : profile?.status === 'pending' ? 'Pending' : 'Unverified'}
                </Badge>
                <Link to="/profile">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <User className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSignOut}>
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
