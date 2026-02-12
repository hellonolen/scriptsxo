"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bot, ArrowRight, Mic, Pill, Activity, Shield, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";

/* ---------------------------------------------------------------------------
   DATA
   --------------------------------------------------------------------------- */

const STATS = [
  { value: "2", label: "Active Rx", icon: Pill },
  { value: "Mar 8", label: "Next Refill", icon: Activity },
  { value: "5", label: "Consultations", icon: TrendingUp },
  { value: "1", label: "Unread", icon: Bot },
] as const;

const PRESCRIPTIONS = [
  {
    name: "Tretinoin Cream",
    detail: "0.025% · Apply nightly",
    status: "Active" as const,
    refillDate: "Mar 8",
  },
  {
    name: "Spironolactone",
    detail: "50mg · Once daily",
    status: "Active" as const,
    refillDate: "Mar 22",
  },
  {
    name: "Finasteride",
    detail: "1mg · Once daily",
    status: "Pending" as const,
    refillDate: "Feb 28",
  },
] as const;

const ACTIVITY = [
  { title: "Prescription Filled", detail: "Tretinoin Cream — Alto Pharmacy", time: "2d ago" },
  { title: "AI Consultation", detail: "Screening passed · No conflicts", time: "5d ago" },
  { title: "Rx Issued", detail: "Spironolactone — AI-screened, physician-signed", time: "5d ago" },
  { title: "Identity Verified", detail: "Photo + government ID matched", time: "1w ago" },
] as const;

/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

export default function PortalPage() {
  const [firstName, setFirstName] = useState("there");

  useEffect(() => {
    const session = getSessionCookie();
    if (session?.name) {
      setFirstName(session.name.split(" ")[0]);
    }
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">

        {/* ---- HEADER ---- */}
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

        {/* ---- AI CONCIERGE BANNER — Hero card with glow ---- */}
        <Link
          href="/consultation"
          className="glass-card glow-accent flex items-center gap-6 mb-10 group cursor-pointer"
          style={{ padding: "28px 32px" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #E11D48)" }}
          >
            <Bot size={24} className="text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] text-foreground font-medium mb-1">
              AI Health Concierge
            </p>
            <p className="text-[14px] text-muted-foreground">
              Screen symptoms, check drug interactions, or start a consultation — available 24/7
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <span
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] tracking-[0.1em] uppercase font-medium text-white"
              style={{ background: "linear-gradient(135deg, #7C3AED, #E11D48)" }}
            >
              <Mic size={13} aria-hidden="true" />
              Voice
            </span>
            <ArrowRight
              size={18}
              className="text-muted-foreground group-hover:text-foreground transition-all group-hover:translate-x-1"
              aria-hidden="true"
            />
          </div>
        </Link>

        {/* ---- BENTO STATS GRID ---- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {STATS.map((stat) => (
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
                href="/portal/prescriptions"
                className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {PRESCRIPTIONS.map((rx) => (
                <div key={rx.name} className="glass-card group flex items-center gap-5" style={{ padding: "20px 24px" }}>
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(124, 58, 237, 0.08)" }}
                  >
                    <Pill size={18} style={{ color: "#7C3AED" }} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-medium text-foreground">{rx.name}</h3>
                    <p className="text-[13px] text-muted-foreground">{rx.detail}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`tag ${rx.status === "Active" ? "tag-active" : "tag-pending"}`}>
                      {rx.status}
                    </span>
                    <span className="text-[12px] text-muted-foreground hidden sm:block">
                      Refill {rx.refillDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Activity + Quick Actions */}
          <div className="space-y-4">
            {/* Security status card */}
            <div className="glass-card" style={{ padding: "20px 24px" }}>
              <div className="flex items-center gap-3 mb-3">
                <Shield size={16} style={{ color: "#059669" }} aria-hidden="true" />
                <span className="text-[13px] font-medium text-foreground">Account Verified</span>
              </div>
              <div className="flex gap-2">
                <span className="tag tag-active">Identity</span>
                <span className="tag tag-active">Gov. ID</span>
                <span className="tag tag-violet">HIPAA</span>
              </div>
            </div>

            {/* Activity */}
            <div className="glass-card" style={{ padding: 0 }}>
              <div style={{ padding: "16px 24px 12px" }}>
                <h2 className="text-[14px] font-medium text-foreground">Recent Activity</h2>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {ACTIVITY.map((item) => (
                  <div key={item.title + item.time} className="flex items-start gap-4 px-6 py-3.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                      style={{ background: "linear-gradient(135deg, #7C3AED, #E11D48)" }}
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
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
