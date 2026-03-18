import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  CheckCircle, XCircle, Mail, Calendar, FileImage, Camera,
  ShieldCheck, ShieldAlert, ChevronDown, ScanFace, Monitor,
  CalendarDays, Eye
} from 'lucide-react';
import { VerificationRequest } from '@/types';

interface VerificationReviewCardProps {
  request: VerificationRequest;
  userEmail?: string;
  onApprove: (req: VerificationRequest) => void;
  onReject: (req: VerificationRequest) => void;
}

const VerificationReviewCard = ({ request, userEmail, onApprove, onReject }: VerificationReviewCardProps) => {
  const isPhilsys = request.type === 'philsys';
  const analysis = request.securityAnalysis;

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* User Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-lg">{request.userName}</h3>
                {userEmail && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                    <Mail className="h-3.5 w-3.5" />
                    {userEmail}
                  </div>
                )}
              </div>
              <Badge variant="secondary" className="capitalize">
                {request.type}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Submitted: {request.submittedAt}
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="font-medium">Status:</span>
              <Badge variant="outline" className="bg-pending/10 text-pending border-pending/30">
                Pending Review
              </Badge>
            </div>

            {/* Screenshots Preview */}
            <div className="pt-2">
              <p className="text-sm font-medium text-foreground mb-2">Uploaded Documents:</p>
              {isPhilsys ? (
                <div className="inline-flex flex-col items-center gap-1">
                  {request.philsysScreenshot && request.philsysScreenshot !== '/placeholder.svg' ? (
                    <img
                      src={request.philsysScreenshot}
                      alt="PhilSys Screenshot"
                      className="w-48 h-32 object-cover rounded-lg border border-border"
                    />
                  ) : (
                    <div className="w-48 h-32 bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground border border-border">
                      <FileImage className="h-8 w-8 mb-1" />
                      <span className="text-xs">PhilSys Screenshot</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1">
                    {request.idPhoto && request.idPhoto !== '/placeholder.svg' ? (
                      <img src={request.idPhoto} alt="ID Photo" className="w-32 h-32 object-cover rounded-lg border border-border" />
                    ) : (
                      <div className="w-32 h-32 bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground border border-border">
                        <FileImage className="h-6 w-6 mb-1" />
                        <span className="text-xs">ID Photo</span>
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">Government ID</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    {request.selfiePhoto && request.selfiePhoto !== '/placeholder.svg' ? (
                      <img src={request.selfiePhoto} alt="Selfie" className="w-32 h-32 object-cover rounded-lg border border-border" />
                    ) : (
                      <div className="w-32 h-32 bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground border border-border">
                        <Camera className="h-6 w-6 mb-1" />
                        <span className="text-xs">Selfie</span>
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">Selfie Photo</span>
                  </div>
                </div>
              )}
            </div>

            {/* Security Analysis — ADMIN ONLY */}
            {analysis && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline mt-2 w-full">
                  <ShieldCheck className="h-4 w-4" />
                  Security Analysis Report
                  <ChevronDown className="h-3.5 w-3.5 ml-auto" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3">
                  {/* PhilSys Screenshot Analysis */}
                  {isPhilsys && analysis.screenshotScore !== undefined && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <Monitor className="h-3.5 w-3.5 text-primary" />
                        Screenshot Authenticity Analysis
                      </div>
                      
                      {/* Overall Score */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Confidence Score</span>
                        <span className={`font-bold ${analysis.screenshotScore >= 60 ? 'text-verified' : 'text-destructive'}`}>
                          {analysis.screenshotScore}%
                        </span>
                      </div>
                      <Progress
                        value={analysis.screenshotScore}
                        className={`h-2 ${analysis.screenshotScore >= 60 ? '[&>div]:bg-verified' : '[&>div]:bg-destructive'}`}
                      />

                      {/* Individual Checks */}
                      {analysis.screenshotChecks && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Detailed Checks ({analysis.screenshotChecks.filter(c => c.passed).length}/{analysis.screenshotChecks.length} passed)
                          </p>
                          {analysis.screenshotChecks.map((check, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              {check.passed ? (
                                <CheckCircle className="h-3.5 w-3.5 text-verified shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                              )}
                              <div>
                                <span className="font-medium text-foreground">{check.name}</span>
                                <span className="text-muted-foreground ml-1 text-[10px]">(weight: {check.weight})</span>
                                <p className="text-muted-foreground">{check.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Biometric Analysis */}
                  {!isPhilsys && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <ScanFace className="h-3.5 w-3.5 text-primary" />
                        Biometric Security Analysis
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Face Match */}
                        <div className={`rounded-md border p-2 ${analysis.faceMatched ? 'border-verified/30 bg-verified/5' : 'border-destructive/30 bg-destructive/5'}`}>
                          <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                            <ScanFace className="h-3 w-3" />
                            Face Match
                          </div>
                          <p className={`text-lg font-bold ${analysis.faceMatched ? 'text-verified' : 'text-destructive'}`}>
                            {analysis.faceMatchScore}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {analysis.faceMatched ? 'Match confirmed' : 'No match'}
                          </p>
                        </div>

                        {/* Liveness */}
                        <div className={`rounded-md border p-2 ${analysis.livenessPassed ? 'border-verified/30 bg-verified/5' : 'border-destructive/30 bg-destructive/5'}`}>
                          <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                            <Eye className="h-3 w-3" />
                            Liveness
                          </div>
                          <p className={`text-lg font-bold ${analysis.livenessPassed ? 'text-verified' : 'text-destructive'}`}>
                            {analysis.livenessPassed ? 'PASS' : 'FAIL'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            4 randomized challenges
                          </p>
                        </div>

                        {/* Anti-Spoof */}
                        <div className={`rounded-md border p-2 ${analysis.antiSpoofPassed ? 'border-verified/30 bg-verified/5' : 'border-pending/30 bg-pending/5'}`}>
                          <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                            <ShieldAlert className="h-3 w-3" />
                            Anti-Spoof
                          </div>
                          <p className={`text-lg font-bold ${analysis.antiSpoofPassed ? 'text-verified' : 'text-pending'}`}>
                            {analysis.antiSpoofPassed ? 'PASS' : 'FLAG'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Image authenticity
                          </p>
                        </div>

                        {/* Document Expiry */}
                        <div className={`rounded-md border p-2 ${analysis.documentValid ? 'border-verified/30 bg-verified/5' : 'border-destructive/30 bg-destructive/5'}`}>
                          <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                            <CalendarDays className="h-3 w-3" />
                            Doc Expiry
                          </div>
                          <p className={`text-sm font-bold ${analysis.documentValid ? 'text-verified' : 'text-destructive'}`}>
                            {analysis.documentExpiry || 'N/A'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {analysis.documentValid ? 'Valid' : 'Expired'}
                          </p>
                        </div>
                      </div>

                      {/* Anti-spoof details */}
                      {analysis.antiSpoofReasons && analysis.antiSpoofReasons.length > 0 && !analysis.antiSpoofPassed && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Anti-Spoof Flags:</p>
                          {analysis.antiSpoofReasons.map((reason, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs text-pending">
                              <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
                              {reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Actions */}
          <div className="flex sm:flex-col gap-2 sm:justify-start sm:pt-1">
            <Button size="sm" className="gap-1.5" onClick={() => onApprove(request)}>
              <CheckCircle className="h-4 w-4" /> Approve
            </Button>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => onReject(request)}>
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VerificationReviewCard;
