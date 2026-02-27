"use client";

import { useState } from "react";
import { Search, Package, Truck, CheckCircle2, Clock, Filter, ChevronRight, XCircle, MapPin, Pill, Calendar, Phone, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";

/* ── Mock Data ── */
type TrackingStatus = "pending" | "dispensed" | "shipped" | "delivered" | "cancelled";

interface TrackingOrder {
    id: string;
    orderId: string;
    patient: string;
    patientEmail: string;
    medication: string;
    dosage: string;
    pharmacy: string;
    pharmacyCity: string;
    status: TrackingStatus;
    dispensedAt: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    estimatedDelivery: string;
    trackingNumber: string | null;
    prescribedAt: string;
    prescribingProvider: string;
    refills: number;
    quantity: string;
}

const MOCK_ORDERS: TrackingOrder[] = [
    {
        id: "1",
        orderId: "RX-20240147",
        patient: "Sarah Mitchell",
        patientEmail: "sarah.m@email.com",
        medication: "Semaglutide",
        dosage: "0.25 mg/week",
        pharmacy: "Belmar Pharmacy",
        pharmacyCity: "Louisville, KY",
        status: "shipped",
        dispensedAt: "2026-02-24T09:30:00Z",
        shippedAt: "2026-02-24T14:00:00Z",
        deliveredAt: null,
        estimatedDelivery: "2026-02-27",
        trackingNumber: "1Z999AA10123456784",
        prescribedAt: "2026-02-22T16:00:00Z",
        prescribingProvider: "Dr. James Carter, MD",
        refills: 2,
        quantity: "4-week supply",
    },
    {
        id: "2",
        orderId: "RX-20240146",
        patient: "Marcus Johnson",
        patientEmail: "marcus.j@email.com",
        medication: "Tirzepatide",
        dosage: "2.5 mg/week",
        pharmacy: "Empower Pharmacy",
        pharmacyCity: "Houston, TX",
        status: "delivered",
        dispensedAt: "2026-02-20T10:00:00Z",
        shippedAt: "2026-02-20T15:30:00Z",
        deliveredAt: "2026-02-23T12:00:00Z",
        estimatedDelivery: "2026-02-23",
        trackingNumber: "1Z999AA10123456785",
        prescribedAt: "2026-02-18T14:00:00Z",
        prescribingProvider: "Dr. Angela White, MD",
        refills: 3,
        quantity: "4-week supply",
    },
    {
        id: "3",
        orderId: "RX-20240148",
        patient: "Diana Perez",
        patientEmail: "diana.p@email.com",
        medication: "Metformin ER",
        dosage: "500 mg, twice daily",
        pharmacy: "Strive Pharmacy",
        pharmacyCity: "Scottsdale, AZ",
        status: "dispensed",
        dispensedAt: "2026-02-26T08:00:00Z",
        shippedAt: null,
        deliveredAt: null,
        estimatedDelivery: "2026-02-28",
        trackingNumber: null,
        prescribedAt: "2026-02-25T10:30:00Z",
        prescribingProvider: "Dr. James Carter, MD",
        refills: 5,
        quantity: "30-day supply",
    },
    {
        id: "4",
        orderId: "RX-20240149",
        patient: "Robert Chen",
        patientEmail: "robert.c@email.com",
        medication: "Bupropion SR",
        dosage: "150 mg, twice daily",
        pharmacy: "Hallandale Pharmacy",
        pharmacyCity: "Hallandale Beach, FL",
        status: "pending",
        dispensedAt: null,
        shippedAt: null,
        deliveredAt: null,
        estimatedDelivery: "2026-03-01",
        trackingNumber: null,
        prescribedAt: "2026-02-26T11:00:00Z",
        prescribingProvider: "Dr. Angela White, MD",
        refills: 2,
        quantity: "30-day supply",
    },
    {
        id: "5",
        orderId: "RX-20240144",
        patient: "Aisha Thompson",
        patientEmail: "aisha.t@email.com",
        medication: "Naltrexone",
        dosage: "50 mg, daily",
        pharmacy: "Empower Pharmacy",
        pharmacyCity: "Houston, TX",
        status: "cancelled",
        dispensedAt: null,
        shippedAt: null,
        deliveredAt: null,
        estimatedDelivery: "—",
        trackingNumber: null,
        prescribedAt: "2026-02-15T09:00:00Z",
        prescribingProvider: "Dr. James Carter, MD",
        refills: 0,
        quantity: "30-day supply",
    },
    {
        id: "6",
        orderId: "RX-20240143",
        patient: "Tyler Brooks",
        patientEmail: "tyler.b@email.com",
        medication: "Semaglutide",
        dosage: "0.5 mg/week",
        pharmacy: "Belmar Pharmacy",
        pharmacyCity: "Louisville, KY",
        status: "delivered",
        dispensedAt: "2026-02-14T09:00:00Z",
        shippedAt: "2026-02-14T15:00:00Z",
        deliveredAt: "2026-02-17T11:00:00Z",
        estimatedDelivery: "2026-02-17",
        trackingNumber: "1Z999AA10123456780",
        prescribedAt: "2026-02-12T14:00:00Z",
        prescribingProvider: "Dr. Angela White, MD",
        refills: 1,
        quantity: "4-week supply",
    },
];

const STATUS_CONFIG: Record<TrackingStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    pending: { label: "Pending", color: "#B45309", bg: "rgba(180,83,9,0.08)", icon: Clock },
    dispensed: { label: "Dispensed", color: "#7C3AED", bg: "rgba(124,58,237,0.08)", icon: Pill },
    shipped: { label: "Shipped", color: "#0369A1", bg: "rgba(3,105,161,0.08)", icon: Truck },
    delivered: { label: "Delivered", color: "#059669", bg: "rgba(5,150,105,0.08)", icon: CheckCircle2 },
    cancelled: { label: "Cancelled", color: "#DC2626", bg: "rgba(220,38,38,0.08)", icon: XCircle },
};

const ALL_STATUSES: TrackingStatus[] = ["pending", "dispensed", "shipped", "delivered", "cancelled"];

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(iso: string | null): string {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function StatusBadge({ status }: { status: TrackingStatus }) {
    const cfg = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide"
            style={{ color: cfg.color, background: cfg.bg }}
        >
            <Icon size={11} />
            {cfg.label}
        </span>
    );
}

function TrackingTimeline({ order }: { order: TrackingOrder }) {
    const steps = [
        { label: "Prescribed", date: order.prescribedAt, done: true },
        { label: "Dispensed", date: order.dispensedAt, done: !!order.dispensedAt },
        { label: "Shipped", date: order.shippedAt, done: !!order.shippedAt },
        { label: "Delivered", date: order.deliveredAt, done: !!order.deliveredAt },
    ];

    return (
        <div className="flex items-start gap-0 mt-5 pt-4 border-t border-border">
            {steps.map((step, i) => (
                <div key={step.label} className="flex-1 relative">
                    <div className="flex flex-col items-center">
                        <div
                            className="w-7 h-7 rounded-full border-2 flex items-center justify-center mb-1.5 transition-colors"
                            style={{
                                borderColor: step.done ? "#5B21B6" : "var(--border)",
                                background: step.done ? "#5B21B6" : "transparent",
                            }}
                        >
                            {step.done && <CheckCircle2 size={13} className="text-white" />}
                        </div>
                        {i < steps.length - 1 && (
                            <div
                                className="absolute top-3.5 left-1/2 w-full h-0.5 -z-0"
                                style={{ background: step.done ? "#5B21B6" : "var(--border)", marginLeft: "14px" }}
                            />
                        )}
                        <p className="text-[10px] font-medium text-center" style={{ color: step.done ? "#5B21B6" : "var(--muted-foreground)" }}>
                            {step.label}
                        </p>
                        {step.date && (
                            <p className="text-[9px] text-muted-foreground text-center mt-0.5">{formatDate(step.date)}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function TrackingPage() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<TrackingStatus | "all">("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const filtered = MOCK_ORDERS.filter((o) => {
        const matchSearch =
            !search ||
            o.patient.toLowerCase().includes(search.toLowerCase()) ||
            o.medication.toLowerCase().includes(search.toLowerCase()) ||
            o.orderId.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || o.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const counts: Record<string, number> = MOCK_ORDERS.reduce(
        (acc, o) => ({ ...acc, [o.status]: (acc[o.status] || 0) + 1 }),
        {} as Record<string, number>
    );

    return (
        <AppShell>
            <div className="p-6 lg:p-10 max-w-[1400px]">

                <header className="mb-8">
                    <PageHeader
                        eyebrow="OPERATIONS"
                        title="Prescription Tracking"
                        description="Monitor every prescription order from dispatch to delivery in real time."
                        backHref="/admin"
                    />
                </header>

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
                    {ALL_STATUSES.map((s) => {
                        const cfg = STATUS_CONFIG[s];
                        const Icon = cfg.icon;
                        return (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                                className={`text-left p-4 rounded-xl border transition-all ${statusFilter === s ? "border-primary shadow-md" : "border-border bg-card hover:border-primary/30"
                                    }`}
                            >
                                <Icon size={18} style={{ color: cfg.color }} className="mb-2" />
                                <p className="text-lg font-semibold text-foreground">{counts[s] ?? 0}</p>
                                <p className="text-xs text-muted-foreground">{cfg.label}</p>
                            </button>
                        );
                    })}
                </div>

                {/* ── Filter Bar ── */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by patient, medication, or order ID…"
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                        />
                    </div>
                    <div className="relative">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as TrackingStatus | "all")}
                            className="pl-8 pr-8 py-2.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            {ALL_STATUSES.map((s) => (
                                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Orders List ── */}
                {filtered.length === 0 ? (
                    <div className="border border-border rounded-xl p-16 text-left bg-card">
                        <Package size={32} className="text-muted-foreground mb-3" />
                        <p className="text-base font-medium text-foreground mb-1">No orders found</p>
                        <p className="text-sm text-muted-foreground">Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((order) => {
                            const isExpanded = expandedId === order.id;
                            return (
                                <div
                                    key={order.id}
                                    className="bg-card border border-border rounded-xl overflow-hidden transition-all"
                                >
                                    {/* Row */}
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                        className="w-full text-left p-5 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                                    >
                                        {/* Icon */}
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: STATUS_CONFIG[order.status].bg }}
                                        >
                                            <Pill size={17} style={{ color: STATUS_CONFIG[order.status].color }} />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium text-foreground">{order.medication}</span>
                                                <span className="text-xs text-muted-foreground">{order.dosage}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                                <span>{order.patient}</span>
                                                <span className="text-border">·</span>
                                                <span>{order.orderId}</span>
                                                <span className="text-border">·</span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={10} />
                                                    {order.pharmacy}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status + ETA */}
                                        <div className="shrink-0 text-right hidden sm:block">
                                            <StatusBadge status={order.status} />
                                            {order.status !== "cancelled" && order.status !== "delivered" && (
                                                <p className="text-xs text-muted-foreground mt-1.5">
                                                    ETA: {formatDate(order.estimatedDelivery)}
                                                </p>
                                            )}
                                        </div>

                                        <ChevronRight
                                            size={15}
                                            className={`text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                        />
                                    </button>

                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <div className="px-5 pb-5 border-t border-border animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-4">
                                                {/* Order Details */}
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">Order Details</p>
                                                    <div className="space-y-2">
                                                        {[
                                                            ["Order ID", order.orderId],
                                                            ["Quantity", order.quantity],
                                                            ["Refills Remaining", `${order.refills}`],
                                                            ["Prescribed", `${formatDate(order.prescribedAt)} ${formatTime(order.prescribedAt)}`],
                                                            ["Provider", order.prescribingProvider],
                                                        ].map(([label, value]) => (
                                                            <div key={label} className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">{label}</span>
                                                                <span className="font-medium text-foreground text-right">{value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Pharmacy Details */}
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">Pharmacy</p>
                                                    <div className="space-y-2">
                                                        {[
                                                            ["Name", order.pharmacy],
                                                            ["Location", order.pharmacyCity],
                                                            ["Dispensed", order.dispensedAt ? `${formatDate(order.dispensedAt)} ${formatTime(order.dispensedAt)}` : "Pending"],
                                                            ["Shipped", order.shippedAt ? `${formatDate(order.shippedAt)} ${formatTime(order.shippedAt)}` : "Pending"],
                                                            ["Tracking #", order.trackingNumber ?? "Not yet assigned"],
                                                        ].map(([label, value]) => (
                                                            <div key={label} className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">{label}</span>
                                                                <span className="font-medium text-foreground text-right">{value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Patient Info */}
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">Patient</p>
                                                    <div className="space-y-2">
                                                        {[
                                                            ["Name", order.patient],
                                                            ["Email", order.patientEmail],
                                                            ["Est. Delivery", formatDate(order.estimatedDelivery)],
                                                            ["Status", STATUS_CONFIG[order.status].label],
                                                        ].map(([label, value]) => (
                                                            <div key={label} className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">{label}</span>
                                                                <span className="font-medium text-foreground text-right">{value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="pt-3 border-t border-border flex gap-2">
                                                        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md bg-primary/8 text-primary hover:bg-primary/15 transition-colors">
                                                            <Phone size={12} />
                                                            Contact Patient
                                                        </button>
                                                        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border border-border text-foreground hover:bg-muted transition-colors">
                                                            <ArrowRight size={12} />
                                                            View Rx
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Timeline */}
                                            <TrackingTimeline order={order} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
