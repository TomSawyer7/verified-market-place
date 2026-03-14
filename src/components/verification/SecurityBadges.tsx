import { Card, CardContent } from '@/components/ui/card';
import { Shield, Fingerprint, ScanFace, Monitor, CalendarDays, ClipboardList, Timer } from 'lucide-react';

const features = [
  { icon: <ScanFace className="h-4 w-4" />, label: 'Liveness Detection', desc: 'Anti-spoofing facial challenges' },
  { icon: <Fingerprint className="h-4 w-4" />, label: 'Face Matching', desc: 'AI-powered ID & selfie comparison' },
  { icon: <Monitor className="h-4 w-4" />, label: 'Anti-Screenshot', desc: 'Detects photo-of-screen uploads' },
  { icon: <CalendarDays className="h-4 w-4" />, label: 'Expiry Validation', desc: 'Ensures document is current' },
  { icon: <ClipboardList className="h-4 w-4" />, label: 'Audit Trail', desc: 'Full action logging' },
  { icon: <Timer className="h-4 w-4" />, label: 'Rate Limiting', desc: 'Max 3 attempts per day' },
];

const SecurityBadges = () => (
  <Card className="border-primary/20 bg-primary/5">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-5 w-5 text-primary" />
        <span className="text-sm font-bold text-foreground">Security Features Active</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-background/80 border border-border">
            <div className="text-primary mt-0.5 shrink-0">{f.icon}</div>
            <div>
              <p className="text-[11px] font-semibold text-foreground leading-tight">{f.label}</p>
              <p className="text-[9px] text-muted-foreground leading-tight">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default SecurityBadges;
