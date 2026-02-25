"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Search,
  ArrowUpDown,
  Eye,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

const PATIENTS = [
  {
    name: "Amara Johnson",
    initials: "AJ",
    dob: "Mar 15, 1988",
    lastVisit: "Feb 10, 2026",
    activeRx: 3,
    status: "active" as const,
  },
  {
    name: "Marcus Rivera",
    initials: "MR",
    dob: "Jul 22, 1975",
    lastVisit: "Feb 8, 2026",
    activeRx: 1,
    status: "active" as const,
  },
  {
    name: "Elena Vasquez",
    initials: "EV",
    dob: "Nov 3, 1992",
    lastVisit: "Feb 7, 2026",
    activeRx: 2,
    status: "active" as const,
  },
  {
    name: "David Chen",
    initials: "DC",
    dob: "Jan 18, 1983",
    lastVisit: "Feb 5, 2026",
    activeRx: 4,
    status: "active" as const,
  },
  {
    name: "Sophia Patel",
    initials: "SP",
    dob: "Sep 9, 1996",
    lastVisit: "Feb 3, 2026",
    activeRx: 1,
    status: "active" as const,
  },
  {
    name: "Robert Williams",
    initials: "RW",
    dob: "Dec 1, 1968",
    lastVisit: "Jan 22, 2026",
    activeRx: 2,
    status: "inactive" as const,
  },
  {
    name: "Keiko Tanaka",
    initials: "KT",
    dob: "May 14, 1990",
    lastVisit: "Jan 15, 2026",
    activeRx: 0,
    status: "inactive" as const,
  },
  {
    name: "Thomas Grant",
    initials: "TG",
    dob: "Aug 27, 1971",
    lastVisit: "Jan 8, 2026",
    activeRx: 1,
    status: "active" as const,
  },
] as const;

export default function PatientsPage() {
  const activeCount = PATIENTS.filter((p) => p.status === "active").length;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        {/* Header */}
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
              My Patients
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">
          {PATIENTS.length} patients -- {activeCount} active
        </p>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search by name, DOB, or condition..."
              className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-sm text-foreground placeholder-muted-foreground font-light text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
              aria-label="Search patients"
            />
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-3 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors">
              All
            </button>
            <button className="px-5 py-3 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors">
              Active
            </button>
            <button className="px-5 py-3 border border-border text-muted-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors">
              Inactive
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="table-custom">
            <thead>
              <tr>
                <th>
                  <button className="flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-light hover:text-foreground transition-colors">
                    Name
                    <ArrowUpDown size={12} aria-hidden="true" />
                  </button>
                </th>
                <th>
                  <button className="flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-light hover:text-foreground transition-colors">
                    DOB
                    <ArrowUpDown size={12} aria-hidden="true" />
                  </button>
                </th>
                <th>
                  <button className="flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-light hover:text-foreground transition-colors">
                    Last Visit
                    <ArrowUpDown size={12} aria-hidden="true" />
                  </button>
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  Active Rx
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light">
                  Status
                </th>
                <th className="text-xs tracking-[0.1em] uppercase font-light text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {PATIENTS.map((patient) => (
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
                    {patient.dob}
                  </td>
                  <td className="text-sm font-light text-muted-foreground">
                    {patient.lastVisit}
                  </td>
                  <td>
                    <span className="text-sm font-light text-foreground">
                      {patient.activeRx}
                    </span>
                  </td>
                  <td>
                    <Badge
                      variant={
                        patient.status === "active" ? "success" : "secondary"
                      }
                    >
                      {patient.status}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/provider/patients/${patient.initials.toLowerCase()}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors"
                    >
                      <Eye size={12} aria-hidden="true" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
