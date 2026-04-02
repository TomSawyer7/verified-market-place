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
import { ShieldCheck, ShieldAlert, Users, CheckCircle, XCircle, Clock, ChevronDown, Eye, UserPlus } from 'lucide-react';
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

const AdminDashboard = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0 });
  const [adminEmail, setAdminEmail] = useState('');
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    const { data: vData } = await supabase.from('verifications').select('*');
    if (vData) {
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, status');
      const profileMap = new Map((profiles || []).map(p => [p.id, p] as const));
      const enriched = vData.map(v => ({ ...v, profile: profileMap.get(v.user_id) || null })) as VerificationRow[];
      setVerifications(enriched);
      setStats({
        total: enriched.length,
        pending: enriched.filter(v => v.philsys_status === 'pending' || v.biometric_status === 'pending').length,
        verified: enriched.filter(v => v.philsys_status === 'verified' && v.biometric_status === 'verified').length,
      });
    }
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

      // Send notification to user
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

  if (loading) return <div className="container py-8"><div className="animate-pulse h-64 bg-muted rounded" /></div>;

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Users', value: stats.total, icon: Users },
          { label: 'Pending', value: stats.pending, icon: Clock },
          { label: 'Verified', value: stats.verified, icon: ShieldCheck },
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
        <TabsList>
          <TabsTrigger value="philsys" className="gap-1 text-xs">
            <ShieldAlert className="h-3 w-3" /> PhilSys ({pendingPhilsys.length})
          </TabsTrigger>
          <TabsTrigger value="biometric" className="gap-1 text-xs">
            <ShieldCheck className="h-3 w-3" /> Biometric ({pendingBiometric.length})
          </TabsTrigger>
        </TabsList>

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
                        <p className="text-muted-foreground">Risk</p>
                        <p className={`text-lg font-bold ${v.screenshot_score >= 60 ? 'text-green-700' : 'text-red-600'}`}>
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
                        <p className={`text-lg font-bold ${v.liveness_result ? 'text-green-700' : 'text-red-600'}`}>
                          {v.liveness_result ? 'PASS' : 'FAIL'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Anti-Spoof</p>
                        <p className={`text-lg font-bold ${v.anti_spoof_passed ? 'text-green-700' : 'text-red-600'}`}>
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
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
