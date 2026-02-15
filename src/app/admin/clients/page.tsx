"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Search,
  ChevronRight,
  Pill,
  Shield,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

const VERIFICATION_BADGE_VARIANT = {
  verified: "success",
  pending: "info",
  rejected: "error",
} as const;

function getVerificationVariant(status: string) {
  return (
    VERIFICATION_BADGE_VARIANT[
      status as keyof typeof VERIFICATION_BADGE_VARIANT
    ] ?? "secondary"
  );
}

export default function AdminClientsPage() {
  const patientsResult = useQuery(api.patients.list, {
    paginationOpts: { numItems: 50, cursor: null },
  });
  const [search, setSearch] = useState("");

  const patients = patientsResult?.page ?? [];

  const filteredPatients = patients.filter((patient) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return patient.email.toLowerCase().includes(query);
  });

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <div>
              <p className="eyebrow mb-1">Administration</p>
              <h1
                className="text-2xl lg:text-3xl font-light text-foreground tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Clients
              </h1>
              <p className="text-sm text-muted-foreground font-light">
                {patients.length} clients in the system
              </p>
            </div>
          </div>
        </header>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-md text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
          </div>
        </div>

        {/* Client Table */}
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[1fr_120px_140px_100px] gap-4 px-6 py-3 border-b border-border bg-muted/30 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
            <span>Client</span>
            <span>State</span>
            <span>Verification</span>
            <span>Actions</span>
          </div>

          {/* Loading state */}
          {!patientsResult && (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_100px] gap-2 md:gap-4 items-center px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full" variant="circular" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-32" variant="text" />
                      <Skeleton className="h-3 w-44" variant="text" />
                    </div>
                  </div>
                  <Skeleton className="h-3.5 w-10" variant="text" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12" variant="text" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {patientsResult && filteredPatients.length === 0 && (
            <div className="p-12 text-center text-muted-foreground font-light">
              <Users
                size={32}
                className="mx-auto mb-3 opacity-30"
                aria-hidden="true"
              />
              <p>No clients found.</p>
            </div>
          )}

          {/* Client rows */}
          <div className="divide-y divide-border">
            {filteredPatients.map((patient) => (
              <div
                key={patient._id}
                className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_100px] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-muted/20 transition-colors"
              >
                {/* Name + Email */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-medium text-white"
                    style={{
                      background: "linear-gradient(135deg, #7C3AED, #2DD4BF)",
                    }}
                  >
                    {patient.email[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {patient.email.split("@")[0]}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {patient.email}
                    </p>
                  </div>
                </div>

                {/* State */}
                <span className="text-sm text-foreground font-mono text-[12px]">
                  {patient.state}
                </span>

                {/* Verification Status */}
                <Badge variant={getVerificationVariant(patient.idVerificationStatus)}>
                  <Shield size={10} aria-hidden="true" />
                  {patient.idVerificationStatus}
                </Badge>

                {/* Actions */}
                <Link
                  href={`/admin/clients/${patient._id}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  View
                  <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
