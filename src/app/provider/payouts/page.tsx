"use client";

import Link from "next/link";
import { ArrowLeft, DollarSign, TrendingUp, Calendar, CreditCard } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

const PAYOUT_STATS = [
  { label: "This Month", value: "$8,450", icon: DollarSign },
  { label: "Pending", value: "$1,200", icon: CreditCard },
  { label: "Last Payout", value: "Feb 15", icon: Calendar },
  { label: "Growth", value: "+18%", icon: TrendingUp },
] as const;

const RECENT_PAYOUTS = [
  { date: "Feb 15, 2026", amount: "$3,200.00", consultations: 16, status: "paid" as const },
  { date: "Feb 1, 2026", amount: "$2,850.00", consultations: 14, status: "paid" as const },
  { date: "Jan 15, 2026", amount: "$3,100.00", consultations: 15, status: "paid" as const },
  { date: "Jan 1, 2026", amount: "$2,400.00", consultations: 12, status: "paid" as const },
];

const PENDING_EARNINGS = [
  { patient: "Elena Vasquez", date: "Feb 24", amount: "$197.00", type: "Video Visit" },
  { patient: "Marcus Rivera", date: "Feb 24", amount: "$147.00", type: "Phone Call" },
  { patient: "David Chen", date: "Feb 25", amount: "$197.00", type: "Video Visit" },
  { patient: "Sophia Patel", date: "Feb 25", amount: "$197.00", type: "Video Visit" },
];

export default function ProviderPayoutsPage() {
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
              Payouts
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">
          Earnings, payout history, and pending consultation fees.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {PAYOUT_STATS.map((stat) => (
            <div key={stat.label} className="stats-card">
              <div className="flex items-center justify-between">
                <span className="stats-card-label">{stat.label}</span>
                <stat.icon size={16} className="text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="stats-card-value text-foreground">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Pending Earnings */}
        <div className="mb-10">
          <h2
            className="text-base font-medium text-foreground mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Pending Earnings
          </h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border">
              {PENDING_EARNINGS.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.patient}</p>
                    <p className="text-xs text-muted-foreground">{item.type} -- {item.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{item.amount}</span>
                    <Badge variant="info">Pending</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payout History */}
        <div>
          <h2
            className="text-base font-medium text-foreground mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Payout History
          </h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border">
              {RECENT_PAYOUTS.map((payout, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{payout.amount}</p>
                    <p className="text-xs text-muted-foreground">
                      {payout.consultations} consultations -- {payout.date}
                    </p>
                  </div>
                  <Badge variant="success">Paid</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
