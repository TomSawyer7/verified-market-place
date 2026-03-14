import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList, Shield, Upload, CheckCircle, XCircle, Camera, Clock } from 'lucide-react';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  type: 'info' | 'upload' | 'security' | 'approval' | 'rejection' | 'liveness';
  details?: string;
}

interface AuditTrailProps {
  entries: AuditEntry[];
}

const iconMap = {
  info: <Clock className="h-3 w-3 text-muted-foreground" />,
  upload: <Upload className="h-3 w-3 text-primary" />,
  security: <Shield className="h-3 w-3 text-pending" />,
  approval: <CheckCircle className="h-3 w-3 text-verified" />,
  rejection: <XCircle className="h-3 w-3 text-destructive" />,
  liveness: <Camera className="h-3 w-3 text-primary" />,
};

const AuditTrail = ({ entries }: AuditTrailProps) => {
  if (entries.length === 0) return null;

  return (
    <Card className="border-border">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <ClipboardList className="h-3.5 w-3.5 text-primary" />
          Verification Audit Trail
        </div>
        <ScrollArea className="max-h-32">
          <div className="space-y-1.5">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 text-[11px]">
                <div className="mt-0.5 shrink-0">{iconMap[entry.type]}</div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{entry.action}</span>
                  {entry.details && (
                    <span className="text-muted-foreground"> — {entry.details}</span>
                  )}
                </div>
                <span className="text-muted-foreground whitespace-nowrap shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AuditTrail;
