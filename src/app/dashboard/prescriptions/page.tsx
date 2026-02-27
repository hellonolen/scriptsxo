"use client";

import { useState, useEffect } from "react";
import { Pill, RefreshCw, AlertCircle, CheckCircle2, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

// Status helpers
const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: "Draft", color: "#6B7280", bg: "rgba(107,114,128,0.08)" },
    pending_review: { label: "Pending Review", color: "#D97706", bg: "rgba(217,119,6,0.08)" },
    signed: { label: "Signed", color: "#5B21B6", bg: "rgba(91,33,182,0.08)" },
    sent: { label: "Sent", color: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
    filling: { label: "Filling", color: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
    ready: { label: "Ready for Pickup", color: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
    picked_up: { label: "Picked Up", color: "#5B21B6", bg: "rgba(91,33,182,0.08)" },
    delivered: { label: "Delivered", color: "#5B21B6", bg: "rgba(91,33,182,0.08)" },
    cancelled: { label: "Cancelled", color: "#DC2626", bg: "rgba(220,38,38,0.08)" },
};

const MOCK_RX = [
    { id: "RX-001", medication: "Sumatriptan", dose: "50 mg", sig: "Take 1 tablet at headache onset, may repeat after 2h. Max 2/day.", status: "ready", pharmacy: "CVS — Main St", date: "Feb 24, 2026", refills: 2, daysSupply: 9 },
    { id: "RX-002", medication: "Ibuprofen", dose: "600 mg", sig: "Take 1 tablet every 6h with food. Max 4/day.", status: "picked_up", pharmacy: "Walgreens — Oak Ave", date: "Feb 10, 2026", refills: 0, daysSupply: 30 },
    { id: "RX-003", medication: "Ondansetron", dose: "4 mg", sig: "Take 1 tablet every 8h as needed for nausea.", status: "pending_review", pharmacy: "ScriptsXO Pharmacy", date: "Feb 26, 2026", refills: 0, daysSupply: 15 },
];

function RxCard({ rx }: { rx: typeof MOCK_RX[0] }) {
    const [expanded, setExpanded] = useState(false);
    const statusMeta = STATUS_LABELS[rx.status] ?? { label: rx.status, color: "#6B7280", bg: "rgba(107,114,128,0.08)" };

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(91,33,182,0.08)" }}>
                            <Pill size={16} style={{ color: "#5B21B6" }} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">{rx.medication} <span className="font-light text-muted-foreground">{rx.dose}</span></p>
                            <p className="text-xs text-muted-foreground mt-0.5">{rx.id} · {rx.date}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{rx.pharmacy}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] tracking-wide uppercase font-medium px-2.5 py-1 rounded-full"
                            style={{ color: statusMeta.color, background: statusMeta.bg }}>
                            {statusMeta.label}
                        </span>
                        <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>

                {/* Refills bar */}
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><RefreshCw size={11} />{rx.refills} refill{rx.refills !== 1 ? "s" : ""} remaining</span>
                    <span className="flex items-center gap-1.5"><Clock size={11} />{rx.daysSupply}-day supply</span>
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-3">
                    <div>
                        <p className="text-[10px] tracking-widest text-muted-foreground uppercase mb-1">Directions</p>
                        <p className="text-sm text-foreground">{rx.sig}</p>
                    </div>
                    <div className="flex gap-3 pt-1">
                        {rx.refills > 0 && (
                            <button className="px-4 py-2 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-90" style={{ background: "#5B21B6" }}>
                                Request Refill
                            </button>
                        )}
                        <button className="px-4 py-2 text-xs font-medium border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
                            Contact Pharmacy
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DashboardPrescriptionsPage() {
    const [email, setEmail] = useState<string | null>(null);
    const [sessionChecked, setSessionChecked] = useState(false);
    const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");

    useEffect(() => {
        const session = getSessionCookie();
        if (session?.email) setEmail(session.email);
        setSessionChecked(true);
    }, []);

    const patient = useQuery(api.patients.getByEmail, email ? { email } : "skip");
    const prescriptions = useQuery(
        api.prescriptions.getByPatient,
        patient ? { patientId: patient._id } : "skip"
    );

    const isLoading = !sessionChecked || (email !== null && patient === undefined);

    if (isLoading) {
        return (
            <AppShell>
                <div className="p-6 lg:p-10 max-w-[1200px]">
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={28} className="animate-spin text-muted-foreground" />
                    </div>
                </div>
            </AppShell>
        );
    }

    // Use real data if available, else fall back to mock
    const rxList = (prescriptions && prescriptions.length > 0) ? prescriptions : MOCK_RX;

    const ACTIVE_STATUSES = new Set(["draft", "pending_review", "signed", "sent", "filling", "ready"]);
    const filtered = rxList.filter((rx: any) => {
        if (filterStatus === "all") return true;
        const s = (rx.status ?? "").toLowerCase();
        if (filterStatus === "active") return ACTIVE_STATUSES.has(s);
        return !ACTIVE_STATUSES.has(s);
    });

    const activeCount = rxList.filter((rx: any) => ACTIVE_STATUSES.has((rx.status ?? "").toLowerCase())).length;
    const refillSoon = rxList.filter((rx: any) => (rx.refills ?? rx.refillsRemaining ?? 0) > 0).length;

    return (
        <AppShell>
            <div className="p-6 lg:p-10 max-w-[1200px]">

                {/* Header */}
                <header className="mb-8">
                    <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground mb-2">HEALTH</p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-light text-foreground tracking-[-0.02em]" style={{ fontFamily: "var(--font-heading)" }}>
                                My <span style={{ color: "#7C3AED" }}>Prescriptions</span>
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">Track your active medications and request refills.</p>
                        </div>
                    </div>
                </header>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                    {[
                        { label: "Active Rx", value: activeCount, icon: Pill, color: "#5B21B6" },
                        { label: "Refills Available", value: refillSoon, icon: RefreshCw, color: "#059669" },
                        { label: "Attention Needed", value: rxList.filter((rx: any) => rx.status === "pending_review").length, icon: AlertCircle, color: "#D97706" },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-card border border-border rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                                    <Icon size={13} style={{ color }} />
                                </div>
                            </div>
                            <p className="text-2xl font-semibold text-foreground">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex gap-1 border-b border-border mb-6">
                    {(["all", "active", "completed"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterStatus(f)}
                            className={`px-4 py-2.5 text-sm capitalize font-medium transition-colors border-b-2 -mb-px ${filterStatus === f ? "border-[#5B21B6] text-[#5B21B6]" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        >
                            {f === "all" ? "All Prescriptions" : f === "active" ? "Active" : "Completed"}
                        </button>
                    ))}
                </div>

                {/* Rx list */}
                <div className="space-y-3">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <CheckCircle2 size={40} className="text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No prescriptions in this category.</p>
                        </div>
                    ) : (
                        filtered.map((rx: any) => <RxCard key={rx.id ?? rx._id} rx={rx} />)
                    )}
                </div>

            </div>
        </AppShell>
    );
}
