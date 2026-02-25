"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Video, Phone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

const TODAY_SCHEDULE = [
  { time: "9:00 AM", patient: "Elena Vasquez", type: "video" as const, reason: "Skin rash follow-up", status: "completed" as const },
  { time: "9:30 AM", patient: "Marcus Rivera", type: "phone" as const, reason: "Prescription refill review", status: "completed" as const },
  { time: "10:15 AM", patient: "David Chen", type: "video" as const, reason: "Blood pressure management", status: "in_progress" as const },
  { time: "11:00 AM", patient: "Sophia Patel", type: "video" as const, reason: "New patient intake", status: "upcoming" as const },
  { time: "1:30 PM", patient: "Amara Johnson", type: "phone" as const, reason: "Sore throat evaluation", status: "upcoming" as const },
  { time: "2:00 PM", patient: "James Wilson", type: "video" as const, reason: "Diabetes follow-up", status: "upcoming" as const },
  { time: "3:00 PM", patient: "Lisa Park", type: "video" as const, reason: "Mental health check-in", status: "upcoming" as const },
];

const STATUS_VARIANT: Record<string, "success" | "info" | "secondary"> = {
  completed: "success",
  in_progress: "info",
  upcoming: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  upcoming: "Upcoming",
};

export default function ProviderSchedulePage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1000px]">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/provider" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow mb-0.5">PROVIDER PORTAL</p>
            <h1
              className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Schedule
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">
          {today} -- {TODAY_SCHEDULE.length} appointments
        </p>

        {/* Today's Schedule */}
        <div className="space-y-3">
          {TODAY_SCHEDULE.map((appt, i) => (
            <div
              key={i}
              className={`bg-card border border-border rounded-lg p-4 flex items-center justify-between ${
                appt.status === "in_progress" ? "ring-1 ring-primary/30" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 text-center">
                  <span className="text-sm font-medium text-foreground">{appt.time}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  {appt.type === "video" ? (
                    <Video size={14} className="text-primary" aria-hidden="true" />
                  ) : (
                    <Phone size={14} className="text-primary" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{appt.patient}</p>
                  <p className="text-xs text-muted-foreground">{appt.reason}</p>
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[appt.status]}>
                {STATUS_LABEL[appt.status]}
              </Badge>
            </div>
          ))}
        </div>

        {/* Availability note */}
        <div className="mt-8 bg-muted/30 border border-border rounded-lg p-5 text-center">
          <Calendar size={24} className="text-muted-foreground mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Schedule management and availability settings will sync with Google Calendar via Composio.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
