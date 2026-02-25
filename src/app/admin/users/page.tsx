"use client";

import { UserCog, Mail, Shield, Search, MoreHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useState } from "react";

const DEMO_USERS = [
  { id: "u1", name: "Nolen Owner", email: "hellonolen@gmail.com", role: "admin", status: "active", joined: "Feb 12, 2026" },
  { id: "u2", name: "Dr. Sarah Kim", email: "sarah.kim@scriptsxo.com", role: "provider", status: "active", joined: "Feb 14, 2026" },
  { id: "u3", name: "Jessica Torres RN", email: "j.torres@scriptsxo.com", role: "nurse", status: "active", joined: "Feb 14, 2026" },
  { id: "u4", name: "RxPlus Pharmacy", email: "ops@rxplus.com", role: "pharmacy", status: "active", joined: "Feb 15, 2026" },
  { id: "u5", name: "Amara Johnson", email: "amara.j@gmail.com", role: "patient", status: "active", joined: "Feb 18, 2026" },
  { id: "u6", name: "Marcus Rivera", email: "mrivera@outlook.com", role: "patient", status: "active", joined: "Feb 19, 2026" },
  { id: "u7", name: "Elena Vasquez", email: "elena.v@gmail.com", role: "unverified", status: "pending", joined: "Feb 22, 2026" },
];

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

  const filtered = DEMO_USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1100px]">

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
          >
            <UserCog size={13} />
            Invite User
          </button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Users", value: String(DEMO_USERS.length) },
            { label: "Providers", value: "1" },
            { label: "Patients", value: "2" },
            { label: "Pending", value: "1" },
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
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-medium shrink-0"
                        style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)", color: "#fff" }}
                      >
                        {user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">{user.name}</p>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Mail size={10} />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={ROLE_BADGE[user.role] || "tag"}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td>
                    <span className={user.status === "active" ? "tag tag-active" : "tag"}>
                      {user.status === "active" ? "Active" : "Pending"}
                    </span>
                  </td>
                  <td className="text-[12px] text-muted-foreground">{user.joined}</td>
                  <td className="text-right">
                    <button
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      aria-label="More options"
                    >
                      <MoreHorizontal size={14} />
                    </button>
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
