"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Pill, Activity, Shield, TrendingUp, FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

export default function DashboardPage() {
  const [firstName, setFirstName] = useState("there");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const session = getSessionCookie();
    if (session?.name) {
      setFirstName(session.name.split(" ")[0]);
    }
    if (session?.email) {
      setEmail(session.email);
    }
  }, []);

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

  // Calculate stats from real data
  const activeRxCount = prescriptions?.filter(
    (rx) => rx.status === "signed" || rx.status === "sent" || rx.status === "filling" || rx.status === "ready"
  ).length || 0;

  const nextRefillDate = prescriptions
    ?.filter((rx) => rx.nextRefillDate)
    .sort((a, b) => (a.nextRefillDate || 0) - (b.nextRefillDate || 0))[0]
    ?.nextRefillDate
    ? new Date(prescriptions.filter((rx) => rx.nextRefillDate).sort((a, b) => (a.nextRefillDate || 0) - (b.nextRefillDate || 0))[0].nextRefillDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "---";

  const consultationCount = consultations?.length || 0;

  const stats = [
    { value: String(activeRxCount), label: "Active Rx", icon: Pill },
    { value: nextRefillDate, label: "Next Refill", icon: Activity },
    { value: String(consultationCount), label: "Consultations", icon: TrendingUp },
  ];

  // Recent activity from consultations
  const recentActivity = (consultations || [])
    .slice(0, 4)
    .map((c) => {
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

  // If loading (only wait for patient query; prescriptions/consultations are skipped when patient is null)
  if (patient === undefined || (patient && (prescriptions === undefined || consultations === undefined))) {
    return (
      <AppShell>
        <div className="p-6 lg:p-10 max-w-[1200px]">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "#7C3AED", borderTopColor: "transparent" }} />
              <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // If no client record exists, show intake CTA
  if (patient === null) {
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
            <FileText size={48} className="text-foreground mx-auto mb-6" style={{ color: "#7C3AED" }} />
            <h2 className="text-2xl font-light text-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
              Start Your Health Journey
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
              Complete your intake to unlock prescriptions, consultations, and personalized care.
            </p>
            <Link
              href="/dashboard/order"
              className="inline-flex items-center gap-2 px-6 py-3 text-white text-xs tracking-[0.15em] uppercase font-medium hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
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
            style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
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

            {prescriptions && prescriptions.length > 0 ? (
              <div className="space-y-3">
                {prescriptions.slice(0, 3).map((rx) => (
                  <div key={rx._id} className="glass-card group flex items-center gap-5" style={{ padding: "20px 24px" }}>
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(124, 58, 237, 0.08)" }}
                    >
                      <Pill size={18} style={{ color: "#7C3AED" }} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-medium text-foreground">{rx.medicationName}</h3>
                      <p className="text-[13px] text-muted-foreground">{rx.dosage} · {rx.directions}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`tag ${rx.status === "signed" || rx.status === "sent" || rx.status === "ready" ? "tag-active" : "tag-pending"}`}>
                        {rx.status === "signed" ? "Active" : rx.status === "sent" ? "Active" : rx.status === "ready" ? "Active" : rx.status}
                      </span>
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

          {/* Activity + Security */}
          <div className="space-y-4">
            {/* Security status card */}
            <div className="glass-card" style={{ padding: "20px 24px" }}>
              <div className="flex items-center gap-3 mb-3">
                <Shield size={16} style={{ color: "#059669" }} aria-hidden="true" />
                <span className="text-[13px] font-medium text-foreground">Account Verified</span>
              </div>
              <div className="flex gap-2">
                <span className="tag tag-active">Identity</span>
                {patient.idVerificationStatus === "verified" && <span className="tag tag-active">Gov. ID</span>}
                <span className="tag tag-violet">HIPAA</span>
              </div>
            </div>

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
                        style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
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
