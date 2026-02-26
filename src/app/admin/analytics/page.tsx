"use client";

import { BarChart3, Users, Activity, DollarSign, Clock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function AnalyticsPage() {
  const patientCount = useQuery(api.members.countByRole, { role: "patient" });
  const providerCount = useQuery(api.members.countByRole, { role: "provider" });
  const consultationCount = useQuery(api.consultations.countAll);

  const isLoading =
    patientCount === undefined ||
    providerCount === undefined ||
    consultationCount === undefined;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <PageHeader
          eyebrow="ANALYTICS"
          title="Analytics"
          description="Platform performance and revenue metrics."
          backHref="/admin"
        />

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Total Clients"
            value={isLoading ? "—" : patientCount ?? "—"}
            icon={Users}
            hint="registered members"
          />
          <StatCard
            label="Providers"
            value={isLoading ? "—" : providerCount ?? "—"}
            icon={Users}
            hint="active clinicians"
          />
          <StatCard
            label="Consultations"
            value={isLoading ? "—" : consultationCount ?? "—"}
            icon={Activity}
            hint="all time"
          />
          <StatCard
            label="Revenue"
            value="—"
            icon={DollarSign}
            hint="Stripe not connected"
          />
        </div>

        {/* Wait Time — needs telemetry */}
        <div className="bg-card border border-border rounded-lg p-5 mb-6 flex items-center gap-4">
          <Clock size={18} className="text-primary flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-light text-foreground">Avg Wait Time</p>
            <p className="text-xs text-muted-foreground">
              — &nbsp;Telemetry not yet connected. Wait time will be calculated from consultation
              start times once tracking is enabled.
            </p>
          </div>
        </div>

        {/* Specialty Breakdown — coming soon */}
        <div className="bg-card border border-border rounded-lg p-6 mb-10">
          <h2
            className="text-sm font-light text-foreground mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Consultations by Specialty
          </h2>
          <div className="h-24 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Specialty breakdown available once consultation data accumulates.
            </p>
          </div>
        </div>

        {/* Revenue Chart Placeholder */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2
            className="text-sm font-light text-foreground mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Revenue Trend (Last 30 Days)
          </h2>
          <div className="h-48 bg-muted/50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 size={32} className="text-muted-foreground mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Chart renders with real Stripe revenue data
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
