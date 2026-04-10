import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Shield, LogOut, LayoutDashboard, User, Plus, Store, ShieldCheck, MessageCircle, Menu } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { useIsMobile } from '@/hooks/use-mobile';

export const Navbar = () => {
  const { isAuthenticated, isAdmin, isVerified, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate('/');
  };

  const navItems = [
    { to: '/marketplace', icon: Store, label: 'Market', show: true },
    { to: '/create-listing', icon: Plus, label: 'Sell', show: isVerified },
    { to: '/messages', icon: MessageCircle, label: 'Chat', show: true },
    { to: '/verification', icon: Shield, label: 'Verify', show: true },
    { to: '/admin', icon: LayoutDashboard, label: 'Admin', show: isAdmin },
  ];

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navItems.filter(n => n.show).map(item => (
        <Link key={item.to} to={item.to} onClick={onClick}>
          <Button variant="ghost" size="sm" className={`w-full justify-start ${location.pathname === item.to ? 'bg-muted' : ''}`}>
            <item.icon className="h-4 w-4 mr-1.5" /> {item.label}
          </Button>
        </Link>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-foreground flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-background" />
          </div>
          <span className="font-bold text-base tracking-tight">TrustMart</span>
        </Link>

        {isAuthenticated ? (
          isMobile ? (
            <div className="flex items-center gap-1">
              <NotificationBell />
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64 pt-10">
                  <nav className="flex flex-col gap-1">
                    <NavLinks onClick={() => setOpen(false)} />
                    <div className="border-t my-2" />
                    <Link to="/profile" onClick={() => setOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        <User className="h-4 w-4 mr-1.5" /> Profile
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-destructive" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-1.5" /> Sign Out
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          ) : (
            <nav className="flex items-center gap-1">
              <NavLinks />
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
            </nav>
          )
        ) : (
          <nav className="flex items-center gap-1">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90">Sign up</Button>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
};
