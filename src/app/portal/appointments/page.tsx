"use client";

import { Video, Calendar, Clock, CheckCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";

/* ---------------------------------------------------------------------------
   DATA
   --------------------------------------------------------------------------- */

const UPCOMING = {
  title: "AI Consultation Follow-up",
  date: "Feb 15, 2026",
  time: "2:00 PM",
  type: "Video Call",
};

const PAST_APPOINTMENTS = [
  {
    title: "AI Screening Consultation",
    date: "Feb 7, 2026",
    status: "Completed" as const,
  },
  {
    title: "Initial Intake Review",
    date: "Jan 20, 2026",
    status: "Completed" as const,
  },
] as const;

/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

export default function AppointmentsPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1100px]">

        {/* ---- HEADER ---- */}
        <header className="mb-10">
          <p className="eyebrow mb-2">Schedule</p>
          <h1
            className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Your <span className="text-[#7C3AED]">Appointments</span>
          </h1>
        </header>

        {/* ---- UPCOMING ---- */}
        <section className="mb-10">
          <p className="eyebrow mb-4 text-[#7C3AED]">Upcoming</p>

          <div className="glass-card">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex items-center justify-center shrink-0" style={{ background: "rgba(124, 58, 237, 0.08)" }}>
                  <Video size={20} className="text-[#7C3AED]" aria-hidden="true" />
                </div>
                <div>
                  <h3
                    className="text-lg font-light text-foreground mb-1"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {UPCOMING.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground font-light">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={13} aria-hidden="true" />
                      {UPCOMING.date}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={13} aria-hidden="true" />
                      {UPCOMING.time}
                    </span>
                  </div>
                  <span className="text-[9px] tracking-[0.15em] uppercase font-medium px-2.5 py-1 text-[#0D6E8A] bg-[#0D6E8A]/8 inline-block mt-3">
                    {UPCOMING.type}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-5 border-t border-border flex gap-3">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-[11px] tracking-[0.15em] uppercase font-medium hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg, #7C3AED, #E11D48)" }}>
                <Video size={14} aria-hidden="true" />
                Join Call
              </button>
              <button className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-foreground text-[11px] tracking-[0.15em] uppercase font-medium hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors">
                Reschedule
              </button>
            </div>
          </div>
        </section>

        {/* ---- PAST ---- */}
        <section>
          <p className="eyebrow mb-4">Past</p>

          <div className="space-y-3">
            {PAST_APPOINTMENTS.map((appt) => (
              <div
                key={appt.title}
                className="glass-card flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-muted flex items-center justify-center shrink-0">
                    <CheckCircle size={14} className="text-[#16A34A]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-foreground">
                      {appt.title}
                    </p>
                    <p className="text-[12px] text-muted-foreground font-light">
                      {appt.date}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] tracking-[0.15em] uppercase font-medium px-2.5 py-1 text-[#16A34A] bg-[#16A34A]/8">
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </AppShell>
  );
}
