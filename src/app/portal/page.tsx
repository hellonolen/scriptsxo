import type { Metadata } from "next";
import Link from "next/link";
import {
  Pill,
  Calendar,
  MessageSquare,
  CreditCard,
  ArrowRight,
  Video,
  Clock,
  FileText,
  User,
  RefreshCw,
  Plus,
  Send,
  Receipt,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Patient Portal | ScriptsXO",
  description:
    "Your ScriptsXO patient dashboard -- prescriptions, appointments, messages, and billing.",
};

/* ---------------------------------------------------------------------------
   DATA CONSTANTS
   --------------------------------------------------------------------------- */

const STATS = [
  { label: "Active Prescriptions", value: "2", icon: Pill },
  { label: "Next Refill", value: "Mar 8", icon: Calendar },
  { label: "Consultations", value: "5 total", icon: Video },
  { label: "Messages", value: "1 unread", icon: MessageSquare },
] as const;

const PRESCRIPTIONS = [
  {
    name: "Tretinoin Cream",
    dosage: "0.025%, apply nightly",
    prescriber: "Dr. Eloise Whitfield",
    status: "Active" as const,
    refillDate: "March 8, 2026",
  },
  {
    name: "Spironolactone",
    dosage: "50mg, once daily",
    prescriber: "Dr. Eloise Whitfield",
    status: "Active" as const,
    refillDate: "March 22, 2026",
  },
  {
    name: "Finasteride",
    dosage: "1mg, once daily",
    prescriber: "Dr. Marcus Chen",
    status: "Pending Renewal" as const,
    refillDate: "February 28, 2026",
  },
] as const;

const QUICK_ACTIONS = [
  { label: "New Visit", href: "/intake", icon: Plus },
  { label: "Request Refill", href: "/portal/prescriptions", icon: RefreshCw },
  { label: "Message Provider", href: "/portal/messages", icon: Send },
  { label: "Billing", href: "/portal/billing", icon: Receipt },
] as const;

const ACTIVITY_FEED = [
  {
    icon: CheckCircle2,
    iconColor: "text-[#2D6A4F]",
    iconBg: "bg-[#2D6A4F]/8",
    title: "Prescription Filled",
    detail: "Tretinoin Cream 0.025% -- Alto Pharmacy",
    time: "2 days ago",
  },
  {
    icon: Video,
    iconColor: "text-[#C9A96E]",
    iconBg: "bg-[#C9A96E]/10",
    title: "Consultation Completed",
    detail: "Dr. Eloise Whitfield -- Dermatology",
    time: "5 days ago",
  },
  {
    icon: Pill,
    iconColor: "text-[#2D6A4F]",
    iconBg: "bg-[#2D6A4F]/8",
    title: "New Prescription",
    detail: "Spironolactone 50mg added to your profile",
    time: "5 days ago",
  },
  {
    icon: FileText,
    iconColor: "text-[#8B7E74]",
    iconBg: "bg-[#8B7E74]/8",
    title: "Intake Completed",
    detail: "Medical history and identity verification submitted",
    time: "1 week ago",
  },
  {
    icon: CreditCard,
    iconColor: "text-[#C9A96E]",
    iconBg: "bg-[#C9A96E]/10",
    title: "Payment Processed",
    detail: "Consultation fee -- $149.00",
    time: "1 week ago",
  },
] as const;

/* ---------------------------------------------------------------------------
   STATUS HELPERS
   --------------------------------------------------------------------------- */

function prescriptionStatusVariant(
  status: string
): "success" | "warning" | "default" {
  if (status === "Active") return "success";
  if (status === "Pending Renewal") return "warning";
  return "default";
}

/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

export default function PortalPage() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-background pt-28 pb-24 px-6 sm:px-8 lg:px-12">
        <div className="max-w-[1400px] mx-auto">

          {/* ----------------------------------------------------------------
              WELCOME HEADER
              ---------------------------------------------------------------- */}
          <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-light mb-3">
                {currentDate}
              </p>
              <h1
                className="text-3xl sm:text-4xl font-medium text-foreground tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Good afternoon, Jane
              </h1>
              <p className="mt-2 text-muted-foreground font-light text-base">
                Your prescriptions and care, all in one place.
              </p>
            </div>
            <Link
              href="/intake"
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-foreground text-background text-[10px] tracking-[0.2em] uppercase font-light hover:bg-foreground/90 transition-all duration-300 rounded-sm self-start lg:self-auto"
            >
              <Video size={14} aria-hidden="true" />
              New Consultation
            </Link>
          </header>

          {/* ----------------------------------------------------------------
              STATS ROW
              ---------------------------------------------------------------- */}
          <section aria-label="Dashboard statistics" className="mb-14">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="stats-card">
                  <div className="flex items-center gap-2 mb-3">
                    <stat.icon
                      size={14}
                      className="text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="stats-card-label">{stat.label}</span>
                  </div>
                  <div className="stats-card-value text-foreground">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ----------------------------------------------------------------
              TWO-COLUMN LAYOUT
              ---------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-14">

            {/* LEFT: Prescriptions (2/3) */}
            <section className="lg:col-span-2" aria-label="Your prescriptions">
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-xl font-medium text-foreground"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Your Prescriptions
                </h2>
                <Link
                  href="/portal/prescriptions"
                  className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors font-light flex items-center gap-1.5"
                >
                  View All
                  <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </div>

              <div className="space-y-4">
                {PRESCRIPTIONS.map((rx) => (
                  <article
                    key={rx.name}
                    className="border border-border bg-card rounded-sm p-6 hover:shadow-sm transition-shadow duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3
                            className="text-base font-medium text-foreground"
                            style={{ fontFamily: "var(--font-heading)" }}
                          >
                            {rx.name}
                          </h3>
                          <Badge variant={prescriptionStatusVariant(rx.status)}>
                            {rx.status === "Active" && (
                              <CheckCircle2
                                size={10}
                                aria-hidden="true"
                              />
                            )}
                            {rx.status === "Pending Renewal" && (
                              <AlertCircle
                                size={10}
                                aria-hidden="true"
                              />
                            )}
                            {rx.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-light mb-1">
                          {rx.dosage}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3">
                          <span className="text-xs tracking-wide text-muted-foreground font-light flex items-center gap-1.5">
                            <User size={11} aria-hidden="true" />
                            {rx.prescriber}
                          </span>
                          <span className="text-xs tracking-wide text-muted-foreground font-light flex items-center gap-1.5">
                            <Calendar size={11} aria-hidden="true" />
                            Refill {rx.refillDate}
                          </span>
                        </div>
                      </div>
                      <Link
                        href="/portal/prescriptions"
                        className="inline-flex items-center gap-2 px-5 py-2 border border-border text-[10px] tracking-[0.15em] uppercase text-foreground hover:bg-muted/50 transition-colors duration-200 rounded-sm font-light self-start"
                      >
                        <RefreshCw size={11} aria-hidden="true" />
                        Refill
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* RIGHT: Upcoming + Quick Actions (1/3) */}
            <aside className="space-y-8">

              {/* Upcoming Appointment */}
              <section aria-label="Upcoming appointment">
                <h2
                  className="text-xl font-medium text-foreground mb-6"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Upcoming
                </h2>
                <div className="border border-border bg-card rounded-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-sm bg-[#C9A96E]/10 flex items-center justify-center">
                      <Video
                        size={14}
                        className="text-[#C9A96E]"
                        aria-hidden="true"
                      />
                    </div>
                    <Badge variant="info">Telehealth</Badge>
                  </div>
                  <h3
                    className="text-base font-medium text-foreground mb-1"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Follow-up Consultation
                  </h3>
                  <p className="text-sm text-muted-foreground font-light mb-4">
                    Dr. Eloise Whitfield
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-light">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={11} aria-hidden="true" />
                      March 12, 2026
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} aria-hidden="true" />
                      2:00 PM
                    </span>
                  </div>
                  <div className="mt-5 pt-4 border-t border-border">
                    <Link
                      href="/portal/appointments"
                      className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors font-light flex items-center gap-1.5"
                    >
                      View Details
                      <ArrowRight size={12} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </section>

              {/* Quick Actions */}
              <section aria-label="Quick actions">
                <h2
                  className="text-xl font-medium text-foreground mb-6"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Quick Actions
                </h2>
                <div className="space-y-2">
                  {QUICK_ACTIONS.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="flex items-center gap-3 px-5 py-3.5 border border-border bg-card rounded-sm hover:bg-muted/40 transition-colors duration-200 group"
                    >
                      <action.icon
                        size={14}
                        className="text-muted-foreground group-hover:text-[#C9A96E] transition-colors"
                        aria-hidden="true"
                      />
                      <span className="text-xs tracking-[0.12em] uppercase text-foreground font-light flex-1">
                        {action.label}
                      </span>
                      <ArrowRight
                        size={12}
                        className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors"
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </div>

          {/* ----------------------------------------------------------------
              RECENT ACTIVITY
              ---------------------------------------------------------------- */}
          <section aria-label="Recent activity">
            <h2
              className="text-xl font-medium text-foreground mb-6"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Recent Activity
            </h2>
            <div className="border border-border bg-card rounded-sm">
              {ACTIVITY_FEED.map((item, index) => (
                <div
                  key={item.title + item.time}
                  className={`flex items-start gap-4 px-6 py-5 ${
                    index < ACTIVITY_FEED.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  {/* Timeline dot and line */}
                  <div className="flex flex-col items-center pt-0.5">
                    <div
                      className={`w-8 h-8 rounded-sm ${item.iconBg} flex items-center justify-center flex-shrink-0`}
                    >
                      <item.icon
                        size={14}
                        className={item.iconColor}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-light mt-0.5">
                      {item.detail}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground font-light whitespace-nowrap pt-0.5">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
