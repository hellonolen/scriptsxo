"use client";

import { useEffect, useState } from "react";
import { Loader2, FlaskConical, CheckCircle, Clock, Package, Truck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { prescriptions as prescriptionsApi } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimePeriod = "today" | "week" | "month" | "year";

interface TimeStats {
  rxTotal: number;
  compounding: number;
  qaCheck: number;
  ready: number;
  dispensed: number;
  avgTurnaround: string;
}

interface AuthPayer {
  payer: string;
  rate: string;
}

interface AuthStats {
  submitted: number;
  approved: number;
  inReview: number;
  denied: number;
  avgTurnaround: string;
  denialsByPayer: AuthPayer[];
}

interface PriorAuth {
  id: string;
  patient: string;
  medication: string;
  payer: string;
  status: "Submitted" | "Approved" | "In Review" | "Denied";
  filed: string;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_TIME_STATS: Record<TimePeriod, TimeStats> = {
  today: {
    rxTotal: 14,
    compounding: 6,
    qaCheck: 2,
    ready: 4,
    dispensed: 8,
    avgTurnaround: "3.2h",
  },
  week: {
    rxTotal: 67,
    compounding: 12,
    qaCheck: 5,
    ready: 8,
    dispensed: 42,
    avgTurnaround: "4.1h",
  },
  month: {
    rxTotal: 342,
    compounding: 28,
    qaCheck: 11,
    ready: 15,
    dispensed: 288,
    avgTurnaround: "3.8h",
  },
  year: {
    rxTotal: 3841,
    compounding: 64,
    qaCheck: 22,
    ready: 31,
    dispensed: 3724,
    avgTurnaround: "3.5h",
  },
};

const SEED_AUTH_STATS: Record<TimePeriod, AuthStats> = {
  today: {
    submitted: 3,
    approved: 2,
    inReview: 1,
    denied: 0,
    avgTurnaround: "4.2h",
    denialsByPayer: [
      { payer: "Aetna", rate: "22%" },
      { payer: "United", rate: "8%" },
      { payer: "BCBS", rate: "12%" },
    ],
  },
  week: {
    submitted: 18,
    approved: 14,
    inReview: 3,
    denied: 1,
    avgTurnaround: "6.8h",
    denialsByPayer: [
      { payer: "Aetna", rate: "22%" },
      { payer: "United", rate: "8%" },
      { payer: "BCBS", rate: "12%" },
    ],
  },
  month: {
    submitted: 72,
    approved: 58,
    inReview: 8,
    denied: 6,
    avgTurnaround: "8.4h",
    denialsByPayer: [
      { payer: "Aetna", rate: "22%" },
      { payer: "United", rate: "8%" },
      { payer: "BCBS", rate: "12%" },
      { payer: "Cigna", rate: "15%" },
    ],
  },
  year: {
    submitted: 847,
    approved: 694,
    inReview: 31,
    denied: 122,
    avgTurnaround: "7.2h",
    denialsByPayer: [
      { payer: "Aetna", rate: "22%" },
      { payer: "United", rate: "8%" },
      { payer: "BCBS", rate: "12%" },
      { payer: "Cigna", rate: "15%" },
      { payer: "Humana", rate: "18%" },
    ],
  },
};

const SEED_PRIOR_AUTHS: PriorAuth[] = [
  {
    id: "PA-993812",
    patient: "David Liu",
    medication: "Ozempic 1mg/dose",
    payer: "Humana",
    status: "Submitted",
    filed: "Mar 6, 10:22 AM",
  },
  {
    id: "PA-993808",
    patient: "Simone Adams",
    medication: "Dupixent 300mg",
    payer: "Cigna",
    status: "Approved",
    filed: "Mar 5, 2:14 PM",
  },
  {
    id: "PA-993801",
    patient: "Angela Torres",
    medication: "Repatha 140mg",
    payer: "BCBS",
    status: "Approved",
    filed: "Mar 4, 11:30 AM",
  },
  {
    id: "PA-993795",
    patient: "Robert Chen",
    medication: "Humira 40mg",
    payer: "Aetna",
    status: "Denied",
    filed: "Mar 3, 3:45 PM",
  },
  {
    id: "PA-993790",
    patient: "Maria Rodriguez",
    medication: "Mounjaro 5mg",
    payer: "Aetna",
    status: "In Review",
    filed: "Mar 6, 8:00 AM",
  },
  {
    id: "PA-993785",
    patient: "Kevin Zhao",
    medication: "Testosterone Cypionate 200mg/mL",
    payer: "Aetna",
    status: "Approved",
    filed: "Mar 2, 9:15 AM",
  },
];

const RX_STAGES = ["Received", "Compounding", "QA Check", "Ready", "Dispensed"] as const;

const TIME_LABELS: { key: TimePeriod; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paStatusVariant(
  status: PriorAuth["status"]
): "success" | "warning" | "error" | "info" | "secondary" {
  switch (status) {
    case "Approved":
      return "success";
    case "Denied":
      return "error";
    case "Submitted":
      return "info";
    case "In Review":
      return "warning";
    default:
      return "secondary";
  }
}

function stagePercent(stage: string, stats: TimeStats): number {
  const total = stats.rxTotal || 1;
  switch (stage) {
    case "Received":
      return Math.round(
        ((stats.rxTotal - stats.compounding - stats.qaCheck - stats.ready - stats.dispensed) /
          total) *
          100
      );
    case "Compounding":
      return Math.round((stats.compounding / total) * 100);
    case "QA Check":
      return Math.round((stats.qaCheck / total) * 100);
    case "Ready":
      return Math.round((stats.ready / total) * 100);
    case "Dispensed":
      return Math.round((stats.dispensed / total) * 100);
    default:
      return 0;
  }
}

function stageCount(stage: string, stats: TimeStats): number {
  switch (stage) {
    case "Received":
      return Math.max(
        0,
        stats.rxTotal -
          stats.compounding -
          stats.qaCheck -
          stats.ready -
          stats.dispensed
      );
    case "Compounding":
      return stats.compounding;
    case "QA Check":
      return stats.qaCheck;
    case "Ready":
      return stats.ready;
    case "Dispensed":
      return stats.dispensed;
    default:
      return 0;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RxTrackerPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("today");
  const [isLoading, setIsLoading] = useState(true);
  const [timeStats, setTimeStats] = useState<Record<TimePeriod, TimeStats>>(
    SEED_TIME_STATS
  );
  const [authStats] = useState<Record<TimePeriod, AuthStats>>(SEED_AUTH_STATS);
  const [priorAuths] = useState<PriorAuth[]>(SEED_PRIOR_AUTHS);

  useEffect(() => {
    prescriptionsApi
      .getAll()
      .then((data) => {
        const all = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
        if (all.length > 0) {
          // Build live stats from real data if available
          const todayStats: TimeStats = {
            rxTotal: all.length,
            compounding: all.filter((rx) => rx.status === "filling").length,
            qaCheck: all.filter((rx) => rx.status === "verification").length,
            ready: all.filter((rx) => rx.status === "ready").length,
            dispensed: all.filter(
              (rx) => rx.status === "picked_up" || rx.status === "shipped"
            ).length,
            avgTurnaround: "—",
          };
          setTimeStats({ ...SEED_TIME_STATS, today: todayStats });
        }
      })
      .catch(() => {
        // Keep seed data
      })
      .finally(() => setIsLoading(false));
  }, []);

  const stats = timeStats[timePeriod];
  const auth = authStats[timePeriod];

  const statCards = [
    {
      label: "Total Rx",
      value: String(stats.rxTotal),
      sub: TIME_LABELS.find((t) => t.key === timePeriod)?.label ?? "",
      icon: Package,
    },
    {
      label: "Compounding",
      value: String(stats.compounding),
      sub: "in progress",
      icon: FlaskConical,
    },
    {
      label: "QA Check",
      value: String(stats.qaCheck),
      sub: "awaiting review",
      icon: Clock,
    },
    {
      label: "Ready",
      value: String(stats.ready),
      sub: "pickup / ship",
      icon: CheckCircle,
    },
    {
      label: "Dispensed",
      value: String(stats.dispensed),
      sub: "completed",
      icon: Truck,
    },
  ];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">
        <PageHeader
          eyebrow="PHARMACY"
          title="Rx Tracker"
          description="Prescription analytics, compounding pipeline, and prior authorization management."
          backHref="/pharmacy"
        />

        {/* Time Period Tabs */}
        <div className="flex gap-1 mb-6 bg-muted/40 p-1 rounded-lg w-fit">
          {TIME_LABELS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTimePeriod(t.key)}
              className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background:
                  timePeriod === t.key ? "var(--card)" : "transparent",
                color:
                  timePeriod === t.key
                    ? "var(--foreground)"
                    : "var(--muted-foreground)",
                boxShadow:
                  timePeriod === t.key
                    ? "0 1px 3px rgba(0,0,0,0.08)"
                    : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-24">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading tracker data...</p>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
              {statCards.map(({ label, value, sub, icon: Icon }) => (
                <div
                  key={label}
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="eyebrow text-[9px]">{label}</p>
                    <Icon
                      size={14}
                      className="text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <p
                    className="text-2xl font-light text-foreground"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {value}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
                </div>
              ))}
            </div>

            {/* PA Management Summary */}
            <div className="bg-card border border-border rounded-lg p-5 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2
                    className="text-base font-light text-foreground"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Prior Authorization Summary
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    PA analytics for selected period
                  </p>
                </div>
                <div className="text-right">
                  <p className="eyebrow text-[9px] mb-0.5">Avg Turnaround</p>
                  <p
                    className="text-2xl font-light text-foreground"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {auth.avgTurnaround}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Submitted", value: auth.submitted, variant: "info" as const },
                  { label: "Approved", value: auth.approved, variant: "success" as const },
                  { label: "In Review", value: auth.inReview, variant: "warning" as const },
                  { label: "Denied", value: auth.denied, variant: "error" as const },
                ].map(({ label, value, variant }) => (
                  <div
                    key={label}
                    className="bg-background border border-border rounded-md p-3"
                  >
                    <p className="eyebrow text-[9px] mb-1">{label}</p>
                    <p
                      className="text-xl font-light"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      <Badge variant={variant}>{value}</Badge>
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <p className="eyebrow text-[9px] mb-2">Denial Rate by Payer</p>
                <div className="flex flex-wrap gap-3">
                  {auth.denialsByPayer.map((p) => (
                    <div
                      key={p.payer}
                      className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-md"
                    >
                      <span className="text-xs font-medium text-foreground">
                        {p.payer}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {p.rate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Compounding Pipeline Visual */}
            <div className="bg-card border border-border rounded-lg overflow-hidden mb-8">
              <div className="px-5 py-4 border-b border-border">
                <h2
                  className="text-base font-light text-foreground"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Compounding Pipeline
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Volume across all compounding stages
                </p>
              </div>
              <div className="divide-y divide-border">
                {RX_STAGES.map((stage) => {
                  const count = stageCount(stage, stats);
                  const pct = stagePercent(stage, stats);
                  return (
                    <div
                      key={stage}
                      className="px-5 py-3 flex items-center gap-4"
                    >
                      <p className="text-xs text-muted-foreground w-28 shrink-0">
                        {stage}
                      </p>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                            background: "var(--primary)",
                            opacity: 0.6 + pct * 0.004,
                          }}
                        />
                      </div>
                      <p className="text-sm font-medium text-foreground w-10 text-right shrink-0">
                        {count}
                      </p>
                      <p className="text-xs text-muted-foreground w-10 text-right shrink-0">
                        {pct}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prior Auth Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2
                  className="text-base font-light text-foreground"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Prior Authorizations
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Active and recent PA records
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/30">
                      {["PA #", "Patient", "Medication", "Payer", "Status", "Filed"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-[10px] tracking-[0.1em] uppercase font-light text-muted-foreground border-b border-border whitespace-nowrap"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {priorAuths.map((pa) => (
                      <tr
                        key={pa.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono font-medium text-primary">
                            {pa.id}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                          {pa.patient}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {pa.medication}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {pa.payer}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={paStatusVariant(pa.status)}>
                            {pa.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {pa.filed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
