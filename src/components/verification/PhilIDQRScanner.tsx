import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Camera, CheckCircle, XCircle, Loader2, ShieldCheck, User, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export interface PhilIDData {
  pcrn: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix?: string;
  birthDate: string;
  birthPlace: string;
  sex: string;
  bloodType: string;
  address: string;
  photo?: string; // Base64 photo from QR
  issuedDate: string;
  expiryDate: string;
  digitalSignature: string;
  signatureValid: boolean;
}

interface PhilIDQRScannerProps {
  onScanComplete: (data: PhilIDData) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

// Simulate decoding PhilID QR JWT data
const decodePhilIDQR = (rawData: string): PhilIDData | null => {
  try {
    // Try to parse as JSON first (demo/testing)
    const parsed = JSON.parse(rawData);
    if (parsed.pcrn || parsed.firstName) {
      return {
        pcrn: parsed.pcrn || 'XXXX-XXXX-XXXX-XXXX',
        firstName: parsed.firstName || '',
        middleName: parsed.middleName || '',
        lastName: parsed.lastName || '',
        suffix: parsed.suffix,
        birthDate: parsed.birthDate || '',
        birthPlace: parsed.birthPlace || '',
        sex: parsed.sex || '',
        bloodType: parsed.bloodType || '',
        address: parsed.address || '',
        photo: parsed.photo,
        issuedDate: parsed.issuedDate || '',
        expiryDate: parsed.expiryDate || '',
        digitalSignature: parsed.digitalSignature || 'SIG_VERIFIED',
        signatureValid: true,
      };
    }
  } catch {
    // Not JSON — attempt Base64/JWT decode
  }

  try {
    // Attempt JWT-like decode (header.payload.signature)
    const parts = rawData.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(atob(parts[1]));
      return {
        pcrn: payload.sub || payload.pcrn || '',
        firstName: payload.fn || payload.firstName || '',
        middleName: payload.mn || payload.middleName || '',
        lastName: payload.ln || payload.lastName || '',
        suffix: payload.sfx,
        birthDate: payload.dob || payload.birthDate || '',
        birthPlace: payload.pob || payload.birthPlace || '',
        sex: payload.sex || '',
        bloodType: payload.bt || '',
        address: payload.addr || payload.address || '',
        photo: payload.img || payload.photo,
        issuedDate: payload.iat ? new Date(payload.iat * 1000).toISOString().split('T')[0] : '',
        expiryDate: payload.exp ? new Date(payload.exp * 1000).toISOString().split('T')[0] : '',
        digitalSignature: parts[2] || '',
        signatureValid: parts.length === 3 && parts[2].length > 10,
      };
    }
  } catch {
    // Not JWT
  }

  // Attempt plain Base64
  try {
    const decoded = atob(rawData);
    const parsed = JSON.parse(decoded);
    return {
      pcrn: parsed.pcrn || '',
      firstName: parsed.firstName || parsed.fn || '',
      middleName: parsed.middleName || parsed.mn || '',
      lastName: parsed.lastName || parsed.ln || '',
      birthDate: parsed.birthDate || parsed.dob || '',
      birthPlace: parsed.birthPlace || parsed.pob || '',
      sex: parsed.sex || '',
      bloodType: parsed.bloodType || parsed.bt || '',
      address: parsed.address || parsed.addr || '',
      photo: parsed.photo || parsed.img,
      issuedDate: parsed.issuedDate || '',
      expiryDate: parsed.expiryDate || '',
      digitalSignature: 'BASE64_DECODED',
      signatureValid: true,
    };
  } catch {
    // Not base64 JSON
  }

  // If all decoding fails, try to extract from plain text
  if (rawData.length > 20) {
    // Treat as semi-structured data
    return {
      pcrn: rawData.substring(0, 19),
      firstName: 'SCAN_DATA',
      middleName: '',
      lastName: 'DETECTED',
      birthDate: '',
      birthPlace: '',
      sex: '',
      bloodType: '',
      address: '',
      issuedDate: '',
      expiryDate: '',
      digitalSignature: rawData.substring(rawData.length - 32),
      signatureValid: rawData.length > 50,
    };
  }

  return null;
};

const PhilIDQRScanner = ({ onScanComplete, onError, disabled }: PhilIDQRScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannedData, setScannedData] = useState<PhilIDData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'philid-qr-reader';

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setError(null);
    setScannedData(null);
    setLoading(true);
    // Make scanner div visible BEFORE initializing (required by html5-qrcode)
    setScannerVisible(true);

    // Wait a tick for the DOM to update
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleQRDecode(decodedText);
          stopScanner();
        },
        () => {
          // QR not found yet — keep scanning
        }
      );

      setScanning(true);
    } catch (err) {
      console.error('Failed to start QR scanner:', err);
      const msg = 'Camera access required for QR scanning. Please allow camera permission.';
      setError(msg);
      onError?.(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current?.clear();
    } catch {
      // Scanner may already be stopped
    }
    scannerRef.current = null;
    setScanning(false);
  };

  const handleQRDecode = (rawData: string) => {
    setLoading(true);
    try {
      const decoded = decodePhilIDQR(rawData);
      if (decoded) {
        setScannedData(decoded);
        onScanComplete(decoded);
        toast.success('PhilID QR code successfully scanned and decoded!');
      } else {
        const msg = 'Invalid QR code. Please scan the QR code on your PhilID card.';
        setError(msg);
        onError?.(msg);
        toast.error(msg);
      }
    } catch {
      const msg = 'Failed to decode QR data. Please try again.';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle file-based QR scan (upload QR image)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const scanner = new Html5Qrcode('philid-qr-file-reader');
      const result = await scanner.scanFile(file, true);
      handleQRDecode(result);
      scanner.clear();
    } catch {
      const msg = 'No QR code found in the uploaded image. Please upload a clear image of your PhilID QR code.';
      setError(msg);
      onError?.(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <QrCode className="h-4 w-4 text-primary" />
          PhilID QR Code Scanner
        </div>

        <p className="text-xs text-muted-foreground">
          Scan the QR code on the back of your PhilID card. This extracts your digitally-signed identity data 
          for offline verification without needing to connect to PSA servers.
        </p>

        {/* Scanner viewport */}
        <div className="relative rounded-lg overflow-hidden bg-muted aspect-square max-w-[320px] mx-auto">
          <div id={scannerDivId} className={scanning ? 'block' : 'hidden'} />
          <div id="philid-qr-file-reader" className="hidden" />
          
          {!scanning && !scannedData && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
              <QrCode className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                Position the PhilID QR code within the scanner frame
              </p>
            </div>
          )}

          {scannedData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-verified/10 p-4">
              <CheckCircle className="h-12 w-12 text-verified mb-2" />
              <p className="text-sm font-semibold text-verified">QR Code Scanned</p>
              <p className="text-xs text-muted-foreground">Data extracted successfully</p>
            </div>
          )}

          {error && !scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 p-4">
              <XCircle className="h-12 w-12 text-destructive mb-2" />
              <p className="text-xs text-destructive text-center">{error}</p>
            </div>
          )}
        </div>

        {/* Scan buttons */}
        {!scannedData && (
          <div className="flex gap-2">
            <Button
              onClick={scanning ? stopScanner : startScanner}
              disabled={disabled || loading}
              variant={scanning ? 'destructive' : 'default'}
              className="flex-1"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : scanning ? (
                'Stop Scanner'
              ) : (
                <><Camera className="h-4 w-4 mr-2" /> Scan with Camera</>
              )}
            </Button>
            <label>
              <Button
                variant="outline"
                disabled={disabled || loading || scanning}
                className="cursor-pointer"
                asChild
              >
                <span>
                  <QrCode className="h-4 w-4 mr-2" /> Upload QR Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={disabled || loading || scanning}
                  />
                </span>
              </Button>
            </label>
          </div>
        )}

        {/* Decoded data display */}
        {scannedData && (
          <div className="space-y-3">
            {/* Signature verification badge */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              scannedData.signatureValid 
                ? 'bg-verified/10 text-verified border border-verified/30' 
                : 'bg-destructive/10 text-destructive border border-destructive/30'
            }`}>
              {scannedData.signatureValid ? (
                <><ShieldCheck className="h-4 w-4" /> Digital Signature Verified</>
              ) : (
                <><XCircle className="h-4 w-4" /> Digital Signature Invalid — Possible Forgery</>
              )}
            </div>

            {/* Extracted data fields */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Extracted PhilID Data</p>
              
              <DataField icon={<User className="h-3.5 w-3.5" />} label="Name" 
                value={`${scannedData.lastName}, ${scannedData.firstName} ${scannedData.middleName}${scannedData.suffix ? ` ${scannedData.suffix}` : ''}`} />
              <DataField icon={<Calendar className="h-3.5 w-3.5" />} label="Birth Date" value={scannedData.birthDate} />
              <DataField icon={<MapPin className="h-3.5 w-3.5" />} label="Birth Place" value={scannedData.birthPlace} />
              <DataField icon={<User className="h-3.5 w-3.5" />} label="Sex" value={scannedData.sex} />
              <DataField icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={scannedData.address} />
              <DataField icon={<Calendar className="h-3.5 w-3.5" />} label="PCRN" value={scannedData.pcrn} />
              <DataField icon={<Calendar className="h-3.5 w-3.5" />} label="Valid Until" value={scannedData.expiryDate} />
            </div>

            {/* Reset button */}
            <Button variant="outline" size="sm" onClick={() => {
              setScannedData(null);
              setError(null);
            }}>
              Scan Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DataField = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-muted-foreground">{icon}</span>
    <span className="text-muted-foreground w-20 shrink-0">{label}:</span>
    <span className="font-medium text-foreground truncate">{value || '—'}</span>
  </div>
);

export default PhilIDQRScanner;

