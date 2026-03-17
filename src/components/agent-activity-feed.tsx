"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { agentsApi } from "@/lib/api";

// ─── Agent badge color map ─────────────────────────────────────────────────

interface AgentStyle {
  bg: string;
  color: string;
}

const AGENT_STYLES: Record<string, AgentStyle> = {
  TriageAgent: { bg: "#ccfbf1", color: "#0f766e" },
  ClinicalReviewAgent: { bg: "#dbeafe", color: "#1B2A4A" },
  RouterAgent: { bg: "#ede9fe", color: "#6d28d9" },
  PharmacyAgent: { bg: "#fef3c7", color: "#92400e" },
  ScriptsXOConcierge: { bg: "#dcfce7", color: "#15803d" },
};

const DEFAULT_AGENT_STYLE: AgentStyle = { bg: "#f1f5f9", color: "#475569" };

// ─── Relative time helper ─────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
}

// ─── Output excerpt extraction ────────────────────────────────────────────

function extractExcerpt(output: unknown): string | null {
  if (!output) return null;
  let parsed: Record<string, unknown> | null = null;

  if (typeof output === "string") {
    try {
      parsed = JSON.parse(output) as Record<string, unknown>;
    } catch {
      return typeof output === "string" && output.length > 0
        ? output.slice(0, 120)
        : null;
    }
  } else if (typeof output === "object") {
    parsed = output as Record<string, unknown>;
  }

  if (!parsed) return null;

  const excerpt =
    (parsed.summary as string | undefined) ??
    (parsed.clinical_summary as string | undefined) ??
    (parsed.recommended_action as string | undefined);

  return excerpt ? excerpt.slice(0, 120) : null;
}

// ─── Status badge rendering ───────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="animate-ping inline-block"
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "#3b82f6",
          }}
          aria-hidden="true"
        />
        <Badge variant="info">running</Badge>
      </span>
    );
  }
  if (status === "completed") return <Badge variant="success">completed</Badge>;
  if (status === "failed") return <Badge variant="error">failed</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

// ─── Component ────────────────────────────────────────────────────────────

interface AgentActivityFeedProps {
  entityId?: string;
  maxItems?: number;
  className?: string;
}

export function AgentActivityFeed({
  entityId,
  maxItems = 10,
  className = "",
}: AgentActivityFeedProps) {
  const [runs, setRuns] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    agentsApi
      .getRuns(entityId)
      .then((data) => setRuns(data.slice(0, maxItems)))
      .catch(() => {
        setError(true);
        setRuns([]);
      });
  }, [entityId, maxItems]);

  // Loading skeleton
  if (runs === null) {
    return (
      <div className={`space-y-3 ${className}`} aria-busy="true" aria-label="Loading agent activity">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (runs.length === 0) {
    return (
      <div
        className={`py-8 text-center ${className}`}
        style={{ color: "#94a3b8", fontSize: "13px" }}
      >
        {error ? "Unable to load agent activity." : "No agent activity yet."}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {runs.map((run, i) => {
        const agentName = (run.agentName as string | undefined) ?? "Unknown Agent";
        const trigger = (run.trigger as string | undefined) ?? (run.event as string | undefined) ?? "—";
        const status = (run.status as string | undefined) ?? "unknown";
        const createdAt = run.createdAt as number | undefined;
        const output = run.output ?? run.result ?? null;
        const excerpt = status === "completed" ? extractExcerpt(output) : null;
        const style = AGENT_STYLES[agentName] ?? DEFAULT_AGENT_STYLE;

        return (
          <div
            key={(run.id as string | undefined) ?? i}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              padding: "12px",
              borderRadius: "8px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {/* Agent name badge */}
              <span
                style={{
                  background: style.bg,
                  color: style.color,
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "4px",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                }}
              >
                {agentName}
              </span>

              {/* Trigger */}
              <span style={{ fontSize: "12px", color: "#64748b", flex: 1, minWidth: 0 }}>
                {trigger}
              </span>

              {/* Status */}
              <StatusBadge status={status} />

              {/* Time */}
              {createdAt !== undefined && (
                <span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                  {relativeTime(createdAt)}
                </span>
              )}
            </div>

            {/* Output excerpt */}
            {excerpt && (
              <p
                style={{
                  fontSize: "12px",
                  color: "#475569",
                  lineHeight: 1.5,
                  margin: 0,
                  paddingLeft: "2px",
                }}
              >
                {excerpt}
                {excerpt.length >= 120 ? "…" : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
