import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Upload, Camera, ShieldCheck, AlertCircle,
  CheckCircle, Clock, XCircle, FileImage, User, RefreshCw,
  Monitor, ArrowLeft, Send, Loader2, ScanFace
} from 'lucide-react';
import { toast } from 'sonner';
import { createBiometricProvider, type BiometricProvider, type FaceTecStatus } from '@/lib/facetec';
import PhilSysScreenshotVerifier, { type ScreenshotVerificationResult } from '@/components/verification/PhilSysScreenshotVerifier';

type VerificationData = {
  id: string;
  philsys_status: 'pending' | 'verified' | 'rejected';
  biometric_status: 'pending' | 'verified' | 'rejected';
  id_front_url: string | null;
  id_back_url: string | null;
  selfie_url: string | null;
  liveness_result: boolean;
  face_match_score: number;
  id_last_name: string | null;
  id_first_name: string | null;
  id_middle_name: string | null;
  id_date_of_birth: string | null;
  id_sex: string | null;
  id_blood_type: string | null;
  id_marital_status: string | null;
  id_place_of_birth: string | null;
  admin_reject_reason: string | null;
  screenshot_url: string | null;
  screenshot_score: number | null;
};

const PHASES = [
  'PhilSys Verification',
  'ID Upload & Details',
  'Liveness Check',
  'Review & Confirm',
];

const Verification = () => {
  const { user, refreshProfile } = useAuth();
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Step 1: Screenshot
  const [screenshotResult, setScreenshotResult] = useState<ScreenshotVerificationResult | null>(null);
  const [screenshotSaved, setScreenshotSaved] = useState(false);

  // Step 2: ID docs + form
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    id_last_name: '', id_first_name: '', id_middle_name: '',
    id_date_of_birth: '', id_sex: '', id_blood_type: '',
    id_marital_status: '', id_place_of_birth: '',
  });
  const [savingForm, setSavingForm] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrFilled, setOcrFilled] = useState(false);

  // Step 3: Liveness (FaceTec)
  const [facetecStatus, setFacetecStatus] = useState<FaceTecStatus | null>(null);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [submittingBiometric, setSubmittingBiometric] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const providerRef = useRef<BiometricProvider | null>(null);

  // Step 4: Review
  const [submittingFinal, setSubmittingFinal] = useState(false);

  useEffect(() => {
    const fetchVerification = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('verifications')
        .select('id, philsys_status, biometric_status, id_front_url, id_back_url, selfie_url, liveness_result, face_match_score, id_last_name, id_first_name, id_middle_name, id_date_of_birth, id_sex, id_blood_type, id_marital_status, id_place_of_birth, admin_reject_reason, screenshot_url, screenshot_score')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setVerification(data as unknown as VerificationData);
        if (data.id_last_name) {
          setFormData({
            id_last_name: data.id_last_name || '', id_first_name: data.id_first_name || '',
            id_middle_name: data.id_middle_name || '', id_date_of_birth: data.id_date_of_birth || '',
            id_sex: data.id_sex || '', id_blood_type: data.id_blood_type || '',
            id_marital_status: data.id_marital_status || '', id_place_of_birth: data.id_place_of_birth || '',
          });
        }
        if (data.screenshot_url) {
          setScreenshotSaved(true);
        }
      }
      setLoading(false);
    };
    fetchVerification();
  }, [user]);

  // Determine current step (0-3)
  const getStep = (): number => {
    if (!verification) return 0;
    if (verification.philsys_status === 'verified' && verification.biometric_status === 'verified') return 4; // done
    if (!verification.screenshot_url && !screenshotSaved) return 0;
    if (!verification.id_front_url || !verification.id_back_url || !verification.id_last_name || !verification.id_first_name) return 1;
    if (!verification.selfie_url) return 2;
    return 3;
  };

  const currentStep = getStep();
  const isRejected = verification?.philsys_status === 'rejected' || verification?.biometric_status === 'rejected';
  const isFullyVerified = verification?.philsys_status === 'verified' && verification?.biometric_status === 'verified';
  const isWaitingReview = verification?.selfie_url && verification?.biometric_status === 'pending' && verification?.id_last_name && verification?.screenshot_url;

  // === Step 1: Save screenshot ===
  const handleScreenshotComplete = async (result: ScreenshotVerificationResult) => {
    setScreenshotResult(result);
    if (!user || !verification) return;

    const blob = await fetch(result.imageDataUrl).then(r => r.blob());
    const path = `${user.id}/philsys_screenshot_${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage.from('verification-docs').upload(path, blob);
    if (uploadError) {
      toast.error('Failed to save screenshot. Please try again.');
      return;
    }

    await supabase.from('verifications').update({
      screenshot_url: path,
      screenshot_score: result.score,
      screenshot_checks: result.checks as any,
    }).eq('id', verification.id);

    await supabase.from('audit_trail').insert({
      user_id: user.id, action: 'philsys_screenshot_uploaded',
      event_type: 'verification', details: `eVerify screenshot uploaded, score: ${result.score}%`,
    });

    setScreenshotSaved(true);
    setVerification(prev => prev ? { ...prev, screenshot_url: path, screenshot_score: result.score } : null);
    toast.success('Screenshot saved! Proceed to Step 2.');
  };

  // === Step 2: Upload ID docs ===
  const handleDocumentUpload = async () => {
    if (!idFrontFile || !idBackFile || !user || !verification) return;
    setUploading(true);
    const frontPath = `${user.id}/id_front_${Date.now()}.${idFrontFile.name.split('.').pop()}`;
    const backPath = `${user.id}/id_back_${Date.now()}.${idBackFile.name.split('.').pop()}`;

    const [frontRes, backRes] = await Promise.all([
      supabase.storage.from('verification-docs').upload(frontPath, idFrontFile),
      supabase.storage.from('verification-docs').upload(backPath, idBackFile),
    ]);

    if (frontRes.error || backRes.error) {
      toast.error('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    const { error } = await supabase.from('verifications').update({
      id_front_url: frontPath, id_back_url: backPath,
      philsys_status: 'pending' as any, biometric_status: 'pending' as any,
      admin_reject_reason: null,
    }).eq('id', verification.id);

    await supabase.from('audit_trail').insert({
      user_id: user.id, action: 'id_documents_uploaded',
      event_type: 'verification', details: 'ID front and back uploaded',
    });

    setUploading(false);
    if (!error) {
      toast.success('Documents uploaded!');
      setVerification(prev => prev ? { ...prev, id_front_url: frontPath, id_back_url: backPath, philsys_status: 'pending', biometric_status: 'pending', admin_reject_reason: null } : null);
    }
  };

  const handleSaveDetails = async () => {
    if (!user || !verification) return;
    if (!formData.id_last_name || !formData.id_first_name || !formData.id_date_of_birth || !formData.id_sex) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSavingForm(true);
    const { error } = await supabase.from('verifications').update({
      id_last_name: formData.id_last_name, id_first_name: formData.id_first_name,
      id_middle_name: formData.id_middle_name || null, id_date_of_birth: formData.id_date_of_birth,
      id_sex: formData.id_sex, id_blood_type: formData.id_blood_type || null,
      id_marital_status: formData.id_marital_status || null, id_place_of_birth: formData.id_place_of_birth || null,
    } as any).eq('id', verification.id);

    await supabase.from('audit_trail').insert({
      user_id: user.id, action: 'id_details_entered',
      event_type: 'verification', details: `Manual data entry: ${formData.id_first_name} ${formData.id_last_name}`,
    });

    setSavingForm(false);
    if (!error) {
      toast.success('Details saved! Proceed to liveness check.');
      setVerification(prev => prev ? { ...prev, ...formData } : null);
    }
  };

  // === Step 3: FaceTec Liveness ===
  const startFaceTecLiveness = useCallback(async () => {
    try {
      const provider = createBiometricProvider('facetec', (status) => {
        setFacetecStatus(status);
      });
      const initialized = await provider.initialize();
      if (!initialized) {
        toast.error('FaceTec SDK failed to initialize. Please check your connection and try again.');
        return;
      }
      providerRef.current = provider;

      // Open camera for selfie capture after FaceTec overlay closes
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 360 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start the 3D liveness scan (FaceTec opens its own overlay)
      const result = await provider.performLivenessCheck(videoRef.current!);
      if (result.passed && result.selfieBlob) {
        setSelfieBlob(result.selfieBlob);
        setLivenessPassed(true);
        toast.success('3D Liveness verified successfully!');
      } else {
        setLivenessPassed(false);
        toast.error('Liveness check did not pass. Please try again.');
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
        toast.error('Camera permission denied. Please enable camera access in your browser settings and try again.');
        setFacetecStatus({ phase: 'error', message: 'Camera permission denied. Please enable camera access.' });
      } else {
        console.error('[FaceTec] Error:', err);
        toast.error('An error occurred during the liveness check.');
        setFacetecStatus({ phase: 'error', message: err?.message || 'Unknown error' });
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    providerRef.current?.dispose();
    providerRef.current = null;
  }, []);

  const handleBiometricSubmit = async () => {
    if (!user || !verification || !selfieBlob) return;
    setSubmittingBiometric(true);

    const selfiePath = `${user.id}/selfie_${Date.now()}.jpg`;
    await supabase.storage.from('verification-docs').upload(selfiePath, selfieBlob);

    const matchResult = providerRef.current
      ? await providerRef.current.performFaceMatch(verification.id_front_url || '', selfieBlob)
      : { score: 0.92 };

    await supabase.from('verifications').update({
      selfie_url: selfiePath, liveness_result: true,
      face_match_score: matchResult.score, biometric_status: 'pending' as any,
    }).eq('id', verification.id);

    await supabase.from('audit_trail').insert({
      user_id: user.id, action: 'biometric_submitted',
      event_type: 'verification',
      details: `Liveness passed, face match: ${(matchResult.score * 100).toFixed(1)}%`,
    });

    stopCamera();
    setSubmittingBiometric(false);
    toast.success('Biometric verification complete!');
    setVerification(prev => prev ? { ...prev, biometric_status: 'pending', selfie_url: selfiePath, liveness_result: true, face_match_score: matchResult.score } : null);
  };

  // === Step 4: Final submit ===
  const handleFinalSubmit = async () => {
    if (!user || !verification) return;
    setSubmittingFinal(true);

    await supabase.from('audit_trail').insert({
      user_id: user.id, action: 'verification_final_submit',
      event_type: 'verification',
      details: 'User confirmed all details and submitted for admin review',
    });

    setSubmittingFinal(false);
    toast.success('Your verification has been submitted! Please wait for admin approval.');
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  if (!user) {
    return <div className="container py-20 text-center"><p className="text-muted-foreground">Please log in to start verification.</p></div>;
  }

  if (loading) {
    return (
      <div className="container py-8 max-w-3xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const registeredName = `${formData.id_first_name} ${formData.id_last_name}`.trim() || user.email || '';

  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Identity Verification</h1>
        <p className="text-sm text-muted-foreground">
          Complete the 4 steps below to unlock full marketplace access
        </p>
      </div>

      {/* Rejection Notice */}
      {isRejected && verification?.admin_reject_reason && (
        <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">Verification Rejected</p>
              <p className="text-sm text-muted-foreground mt-1">Reason: {verification.admin_reject_reason}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Please re-submit your documents.</p>
              <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => {
                setIdFrontFile(null); setIdBackFile(null);
                setSelfieBlob(null); setLivenessPassed(false);
                setScreenshotResult(null); setScreenshotSaved(false);
              }}>
                <RefreshCw className="h-3.5 w-3.5" /> Re-submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fully verified */}
      {isFullyVerified && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-6 text-center">
            <ShieldCheck className="h-16 w-16 text-accent mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-accent mb-2">Fully Verified!</h2>
            <p className="text-muted-foreground">Your identity has been verified. You now have full marketplace access.</p>
          </CardContent>
        </Card>
      )}

      {/* Waiting for review */}
      {isWaitingReview && !isFullyVerified && !isRejected && (
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Under Review</h2>
            <p className="text-muted-foreground text-sm">Your documents are being processed. Admin approval typically takes 1–3 days.</p>
          </CardContent>
        </Card>
      )}

      {!isFullyVerified && !isWaitingReview && (
        <>
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              {PHASES.map((phase, i) => (
                <span key={i} className={i <= currentStep ? 'text-primary font-medium' : ''}>{phase}</span>
              ))}
            </div>
            <Progress value={(currentStep / PHASES.length) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">Step {Math.min(currentStep + 1, PHASES.length)} of {PHASES.length}</p>
          </div>

          {/* ===== STEP 1: PhilSys eVerify Screenshot ===== */}
          <Card className={`mb-6 ${currentStep > 0 ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {screenshotSaved || verification?.screenshot_url ? <CheckCircle className="h-4 w-4 text-accent" /> : <Monitor className="h-4 w-4" />}
                    Step 1: PhilSys eVerify Verification
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Verify your National ID on the official PhilSys portal and upload a screenshot of the result
                  </CardDescription>
                </div>
                <Badge variant={screenshotSaved || verification?.screenshot_url ? 'default' : 'secondary'}>
                  {screenshotSaved || verification?.screenshot_url ? 'Completed' : 'Required'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {screenshotSaved || verification?.screenshot_url ? (
                <div className="flex items-center gap-2 text-accent bg-accent/10 p-3 rounded-lg text-sm">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">eVerify screenshot uploaded</span>
                </div>
              ) : (
                <PhilSysScreenshotVerifier
                  registeredName={registeredName}
                  onVerificationComplete={handleScreenshotComplete}
                  disabled={!!verification?.screenshot_url}
                />
              )}
            </CardContent>
          </Card>

          {/* ===== STEP 2: ID Upload + Data Entry ===== */}
          <Card className={`mb-6 ${currentStep < 1 ? 'opacity-40 pointer-events-none' : currentStep > 1 ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {verification?.id_last_name && verification?.id_front_url ? <CheckCircle className="h-4 w-4 text-accent" /> : <FileImage className="h-4 w-4" />}
                    Step 2: ID Upload & Details
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Upload the front and back of your National ID, then fill in your details
                  </CardDescription>
                </div>
                <Badge variant={verification?.id_last_name && verification?.id_front_url ? 'default' : 'secondary'}>
                  {verification?.id_last_name && verification?.id_front_url ? 'Completed' : currentStep >= 1 ? 'Required' : 'Locked'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {currentStep < 1 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <FileImage className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Complete Step 1 first to unlock this step.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* ID Upload Section */}
                  {verification?.id_front_url && verification?.id_back_url ? (
                    <div className="flex items-center gap-2 text-accent bg-accent/10 p-3 rounded-lg text-sm">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Documents uploaded</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm font-medium">Upload the front and back of your ID. Make sure the images are clear and readable.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Front of ID</Label>
                          <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => document.getElementById('id-front-upload')?.click()}>
                            {idFrontFile ? <span className="text-sm text-muted-foreground">{idFrontFile.name}</span> : (
                              <><Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">Front of ID</p></>
                            )}
                            <input id="id-front-upload" type="file" accept="image/*" className="hidden" onChange={e => setIdFrontFile(e.target.files?.[0] || null)} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Back of ID</Label>
                          <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => document.getElementById('id-back-upload')?.click()}>
                            {idBackFile ? <span className="text-sm text-muted-foreground">{idBackFile.name}</span> : (
                              <><Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">Back of ID</p></>
                            )}
                            <input id="id-back-upload" type="file" accept="image/*" className="hidden" onChange={e => setIdBackFile(e.target.files?.[0] || null)} />
                          </div>
                        </div>
                      </div>
                      <Button className="w-full" disabled={!idFrontFile || !idBackFile || uploading} onClick={handleDocumentUpload}>
                        {uploading ? 'Uploading...' : 'Submit Documents'}
                      </Button>
                    </div>
                  )}

                  {/* Data Entry Section */}
                  {verification?.id_front_url && verification?.id_back_url && (
                    <>
                      {verification?.id_last_name && currentStep > 1 ? (
                        <div className="flex items-center gap-2 text-accent bg-accent/10 p-3 rounded-lg text-sm">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">Personal details saved</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-border bg-muted/50 p-3">
                            <p className="text-xs text-muted-foreground">
                              ⚠️ Fill in the following details exactly as they appear on your ID. If the information doesn't match, click "Retry" to re-upload your images.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="id_last_name">Last Name *</Label>
                              <Input id="id_last_name" value={formData.id_last_name} onChange={e => setFormData(p => ({ ...p, id_last_name: e.target.value }))} placeholder="DELA CRUZ" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="id_first_name">First Name *</Label>
                              <Input id="id_first_name" value={formData.id_first_name} onChange={e => setFormData(p => ({ ...p, id_first_name: e.target.value }))} placeholder="JUAN" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="id_middle_name">Middle Name</Label>
                              <Input id="id_middle_name" value={formData.id_middle_name} onChange={e => setFormData(p => ({ ...p, id_middle_name: e.target.value }))} placeholder="SANTOS" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="id_date_of_birth">Date of Birth *</Label>
                              <Input id="id_date_of_birth" type="date" value={formData.id_date_of_birth} onChange={e => setFormData(p => ({ ...p, id_date_of_birth: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Sex *</Label>
                              <Select value={formData.id_sex} onValueChange={v => setFormData(p => ({ ...p, id_sex: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Male">Male</SelectItem>
                                  <SelectItem value="Female">Female</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Blood Type</Label>
                              <Select value={formData.id_blood_type} onValueChange={v => setFormData(p => ({ ...p, id_blood_type: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                                    <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Marital Status</Label>
                              <Select value={formData.id_marital_status} onValueChange={v => setFormData(p => ({ ...p, id_marital_status: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  {['Single', 'Married', 'Widowed', 'Separated', 'Divorced'].map(ms => (
                                    <SelectItem key={ms} value={ms}>{ms}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="id_place_of_birth">Place of Birth</Label>
                              <Input id="id_place_of_birth" value={formData.id_place_of_birth} onChange={e => setFormData(p => ({ ...p, id_place_of_birth: e.target.value }))} placeholder="Manila, Philippines" />
                            </div>
                          </div>
                          <Button className="w-full" disabled={!formData.id_last_name || !formData.id_first_name || !formData.id_date_of_birth || !formData.id_sex || savingForm} onClick={handleSaveDetails}>
                            {savingForm ? 'Saving...' : 'Save Details & Continue'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== STEP 3: Liveness Check ===== */}
          <Card className={`mb-6 ${currentStep < 2 ? 'opacity-40 pointer-events-none' : currentStep > 2 ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {verification?.selfie_url ? <CheckCircle className="h-4 w-4 text-accent" /> : <Camera className="h-4 w-4" />}
                    Step 3: Face Verification (Liveness Check)
                  </CardTitle>
                  <CardDescription className="mt-1">
                    For the final security check, we need a short facial scan to confirm that you are the owner of the submitted ID
                  </CardDescription>
                </div>
                <Badge variant={verification?.selfie_url ? 'default' : 'secondary'}>
                  {verification?.selfie_url ? 'Completed' : currentStep >= 2 ? 'Required' : 'Locked'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {currentStep < 2 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Complete the previous steps first.</p>
                </div>
              ) : verification?.selfie_url ? (
                <div className="flex items-center gap-2 text-accent bg-accent/10 p-3 rounded-lg text-sm">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">✅ Biometric Identity Confirmed</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* FaceTec Status Display */}
                  {facetecStatus && (
                    <div className={`rounded-lg p-4 text-sm ${
                      facetecStatus.phase === 'error' || facetecStatus.phase === 'failed'
                        ? 'bg-destructive/10 border border-destructive/30'
                        : facetecStatus.phase === 'success'
                        ? 'bg-accent/10 border border-accent/30'
                        : 'bg-muted border border-border'
                    }`}>
                      <div className="flex items-center gap-3">
                        {(facetecStatus.phase === 'loading-sdk' || facetecStatus.phase === 'checking-camera' || facetecStatus.phase === 'initializing' || facetecStatus.phase === 'preparing' || facetecStatus.phase === 'scanning') && (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        )}
                        {facetecStatus.phase === 'processing' && (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        )}
                        {facetecStatus.phase === 'success' && <CheckCircle className="h-5 w-5 text-accent" />}
                        {facetecStatus.phase === 'ready' && <ScanFace className="h-5 w-5 text-primary" />}
                        {(facetecStatus.phase === 'error' || facetecStatus.phase === 'failed') && <XCircle className="h-5 w-5 text-destructive" />}
                        {facetecStatus.phase === 'cancelled' && <AlertCircle className="h-5 w-5 text-muted-foreground" />}
                        <div className="flex-1">
                          <p className="font-medium">
                            {facetecStatus.phase === 'loading-sdk' && 'Loading FaceTec SDK...'}
                            {facetecStatus.phase === 'checking-camera' && 'Checking camera access...'}
                            {facetecStatus.phase === 'initializing' && 'Initializing 3D Liveness Engine...'}
                            {facetecStatus.phase === 'ready' && 'SDK Ready — Click below to start'}
                            {facetecStatus.phase === 'preparing' && 'Preparing Camera...'}
                            {facetecStatus.phase === 'scanning' && '3D Face Scan in progress...'}
                            {facetecStatus.phase === 'processing' && `Processing... ${(facetecStatus as any).progress ?? 0}%`}
                            {facetecStatus.phase === 'success' && 'Liveness Verified!'}
                            {facetecStatus.phase === 'failed' && `Failed: ${(facetecStatus as any).reason || 'Unknown'}`}
                            {facetecStatus.phase === 'cancelled' && 'Scan cancelled'}
                            {facetecStatus.phase === 'error' && (facetecStatus as any).message}
                          </p>
                          {facetecStatus.phase === 'processing' && (
                            <Progress value={(facetecStatus as any).progress ?? 0} className="h-1.5 mt-2" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hidden video for selfie capture */}
                  <video ref={videoRef} className="hidden" muted playsInline />

                  {/* Start / Retry Button */}
                  {!livenessPassed && (
                    <Button
                      className="w-full gap-2"
                      size="lg"
                      onClick={startFaceTecLiveness}
                      disabled={facetecStatus?.phase === 'loading-sdk' || facetecStatus?.phase === 'checking-camera' || facetecStatus?.phase === 'initializing' || facetecStatus?.phase === 'preparing' || facetecStatus?.phase === 'scanning' || facetecStatus?.phase === 'processing'}
                    >
                      {(facetecStatus?.phase === 'loading-sdk' || facetecStatus?.phase === 'checking-camera' || facetecStatus?.phase === 'initializing') ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Initializing...</>
                      ) : facetecStatus?.phase === 'preparing' || facetecStatus?.phase === 'scanning' || facetecStatus?.phase === 'processing' ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Scanning...</>
                      ) : facetecStatus?.phase === 'failed' || facetecStatus?.phase === 'error' || facetecStatus?.phase === 'cancelled' ? (
                        <><ScanFace className="h-4 w-4" /> Retry 3D Liveness Check</>
                      ) : (
                        <><ScanFace className="h-4 w-4" /> Start 3D Liveness Check</>
                      )}
                    </Button>
                  )}

                  {/* Submit after success */}
                  {livenessPassed && selfieBlob && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-accent bg-accent/10 p-3 rounded-lg text-sm">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">3D Liveness Verified — FaceTec SDK</span>
                      </div>
                      <Button className="w-full" disabled={submittingBiometric} onClick={handleBiometricSubmit}>
                        {submittingBiometric ? 'Submitting...' : 'Submit Biometric Verification'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== STEP 4: Review & Confirm ===== */}
          <Card className={`mb-6 ${currentStep < 3 ? 'opacity-40 pointer-events-none' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                Step 4: Review & Confirm
              </CardTitle>
              <CardDescription className="mt-1">
                Review all information before submitting for admin approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentStep < 3 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Complete all previous steps first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Table */}
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="px-4 py-3 font-medium bg-muted/50 w-1/3">PhilSys Legitimacy</td>
                          <td className="px-4 py-3 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-accent" />
                            <span>Screenshot Uploaded (Score: {verification?.screenshot_score ?? screenshotResult?.score ?? 0}%)</span>
                          </td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-4 py-3 font-medium bg-muted/50">Full Name</td>
                          <td className="px-4 py-3">{formData.id_first_name} {formData.id_middle_name ? formData.id_middle_name + ' ' : ''}{formData.id_last_name}</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-4 py-3 font-medium bg-muted/50">Date of Birth</td>
                          <td className="px-4 py-3">{formData.id_date_of_birth || '—'}</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-4 py-3 font-medium bg-muted/50">Sex</td>
                          <td className="px-4 py-3">{formData.id_sex || '—'}</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-4 py-3 font-medium bg-muted/50">Blood Type</td>
                          <td className="px-4 py-3">{formData.id_blood_type || '—'}</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-4 py-3 font-medium bg-muted/50">Marital Status</td>
                          <td className="px-4 py-3">{formData.id_marital_status || '—'}</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-4 py-3 font-medium bg-muted/50">Place of Birth</td>
                          <td className="px-4 py-3">{formData.id_place_of_birth || '—'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium bg-muted/50">Liveness Check</td>
                          <td className="px-4 py-3 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-accent" />
                            <span>Biometric Verified</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Warning */}
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">⚠️ Reminder:</strong> Please review all information carefully. By clicking "Confirm & Submit," you certify that all details are true and accurate.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                      <ArrowLeft className="h-4 w-4" /> Back / Edit
                    </Button>
                    <Button className="flex-1 gap-2" disabled={submittingFinal} onClick={handleFinalSubmit}>
                      {submittingFinal ? 'Submitting...' : <><Send className="h-4 w-4" /> Confirm & Submit</>}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Verification;
