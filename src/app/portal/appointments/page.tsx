import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, ArrowLeft, Video, Clock } from "lucide-react";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Appointments",
  description: "View your upcoming and past telehealth appointments.",
};

export default function AppointmentsPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/portal" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-foreground">
                Appointments
              </h1>
              <p className="text-sm text-muted-foreground">
                Your upcoming and past consultations.
              </p>
            </div>
          </div>

          {/* Upcoming */}
          <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming</h2>
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Video size={22} className="text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Follow-up Consultation</h3>
                  <p className="text-sm text-muted-foreground">Dr. Martinez -- General Medicine</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Calendar size={12} aria-hidden="true" />
                    Feb 15, 2026
                    <Clock size={12} aria-hidden="true" />
                    2:00 PM EST
                  </div>
                </div>
              </div>
              <Badge variant="info">Scheduled</Badge>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-[5px] hover:bg-primary/90 transition-colors">
                <Video size={14} aria-hidden="true" />
                Join
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 border border-border text-foreground text-sm rounded-[5px] hover:bg-muted transition-colors">
                Reschedule
              </button>
            </div>
          </div>

          {/* Past */}
          <h2 className="text-lg font-semibold text-foreground mb-4">Past Appointments</h2>
          <div className="space-y-3">
            {[
              { date: "Feb 7, 2026", provider: "Dr. Johnson", type: "Urgent Care", status: "Completed" },
              { date: "Jan 20, 2026", provider: "Dr. Martinez", type: "General Medicine", status: "Completed" },
            ].map((appt, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                    <Video size={14} className="text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{appt.provider} -- {appt.type}</p>
                    <p className="text-xs text-muted-foreground">{appt.date}</p>
                  </div>
                </div>
                <Badge variant="success">{appt.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
