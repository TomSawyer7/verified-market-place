import { useAuth } from '@/contexts/AuthContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { TrustScoreBadge, VerificationBadge } from '@/components/TrustBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Camera, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Verification = () => {
  const { user, updateVerificationStatus } = useAuth();
  const { submitVerification } = useMarketplace();
  const navigate = useNavigate();

  if (!user) { navigate('/login'); return null; }

  const handlePhilSys = () => {
    submitVerification({
      userId: user.id,
      userName: user.name,
      type: 'philsys',
      philsysScreenshot: '/placeholder.svg',
    });
    updateVerificationStatus(user.id, 'philsys_pending');
    toast.success('PhilSys verification submitted! Waiting for admin review.');
  };

  const handleBiometric = () => {
    submitVerification({
      userId: user.id,
      userName: user.name,
      type: 'biometric',
      idPhoto: '/placeholder.svg',
      selfiePhoto: '/placeholder.svg',
    });
    updateVerificationStatus(user.id, 'biometric_pending');
    toast.success('Biometric verification submitted! Waiting for admin review.');
  };

  const steps = [
    {
      step: 1,
      title: 'PhilSys Verification',
      description: 'Upload a screenshot of your PhilSys (Philippine Identification System) ID',
      icon: Upload,
      canDo: user.verificationStatus === 'unverified',
      isDone: ['philsys_approved', 'biometric_pending', 'fully_verified'].includes(user.verificationStatus),
      isPending: user.verificationStatus === 'philsys_pending',
      action: handlePhilSys,
      actionLabel: 'Upload PhilSys Screenshot',
    },
    {
      step: 2,
      title: 'Biometric Verification',
      description: 'Upload a photo of your government ID and a selfie for biometric matching',
      icon: Camera,
      canDo: user.verificationStatus === 'philsys_approved',
      isDone: user.verificationStatus === 'fully_verified',
      isPending: user.verificationStatus === 'biometric_pending',
      action: handleBiometric,
      actionLabel: 'Upload ID & Selfie',
    },
  ];

  return (
    <div className="container py-8 max-w-2xl">
      <div className="mb-8 text-center animate-fade-in">
        <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold">Identity Verification</h1>
        <p className="text-muted-foreground mt-2">Complete verification to unlock all marketplace features</p>
        <div className="mt-4 flex justify-center gap-4">
          <TrustScoreBadge score={user.trustScore} />
          <VerificationBadge status={user.verificationStatus} />
        </div>
      </div>

      <div className="space-y-6">
        {steps.map(s => (
          <Card key={s.step} className={`animate-fade-in ${s.isDone ? 'border-verified/50 bg-verified/5' : ''}`}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  s.isDone ? 'bg-verified text-primary-foreground' :
                  s.isPending ? 'bg-pending text-primary-foreground' :
                  s.canDo ? 'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {s.isDone ? '✓' : s.step}
                </div>
                <div>
                  <CardTitle className="text-lg">{s.title}</CardTitle>
                  <CardDescription>{s.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {s.isDone && (
                <div className="flex items-center gap-2 text-verified font-medium">
                  <ShieldCheck className="h-5 w-5" /> Verified
                </div>
              )}
              {s.isPending && (
                <div className="flex items-center gap-2 text-pending font-medium">
                  <AlertCircle className="h-5 w-5" /> Pending admin review
                </div>
              )}
              {s.canDo && (
                <Button onClick={s.action}>
                  <s.icon className="h-4 w-4 mr-2" /> {s.actionLabel}
                </Button>
              )}
              {!s.canDo && !s.isDone && !s.isPending && (
                <p className="text-sm text-muted-foreground">Complete Step {s.step - 1} first</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {user.verificationStatus === 'fully_verified' && (
        <Card className="mt-6 border-verified/50 bg-verified/5 animate-fade-in">
          <CardContent className="p-6 text-center">
            <ShieldCheck className="h-16 w-16 text-verified mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground">Fully Verified!</h2>
            <p className="text-muted-foreground mt-2">You have access to all marketplace features including COD payments.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Verification;
