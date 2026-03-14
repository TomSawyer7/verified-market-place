import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, CalendarDays } from 'lucide-react';

interface DocumentExpiryCheckProps {
  onValidityChange: (isValid: boolean, expiryDate: string) => void;
}

const DocumentExpiryCheck = ({ onValidityChange }: DocumentExpiryCheckProps) => {
  const [expiryDate, setExpiryDate] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const handleDateChange = (value: string) => {
    setExpiryDate(value);
    if (!value) {
      setIsValid(null);
      onValidityChange(false, '');
      return;
    }
    const expiry = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const valid = expiry >= today;
    setIsValid(valid);
    onValidityChange(valid, value);
  };

  return (
    <Card className="border-border">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
          Document Expiry Verification
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expiry-date" className="text-xs text-muted-foreground">
            Enter the expiry date shown on your government ID
          </Label>
          <Input
            id="expiry-date"
            type="date"
            value={expiryDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="h-8 text-sm"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        {isValid !== null && (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${
            isValid ? 'text-verified' : 'text-destructive'
          }`}>
            {isValid ? (
              <><CheckCircle className="h-3 w-3" /> Document is not expired</>
            ) : (
              <><XCircle className="h-3 w-3" /> Document is expired — please use a valid ID</>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentExpiryCheck;
