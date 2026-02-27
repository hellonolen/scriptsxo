"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Search,
  ChevronRight,
  Shield,
  ArrowLeft,
  Filter,
  UserCheck,
  Clock,
  XCircle,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  Pill,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";

const BADGE_MAP = {
  verified: "success",
  pending: "info",
  rejected: "error",
} as const;

function verificationVariant(status: string) {
  return BADGE_MAP[status as keyof typeof BADGE_MAP] ?? "secondary";
}

function initials(email: string) {
  return email[0]?.toUpperCase() ?? "?";
}

// ── Extended mock data for the side panel ───────────────────────────────────
const MOCK_DETAILS: Record<string, {
  firstName: string;
  lastName: string;
  phone: string;
  dob: string;
  rxCount: number;
  consultCount: number;
  lastVisit: string;
  joinDate: string;
  conditions: string[];
  recentRx: { name: string; date: string; status: string }[];
}> = {};

export default function AdminClientsPage() {
  const patientsResult = useQuery(api.patients.list, {
    paginationOpts: { numItems: 100, cursor: null },
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const patients = patientsResult?.page ?? [];

  const filteredPatients = patients.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      p.email.toLowerCase().includes(q) ||
      (p.state ?? "").toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "all" || p.idVerificationStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: patients.length,
    verified: patients.filter((p) => p.idVerificationStatus === "verified").length,
    pending: patients.filter((p) => p.idVerificationStatus === "pending").length,
    rejected: patients.filter((p) => p.idVerificationStatus === "rejected").length,
  };

  const selectedPatient = patients.find((p) => p._id === selectedId) ?? null;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1600px]">

        {/* ── Header ── */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <p className="eyebrow mb-1">ADMINISTRATION</p>
              <h1 className="text-2xl lg:text-3xl font-light text-foreground tracking-tight">
                Clients
              </h1>
              <p className="text-sm text-muted-foreground font-light mt-0.5">
                {patients.length} clients in the system
              </p>
            </div>
          </div>
        </header>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
          {[
            { label: "Total", value: counts.total, icon: Users, color: "#5B21B6", filter: "all" },
            { label: "Verified", value: counts.verified, icon: UserCheck, color: "#7C3AED", filter: "verified" },
            { label: "Pending", value: counts.pending, icon: Clock, color: "#B45309", filter: "pending" },
            { label: "Rejected", value: counts.rejected, icon: XCircle, color: "#DC2626", filter: "rejected" },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => setStatusFilter(statusFilter === s.filter ? "all" : s.filter as string)}
              className={`text-left p-4 rounded-xl border transition-all ${statusFilter === s.filter
                ? "border-primary ring-1 ring-primary/30 shadow-md"
                : "border-border bg-card hover:border-primary/30"
                }`}
            >
              <s.icon size={17} style={{ color: s.color }} className="mb-2" />
              <p className="text-2xl font-light text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by email or state…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-8 pr-8 py-2.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* ── Main Layout: Table + Detail Panel ── */}
        <div className={`flex gap-5 ${selectedPatient ? "items-start" : ""}`}>

          {/* Table */}
          <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden">
            {/* Column Headers */}
            <div className="hidden md:grid grid-cols-[2fr_100px_150px_80px_120px] gap-4 px-5 py-3 border-b border-border bg-muted/20 text-[10px] tracking-widest uppercase text-muted-foreground font-medium">
              <span>Client</span>
              <span>State</span>
              <span>Verification</span>
              <span>Rxs</span>
              <span>Actions</span>
            </div>

            {/* Loading */}
            {!patientsResult && (
              <div className="divide-y divide-border">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="grid md:grid-cols-[2fr_100px_150px_80px_120px] gap-4 items-center px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-9 h-9 rounded-full" variant="circular" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" variant="text" />
                        <Skeleton className="h-3 w-44" variant="text" />
                      </div>
                    </div>
                    <Skeleton className="h-3.5 w-10" variant="text" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-3.5 w-8" variant="text" />
                    <Skeleton className="h-5 w-16" variant="text" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {patientsResult && filteredPatients.length === 0 && (
              <div className="p-16 text-center text-muted-foreground">
                <Users size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No clients found.</p>
              </div>
            )}

            {/* Rows */}
            <div className="divide-y divide-border">
              {filteredPatients.map((patient) => (
                <div
                  key={patient._id}
                  onClick={() => setSelectedId(selectedId === patient._id ? null : patient._id)}
                  className={`grid grid-cols-1 md:grid-cols-[2fr_100px_150px_80px_120px] gap-2 md:gap-4 items-center px-5 py-4 cursor-pointer transition-colors ${selectedId === patient._id
                    ? "bg-primary/5 border-l-2 border-l-primary"
                    : "hover:bg-muted/20"
                    }`}
                >
                  {/* Avatar + Email */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
                      style={{ background: "#5B21B6" }}
                    >
                      {initials(patient.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {patient.email.split("@")[0]}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{patient.email}</p>
                    </div>
                  </div>

                  {/* State */}
                  <div className="flex items-center gap-1.5">
                    <MapPin size={11} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground font-mono text-[12px]">{patient.state ?? "—"}</span>
                  </div>

                  {/* Verification */}
                  <Badge variant={verificationVariant(patient.idVerificationStatus)}>
                    <Shield size={10} />
                    {patient.idVerificationStatus}
                  </Badge>

                  {/* Rx count placeholder */}
                  <span className="text-sm text-muted-foreground">—</span>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/clients/${patient._id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      View
                      <ChevronRight size={13} />
                    </Link>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedId(selectedId === patient._id ? null : patient._id); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Detail
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Detail Side Panel ── */}
          {selectedPatient && (
            <div className="w-80 shrink-0 bg-card border border-border rounded-xl overflow-hidden animate-in slide-in-from-right-4 duration-200">
              {/* Panel Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                    style={{ background: "#5B21B6" }}
                  >
                    {initials(selectedPatient.email)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedPatient.email.split("@")[0]}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedPatient.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                {[
                  { label: "Rxs", value: "—" },
                  { label: "Visits", value: "—" },
                  { label: "State", value: selectedPatient.state ?? "—" },
                ].map((s) => (
                  <div key={s.label} className="p-3 text-center">
                    <p className="text-base font-semibold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">Account</p>
                {[
                  { icon: Shield, label: "ID Verification", value: selectedPatient.idVerificationStatus },
                  { icon: MapPin, label: "State", value: selectedPatient.state ?? "Unknown" },
                  { icon: Mail, label: "Email", value: selectedPatient.email },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2.5 text-sm">
                    <Icon size={13} className="text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className="ml-auto text-xs font-medium text-foreground capitalize">{value}</span>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="p-4 pt-0 space-y-2">
                <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground mb-3">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Pill, label: "View Rxs" },
                    { icon: Video, label: "Schedule" },
                    { icon: FileText, label: "Notes" },
                    { icon: Mail, label: "Message" },
                  ].map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border">
                <Link
                  href={`/admin/clients/${selectedPatient._id}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Full Client Profile
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
