import { useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, ShieldAlert, ScanFace } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface FaceMatchIndicatorProps {
  idPhoto: string | null;
  selfiePhoto: string | null;
  onMatchResult: (matched: boolean, score: number) => void;
}

const FaceMatchIndicator = ({ idPhoto, selfiePhoto, onMatchResult }: FaceMatchIndicatorProps) => {
  const [loading, setLoading] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [matched, setMatched] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (idPhoto && selfiePhoto) {
      compareFaces();
    } else {
      setMatchScore(null);
      setMatched(null);
      setError(null);
    }
  }, [idPhoto, selfiePhoto]);

  const compareFaces = async () => {
    if (!idPhoto || !selfiePhoto) return;
    setLoading(true);
    setError(null);

    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      const idImg = await faceapi.fetchImage(idPhoto);
      const selfieImg = await faceapi.fetchImage(selfiePhoto);

      const idDetection = await faceapi
        .detectSingleFace(idImg, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      const selfieDetection = await faceapi
        .detectSingleFace(selfieImg, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!idDetection) {
        setError('No face detected in the ID photo. Please upload a clearer image.');
        setMatched(false);
        onMatchResult(false, 0);
        return;
      }

      if (!selfieDetection) {
        setError('No face detected in the selfie. Please upload a clearer image.');
        setMatched(false);
        onMatchResult(false, 0);
        return;
      }

      const distance = faceapi.euclideanDistance(idDetection.descriptor, selfieDetection.descriptor);
      const score = Math.max(0, Math.min(100, Math.round((1 - distance / 1.0) * 100)));
      const isMatch = distance < 0.6; // Standard threshold

      setMatchScore(score);
      setMatched(isMatch);
      onMatchResult(isMatch, score);
    } catch (err) {
      console.error('Face matching error:', err);
      setError('Face comparison failed. Please ensure both images are clear and well-lit.');
      setMatched(false);
      onMatchResult(false, 0);
    } finally {
      setLoading(false);
    }
  };

  if (!idPhoto || !selfiePhoto) return null;

  return (
    <Card className={`border ${
      matched === true ? 'border-verified/50 bg-verified/5' :
      matched === false ? 'border-destructive/50 bg-destructive/5' :
      'border-border'
    }`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ScanFace className="h-4 w-4 text-primary" />
          Face Matching Security Check
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium text-foreground">Analyzing facial features...</p>
              <p className="text-xs">Comparing ID photo with selfie for identity verification</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-sm">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Match Failed</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {matchScore !== null && !loading && !error && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Match Confidence</span>
              <span className={`font-bold ${matched ? 'text-verified' : 'text-destructive'}`}>
                {matchScore}%
              </span>
            </div>
            <Progress
              value={matchScore}
              className={`h-2 ${matched ? '[&>div]:bg-verified' : '[&>div]:bg-destructive'}`}
            />
            <div className={`flex items-center gap-2 text-sm font-medium ${
              matched ? 'text-verified' : 'text-destructive'
            }`}>
              {matched ? (
                <><CheckCircle className="h-4 w-4" /> Faces match — identity confirmed</>
              ) : (
                <><XCircle className="h-4 w-4" /> Faces do not match — please re-upload</>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FaceMatchIndicator;
