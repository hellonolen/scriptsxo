"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar, Video, Phone, ChevronRight, CheckCircle2, Loader2, User } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";
import Link from "next/link";

// Mock provider availability schedule
const PROVIDERS = [
    {
        id: "p1",
        name: "Dr. Angela White",
        title: "MD, Internal Medicine",
        initials: "AW",
        states: ["FL", "TX", "GA"],
        nextAvailable: "Today, 4:00 PM",
        slots: [
            { day: "Today", date: "Feb 26", times: ["4:00 PM", "4:30 PM", "5:00 PM"] },
            { day: "Thu", date: "Feb 27", times: ["9:00 AM", "10:00 AM", "2:00 PM", "3:30 PM"] },
            { day: "Fri", date: "Feb 28", times: ["8:30 AM", "11:00 AM", "1:00 PM"] },
        ],
    },
    {
        id: "p2",
        name: "Dr. James Carter",
        title: "MD, Family Medicine",
        initials: "JC",
        states: ["FL", "CA", "NY"],
        nextAvailable: "Tomorrow, 9:00 AM",
        slots: [
            { day: "Thu", date: "Feb 27", times: ["9:00 AM", "11:30 AM", "2:30 PM"] },
            { day: "Fri", date: "Feb 28", times: ["10:00 AM", "3:00 PM", "4:00 PM"] },
            { day: "Mon", date: "Mar 2", times: ["8:00 AM", "9:30 AM", "1:00 PM", "2:30 PM"] },
        ],
    },
];

export default function PortalOfficeHoursPage() {
    const [ready, setReady] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0].id);
    const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string } | null>(null);
    const [consultType, setConsultType] = useState<"video" | "phone">("video");
    const [reason, setReason] = useState("");
    const [booked, setBooked] = useState(false);

    useEffect(() => {
        const session = getSessionCookie();
        setReady(true);
    }, []);

    const provider = PROVIDERS.find(p => p.id === selectedProvider)!;

    function handleBook() {
        if (!selectedSlot || !reason.trim()) return;
        setBooked(true);
    }

    if (!ready) {
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

    if (booked) {
        return (
            <AppShell>
                <div className="p-6 lg:p-10 max-w-[800px] mx-auto">
                    <div className="text-center py-20">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(91,33,182,0.10)" }}>
                            <CheckCircle2 size={28} style={{ color: "#5B21B6" }} />
                        </div>
                        <h2 className="text-2xl font-light text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                            Consultation Booked
                        </h2>
                        <p className="text-sm text-muted-foreground mb-1">
                            {selectedSlot?.day} at {selectedSlot?.time} with {provider.name}
                        </p>
                        <p className="text-xs text-muted-foreground mb-8">You'll receive a confirmation email shortly.</p>
                        <div className="flex justify-center gap-3">
                            <Link href="/portal/appointments" className="px-5 py-2.5 text-sm font-medium text-white rounded-lg" style={{ background: "#5B21B6" }}>
                                View Appointments
                            </Link>
                            <button onClick={() => { setBooked(false); setSelectedSlot(null); setReason(""); }} className="px-5 py-2.5 text-sm border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
                                Book Another
                            </button>
                        </div>
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="p-6 lg:p-10 max-w-[1200px]">

                {/* Header */}
                <header className="mb-8">
                    <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground mb-2">SCHEDULE</p>
                    <h1 className="text-3xl font-light text-foreground tracking-[-0.02em]" style={{ fontFamily: "var(--font-heading)" }}>
                        Office <span style={{ color: "#7C3AED" }}>Hours</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Book an available slot with a licensed provider in your state.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Provider selection */}
                    <div className="space-y-4">
                        <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground">Select Provider</p>
                        {PROVIDERS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => { setSelectedProvider(p.id); setSelectedSlot(null); }}
                                className={`w-full text-left p-4 rounded-xl border transition-colors ${selectedProvider === p.id ? "border-[#5B21B6] bg-[#5B21B6]/5" : "border-border bg-card hover:border-[#5B21B6]/40"}`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0" style={{ background: "#5B21B6" }}>
                                        {p.initials}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                                        <p className="text-xs text-muted-foreground">{p.title}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar size={11} />
                                    <span>Next: {p.nextAvailable}</span>
                                </div>
                                <div className="flex gap-1 mt-2">
                                    {p.states.map(s => (
                                        <span key={s} className="text-[9px] tracking-wide px-1.5 py-0.5 rounded border border-border text-muted-foreground">{s}</span>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Time slot picker */}
                    <div className="space-y-4">
                        <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground">Select a Time</p>
                        {provider.slots.map(daySlot => (
                            <div key={daySlot.day} className="bg-card border border-border rounded-xl p-4">
                                <p className="text-xs font-medium text-foreground mb-3">{daySlot.day} · {daySlot.date}</p>
                                <div className="flex flex-wrap gap-2">
                                    {daySlot.times.map(time => (
                                        <button
                                            key={time}
                                            onClick={() => setSelectedSlot({ day: `${daySlot.day}, ${daySlot.date}`, time })}
                                            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${selectedSlot?.time === time && selectedSlot?.day.startsWith(daySlot.day) ? "border-[#5B21B6] bg-[#5B21B6] text-white" : "border-border text-foreground hover:border-[#5B21B6]/40"}`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Booking form */}
                    <div className="space-y-4">
                        <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground">Booking Details</p>
                        <div className="bg-card border border-border rounded-xl p-5 space-y-5">

                            {/* Selected slot summary */}
                            {selectedSlot ? (
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Selected</p>
                                    <p className="text-sm font-medium text-foreground">{selectedSlot.day} at {selectedSlot.time}</p>
                                    <p className="text-xs text-muted-foreground">{provider.name}</p>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">Select a time slot to continue.</p>
                            )}

                            {/* Consultation type */}
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Consultation Type</p>
                                <div className="flex gap-2">
                                    {(["video", "phone"] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setConsultType(t)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg border transition-colors ${consultType === t ? "border-[#5B21B6] bg-[#5B21B6]/8 text-[#5B21B6]" : "border-border text-muted-foreground hover:border-[#5B21B6]/40"}`}
                                        >
                                            {t === "video" ? <Video size={12} /> : <Phone size={12} />}
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Reason for Visit</p>
                                <textarea
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Briefly describe your concern..."
                                    rows={3}
                                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#5B21B6] transition-colors resize-none"
                                />
                            </div>

                            <button
                                onClick={handleBook}
                                disabled={!selectedSlot || !reason.trim()}
                                className="w-full py-2.5 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                style={{ background: "#5B21B6" }}
                            >
                                <CheckCircle2 size={14} />
                                Confirm Booking
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </AppShell>
    );
}
