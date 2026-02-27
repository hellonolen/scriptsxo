"use client";

import { UserCog, Mail, Search, MoreHorizontal, Check, Shield, Download, Filter, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";

// --- High Fidelity Mock Data ---
const MOCK_USERS = [
  { id: "usr_1", name: "Alexander Grant", email: "alexander@scriptsxo.com", role: "admin", status: "active", org: "ScriptsXO HQ", lastActive: "Just now", joinedAt: "2024-11-12" },
  { id: "usr_2", name: "Dr. Sarah Jenkins", email: "s.jenkins@providers.net", role: "provider", status: "active", org: "Genesis Healthcare", lastActive: "2 min ago", joinedAt: "2024-12-05" },
  { id: "usr_3", name: "Michael Chen", email: "michael.chen@hormonetherapy.com", role: "provider", status: "active", org: "Apex Health", lastActive: "1 hour ago", joinedAt: "2025-01-18" },
  { id: "usr_4", name: "Emily Russo", email: "erusso@wellnesscenter.io", role: "provider", status: "active", org: "Vitality Labs", lastActive: "Yesterday", joinedAt: "2025-02-01" },
  { id: "usr_5", name: "Marcus Johnson", email: "mjohnson88@gmail.com", role: "patient", status: "active", org: "Direct to Consumer", lastActive: "3 days ago", joinedAt: "2025-02-14" },
  { id: "usr_6", name: "Priya Patel", email: "priya.p@gmail.com", role: "patient", status: "pending", org: "Direct to Consumer", lastActive: "Never", joinedAt: "2025-02-28" },
  { id: "usr_7", name: "David Kim", email: "dkim.rx@pharmacyops.net", role: "pharmacy", status: "active", org: "National RX", lastActive: "4 hours ago", joinedAt: "2024-11-20" },
];

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-violet-500/10 text-violet-500 border border-violet-500/20",
  provider: "bg-teal-500/10 text-teal-500 border border-teal-500/20",
  pharmacy: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  patient: "bg-muted text-muted-foreground border border-border",
  unverified: "bg-muted text-muted-foreground border border-border",
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filtered = MOCK_USERS.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    return matchesSearch && m.role === activeTab;
  });

  const tabs = [
    { id: "all", label: "All Users", count: MOCK_USERS.length },
    { id: "admin", label: "Admins", count: MOCK_USERS.filter(u => u.role === "admin").length },
    { id: "provider", label: "Providers", count: MOCK_USERS.filter(u => u.role === "provider").length },
    { id: "patient", label: "Patients", count: MOCK_USERS.filter(u => u.role === "patient").length },
  ];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">

        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <PageHeader
            eyebrow="ADMINISTRATION"
            title="Users & Access"
            description="Manage all identities, roles, and organization assignments."
            backHref="/admin"
          />
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors">
              <Download size={16} />
              Export
            </button>
            <button
              className="inline-flex items-center gap-2 px-5 py-2 text-sm text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
              style={{ background: "#5B21B6" }}
            >
              <UserCog size={16} />
              Invite User
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="bg-card border border-border rounded-xl mb-6">
          <div className="border-b border-border px-1">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button className="flex items-center justify-between w-full sm:w-auto gap-2 px-3 py-2 text-sm font-medium text-foreground bg-transparent border border-border rounded-md hover:bg-muted transition-colors">
                <Filter size={14} />
                Organization
                <ChevronDown size={14} className="text-muted-foreground ml-2" />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="py-3.5 px-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-[40px] text-center">
                    <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="py-3.5 px-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Role & Status</th>
                  <th className="py-3.5 px-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Organization</th>
                  <th className="py-3.5 px-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Last Active</th>
                  <th className="py-3.5 px-5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="py-4 px-5 text-center">
                      <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-medium shrink-0"
                          style={{
                            background: user.role === 'admin' ? "#5B21B6" : "var(--muted)",
                            color: user.role === 'admin' ? "#fff" : "var(--foreground)",
                          }}
                        >
                          {user.name.split(" ").map((w) => w[0]).join("").replace('D', '').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            {user.name}
                            {user.role === 'admin' && <Shield size={12} className="text-primary" />}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Mail size={12} />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role]}`}>
                          {user.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-success' : 'bg-warning'}`}></span>
                        <span className={user.status === 'active' ? 'text-success' : 'text-warning'}>
                          {user.status === 'active' ? 'Active' : 'Pending Invite'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-sm text-foreground">
                      {user.org}
                    </td>
                    <td className="py-4 px-5">
                      <p className="text-sm text-foreground">{user.lastActive}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Joined {new Date(user.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button className="p-2 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                        <Search size={20} className="text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">No users found</p>
                      <p className="text-xs">Adjust your filters or search query.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing 1 to {filtered.length} of {MOCK_USERS.length} users
              </p>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-transparent hover:bg-muted rounded transition-colors disabled:opacity-50" disabled>Previous</button>
                <button className="px-3 py-1.5 text-xs font-medium text-foreground bg-muted rounded transition-colors">1</button>
                <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-transparent hover:bg-muted rounded transition-colors disabled:opacity-50" disabled>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
