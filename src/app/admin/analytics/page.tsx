import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft, TrendingUp, Users, DollarSign, Clock, Activity } from "lucide-react";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Platform metrics, consultation data, and revenue reports.",
};

const METRICS = [
  { icon: Users, label: "Total Patients", value: "1,247", change: "+12%", period: "vs last month" },
  { icon: Activity, label: "Consultations", value: "438", change: "+8%", period: "this month" },
  { icon: DollarSign, label: "Revenue", value: "$32,850", change: "+15%", period: "this month" },
  { icon: Clock, label: "Avg Wait Time", value: "8 min", change: "-22%", period: "vs last month" },
];

const TOP_SPECIALTIES = [
  { name: "General Medicine", consultations: 156, percentage: 36 },
  { name: "Urgent Care", consultations: 98, percentage: 22 },
  { name: "Dermatology", consultations: 72, percentage: 16 },
  { name: "Mental Health", consultations: 65, percentage: 15 },
  { name: "Other", consultations: 47, percentage: 11 },
];

export default function AnalyticsPage() {
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
            {METRICS.map((metric, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <metric.icon size={16} className="text-primary" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {metric.value}
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp size={12} className="text-green-500" aria-hidden="true" />
                  <span className="text-xs text-green-600">{metric.change}</span>
                  <span className="text-xs text-muted-foreground">{metric.period}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Specialty Breakdown */}
          <div className="bg-card border border-border rounded-lg p-6 mb-10">
            <h2 className="text-sm font-semibold text-foreground mb-6">
              Consultations by Specialty
            </h2>
            <div className="space-y-4">
              {TOP_SPECIALTIES.map((specialty, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-sm text-foreground w-36 flex-shrink-0">
                    {specialty.name}
                  </span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${specialty.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {specialty.consultations}
                  </span>
                </div>
              ))}
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
                  Chart visualization will render with real data
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
