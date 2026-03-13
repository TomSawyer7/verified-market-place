import { Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { VerificationStatus } from '@/types';

interface TrustScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export const TrustScoreBadge = ({ score, size = 'md' }: TrustScoreBadgeProps) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const getColor = () => {
    if (score >= 70) return 'bg-trust-high/15 text-trust-high border-trust-high/30';
    if (score >= 40) return 'bg-trust-medium/15 text-trust-medium border-trust-medium/30';
    return 'bg-trust-low/15 text-trust-low border-trust-low/30';
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${sizeClasses[size]} ${getColor()}`}>
      <Shield className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {score}
    </span>
  );
};

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md';
}

export const VerificationBadge = ({ status, size = 'md' }: VerificationBadgeProps) => {
  const config: Record<VerificationStatus, { icon: typeof Shield; label: string; className: string }> = {
    unverified: { icon: ShieldX, label: 'Unverified', className: 'bg-muted text-muted-foreground' },
    philsys_pending: { icon: ShieldAlert, label: 'PhilSys Pending', className: 'bg-pending/15 text-pending' },
    philsys_approved: { icon: Shield, label: 'PhilSys Verified', className: 'bg-verified/15 text-verified' },
    biometric_pending: { icon: ShieldAlert, label: 'Biometric Pending', className: 'bg-pending/15 text-pending' },
    fully_verified: { icon: ShieldCheck, label: 'Fully Verified', className: 'bg-verified/15 text-verified' },
  };

  const { icon: Icon, label, className } = config[status];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClass} ${className}`}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {label}
    </span>
  );
};
