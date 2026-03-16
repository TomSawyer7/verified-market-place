import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, UserCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { PhilIDData } from './PhilIDQRScanner';

interface PhilIDDataMatchProps {
  philIdData: PhilIDData;
  registeredName: string;
  onMatchResult: (matched: boolean, score: number) => void;
}

const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

const PhilIDDataMatch = ({ philIdData, registeredName, onMatchResult }: PhilIDDataMatchProps) => {
  const matchResult = useMemo(() => {
    const qrFullName = normalizeStr(`${philIdData.firstName} ${philIdData.middleName} ${philIdData.lastName}`);
    const regName = normalizeStr(registeredName);

    // Compute similarity
    let matchPoints = 0;
    let totalPoints = 0;

    // Name matching (primary check)
    totalPoints += 50;
    if (qrFullName === regName) {
      matchPoints += 50;
    } else {
      // Partial match: check if last name matches
      const qrLast = normalizeStr(philIdData.lastName);
      const qrFirst = normalizeStr(philIdData.firstName);
      const regParts = registeredName.toLowerCase().split(/\s+/);
      
      if (regParts.some(p => normalizeStr(p) === qrLast)) matchPoints += 25;
      if (regParts.some(p => normalizeStr(p) === qrFirst)) matchPoints += 20;
    }

    // Digital signature validity
    totalPoints += 25;
    if (philIdData.signatureValid) matchPoints += 25;

    // Document not expired
    totalPoints += 25;
    if (philIdData.expiryDate) {
      const expiry = new Date(philIdData.expiryDate);
      if (expiry > new Date()) matchPoints += 25;
    }

    const score = Math.round((matchPoints / totalPoints) * 100);
    const matched = score >= 60;

    // Defer callback to avoid render-during-render
    setTimeout(() => onMatchResult(matched, score), 0);

    return {
      score,
      matched,
      nameMatch: matchPoints >= 40,
      signatureValid: philIdData.signatureValid,
      notExpired: philIdData.expiryDate ? new Date(philIdData.expiryDate) > new Date() : false,
    };
  }, [philIdData, registeredName, onMatchResult]);

  return (
    <Card className={`border ${
      matchResult.matched ? 'border-verified/50 bg-verified/5' : 'border-destructive/50 bg-destructive/5'
    }`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserCheck className="h-4 w-4 text-primary" />
          Offline Identity Verification
        </div>

        {/* Match score */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Identity Match Score</span>
          <span className={`font-bold ${matchResult.matched ? 'text-verified' : 'text-destructive'}`}>
            {matchResult.score}%
          </span>
        </div>
        <Progress
          value={matchResult.score}
          className={`h-2 ${matchResult.matched ? '[&>div]:bg-verified' : '[&>div]:bg-destructive'}`}
        />

        {/* Validation checks */}
        <div className="space-y-2">
          <ValidationRow
            passed={matchResult.nameMatch}
            label="Name Match"
            detail={`QR: ${philIdData.lastName}, ${philIdData.firstName} ↔ Registered: ${registeredName}`}
          />
          <ValidationRow
            passed={matchResult.signatureValid}
            label="Digital Signature"
            detail={matchResult.signatureValid ? 'PSA digital signature verified' : 'Signature invalid or tampered'}
          />
          <ValidationRow
            passed={matchResult.notExpired}
            label="Document Validity"
            detail={matchResult.notExpired ? `Valid until ${philIdData.expiryDate}` : 'Document expired or no expiry date'}
          />
        </div>

        {/* Overall result */}
        <div className={`flex items-center gap-2 text-sm font-medium pt-1 ${
          matchResult.matched ? 'text-verified' : 'text-destructive'
        }`}>
          {matchResult.matched ? (
            <><CheckCircle className="h-4 w-4" /> PhilID data matches registered identity</>
          ) : (
            <><XCircle className="h-4 w-4" /> Identity mismatch — please verify your information</>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ValidationRow = ({ passed, label, detail }: { passed: boolean; label: string; detail: string }) => (
  <div className="flex items-start gap-2 text-xs">
    {passed ? (
      <CheckCircle className="h-3.5 w-3.5 text-verified shrink-0 mt-0.5" />
    ) : (
      <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
    )}
    <div>
      <span className="font-medium text-foreground">{label}</span>
      <p className="text-muted-foreground">{detail}</p>
    </div>
  </div>
);

export default PhilIDDataMatch;
