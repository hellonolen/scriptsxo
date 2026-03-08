"use client";

export const runtime = "edge";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUserEmail } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Info,
  Loader2,
  Flag,
  Pill,
  ShieldAlert,
  User,
  Video,
} from "lucide-react";

/* ---------------------------------------------------------------------------
   Types
   --------------------------------------------------------------------------- */

type Decision = "approved" | "rejected" | "needs_more_info";

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

function recommendationColor(action: string): {
  bg: string;
  border: string;
  text: string;
} {
  const lower = action.toLowerCase();
  if (lower.includes("approve"))
    return {
      bg: "bg-primary/5",
      border: "border-primary/20",
      text: "text-primary",
    };
  if (lower.includes("reject"))
    return {
      bg: "bg-destructive/5",
      border: "border-destructive/20",
      text: "text-destructive",
    };
  return {
    bg: "bg-warning/5",
    border: "border-warning/20",
    text: "text-warning",
  };
}

function recommendationIcon(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("approve"))
    return <CheckCircle2 size={18} aria-hidden="true" />;
  if (lower.includes("reject")) return <XCircle size={18} aria-hidden="true" />;
  return <Info size={18} aria-hidden="true" />;
}

function recommendationLabel(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes("approve")) return "AI Recommends: Approve";
  if (lower.includes("reject")) return "AI Recommends: Reject";
  return "AI Recommends: Request More Info";
}

function formatDob(dob: string | null): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return dob;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* ---------------------------------------------------------------------------
   Skeleton
   --------------------------------------------------------------------------- */

function LoadingSkeleton() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <div className="skeleton h-4 w-40 rounded mb-6" />
        <div className="flex gap-8">
          <div className="flex-1 space-y-4">
            <div className="skeleton h-64 w-full rounded-xl" />
            <div className="skeleton h-32 w-full rounded-xl" />
          </div>
          <div className="w-[380px] shrink-0 space-y-4">
            <div className="skeleton h-40 w-full rounded-xl" />
            <div className="skeleton h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ---------------------------------------------------------------------------
   Page
   --------------------------------------------------------------------------- */

export default function VideoReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reviewId = params.id as string;

  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [providerNotes, setProviderNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [actionInFlight, setActionInFlight] = useState<Decision | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [review, setReview] = useState<any | null | undefined>(undefined);

  const providerEmail = getCurrentUserEmail() ?? "";

  useEffect(() => {
    if (!reviewId) return;
    const API_BASE =
      process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";

    const token = document.cookie.match(/(?:^|;\s*)scriptsxo_session=([^;]+)/)?.[1];
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${decodeURIComponent(token)}`;

    fetch(`${API_BASE}/video-reviews/${reviewId}`, { headers, credentials: "include" })
      .then((r) => r.json())
      .then((json: any) => setReview(json.data ?? null))
      .catch(() => setReview(null));
  }, [reviewId]);

  async function handleDecision(decision: Decision) {
    if (!review) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setActionInFlight(decision);

    const API_BASE =
      process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";
    const token = document.cookie.match(/(?:^|;\s*)scriptsxo_session=([^;]+)/)?.[1];
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${decodeURIComponent(token)}`;

    try {
      const res = await fetch(`${API_BASE}/video-reviews/${reviewId}/decide`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          decision: decision === "needs_more_info" ? "rejected" : decision,
          notes: providerNotes || undefined,
          providerEmail,
          patientEmail: review.patientEmail ?? "",
          rejectionReason:
            decision === "rejected" ? rejectionReason || undefined : undefined,
        }),
      });

      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? "API error");

      setSuccessMsg(
        "Decision recorded — patient will be notified automatically."
      );

      startTransition(() => {
        setTimeout(() => {
          router.push("/provider/video-review");
        }, 1800);
      });
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to record decision. Please try again.");
    } finally {
      setActionInFlight(null);
    }
  }

  if (review === undefined) return <LoadingSkeleton />;

  if (review === null) {
    return (
      <AppShell>
        <div className="p-6 lg:p-10 max-w-[1200px]">
          <Link
            href="/provider/video-review"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to queue
          </Link>
          <p className="text-sm text-muted-foreground font-light">
            Review not found.
          </p>
        </div>
      </AppShell>
    );
  }

  const recColors = recommendationColor(review.recommendedAction ?? "");
  const alreadyDecided = !!review.providerDecision;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px] pb-48">
        {/* Back nav */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/provider/video-review"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to video review queue"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow mb-0.5">VIDEO REVIEW</p>
            <h1
              className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {review.patientName ?? "Patient Review"}
            </h1>
          </div>
          {alreadyDecided && (
            <div className="ml-auto">
              <Badge
                variant={
                  review.providerDecision === "approved" ? "success" : "error"
                }
              >
                {review.providerDecision === "approved" ? (
                  <CheckCircle2 size={11} aria-hidden="true" />
                ) : (
                  <XCircle size={11} aria-hidden="true" />
                )}
                {review.providerDecision?.charAt(0).toUpperCase() +
                  (review.providerDecision?.slice(1) ?? "")}
              </Badge>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* LEFT — video + transcript (60%) */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Video player */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {review.recordingUrl ? (
                <video
                  src={review.recordingUrl}
                  controls
                  playsInline
                  className="w-full max-h-[460px] bg-black"
                  aria-label="Patient consultation recording"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-56 bg-muted/30 gap-3">
                  <Video size={32} className="text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground font-light">
                    No recording available
                  </p>
                </div>
              )}
            </div>

            {/* Transcript (collapsible) */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setTranscriptOpen((v) => !v)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                aria-expanded={transcriptOpen}
              >
                <span className="text-sm font-light text-foreground tracking-wide">
                  AI Transcript
                </span>
                {transcriptOpen ? (
                  <ChevronUp size={16} className="text-muted-foreground" aria-hidden="true" />
                ) : (
                  <ChevronDown size={16} className="text-muted-foreground" aria-hidden="true" />
                )}
              </button>
              {transcriptOpen && (
                <div className="px-5 pb-5 border-t border-border">
                  <p className="text-sm font-light text-muted-foreground leading-relaxed whitespace-pre-wrap pt-4">
                    {review.transcript || "No transcript available."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — AI analysis (40%) */}
          <div className="lg:w-[380px] shrink-0 space-y-5">
            {/* Patient summary */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <User size={14} className="text-muted-foreground" aria-hidden="true" />
                <span className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-light">
                  Patient
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-base font-light text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  {review.patientName ?? "—"}
                </p>
                {review.patientDob && (
                  <p className="text-sm text-muted-foreground font-light">
                    DOB: {formatDob(review.patientDob)}
                  </p>
                )}
                {review.patientEmail && (
                  <p className="text-sm text-muted-foreground font-light">
                    {review.patientEmail}
                  </p>
                )}
              </div>
            </div>

            {/* AI Practiceal Summary */}
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-light mb-3">
                AI Practiceal Summary
              </p>
              <p className="text-sm font-light text-foreground leading-relaxed">
                {review.summary}
              </p>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-light mb-2">
                  Chief Complaint
                </p>
                <p className="text-sm font-light text-foreground">
                  {review.chiefComplaint}
                </p>
              </div>
            </div>

            {/* Requested medications */}
            {review.requestedMedications && review.requestedMedications.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Pill size={14} className="text-muted-foreground" aria-hidden="true" />
                  <p className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-light">
                    Requested Medications
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {review.requestedMedications.map((med: string) => (
                    <span
                      key={med}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-light bg-brand-secondary-muted text-foreground border border-border"
                    >
                      {med}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Red flags */}
            {review.redFlags && review.redFlags.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Flag size={14} className="text-destructive" aria-hidden="true" />
                  <p className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-light">
                    Red Flags
                  </p>
                </div>
                <ul className="space-y-2">
                  {review.redFlags.map((flag: string) => (
                    <li
                      key={flag}
                      className="flex items-start gap-2 text-sm font-light text-destructive"
                    >
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Contraindications */}
            {review.contraindications && review.contraindications.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert size={14} className="text-warning" aria-hidden="true" />
                  <p className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-light">
                    Contraindications
                  </p>
                </div>
                <ul className="space-y-2">
                  {review.contraindications.map((c: string) => (
                    <li
                      key={c}
                      className="flex items-start gap-2 text-sm font-light text-warning"
                    >
                      <ShieldAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Recommendation banner */}
            <div
              className={`rounded-xl p-5 border ${recColors.bg} ${recColors.border}`}
            >
              <div className={`flex items-center gap-2 mb-2 ${recColors.text}`}>
                {recommendationIcon(review.recommendedAction ?? "")}
                <span className="text-sm font-medium">
                  {recommendationLabel(review.recommendedAction ?? "")}
                </span>
              </div>
              <p className="text-sm font-light text-foreground leading-relaxed">
                {review.recommendationReason}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-light">
                  Urgency level:
                </span>
                <Badge
                  variant={
                    (review.urgencyLevel ?? 1) <= 2
                      ? "success"
                      : (review.urgencyLevel ?? 1) === 3
                      ? "warning"
                      : "error"
                  }
                >
                  {review.urgencyLevel ?? 1} / 5
                </Badge>
                <span className="text-xs text-muted-foreground font-light ml-auto">
                  Confidence: {Math.round((review.confidence ?? 0) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky decision panel */}
      {!alreadyDecided && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border backdrop-blur-md z-30">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-4">
            {/* Toast messages */}
            {errorMsg && (
              <div className="mb-3 px-4 py-2.5 rounded-md border border-red-200 bg-red-50 text-sm text-red-700 font-light">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-3 px-4 py-2.5 rounded-md border border-green-200 bg-green-50 text-sm text-green-700 font-light flex items-center gap-2">
                <CheckCircle2 size={14} aria-hidden="true" />
                {successMsg}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              {/* Notes textarea */}
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="provider-notes"
                  className="block text-xs tracking-[0.12em] uppercase text-muted-foreground font-light mb-1.5"
                >
                  Provider Notes (optional)
                </label>
                <textarea
                  id="provider-notes"
                  value={providerNotes}
                  onChange={(e) => setProviderNotes(e.target.value)}
                  rows={2}
                  placeholder="Add practiceal notes before deciding..."
                  className="w-full px-3 py-2 text-sm font-light bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDecision("needs_more_info")}
                  disabled={!!actionInFlight}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-warning text-warning text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-warning/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {actionInFlight === "needs_more_info" ? (
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Info size={12} aria-hidden="true" />
                  )}
                  More Info
                </button>

                <button
                  onClick={() => handleDecision("rejected")}
                  disabled={!!actionInFlight}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-destructive text-destructive text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-destructive/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {actionInFlight === "rejected" ? (
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <XCircle size={12} aria-hidden="true" />
                  )}
                  Reject
                </button>

                <button
                  onClick={() => handleDecision("approved")}
                  disabled={!!actionInFlight}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-primary text-primary-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {actionInFlight === "approved" ? (
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 size={12} aria-hidden="true" />
                  )}
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Already decided banner */}
      {alreadyDecided && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-4 flex items-center gap-3">
            {review.providerDecision === "approved" ? (
              <CheckCircle2 size={16} className="text-primary" aria-hidden="true" />
            ) : (
              <XCircle size={16} className="text-destructive" aria-hidden="true" />
            )}
            <p className="text-sm font-light text-muted-foreground">
              Decision recorded:{" "}
              <span className="text-foreground">
                {review.providerDecision === "approved" ? "Approved" : "Rejected"}
              </span>
              . Patient has been notified.
            </p>
            <Link
              href="/provider/video-review"
              className="ml-auto text-xs tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors font-light"
            >
              Back to queue
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
