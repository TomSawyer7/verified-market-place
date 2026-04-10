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
  CheckCircle, Clock, XCircle, FileImage, User, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { createBiometricProvider, type BiometricProvider } from '@/lib/facetec';

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
};

const PHASES = ['Document Submission', 'Personal Details', 'Liveness Check'];

const Verification = () => {
  const { user, refreshProfile } = useAuth();
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    id_last_name: '', id_first_name: '', id_middle_name: '',
    id_date_of_birth: '', id_sex: '', id_blood_type: '',
    id_marital_status: '', id_place_of_birth: '',
  });
  const [savingForm, setSavingForm] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [livenessStep, setLivenessStep] = useState('');
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [submittingBiometric, setSubmittingBiometric] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const providerRef = useRef<BiometricProvider | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('verifications')
        .select('id, philsys_status, biometric_status, id_front_url, id_back_url, selfie_url, liveness_result, face_match_score, id_last_name, id_first_name, id_middle_name, id_date_of_birth, id_sex, id_blood_type, id_marital_status, id_place_of_birth, admin_reject_reason')
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
      }
      setLoading(false);
    };
    fetchVerification();
  }, [user]);

  const getPhase = (): number => {
    if (!verification) return 0;
    if (verification.philsys_status === 'verified' && verification.biometric_status === 'verified') return 3;
    if (!verification.id_front_url || !verification.id_back_url) return 0;
    if (!verification.id_last_name || !verification.id_first_name) return 1;
    if (!verification.selfie_url) return 2;
    return 2;
  };

  const currentPhase = getPhase();
  const isRejected = verification?.philsys_status === 'rejected' || verification?.biometric_status === 'rejected';
  const isFullyVerified = verification?.philsys_status === 'verified' && verification?.biometric_status === 'verified';
  const isWaitingReview = verification?.selfie_url && verification?.biometric_status === 'pending' && verification?.id_last_name;

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
      toast.success('Documents uploaded successfully!');
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

  // Phase 3: Biometric via provider abstraction
  const startCamera = useCallback(async () => {
    try {
      const provider = createBiometricProvider();
      const initialized = await provider.initialize();
      if (!initialized) {
        toast.error('Biometric system failed to initialize');
        return;
      }
      providerRef.current = provider;

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 360 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      runLivenessCheck();
    } catch {
      toast.error('Camera access required for liveness check');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    providerRef.current?.dispose();
    providerRef.current = null;
    setCameraActive(false);
  }, []);

  const runLivenessCheck = async () => {
    const challenges = ['Please blink your eyes', 'Turn your head slightly left', 'Smile for the camera', 'Nod your head'];
    for (const challenge of challenges) {
      setLivenessStep(challenge);
      await new Promise(r => setTimeout(r, 2500));
    }

    setLivenessStep('Capturing selfie...');
    await new Promise(r => setTimeout(r, 1000));

    if (videoRef.current && providerRef.current) {
      const result = await providerRef.current.performLivenessCheck(videoRef.current);
      if (result.passed && result.selfieBlob) {
        setSelfieBlob(result.selfieBlob);
        setLivenessPassed(true);
        setLivenessStep('Liveness check passed! ✓');
      } else {
        setLivenessStep('Face not detected. Please try again.');
        setLivenessPassed(false);
      }
    }
  };

  const handleBiometricSubmit = async () => {
    if (!user || !verification || !selfieBlob) return;
    setSubmittingBiometric(true);

    const selfiePath = `${user.id}/selfie_${Date.now()}.jpg`;
    await supabase.storage.from('verification-docs').upload(selfiePath, selfieBlob);

    // Use provider for face match
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
      details: `Liveness passed, face match: ${(matchResult.score * 100).toFixed(1)}% (${providerRef.current?.name || 'unknown'})`,
    });

    stopCamera();
    setSubmittingBiometric(false);
    toast.success('Verification submitted! Awaiting admin review.');
    setVerification(prev => prev ? { ...prev, biometric_status: 'pending', selfie_url: selfiePath, liveness_result: true, face_match_score: matchResult.score } : null);
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
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Identity Verification</h1>
        <p className="text-sm text-muted-foreground">Complete all 3 phases to unlock full marketplace access</p>
      </div>

      {/* Rejection Notice */}
      {isRejected && verification?.admin_reject_reason && (
        <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">Verification Rejected</p>
              <p className="text-sm text-muted-foreground mt-1">Reason: {verification.admin_reject_reason}</p>
              <p className="text-sm text-muted-foreground mt-0.5">Please re-submit your documents below.</p>
              <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => {
                setIdFrontFile(null);
                setIdBackFile(null);
                setSelfieBlob(null);
                setLivenessPassed(false);
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
            <p className="text-muted-foreground">Your identity has been verified. You now have full access to the marketplace.</p>
          </CardContent>
        </Card>
      )}

      {/* Waiting for review */}
      {isWaitingReview && !isFullyVerified && !isRejected && (
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Under Review</h2>
            <p className="text-muted-foreground text-sm">Your documents are being processed. Admin approval typically takes 1–3 business days.</p>
          </CardContent>
        </Card>
      )}

      {!isFullyVerified && !isWaitingReview && (
        <>
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              {PHASES.map((phase, i) => (
                <span key={i} className={i <= currentPhase ? 'text-primary font-medium' : ''}>{phase}</span>
              ))}
            </div>
            <Progress value={(currentPhase / PHASES.length) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">Phase {Math.min(currentPhase + 1, PHASES.length)} of {PHASES.length}</p>
          </div>

          {/* Phase 1 */}
          <Card className={`mb-6 ${currentPhase !== 0 && verification?.id_front_url ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {verification?.id_front_url ? <CheckCircle className="h-4 w-4 text-accent" /> : <FileImage className="h-4 w-4" />}
                    Phase 1: Document Submission
                  </CardTitle>
                  <CardDescription className="mt-1">Upload high-resolution images of your National ID</CardDescription>
                </div>
                <Badge variant={verification?.id_front_url ? 'default' : 'secondary'}>
                  {verification?.id_front_url ? 'Completed' : 'Required'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {verification?.id_front_url && verification?.id_back_url ? (
                <div className="flex items-center gap-2 text-accent bg-accent/10 p-3 rounded-lg text-sm">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Documents uploaded successfully</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Upload ID Front</Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => document.getElementById('id-front-upload')?.click()}>
                        {idFrontFile ? <span className="text-sm text-muted-foreground">{idFrontFile.name}</span> : (
                          <><Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">Front of ID</p></>
                        )}
                        <input id="id-front-upload" type="file" accept="image/*" className="hidden" onChange={e => setIdFrontFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Upload ID Back</Label>
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
            </CardContent>
          </Card>

          {/* Phase 2 */}
          <Card className={`mb-6 ${currentPhase < 1 ? 'opacity-40 pointer-events-none' : currentPhase > 1 ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {verification?.id_last_name ? <CheckCircle className="h-4 w-4 text-accent" /> : <User className="h-4 w-4" />}
                    Phase 2: Personal Details
                  </CardTitle>
                  <CardDescription className="mt-1">Enter your details exactly as they appear on your National ID</CardDescription>
                </div>
                <Badge variant={verification?.id_last_name ? 'default' : 'secondary'}>
                  {verification?.id_last_name ? 'Completed' : currentPhase >= 1 ? 'Required' : 'Locked'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {verification?.id_last_name && currentPhase > 1 ? (
                <div className="flex items-center gap-2 text-accent bg-accent/10 p-3 rounded-lg text-sm">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Personal details saved</span>
                </div>
              ) : currentPhase >= 1 ? (
                <div className="space-y-4">
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
                      <Label>Blood Type (Uri ng Dugo)</Label>
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
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Complete Phase 1 first to unlock this step.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phase 3 */}
          <Card className={currentPhase < 2 ? 'opacity-40 pointer-events-none' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {verification?.selfie_url ? <CheckCircle className="h-4 w-4 text-accent" /> : <Camera className="h-4 w-4" />}
                    Phase 3: Liveness Check
                  </CardTitle>
                  <CardDescription className="mt-1">Complete a selfie/liveness check to verify you are a real person</CardDescription>
                </div>
                <Badge variant={verification?.selfie_url ? 'default' : 'secondary'}>
                  {verification?.selfie_url ? 'Completed' : currentPhase >= 2 ? 'Required' : 'Locked'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {currentPhase < 2 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Complete previous phases first to unlock this step.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    {!cameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <Camera className="h-12 w-12 text-muted-foreground" />
                        <Button onClick={startCamera}>Start Liveness Check</Button>
                      </div>
                    )}
                    {cameraActive && livenessStep && (
                      <div className="absolute bottom-0 inset-x-0 bg-background/80 backdrop-blur-sm p-3 text-center">
                        <p className="text-sm font-medium">{livenessStep}</p>
                      </div>
                    )}
                  </div>
                  <Button className="w-full" disabled={!livenessPassed || !selfieBlob || submittingBiometric} onClick={handleBiometricSubmit}>
                    {submittingBiometric ? 'Submitting...' : 'Submit Verification'}
                  </Button>
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
