"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Loader2, Clock, ArrowRight, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/ui/stat-card";
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

  // Read active consultation status from Convex
  const session = getSessionCookie();
  const activeConsult = useQuery(
    api.consultations.getMyActiveConsultation,
    session?.email ? { patientEmail: session.email } : "skip"
  );

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

  // Auto-navigate when consultation is assigned/in_progress
  useEffect(() => {
    if (activeConsult?.status === "in_progress" || activeConsult?.status === "assigned") {
      router.push(`/consultation/room?id=${activeConsult._id}`);
    }
  }, [activeConsult, router]);

  const statusLabel =
    activeConsult?.status === "waiting"
      ? "Connecting your session..."
      : activeConsult?.status === "assigned"
        ? "Provider is joining..."
        : activeConsult?.status === "in_progress"
          ? "Joining consultation room..."
          : "Connecting your session...";

  return (
    <AppShell>
      <div className="min-h-screen pt-28 pb-24 px-6 sm:px-8 lg:px-12 bg-background">
        <div className="max-w-[1400px] mx-auto">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16">

            {/* Left Column - Context & Actions */}
            <div className="lg:col-span-4 lg:col-start-2 xl:col-span-3 xl:col-start-2">
              <div className="sticky top-28 mb-12 lg:mb-0 space-y-8">

                {/* Header */}
                <div>
                  <p className="text-xs tracking-[0.2em] text-brand-secondary uppercase font-light mb-3">
                    CONSULTATION
                  </p>
                  <h1
                    className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em] leading-tight mb-4"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Your provider will join shortly
                  </h1>
                  <p className="text-muted-foreground font-light leading-relaxed">
                    Please keep this window open. Your consultation will begin automatically once your provider connects.
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <button
                    disabled
                    aria-disabled="true"
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-light tracking-wide text-white opacity-60 cursor-not-allowed bg-brand-secondary"
                  >
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    Waiting for Provider...
                  </button>

                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full text-sm font-light text-muted-foreground hover:text-foreground transition-colors py-3 border border-transparent hover:border-border rounded-xl"
                  >
                    Leave waiting room
                  </button>
                </div>

                {/* Trust bar */}
                <div className="flex flex-col gap-2 pt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-light">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                    End-to-End Encrypted
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-light">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                    HIPAA Compliant
                  </div>
                </div>

              </div>
            </div>

            {/* Right Column - Status & Tips */}
            <div className="lg:col-span-6 xl:col-span-6">
              <div className="space-y-8">

                {/* Status card */}
                <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                  <div className="flex items-center gap-4 mb-8 pb-8 border-b border-border/50">
                    <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A78BFA] opacity-40" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#7C3AED]" />
                    </div>
                    <span className="text-lg font-light text-foreground">
                      {statusLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground font-light mb-2">
                        <Clock size={16} aria-hidden="true" />
                        <span className="text-sm">Current Wait</span>
                      </div>
                      <span className="font-mono text-3xl font-light text-foreground">
                        {formatElapsed(elapsed)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground font-light mb-2">
                        <span className="text-sm">Estimated Total</span>
                      </div>
                      <span className="text-2xl font-light text-foreground">
                        3-8 min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tip carousel */}
                <div className="bg-[#7C3AED]/[0.02] border border-[#7C3AED]/20 rounded-2xl p-8">
                  <p className="text-xs tracking-[0.2em] text-[#7C3AED] uppercase font-medium mb-6">
                    WHILE YOU WAIT
                  </p>
                  <div className="min-h-[80px] flex items-center">
                    <p
                      key={tipIndex}
                      className="text-lg font-light text-foreground leading-relaxed transition-opacity duration-300 antialiased"
                    >
                      {TIPS[tipIndex]}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-8">
                    {TIPS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setTipIndex(i)}
                        aria-label={`Tip ${i + 1}`}
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: i === tipIndex ? "32px" : "12px",
                          background: i === tipIndex ? "var(--brand-secondary)" : "var(--border)",
                        }}
                      />
                    ))}
                  </div>
                </div>

              </div>
            </div>

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
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    const session = getSessionCookie();
    if (session?.sessionToken) setSessionToken(session.sessionToken);
    if (session?.memberId) setMemberId(session.memberId);
  }, []);

  const queue = useQuery(api.consultations.getWaitingQueue, {});

  const claimConsultation = useMutation(api.consultations.claim);

  // Compute stats from real queue data
  const waitingCount = queue?.length ?? 0;
  const avgWait =
    queue && queue.length > 0
      ? Math.round(queue.reduce((sum, p) => sum + p.waitMin, 0) / queue.length)
      : null;
  const nextPatient = queue?.[0]?.patientName ?? "No patients waiting";

  async function handleClaim(consultationId: string) {
    if (!memberId) return;
    setClaimingId(consultationId);
    setErrorMsg(null);
    try {
      await claimConsultation({
        sessionToken: sessionToken as any,
        consultationId: consultationId as any,
      });
      router.push(`/consultation/room?id=${consultationId}`);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to claim consultation.");
      setClaimingId(null);
    }
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">

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

        {/* Error banner */}
        {errorMsg && (
          <div className="mb-6 px-4 py-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700 font-light">
            {errorMsg}
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Waiting" value={queue === undefined ? "—" : waitingCount} icon={Users} />
          <StatCard label="Avg Wait" value={avgWait !== null ? `${avgWait} min` : "—"} icon={Clock} />
          <StatCard label="Next" value={nextPatient} icon={ArrowRight} />
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
              {queue === undefined ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-sm text-muted-foreground font-light">
                    Loading queue...
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-sm text-muted-foreground font-light">
                    No patients waiting
                  </td>
                </tr>
              ) : (
                queue.map((patient) => (
                  <tr key={patient._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-sm bg-brand-secondary-muted flex items-center justify-center text-xs font-light text-foreground tracking-wide">
                          {patient.patientInitials}
                        </div>
                        <span className="text-sm font-light text-foreground">
                          {patient.patientName}
                        </span>
                      </div>
                    </td>
                    <td className="text-sm font-light text-muted-foreground">
                      {patient.chiefComplaint}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm font-light text-foreground">
                        <Clock size={12} className="text-muted-foreground" aria-hidden="true" />
                        {patient.waitMin} min
                      </div>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleClaim(patient._id)}
                        disabled={claimingId === patient._id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {claimingId === patient._id ? (
                          <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <ArrowRight size={11} aria-hidden="true" />
                        )}
                        Begin Consultation
                      </button>
                    </td>
                  </tr>
                ))
              )}
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
