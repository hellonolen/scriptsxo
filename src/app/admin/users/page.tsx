"use client";

import { UserCog, Mail, Search, MoreHorizontal, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { getSessionToken } from "@/lib/auth";

const ROLE_BADGE: Record<string, string> = {
  admin: "tag tag-violet",
  provider: "tag tag-active",
  nurse: "tag tag-active",
  pharmacy: "tag",
  patient: "tag",
  unverified: "tag",
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [sessionToken, setSessionToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    const token = getSessionToken();
    if (token) setSessionToken(token);
  }, []);

  const members = useQuery(
    api.members.getAll,
    sessionToken ? { sessionToken } : "skip"
  );

  const memberCounts = useQuery(
    api.members.countByRole,
    sessionToken ? { sessionToken } : "skip"
  );

  const filtered = (members ?? []).filter(
    (m: any) =>
      (m.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (m.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers = members?.length ?? 0;
  const providerCount = (memberCounts as any)?.provider ?? 0;
  const patientCount = (memberCounts as any)?.patient ?? 0;
  const pendingCount = (memberCounts as any)?.unverified ?? 0;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">

        {/* Header */}
        <header className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">ADMIN</p>
            <h1
              className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Users &amp; Access
            </h1>
          </div>
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-xs tracking-[0.15em] uppercase font-medium hover:opacity-90 transition-opacity self-start sm:self-auto"
            style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
            onClick={() => alert("Invite functionality coming soon.")}
          >
            <UserCog size={13} />
            Invite User
          </button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Users", value: members === undefined ? "—" : String(totalUsers) },
            { label: "Providers", value: memberCounts === undefined ? "—" : String(providerCount) },
            { label: "Patients", value: memberCounts === undefined ? "—" : String(patientCount) },
            { label: "Pending", value: memberCounts === undefined ? "—" : String(pendingCount) },
          ].map((s) => (
            <div key={s.label} className="glass-card flex flex-col gap-2">
              <span className="stat-label">{s.label}</span>
              <span className="stat-value">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="table-custom">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members === undefined ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <Loader2 size={20} className="animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading users...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <p className="text-sm text-muted-foreground">
                      {search ? "No users match your search." : "No members found."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((member: any) => (
                  <tr key={member._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-medium shrink-0"
                          style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)", color: "#fff" }}
                        >
                          {(member.name ?? member.email ?? "?")
                            .split(" ")
                            .map((w: string) => w[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-foreground">{member.name ?? member.email}</p>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Mail size={10} />
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={ROLE_BADGE[member.role] || "tag"}>
                        {(member.role ?? "unverified").charAt(0).toUpperCase() + (member.role ?? "unverified").slice(1)}
                      </span>
                    </td>
                    <td>
                      <span className={member.status === "active" ? "tag tag-active" : "tag"}>
                        {member.status === "active" ? "Active" : "Pending"}
                      </span>
                    </td>
                    <td className="text-[12px] text-muted-foreground">
                      {member.joinedAt
                        ? new Date(member.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="text-right">
                      <button
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                        aria-label="More options"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
