import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Mail, Calendar, FileImage, Camera } from 'lucide-react';
import { VerificationRequest } from '@/types';

interface VerificationReviewCardProps {
  request: VerificationRequest;
  userEmail?: string;
  onApprove: (req: VerificationRequest) => void;
  onReject: (req: VerificationRequest) => void;
}

const VerificationReviewCard = ({ request, userEmail, onApprove, onReject }: VerificationReviewCardProps) => {
  const isPhilsys = request.type === 'philsys';

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
