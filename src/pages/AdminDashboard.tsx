import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ShieldCheck, ShieldAlert, Users, CheckCircle, XCircle, Clock, ChevronDown, Eye } from 'lucide-react';
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
  email?: string;
}

const AdminDashboard = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0 });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    // Fetch all verifications
    const { data: vData } = await supabase.from('verifications').select('*');
    
    if (vData) {
      // Fetch profiles for each user
      const userIds = vData.map(v => v.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, status');
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get emails from auth (we'll use profile names as proxy)
      const enriched = vData.map(v => ({
        ...v,
        profile: profileMap.get(v.user_id) || null,
      })) as VerificationRow[];

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
    
    // If both approved, update profile status
    const ver = verifications.find(v => v.id === verificationId);
    const otherField = field === 'philsys_status' ? 'biometric_status' : 'philsys_status';
    const otherStatus = ver?.[otherField];
    
    if (action === 'verified' && otherStatus === 'verified') {
      await supabase.from('profiles').update({ status: 'verified' as any }).eq('id', userId);
    }

    await supabase.from('verifications').update(update).eq('id', verificationId);

    // Log admin action
    if (user) {
      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        user_id: userId,
        action: `${field}_${action}`,
        reason: `Admin ${action} ${field.replace('_status', '')} verification`,
      });
    }

    toast.success(`Verification ${action}`);
    fetchData();
  };

  const pendingPhilsys = verifications.filter(v => v.philsys_status === 'pending' && v.screenshot_url);
  const pendingBiometric = verifications.filter(v => v.biometric_status === 'pending' && v.selfie_url && v.philsys_status === 'verified');

  if (loading) {
    return <div className="container py-8"><div className="animate-pulse h-64 bg-muted rounded" /></div>;
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats.total, icon: Users },
          { label: 'Pending Reviews', value: stats.pending, icon: Clock },
          { label: 'Fully Verified', value: stats.verified, icon: ShieldCheck },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="philsys">
        <TabsList>
          <TabsTrigger value="philsys" className="gap-1">
            <ShieldAlert className="h-4 w-4" /> PhilSys ({pendingPhilsys.length})
          </TabsTrigger>
          <TabsTrigger value="biometric" className="gap-1">
            <ShieldCheck className="h-4 w-4" /> Biometric ({pendingBiometric.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="philsys" className="space-y-4 mt-4">
          {pendingPhilsys.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No pending PhilSys reviews</p>
          ) : pendingPhilsys.map(v => (
            <Card key={v.id}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{v.profile?.first_name} {v.profile?.last_name}</p>
                    <p className="text-xs text-muted-foreground">Submitted: {new Date(v.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary">Pending Review</Badge>
                </div>

                {/* Security Analysis (Admin Only) */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Eye className="h-4 w-4" /> View Security Analysis <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 p-3 bg-muted/50 rounded-lg text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="font-medium">Screenshot Confidence Score</p>
                        <p className="text-lg font-bold text-primary">{v.screenshot_score?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="font-medium">Risk Assessment</p>
                        <p className={`text-lg font-bold ${v.screenshot_score >= 60 ? 'text-accent' : 'text-destructive'}`}>
                          {v.screenshot_score >= 60 ? 'LOW RISK' : 'HIGH RISK'}
                        </p>
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      Anti-tampering engine analyzed resolution, aspect ratio, color variance, and UI pattern matching.
                      {v.screenshot_score < 60 && ' ⚠️ Score below threshold — manual inspection recommended.'}
                    </p>
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex gap-2">
                  <Button size="sm" className="gap-1" onClick={() => handleAction(v.id, v.user_id, 'philsys_status', 'verified')}>
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleAction(v.id, v.user_id, 'philsys_status', 'rejected')}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="biometric" className="space-y-4 mt-4">
          {pendingBiometric.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No pending biometric reviews</p>
          ) : pendingBiometric.map(v => (
            <Card key={v.id}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{v.profile?.first_name} {v.profile?.last_name}</p>
                    <p className="text-xs text-muted-foreground">Submitted: {new Date(v.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary">Pending Review</Badge>
                </div>

                {/* Biometric Security Analysis (Admin Only) */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Eye className="h-4 w-4" /> View Security Analysis <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 p-3 bg-muted/50 rounded-lg text-xs space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="font-medium">Face Match Score</p>
                        <p className="text-lg font-bold text-primary">{(v.face_match_score * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="font-medium">Liveness Result</p>
                        <p className={`text-lg font-bold ${v.liveness_result ? 'text-accent' : 'text-destructive'}`}>
                          {v.liveness_result ? 'PASSED' : 'FAILED'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Anti-Spoofing</p>
                        <p className={`text-lg font-bold ${v.anti_spoof_passed ? 'text-accent' : 'text-destructive'}`}>
                          {v.anti_spoof_passed ? 'PASSED' : 'FLAGGED'}
                        </p>
                      </div>
                    </div>
                    {v.anti_spoof_reasons && v.anti_spoof_reasons.length > 0 && (
                      <div>
                        <p className="font-medium text-destructive">Flags:</p>
                        <ul className="list-disc list-inside text-muted-foreground">
                          {v.anti_spoof_reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex gap-2">
                  <Button size="sm" className="gap-1" onClick={() => handleAction(v.id, v.user_id, 'biometric_status', 'verified')}>
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleAction(v.id, v.user_id, 'biometric_status', 'rejected')}>
                    <XCircle className="h-4 w-4" /> Reject
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
