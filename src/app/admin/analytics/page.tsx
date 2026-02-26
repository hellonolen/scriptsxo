"use client";

import Link from "next/link";
import { BarChart3, ArrowLeft, Users, Activity, DollarSign, Clock } from "lucide-react";
import { Nav } from "@/components/nav";
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
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-foreground">
                Analytics
              </h1>
              <p className="text-sm text-muted-foreground">
                Platform performance and revenue metrics.
              </p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {/* Patients */}
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-primary" aria-hidden="true" />
                <span className="text-xs text-muted-foreground">Total Patients</span>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {isLoading ? "—" : patientCount}
              </div>
              <div className="text-xs text-muted-foreground">registered members</div>
            </div>

            {/* Providers */}
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-primary" aria-hidden="true" />
                <span className="text-xs text-muted-foreground">Providers</span>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {isLoading ? "—" : providerCount}
              </div>
              <div className="text-xs text-muted-foreground">active clinicians</div>
            </div>

            {/* Consultations */}
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-primary" aria-hidden="true" />
                <span className="text-xs text-muted-foreground">Consultations</span>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {isLoading ? "—" : consultationCount}
              </div>
              <div className="text-xs text-muted-foreground">all time</div>
            </div>

            {/* Revenue — needs Stripe, not yet available */}
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} className="text-primary" aria-hidden="true" />
                <span className="text-xs text-muted-foreground">Revenue</span>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">—</div>
              <div className="text-xs text-muted-foreground">Stripe not connected</div>
            </div>
          </div>

          {/* Wait Time — needs telemetry */}
          <div className="bg-card border border-border rounded-lg p-5 mb-6 flex items-center gap-4">
            <Clock size={18} className="text-primary flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-foreground">Avg Wait Time</p>
              <p className="text-xs text-muted-foreground">
                — &nbsp;Telemetry not yet connected. Wait time will be calculated from consultation
                start times once tracking is enabled.
              </p>
            </div>
          </div>

          {/* Specialty Breakdown — coming soon */}
          <div className="bg-card border border-border rounded-lg p-6 mb-10">
            <h2 className="text-sm font-semibold text-foreground mb-4">
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
            <h2 className="text-sm font-semibold text-foreground mb-4">
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
      </main>
    </>
  );
}
