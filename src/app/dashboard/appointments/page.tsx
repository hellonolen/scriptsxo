"use client";

import { useState, useEffect } from "react";
import { Video, Calendar, Clock, CheckCircle2, Phone, Plus, Loader2, ChevronRight, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    scheduled: { label: "Scheduled", color: "#5B21B6", bg: "rgba(91,33,182,0.08)" },
    waiting: { label: "In Queue", color: "#0369A1", bg: "rgba(3,105,161,0.08)" },
    assigned: { label: "Assigned", color: "#D97706", bg: "rgba(217,119,6,0.08)" },
    in_progress: { label: "In Progress", color: "#059669", bg: "rgba(5,150,105,0.08)" },
    completed: { label: "Completed", color: "#059669", bg: "rgba(5,150,105,0.08)" },
    cancelled: { label: "Cancelled", color: "#DC2626", bg: "rgba(220,38,38,0.08)" },
};

const MOCK_UPCOMING = [
    { id: "a1", type: "video", provider: "Dr. Angela White, MD", date: "Today, Feb 26", time: "2:30 PM", reason: "Weight management follow-up", status: "scheduled" },
    { id: "a2", type: "phone", provider: "Dr. James Carter, MD", date: "Tomorrow, Feb 27", time: "9:00 AM", reason: "Medication adjustment check-in", status: "scheduled" },
];
const MOCK_PAST = [
    { id: "p1", type: "video", provider: "Dr. Angela White, MD", date: "Feb 24, 2026", time: "11:00 AM", reason: "Initial consultation", status: "completed", duration: "18 min", rxIssued: true },
    { id: "p2", type: "video", provider: "Dr. James Carter, MD", date: "Feb 10, 2026", time: "3:00 PM", reason: "GLP-1 initiation", status: "completed", duration: "22 min", rxIssued: true },
    { id: "p3", type: "phone", provider: "Dr. Angela White, MD", date: "Jan 28, 2026", time: "10:30 AM", reason: "Symptom check-in", status: "completed", duration: "12 min", rxIssued: false },
];

function AppointmentCard({ appt, isPast }: { appt: any; isPast: boolean }) {
    const meta = STATUS_META[appt.status] ?? { label: appt.status, color: "#6B7280", bg: "rgba(107,114,128,0.08)" };
    return (
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(91,33,182,0.08)" }}>
                {appt.type === "video" ? <Video size={16} style={{ color: "#5B21B6" }} /> : <Phone size={16} style={{ color: "#5B21B6" }} />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{appt.provider}</p>
                    <span className="text-[10px] tracking-wide px-2 py-0.5 rounded-full font-medium capitalize" style={{ color: meta.color, background: meta.bg }}>
                        {meta.label}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Calendar size={10} />{appt.date}</span>
                    <span className="flex items-center gap-1"><Clock size={10} />{appt.time}</span>
                    {isPast && appt.duration && <span className="flex items-center gap-1"><Clock size={10} />{appt.duration}</span>}
                </div>
                <p className="text-xs text-muted-foreground italic mt-1">{appt.reason}</p>
                {isPast && appt.rxIssued && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 size={11} />Prescription issued</p>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {!isPast ? (
                    <>
                        <button className="px-3 py-1.5 text-xs border border-border rounded-lg text-foreground hover:bg-muted transition-colors">Reschedule</button>
                        <Link href="/consultation/waiting-room" className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-90" style={{ background: "#5B21B6" }}>
                            Join <ChevronRight size={12} />
                        </Link>
                    </>
                ) : (
                    <button className="px-3 py-1.5 text-xs border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
                        View Notes
                    </button>
                )}
            </div>
        </div>
    );
}

export default function DashboardAppointmentsPage() {
    const [email, setEmail] = useState<string | null>(null);
    const [sessionChecked, setSessionChecked] = useState(false);
    const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

    useEffect(() => {
        const session = getSessionCookie();
        if (session?.email) setEmail(session.email);
        setSessionChecked(true);
    }, []);

    const patient = useQuery(api.patients.getByEmail, email ? { email } : "skip");
    const consultations = useQuery(api.consultations.getByPatient, patient ? { patientId: patient._id } : "skip");

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

    const ACTIVE = new Set(["scheduled", "waiting", "assigned", "in_progress"]);
    const allConsults = consultations ?? [];
    const upcoming = allConsults.length > 0
        ? allConsults.filter((c: any) => ACTIVE.has(c.status))
        : MOCK_UPCOMING;
    const past = allConsults.length > 0
        ? allConsults.filter((c: any) => c.status === "completed" || c.status === "cancelled")
        : MOCK_PAST;

    return (
        <AppShell>
            <div className="p-6 lg:p-10 max-w-[1200px]">

                {/* Header */}
                <header className="mb-8">
                    <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground mb-2">SCHEDULE</p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-light text-foreground tracking-[-0.02em]" style={{ fontFamily: "var(--font-heading)" }}>
                                My <span style={{ color: "#7C3AED" }}>Appointments</span>
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">Upcoming and past consultations with your care team.</p>
                        </div>
                        <Link
                            href="/consultation/waiting-room"
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-90 shrink-0"
                            style={{ background: "#5B21B6" }}
                        >
                            <Plus size={14} />
                            New Consultation
                        </Link>
                    </div>
                </header>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: "Upcoming", value: upcoming.length, color: "#5B21B6" },
                        { label: "Completed (30d)", value: past.filter((c: any) => c.status === "completed" || (c.id && c.id.startsWith("p"))).length, color: "#059669" },
                        { label: "Next Appointment", value: upcoming.length > 0 ? (upcoming[0] as any).time ?? "—" : "None", color: "#6B7280" },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-card border border-border rounded-xl p-4">
                            <p className="text-xs text-muted-foreground mb-1">{label}</p>
                            <p className="text-xl font-semibold text-foreground" style={{ color }}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-border mb-6">
                    {(["upcoming", "past"] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2.5 text-sm capitalize font-medium transition-colors border-b-2 -mb-px ${tab === t ? "border-[#5B21B6] text-[#5B21B6]" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        >
                            {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="space-y-3">
                    {tab === "upcoming" ? (
                        upcoming.length === 0 ? (
                            <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
                                <AlertCircle size={36} className="text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground mb-4">No upcoming appointments.</p>
                                <Link href="/consultation/waiting-room" className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-white rounded-lg" style={{ background: "#5B21B6" }}>
                                    <Plus size={14} />Book a Consultation
                                </Link>
                            </div>
                        ) : (
                            upcoming.map((a: any) => <AppointmentCard key={a.id ?? a._id} appt={a} isPast={false} />)
                        )
                    ) : (
                        past.length === 0 ? (
                            <div className="text-center py-16">
                                <p className="text-sm text-muted-foreground">No past appointments yet.</p>
                            </div>
                        ) : (
                            past.map((a: any) => <AppointmentCard key={a.id ?? a._id} appt={a} isPast={true} />)
                        )
                    )}
                </div>

            </div>
        </AppShell>
    );
}
