"use client";

import Link from "next/link";
import {
  Users,
  Pill,
  Video,
  Clock,
  ArrowRight,
  CircleDot,
  DollarSign,
  CalendarCheck,
  ClipboardList,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { term } from "@/lib/config";

const STATS = [
  { label: "In Queue", value: "3", icon: ClipboardList },
  { label: "Today's Visits", value: "12", icon: CalendarCheck },
  { label: "Pending Rx", value: "5", icon: Pill },
  { label: "Revenue", value: "$2,850", icon: DollarSign },
] as const;

const QUEUE_PATIENTS = [
  {
    name: "Amara Johnson",
    initials: "AJ",
    reason: "Sore throat, persistent 4 days",
    urgency: "standard" as const,
    wait: "5 min",
  },
  {
    name: "Marcus Rivera",
    initials: "MR",
    reason: "Prescription refill - Lisinopril",
    urgency: "routine" as const,
    wait: "12 min",
  },
  {
    name: "Elena Vasquez",
    initials: "EV",
    reason: "Skin rash, spreading to arms",
    urgency: "urgent" as const,
    wait: "2 min",
  },
  {
    name: "David Chen",
    initials: "DC",
    reason: "Follow-up, blood pressure management",
    urgency: "routine" as const,
    wait: "18 min",
  },
  {
    name: "Sophia Patel",
    initials: "SP",
    reason: "New patient intake, anxiety symptoms",
    urgency: "standard" as const,
    wait: "8 min",
  },
] as const;

const URGENCY_VARIANT: Record<string, "warning" | "info" | "success"> = {
  urgent: "warning",
  standard: "info",
  routine: "success",
};

const NAV_CARDS = [
  {
    icon: Users,
    title: `My ${term("titlePlural")}`,
    description: `View and manage your complete ${term()} roster.`,
    href: "/provider/patients",
    stat: "24 Active",
  },
  {
    icon: Pill,
    title: "Prescriptions",
    description: "Review, sign, and manage prescription requests.",
    href: "/provider/prescriptions",
    stat: "5 Pending",
  },
  {
    icon: Video,
    title: "Consultation Room",
    description: `Start or join a ${term()} video consultation.`,
    href: "/provider/consultation",
    stat: "Ready",
  },
] as const;

export default function ProviderDashboard() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 pb-6 border-b border-border">
          <div>
            <p className="eyebrow mb-1">PROVIDER PORTAL</p>
            <h1
              className="text-3xl lg:text-4xl text-foreground font-light tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Dr. Sarah Mitchell, MD
            </h1>
            <p className="text-muted-foreground font-light mt-1">
              Board Certified, Internal Medicine
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CircleDot
                size={14}
                className="text-green-600"
                aria-hidden="true"
              />
              <Badge variant="success">Online</Badge>
            </div>
            <span className="text-xs text-muted-foreground font-light tracking-wide">
              Accepting patients
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {STATS.map((stat) => (
            <div key={stat.label} className="stats-card">
              <div className="flex items-center justify-between">
                <span className="stats-card-label">{stat.label}</span>
                <stat.icon
                  size={16}
                  className="text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="stats-card-value text-foreground">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Client Queue */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2
              className="text-xl text-foreground font-light"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {term("title")} Queue
            </h2>
            <span className="text-xs text-muted-foreground tracking-widest uppercase font-light">
              {QUEUE_PATIENTS.length} waiting
            </span>
          </div>

          <div className="table-container">
            <table className="table-custom">
              <thead>
                <tr>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">{term("title")}</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Reason</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Urgency</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Wait Time</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {QUEUE_PATIENTS.map((patient) => (
                  <tr key={patient.name}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-sm bg-brand-secondary-muted flex items-center justify-center text-xs font-light text-foreground tracking-wide">
                          {patient.initials}
                        </div>
                        <span className="text-sm font-light text-foreground">
                          {patient.name}
                        </span>
                      </div>
                    </td>
                    <td className="text-sm font-light text-muted-foreground">
                      {patient.reason}
                    </td>
                    <td>
                      <Badge variant={URGENCY_VARIANT[patient.urgency]}>
                        {patient.urgency}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm font-light text-muted-foreground">
                        <Clock size={13} aria-hidden="true" />
                        {patient.wait}
                      </div>
                    </td>
                    <td className="text-right">
                      <button className="px-5 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors">
                        Accept
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid sm:grid-cols-3 gap-5">
          {NAV_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group p-6 bg-card border border-border rounded-lg hover:border-brand-secondary/40 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-secondary-muted flex items-center justify-center mb-4">
                <card.icon
                  size={18}
                  className="text-foreground"
                  aria-hidden="true"
                />
              </div>
              <h3
                className="text-base text-foreground font-light mb-1.5"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {card.title}
              </h3>
              <p className="text-sm text-muted-foreground font-light mb-4 leading-relaxed">
                {card.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-[0.1em] text-brand-secondary uppercase font-light">
                  {card.stat}
                </span>
                <ArrowRight
                  size={14}
                  className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-300"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
