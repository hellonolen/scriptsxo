"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Clock, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";
import { CAP, hasCap, parseRolesFromSession } from "@/lib/capabilities";
import { Badge } from "@/components/ui/badge";

/* ---------------------------------------------------------------------------
   Constants
   --------------------------------------------------------------------------- */

const TIPS = [
  "Have your medication list ready",
  "Find a quiet, well-lit space",
  "Your provider can send prescriptions directly to your pharmacy",
  "Video is preferred — ensure your camera is enabled",
] as const;

const QUEUE_PATIENTS = [
  {
    name: "Amara Johnson",
    initials: "AJ",
    reason: "Persistent headache — 3 days",
    wait: "4 min",
  },
  {
    name: "Marcus Rivera",
    initials: "MR",
    reason: "Prescription refill — Lisinopril",
    wait: "9 min",
  },
  {
    name: "Elena Vasquez",
    initials: "EV",
    reason: "Skin rash, spreading to arms",
    wait: "14 min",
  },
] as const;

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ---------------------------------------------------------------------------
   Patient view
   --------------------------------------------------------------------------- */

function PatientWaitingRoom() {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const tipRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const elapsed_timer = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(elapsed_timer);
  }, []);

  useEffect(() => {
    tipRef.current = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 8000);
    return () => {
      if (tipRef.current) clearInterval(tipRef.current);
    };
  }, []);

  return (
    <AppShell>
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8">

          {/* Header */}
          <div className="text-center">
            <p className="eyebrow mb-3">CONSULTATION</p>
            <h1
              className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Your provider will join shortly
            </h1>
          </div>

          {/* Status card */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-4 mb-5">
              <span
                className="relative flex h-3 w-3 shrink-0"
                aria-label="Connected"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
              <span className="text-sm font-light text-foreground">
                Connecting your session...
              </span>
            </div>

            <div className="flex items-center justify-between text-sm border-t border-border pt-4">
              <div className="flex items-center gap-2 text-muted-foreground font-light">
                <Clock size={13} aria-hidden="true" />
                <span>Wait time</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-foreground text-sm">
                  {formatElapsed(elapsed)}
                </span>
                <p className="text-[10px] text-muted-foreground tracking-wide uppercase mt-0.5">
                  Avg. 3-8 minutes
                </p>
              </div>
            </div>
          </div>

          {/* Tip carousel */}
          <div className="glass-card p-5">
            <p className="eyebrow mb-3">WHILE YOU WAIT</p>
            <p
              key={tipIndex}
              className="text-sm font-light text-foreground leading-relaxed transition-opacity duration-300"
            >
              {TIPS[tipIndex]}
            </p>
            <div className="flex gap-1.5 mt-4">
              {TIPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTipIndex(i)}
                  aria-label={`Tip ${i + 1}`}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: i === tipIndex ? "20px" : "8px",
                    background:
                      i === tipIndex
                        ? "linear-gradient(135deg, #7C3AED, #2DD4BF)"
                        : "var(--border)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              disabled
              aria-disabled="true"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-light tracking-wide text-white opacity-60 cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
            >
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              Waiting for Provider...
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full text-sm font-light text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Leave waiting room
            </button>
          </div>

          {/* Trust bar */}
          <div className="flex items-center justify-center gap-6 text-[10px] tracking-[0.25em] text-muted-foreground uppercase font-light pt-2">
            <span>End-to-End Encrypted</span>
            <span className="w-4 h-px bg-border" />
            <span>HIPAA Compliant</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ---------------------------------------------------------------------------
   Provider view
   --------------------------------------------------------------------------- */

function ProviderWaitingQueue() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1100px]">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 pb-6 border-b border-border">
          <div>
            <p className="eyebrow mb-1">PROVIDER PORTAL</p>
            <h1
              className="text-3xl lg:text-4xl text-foreground font-light tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Waiting Room Queue
            </h1>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="stats-card">
            <span className="stats-card-label">Waiting</span>
            <span className="stats-card-value">3</span>
          </div>
          <div className="stats-card">
            <span className="stats-card-label">Avg Wait</span>
            <span className="stats-card-value">6 min</span>
          </div>
          <div className="stats-card">
            <span className="stats-card-label">Next</span>
            <span className="stats-card-value text-sm font-light">Amara Johnson</span>
          </div>
        </div>

        {/* Queue table */}
        <div className="table-container">
          <table className="table-custom">
            <thead>
              <tr>
                <th className="text-xs tracking-[0.1em] uppercase font-light">Client</th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">Reason</th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">Wait Time</th>
                <th className="text-xs tracking-[0.1em] uppercase font-light text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {QUEUE_PATIENTS.map((patient) => (
                <tr key={patient.name}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-sm bg-brand-secondary-muted flex items-center justify-center text-xs font-light text-foreground tracking-wide">
                        {patient.initials}
                      </div>
                      <span className="text-sm font-light text-foreground">
                        {patient.name}
                      </span>
                    </div>
                  </td>
                  <td className="text-sm font-light text-muted-foreground">
                    {patient.reason}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-sm font-light text-muted-foreground">
                      <Clock size={13} aria-hidden="true" />
                      {patient.wait}
                    </div>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => router.push("/consultation/room")}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors"
                    >
                      Begin Consultation
                      <ArrowRight size={11} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

/* ---------------------------------------------------------------------------
   Page — role branch
   --------------------------------------------------------------------------- */

export default function WaitingRoomPage() {
  const router = useRouter();
  const [isProvider, setIsProvider] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      // Dev: show the provider queue so the telehealth UI is visible
      setIsProvider(true);
      setReady(true);
      return;
    }
    const session = getSessionCookie();
    if (!session?.email) {
      router.push("/");
      return;
    }
    const roles = parseRolesFromSession(session.role);
    setIsProvider(hasCap(roles, CAP.CONSULT_START));
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return isProvider ? <ProviderWaitingQueue /> : <PatientWaitingRoom />;
}
