"use client";

import { useState, useEffect } from "react";
import { Calendar, Video, Phone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { getSessionCookie } from "@/lib/auth";
import { shouldShowDemoData } from "@/lib/demo";
import { SEED_SCHEDULE } from "@/lib/seed-data";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const STATUS_VARIANT: Record<string, "success" | "info" | "secondary"> = {
  completed:   "success",
  in_progress: "info",
  upcoming:    "secondary",
  scheduled:   "secondary",
  waiting:     "info",
};

const STATUS_LABEL: Record<string, string> = {
  completed:   "Completed",
  in_progress: "In Progress",
  upcoming:    "Upcoming",
  scheduled:   "Scheduled",
  waiting:     "Waiting",
};

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function ProviderSchedulePage() {
  const [showDemo, setShowDemo] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setShowDemo(shouldShowDemoData());
    const session = getSessionCookie();
    if (session?.email) setEmail(session.email);
  }, []);

  const consultations = useQuery(
    api.consultations.getProviderQueue,
    !showDemo && email ? { providerEmail: email } : "skip"
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  // Build display rows from real consultations filtered to today
  const { start, end } = todayBounds();
  const realRows = (consultations ?? [])
    .filter((c: any) => c.scheduledAt >= start && c.scheduledAt <= end)
    .sort((a: any, b: any) => a.scheduledAt - b.scheduledAt)
    .map((c: any) => ({
      time:    formatTime(c.scheduledAt),
      patient: c.patientName ?? "Patient",
      type:    (c.type === "phone" ? "phone" : "video") as "video" | "phone",
      reason:  c.chiefComplaint ?? "Consultation",
      status:  c.status,
    }));

  const rows = showDemo ? SEED_SCHEDULE : realRows;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <PageHeader
          eyebrow="PROVIDER PORTAL"
          title="Schedule"
          description={`${today} — ${rows.length} appointment${rows.length !== 1 ? "s" : ""}`}
          backHref="/provider"
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No appointments today"
            description="Your schedule is clear. New consultations will appear here when assigned."
          />
        ) : (
          <div className="space-y-3">
            {rows.map((appt, i) => (
              <div
                key={i}
                className={`bg-card border border-border rounded-lg p-4 flex items-center justify-between ${
                  appt.status === "in_progress" || appt.status === "waiting" ? "ring-1 ring-primary/30" : ""
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
                <Badge variant={STATUS_VARIANT[appt.status] ?? "secondary"}>
                  {STATUS_LABEL[appt.status] ?? appt.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

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
