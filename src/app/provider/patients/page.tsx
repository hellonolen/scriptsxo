"use client";

import Link from "next/link";
import { Search, ArrowUpDown, Eye, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function PatientsPage() {
  const patients = useQuery(api.patients.listAll);

  const isLoading = patients === undefined;
  const activeCount = patients?.filter(
    (p) => p.idVerificationStatus === "verified"
  ).length ?? 0;

  function getInitials(email: string): string {
    const parts = email.split("@")[0].split(/[._-]/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }

  function formatDate(timestamp: number | undefined): string {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">
        <PageHeader
          eyebrow="PROVIDER PORTAL"
          title="My Clients"
          description={isLoading ? "Loading..." : `${patients.length} clients — ${activeCount} verified`}
          backHref="/provider"
          size="lg"
        />

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
                placeholder="Search by email or condition..."
                className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-sm text-foreground placeholder-muted-foreground font-light text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
                aria-label="Search patients"
              />
            </div>
            <div className="flex gap-3">
              <button className="px-5 py-3 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors">
                All
              </button>
              <button className="px-5 py-3 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors">
                Verified
              </button>
              <button className="px-5 py-3 border border-border text-muted-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors">
                Pending
              </button>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2
                size={24}
                className="animate-spin text-primary"
                aria-label="Loading patients"
              />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && patients.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground font-light">
                No patients on record yet.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Patients will appear here after completing intake.
              </p>
            </div>
          )}

          {/* Table */}
          {!isLoading && patients.length > 0 && (
            <div className="table-container">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>
                      <button className="flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-light hover:text-foreground transition-colors">
                        Patient
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
                        Registered
                        <ArrowUpDown size={12} aria-hidden="true" />
                      </button>
                    </th>
                    <th className="text-xs tracking-[0.1em] uppercase font-light">
                      State
                    </th>
                    <th className="text-xs tracking-[0.1em] uppercase font-light">
                      ID Status
                    </th>
                    <th className="text-xs tracking-[0.1em] uppercase font-light text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => {
                    const initials = getInitials(patient.email);
                    const isVerified =
                      patient.idVerificationStatus === "verified";
                    return (
                      <tr key={patient._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-sm bg-brand-secondary-muted flex items-center justify-center text-xs font-light text-foreground tracking-wide">
                              {initials}
                            </div>
                            <span className="text-sm font-light text-foreground">
                              {patient.email}
                            </span>
                          </div>
                        </td>
                        <td className="text-sm font-light text-muted-foreground">
                          {patient.dateOfBirth || "—"}
                        </td>
                        <td className="text-sm font-light text-muted-foreground">
                          {formatDate(patient.createdAt)}
                        </td>
                        <td>
                          <span className="text-sm font-light text-foreground">
                            {patient.state || "—"}
                          </span>
                        </td>
                        <td>
                          <Badge
                            variant={isVerified ? "success" : "secondary"}
                          >
                            {patient.idVerificationStatus}
                          </Badge>
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/provider/patients/${patient._id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors"
                          >
                            <Eye size={12} aria-hidden="true" />
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </AppShell>
  );
}
