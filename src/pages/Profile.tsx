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
        <p className="text-muted-foreground">Please log in to view your profile.</p>
        <Button className="mt-4" onClick={() => navigate('/login')}>Sign In</Button>
      </div>
    );
  }

  const fullName = `${profile.first_name} ${profile.middle_name || ''} ${profile.last_name}`.trim();

  return (
    <div className="container py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">{fullName}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isVerified ? 'default' : 'secondary'} className="gap-1">
                  {isVerified ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                  {isVerified ? 'Fully Verified' : profile.status === 'pending' ? 'Pending' : 'Not Verified'}
                </Badge>
                {isAdmin && <Badge variant="outline">Admin</Badge>}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{user.email}</span>
            </div>
            {profile.mobile_number && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile.mobile_number}</span>
              </div>
            )}
            {profile.address && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{profile.address}</span>
              </div>
            )}
            {profile.birthday && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{profile.birthday}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Member since {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          {!isVerified && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Complete your verification</p>
              <p className="text-xs text-muted-foreground mb-3">Verify your identity to unlock full marketplace access.</p>
              <Button size="sm" onClick={() => navigate('/verification')}>Start Verification</Button>
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
