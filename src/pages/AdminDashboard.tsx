import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrustScoreBadge } from '@/components/TrustBadge';
import { ShieldCheck, ShieldAlert, FileWarning, Users, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import VerificationReviewCard from '@/components/admin/VerificationReviewCard';

const AdminDashboard = () => {
  const { user, isAdmin, updateTrustScore, updateVerificationStatus, allUsers } = useAuth();
  const { verificationRequests, reports, updateVerificationRequest, updateReportStatus } = useMarketplace();
  const navigate = useNavigate();

  if (!user || !isAdmin) { navigate('/'); return null; }

  const pendingPhilsys = verificationRequests.filter(v => v.type === 'philsys' && v.status === 'pending');
  const pendingBiometric = verificationRequests.filter(v => v.type === 'biometric' && v.status === 'pending');
  const pendingReports = reports.filter(r => r.status === 'pending');

  const getUserEmail = (userId: string) => allUsers.find(u => u.id === userId)?.email || '';

  const handleApprovePhilsys = (req: typeof verificationRequests[0]) => {
    updateVerificationRequest(req.id, 'approved');
    updateVerificationStatus(req.userId, 'philsys_approved');
    updateTrustScore(req.userId, 15);
    toast.success(`PhilSys approved for ${req.userName}. +15 trust score.`);
  };

  const handleApproveBiometric = (req: typeof verificationRequests[0]) => {
    updateVerificationRequest(req.id, 'approved');
    updateVerificationStatus(req.userId, 'fully_verified');
    updateTrustScore(req.userId, 25);
    toast.success(`Biometric approved for ${req.userName}. Fully verified! +25 trust score.`);
  };

  const handleRejectVerification = (req: typeof verificationRequests[0]) => {
    updateVerificationRequest(req.id, 'rejected');
    // Reset user status so they can resubmit
    if (req.type === 'philsys') {
      updateVerificationStatus(req.userId, 'unverified');
    } else {
      updateVerificationStatus(req.userId, 'philsys_approved');
    }
    toast.info(`Verification rejected for ${req.userName}. User can resubmit.`);
  };

  const handleAcceptReport = (report: typeof reports[0]) => {
    updateReportStatus(report.id, 'accepted');
    updateTrustScore(report.reportedUserId, -15);
    toast.success(`Report accepted. ${report.reportedUserName} trust score -15.`);
  };

  const handleDismissReport = (report: typeof reports[0]) => {
    updateReportStatus(report.id, 'dismissed');
    toast.info('Report dismissed.');
  };

  return (
    <div className="container py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage verifications, reports, and users</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'PhilSys Pending', value: pendingPhilsys.length, icon: ShieldAlert, color: 'text-pending' },
          { label: 'Biometric Pending', value: pendingBiometric.length, icon: ShieldCheck, color: 'text-primary' },
          { label: 'Open Reports', value: pendingReports.length, icon: FileWarning, color: 'text-destructive' },
          { label: 'Total Users', value: allUsers.length, icon: Users, color: 'text-foreground' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="philsys">
        <TabsList className="mb-4">
          <TabsTrigger value="philsys">PhilSys ({pendingPhilsys.length})</TabsTrigger>
          <TabsTrigger value="biometric">Biometric ({pendingBiometric.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({pendingReports.length})</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="philsys">
          {pendingPhilsys.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No pending PhilSys verifications</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {pendingPhilsys.map(req => (
                <VerificationReviewCard
                  key={req.id}
                  request={req}
                  userEmail={getUserEmail(req.userId)}
                  onApprove={handleApprovePhilsys}
                  onReject={handleRejectVerification}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="biometric">
          {pendingBiometric.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No pending biometric verifications</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {pendingBiometric.map(req => (
                <VerificationReviewCard
                  key={req.id}
                  request={req}
                  userEmail={getUserEmail(req.userId)}
                  onApprove={handleApproveBiometric}
                  onReject={handleRejectVerification}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports">
          {pendingReports.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No pending reports</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {pendingReports.map(report => (
                <Card key={report.id} className="animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{report.reason}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                        <div className="flex gap-2 mt-2 text-sm">
                          <span className="text-muted-foreground">Reporter: {report.reporterName}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-muted-foreground">Reported: {report.reportedUserName}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAcceptReport(report)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Accept
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDismissReport(report)}>
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users">
          <div className="space-y-3">
            {allUsers.map(u => (
              <Card key={u.id} className="animate-fade-in">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {u.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{u.name}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrustScoreBadge score={u.trustScore} size="sm" />
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
