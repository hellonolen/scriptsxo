"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Users,
  ArrowLeft,
  Search,
  UserPlus,
  X,
  Shield,
  MapPin,
  Mail,
  Phone,
  Stethoscope,
  Video,
  MessageSquare,
  ClipboardList,
  Filter,
  Star,
  Clock,
  ChevronRight,
  Edit2,
} from "lucide-react";
import Link from "next/link";
import { getSessionCookie, getSessionToken } from "@/lib/auth";
import { Id } from "../../../../convex/_generated/dataModel";

function statusVariant(status: string) {
  switch (status) {
    case "active": return "success" as const;
    case "onboarding": return "info" as const;
    case "suspended": return "error" as const;
    default: return "secondary" as const;
  }
}

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  title: "MD",
  npiNumber: "",
  deaNumber: "",
  licensedStates: "",
  specialties: "",
  consultationRate: "15000",
  maxDailyConsultations: "20",
};

export default function AdminProvidersPage() {
  const providers = useQuery(api.providers.listAll);
  const createProvider = useMutation(api.providers.create);
  const updateProviderStatus = useMutation(api.providers.updateStatus);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const filteredProviders = (providers ?? []).filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.npiNumber.includes(q) ||
      p.email.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: (providers ?? []).length,
    active: (providers ?? []).filter((p) => p.status === "active").length,
    onboarding: (providers ?? []).filter((p) => p.status === "onboarding").length,
    suspended: (providers ?? []).filter((p) => p.status === "suspended").length,
  };

  const selectedProvider = (providers ?? []).find((p) => p._id === selectedId) ?? null;

  const resetForm = () => setForm(EMPTY_FORM);

  const handleAddProvider = async () => {
    const sessionToken = getSessionToken();
    const session = getSessionCookie();
    if (!sessionToken || !session?.memberId) {
      console.error("No active session or memberId found");
      return;
    }

    setSaving(true);
    try {
      await createProvider({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        title: form.title,
        npiNumber: form.npiNumber,
        deaNumber: form.deaNumber || undefined,
        specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
        licensedStates: form.licensedStates.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
        consultationRate: parseInt(form.consultationRate, 10),
        maxDailyConsultations: parseInt(form.maxDailyConsultations, 10),
        sessionToken,
        memberId: session.memberId as Id<"members">,
      });
      resetForm();
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add provider:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (providerId: string, currentStatus: string) => {
    const sessionToken = getSessionToken();
    if (!sessionToken) return;

    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await updateProviderStatus({
      providerId: providerId as Id<"providers">,
      status: newStatus,
      sessionToken,
    });
  };

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
                Providers
              </h1>
              <p className="text-sm text-muted-foreground font-light mt-0.5">
                {providers?.length ?? 0} providers in the system
              </p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setShowAddModal(true); }} className="self-start sm:self-auto">
            <UserPlus size={15} />
            Add Provider
          </Button>
        </header>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
          {[
            { label: "Total", value: counts.total, icon: Users, color: "#5B21B6", filter: "all" },
            { label: "Active", value: counts.active, icon: Star, color: "#7C3AED", filter: "active" },
            { label: "Onboarding", value: counts.onboarding, icon: Clock, color: "#B45309", filter: "onboarding" },
            { label: "Suspended", value: counts.suspended, icon: Shield, color: "#DC2626", filter: "suspended" },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => setStatusFilter(statusFilter === s.filter ? "all" : s.filter)}
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
              placeholder="Search by name, NPI, or email…"
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
              <option value="active">Active</option>
              <option value="onboarding">Onboarding</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* ── Main Layout: Table + Side Panel ── */}
        <div className="flex gap-5 items-start">

          {/* Table */}
          <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden">
            {/* Column Headers */}
            <div className="hidden md:grid grid-cols-[2fr_80px_130px_160px_90px_140px] gap-4 px-5 py-3 border-b border-border bg-muted/20 text-[10px] tracking-widest uppercase text-muted-foreground font-medium">
              <span>Provider</span>
              <span>Title</span>
              <span>NPI</span>
              <span>Licensed States</span>
              <span>Queue</span>
              <span>Status</span>
            </div>

            {/* Loading */}
            {!providers && (
              <div className="p-12 text-center text-muted-foreground text-sm">Loading providers…</div>
            )}

            {/* Empty */}
            {providers && filteredProviders.length === 0 && (
              <div className="p-16 text-center text-muted-foreground">
                <Users size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No providers found.</p>
              </div>
            )}

            {/* Rows */}
            <div className="divide-y divide-border">
              {filteredProviders.map((provider) => (
                <div
                  key={provider._id}
                  onClick={() => setSelectedId(selectedId === provider._id ? null : provider._id)}
                  className={`grid grid-cols-1 md:grid-cols-[2fr_80px_130px_160px_90px_140px] gap-2 md:gap-4 items-center px-5 py-4 cursor-pointer transition-colors ${selectedId === provider._id
                    ? "bg-primary/5 border-l-2 border-l-primary"
                    : "hover:bg-muted/20"
                    }`}
                >
                  {/* Avatar */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
                      style={{ background: "#5B21B6" }}
                    >
                      {provider.firstName[0]}{provider.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {provider.firstName} {provider.lastName}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{provider.email}</p>
                    </div>
                  </div>

                  <span className="text-sm text-foreground">{provider.title}</span>
                  <span className="text-[12px] text-muted-foreground font-mono">{provider.npiNumber}</span>

                  {/* Licensed States */}
                  <div className="flex flex-wrap gap-1">
                    {provider.licensedStates.slice(0, 4).map((st) => (
                      <span key={st} className="text-[10px] px-1.5 py-0.5 bg-primary/8 text-primary rounded font-medium">
                        {st}
                      </span>
                    ))}
                    {provider.licensedStates.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">+{provider.licensedStates.length - 4}</span>
                    )}
                  </div>

                  {/* Queue */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, (provider.currentQueueSize / provider.maxDailyConsultations) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {provider.currentQueueSize}/{provider.maxDailyConsultations}
                    </span>
                  </div>

                  {/* Status + Toggle */}
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(provider.status)}>
                      {provider.status}
                    </Badge>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleStatus(provider._id, provider.status); }}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline transition-colors"
                    >
                      {provider.status === "active" ? "Suspend" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Provider Detail Side Panel ── */}
          {selectedProvider && (
            <div className="w-72 shrink-0 bg-card border border-border rounded-xl overflow-hidden animate-in slide-in-from-right-4 duration-200">
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                    style={{ background: "#5B21B6" }}
                  >
                    {selectedProvider.firstName[0]}{selectedProvider.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {selectedProvider.firstName} {selectedProvider.lastName}, {selectedProvider.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{selectedProvider.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedId(null)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                  <X size={15} />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                {[
                  { label: "Queue", value: `${selectedProvider.currentQueueSize}/${selectedProvider.maxDailyConsultations}` },
                  { label: "NPI", value: selectedProvider.npiNumber.slice(-4) },
                  { label: "Status", value: selectedProvider.status },
                ].map((s) => (
                  <div key={s.label} className="p-3 text-center">
                    <p className="text-xs font-semibold text-foreground truncate">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Details */}
              <div className="p-4 space-y-2.5">
                <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground mb-2">Details</p>
                {[
                  { icon: Stethoscope, label: "Specialties", value: selectedProvider.specialties?.join(", ") || "—" },
                  { icon: MapPin, label: "States", value: selectedProvider.licensedStates.join(", ") },
                  { icon: Mail, label: "Email", value: selectedProvider.email },
                  { icon: Shield, label: "DEA", value: selectedProvider.deaNumber || "Not on file" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="text-xs">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon size={11} className="text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{label}</span>
                    </div>
                    <p className="text-foreground pl-4 font-medium truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="p-4 pt-0 space-y-2">
                <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground mb-2">Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Video, label: "Schedule" },
                    { icon: MessageSquare, label: "Message" },
                    { icon: ClipboardList, label: "Activity" },
                    { icon: Edit2, label: "Edit" },
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
                <button
                  onClick={() => { setSelectedId(null); handleToggleStatus(selectedProvider._id, selectedProvider.status); }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-border text-foreground text-xs font-medium rounded-lg hover:bg-muted transition-colors"
                >
                  {selectedProvider.status === "active" ? "Suspend Provider" : "Activate Provider"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Add Provider Modal ── */}
        {showAddModal && (
          <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l border-border shadow-2xl overflow-y-auto">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Administration</p>
                    <h2 className="text-xl font-light text-foreground">Add Provider</h2>
                  </div>
                  <button onClick={() => { resetForm(); setShowAddModal(false); }} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                    <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                  </div>

                  <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />

                  <div>
                    <label className="block text-[10px] tracking-[0.25em] text-muted-foreground/70 mb-3 uppercase font-light">
                      Title <span className="text-destructive/50 ml-1">*</span>
                    </label>
                    <select
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors text-sm"
                    >
                      <option value="MD">MD — Doctor of Medicine</option>
                      <option value="DO">DO — Doctor of Osteopathy</option>
                      <option value="PA">PA — Physician Assistant</option>
                      <option value="NP">NP — Nurse Practitioner</option>
                      <option value="APRN">APRN — Advanced Practice RN</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input label="NPI Number" value={form.npiNumber} onChange={(e) => setForm({ ...form, npiNumber: e.target.value })} required placeholder="10-digit NPI" />
                    <Input label="DEA Number" value={form.deaNumber} onChange={(e) => setForm({ ...form, deaNumber: e.target.value })} placeholder="Optional" />
                  </div>

                  <Input
                    label="Licensed States"
                    value={form.licensedStates}
                    onChange={(e) => setForm({ ...form, licensedStates: e.target.value })}
                    placeholder="FL, CA, NY"
                    description="Comma-separated state codes"
                    required
                  />

                  <Input
                    label="Specialties"
                    value={form.specialties}
                    onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                    placeholder="General Medicine, Dermatology"
                    description="Comma-separated"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Consult Rate (cents)" type="number" value={form.consultationRate} onChange={(e) => setForm({ ...form, consultationRate: e.target.value })} required />
                    <Input label="Max Daily Consults" type="number" value={form.maxDailyConsultations} onChange={(e) => setForm({ ...form, maxDailyConsultations: e.target.value })} required />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button onClick={handleAddProvider} className="flex-1" disabled={saving}>
                      {saving ? "Adding…" : "Add Provider"}
                    </Button>
                    <Button onClick={() => { resetForm(); setShowAddModal(false); }} variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </AppShell>
  );
}
