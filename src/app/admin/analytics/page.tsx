"use client";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    ShieldAlert,
    RefreshCw,
    Package,
    TrendingUp,
    TrendingDown,
} from "lucide-react";

/* ── KPI Data ── */

const KPIS = [
    {
        label: "Approval Rate",
        value: "78%",
        icon: CheckCircle2,
        hint: "+3% vs last month",
        accentColor: "#059669",
        accentBg: "rgba(5,150,105,0.08)",
    },
    {
        label: "Denial Rate",
        value: "14%",
        icon: XCircle,
        hint: "-2% vs last month",
        accentColor: "#DC2626",
        accentBg: "rgba(220,38,38,0.08)",
    },
    {
        label: "Avg Provider Turnaround",
        value: "4.2 hrs",
        icon: Clock,
        hint: "Within SLA target",
        accentColor: "#D97706",
        accentBg: "rgba(217,119,6,0.08)",
    },
    {
        label: "Pharmacy Failure Rate",
        value: "3%",
        icon: AlertTriangle,
        hint: "1 active exception",
        accentColor: "#D97706",
        accentBg: "rgba(217,119,6,0.08)",
    },
    {
        label: "Fraud Attempts",
        value: "2",
        icon: ShieldAlert,
        hint: "Flagged this month",
        accentColor: "#7C3AED",
        accentBg: "rgba(124,58,237,0.08)",
    },
];

/* ── State Volume Data ── */

const STATE_DATA = [
    { state: "FL", requests: 412, approved: 318, denied: 56, revenue: 87_400 },
    { state: "TX", requests: 384, approved: 301, denied: 49, revenue: 81_200 },
    { state: "CA", requests: 356, approved: 267, denied: 61, revenue: 75_300 },
    { state: "NY", requests: 298, approved: 229, denied: 42, revenue: 63_100 },
    { state: "GA", requests: 241, approved: 191, denied: 33, revenue: 51_800 },
    { state: "AZ", requests: 198, approved: 156, denied: 28, revenue: 42_300 },
    { state: "NC", requests: 173, approved: 137, denied: 24, revenue: 37_600 },
    { state: "OH", requests: 149, approved: 118, denied: 21, revenue: 32_100 },
];

/* ── Medication Profitability Data ── */

const MED_DATA = [
    { category: "Weight Management", volume: 847, avgRevenue: 310, approvalRate: 81, trend: "up" as const },
    { category: "Men's Health", volume: 623, avgRevenue: 195, approvalRate: 76, trend: "up" as const },
    { category: "Women's Health", volume: 518, avgRevenue: 220, approvalRate: 74, trend: "neutral" as const },
    { category: "General Wellness", volume: 391, avgRevenue: 148, approvalRate: 68, trend: "down" as const },
    { category: "Pain Management", volume: 274, avgRevenue: 165, approvalRate: 58, trend: "down" as const },
];

/* ── Provider Performance Data ── */

const PROVIDER_DATA = [
    { name: "Dr. James Carter, MD", seenToday: 12, avgTurnaround: "3.1 hrs", approvalRate: 84, active: true },
    { name: "Dr. Angela White, MD", seenToday: 9, avgTurnaround: "4.8 hrs", approvalRate: 77, active: true },
    { name: "Dr. Marcus Reid, DO", seenToday: 0, avgTurnaround: "5.9 hrs", approvalRate: 71, active: false },
];

/* ── Pharmacy Network Data ── */

const PHARMACY_DATA = [
    { name: "Belmar Pharmacy", sent: 312, received: 308, exceptions: 2, successRate: 99 },
    { name: "Empower Pharmacy", sent: 287, received: 280, exceptions: 4, successRate: 98 },
    { name: "Hallandale Pharmacy", sent: 198, received: 191, exceptions: 7, successRate: 96 },
    { name: "Strive Pharmacy", sent: 143, received: 138, exceptions: 3, successRate: 97 },
];

/* ── Helpers ── */

function rateColor(rate: number, goodThreshold: number, medThreshold: number): string {
    if (rate >= goodThreshold) return "#059669";
    if (rate >= medThreshold) return "#D97706";
    return "#DC2626";
}

function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
    if (trend === "up") return <TrendingUp size={13} style={{ color: "#059669" }} />;
    if (trend === "down") return <TrendingDown size={13} style={{ color: "#DC2626" }} />;
    return <span className="text-[11px] text-muted-foreground leading-none">—</span>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-4 font-medium">
            {children}
        </p>
    );
}

function formatRevenue(n: number): string {
    return "$" + (n / 1000).toFixed(0) + "k";
}

/* ── Page ── */

export default function AnalyticsPage() {
    return (
        <AppShell>
            <div className="p-6 lg:p-10 max-w-[1400px]">

                <header className="mb-8">
                    <PageHeader
                        eyebrow="OPERATIONS"
                        title="Analytics"
                        description="Business performance, provider throughput, and pharmacy network health."
                        backHref="/admin"
                    />
                </header>

                {/* ── KPI Stats Row (5 cards) ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                    {KPIS.map((kpi) => {
                        const Icon = kpi.icon;
                        return (
                            <div
                                key={kpi.label}
                                className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between hover:border-primary/20 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <p className="text-xs font-medium text-muted-foreground leading-tight pr-1">
                                        {kpi.label}
                                    </p>
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ background: kpi.accentBg }}
                                    >
                                        <Icon size={16} style={{ color: kpi.accentColor }} aria-hidden="true" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold text-foreground tracking-tight">
                                        {kpi.value}
                                    </p>
                                    <p className="text-xs mt-1 text-muted-foreground">{kpi.hint}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Three Side-by-Side Panels ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

                    {/* Panel 1: Request Volume by State */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <SectionHeading>Request Volume by State</SectionHeading>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        {["State", "Req", "Appr", "Denied", "Rev"].map((h) => (
                                            <th
                                                key={h}
                                                className="pb-2.5 text-left font-medium text-muted-foreground whitespace-nowrap pr-3 last:pr-0"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {STATE_DATA.map((row) => (
                                        <tr key={row.state} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-2.5 pr-3 font-semibold text-foreground">{row.state}</td>
                                            <td className="py-2.5 pr-3 text-muted-foreground">{row.requests}</td>
                                            <td className="py-2.5 pr-3">
                                                <span style={{ color: "#059669", opacity: 0.9 }}>{row.approved}</span>
                                            </td>
                                            <td className="py-2.5 pr-3">
                                                <span style={{ color: "#DC2626", opacity: 0.85 }}>{row.denied}</span>
                                            </td>
                                            <td className="py-2.5 font-medium text-foreground whitespace-nowrap">
                                                {formatRevenue(row.revenue)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Panel 2: Medication/Condition Profitability */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <SectionHeading>Medication Profitability</SectionHeading>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        {["Category", "Vol", "Avg Rev", "Appr%", "30d"].map((h) => (
                                            <th
                                                key={h}
                                                className="pb-2.5 text-left font-medium text-muted-foreground whitespace-nowrap pr-3 last:pr-0"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {MED_DATA.map((row) => (
                                        <tr key={row.category} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-2.5 pr-3 font-medium text-foreground leading-tight max-w-[110px]">
                                                <span className="block truncate">{row.category}</span>
                                            </td>
                                            <td className="py-2.5 pr-3 text-muted-foreground">{row.volume}</td>
                                            <td className="py-2.5 pr-3 font-medium text-foreground">${row.avgRevenue}</td>
                                            <td className="py-2.5 pr-3">
                                                <span
                                                    style={{
                                                        color: rateColor(row.approvalRate, 75, 65),
                                                        opacity: 0.9,
                                                    }}
                                                >
                                                    {row.approvalRate}%
                                                </span>
                                            </td>
                                            <td className="py-2.5">
                                                <div className="flex items-center h-full">
                                                    <TrendIcon trend={row.trend} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Panel 3: Provider Performance */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <SectionHeading>Provider Performance</SectionHeading>
                        <div className="space-y-3">
                            {PROVIDER_DATA.map((prov) => (
                                <div
                                    key={prov.name}
                                    className="border border-border/70 rounded-lg p-3.5 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2.5">
                                        <p className="text-xs font-medium text-foreground leading-tight">{prov.name}</p>
                                        <span
                                            className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-2"
                                            style={{
                                                color: prov.active ? "#059669" : "#6B7280",
                                                background: prov.active
                                                    ? "rgba(5,150,105,0.1)"
                                                    : "rgba(107,114,128,0.1)",
                                            }}
                                        >
                                            {prov.active ? "Active" : "Offline"}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground mb-0.5">Today</p>
                                            <p className="text-sm font-semibold text-foreground">{prov.seenToday}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground mb-0.5">Turnaround</p>
                                            <p className="text-[11px] font-medium text-foreground">{prov.avgTurnaround}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground mb-0.5">Approval</p>
                                            <p
                                                className="text-sm font-semibold"
                                                style={{
                                                    color: rateColor(prov.approvalRate, 80, 70),
                                                    opacity: 0.9,
                                                }}
                                            >
                                                {prov.approvalRate}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Repeat Purchase & Refill Rate callout ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-5">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: "rgba(5,150,105,0.08)" }}
                        >
                            <RefreshCw size={20} style={{ color: "#059669" }} />
                        </div>
                        <div>
                            <SectionHeading>Repeat Purchases &amp; Refills</SectionHeading>
                            <div className="flex gap-8">
                                <div>
                                    <p className="text-2xl font-semibold text-foreground tracking-tight">67%</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Repeat purchase rate</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold text-foreground tracking-tight">42%</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Refill rate</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-5">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: "rgba(124,58,237,0.08)" }}
                        >
                            <Package size={20} style={{ color: "#7C3AED" }} />
                        </div>
                        <div>
                            <SectionHeading>Monthly Volume</SectionHeading>
                            <div className="flex gap-8">
                                <div>
                                    <p className="text-2xl font-semibold text-foreground tracking-tight">2,211</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Total requests</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold text-foreground tracking-tight">$471k</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Gross revenue</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Pharmacy Network Status ── */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <SectionHeading>Pharmacy Network Status</SectionHeading>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-muted/30 border-b border-border">
                                    {["Pharmacy", "Orders Sent", "Received", "Exceptions", "Success Rate"].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-3 text-left text-[10px] tracking-[0.1em] uppercase font-light text-muted-foreground whitespace-nowrap"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {PHARMACY_DATA.map((row) => (
                                    <tr key={row.name} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3.5">
                                            <p className="text-sm font-medium text-foreground">{row.name}</p>
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-muted-foreground">{row.sent}</td>
                                        <td className="px-4 py-3.5 text-sm text-muted-foreground">{row.received}</td>
                                        <td className="px-4 py-3.5">
                                            <span
                                                className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-medium"
                                                style={{
                                                    color: rateColor(
                                                        row.exceptions === 0 ? 100 : row.exceptions <= 3 ? 50 : 0,
                                                        60,
                                                        30
                                                    ),
                                                    background:
                                                        row.exceptions > 5
                                                            ? "rgba(220,38,38,0.1)"
                                                            : row.exceptions > 2
                                                                ? "rgba(217,119,6,0.1)"
                                                                : "rgba(5,150,105,0.1)",
                                                }}
                                            >
                                                {row.exceptions}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"
                                                    style={{ maxWidth: "80px" }}
                                                >
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${row.successRate}%`,
                                                            background: rateColor(row.successRate, 98, 95),
                                                        }}
                                                    />
                                                </div>
                                                <span
                                                    className="text-xs font-semibold"
                                                    style={{
                                                        color: rateColor(row.successRate, 98, 95),
                                                        opacity: 0.9,
                                                    }}
                                                >
                                                    {row.successRate}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </AppShell>
    );
}
