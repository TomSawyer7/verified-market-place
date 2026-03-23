import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShieldCheck, MessageCircle, ShoppingCart, Camera, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';
import * as faceapi from 'face-api.js';

const ProductDetail = () => {
  const { id } = useParams();
  const { user, isVerified } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [faceAuthOpen, setFaceAuthOpen] = useState(false);
  const [faceAuthAction, setFaceAuthAction] = useState<'buy' | 'chat'>('buy');
  const [verifying, setVerifying] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      const { data } = await supabase
        .from('products')
        .select('*, profiles(first_name, last_name, status, avatar_url)')
        .eq('id', id)
        .single();
      if (data) {
        setProduct(data);
        setSeller(data.profiles);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 360 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast.error('Camera access denied');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const handleProtectedAction = (action: 'buy' | 'chat') => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isVerified) {
      toast.error('You must be fully verified to perform this action');
      navigate('/verification');
      return;
    }
    setFaceAuthAction(action);
    setFaceAuthOpen(true);
  };

  const handleFaceVerify = async () => {
    if (!videoRef.current) return;
    setVerifying(true);
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }));
      if (detection && detection.score > 0.7) {
        stopCamera();
        setFaceAuthOpen(false);
        toast.success(faceAuthAction === 'buy' ? 'Identity confirmed! Processing purchase...' : 'Identity confirmed! Opening chat...');
        // Log the re-auth event
        if (user) {
          await supabase.from('audit_trail').insert({
            user_id: user.id,
            action: `face_reauth_${faceAuthAction}`,
            event_type: 'security',
            details: `Face re-auth for ${faceAuthAction} on product ${id}, confidence: ${(detection.score * 100).toFixed(1)}%`,
          });
        }
      } else {
        toast.error('Face not detected clearly. Please try again.');
      }
    } catch (err) {
      toast.error('Face verification failed. Try again.');
    }
    setVerifying(false);
  };

  useEffect(() => {
    if (faceAuthOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [faceAuthOpen, startCamera, stopCamera]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="aspect-video bg-muted rounded-lg max-w-2xl" />
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Product not found</h2>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="aspect-square bg-muted rounded-xl overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} className="object-cover w-full h-full" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="h-24 w-24 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <Badge variant="secondary" className="mb-2">{product.category || 'General'}</Badge>
            <h1 className="text-3xl font-bold">{product.title}</h1>
            <p className="text-3xl font-bold text-primary mt-2">₱{product.price.toLocaleString()}</p>
          </div>

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          {/* Seller Info */}
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {seller?.first_name?.[0]}{seller?.last_name?.[0]}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{seller?.first_name} {seller?.last_name}</p>
                {seller?.status === 'verified' && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <ShieldCheck className="h-3 w-3" /> Verified Seller
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button size="lg" className="flex-1 gap-2" onClick={() => handleProtectedAction('buy')}>
              <ShoppingCart className="h-4 w-4" /> Buy Now
            </Button>
            <Button size="lg" variant="outline" className="flex-1 gap-2" onClick={() => handleProtectedAction('chat')}>
              <MessageCircle className="h-4 w-4" /> Chat Seller
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Face ID re-authentication is required before completing any transaction for your security.</span>
          </div>
        </div>
      </div>

      {/* Face Re-Auth Dialog */}
      <Dialog open={faceAuthOpen} onOpenChange={setFaceAuthOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Face ID Re-authentication
            </DialogTitle>
            <DialogDescription>
              Look directly at the camera to confirm your identity before proceeding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="h-12 w-12 text-muted-foreground animate-pulse" />
                </div>
              )}
            </div>
            <Button onClick={handleFaceVerify} disabled={verifying || !cameraActive} className="w-full">
              {verifying ? 'Verifying...' : 'Verify My Identity'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetail;
