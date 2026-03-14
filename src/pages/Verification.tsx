import { useState, useRef, useCallback } from 'react';
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
import LivenessCheck from '@/components/verification/LivenessCheck';
import FaceMatchIndicator from '@/components/verification/FaceMatchIndicator';
import AntiSpoofingCheck from '@/components/verification/AntiSpoofingCheck';
import DocumentExpiryCheck from '@/components/verification/DocumentExpiryCheck';
import AuditTrail, { AuditEntry } from '@/components/verification/AuditTrail';
import SecurityBadges from '@/components/verification/SecurityBadges';

const PHILSYS_URL = 'https://everify.gov.ph/check';
const MAX_DAILY_ATTEMPTS = 3;

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

  // Security state
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [livenessImage, setLivenessImage] = useState<string | null>(null);
  const [faceMatched, setFaceMatched] = useState<boolean | null>(null);
  const [faceMatchScore, setFaceMatchScore] = useState(0);
  const [idSpoofPassed, setIdSpoofPassed] = useState<boolean | null>(null);
  const [documentValid, setDocumentValid] = useState(false);
  const [documentExpiry, setDocumentExpiry] = useState('');
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  // Rate limiting
  const [dailyAttempts] = useState(() => {
    const key = `verification_attempts_${new Date().toDateString()}`;
    return parseInt(localStorage.getItem(key) || '0', 10);
  });

  if (!user) { navigate('/login'); return null; }

  const addAuditEntry = useCallback((action: string, type: AuditEntry['type'], details?: string) => {
    setAuditLog(prev => [...prev, {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      type,
      details,
    }]);
  }, []);

  const incrementAttempts = () => {
    const key = `verification_attempts_${new Date().toDateString()}`;
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(current + 1));
  };

  const isRateLimited = dailyAttempts >= MAX_DAILY_ATTEMPTS;

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
    setPreview: (p: string | null) => void,
    label: string
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
    addAuditEntry(`Uploaded ${label}`, 'upload', `${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
  };

  const handleSubmitPhilsys = () => {
    if (isRateLimited) {
      toast.error(`Maximum ${MAX_DAILY_ATTEMPTS} verification attempts per day. Please try again tomorrow.`);
      return;
    }
    if (!philsysFile) {
      toast.error('Please upload your PhilSys verification screenshot first.');
      return;
    }
    incrementAttempts();
    addAuditEntry('PhilSys verification submitted', 'info', 'Awaiting admin review');
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
    if (isRateLimited) {
      toast.error(`Maximum ${MAX_DAILY_ATTEMPTS} verification attempts per day. Please try again tomorrow.`);
      return;
    }
    if (!idFile || !selfieFile) {
      toast.error('Please upload both your ID photo and selfie.');
      return;
    }
    if (!livenessPassed) {
      toast.error('Please complete the liveness check first.');
      return;
    }
    if (!documentValid) {
      toast.error('Please confirm your document expiry date.');
      return;
    }
    if (faceMatched === false) {
      toast.error('Face matching failed. Please upload matching ID and selfie photos.');
      return;
    }
    incrementAttempts();
    addAuditEntry('Biometric verification submitted', 'info', `Face match: ${faceMatchScore}%, Liveness: passed`);
    submitVerification({
      userId: user.id,
      userName: user.name,
      type: 'biometric',
      idPhoto: idPreview || '/placeholder.svg',
      selfiePhoto: livenessImage || selfiePreview || '/placeholder.svg',
    });
    updateVerificationStatus(user.id, 'biometric_pending');
    setIdFile(null);
    setIdPreview(null);
    setSelfieFile(null);
    setSelfiePreview(null);
    setLivenessPassed(false);
    setLivenessImage(null);
    setFaceMatched(null);
    setDocumentValid(false);
    toast.success('Biometric verification submitted! Please wait for admin review.');
  };

  const status = user.verificationStatus;

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

  const biometricReady = livenessPassed && idFile && selfieFile && documentValid && faceMatched !== false;

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

      {/* Security Badges */}
      <div className="mb-6 animate-fade-in">
        <SecurityBadges />
      </div>

      {/* Rate Limit Warning */}
      {isRateLimited && (
        <Card className="mb-6 border-destructive/50 bg-destructive/5 animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm">
              <AlertCircle className="h-5 w-5" />
              Daily verification limit reached ({MAX_DAILY_ATTEMPTS} attempts). Please try again tomorrow.
            </div>
          </CardContent>
        </Card>
      )}

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
          {['philsys_approved', 'biometric_pending', 'fully_verified'].includes(status) && (
            <div className="flex items-center gap-2 text-verified font-medium">
              <CheckCircle className="h-5 w-5" /> PhilSys Verified — Approved by Admin
            </div>
          )}

          {status === 'philsys_pending' && (
            <div className="rounded-lg border border-pending/30 bg-pending/5 p-4">
              <div className="flex items-center gap-2 text-pending font-medium mb-2">
                <Clock className="h-5 w-5" /> Pending Admin Review
              </div>
              <p className="text-sm text-muted-foreground">
                Your PhilSys screenshot has been submitted. An admin will review your verification request.
                This may take 24-48 hours.
              </p>
            </div>
          )}

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

          {canSubmitPhilsys && !isRateLimited && (
            <>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="font-medium text-foreground text-sm">How to verify with PhilSys:</p>
                </div>
                <ol className="space-y-2 text-sm text-muted-foreground ml-7">
                  {[
                    'Click the button below to open the official PhilSys verification website',
                    'Complete the verification process on the PhilSys website',
                    'Take a screenshot of the success/confirmation page',
                    'Upload the screenshot below and submit for admin review',
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      {text}
                    </li>
                  ))}
                </ol>
              </div>

              <Button
                variant="outline"
                className="w-full h-12 text-base gap-2"
                onClick={() => {
                  window.open(PHILSYS_URL, '_blank');
                  addAuditEntry('Opened PhilSys website', 'info', PHILSYS_URL);
                }}
              >
                <ExternalLink className="h-5 w-5" />
                Open PhilSys Verification Website
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>

              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  ref={philsysFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0], setPhilsysFile, setPhilsysPreview, 'PhilSys screenshot')}
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
                  <div className="cursor-pointer" onClick={() => philsysFileRef.current?.click()}>
                    <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium text-foreground">Upload PhilSys Success Screenshot</p>
                    <p className="text-sm text-muted-foreground mt-1">Click to browse or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </div>

              {/* Anti-spoofing on PhilSys screenshot */}
              <AntiSpoofingCheck
                imageDataUrl={philsysPreview}
                label="PhilSys Screenshot"
                onResult={(passed) => {
                  addAuditEntry('Anti-spoofing check', 'security', passed ? 'Passed' : 'Flagged for review');
                }}
              />

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Additional Notes (optional)</label>
                <Input
                  placeholder="Add any notes for the admin reviewer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

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
              <CardDescription>Upload your government ID, complete liveness check, and face matching</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'fully_verified' && (
            <div className="flex items-center gap-2 text-verified font-medium">
              <CheckCircle className="h-5 w-5" /> Biometric Verified — Approved by Admin
            </div>
          )}

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

          {!canSubmitBiometric && status !== 'biometric_pending' && status !== 'fully_verified' && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">Complete PhilSys verification first to unlock this step.</p>
            </div>
          )}

          {canSubmitBiometric && !isRateLimited && (
            <>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Biometric verification requires:</p>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Upload a clear photo of your valid government-issued ID</li>
                      <li>Confirm your document is not expired</li>
                      <li>Complete a live camera liveness check (blink, smile, head turn)</li>
                      <li>AI face matching between your ID and live selfie</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Document Expiry */}
              <DocumentExpiryCheck onValidityChange={(valid, date) => {
                setDocumentValid(valid);
                setDocumentExpiry(date);
                if (valid) addAuditEntry('Document expiry confirmed', 'security', `Expires: ${date}`);
              }} />

              {/* ID Photo Upload */}
              <div className="rounded-lg border-2 border-dashed border-border p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  ref={idFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0], setIdFile, setIdPreview, 'Government ID')}
                />
                {idPreview ? (
                  <div className="space-y-2">
                    <img src={idPreview} alt="ID Photo" className="max-h-40 mx-auto rounded-lg border border-border" />
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

              {/* Anti-spoofing on ID */}
              <AntiSpoofingCheck
                imageDataUrl={idPreview}
                label="ID Photo"
                onResult={(passed) => {
                  setIdSpoofPassed(passed);
                  addAuditEntry('ID anti-spoofing check', 'security', passed ? 'Passed' : 'Flagged');
                }}
              />

              {/* Liveness Check */}
              <LivenessCheck
                disabled={!idFile || !documentValid}
                onComplete={(passed, capturedImg) => {
                  setLivenessPassed(passed);
                  setLivenessImage(capturedImg);
                  // Also use liveness image as selfie for face matching
                  setSelfiePreview(capturedImg);
                  setSelfieFile(new File([], 'liveness-capture.jpg'));
                  addAuditEntry('Liveness check', 'liveness', passed ? 'All challenges passed' : 'Failed');
                }}
              />

              {/* Face Match between ID and liveness selfie */}
              {idPreview && livenessImage && (
                <FaceMatchIndicator
                  idPhoto={idPreview}
                  selfiePhoto={livenessImage}
                  onMatchResult={(matched, score) => {
                    setFaceMatched(matched);
                    setFaceMatchScore(score);
                    addAuditEntry('Face matching', 'security', `Score: ${score}% — ${matched ? 'Match' : 'No match'}`);
                  }}
                />
              )}

              {/* Optional manual selfie fallback */}
              {!livenessPassed && (
                <div className="rounded-lg border-2 border-dashed border-border p-4 text-center hover:border-primary/50 transition-colors opacity-50">
                  <input
                    ref={selfieFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled
                  />
                  <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="font-medium text-sm text-foreground">Selfie Photo</p>
                  <p className="text-xs text-muted-foreground mt-1">Complete liveness check above — selfie is captured automatically</p>
                </div>
              )}

              <Button
                className="w-full h-11"
                onClick={handleSubmitBiometric}
                disabled={!biometricReady}
              >
                <Upload className="h-4 w-4 mr-2" />
                Submit Biometric for Admin Review
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Audit Trail */}
      {auditLog.length > 0 && (
        <div className="mb-6 animate-fade-in">
          <AuditTrail entries={auditLog} />
        </div>
      )}

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
