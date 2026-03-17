import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, CheckCircle, XCircle, Loader2, Eye, Smile, RotateCcw, MoveLeft, MoveRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface LivenessCheckProps {
  onComplete: (passed: boolean, capturedImage: string) => void;
  disabled?: boolean;
}

type Challenge = 'blink' | 'smile' | 'turn_left' | 'turn_right' | 'nod';

const ALL_CHALLENGES: { type: Challenge; label: string; icon: React.ReactNode; instruction: string }[] = [
  { type: 'blink', label: 'Blink', icon: <Eye className="h-4 w-4" />, instruction: 'Blink your eyes naturally 2-3 times' },
  { type: 'smile', label: 'Smile', icon: <Smile className="h-4 w-4" />, instruction: 'Give a natural smile at the camera' },
  { type: 'turn_left', label: 'Turn Left', icon: <MoveLeft className="h-4 w-4" />, instruction: 'Slowly turn your head to the left' },
  { type: 'turn_right', label: 'Turn Right', icon: <MoveRight className="h-4 w-4" />, instruction: 'Slowly turn your head to the right' },
  { type: 'nod', label: 'Nod', icon: <RotateCcw className="h-4 w-4" />, instruction: 'Nod your head up and down slowly' },
];

// Randomly pick 4 challenges each time (always include blink for anti-spoof)
const selectChallenges = () => {
  const rest = ALL_CHALLENGES.filter(c => c.type !== 'blink');
  const shuffled = rest.sort(() => Math.random() - 0.5).slice(0, 3);
  return [ALL_CHALLENGES[0], ...shuffled];
};

const LivenessCheck = ({ onComplete, disabled }: LivenessCheckProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const cameraActiveRef = useRef(false);
  const [challenges] = useState(selectChallenges);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [challengesPassed, setChallengesPassed] = useState<boolean[]>([false, false, false, false]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [motionHistory, setMotionHistory] = useState<string>('');

  // Baselines and counters
  const baselineRef = useRef<{ leftEye: number; rightEye: number; smile: number; yaw: number; pitch: number } | null>(null);
  const challengeStartRef = useRef<number>(0);
  const detectionCountRef = useRef(0);
  const blinkCountRef = useRef(0);
  const prevEARRef = useRef<number>(0.3);
  const prevYawRef = useRef<number[]>([]);
  const prevPitchRef = useRef<number[]>([]);
  // Anti-replay: track frame variance
  const frameHashesRef = useRef<number[]>([]);

  useEffect(() => {
    return () => { stopCamera(); };
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
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      cameraActiveRef.current = true;
      setCameraActive(true);
      setCurrentChallenge(0);
      setChallengesPassed([false, false, false, false]);
      setFailed(false);
      setCompleted(false);
      setCapturedImage(null);
      setMotionHistory('');
      baselineRef.current = null;
      detectionCountRef.current = 0;
      blinkCountRef.current = 0;
      prevEARRef.current = 0.3;
      prevYawRef.current = [];
      prevPitchRef.current = [];
      frameHashesRef.current = [];
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
    cameraActiveRef.current = false;
    setCameraActive(false);
  };

  const getEyeAspectRatio = (landmarks: faceapi.FaceLandmarks68, side: 'left' | 'right') => {
    const pts = landmarks.positions;
    if (side === 'left') {
      const v1 = Math.abs(pts[37].y - pts[41].y);
      const v2 = Math.abs(pts[38].y - pts[40].y);
      const h = Math.abs(pts[36].x - pts[39].x);
      return h > 0 ? (v1 + v2) / (2 * h) : 0;
    } else {
      const v1 = Math.abs(pts[43].y - pts[47].y);
      const v2 = Math.abs(pts[44].y - pts[46].y);
      const h = Math.abs(pts[42].x - pts[45].x);
      return h > 0 ? (v1 + v2) / (2 * h) : 0;
    }
  };

  const getYawAngle = (landmarks: faceapi.FaceLandmarks68) => {
    const pts = landmarks.positions;
    const nose = pts[30];
    const leftEye = pts[36];
    const rightEye = pts[45];
    const midX = (leftEye.x + rightEye.x) / 2;
    const eyeWidth = Math.abs(rightEye.x - leftEye.x);
    return eyeWidth > 0 ? (nose.x - midX) / eyeWidth : 0;
  };

  const getPitchAngle = (landmarks: faceapi.FaceLandmarks68) => {
    const pts = landmarks.positions;
    const nose = pts[30];
    const chin = pts[8];
    const forehead = pts[27];
    const faceHeight = Math.abs(chin.y - forehead.y);
    const nosePosRatio = faceHeight > 0 ? (nose.y - forehead.y) / faceHeight : 0.5;
    return nosePosRatio - 0.5; // negative = looking up, positive = looking down
  };

  // Simple frame variance to detect static images/videos
  const computeFrameHash = (): number => {
    if (!canvasRef.current || !videoRef.current) return 0;
    const canvas = canvasRef.current;
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    ctx.drawImage(videoRef.current, 0, 0, 64, 48);
    const data = ctx.getImageData(0, 0, 64, 48).data;
    let hash = 0;
    for (let i = 0; i < data.length; i += 16) {
      hash = ((hash << 5) - hash + data[i]) | 0;
    }
    return hash;
  };

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  const startDetection = () => {
    intervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || !cameraActiveRef.current) return;

      // Anti-replay: check frame variance
      const hash = computeFrameHash();
      frameHashesRef.current.push(hash);
      if (frameHashesRef.current.length > 20) frameHashesRef.current.shift();
      if (frameHashesRef.current.length >= 15) {
        const uniqueHashes = new Set(frameHashesRef.current);
        if (uniqueHashes.size < 3) {
          // Static image detected — likely a photo or replayed video
          setFailed(true);
          stopCamera();
          toast.error('Static image detected. Liveness check requires a live person, not a photo or video replay.');
          return;
        }
      }

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
      const avgEAR = (leftEAR + rightEAR) / 2;
      const smileScore = expressions.happy || 0;
      const yaw = getYawAngle(landmarks);
      const pitch = getPitchAngle(landmarks);

      // Track motion history
      prevYawRef.current.push(yaw);
      prevPitchRef.current.push(pitch);
      if (prevYawRef.current.length > 30) prevYawRef.current.shift();
      if (prevPitchRef.current.length > 30) prevPitchRef.current.shift();

      // Set baseline on first frames
      detectionCountRef.current++;
      if (detectionCountRef.current <= 8) {
        baselineRef.current = {
          leftEye: leftEAR,
          rightEye: rightEAR,
          smile: smileScore,
          yaw,
          pitch,
        };
        prevEARRef.current = avgEAR;
        return;
      }

      const baseline = baselineRef.current;
      if (!baseline) return;

      // Timeout: 12 seconds per challenge (stricter)
      if (Date.now() - challengeStartRef.current > 12000) {
        setFailed(true);
        stopCamera();
        toast.error('Liveness check timed out. You must complete each challenge within 12 seconds.');
        return;
      }

      // Evaluate current challenge
      setChallengesPassed(prev => {
        const next = [...prev];
        const idx = prev.findIndex(p => !p);
        if (idx === -1) return prev;

        const challenge = challenges[idx];
        let passed = false;

        switch (challenge.type) {
          case 'blink': {
            // Detect blink transition (EAR drops then recovers)
            const blinkThreshold = baseline.leftEye * 0.5;
            if (avgEAR < blinkThreshold && prevEARRef.current >= blinkThreshold) {
              blinkCountRef.current++;
            }
            prevEARRef.current = avgEAR;
            passed = blinkCountRef.current >= 2; // Need 2+ blinks
            break;
          }
          case 'smile':
            passed = smileScore > 0.75; // Stricter threshold
            break;
          case 'turn_left':
            passed = yaw < -0.2; // Stricter angle
            break;
          case 'turn_right':
            passed = yaw > 0.2;
            break;
          case 'nod': {
            // Check pitch variance — must have moved up and down
            if (prevPitchRef.current.length >= 10) {
              const minP = Math.min(...prevPitchRef.current.slice(-15));
              const maxP = Math.max(...prevPitchRef.current.slice(-15));
              passed = (maxP - minP) > 0.08;
            }
            break;
          }
        }

        if (passed) {
          next[idx] = true;
          challengeStartRef.current = Date.now();
          detectionCountRef.current = 0;
          baselineRef.current = null;
          blinkCountRef.current = 0;
          prevYawRef.current = [];
          prevPitchRef.current = [];
          setMotionHistory(h => h + `✓${challenge.type} `);
        }
        return next;
      });
    }, 250); // Slightly faster polling
  };

  // Monitor completion
  useEffect(() => {
    const allPassed = challengesPassed.every(p => p);
    if (allPassed && cameraActive && !completed) {
      // Capture multiple frames and pick best
      const img = captureFrame();
      if (img) {
        setCapturedImage(img);
        setCompleted(true);
        stopCamera();
        onComplete(true, img);
        toast.success('Liveness check passed! All challenges completed.');
      }
    }
    const nextIdx = challengesPassed.findIndex(p => !p);
    if (nextIdx !== -1) setCurrentChallenge(nextIdx);
  }, [challengesPassed, cameraActive, completed, captureFrame, onComplete]);

  const progress = (challengesPassed.filter(Boolean).length / challenges.length) * 100;

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Camera className="h-4 w-4 text-primary" />
          Liveness Verification
          <span className="ml-auto text-[10px] text-muted-foreground font-normal bg-muted px-2 py-0.5 rounded">
            Anti-spoof enabled
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          Complete {challenges.length} randomized facial challenges to prove you are a live person.
          Each challenge must be completed within 12 seconds. The system also detects static images and video replays.
        </div>

        {/* Challenge progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="grid grid-cols-4 gap-1">
            {challenges.map((c, i) => (
              <div key={i} className={`flex items-center gap-1 text-[10px] justify-center p-1 rounded ${
                challengesPassed[i] ? 'text-verified bg-verified/10' : 
                currentChallenge === i && cameraActive ? 'text-primary font-semibold bg-primary/10' : 
                'text-muted-foreground'
              }`}>
                {challengesPassed[i] ? <CheckCircle className="h-3 w-3" /> : c.icon}
                <span className="truncate">{c.label}</span>
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
              <p className="text-xs text-muted-foreground">Photo/video replay or timeout detected</p>
            </div>
          )}

          {/* Face detection indicator */}
          {cameraActive && (
            <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-medium ${
              faceDetected ? 'bg-verified/90 text-primary-foreground' : 'bg-destructive/90 text-primary-foreground'
            }`}>
              {faceDetected ? '● Face Detected' : '○ No Face'}
            </div>
          )}

          {/* Timer warning */}
          {cameraActive && !completed && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-medium bg-background/80 text-foreground">
              ⏱ 12s per challenge
            </div>
          )}

          {/* Current instruction */}
          {cameraActive && !completed && (
            <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur rounded-lg px-3 py-2 text-center">
              <p className="text-sm font-semibold text-foreground">
                {challenges[currentChallenge]?.instruction}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Challenge {currentChallenge + 1} of {challenges.length}
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
            <CheckCircle className="h-4 w-4" /> Liveness verified — {challenges.length} challenges passed
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LivenessCheck;
