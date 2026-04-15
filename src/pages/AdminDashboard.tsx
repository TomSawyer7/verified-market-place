import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ShieldCheck, ShieldAlert, Users, CheckCircle, XCircle, Clock,
  ChevronDown, Eye, UserPlus, Shield, AlertTriangle, Activity,
  Lock, Fingerprint, Globe, FileImage, User, ScanFace, Flag, Trash2, Monitor
} from 'lucide-react';
import { toast } from 'sonner';

interface VerificationRow {
  id: string;
  user_id: string;
  philsys_status: string;
  biometric_status: string;
  id_front_url: string | null;
  id_back_url: string | null;
  selfie_url: string | null;
  liveness_result: boolean;
  face_match_score: number;
  anti_spoof_passed: boolean;
  anti_spoof_reasons: string[];
  screenshot_score: number;
  screenshot_url: string | null;
  qr_code_url: string | null;
  id_last_name: string | null;
  id_first_name: string | null;
  id_middle_name: string | null;
  id_date_of_birth: string | null;
  id_sex: string | null;
  id_blood_type: string | null;
  id_marital_status: string | null;
  id_place_of_birth: string | null;
  created_at: string;
  updated_at: string;
  profile?: { first_name: string; last_name: string; status: string } | null;
}

interface SecurityEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  severity: string;
  description: string;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

interface LoginAttempt {
  id: string;
  email: string;
  success: boolean;
  user_agent: string | null;
  created_at: string;
}

interface ReportedListing {
  id: string;
  reporter_id: string;
  product_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  product_title?: string;
  reporter_name?: string;
}

const AdminDashboard = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [reports, setReports] = useState<ReportedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0, secEvents: 0, failedLogins: 0, pendingReports: 0 });
  const [adminEmail, setAdminEmail] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; verificationId: string; userId: string; field: 'philsys_status' | 'biometric_status' }>({ open: false, verificationId: '', userId: '', field: 'philsys_status' });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    const [vRes, seRes, laRes, rpRes] = await Promise.all([
      supabase.from('verifications').select('*'),
      supabase.from('security_events').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('login_attempts').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('reported_listings').select('*').order('created_at', { ascending: false }),
    ]);

    const vData = vRes.data || [];
    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, status');
    const profileMap = new Map((profiles || []).map(p => [p.id, p] as const));
    const enriched = vData.map(v => ({ ...v, profile: profileMap.get(v.user_id) || null })) as VerificationRow[];
    setVerifications(enriched);
    setSecurityEvents((seRes.data || []) as SecurityEvent[]);
    setLoginAttempts((laRes.data || []) as LoginAttempt[]);

    // Enrich reports
    const rpData = (rpRes.data || []) as any[];
    if (rpData.length > 0) {
      const productIds = [...new Set(rpData.map(r => r.product_id))];
      const reporterIds = [...new Set(rpData.map(r => r.reporter_id))];
      const [{ data: products }, { data: reporters }] = await Promise.all([
        supabase.from('products').select('id, title').in('id', productIds),
        supabase.from('profiles').select('id, first_name, last_name').in('id', reporterIds),
      ]);
      const prodMap = new Map((products || []).map(p => [p.id, p.title] as const));
      const repMap = new Map((reporters || []).map(r => [r.id, `${r.first_name} ${r.last_name}`] as const));
      setReports(rpData.map(r => ({
        ...r,
        product_title: prodMap.get(r.product_id) || 'Deleted product',
        reporter_name: repMap.get(r.reporter_id) || 'Unknown',
      })));
    } else {
      setReports([]);
    }

    const failedLogins = (laRes.data || []).filter((a: any) => !a.success).length;
    setStats({
      total: enriched.length,
      pending: enriched.filter(v => (v.philsys_status === 'pending' && v.id_front_url) || (v.biometric_status === 'pending' && v.selfie_url)).length,
      verified: enriched.filter(v => v.philsys_status === 'verified' && v.biometric_status === 'verified').length,
      secEvents: (seRes.data || []).filter((e: any) => e.severity === 'warning' || e.severity === 'critical').length,
      failedLogins,
      pendingReports: rpData.filter(r => r.status === 'pending').length,
    });
    setLoading(false);
  };

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Pre-load signed URLs for all verification documents
  useEffect(() => {
    const loadUrls = async () => {
      const paths: string[] = [];
      for (const v of verifications) {
        if (v.id_front_url) paths.push(v.id_front_url);
        if (v.id_back_url) paths.push(v.id_back_url);
        if (v.selfie_url) paths.push(v.selfie_url);
        if (v.screenshot_url) paths.push(v.screenshot_url);
        if (v.qr_code_url) paths.push(v.qr_code_url);
      }
      const newUrls: Record<string, string> = {};
      for (const path of paths) {
        if (!signedUrls[path]) {
          const { data } = await supabase.storage.from('verification-docs').createSignedUrl(path, 3600);
          if (data?.signedUrl) newUrls[path] = data.signedUrl;
        }
      }
      if (Object.keys(newUrls).length > 0) setSignedUrls(prev => ({ ...prev, ...newUrls }));
    };
    if (verifications.length > 0) loadUrls();
  }, [verifications]);

  const getUrl = (path: string | null) => path ? signedUrls[path] || '' : '';

  const handleApprove = async (verificationId: string, userId: string) => {
    const ver = verifications.find(v => v.id === verificationId);
    if (!ver) return;

    // If both phases have data, approve fully
    const bothReady = ver.id_front_url && ver.selfie_url && ver.id_last_name;
    if (bothReady) {
      await supabase.from('verifications').update({ philsys_status: 'verified' as any, biometric_status: 'verified' as any }).eq('id', verificationId);
      await supabase.from('profiles').update({ status: 'verified' as any }).eq('id', userId);
    } else if (ver.id_front_url && !ver.selfie_url) {
      await supabase.from('verifications').update({ philsys_status: 'verified' as any }).eq('id', verificationId);
    }

    if (user) {
      await supabase.from('admin_logs').insert({
        admin_id: user.id, user_id: userId,
        action: 'verification_approved',
        reason: 'Admin approved verification',
      });
      await supabase.from('notifications').insert({
        user_id: userId, type: 'verification',
        title: 'Verification Approved',
        body: 'Your identity verification has been approved! You now have full marketplace access.',
        link: '/marketplace',
      });
    }

    toast.success('Verification approved');
    fetchData();
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please provide a reason'); return; }

    await supabase.from('verifications').update({
      [rejectDialog.field]: 'rejected' as any,
      admin_reject_reason: rejectReason,
      // Reset uploaded data so user can re-submit
      ...(rejectDialog.field === 'philsys_status' ? { id_front_url: null, id_back_url: null, id_last_name: null, id_first_name: null } : { selfie_url: null, liveness_result: false }),
    } as any).eq('id', rejectDialog.verificationId);

    if (user) {
      await supabase.from('admin_logs').insert({
        admin_id: user.id, user_id: rejectDialog.userId,
        action: 'verification_rejected',
        reason: rejectReason,
      });
      await supabase.from('notifications').insert({
        user_id: rejectDialog.userId, type: 'verification',
        title: 'Verification Rejected',
        body: `Your verification was rejected. Reason: ${rejectReason}`,
        link: '/verification',
      });
    }

    toast.success('Verification rejected');
    setRejectDialog({ open: false, verificationId: '', userId: '', field: 'philsys_status' });
    setRejectReason('');
    fetchData();
  };

  const handlePromoteAdmin = async () => {
    if (!adminEmail) return;
    setPromoting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/setup-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: JSON.stringify({ email: adminEmail }),
      });
      const data = await res.json();
      if (res.ok) { toast.success(data.message); setAdminEmail(''); }
      else toast.error(data.error || 'Failed');
    } catch { toast.error('Failed to promote admin'); }
    setPromoting(false);
  };

  const handleDismissReport = async (reportId: string) => {
    await supabase.from('reported_listings').update({ status: 'dismissed' } as any).eq('id', reportId);
    toast.success('Report dismissed');
    fetchData();
  };

  const handleRemoveListing = async (reportId: string, productId: string) => {
    await supabase.from('products').update({ status: 'removed' }).eq('id', productId);
    await supabase.from('reported_listings').update({ status: 'resolved' } as any).eq('id', reportId);
    toast.success('Listing removed');
    fetchData();
  };

  // Step 1 pending: has screenshot + QR but philsys_status still pending
  const pendingStep1 = verifications.filter(v =>
    v.screenshot_url && v.qr_code_url && v.philsys_status === 'pending' && !v.id_front_url
  );

  const pendingVerifications = verifications.filter(v =>
    (v.id_front_url && v.id_last_name && v.selfie_url) &&
    (v.philsys_status === 'verified' && v.biometric_status === 'pending')
  );

  const handleApproveStep1 = async (verificationId: string, userId: string) => {
    await supabase.from('verifications').update({ philsys_status: 'verified' as any }).eq('id', verificationId);

    if (user) {
      await supabase.from('admin_logs').insert({
        admin_id: user.id, user_id: userId,
        action: 'step1_approved',
        reason: 'Admin approved Step 1 (screenshot + QR code)',
      });
      await supabase.from('notifications').insert({
        user_id: userId, type: 'verification',
        title: 'Step 1 Approved',
        body: 'Your screenshot and QR code have been approved! You can now proceed to Step 2.',
        link: '/verification',
      });
    }

    toast.success('Step 1 approved');
    fetchData();
  };

  const pendingReports = reports.filter(r => r.status === 'pending');

  const severityColor = (s: string) => {
    if (s === 'critical') return 'text-red-600 bg-red-50';
    if (s === 'warning') return 'text-orange-600 bg-orange-50';
    return 'text-muted-foreground bg-muted/50';
  };

  const severityIcon = (s: string) => {
    if (s === 'critical') return <AlertTriangle className="h-3.5 w-3.5" />;
    if (s === 'warning') return <ShieldAlert className="h-3.5 w-3.5" />;
    return <Activity className="h-3.5 w-3.5" />;
  };

  if (loading) return <div className="container py-8"><div className="animate-pulse h-64 bg-muted rounded" /></div>;

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Security monitoring & verification management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total Users', value: stats.total, icon: Users },
          { label: 'Pending', value: stats.pending, icon: Clock },
          { label: 'Verified', value: stats.verified, icon: ShieldCheck },
          { label: 'Security Alerts', value: stats.secEvents, icon: ShieldAlert },
          { label: 'Failed Logins', value: stats.failedLogins, icon: Lock },
          { label: 'Reports', value: stats.pendingReports, icon: Flag },
        ].map((s, i) => (
          <Card key={i} className="border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border flex items-center justify-center"><s.icon className="h-4 w-4" /></div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Admin Promotion */}
      <Card className="mb-6 border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="user@email.com" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="flex-1" />
            <Button size="sm" onClick={handlePromoteAdmin} disabled={promoting || !adminEmail} className="bg-foreground text-background hover:bg-foreground/90">
              {promoting ? 'Promoting...' : 'Make Admin'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="step1">
        <TabsList className="flex-wrap">
          <TabsTrigger value="step1" className="gap-1 text-xs">
            <Monitor className="h-3 w-3" /> Step 1 Reviews ({pendingStep1.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1 text-xs">
            <ShieldCheck className="h-3 w-3" /> Final Reviews ({pendingVerifications.length})
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1 text-xs">
            <Shield className="h-3 w-3" /> Security Log
          </TabsTrigger>
          <TabsTrigger value="logins" className="gap-1 text-xs">
            <Lock className="h-3 w-3" /> Login Attempts
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1 text-xs">
            <Flag className="h-3 w-3" /> Reports ({pendingReports.length})
          </TabsTrigger>
        </TabsList>

        {/* Step 1 Reviews (Screenshot + QR) */}
        <TabsContent value="step1" className="space-y-4 mt-4">
          {pendingStep1.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No pending Step 1 reviews</p>
          ) : pendingStep1.map(v => (
            <Card key={v.id} className="border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{v.profile?.first_name} {v.profile?.last_name}</p>
                    <p className="text-[11px] text-muted-foreground">Submitted: {new Date(v.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary">Step 1 — Pending</Badge>
                </div>

                {/* Screenshot */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">eVerify Screenshot (Score: {v.screenshot_score}%)</p>
                  {v.screenshot_url ? (
                    <img src={getUrl(v.screenshot_url) || ''} alt="Screenshot" className="w-full max-h-60 object-contain rounded-lg border" />
                  ) : (
                    <div className="h-40 bg-muted rounded-lg flex items-center justify-center"><FileImage className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                </div>

                {/* QR Code */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">QR Code (Back of ID)</p>
                  {v.qr_code_url ? (
                    <img src={getUrl(v.qr_code_url) || ''} alt="QR Code" className="w-full max-h-60 object-contain rounded-lg border" />
                  ) : (
                    <div className="h-40 bg-muted rounded-lg flex items-center justify-center"><FileImage className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" className="gap-1.5 bg-foreground text-background hover:bg-foreground/90" onClick={() => handleApproveStep1(v.id, v.user_id)}>
                    <CheckCircle className="h-3.5 w-3.5" /> Approve Step 1
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRejectDialog({ open: true, verificationId: v.id, userId: v.user_id, field: 'philsys_status' })}>
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Verification Reviews */}
        <TabsContent value="reviews" className="space-y-4 mt-4">
          {pendingVerifications.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No pending verification reviews</p>
          ) : pendingVerifications.map(v => (
            <Card key={v.id} className="border">
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{v.profile?.first_name} {v.profile?.last_name}</p>
                    <p className="text-[11px] text-muted-foreground">Submitted: {new Date(v.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary">Pending Review</Badge>
                </div>

                {/* Uploaded Documents */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium hover:underline">
                    <FileImage className="h-3.5 w-3.5" /> Uploaded ID Documents <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-medium">ID Front</p>
                      {v.id_front_url ? (
                        <img src={getUrl(v.id_front_url) || ''} alt="ID Front" className="w-full h-40 object-cover rounded-lg border" />
                      ) : (
                        <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center"><FileImage className="h-6 w-6 text-muted-foreground" /></div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-medium">ID Back</p>
                      {v.id_back_url ? (
                        <img src={getUrl(v.id_back_url) || ''} alt="ID Back" className="w-full h-40 object-cover rounded-lg border" />
                      ) : (
                        <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center"><FileImage className="h-6 w-6 text-muted-foreground" /></div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* User-Entered Data */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium hover:underline">
                    <User className="h-3.5 w-3.5" /> User-Inputted Data <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 p-3 rounded-lg border bg-muted/30">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div><span className="text-muted-foreground">Last Name:</span> <span className="font-medium">{v.id_last_name || '—'}</span></div>
                      <div><span className="text-muted-foreground">First Name:</span> <span className="font-medium">{v.id_first_name || '—'}</span></div>
                      <div><span className="text-muted-foreground">Middle Name:</span> <span className="font-medium">{v.id_middle_name || '—'}</span></div>
                      <div><span className="text-muted-foreground">Date of Birth:</span> <span className="font-medium">{v.id_date_of_birth || '—'}</span></div>
                      <div><span className="text-muted-foreground">Sex:</span> <span className="font-medium">{v.id_sex || '—'}</span></div>
                      <div><span className="text-muted-foreground">Blood Type:</span> <span className="font-medium">{v.id_blood_type || '—'}</span></div>
                      <div><span className="text-muted-foreground">Marital Status:</span> <span className="font-medium">{v.id_marital_status || '—'}</span></div>
                      <div><span className="text-muted-foreground">Place of Birth:</span> <span className="font-medium">{v.id_place_of_birth || '—'}</span></div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Liveness Selfie */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium hover:underline">
                    <ScanFace className="h-3.5 w-3.5" /> Liveness Selfie <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-medium">Live Selfie</p>
                        {v.selfie_url ? (
                          <img src={getUrl(v.selfie_url) || ''} alt="Selfie" className="w-full h-40 object-cover rounded-lg border" />
                        ) : (
                          <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center"><ScanFace className="h-6 w-6 text-muted-foreground" /></div>
                        )}
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className={`rounded-md border p-2 ${v.liveness_result ? 'border-green-500/30 bg-green-50' : 'border-destructive/30 bg-destructive/5'}`}>
                          <p className="text-muted-foreground">Liveness</p>
                          <p className={`text-lg font-bold ${v.liveness_result ? 'text-green-700' : 'text-destructive'}`}>{v.liveness_result ? 'PASS' : 'FAIL'}</p>
                        </div>
                        <div className={`rounded-md border p-2 ${v.face_match_score >= 0.8 ? 'border-green-500/30 bg-green-50' : 'border-destructive/30 bg-destructive/5'}`}>
                          <p className="text-muted-foreground">Face Match</p>
                          <p className={`text-lg font-bold ${v.face_match_score >= 0.8 ? 'text-green-700' : 'text-destructive'}`}>{(v.face_match_score * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Admin Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" className="gap-1.5 bg-foreground text-background hover:bg-foreground/90" onClick={() => handleApprove(v.id, v.user_id)}>
                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRejectDialog({ open: true, verificationId: v.id, userId: v.user_id, field: 'philsys_status' })}>
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Security Events Tab */}
        <TabsContent value="security" className="space-y-3 mt-4">
          {securityEvents.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No security events recorded</p>
          ) : (
            <div className="space-y-2">
              {securityEvents.map(ev => (
                <Card key={ev.id} className="border">
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className={`p-1.5 rounded ${severityColor(ev.severity)}`}>{severityIcon(ev.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{ev.event_type.replace(/_/g, ' ').toUpperCase()}</p>
                        <Badge variant={ev.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">{ev.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span>{new Date(ev.created_at).toLocaleString()}</span>
                        {ev.user_agent && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{ev.user_agent.substring(0, 40)}...</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Login Attempts Tab */}
        <TabsContent value="logins" className="mt-4">
          {loginAttempts.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No login attempts recorded</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="p-3 text-xs font-medium text-muted-foreground">Email</th>
                    <th className="p-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="p-3 text-xs font-medium text-muted-foreground">Time</th>
                    <th className="p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {loginAttempts.map(la => (
                    <tr key={la.id} className="border-t">
                      <td className="p-3 text-xs font-mono">{la.email}</td>
                      <td className="p-3">
                        <Badge variant={la.success ? 'default' : 'destructive'} className="text-[10px]">
                          {la.success ? 'Success' : 'Failed'}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(la.created_at).toLocaleString()}</td>
                      <td className="p-3 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{la.user_agent || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-3 mt-4">
          {pendingReports.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No pending reports</p>
          ) : (
            pendingReports.map(r => (
              <Card key={r.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{r.product_title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{r.reason}</Badge>
                        <span className="text-[11px] text-muted-foreground">by {r.reporter_name}</span>
                      </div>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-2">{r.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => handleDismissReport(r.id)}>
                        Dismiss
                      </Button>
                      <Button size="sm" variant="destructive" className="text-xs gap-1" onClick={() => handleRemoveListing(r.id, r.product_id)}>
                        <Trash2 className="h-3 w-3" /> Remove Listing
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={open => !open && setRejectDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection</Label>
            <Textarea placeholder="e.g., Blurry ID, Data mismatch, Selfie doesn't match ID photo..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
