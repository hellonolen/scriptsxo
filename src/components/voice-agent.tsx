"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Volume2, Loader2, X } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionCookie } from "@/lib/auth";

/* ─── Types ─── */

type AgentState = "idle" | "listening" | "thinking" | "speaking";

interface ConversationEntry {
  role: string;
  content: string;
}

/* ─── SpeechRecognition type shim ─── */

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

type SpeechRecognitionInstance = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionInstance)
    | null;
}

/* ─── Component ─── */

export function VoiceAgent() {
  const [state, setState] = useState<AgentState>("idle");
  const [isOpen, setIsOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const historyRef = useRef<ConversationEntry[]>([]);

  const chatAction = useAction(api.actions.aiChat.chat);

  /* ─── Check browser support ─── */

  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR || typeof window.speechSynthesis === "undefined") {
      setSupported(false);
    }
  }, []);

  /* ─── Stop speaking on unmount ─── */

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  /* ─── Speak response ─── */

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";

    // Pick a natural-sounding voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.name.includes("Samantha") ||
        v.name.includes("Karen") ||
        v.name.includes("Google US English") ||
        (v.lang === "en-US" && v.localService)
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setState("speaking");
    utterance.onend = () => setState("idle");
    utterance.onerror = () => setState("idle");

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  /* ─── Send to Gemini ─── */

  const sendToAI = useCallback(
    async (text: string) => {
      setState("thinking");
      setError(null);

      const session = getSessionCookie();
      const email = session?.email || "anonymous@scriptsxo.com";

      historyRef.current.push({ role: "user", content: text });

      try {
        const response = await chatAction({
          message: text,
          conversationHistory: historyRef.current.slice(0, -1),
          patientEmail: email,
          intakeId: undefined,
        });

        historyRef.current.push({
          role: "assistant",
          content: response.content,
        });

        setLastResponse(response.content);
        speak(response.content);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Something went wrong";

        if (msg.includes("API_KEY") || msg.includes("GOOGLE_GENAI")) {
          setError("Voice agent is being configured. Gemini API key needed.");
          setState("idle");
        } else {
          setError("Couldn't connect right now. Try again.");
          setState("idle");
        }
      }
    },
    [chatAction, speak]
  );

  /* ─── Start listening ─── */

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    // Stop any speech in progress
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript.trim()) {
        sendToAI(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        setError("No speech detected. Tap the mic and try again.");
      } else if (event.error === "not-allowed") {
        setError("Microphone access denied. Check your browser settings.");
      }
      setState("idle");
    };

    recognition.onend = () => {
      if (state === "listening") {
        setState("idle");
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("listening");
    setTranscript("");
    setError(null);
  }, [sendToAI, state]);

  /* ─── Stop listening ─── */

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setState("idle");
  }, []);

  /* ─── Stop speaking ─── */

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState("idle");
  }, []);

  /* ─── Toggle ─── */

  const handleMicPress = useCallback(() => {
    if (state === "listening") {
      stopListening();
    } else if (state === "speaking") {
      stopSpeaking();
    } else if (state === "idle") {
      startListening();
    }
  }, [state, startListening, stopListening, stopSpeaking]);

  /* ─── Open / Close ─── */

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    stopListening();
    stopSpeaking();
    setIsOpen(false);
    setTranscript("");
    setLastResponse("");
    setError(null);
    historyRef.current = [];
  }, [stopListening, stopSpeaking]);

  if (!supported) return null;

  /* ─── Floating button (closed state) ─── */

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #5B21B6, #7C3AED)" }}
        aria-label="Open voice assistant"
      >
        <Mic size={22} className="text-white" />
      </button>
    );
  }

  /* ─── Open panel ─── */

  const stateLabel: Record<AgentState, string> = {
    idle: "Tap the mic to talk",
    listening: "Listening...",
    thinking: "Thinking...",
    speaking: "Speaking...",
  };

  const micBgColor: Record<AgentState, string> = {
    idle: "linear-gradient(135deg, #5B21B6, #7C3AED)",
    listening: "linear-gradient(135deg, #DC2626, #EF4444)",
    thinking: "linear-gradient(135deg, #6B6B80, #9CA3AF)",
    speaking: "linear-gradient(135deg, #059669, #10B981)",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background:
                state === "idle"
                  ? "#6B6B80"
                  : state === "listening"
                    ? "#EF4444"
                    : state === "thinking"
                      ? "#7C3AED"
                      : "#059669",
              animation:
                state !== "idle" ? "pulse 1.5s ease-in-out infinite" : "none",
            }}
          />
          <span className="text-xs font-medium text-foreground tracking-wide">
            Voice Assistant
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close voice assistant"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-6 flex flex-col items-center gap-5 min-h-[240px]">
        {/* Status */}
        <p className="text-xs text-muted-foreground tracking-wide">
          {stateLabel[state]}
        </p>

        {/* Transcript / Response */}
        <div className="w-full min-h-[80px] flex items-center justify-center text-center">
          {state === "listening" && transcript && (
            <p className="text-sm text-foreground font-light leading-relaxed">
              {transcript}
            </p>
          )}

          {state === "thinking" && (
            <Loader2
              size={28}
              className="animate-spin"
              style={{ color: "#7C3AED" }}
            />
          )}

          {state === "speaking" && lastResponse && (
            <p className="text-sm text-foreground font-light leading-relaxed line-clamp-3">
              {lastResponse}
            </p>
          )}

          {state === "idle" && lastResponse && (
            <p className="text-sm text-muted-foreground font-light leading-relaxed line-clamp-3">
              {lastResponse}
            </p>
          )}

          {state === "idle" && !lastResponse && !error && (
            <p className="text-sm text-muted-foreground font-light">
              Ask about your prescriptions, appointments, or care plan.
            </p>
          )}

          {error && (
            <p className="text-xs text-destructive font-light">{error}</p>
          )}
        </div>

        {/* Mic button */}
        <button
          onClick={handleMicPress}
          disabled={state === "thinking"}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: micBgColor[state] }}
          aria-label={
            state === "listening"
              ? "Stop listening"
              : state === "speaking"
                ? "Stop speaking"
                : "Start listening"
          }
        >
          {state === "listening" ? (
            <MicOff size={24} className="text-white" />
          ) : state === "speaking" ? (
            <Volume2 size={24} className="text-white" />
          ) : (
            <Mic size={24} className="text-white" />
          )}
        </button>

        {/* State hint */}
        {state === "speaking" && (
          <p className="text-[10px] text-muted-foreground">
            Tap to stop speaking
          </p>
        )}
      </div>
    </div>
  );
}
