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
} from "lucide-react";
import Link from "next/link";

// Status badge mapping
function statusVariant(status: string) {
  switch (status) {
    case "active": return "success" as const;
    case "onboarding": return "info" as const;
    case "suspended": return "error" as const;
    case "inactive": return "secondary" as const;
    default: return "default" as const;
  }
}

export default function AdminProvidersPage() {
  const providers = useQuery(api.providers.listAll);
  const createProvider = useMutation(api.providers.create);
  const updateProviderStatus = useMutation(api.providers.updateStatus);
  const updateProvider = useMutation(api.providers.update);
  const removeProvider = useMutation(api.providers.remove);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add provider form state
  const [form, setForm] = useState({
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
  });

  const filteredProviders = (providers ?? []).filter((p) => {
    const matchesSearch =
      !search ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      p.npiNumber.includes(search) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setForm({
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
    });
  };

  const handleAddProvider = async () => {
    try {
      // We need a memberId — for now create a placeholder member
      // In production, this would come from the auth/invite flow
      await createProvider({
        memberId: "" as any, // Will need to be created in production
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
      });
      resetForm();
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add provider:", err);
    }
  };

  const handleToggleStatus = async (providerId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await updateProviderStatus({ providerId: providerId as any, status: newStatus });
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <div>
              <p className="eyebrow mb-1">Administration</p>
              <h1
                className="text-2xl lg:text-3xl font-light text-foreground tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Providers
              </h1>
              <p className="text-sm text-muted-foreground font-light">
                {providers?.length ?? 0} providers in the system
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="self-start sm:self-auto">
            <UserPlus size={16} aria-hidden="true" />
            Add Provider
          </Button>
        </header>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by name, NPI, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-md text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Provider Table */}
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[1fr_100px_120px_150px_100px_100px] gap-4 px-6 py-3 border-b border-border bg-muted/30 text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
            <span>Provider</span>
            <span>Title</span>
            <span>NPI</span>
            <span>Licensed States</span>
            <span>Queue</span>
            <span>Status</span>
          </div>

          {/* Loading state */}
          {!providers && (
            <div className="p-12 text-center text-muted-foreground font-light">
              Loading providers...
            </div>
          )}

          {/* Empty state */}
          {providers && filteredProviders.length === 0 && (
            <div className="p-12 text-center text-muted-foreground font-light">
              No providers found.
            </div>
          )}

          {/* Provider rows */}
          <div className="divide-y divide-border">
            {filteredProviders.map((provider) => (
              <div
                key={provider._id}
                className="grid grid-cols-1 md:grid-cols-[1fr_100px_120px_150px_100px_100px] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-medium text-white" style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}>
                    {provider.firstName[0]}{provider.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {provider.firstName} {provider.lastName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{provider.email}</p>
                  </div>
                </div>
                <span className="text-sm text-foreground">{provider.title}</span>
                <span className="text-sm text-muted-foreground font-mono text-[12px]">{provider.npiNumber}</span>
                <div className="flex flex-wrap gap-1">
                  {provider.licensedStates.slice(0, 3).map((st) => (
                    <span key={st} className="text-[10px] px-1.5 py-0.5 bg-primary/8 text-primary rounded">
                      {st}
                    </span>
                  ))}
                  {provider.licensedStates.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{provider.licensedStates.length - 3}</span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{provider.currentQueueSize}/{provider.maxDailyConsultations}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(provider.status)}>
                    {provider.status}
                  </Badge>
                  <button
                    onClick={() => handleToggleStatus(provider._id, provider.status)}
                    className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    title={provider.status === "active" ? "Deactivate" : "Activate"}
                  >
                    {provider.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Provider Modal */}
        {showAddModal && (
          <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l border-border shadow-2xl overflow-y-auto">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2
                    className="text-xl font-light text-foreground"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Add Provider
                  </h2>
                  <button onClick={() => setShowAddModal(false)} className="p-2 text-muted-foreground hover:text-foreground">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      required
                    />
                    <Input
                      label="Last Name"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      required
                    />
                  </div>

                  <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />

                  <div>
                    <label className="block text-[10px] tracking-[0.25em] text-muted-foreground/70 mb-3 uppercase font-light">
                      Title <span className="text-destructive/50 ml-1">*</span>
                    </label>
                    <select
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors text-base font-light"
                    >
                      <option value="MD">MD - Doctor of Medicine</option>
                      <option value="DO">DO - Doctor of Osteopathy</option>
                      <option value="PA">PA - Physician Assistant</option>
                      <option value="NP">NP - Nurse Practitioner</option>
                      <option value="APRN">APRN - Advanced Practice RN</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="NPI Number"
                      value={form.npiNumber}
                      onChange={(e) => setForm({ ...form, npiNumber: e.target.value })}
                      required
                      placeholder="10-digit NPI"
                    />
                    <Input
                      label="DEA Number"
                      value={form.deaNumber}
                      onChange={(e) => setForm({ ...form, deaNumber: e.target.value })}
                      placeholder="Optional"
                    />
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
                    <Input
                      label="Consultation Rate (cents)"
                      type="number"
                      value={form.consultationRate}
                      onChange={(e) => setForm({ ...form, consultationRate: e.target.value })}
                      required
                    />
                    <Input
                      label="Max Daily Consultations"
                      type="number"
                      value={form.maxDailyConsultations}
                      onChange={(e) => setForm({ ...form, maxDailyConsultations: e.target.value })}
                      required
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button onClick={handleAddProvider} className="flex-1">
                      Add Provider
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
