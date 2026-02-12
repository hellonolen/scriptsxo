"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  label?: string;
  description?: string;
}

export function CameraCapture({
  onCapture,
  label = "Take a photo",
  description,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError(
        "Camera access denied. Please allow camera permissions in your browser settings."
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setCameraActive(false);
    }
  }, [stream]);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.92);
      setPhoto(imageData);
      onCapture(imageData);
      stopCamera();
    }
  }, [onCapture, stopCamera]);

  const retake = useCallback(() => {
    setPhoto(null);
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <div>
      <p className="eyebrow mb-3">{label}</p>
      {description && (
        <p className="text-sm text-muted-foreground font-light mb-5">
          {description}
        </p>
      )}

      {/* Idle state — prompt to open camera */}
      {!cameraActive && !photo && (
        <button
          type="button"
          onClick={startCamera}
          className="w-full aspect-[4/3] border border-dashed border-border flex flex-col items-center justify-center gap-4 hover:bg-muted/20 transition-colors cursor-pointer group"
        >
          <div className="w-16 h-16 flex items-center justify-center border border-border group-hover:border-[#7C3AED]/40 transition-colors rounded-2xl">
            <Camera
              size={24}
              className="text-muted-foreground group-hover:text-[#7C3AED] transition-colors"
            />
          </div>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Click to open camera
          </span>
        </button>
      )}

      {/* Live camera feed */}
      {cameraActive && (
        <div className="relative bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-[4/3] object-cover"
          />
          {/* Overlay guide */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-[15%] border border-white/20" />
          </div>
          <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <Button onClick={takePhoto} size="lg">
              <Camera size={16} aria-hidden="true" />
              Capture Photo
            </Button>
          </div>
        </div>
      )}

      {/* Photo captured */}
      {photo && (
        <div className="relative">
          <img
            src={photo}
            alt="Captured photo"
            className="w-full aspect-[4/3] object-cover"
          />
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
            <Button onClick={retake} variant="secondary">
              <RotateCcw size={14} aria-hidden="true" />
              Retake
            </Button>
            <Button variant="default">
              <Check size={14} aria-hidden="true" />
              Looks Good
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 mt-4 text-sm text-destructive">
          <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
}
