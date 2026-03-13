import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrustScoreBadge } from '@/components/TrustBadge';
import { ShieldCheck, ShieldAlert, FileWarning, Users, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { user, isAdmin, updateTrustScore, updateVerificationStatus, allUsers } = useAuth();
  const { verificationRequests, reports, updateVerificationRequest, updateReportStatus, transactions } = useMarketplace();
  const navigate = useNavigate();

  if (!user || !isAdmin) { navigate('/'); return null; }

  const pendingPhilsys = verificationRequests.filter(v => v.type === 'philsys' && v.status === 'pending');
  const pendingBiometric = verificationRequests.filter(v => v.type === 'biometric' && v.status === 'pending');
  const pendingReports = reports.filter(r => r.status === 'pending');

  const handleApprovePhilsys = (req: typeof verificationRequests[0]) => {
    updateVerificationRequest(req.id, 'approved');
    updateVerificationStatus(req.userId, 'philsys_approved');
    updateTrustScore(req.userId, 15);
    toast.success(`PhilSys verification approved for ${req.userName}. +15 trust score.`);
  };

  const handleApproveBiometric = (req: typeof verificationRequests[0]) => {
    updateVerificationRequest(req.id, 'approved');
    updateVerificationStatus(req.userId, 'fully_verified');
    updateTrustScore(req.userId, 25);
    toast.success(`Biometric verification approved for ${req.userName}. Now fully verified! +25 trust score.`);
  };

  const handleRejectVerification = (req: typeof verificationRequests[0]) => {
    updateVerificationRequest(req.id, 'rejected');
    toast.info(`Verification rejected for ${req.userName}.`);
  };

  const handleAcceptReport = (report: typeof reports[0]) => {
    updateReportStatus(report.id, 'accepted');
    updateTrustScore(report.reportedUserId, -15);
    toast.success(`Report accepted. ${report.reportedUserName} trust score reduced by 15.`);
  };

  const handleDismissReport = (report: typeof reports[0]) => {
    updateReportStatus(report.id, 'dismissed');
    toast.info('Report dismissed.');
  };

  return (
    <div className="container py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage verifications, reports, and users</p>
      </div>

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
                <Card key={req.id} className="animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{req.userName}</h3>
                        <p className="text-sm text-muted-foreground">Submitted: {req.submittedAt}</p>
                        <div className="mt-2 w-32 h-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          PhilSys Screenshot
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprovePhilsys(req)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleRejectVerification(req)}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                <Card key={req.id} className="animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{req.userName}</h3>
                        <p className="text-sm text-muted-foreground">Submitted: {req.submittedAt}</p>
                        <div className="flex gap-2 mt-2">
                          <div className="w-20 h-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">ID Photo</div>
                          <div className="w-20 h-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">Selfie</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApproveBiometric(req)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleRejectVerification(req)}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
