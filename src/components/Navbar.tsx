import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, LayoutDashboard, User, Plus, Store, ShieldCheck, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/components/NotificationBell';

export const Navbar = () => {
  const { isAuthenticated, isAdmin, isVerified, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-foreground flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-background" />
          </div>
          <span className="font-bold text-base tracking-tight">TrustMart</span>
        </Link>

        <nav className="flex items-center gap-1">
          {isAuthenticated ? (
            <>
              <Link to="/marketplace">
                <Button variant="ghost" size="sm" className={location.pathname === '/marketplace' ? 'bg-muted' : ''}>
                  <Store className="h-4 w-4 mr-1.5" /> Market
                </Button>
              </Link>
              {isVerified && (
                <Link to="/create-listing">
                  <Button variant="ghost" size="sm" className={location.pathname === '/create-listing' ? 'bg-muted' : ''}>
                    <Plus className="h-4 w-4 mr-1.5" /> Sell
                  </Button>
                </Link>
              )}
              <Link to="/messages">
                <Button variant="ghost" size="sm" className={location.pathname === '/messages' ? 'bg-muted' : ''}>
                  <MessageCircle className="h-4 w-4 mr-1.5" /> Chat
                </Button>
              </Link>
              <Link to="/verification">
                <Button variant="ghost" size="sm" className={location.pathname === '/verification' ? 'bg-muted' : ''}>
                  <Shield className="h-4 w-4 mr-1.5" /> Verify
                </Button>
              </Link>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className={location.pathname === '/admin' ? 'bg-muted' : ''}>
                    <LayoutDashboard className="h-4 w-4 mr-1.5" /> Admin
                  </Button>
                </Link>
              )}
              <div className="flex items-center gap-1 ml-1 pl-2 border-l">
                <NotificationBell />
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
                <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90">Sign up</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
