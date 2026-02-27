"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Calendar, CreditCard, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { getSessionCookie } from "@/lib/auth";
import { shouldShowDemoData } from "@/lib/demo";
import {
  SEED_PAYOUT_STATS,
  SEED_RECENT_PAYOUTS,
  SEED_PENDING_EARNINGS,
} from "@/lib/seed-data";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatPrice } from "@/lib/config";

const STAT_ICONS = [DollarSign, CreditCard, Calendar, TrendingUp] as const;

export default function ProviderPayoutsPage() {
  const [showDemo, setShowDemo] = useState(false);
  const [email, setEmail]       = useState<string | null>(null);

  useEffect(() => {
    setShowDemo(shouldShowDemoData());
    const session = getSessionCookie();
    if (session?.email) setEmail(session.email);
  }, []);

  const billingRecords = useQuery(
    api.billing.getByProviderEmail,
    !showDemo && email ? { providerEmail: email } : "skip"
  );

  const isLoading = !showDemo && email !== null && billingRecords === undefined;

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-6 lg:p-10 max-w-[1200px] flex items-center justify-center py-20">
          <div className="text-left">
            <Loader2 size={28} className="animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading payout data...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // --- Seed path ---
  if (showDemo) {
    return (
      <AppShell>
        <div className="p-6 lg:p-10 max-w-[1200px]">
          <PageHeader
            eyebrow="PROVIDER PORTAL"
            title="Payouts"
            description="Earnings, payout history, and pending consultation fees."
            backHref="/provider"
          />

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {SEED_PAYOUT_STATS.map((stat, i) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} icon={STAT_ICONS[i]} />
            ))}
          </div>

          <PayoutSections
            pending={SEED_PENDING_EARNINGS}
            history={SEED_RECENT_PAYOUTS}
          />
        </div>
      </AppShell>
    );
  }

  // --- Real data path ---
  const records: any[] = billingRecords ?? [];
  const pending = records.filter((r) => r.status === "pending");
  const paid    = records.filter((r) => r.status === "paid");

  const thisMonthTotal = paid
    .filter((r) => {
      const d = new Date(r.paidAt ?? r.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const pendingTotal = pending.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const realStats = [
    { label: "This Month",  value: formatPrice(thisMonthTotal) },
    { label: "Pending",     value: formatPrice(pendingTotal)   },
    { label: "Total Paid",  value: `${paid.length} payments`   },
    { label: "Growth",      value: "—"                         },
  ] as const;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <PageHeader
          eyebrow="PROVIDER PORTAL"
          title="Payouts"
          description="Earnings, payout history, and pending consultation fees."
          backHref="/provider"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {realStats.map((stat, i) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} icon={STAT_ICONS[i]} />
          ))}
        </div>

        {records.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No payout records yet"
            description="Earnings from completed consultations will appear here after each billing cycle."
          />
        ) : (
          <PayoutSections
            pending={pending.map((r) => ({
              patient: r.patientEmail ?? "Patient",
              date: new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              amount: formatPrice(r.amount ?? 0),
              type: r.type ?? "Consultation",
            }))}
            history={paid.map((r) => ({
              date: new Date(r.paidAt ?? r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              amount: formatPrice(r.amount ?? 0),
              consultations: 1,
              status: "paid" as const,
            }))}
          />
        )}
      </div>
    </AppShell>
  );
}

/* ---------------------------------------------------------------------------
   Shared layout component for pending + history sections
   --------------------------------------------------------------------------- */

interface PendingItem  { patient: string; date: string; amount: string; type: string }
interface HistoryItem  { date: string; amount: string; consultations: number; status: "paid" }

function PayoutSections({ pending, history }: { pending: PendingItem[]; history: HistoryItem[] }) {
  return (
    <>
      {/* Pending Earnings */}
      <div className="mb-10">
        <h2
          className="text-base font-medium text-foreground mb-4"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pending Earnings
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending earnings.</p>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border">
              {pending.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.patient}</p>
                    <p className="text-xs text-muted-foreground">{item.type} — {item.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{item.amount}</span>
                    <Badge variant="info">Pending</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payout History */}
      <div>
        <h2
          className="text-base font-medium text-foreground mb-4"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Payout History
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed payouts yet.</p>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border">
              {history.map((payout, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{payout.amount}</p>
                    <p className="text-xs text-muted-foreground">
                      {payout.consultations} consultation{payout.consultations !== 1 ? "s" : ""} — {payout.date}
                    </p>
                  </div>
                  <Badge variant="success">Paid</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
