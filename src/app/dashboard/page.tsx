"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Pill, Activity, Shield, TrendingUp, FileText, Headphones, CheckCircle2, Circle, CreditCard, IdCard, Clock, Video } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { getSessionCookie } from "@/lib/auth";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { MEMBER_REQUIREMENTS, getNextOfficeHoursDate, formatOfficeHoursSchedule, DEFAULT_OFFICE_HOURS } from "@/lib/membership-config";


/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

export default function DashboardPage() {
  const [firstName, setFirstName] = useState("there");
  const [email, setEmail] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const session = getSessionCookie();
    if (session?.name) {
      setFirstName(session.name.split(" ")[0]);
    }
    if (session?.email) {
      setEmail(session.email);
    }
    setSessionChecked(true);
  }, []);

  const isDemo = sessionChecked && email === null;

  // Fetch client data
  const patient = useQuery(
    api.patients.getByEmail,
    email ? { email } : "skip"
  );

  // Fetch prescriptions
  const prescriptions = useQuery(
    api.prescriptions.getByPatient,
    patient ? { patientId: patient._id } : "skip"
  );

  // Fetch consultations
  const consultations = useQuery(
    api.consultations.getByPatient,
    patient ? { patientId: patient._id } : "skip"
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const rxList = prescriptions ?? [];

  // Calculate stats from real data
  const activeRxCount = rxList.filter(
    (rx) => rx.status === "signed" || rx.status === "sent" || rx.status === "filling" || rx.status === "ready"
  ).length;

  const sortedRefills = rxList
    .filter((rx) => rx.nextRefillDate)
    .sort((a, b) => (a.nextRefillDate || 0) - (b.nextRefillDate || 0));

  const nextRefillDate = sortedRefills.length > 0
    ? new Date(sortedRefills[0].nextRefillDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "---";

  const consultationCount = consultations?.length || 0;

  const stats = [
    { value: String(activeRxCount), label: "Active Rx", icon: Pill },
    { value: nextRefillDate, label: "Next Refill", icon: Activity },
    { value: String(consultationCount), label: "Consultations", icon: TrendingUp },
  ];

  // Recent activity from consultations
  const recentActivity = (consultations || []).slice(0, 4).map((c) => {
        const timeAgo = (() => {
          const days = Math.floor((Date.now() - c.createdAt) / (1000 * 60 * 60 * 24));
          if (days === 0) return "Today";
          if (days === 1) return "1d ago";
          if (days < 7) return `${days}d ago`;
          if (days < 14) return "1w ago";
          return `${Math.floor(days / 7)}w ago`;
        })();

        return {
          title: c.type === "video" ? "Video Consultation" : "Consultation",
          detail: `${c.status === "completed" ? "Completed" : c.status === "in_progress" ? "In Progress" : "Scheduled"} --- ${c.type}`,
          time: timeAgo,
        };
      });

  // If we have a confirmed real session and the DB says no patient record exists,
  // show the intake CTA. (patient===null means the query resolved with no result,
  // not still loading.) Skip this when session isn't checked yet.
  // If no client record exists and not demo, show intake CTA
  if (sessionChecked && !isDemo && patient === null) {
    return (
      <AppShell>
        <div className="p-6 lg:p-10 max-w-[1200px]">
          <header className="mb-10">
            <p className="eyebrow mb-2">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1
              className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {greeting},{" "}
              <span className="gradient-text">
                {firstName}
              </span>
            </h1>
          </header>

          <div className="glass-card glow-accent text-center py-16">
            <FileText size={48} className="text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-light text-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
              Start Your Health Journey
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
              Complete your intake to unlock prescriptions, consultations, and personalized care.
            </p>
            <Link
              href="/dashboard/order"
              className="inline-flex items-center gap-2 px-6 py-3 text-white text-xs tracking-[0.15em] uppercase font-medium hover:opacity-90 transition-opacity"
              style={{ background: "var(--brand-gradient)" }}
            >
              New Order
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">

        {/* ---- HEADER ---- */}
        <header className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1
              className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {greeting},{" "}
              <span className="gradient-text">
                {firstName}
              </span>
            </h1>
          </div>
          <Link
            href="/dashboard/order"
            className="inline-flex items-center gap-2 px-6 py-3 text-white text-xs tracking-[0.15em] uppercase font-medium hover:opacity-90 transition-opacity self-start sm:self-auto"
            style={{ background: "var(--brand-gradient)" }}
          >
            <FileText size={14} aria-hidden="true" />
            New Order
          </Link>
        </header>

        {/* ---- BENTO STATS GRID ---- */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="stat-label">{stat.label}</span>
                <stat.icon size={16} className="text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="stat-value">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* ---- TWO-COLUMN BENTO: Prescriptions + Activity ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">

          {/* Prescriptions */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                Your Prescriptions
              </h2>
              <Link
                href="/dashboard/prescriptions"
                className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                View All
              </Link>
            </div>

            {rxList && rxList.length > 0 ? (
              <div className="space-y-3">
                {rxList.slice(0, 3).map((rx) => (
                  <div key={rx._id} className="glass-card group flex items-center gap-5" style={{ padding: "20px 24px" }}>
                    <div className="w-11 h-11 rounded-xl bg-brand-secondary-muted flex items-center justify-center shrink-0">
                      <Pill size={18} className="text-primary" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-medium text-foreground">{rx.medicationName}</h3>
                      <p className="text-[13px] text-muted-foreground">{rx.dosage} · {rx.directions}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={rx.status === "signed" || rx.status === "sent" || rx.status === "ready" ? "success" : "warning"}>
                        {rx.status === "signed" || rx.status === "sent" || rx.status === "ready" ? "Active" : rx.status}
                      </Badge>
                      {rx.nextRefillDate && (
                        <span className="text-[12px] text-muted-foreground hidden sm:block">
                          Refill {new Date(rx.nextRefillDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card text-center py-12">
                <Pill size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No prescriptions yet</p>
              </div>
            )}
          </section>

          {/* Activity + Member Status + Office Hours */}
          <div className="space-y-4">
            {/* Request Consultation */}
            <Link href="/consultation" className="block">
              <div className="glass-card glow-accent group hover:shadow-lg transition-shadow" style={{ padding: "20px 24px" }}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--brand-gradient)" }}
                  >
                    <Video size={16} className="text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-foreground">Request Consultation</p>
                    <p className="text-[11px] text-muted-foreground">Video, phone, or nurse call</p>
                  </div>
                  <ArrowRight size={14} className="ml-auto text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock size={10} aria-hidden="true" /> Same-day available</span>
                  <span className="w-px h-3 bg-border" />
                  <span className="flex items-center gap-1"><Shield size={10} aria-hidden="true" /> HIPAA encrypted</span>
                </div>
              </div>
            </Link>

            {/* Member requirements status card */}
            <div className="glass-card" style={{ padding: "20px 24px" }}>
              <div className="flex items-center gap-3 mb-3">
                <Shield size={16} className="text-success" aria-hidden="true" />
                <span className="text-[13px] font-medium text-foreground">Member Status</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-success" />
                  <span className="text-xs text-foreground">Government ID</span>
                  <Badge variant="success" className="ml-auto">Verified</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-success" />
                  <span className="text-xs text-foreground">Payment Method</span>
                  <Badge variant="success" className="ml-auto">Active</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-success" />
                  <span className="text-xs text-foreground">Membership</span>
                  <Badge variant="default" className="ml-auto">$97/mo</Badge>
                </div>
              </div>
            </div>

            {/* Office Hours widget */}
            <Link href="/dashboard/office-hours" className="block">
              <div className="glass-card group hover:shadow-md transition-shadow" style={{ padding: "20px 24px" }}>
                <div className="flex items-center gap-3 mb-3">
                  <Headphones size={16} className="text-primary" aria-hidden="true" />
                  <span className="text-[13px] font-medium text-foreground">Nurse Office Hours</span>
                  <Badge variant="default" className="ml-auto">Included</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {formatOfficeHoursSchedule()}
                </p>
                <div className="flex items-center gap-2 text-xs text-primary">
                  <Clock size={11} />
                  <span>
                    Next: {getNextOfficeHoursDate().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  <ArrowRight size={11} className="ml-auto group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Activity */}
            <div className="glass-card" style={{ padding: 0 }}>
              <div style={{ padding: "16px 24px 12px" }}>
                <h2 className="text-[14px] font-medium text-foreground">Recent Activity</h2>
              </div>
              {recentActivity.length > 0 ? (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {recentActivity.map((item, idx) => (
                    <div key={`${item.title}-${idx}`} className="flex items-start gap-4 px-6 py-3.5">
                      <div
                        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                        style={{ background: "var(--brand-gradient)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-foreground">{item.title}</p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{item.detail}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide shrink-0">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
