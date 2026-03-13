import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { TrustScoreBadge, VerificationBadge } from '@/components/TrustBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Upload, Camera, ShieldCheck, AlertCircle, ExternalLink,
  CheckCircle, XCircle, Clock, FileImage, ArrowRight, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const PHILSYS_URL = 'https://verify.philsys.gov.ph';

const StepIndicator = ({ step, label, isActive, isDone }: {
  step: number; label: string; isActive: boolean; isDone: boolean;
}) => (
  <div className="flex flex-col items-center gap-1 min-w-0">
    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
      isDone ? 'bg-verified text-primary-foreground' :
      isActive ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
      'bg-muted text-muted-foreground'
    }`}>
      {isDone ? <CheckCircle className="h-4 w-4" /> : step}
    </div>
    <span className={`text-[10px] text-center leading-tight max-w-[72px] ${
      isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
    }`}>{label}</span>
  </div>
);

const Verification = () => {
  const { user, updateVerificationStatus } = useAuth();
  const { submitVerification, verificationRequests } = useMarketplace();
  const navigate = useNavigate();
  const philsysFileRef = useRef<HTMLInputElement>(null);
  const idFileRef = useRef<HTMLInputElement>(null);
  const selfieFileRef = useRef<HTMLInputElement>(null);

  const [philsysFile, setPhilsysFile] = useState<File | null>(null);
  const [philsysPreview, setPhilsysPreview] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  if (!user) { navigate('/login'); return null; }

  // Check if user has a rejected request (can resubmit)
  const userPhilsysRequests = verificationRequests.filter(
    v => v.userId === user.id && v.type === 'philsys'
  );
  const userBiometricRequests = verificationRequests.filter(
    v => v.userId === user.id && v.type === 'biometric'
  );
  const lastPhilsysReq = userPhilsysRequests[userPhilsysRequests.length - 1];
  const lastBiometricReq = userBiometricRequests[userBiometricRequests.length - 1];
  const philsysRejected = lastPhilsysReq?.status === 'rejected';
  const biometricRejected = lastBiometricReq?.status === 'rejected';

  const handleFileSelect = (
    file: File | undefined,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitPhilsys = () => {
    if (!philsysFile) {
      toast.error('Please upload your PhilSys verification screenshot first.');
      return;
    }
    submitVerification({
      userId: user.id,
      userName: user.name,
      type: 'philsys',
      philsysScreenshot: philsysPreview || '/placeholder.svg',
    });
    updateVerificationStatus(user.id, 'philsys_pending');
    setPhilsysFile(null);
    setPhilsysPreview(null);
    setNotes('');
    toast.success('PhilSys verification submitted! Please wait for admin review.');
  };

  const handleSubmitBiometric = () => {
    if (!idFile || !selfieFile) {
      toast.error('Please upload both your ID photo and selfie.');
      return;
    }
    submitVerification({
      userId: user.id,
      userName: user.name,
      type: 'biometric',
      idPhoto: idPreview || '/placeholder.svg',
      selfiePhoto: selfiePreview || '/placeholder.svg',
    });
    updateVerificationStatus(user.id, 'biometric_pending');
    setIdFile(null);
    setIdPreview(null);
    setSelfieFile(null);
    setSelfiePreview(null);
    toast.success('Biometric verification submitted! Please wait for admin review.');
  };

  const status = user.verificationStatus;

  // Determine current active step for the progress indicator
  const getCurrentStep = () => {
    if (status === 'unverified' || philsysRejected) return 1;
    if (status === 'philsys_pending') return 3;
    if (status === 'philsys_approved' || biometricRejected) return 5;
    if (status === 'biometric_pending') return 6;
    if (status === 'fully_verified') return 7;
    return 1;
  };

  const currentStep = getCurrentStep();
  const progressValue = status === 'fully_verified' ? 100 :
    status === 'biometric_pending' ? 80 :
    status === 'philsys_approved' ? 60 :
    status === 'philsys_pending' ? 40 :
    10;

  const stepLabels = [
    'Open PhilSys', 'Verify on PhilSys', 'Take Screenshot',
    'Upload Proof', 'Admin Review', 'Biometric', 'Verified'
  ];

  const canSubmitPhilsys = status === 'unverified' || philsysRejected;
  const canSubmitBiometric = (status === 'philsys_approved' || biometricRejected);

  return (
    <div className="container py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8 text-center animate-fade-in">
        <ShieldCheck className="h-14 w-14 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-foreground">Identity Verification</h1>
        <p className="text-muted-foreground mt-2">Complete the verification process to unlock all marketplace features</p>
        <div className="mt-4 flex justify-center gap-4">
          <TrustScoreBadge score={user.trustScore} />
          <VerificationBadge status={user.verificationStatus} />
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-foreground">Verification Progress</span>
            <span className="text-sm text-muted-foreground">{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-2 mb-6" />
          <div className="flex justify-between">
            {stepLabels.map((label, i) => (
              <StepIndicator
                key={i}
                step={i + 1}
                label={label}
                isActive={currentStep === i + 1}
                isDone={currentStep > i + 1}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* === STEP 1: PhilSys Verification === */}
      <Card className={`mb-6 animate-fade-in transition-all ${
        ['philsys_approved', 'biometric_pending', 'fully_verified'].includes(status)
          ? 'border-verified/50 bg-verified/5' : ''
      }`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
              ['philsys_approved', 'biometric_pending', 'fully_verified'].includes(status)
                ? 'bg-verified text-primary-foreground'
                : status === 'philsys_pending'
                ? 'bg-pending text-primary-foreground'
                : 'bg-primary text-primary-foreground'
            }`}>
              {['philsys_approved', 'biometric_pending', 'fully_verified'].includes(status) ? '✓' : '1'}
            </div>
            <div>
              <CardTitle className="text-lg">Step 1: PhilSys Verification</CardTitle>
              <CardDescription>Verify your identity through the Philippine Identification System</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Done state */}
          {['philsys_approved', 'biometric_pending', 'fully_verified'].includes(status) && (
            <div className="flex items-center gap-2 text-verified font-medium">
              <CheckCircle className="h-5 w-5" /> PhilSys Verified — Approved by Admin
            </div>
          )}

          {/* Pending state */}
          {status === 'philsys_pending' && (
            <div className="rounded-lg border border-pending/30 bg-pending/5 p-4">
              <div className="flex items-center gap-2 text-pending font-medium mb-2">
                <Clock className="h-5 w-5" /> Pending Admin Review
              </div>
              <p className="text-sm text-muted-foreground">
                Your PhilSys screenshot has been submitted. An admin will review your verification request.
                This may take 24-48 hours. You will be notified once your request is processed.
              </p>
            </div>
          )}

          {/* Rejected state */}
          {philsysRejected && status === 'unverified' && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-4">
              <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                <XCircle className="h-5 w-5" /> Verification Rejected
              </div>
              <p className="text-sm text-muted-foreground">
                Your previous PhilSys verification was rejected. Please ensure the screenshot clearly shows
                your verification success page and try again.
              </p>
            </div>
          )}

          {/* Action state - can submit */}
          {canSubmitPhilsys && (
            <>
              {/* Instructions */}
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">How to verify with PhilSys:</p>
                  </div>
                </div>
                <ol className="space-y-2 text-sm text-muted-foreground ml-7">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                    Click the button below to open the official PhilSys verification website
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                    Complete the verification process on the PhilSys website
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                    Take a screenshot of the <strong>success/confirmation page</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                    Upload the screenshot below and submit for admin review
                  </li>
                </ol>
              </div>

              {/* Open PhilSys Button */}
              <Button
                variant="outline"
                className="w-full h-12 text-base gap-2"
                onClick={() => window.open(PHILSYS_URL, '_blank')}
              >
                <ExternalLink className="h-5 w-5" />
                Open PhilSys Verification Website
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>

              {/* Upload Section */}
              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  ref={philsysFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0], setPhilsysFile, setPhilsysPreview)}
                />
                {philsysPreview ? (
                  <div className="space-y-3">
                    <img src={philsysPreview} alt="PhilSys Screenshot" className="max-h-48 mx-auto rounded-lg border border-border" />
                    <p className="text-sm text-foreground font-medium">{philsysFile?.name}</p>
                    <Button variant="ghost" size="sm" onClick={() => philsysFileRef.current?.click()}>
                      Change Image
                    </Button>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer"
                    onClick={() => philsysFileRef.current?.click()}
                  >
                    <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium text-foreground">Upload PhilSys Success Screenshot</p>
                    <p className="text-sm text-muted-foreground mt-1">Click to browse or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </div>

              {/* Optional Notes */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Additional Notes (optional)</label>
                <Input
                  placeholder="Add any notes for the admin reviewer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <Button
                className="w-full h-11"
                onClick={handleSubmitPhilsys}
                disabled={!philsysFile}
              >
                <Upload className="h-4 w-4 mr-2" />
                Submit for Admin Review
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* === STEP 2: Biometric Verification === */}
      <Card className={`mb-6 animate-fade-in transition-all ${
        status === 'fully_verified' ? 'border-verified/50 bg-verified/5' :
        !canSubmitBiometric && status !== 'biometric_pending' ? 'opacity-60' : ''
      }`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
              status === 'fully_verified'
                ? 'bg-verified text-primary-foreground'
                : status === 'biometric_pending'
                ? 'bg-pending text-primary-foreground'
                : canSubmitBiometric
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
              {status === 'fully_verified' ? '✓' : '2'}
            </div>
            <div>
              <CardTitle className="text-lg">Step 2: Biometric Verification</CardTitle>
              <CardDescription>Upload your government ID and a selfie for identity matching</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Done */}
          {status === 'fully_verified' && (
            <div className="flex items-center gap-2 text-verified font-medium">
              <CheckCircle className="h-5 w-5" /> Biometric Verified — Approved by Admin
            </div>
          )}

          {/* Pending */}
          {status === 'biometric_pending' && (
            <div className="rounded-lg border border-pending/30 bg-pending/5 p-4">
              <div className="flex items-center gap-2 text-pending font-medium mb-2">
                <Clock className="h-5 w-5" /> Pending Admin Review
              </div>
              <p className="text-sm text-muted-foreground">
                Your biometric documents have been submitted. An admin will review your verification.
              </p>
            </div>
          )}

          {/* Rejected */}
          {biometricRejected && status === 'philsys_approved' && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-4">
              <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                <XCircle className="h-5 w-5" /> Biometric Verification Rejected
              </div>
              <p className="text-sm text-muted-foreground">
                Your biometric verification was rejected. Please upload clear photos and try again.
              </p>
            </div>
          )}

          {/* Locked */}
          {!canSubmitBiometric && status !== 'biometric_pending' && status !== 'fully_verified' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">Complete PhilSys verification first to unlock this step.</p>
            </div>
          )}

          {/* Action state */}
          {canSubmitBiometric && (
            <>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Upload a clear photo of your valid government-issued ID and a selfie.
                    Both photos will be reviewed by an admin for identity matching.
                  </p>
                </div>
              </div>

              {/* ID Photo Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border-2 border-dashed border-border p-4 text-center hover:border-primary/50 transition-colors">
                  <input
                    ref={idFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0], setIdFile, setIdPreview)}
                  />
                  {idPreview ? (
                    <div className="space-y-2">
                      <img src={idPreview} alt="ID Photo" className="max-h-32 mx-auto rounded-lg border border-border" />
                      <p className="text-xs text-foreground font-medium">{idFile?.name}</p>
                      <Button variant="ghost" size="sm" onClick={() => idFileRef.current?.click()}>Change</Button>
                    </div>
                  ) : (
                    <div className="cursor-pointer" onClick={() => idFileRef.current?.click()}>
                      <FileImage className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="font-medium text-sm text-foreground">Government ID Photo</p>
                      <p className="text-xs text-muted-foreground mt-1">Front of your valid ID</p>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border-2 border-dashed border-border p-4 text-center hover:border-primary/50 transition-colors">
                  <input
                    ref={selfieFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0], setSelfieFile, setSelfiePreview)}
                  />
                  {selfiePreview ? (
                    <div className="space-y-2">
                      <img src={selfiePreview} alt="Selfie" className="max-h-32 mx-auto rounded-lg border border-border" />
                      <p className="text-xs text-foreground font-medium">{selfieFile?.name}</p>
                      <Button variant="ghost" size="sm" onClick={() => selfieFileRef.current?.click()}>Change</Button>
                    </div>
                  ) : (
                    <div className="cursor-pointer" onClick={() => selfieFileRef.current?.click()}>
                      <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="font-medium text-sm text-foreground">Selfie Photo</p>
                      <p className="text-xs text-muted-foreground mt-1">Clear photo of your face</p>
                    </div>
                  )}
                </div>
              </div>

              <Button
                className="w-full h-11"
                onClick={handleSubmitBiometric}
                disabled={!idFile || !selfieFile}
              >
                <Upload className="h-4 w-4 mr-2" />
                Submit Biometric for Admin Review
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Fully Verified Banner */}
      {status === 'fully_verified' && (
        <Card className="border-verified/50 bg-verified/5 animate-fade-in">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="h-16 w-16 text-verified mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground">🎉 Fully Verified Account!</h2>
            <p className="text-muted-foreground mt-2">
              Both PhilSys and Biometric verifications have been approved.
              You now have access to all marketplace features including COD payments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Verification;
