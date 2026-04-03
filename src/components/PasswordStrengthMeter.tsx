import { checkPasswordStrength } from '@/lib/security';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

interface Props {
  password: string;
}

export const PasswordStrengthMeter = ({ password }: Props) => {
  if (!password) return null;

  const { score, label, color, feedback } = checkPasswordStrength(password);
  const percentage = Math.min((score / 8) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          {score < 4 ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
          Password Strength
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      {feedback.length > 0 && (
        <ul className="text-[11px] text-muted-foreground space-y-0.5">
          {feedback.map((f, i) => (
            <li key={i} className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-muted-foreground" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
