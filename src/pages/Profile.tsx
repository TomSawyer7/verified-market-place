import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Shield, User, Mail, Calendar, MapPin, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, profile, isVerified, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user || !profile) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground text-sm">Please log in to view your profile.</p>
        <Button className="mt-4 bg-foreground text-background hover:bg-foreground/90" onClick={() => navigate('/login')}>Sign In</Button>
      </div>
    );
  }

  const fullName = `${profile.first_name} ${profile.middle_name || ''} ${profile.last_name}`.trim();

  return (
    <div className="container py-8 max-w-lg">
      <Card className="border">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-foreground flex items-center justify-center text-background text-lg font-bold">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{fullName}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isVerified ? 'default' : 'secondary'} className="gap-1 text-xs">
                  {isVerified ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                  {isVerified ? 'Verified' : profile.status === 'pending' ? 'Pending' : 'Unverified'}
                </Badge>
                {isAdmin && <Badge variant="outline" className="text-xs">Admin</Badge>}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {[
              { icon: Mail, text: user.email },
              profile.mobile_number && { icon: Phone, text: profile.mobile_number },
              profile.address && { icon: MapPin, text: profile.address },
              profile.birthday && { icon: Calendar, text: profile.birthday },
              { icon: User, text: `Member since ${new Date(profile.created_at).toLocaleDateString()}` },
            ].filter(Boolean).map((item: any, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          {!isVerified && (
            <div className="border rounded-lg p-4">
              <p className="text-sm font-medium mb-1">Complete your verification</p>
              <p className="text-xs text-muted-foreground mb-3">Verify your identity to unlock marketplace access.</p>
              <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90" onClick={() => navigate('/verification')}>Start Verification</Button>
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={async () => { await signOut(); navigate('/'); }}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
