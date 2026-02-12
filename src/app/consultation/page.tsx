"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AIConcierge } from "@/components/ai-concierge";
import { CameraCapture } from "@/components/camera-capture";
import { Phone, MessageSquare, Camera, CheckCircle2 } from "lucide-react";

/* ---------------------------------------------------------------------------
   CONSTANTS
   --------------------------------------------------------------------------- */

type ConsultMode = "chat" | "voice" | "identity";

const MODE_OPTIONS = [
  { key: "chat" as const, label: "AI Chat", icon: MessageSquare },
  { key: "voice" as const, label: "Voice Agent", icon: Phone },
  { key: "identity" as const, label: "Identity Camera", icon: Camera },
] as const;

const SESSION_CHECKLIST = [
  { label: "Identity Photo", doneKey: "photoTaken" },
  { label: "Government ID", doneKey: null },
  { label: "Medical Screening", doneKey: null },
  { label: "Conflict Check", doneKey: null },
  { label: "Rx Eligibility", doneKey: null },
] as const;

const GOLD = "#7C3AED";
const SUCCESS = "#059669";

/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

export default function ConsultationPage() {
  const [mode, setMode] = useState<ConsultMode>("chat");
  const [photoTaken, setPhotoTaken] = useState(false);

  const checklistStatus = (item: (typeof SESSION_CHECKLIST)[number]) => {
    if (item.doneKey === "photoTaken") return photoTaken;
    return false;
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1100px]">
        {/* ---- Header ---- */}
        <p className="eyebrow mb-3" style={{ color: GOLD }}>
          AI Concierge
        </p>
        <h1
          className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em] mb-8"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Your Consultation
        </h1>

        {/* ---- Mode Tabs ---- */}
        <div className="flex items-center gap-2 mb-6">
          {MODE_OPTIONS.map((opt) => {
            const isActive = mode === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setMode(opt.key)}
                className="flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-medium transition-all duration-200"
                style={{
                  background: isActive ? `${GOLD}12` : "transparent",
                  color: isActive ? GOLD : undefined,
                  border: `1px solid ${isActive ? `${GOLD}30` : "var(--border)"}`,
                }}
              >
                <opt.icon size={15} aria-hidden="true" />
                {opt.label}
                {opt.key === "identity" && photoTaken && (
                  <CheckCircle2
                    size={13}
                    className="ml-1"
                    style={{ color: SUCCESS }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ---- Session Checklist (horizontal) ---- */}
        <div className="glass-card p-4 mb-8">
          <div className="flex items-center gap-6 overflow-x-auto">
            <span
              className="text-[10px] tracking-[0.2em] uppercase font-medium shrink-0"
              style={{ color: GOLD }}
            >
              Session
            </span>
            {SESSION_CHECKLIST.map((item) => {
              const isDone = checklistStatus(item);
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2 shrink-0"
                >
                  <span
                    className="w-5 h-5 flex items-center justify-center border transition-colors"
                    style={{
                      borderColor: isDone ? SUCCESS : "var(--border)",
                      background: isDone ? `${SUCCESS}10` : "transparent",
                    }}
                  >
                    {isDone && (
                      <CheckCircle2
                        size={12}
                        style={{ color: SUCCESS }}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span
                    className="text-[13px] font-light"
                    style={{
                      color: isDone
                        ? "var(--foreground)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---- Main Content Area ---- */}
        <div className="min-h-[60vh]">
          {/* Chat mode */}
          {mode === "chat" && (
            <div className="glass-card p-0 h-[65vh] flex flex-col">
              <div className="flex-1 min-h-0 p-6 lg:p-8">
                <AIConcierge
                  context="consultation"
                  placeholder="Describe your symptoms or ask a question..."
                  welcomeMessage="I'm your ScriptsXO AI health concierge. I'll guide you through your consultation — screening for medical conflicts, verifying your identity, and assessing your prescription eligibility. Let's start: what brings you in today?"
                />
              </div>
            </div>
          )}

          {/* Voice mode */}
          {mode === "voice" && (
            <div className="glass-card flex flex-col items-center justify-center py-16 lg:py-24 gap-10">
              <div
                className="w-36 h-36 flex items-center justify-center"
                style={{ border: `2px solid ${GOLD}30` }}
              >
                <Phone size={44} style={{ color: GOLD }} aria-hidden="true" />
              </div>
              <div className="text-center max-w-md">
                <h2
                  className="text-3xl font-light text-foreground mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Voice Consultation
                </h2>
                <p className="text-muted-foreground font-light leading-relaxed">
                  Speak directly with our AI health concierge. The agent will
                  ask about your symptoms, screen for conflicts, and guide you
                  through the process — hands free.
                </p>
              </div>
              <button
                className="px-10 py-4 text-white text-[11px] tracking-[0.2em] uppercase font-medium transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7C3AED, #E11D48)" }}
              >
                Start Voice Call
              </button>
              <p className="text-xs text-muted-foreground font-light">
                Powered by Vapi &middot; HIPAA compliant
              </p>
            </div>
          )}

          {/* Identity camera mode */}
          {mode === "identity" && (
            <div className="glass-card max-w-lg">
              <h2
                className="text-2xl lg:text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Identity Verification
              </h2>
              <p className="text-muted-foreground font-light mb-10 leading-relaxed">
                We need a clear photo of your face to verify your identity. This
                will be securely stored in Cloudflare R2 and matched against
                your government-issued ID.
              </p>

              <CameraCapture
                label="Your Photo"
                description="Position your face in the center of the frame. Good lighting helps."
                onCapture={() => setPhotoTaken(true)}
              />

              {photoTaken && (
                <div
                  className="mt-8 flex items-center gap-3"
                  style={{ color: SUCCESS }}
                >
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <span className="text-sm font-medium">
                    Photo captured successfully
                  </span>
                </div>
              )}

              <div className="mt-10 pt-8 border-t border-border">
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  Your photo is encrypted and stored securely. It is only used
                  for identity verification and is never shared with third
                  parties. HIPAA compliant.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ---- Physician Oversight Note ---- */}
        <div className="mt-10 pt-8 border-t border-border">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-2">
            Physician Oversight
          </p>
          <p className="text-xs text-muted-foreground font-light leading-relaxed max-w-lg">
            All AI recommendations are reviewed and signed off by a
            board-certified physician before any prescription is issued.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
