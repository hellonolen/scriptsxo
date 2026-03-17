"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { consultations } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CaseRecord {
  id: string;
  patient_name?: string;
  patient_email?: string;
  patient_state?: string;
  service_category?: string;
  medication_requested?: string;
  chief_complaint?: string;
  case_state?: string;
  auto_review_verdict?: "approved" | "denied" | "needs_provider_review" | null;
  auto_review_confidence?: number | null;
  auto_review_reasoning?: string | null;
  auto_review_rx?: string | null;
  auto_review_at?: number | null;
  provider_override?: string | null;
  created_at?: number;
  updated_at?: number;
  [key: string]: unknown;
}

type OversightTab = "needs_review" | "auto_approved" | "denied";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidencePct(confidence: number | null | undefined): string {
  if (confidence == null) return "—";
  return `${Math.round(confidence * 100)}%`;
}

function timeAgo(ts: number | null | undefined): string {
  if (!ts) return "—";
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function confidenceBarColor(confidence: number | null | undefined): string {
  if (confidence == null) return "bg-muted";
  if (confidence >= 0.85) return "bg-primary";
  if (confidence >= 0.65) return "bg-warning";
  return "bg-destructive";
}

// ─── Override inline form ─────────────────────────────────────────────────────

interface OverrideFormProps {
  caseId: string;
  action: "block" | "approve";
  label: string;
  onComplete: () => void;
  onCancel: () => void;
}

function OverrideForm({ caseId, action, label, onComplete, onCancel }: OverrideFormProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await consultations.override(caseId, action, reason || undefined);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Override failed");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 border-t border-border pt-3">
      <p className="text-xs text-muted-foreground font-light mb-2">
        {action === "block" ? "Reason for blocking (optional):" : "Reason for override (optional):"}
      </p>
      <textarea
        className="w-full text-sm font-light text-foreground bg-background border border-border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        rows={2}
        placeholder={action === "block" ? "e.g. Contraindication not flagged by system" : "e.g. Reviewed full chart, clinically appropriate"}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={loading}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <div className="flex items-center gap-2 mt-2">
        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-1.5 text-[11px] tracking-[0.1em] uppercase font-light rounded-sm transition-colors ${
            action === "block"
              ? "bg-destructive text-white hover:bg-destructive/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin inline mr-1" />
          ) : null}
          {label}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-1.5 text-[11px] tracking-[0.1em] uppercase font-light rounded-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Case card ────────────────────────────────────────────────────────────────

interface CaseCardProps {
  c: CaseRecord;
  tab: OversightTab;
  onActionComplete: () => void;
}

function CaseCard({ c, tab, onActionComplete }: CaseCardProps) {
  const [activeOverride, setActiveOverride] = useState<null | { action: "block" | "approve"; label: string }>(null);

  const flags: string[] = [];
  // Parse flags if stored as JSON string in the record (auto_review_rx has same shape)
  // We'll rely on the reasoning field for display

  const confidence = typeof c.auto_review_confidence === "number" ? c.auto_review_confidence : null;

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {tab === "needs_review" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-warning/10 text-warning border border-warning/20">
                <AlertTriangle size={10} />
                NEEDS REVIEW
              </span>
            )}
            {tab === "auto_approved" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-primary/10 text-primary border border-primary/20">
                <CheckCircle2 size={10} />
                AUTO-APPROVED
              </span>
            )}
            {tab === "denied" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-destructive/10 text-destructive border border-destructive/20">
                <XCircle size={10} />
                DENIED
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-light tracking-wide">
              {timeAgo(c.auto_review_at ?? c.created_at)}
            </span>
          </div>
          <p className="text-sm font-light text-foreground truncate">
            {c.patient_name ?? "Patient"}
          </p>
          <p className="text-xs text-muted-foreground font-light">
            {[c.patient_state, c.service_category].filter(Boolean).join(" · ")}
            {c.medication_requested ? ` · ${c.medication_requested}` : ""}
          </p>
        </div>

        {/* Confidence */}
        {confidence != null && (
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground font-light mb-1">Confidence</p>
            <p className="text-lg font-light text-foreground leading-none">
              {confidencePct(confidence)}
            </p>
          </div>
        )}
      </div>

      {/* Confidence bar */}
      {confidence != null && (
        <div className="w-full bg-muted rounded-full h-1">
          <div
            className={`h-1 rounded-full transition-all ${confidenceBarColor(confidence)}`}
            style={{ width: `${Math.round(confidence * 100)}%` }}
          />
        </div>
      )}

      {/* AI Reasoning */}
      {c.auto_review_reasoning && (
        <blockquote className="border-l-2 border-border pl-3 text-xs text-muted-foreground font-light leading-relaxed italic">
          {c.auto_review_reasoning}
        </blockquote>
      )}

      {/* Action buttons */}
      {activeOverride ? (
        <OverrideForm
          caseId={c.id}
          action={activeOverride.action}
          label={activeOverride.label}
          onComplete={() => {
            setActiveOverride(null);
            onActionComplete();
          }}
          onCancel={() => setActiveOverride(null)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
          {tab === "needs_review" && (
            <>
              <button
                onClick={() => setActiveOverride({ action: "approve", label: "Confirm Greenlight" })}
                className="px-4 py-1.5 bg-primary text-primary-foreground text-[11px] tracking-[0.1em] uppercase font-light rounded-sm hover:bg-primary/90 transition-colors"
              >
                Greenlight
              </button>
              <button
                onClick={() => setActiveOverride({ action: "block", label: "Confirm Block" })}
                className="px-4 py-1.5 bg-destructive text-white text-[11px] tracking-[0.1em] uppercase font-light rounded-sm hover:bg-destructive/90 transition-colors"
              >
                Block
              </button>
            </>
          )}
          {tab === "auto_approved" && (
            <button
              onClick={() => setActiveOverride({ action: "block", label: "Confirm Block" })}
              className="px-4 py-1.5 border border-destructive text-destructive text-[11px] tracking-[0.1em] uppercase font-light rounded-sm hover:bg-destructive/10 transition-colors"
            >
              Block
            </button>
          )}
          {tab === "denied" && (
            <button
              onClick={() => setActiveOverride({ action: "approve", label: "Confirm Override" })}
              className="px-4 py-1.5 border border-primary text-primary text-[11px] tracking-[0.1em] uppercase font-light rounded-sm hover:bg-primary/10 transition-colors"
            >
              Override &amp; Approve
            </button>
          )}
          <a
            href={`/provider/consultation/${c.id}`}
            className="inline-flex items-center gap-1 px-4 py-1.5 text-[11px] tracking-[0.1em] uppercase font-light text-muted-foreground hover:text-foreground transition-colors border border-border rounded-sm"
          >
            View Chart <ChevronRight size={11} />
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProviderOversightPage() {
  const [allCases, setAllCases] = useState<CaseRecord[] | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<OversightTab>("needs_review");
  const [refreshing, setRefreshing] = useState(false);

  const loadCases = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      // Fetch across multiple states that the agent processes
      const [providerReview, approved, denied] = await Promise.all([
        consultations.getQueue().catch(() => [] as CaseRecord[]),
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://scriptsxo-api.hellonolen.workers.dev'}/cases?state=approved`, {
          headers: document.cookie.match(/scriptsxo_session=([^;]+)/)
            ? { Authorization: `Bearer ${decodeURIComponent(document.cookie.match(/scriptsxo_session=([^;]+)/)![1])}` }
            : {},
          credentials: 'include',
        }).then(r => r.json()).then((j: { success: boolean; data?: CaseRecord[] }) => j.data ?? []).catch(() => []),
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://scriptsxo-api.hellonolen.workers.dev'}/cases?state=denied`, {
          headers: document.cookie.match(/scriptsxo_session=([^;]+)/)
            ? { Authorization: `Bearer ${decodeURIComponent(document.cookie.match(/scriptsxo_session=([^;]+)/)![1])}` }
            : {},
          credentials: 'include',
        }).then(r => r.json()).then((j: { success: boolean; data?: CaseRecord[] }) => j.data ?? []).catch(() => []),
      ]);

      const combined = [
        ...(Array.isArray(providerReview) ? providerReview : []),
        ...(Array.isArray(approved) ? approved : []),
        ...(Array.isArray(denied) ? denied : []),
      ] as CaseRecord[];

      setAllCases(combined);
    } catch {
      setAllCases([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCases(false);
  }, [loadCases]);

  // Partition cases by tab
  const needsReviewCases = (allCases ?? []).filter(
    (c) => c.case_state === "provider_review" || c.auto_review_verdict === "needs_provider_review"
  );
  const autoApprovedCases = (allCases ?? []).filter(
    (c) => c.case_state === "approved" && c.auto_review_verdict === "approved" && !c.provider_override
  );
  const deniedCases = (allCases ?? []).filter(
    (c) => c.case_state === "denied" && !c.provider_override
  );

  const tabCases: Record<OversightTab, CaseRecord[]> = {
    needs_review: needsReviewCases,
    auto_approved: autoApprovedCases,
    denied: deniedCases,
  };

  const TAB_CONFIG: { key: OversightTab; label: string; count: number }[] = [
    { key: "needs_review", label: "Needs Review", count: needsReviewCases.length },
    { key: "auto_approved", label: "Auto-Approved", count: autoApprovedCases.length },
    { key: "denied", label: "Denied", count: deniedCases.length },
  ];

  const visibleCases = tabCases[activeTab];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <PageHeader
          eyebrow="PROVIDER OVERSIGHT"
          title="AI Case Review"
          description="Agent-reviewed cases awaiting oversight or auto-processed"
          backHref="/provider"
          size="lg"
        />

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-8 border-b border-border">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-light tracking-wide transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {allCases !== undefined && tab.count > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 rounded-full px-1.5 text-[10px] font-medium ${
                    tab.key === "needs_review"
                      ? "bg-warning/15 text-warning"
                      : tab.key === "auto_approved"
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}

          {/* Refresh */}
          <button
            onClick={() => loadCases(false)}
            disabled={refreshing}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Refresh cases"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Tab hint */}
        <div className="mb-6">
          {activeTab === "needs_review" && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-warning/5 border border-warning/15">
              <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                These cases were escalated by the AI for human judgment. Review the AI reasoning and either greenlight or block each case.
              </p>
            </div>
          )}
          {activeTab === "auto_approved" && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/10">
              <ShieldCheck size={14} className="text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                These cases were approved automatically with high confidence. You can still block any case if clinical review reveals a concern.
              </p>
            </div>
          )}
          {activeTab === "denied" && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border border-border">
              <XCircle size={14} className="text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                These cases were denied by the AI. You may override and approve any case if the denial was in error.
              </p>
            </div>
          )}
        </div>

        {/* Cases grid */}
        {allCases === undefined ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-light">Loading cases…</p>
          </div>
        ) : visibleCases.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground font-light">
              {activeTab === "needs_review"
                ? "No cases awaiting provider review."
                : activeTab === "auto_approved"
                ? "No auto-approved cases."
                : "No denied cases."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCases.map((c) => (
              <CaseCard
                key={c.id}
                c={c}
                tab={activeTab}
                onActionComplete={() => loadCases(true)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
