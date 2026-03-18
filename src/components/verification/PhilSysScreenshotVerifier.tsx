import { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Upload, CheckCircle, XCircle, Loader2, ShieldCheck, AlertTriangle,
  ExternalLink, Clock, FileImage, Monitor, Info
} from 'lucide-react';
import { toast } from 'sonner';

export interface ScreenshotVerificationResult {
  passed: boolean;
  score: number;
  checks: VerificationCheck[];
  timestamp: string;
  imageDataUrl: string;
}

interface VerificationCheck {
  name: string;
  passed: boolean;
  detail: string;
  weight: number;
}

interface PhilSysScreenshotVerifierProps {
  registeredName: string;
  onVerificationComplete: (result: ScreenshotVerificationResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

// Analyze screenshot for signs of editing/tampering
const analyzeScreenshotAuthenticity = async (
  dataUrl: string,
  registeredName: string
): Promise<ScreenshotVerificationResult> => {
  const checks: VerificationCheck[] = [];

  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // === CHECK 1: Resolution ===
  const isHighRes = img.width >= 600 && img.height >= 400;
  checks.push({
    name: 'Resolution Check',
    passed: isHighRes,
    detail: isHighRes
      ? `${img.width}×${img.height}px — sufficient resolution`
      : `${img.width}×${img.height}px — too low, may be cropped or resized`,
    weight: 10,
  });

  // === CHECK 2: Aspect Ratio ===
  const ratio = img.width / img.height;
  const isValidRatio = ratio >= 0.5 && ratio <= 3.0;
  checks.push({
    name: 'Aspect Ratio',
    passed: isValidRatio,
    detail: isValidRatio
      ? `Ratio ${ratio.toFixed(2)} — normal screenshot dimensions`
      : `Ratio ${ratio.toFixed(2)} — unusual, possibly cropped/edited`,
    weight: 5,
  });

  // === CHECK 3: Color Consistency ===
  let sharpEdges = 0;
  let totalSampled = 0;
  const step = 4;
  for (let y = 0; y < canvas.height - step; y += step) {
    for (let x = 0; x < canvas.width - step; x += step) {
      const idx1 = (y * canvas.width + x) * 4;
      const idx2 = (y * canvas.width + (x + step)) * 4;
      const diff = Math.abs(pixels[idx1] - pixels[idx2]) +
                   Math.abs(pixels[idx1 + 1] - pixels[idx2 + 1]) +
                   Math.abs(pixels[idx1 + 2] - pixels[idx2 + 2]);
      if (diff > 200) sharpEdges++;
      totalSampled++;
    }
  }
  const sharpRatio = sharpEdges / totalSampled;
  const noSuspiciousEdges = sharpRatio < 0.15;
  checks.push({
    name: 'Edge Consistency',
    passed: noSuspiciousEdges,
    detail: noSuspiciousEdges
      ? 'No suspicious color boundaries detected'
      : `High contrast edges (${(sharpRatio * 100).toFixed(1)}%) — possible editing/pasting`,
    weight: 15,
  });

  // === CHECK 4: Uniform Region Analysis ===
  let uniformBlocks = 0;
  let totalBlocks = 0;
  const blockSize = 16;
  for (let y = 0; y < canvas.height - blockSize; y += blockSize) {
    for (let x = 0; x < canvas.width - blockSize; x += blockSize) {
      let variance = 0;
      const baseIdx = (y * canvas.width + x) * 4;
      const baseR = pixels[baseIdx], baseG = pixels[baseIdx + 1], baseB = pixels[baseIdx + 2];
      for (let dy = 0; dy < blockSize; dy++) {
        for (let dx = 0; dx < blockSize; dx++) {
          const idx = ((y + dy) * canvas.width + (x + dx)) * 4;
          variance += Math.abs(pixels[idx] - baseR) + Math.abs(pixels[idx + 1] - baseG) + Math.abs(pixels[idx + 2] - baseB);
        }
      }
      const avgVariance = variance / (blockSize * blockSize * 3);
      if (avgVariance < 2) uniformBlocks++;
      totalBlocks++;
    }
  }
  const uniformRatio = uniformBlocks / totalBlocks;
  const uniformOk = uniformRatio < 0.5;
  checks.push({
    name: 'Clone Detection',
    passed: uniformOk,
    detail: uniformOk
      ? `Normal color variance (${(uniformRatio * 100).toFixed(0)}% uniform)`
      : `Suspiciously uniform regions (${(uniformRatio * 100).toFixed(0)}%) — possible clone/fill editing`,
    weight: 15,
  });

  // === CHECK 5: JPEG Artifact Analysis ===
  const isJpeg = dataUrl.includes('data:image/jpeg') || dataUrl.includes('data:image/jpg');
  let compressionOk = true;
  if (isJpeg) {
    let boundaryDiffs = 0;
    let innerDiffs = 0;
    let bSamples = 0;
    let iSamples = 0;
    for (let y = 0; y < Math.min(canvas.height, 400); y++) {
      for (let x = 1; x < Math.min(canvas.width, 400); x++) {
        const idx1 = (y * canvas.width + (x - 1)) * 4;
        const idx2 = (y * canvas.width + x) * 4;
        const diff = Math.abs(pixels[idx1] - pixels[idx2]);
        if (x % 8 === 0) { boundaryDiffs += diff; bSamples++; }
        else { innerDiffs += diff; iSamples++; }
      }
    }
    const avgBoundary = boundaryDiffs / Math.max(bSamples, 1);
    const avgInner = innerDiffs / Math.max(iSamples, 1);
    compressionOk = avgBoundary < avgInner * 2.5;
  }
  checks.push({
    name: 'Compression Analysis',
    passed: compressionOk,
    detail: compressionOk
      ? 'No double-compression artifacts detected'
      : 'Double JPEG compression detected — image may have been re-saved after editing',
    weight: 10,
  });

  // === CHECK 6: File Integrity ===
  const base64Length = dataUrl.split(',')[1]?.length || 0;
  const estimatedBytes = base64Length * 0.75;
  const bytesPerPixel = estimatedBytes / (img.width * img.height);
  const sizeReasonable = bytesPerPixel > 0.3 && bytesPerPixel < 10;
  checks.push({
    name: 'File Integrity',
    passed: sizeReasonable,
    detail: sizeReasonable
      ? `File size ratio normal (${bytesPerPixel.toFixed(2)} bytes/px)`
      : `Unusual file size ratio (${bytesPerPixel.toFixed(2)} bytes/px) — possible manipulation`,
    weight: 10,
  });

  // === CHECK 7: Portal UI Detection ===
  let greenPixels = 0;
  let bluePixels = 0;
  let whitePixels = 0;
  const totalPixels = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if (g > 100 && g > r * 1.2 && g > b * 1.2) greenPixels++;
    if (b > 100 && b > r * 1.2 && b > g * 1.0) bluePixels++;
    if (r > 220 && g > 220 && b > 220) whitePixels++;
  }
  const hasUIColors = (greenPixels / totalPixels > 0.01 || bluePixels / totalPixels > 0.05) && whitePixels / totalPixels > 0.1;
  checks.push({
    name: 'Portal UI Detection',
    passed: hasUIColors,
    detail: hasUIColors
      ? 'UI color patterns consistent with government portal screenshot'
      : 'Screenshot does not resemble expected portal UI — verify source',
    weight: 15,
  });

  // === CHECK 8: Text Content Detection ===
  let textLikeRegions = 0;
  for (let y = 0; y < canvas.height - 1; y += 2) {
    for (let x = 0; x < canvas.width - 1; x += 2) {
      const idx = (y * canvas.width + x) * 4;
      const gray = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
      const idxR = (y * canvas.width + (x + 1)) * 4;
      const grayR = (pixels[idxR] + pixels[idxR + 1] + pixels[idxR + 2]) / 3;
      if (Math.abs(gray - grayR) > 50 && (gray < 80 || grayR < 80)) textLikeRegions++;
    }
  }
  const textDensity = textLikeRegions / (canvas.width * canvas.height / 4);
  const hasText = textDensity > 0.01;
  checks.push({
    name: 'Text Content Detection',
    passed: hasText,
    detail: hasText
      ? 'Text-like patterns detected in screenshot'
      : 'No text patterns found — may not be a verification portal screenshot',
    weight: 20,
  });

  // Calculate overall score
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const earnedWeight = checks.filter(c => c.passed).reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);
  const passed = score >= 60;

  return {
    passed,
    score,
    checks,
    timestamp: new Date().toISOString(),
    imageDataUrl: dataUrl,
  };
};

const PhilSysScreenshotVerifier = ({
  registeredName,
  onVerificationComplete,
  onError,
  disabled,
}: PhilSysScreenshotVerifierProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ScreenshotVerificationResult | null>(null);
  const [fileName, setFileName] = useState('');

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      runAnalysis(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [registeredName]);

  const runAnalysis = async (dataUrl: string) => {
    setAnalyzing(true);
    try {
      const res = await analyzeScreenshotAuthenticity(dataUrl, registeredName);
      setResult(res);
      onVerificationComplete(res);
      if (res.passed) {
        toast.success('Screenshot verification passed!');
      } else {
        toast.warning('Screenshot flagged — admin will review your submission.');
      }
    } catch {
      const msg = 'Failed to analyze screenshot. Please try again.';
      onError?.(msg);
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Monitor className="h-4 w-4 text-primary" />
          eVerify Portal Screenshot Verification
        </div>

        {/* Instructions */}
        <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-foreground font-medium">How to verify via eVerify.gov.ph:</p>
          </div>
          <ol className="space-y-1.5 text-xs text-muted-foreground ml-6">
            {[
              'Go to the official PhilSys eVerify portal',
              'Enter your PhilSys Card Number (PCN) and other details',
              'After successful verification, take a FULL screenshot of the result page',
              'The screenshot must show the green "Verified" status with your name and details',
              'Upload the screenshot below for review',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full h-4 w-4 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {text}
              </li>
            ))}
          </ol>

          <a
            href="https://everify.gov.ph/check"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline mt-1"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open eVerify.gov.ph Portal →
          </a>
        </div>

        {/* Upload area */}
        {!preview && (
          <div
            className="rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={disabled}
            />
            <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium text-sm text-foreground">Upload eVerify Screenshot</p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG or JPG • Full screenshot of verified result page
            </p>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
              <img
                src={preview}
                alt="eVerify screenshot"
                className="w-full max-h-[300px] object-contain"
              />
              {analyzing && (
                <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium text-foreground">Verifying screenshot...</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{fileName}</p>
          </div>
        )}

        {/* Results — simplified for users */}
        {result && (
          <div className="space-y-3">
            <div className={`rounded-lg border p-3 ${
              result.passed
                ? 'border-verified/30 bg-verified/5'
                : 'border-pending/30 bg-pending/5'
            }`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {result.passed ? (
                  <><ShieldCheck className="h-4 w-4 text-verified" /> Screenshot Accepted</>
                ) : (
                  <><AlertTriangle className="h-4 w-4 text-pending" /> Screenshot Needs Review</>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {result.passed
                  ? 'Your screenshot has been verified. You can now submit for admin approval.'
                  : 'Your screenshot has been flagged for additional review. You can still submit it — an admin will manually verify.'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              Verified at {new Date(result.timestamp).toLocaleString()}
            </div>

            <Button variant="outline" size="sm" onClick={reset}>
              Upload Different Screenshot
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PhilSysScreenshotVerifier;
