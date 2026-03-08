"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Video,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Flag,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

/* ---------------------------------------------------------------------------
   Types
   --------------------------------------------------------------------------- */

type TabId = "pending" | "completed";

interface VideoReview {
  _id: string;
  consultationId: string;
  patientId: string;
  urgencyLevel: number;
  chiefComplaint?: string;
  recommendedAction?: string;
  redFlags?: string[];
  summary?: string;
  agentStatus: string;
  providerDecision?: string;
  createdAt: number;
  patientName?: string;
  patientAge?: number;
}

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function urgencyVariant(level: number): "success" | "warning" | "error" {
  if (level <= 2) return "success";
  if (level === 3) return "warning";
  return "error";
}

function urgencyLabel(level: number): string {
  return `Urgency ${level}`;
}

function recommendationVariant(
  action?: string
): "success" | "warning" | "error" | "default" {
  if (!action) return "default";
  const lower = action.toLowerCase();
  if (lower.includes("approve")) return "success";
  if (lower.includes("reject")) return "error";
  return "warning";
}

function recommendationLabel(action?: string): string {
  if (!action) return "AI: Pending";
  const lower = action.toLowerCase();
  if (lower.includes("approve")) return "AI: Approve";
  if (lower.includes("reject")) return "AI: Reject";
  return "AI: More Info";
}

function decisionVariant(
  decision?: string
): "success" | "error" | "default" {
  if (!decision) return "default";
  if (decision === "approved") return "success";
  if (decision === "rejected") return "error";
  return "default";
}

/* ---------------------------------------------------------------------------
   Skeleton row
   --------------------------------------------------------------------------- */

function SkeletonRow() {
  return (
    <tr>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-sm" />
          <div className="space-y-1.5">
            <div className="skeleton h-3 w-28 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        </div>
      </td>
      <td className="p-4"><div className="skeleton h-3 w-20 rounded" /></td>
      <td className="p-4"><div className="skeleton h-5 w-16 rounded-full" /></td>
      <td className="p-4"><div className="skeleton h-3 w-32 rounded" /></td>
      <td className="p-4"><div className="skeleton h-5 w-24 rounded-full" /></td>
      <td className="p-4"><div className="skeleton h-3 w-12 rounded" /></td>
      <td className="p-4 text-right"><div className="skeleton h-8 w-20 rounded-sm ml-auto" /></td>
    </tr>
  );
}

/* ---------------------------------------------------------------------------
   Page
   --------------------------------------------------------------------------- */

export default function VideoReviewQueuePage() {
  const [activeTab, setActiveTab] = useState<TabId>("pending");
  const [pendingReviews, setPendingReviews] = useState<VideoReview[] | undefined>(undefined);
  const [completedReviews, setCompletedReviews] = useState<VideoReview[] | undefined>(undefined);

  useEffect(() => {
    // Video reviews are not yet in the api.ts client — fetch from API directly
    const API_BASE =
      process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";

    const token = document.cookie.match(/(?:^|;\s*)scriptsxo_session=([^;]+)/)?.[1];
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${decodeURIComponent(token)}`;

    fetch(`${API_BASE}/video-reviews?includeDecided=false`, { headers, credentials: "include" })
      .then((r) => r.json())
      .then((json: any) => setPendingReviews(Array.isArray(json.data) ? json.data : []))
      .catch(() => setPendingReviews([]));

    fetch(`${API_BASE}/video-reviews?includeDecided=true`, { headers, credentials: "include" })
      .then((r) => r.json())
      .then((json: any) => setCompletedReviews(Array.isArray(json.data) ? json.data : []))
      .catch(() => setCompletedReviews([]));
  }, []);

  const isLoading = activeTab === "pending"
    ? pendingReviews === undefined
    : completedReviews === undefined;

  const rawCompleted = completedReviews ?? [];
  const completedList = rawCompleted.filter((r) => !!r.providerDecision);
  const pendingList = pendingReviews ?? [];

  const displayList: VideoReview[] =
    activeTab === "pending" ? pendingList : completedList;

  const tabs: { id: TabId; label: string; count: number | null }[] = [
    {
      id: "pending",
      label: "Pending Review",
      count: pendingReviews !== undefined ? pendingList.length : null,
    },
    {
      id: "completed",
      label: "Completed",
      count: completedReviews !== undefined ? completedList.length : null,
    },
  ];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/provider"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to provider dashboard"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow mb-0.5">PROVIDER PORTAL</p>
            <h1
              className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Video Review Queue
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">
          AI-analyzed patient submissions awaiting your decision.
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-light rounded-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 opacity-60">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="table-custom">
            <thead>
              <tr>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  Patient
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  Submitted
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  Urgency
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  Chief Complaint
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  AI Recommendation
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  Flags
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light text-right">
                  {activeTab === "pending" ? "Action" : "Outcome"}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : displayList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-left">
                    <div className="flex flex-col gap-2">
                      <Video size={24} className="text-muted-foreground" aria-hidden="true" />
                      <p className="text-sm text-muted-foreground font-light">
                        {activeTab === "pending"
                          ? "No videos pending review. The AI agents are processing submissions — check back shortly."
                          : "No completed reviews yet."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayList.map((review: any) => {
                  const initials = (review.patientName ?? review.patientId ?? "??")
                    .toString()
                    .split(" ")
                    .map((w: string) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const flagCount = review.redFlags?.length ?? 0;

                  return (
                    <tr key={review._id}>
                      {/* Patient */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-sm bg-brand-secondary-muted flex items-center justify-center text-xs font-light text-foreground tracking-wide shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-light text-foreground leading-tight">
                              {review.patientName ?? "Patient"}
                            </p>
                            {review.patientAge && (
                              <p className="text-xs text-muted-foreground font-light">
                                Age {review.patientAge}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Submitted */}
                      <td>
                        <div className="flex items-center gap-1.5 text-sm font-light text-muted-foreground">
                          <Clock size={12} aria-hidden="true" />
                          {relativeTime(review.createdAt)}
                        </div>
                      </td>

                      {/* Urgency */}
                      <td>
                        <Badge variant={urgencyVariant(review.urgencyLevel ?? 1)}>
                          {urgencyLabel(review.urgencyLevel ?? 1)}
                        </Badge>
                      </td>

                      {/* Chief Complaint */}
                      <td className="text-sm font-light text-foreground max-w-[200px]">
                        <span className="line-clamp-2">
                          {review.chiefComplaint ?? "—"}
                        </span>
                      </td>

                      {/* AI Recommendation */}
                      <td>
                        <Badge
                          variant={recommendationVariant(review.recommendedAction)}
                        >
                          {activeTab === "completed" && review.providerDecision ? (
                            <>
                              {review.providerDecision === "approved" ? (
                                <CheckCircle2 size={11} aria-hidden="true" />
                              ) : (
                                <XCircle size={11} aria-hidden="true" />
                              )}
                              {review.providerDecision.charAt(0).toUpperCase() +
                                review.providerDecision.slice(1)}
                            </>
                          ) : (
                            recommendationLabel(review.recommendedAction)
                          )}
                        </Badge>
                      </td>

                      {/* Red flags */}
                      <td>
                        {flagCount > 0 ? (
                          <div className="flex items-center gap-1.5 text-sm font-light text-destructive">
                            <Flag size={12} aria-hidden="true" />
                            {flagCount} {flagCount === 1 ? "flag" : "flags"}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-light">
                            None
                          </span>
                        )}
                      </td>

                      {/* Action / Outcome */}
                      <td className="text-right">
                        {activeTab === "pending" ? (
                          <Link
                            href={`/provider/video-review/${review._id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors"
                          >
                            Review
                          </Link>
                        ) : (
                          <Badge variant={decisionVariant(review.providerDecision)}>
                            {review.providerDecision
                              ? review.providerDecision.charAt(0).toUpperCase() +
                                review.providerDecision.slice(1)
                              : "—"}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
