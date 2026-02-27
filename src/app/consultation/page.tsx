"use client";

import { useState } from "react";
import { Video, Calendar, Clock, CheckCircle2, ChevronRight, Phone, Plus, User, Stethoscope, FileText, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import Link from "next/link";

/* ── Mock Data ── */
const STATS = [
  { label: "Scheduled Today", value: 3, sub: "next at 2:30 PM", color: "#5B21B6" },
  { label: "In Progress", value: 1, sub: "ongoing consultation", color: "#0369A1" },
  { label: "Completed (30d)", value: 47, sub: "4 this week", color: "#059669" },
];

const UPCOMING_SESSIONS = [
  {
    id: "c1",
    type: "video",
    patient: "Sarah Mitchell",
    provider: "Dr. James Carter, MD",
    time: "2:30 PM",
    date: "Today, Feb 26",
    reason: "Weight management follow-up",
    status: "scheduled",
  },
  {
    id: "c2",
    type: "video",
    patient: "Marcus Johnson",
    provider: "Dr. Angela White, MD",
    time: "4:00 PM",
    date: "Today, Feb 26",
    reason: "GLP-1 medication initiation",
    status: "scheduled",
  },
  {
    id: "c3",
    type: "phone",
    patient: "Diana Perez",
    provider: "Dr. James Carter, MD",
    time: "9:00 AM",
    date: "Tomorrow, Feb 27",
    reason: "Medication adjustment",
    status: "scheduled",
  },
];

const RECENT_SESSIONS = [
  {
    id: "r1",
    patient: "Tyler Brooks",
    provider: "Dr. Angela White, MD",
    type: "video",
    date: "Feb 25, 2026",
    duration: "18 min",
    outcome: "Prescription issued",
    rxId: "RX-20240143",
  },
  {
    id: "r2",
    patient: "Aisha Thompson",
    provider: "Dr. James Carter, MD",
    type: "video",
    date: "Feb 25, 2026",
    duration: "22 min",
    outcome: "Follow-up scheduled",
    rxId: null,
  },
  {
    id: "r3",
    patient: "Robert Chen",
    provider: "Dr. Angela White, MD",
    type: "phone",
    date: "Feb 24, 2026",
    duration: "12 min",
    outcome: "Prescription issued",
    rxId: "RX-20240149",
  },
  {
    id: "r4",
    patient: "Lisa Nguyen",
    provider: "Dr. James Carter, MD",
    type: "video",
    date: "Feb 24, 2026",
    duration: "25 min",
    outcome: "Prescription issued",
    rxId: "RX-20240141",
  },
];

export default function TelehealthCenterPage() {
  const [activeSection, setActiveSection] = useState<"upcoming" | "history">("upcoming");

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">

        {/* ── Header ── */}
        <header className="mb-8">
          <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground mb-2">TELEHEALTH</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-light text-foreground tracking-[-0.02em]">
                Telehealth Center
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Schedule, manage, and review all patient consultations.
              </p>
            </div>
            <Link
              href="/consultation/waiting-room"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-medium tracking-wide rounded-lg transition-colors"
            >
              <Plus size={14} />
              New Consultation
            </Link>
          </div>
        </header>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {STATS.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-5">
              <p className="text-3xl font-light text-foreground mb-1" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-sm font-medium text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Active consultation banner ── */}
        <div className="mb-8 bg-[#5B21B6] rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Video size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-medium text-sm">Consultation in progress</p>
            <p className="text-white/70 text-xs mt-0.5">
              Marcus Johnson · with Dr. Angela White · Started 14 min ago
            </p>
          </div>
          <Link
            href="/consultation/room"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#5B21B6] text-xs font-medium rounded-lg hover:bg-white/90 transition-colors"
          >
            <ArrowRight size={13} />
            Join Room
          </Link>
        </div>

        {/* ── Section Switch ── */}
        <div className="flex gap-1 border-b border-border mb-6">
          {(["upcoming", "history"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeSection === s
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              {s === "upcoming" ? "Upcoming Sessions" : "Session History"}
            </button>
          ))}
        </div>

        {/* ── Upcoming Sessions ── */}
        {activeSection === "upcoming" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {UPCOMING_SESSIONS.map((session) => (
              <div key={session.id} className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Type Icon */}
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(91,33,182,0.08)" }}
                >
                  {session.type === "video" ? (
                    <Video size={18} className="text-primary" />
                  ) : (
                    <Phone size={18} className="text-primary" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-foreground">{session.patient}</span>
                    <span
                      className="text-[10px] tracking-wide px-2 py-0.5 rounded-full font-medium capitalize"
                      style={{ background: "rgba(91,33,182,0.08)", color: "#5B21B6" }}
                    >
                      {session.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Stethoscope size={11} />
                      {session.provider}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={11} />
                      {session.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} />
                      {session.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 italic">{session.reason}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button className="px-4 py-2 text-xs font-medium border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
                    Reschedule
                  </button>
                  <Link
                    href="/consultation/room"
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <Video size={12} />
                    Join
                    <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            ))}

            {/* Schedule New */}
            <div className="flex items-center justify-center py-6 border border-dashed border-border rounded-xl">
              <Link
                href="/consultation/waiting-room"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus size={15} />
                Schedule a new consultation
              </Link>
            </div>
          </div>
        )}

        {/* ── Session History ── */}
        {activeSection === "history" && (
          <div className="animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {["Patient", "Provider", "Type", "Date", "Duration", "Outcome", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {RECENT_SESSIONS.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User size={12} className="text-primary" />
                          </div>
                          <span className="font-medium text-foreground text-sm">{s.patient}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{s.provider}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
                          style={{ background: "rgba(91,33,182,0.08)", color: "#5B21B6" }}
                        >
                          {s.type === "video" ? <Video size={9} /> : <Phone size={9} />}
                          {s.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{s.date}</td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">{s.duration}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span className="text-xs text-foreground">{s.outcome}</span>
                        </div>
                        {s.rxId && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{s.rxId}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <FileText size={12} />
                          Notes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
