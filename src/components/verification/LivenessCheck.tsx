import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, CheckCircle, XCircle, Loader2, Eye, Smile } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface LivenessCheckProps {
  onComplete: (passed: boolean, capturedImage: string) => void;
  disabled?: boolean;
}

type Challenge = 'blink' | 'smile' | 'turn_left' | 'turn_right';

const CHALLENGES: { type: Challenge; label: string; icon: React.ReactNode; instruction: string }[] = [
  { type: 'blink', label: 'Blink Detection', icon: <Eye className="h-5 w-5" />, instruction: 'Please blink your eyes naturally' },
  { type: 'smile', label: 'Smile Detection', icon: <Smile className="h-5 w-5" />, instruction: 'Please smile at the camera' },
  { type: 'turn_left', label: 'Turn Head Left', icon: <Camera className="h-5 w-5" />, instruction: 'Slowly turn your head to the left' },
];

const LivenessCheck = ({ onComplete, disabled }: LivenessCheckProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [challengesPassed, setChallengesPassed] = useState<boolean[]>([false, false, false]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [failed, setFailed] = useState(false);

  // Track expression baselines
  const baselineRef = useRef<{ leftEye: number; rightEye: number; smile: number; yaw: number } | null>(null);
  const challengeStartRef = useRef<number>(0);
  const detectionCountRef = useRef(0);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    } catch (err) {
      console.error('Failed to load face-api models:', err);
      toast.error('Failed to load face detection models. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    if (!modelsLoaded) await loadModels();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setCurrentChallenge(0);
      setChallengesPassed([false, false, false]);
      setFailed(false);
      setCompleted(false);
      setCapturedImage(null);
      baselineRef.current = null;
      detectionCountRef.current = 0;
      challengeStartRef.current = Date.now();
      startDetection();
    } catch (err) {
      console.error('Camera access denied:', err);
      toast.error('Camera access is required for liveness verification.');
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const getEyeAspectRatio = (landmarks: faceapi.FaceLandmarks68, side: 'left' | 'right') => {
    const pts = landmarks.positions;
    if (side === 'left') {
      const v1 = Math.abs(pts[37].y - pts[41].y);
      const v2 = Math.abs(pts[38].y - pts[40].y);
      const h = Math.abs(pts[36].x - pts[39].x);
      return (v1 + v2) / (2 * h);
    } else {
      const v1 = Math.abs(pts[43].y - pts[47].y);
      const v2 = Math.abs(pts[44].y - pts[46].y);
      const h = Math.abs(pts[42].x - pts[45].x);
      return (v1 + v2) / (2 * h);
    }
  };

  const getYawAngle = (landmarks: faceapi.FaceLandmarks68) => {
    const pts = landmarks.positions;
    const nose = pts[30];
    const leftEye = pts[36];
    const rightEye = pts[45];
    const midX = (leftEye.x + rightEye.x) / 2;
    const eyeWidth = Math.abs(rightEye.x - leftEye.x);
    return (nose.x - midX) / eyeWidth;
  };

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const startDetection = () => {
    intervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || !cameraActive) return;

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)
        .withFaceExpressions();

      if (!detection) {
        setFaceDetected(false);
        return;
      }

      setFaceDetected(true);
      const landmarks = detection.landmarks as faceapi.FaceLandmarks68;
      const expressions = detection.expressions;
      const leftEAR = getEyeAspectRatio(landmarks, 'left');
      const rightEAR = getEyeAspectRatio(landmarks, 'right');
      const smileScore = expressions.happy || 0;
      const yaw = getYawAngle(landmarks);

      // Set baseline on first few detections
      detectionCountRef.current++;
      if (detectionCountRef.current <= 5) {
        baselineRef.current = {
          leftEye: leftEAR,
          rightEye: rightEAR,
          smile: smileScore,
          yaw: yaw,
        };
        return;
      }

      const baseline = baselineRef.current;
      if (!baseline) return;

      // Check timeout (15 seconds per challenge)
      if (Date.now() - challengeStartRef.current > 15000) {
        setFailed(true);
        stopCamera();
        toast.error('Liveness check timed out. Please try again.');
        return;
      }

      // Evaluate current challenge
      setChallengesPassed(prev => {
        const next = [...prev];
        const idx = prev.findIndex(p => !p);
        if (idx === -1) return prev;

        const challenge = CHALLENGES[idx];
        let passed = false;

        switch (challenge.type) {
          case 'blink':
            passed = leftEAR < baseline.leftEye * 0.6 && rightEAR < baseline.rightEye * 0.6;
            break;
          case 'smile':
            passed = smileScore > 0.7;
            break;
          case 'turn_left':
            passed = yaw < -0.15;
            break;
        }

        if (passed) {
          next[idx] = true;
          challengeStartRef.current = Date.now();
          detectionCountRef.current = 0;
          baselineRef.current = null;
        }
        return next;
      });
    }, 300);
  };

  // Monitor challenge completion
  useEffect(() => {
    const allPassed = challengesPassed.every(p => p);
    if (allPassed && cameraActive && !completed) {
      const img = captureFrame();
      if (img) {
        setCapturedImage(img);
        setCompleted(true);
        stopCamera();
        onComplete(true, img);
        toast.success('Liveness check passed!');
      }
    }
    const nextIdx = challengesPassed.findIndex(p => !p);
    if (nextIdx !== -1) setCurrentChallenge(nextIdx);
  }, [challengesPassed, cameraActive, completed, captureFrame, onComplete]);

  const progress = (challengesPassed.filter(Boolean).length / CHALLENGES.length) * 100;

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Camera className="h-4 w-4 text-primary" />
          Liveness Verification
        </div>

        <div className="text-xs text-muted-foreground">
          Complete facial challenges to prove you are a real person. This prevents spoofing with photos or videos.
        </div>

        {/* Challenge progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {CHALLENGES.map((c, i) => (
              <div key={i} className={`flex items-center gap-1 text-[10px] ${
                challengesPassed[i] ? 'text-verified' : currentChallenge === i && cameraActive ? 'text-primary font-semibold' : 'text-muted-foreground'
              }`}>
                {challengesPassed[i] ? <CheckCircle className="h-3 w-3" /> : c.icon}
                {c.label}
              </div>
            ))}
          </div>
        </div>

        {/* Video feed */}
        <div className="relative rounded-lg overflow-hidden bg-muted aspect-[4/3]">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />

          {!cameraActive && !completed && !failed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Camera className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Camera preview will appear here</p>
            </div>
          )}

          {completed && capturedImage && (
            <div className="absolute inset-0">
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-verified/20 flex items-center justify-center">
                <div className="bg-background/90 rounded-full p-3">
                  <CheckCircle className="h-10 w-10 text-verified" />
                </div>
              </div>
            </div>
          )}

          {failed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-destructive/10">
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-destructive font-medium">Liveness check failed</p>
            </div>
          )}

          {/* Face detection indicator */}
          {cameraActive && (
            <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-medium ${
              faceDetected ? 'bg-verified/90 text-primary-foreground' : 'bg-destructive/90 text-primary-foreground'
            }`}>
              {faceDetected ? 'Face Detected' : 'No Face'}
            </div>
          )}

          {/* Current instruction */}
          {cameraActive && !completed && (
            <div className="absolute bottom-2 left-2 right-2 bg-background/80 backdrop-blur rounded-lg px-3 py-2 text-center">
              <p className="text-sm font-medium text-foreground">
                {CHALLENGES[currentChallenge]?.instruction}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!completed && (
          <Button
            onClick={cameraActive ? stopCamera : startCamera}
            disabled={disabled || loading}
            variant={cameraActive ? 'destructive' : 'default'}
            className="w-full"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading Face Detection...</>
            ) : cameraActive ? (
              'Cancel'
            ) : failed ? (
              <><Camera className="h-4 w-4 mr-2" /> Retry Liveness Check</>
            ) : (
              <><Camera className="h-4 w-4 mr-2" /> Start Liveness Check</>
            )}
          </Button>
        )}

        {completed && (
          <div className="flex items-center gap-2 text-verified text-sm font-medium">
            <CheckCircle className="h-4 w-4" /> Liveness verified successfully
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LivenessCheck;
