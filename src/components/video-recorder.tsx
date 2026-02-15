"use client";

import { useState, useRef, useEffect } from "react";
import { Video, Square, Play, RotateCcw, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type RecorderState = "idle" | "recording" | "preview" | "confirmed";

interface VideoRecorderProps {
  onConfirm: (blob: Blob) => void;
  maxDuration?: number;
}

export function VideoRecorder({
  onConfirm,
  maxDuration = 300,
}: VideoRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: true,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setState("idle");
    } catch (err: any) {
      setError(
        err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera and microphone permissions."
          : "Failed to access camera. Please check your device settings."
      );
    }
  }

  function stopCamera() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }

  function startRecording() {
    if (!mediaStreamRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType: "video/webm;codecs=vp9,opus",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setRecordedBlob(blob);

        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = URL.createObjectURL(blob);
        }

        setState("preview");
        stopCamera();
      };

      mediaRecorder.start(100);
      setState("recording");
      setElapsedTime(0);

      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 1000);
    } catch (err: any) {
      setError("Failed to start recording. Please try again.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function retake() {
    setRecordedBlob(null);
    setElapsedTime(0);
    if (videoRef.current) {
      videoRef.current.src = "";
    }
    startCamera();
  }

  function confirm() {
    if (recordedBlob) {
      setState("confirmed");
      onConfirm(recordedBlob);
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const remainingTime = maxDuration - elapsedTime;
  const isNearLimit = remainingTime <= 30 && state === "recording";

  return (
    <div className="glass-card p-6 lg:p-8">
      <div className="mb-6">
        <h3
          className="text-2xl font-light text-foreground mb-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Video Consultation
        </h3>
        <p className="text-sm text-muted-foreground font-light">
          Record a brief video describing your symptoms (max {Math.floor(maxDuration / 60)} minutes)
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/5 border border-destructive/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-destructive font-medium mb-1">Error</p>
            <p className="text-xs text-destructive/80 font-light">{error}</p>
          </div>
        </div>
      )}

      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden mb-6">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={state === "idle" || state === "recording"}
          className="w-full h-full object-cover"
        />

        {state === "idle" && !mediaStreamRef.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#7C3AED]/10 to-[#2DD4BF]/10">
            <div className="text-center">
              <Video className="w-12 h-12 text-[#7C3AED] mx-auto mb-4" />
              <p className="text-sm text-muted-foreground font-light">
                Click Start to enable camera
              </p>
            </div>
          </div>
        )}

        {state === "recording" && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-destructive/90 backdrop-blur-sm px-3 py-2 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-medium text-white">REC</span>
            </div>
            <div
              className={`px-3 py-2 rounded-full backdrop-blur-sm font-medium text-xs ${
                isNearLimit
                  ? "bg-destructive/90 text-white"
                  : "bg-black/50 text-white"
              }`}
            >
              {formatTime(elapsedTime)} / {formatTime(maxDuration)}
            </div>
          </div>
        )}

        {state === "preview" && (
          <div className="absolute bottom-4 left-4 right-4 flex justify-center">
            <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-xs text-white font-medium">
                Preview - {formatTime(elapsedTime)} recorded
              </span>
            </div>
          </div>
        )}

        {state === "confirmed" && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/20 to-[#2DD4BF]/20 flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-full p-4">
              <Check className="w-8 h-8 text-[#2DD4BF]" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {state === "idle" && !mediaStreamRef.current && (
          <Button
            onClick={startCamera}
            className="bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white hover:opacity-90"
          >
            <Video className="w-4 h-4" />
            Enable Camera
          </Button>
        )}

        {state === "idle" && mediaStreamRef.current && (
          <Button
            onClick={startRecording}
            className="bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white hover:opacity-90"
          >
            <Play className="w-4 h-4" />
            Start Recording
          </Button>
        )}

        {state === "recording" && (
          <Button
            onClick={stopRecording}
            variant="destructive"
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            <Square className="w-4 h-4" />
            Stop Recording
          </Button>
        )}

        {state === "preview" && (
          <>
            <Button
              onClick={retake}
              variant="outline"
              className="border-border text-foreground hover:border-foreground/30"
            >
              <RotateCcw className="w-4 h-4" />
              Retake
            </Button>
            <Button
              onClick={confirm}
              className="bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white hover:opacity-90"
            >
              <Check className="w-4 h-4" />
              Confirm & Continue
            </Button>
          </>
        )}

        {state === "confirmed" && (
          <div className="flex items-center gap-2 text-sm text-[#2DD4BF] font-medium">
            <Check className="w-4 h-4" />
            Video confirmed
          </div>
        )}
      </div>
    </div>
  );
}
