import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, CheckCircle, XCircle, Loader2, Monitor } from 'lucide-react';

interface AntiSpoofingCheckProps {
  imageDataUrl: string | null;
  label: string;
  onResult: (passed: boolean) => void;
}

const AntiSpoofingCheck = ({ imageDataUrl, label, onResult }: AntiSpoofingCheckProps) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; reasons: string[] } | null>(null);

  const analyzeImage = async (dataUrl: string) => {
    setChecking(true);
    setResult(null);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      const issues: string[] = [];

      // Check 1: Resolution check (too low = screenshot)
      if (img.width < 300 || img.height < 300) {
        issues.push('Image resolution is too low (possible screenshot)');
      }

      // Check 2: Color uniformity (screen photos often have banding)
      let uniformRegions = 0;
      const sampleSize = 20;
      for (let y = 0; y < canvas.height - sampleSize; y += sampleSize) {
        for (let x = 0; x < canvas.width - sampleSize; x += sampleSize) {
          let sameCount = 0;
          const baseIdx = (y * canvas.width + x) * 4;
          const baseR = pixels[baseIdx], baseG = pixels[baseIdx + 1], baseB = pixels[baseIdx + 2];
          for (let dy = 0; dy < sampleSize; dy++) {
            for (let dx = 0; dx < sampleSize; dx++) {
              const idx = ((y + dy) * canvas.width + (x + dx)) * 4;
              if (Math.abs(pixels[idx] - baseR) < 3 &&
                  Math.abs(pixels[idx + 1] - baseG) < 3 &&
                  Math.abs(pixels[idx + 2] - baseB) < 3) {
                sameCount++;
              }
            }
          }
          if (sameCount > sampleSize * sampleSize * 0.95) uniformRegions++;
        }
      }
      const totalRegions = Math.floor(canvas.width / sampleSize) * Math.floor(canvas.height / sampleSize);
      if (uniformRegions / totalRegions > 0.4) {
        issues.push('High color uniformity detected (possible digital screen capture)');
      }

      // Check 3: Blue light ratio (screens emit more blue light)
      let totalR = 0, totalG = 0, totalB = 0;
      const pixelCount = pixels.length / 4;
      for (let i = 0; i < pixels.length; i += 4) {
        totalR += pixels[i];
        totalG += pixels[i + 1];
        totalB += pixels[i + 2];
      }
      const avgR = totalR / pixelCount;
      const avgB = totalB / pixelCount;
      if (avgB > avgR * 1.3) {
        issues.push('Unusual blue light ratio detected (possible screen photo)');
      }

      // Check 4: Edge sharpness (screenshots are often too sharp)
      let edgeSum = 0;
      let edgeSamples = 0;
      for (let y = 1; y < Math.min(canvas.height - 1, 200); y += 2) {
        for (let x = 1; x < Math.min(canvas.width - 1, 200); x += 2) {
          const idx = (y * canvas.width + x) * 4;
          const left = ((y) * canvas.width + (x - 1)) * 4;
          const right = ((y) * canvas.width + (x + 1)) * 4;
          const top = ((y - 1) * canvas.width + x) * 4;
          const bottom = ((y + 1) * canvas.width + x) * 4;
          const gx = Math.abs(pixels[right] - pixels[left]);
          const gy = Math.abs(pixels[bottom] - pixels[top]);
          edgeSum += Math.sqrt(gx * gx + gy * gy);
          edgeSamples++;
        }
      }
      const avgEdge = edgeSum / edgeSamples;
      if (avgEdge > 80) {
        issues.push('Unusually sharp edges detected (possible digital capture)');
      }

      const passed = issues.length === 0;
      setResult({ passed, reasons: issues.length > 0 ? issues : ['Image authenticity checks passed'] });
      onResult(passed);
    } catch {
      setResult({ passed: false, reasons: ['Failed to analyze image'] });
      onResult(false);
    } finally {
      setChecking(false);
    }
  };

  // Auto-analyze when image changes
  if (imageDataUrl && !checking && !result) {
    analyzeImage(imageDataUrl);
  }

  if (!imageDataUrl) return null;

  return (
    <Card className={`border ${
      result?.passed ? 'border-verified/30 bg-verified/5' :
      result && !result.passed ? 'border-pending/30 bg-pending/5' :
      'border-border'
    }`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Monitor className="h-3.5 w-3.5 text-primary" />
          Anti-Spoofing: {label}
        </div>

        {checking && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Analyzing image authenticity...
          </div>
        )}

        {result && (
          <div className="space-y-1">
            {result.reasons.map((reason, i) => (
              <div key={i} className={`flex items-start gap-1.5 text-xs ${
                result.passed ? 'text-verified' : 'text-pending'
              }`}>
                {result.passed ? <CheckCircle className="h-3 w-3 mt-0.5 shrink-0" /> :
                  <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />}
                {reason}
              </div>
            ))}
            {!result.passed && (
              <p className="text-[10px] text-muted-foreground mt-1">
                ⚠ Flagged for additional admin review. Submission is still allowed.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AntiSpoofingCheck;
