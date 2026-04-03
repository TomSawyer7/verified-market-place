import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ShieldCheck, ShieldAlert, Users, CheckCircle, XCircle, Clock,
  ChevronDown, Eye, UserPlus, Shield, AlertTriangle, Activity,
  Lock, Fingerprint, FileWarning, Globe
} from 'lucide-react';
import { toast } from 'sonner';

interface VerificationRow {
  id: string;
  user_id: string;
  philsys_status: string;
  biometric_status: string;
  screenshot_url: string | null;
  screenshot_score: number;
  screenshot_checks: any;
  id_front_url: string | null;
  selfie_url: string | null;
  liveness_result: boolean;
  face_match_score: number;
  anti_spoof_passed: boolean;
  anti_spoof_reasons: string[];
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

const AdminDashboard = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0, secEvents: 0, failedLogins: 0 });
  const [adminEmail, setAdminEmail] = useState('');
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    const [vRes, seRes, laRes] = await Promise.all([
      supabase.from('verifications').select('*'),
      supabase.from('security_events').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('login_attempts').select('*').order('created_at', { ascending: false }).limit(100),
    ]);

    const vData = vRes.data || [];
    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, status');
    const profileMap = new Map((profiles || []).map(p => [p.id, p] as const));
    const enriched = vData.map(v => ({ ...v, profile: profileMap.get(v.user_id) || null })) as VerificationRow[];
    setVerifications(enriched);
    setSecurityEvents((seRes.data || []) as SecurityEvent[]);
    setLoginAttempts((laRes.data || []) as LoginAttempt[]);

    const failedLogins = (laRes.data || []).filter((a: any) => !a.success).length;
    setStats({
      total: enriched.length,
      pending: enriched.filter(v => v.philsys_status === 'pending' || v.biometric_status === 'pending').length,
      verified: enriched.filter(v => v.philsys_status === 'verified' && v.biometric_status === 'verified').length,
      secEvents: (seRes.data || []).filter((e: any) => e.severity === 'warning' || e.severity === 'critical').length,
      failedLogins,
    });
    setLoading(false);
  };

  const handleAction = async (verificationId: string, userId: string, field: 'philsys_status' | 'biometric_status', action: 'verified' | 'rejected') => {
    const update: any = { [field]: action };
    const ver = verifications.find(v => v.id === verificationId);
    const otherField = field === 'philsys_status' ? 'biometric_status' : 'philsys_status';
    const otherStatus = ver?.[otherField];

    if (action === 'verified' && otherStatus === 'verified') {
      await supabase.from('profiles').update({ status: 'verified' as any }).eq('id', userId);
    }

    await supabase.from('verifications').update(update).eq('id', verificationId);

    if (user) {
      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        user_id: userId,
        action: `${field}_${action}`,
        reason: `Admin ${action} ${field.replace('_status', '')} verification`,
      });

      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'verification',
        title: action === 'verified' ? 'Verification Approved' : 'Verification Rejected',
        body: `Your ${field.replace('_status', '')} verification has been ${action}.`,
        link: '/verification',
      });
    }

    toast.success(`Verification ${action}`);
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
      if (res.ok) {
        toast.success(data.message);
        setAdminEmail('');
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch {
      toast.error('Failed to promote admin');
    }
    setPromoting(false);
  };

  const pendingPhilsys = verifications.filter(v => v.philsys_status === 'pending' && v.screenshot_url);
  const pendingBiometric = verifications.filter(v => v.biometric_status === 'pending' && v.selfie_url && v.philsys_status === 'verified');

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total Users', value: stats.total, icon: Users },
          { label: 'Pending', value: stats.pending, icon: Clock },
          { label: 'Verified', value: stats.verified, icon: ShieldCheck },
          { label: 'Security Alerts', value: stats.secEvents, icon: ShieldAlert },
          { label: 'Failed Logins', value: stats.failedLogins, icon: Lock },
        ].map((s, i) => (
          <Card key={i} className="border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border flex items-center justify-center">
                <s.icon className="h-4 w-4" />
              </div>
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

      <Tabs defaultValue="philsys">
        <TabsList className="flex-wrap">
          <TabsTrigger value="philsys" className="gap-1 text-xs">
            <ShieldAlert className="h-3 w-3" /> PhilSys ({pendingPhilsys.length})
          </TabsTrigger>
          <TabsTrigger value="biometric" className="gap-1 text-xs">
            <Fingerprint className="h-3 w-3" /> Biometric ({pendingBiometric.length})
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1 text-xs">
            <Shield className="h-3 w-3" /> Security Log
          </TabsTrigger>
          <TabsTrigger value="logins" className="gap-1 text-xs">
            <Lock className="h-3 w-3" /> Login Attempts
          </TabsTrigger>
        </TabsList>

        {/* PhilSys Tab */}
        <TabsContent value="philsys" className="space-y-3 mt-4">
          {pendingPhilsys.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No pending PhilSys reviews</p>
          ) : pendingPhilsys.map(v => (
            <Card key={v.id} className="border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{v.profile?.first_name} {v.profile?.last_name}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(v.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                </div>
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs hover:underline">
                    <Eye className="h-3 w-3" /> Security Analysis <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 p-3 bg-muted rounded-lg text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-muted-foreground">Confidence</p>
                        <p className="text-lg font-bold">{v.screenshot_score?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Risk Level</p>
                        <p className={`text-lg font-bold ${v.screenshot_score >= 60 ? 'text-green-700' : 'text-destructive'}`}>
                          {v.screenshot_score >= 60 ? 'LOW' : 'HIGH'}
                        </p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1 bg-foreground text-background hover:bg-foreground/90" onClick={() => handleAction(v.id, v.user_id, 'philsys_status', 'verified')}>
                    <CheckCircle className="h-3 w-3" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handleAction(v.id, v.user_id, 'philsys_status', 'rejected')}>
                    <XCircle className="h-3 w-3" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Biometric Tab */}
        <TabsContent value="biometric" className="space-y-3 mt-4">
          {pendingBiometric.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No pending biometric reviews</p>
          ) : pendingBiometric.map(v => (
            <Card key={v.id} className="border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{v.profile?.first_name} {v.profile?.last_name}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(v.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                </div>
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs hover:underline">
                    <Eye className="h-3 w-3" /> Security Analysis <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 p-3 bg-muted rounded-lg text-xs space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-muted-foreground">Face Match</p>
                        <p className="text-lg font-bold">{(v.face_match_score * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Liveness</p>
                        <p className={`text-lg font-bold ${v.liveness_result ? 'text-green-700' : 'text-destructive'}`}>
                          {v.liveness_result ? 'PASS' : 'FAIL'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Anti-Spoof</p>
                        <p className={`text-lg font-bold ${v.anti_spoof_passed ? 'text-green-700' : 'text-destructive'}`}>
                          {v.anti_spoof_passed ? 'PASS' : 'FLAG'}
                        </p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1 bg-foreground text-background hover:bg-foreground/90" onClick={() => handleAction(v.id, v.user_id, 'biometric_status', 'verified')}>
                    <CheckCircle className="h-3 w-3" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handleAction(v.id, v.user_id, 'biometric_status', 'rejected')}>
                    <XCircle className="h-3 w-3" /> Reject
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
                    <div className={`p-1.5 rounded ${severityColor(ev.severity)}`}>
                      {severityIcon(ev.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{ev.event_type.replace(/_/g, ' ').toUpperCase()}</p>
                        <Badge variant={ev.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {ev.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span>{new Date(ev.created_at).toLocaleString()}</span>
                        {ev.user_agent && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {ev.user_agent.substring(0, 40)}...
                          </span>
                        )}
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
                      <td className="p-3 text-[11px] text-muted-foreground truncate max-w-[200px] hidden md:table-cell">
                        {la.user_agent?.substring(0, 60)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Security Features Summary */}
      <Card className="mt-8 border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" /> Active Security Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Fingerprint, label: 'Biometric Liveness', desc: 'face-api.js real-time detection' },
              { icon: ShieldCheck, label: 'PhilSys ID Verify', desc: 'Anti-tampering screenshot analysis' },
              { icon: Lock, label: 'Brute Force Protection', desc: 'Rate limiting & account lockout' },
              { icon: FileWarning, label: 'HIBP Breach Check', desc: 'Leaked password detection' },
              { icon: Eye, label: 'Face Re-Auth', desc: 'Mandatory for transactions' },
              { icon: Shield, label: 'Row-Level Security', desc: 'PostgreSQL RLS on all tables' },
              { icon: Activity, label: 'Audit Trail', desc: 'Full event logging' },
              { icon: Globe, label: 'Session Monitoring', desc: 'Device & activity tracking' },
            ].map((f, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                <f.icon className="h-4 w-4 mb-2" />
                <p className="text-xs font-medium">{f.label}</p>
                <p className="text-[11px] text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
