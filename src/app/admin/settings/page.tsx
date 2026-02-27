"use client";

import { Save, Shield, Bell, CreditCard, Users, Settings as SettingsIcon, KeySquare, Globe, Building } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";

const SETTINGS_TABS = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "security", label: "Security & Access", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "team", label: "Team Management", icon: Users },
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">
        <header className="mb-8">
          <PageHeader
            eyebrow="ADMINISTRATION"
            title="Platform Settings"
            description="Configure global platform defaults, security policies, and billing."
            backHref="/admin"
          />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* Settings Sidebar Nav */}
          <div className="md:col-span-3 lg:col-span-2 space-y-1">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Settings Content Area */}
          <div className="md:col-span-9 lg:col-span-8 xl:col-span-7">

            {activeTab === "general" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                {/* Organization Setup */}
                <section className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-border bg-muted/20">
                    <h2 className="text-base font-medium text-foreground flex items-center gap-2">
                      <Building size={16} className="text-primary" />
                      Organization Details
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Platform public identity and core details.</p>
                  </div>

                  <div className="p-6 space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Organization Name</label>
                      <input
                        defaultValue="Scripts XO Healthcare"
                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Support Email</label>
                      <input
                        defaultValue="support@scriptsxo.com"
                        type="email"
                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      />
                      <p className="text-[11px] text-muted-foreground">Used for outbound patient communications.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Timezone</label>
                        <select className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none">
                          <option>Eastern Time (US & Canada)</option>
                          <option>Central Time (US & Canada)</option>
                          <option>Pacific Time (US & Canada)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Data Region</label>
                        <select disabled className="w-full px-3 py-2 text-sm border border-border rounded-md bg-muted text-muted-foreground appearance-none cursor-not-allowed">
                          <option>US-East-1 (N. Virginia)</option>
                        </select>
                        <p className="text-[11px] text-muted-foreground">Contact support to migrate regions.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm text-white font-medium rounded-md hover:opacity-90 transition-opacity bg-primary shadow-sm" style={{ background: "#5B21B6" }}>
                      <Save size={14} /> Save Changes
                    </button>
                  </div>
                </section>

                {/* Patient Portal Branding */}
                <section className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-border bg-muted/20">
                    <h2 className="text-base font-medium text-foreground flex items-center gap-2">
                      <Globe size={16} className="text-primary" />
                      Patient Portal
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Configure what patients see when logging in.</p>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">Enable Waitlist Mode</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Prevent new signups without an invite code.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">Require Intake Forms Before Consult</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Block booking if mandatory health history is missing.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                {/* Authentication Methods */}
                <section className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-border bg-muted/20">
                    <h2 className="text-base font-medium text-foreground flex items-center gap-2">
                      <KeySquare size={16} className="text-primary" />
                      Authentication & Login
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Manage acceptable login methods for internal staff.</p>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">Require Passkeys (WebAuthn)</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Enforce hardware/biometric keys for all administrative roles.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">Allow Email Magic Links</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Permit fallback login via email codes.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <label className="text-sm font-medium text-foreground block mb-1.5">Session Timeout (Idle)</label>
                      <select className="w-full sm:w-64 px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary appearance-none">
                        <option>15 Minutes (HIPAA Strict)</option>
                        <option>30 Minutes</option>
                        <option>1 Hour</option>
                        <option>8 Hours</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm text-white font-medium rounded-md hover:opacity-90 transition-opacity bg-primary shadow-sm" style={{ background: "#5B21B6" }}>
                      <Save size={14} /> Enforce Policies
                    </button>
                  </div>
                </section>

                {/* HIPAA Settings */}
                <section className="bg-card border border-border rounded-xl overflow-hidden border-amber-500/30 relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                  <div className="p-5 border-b border-border bg-muted/20 pl-6">
                    <h2 className="text-base font-medium text-foreground flex items-center gap-2">
                      <Shield size={16} className="text-amber-500" />
                      HIPAA Auditing Mode
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Strict governance over PHI data access and export.</p>
                  </div>

                  <div className="p-6 pl-7 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">Log All Read Access (Detailed)</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Records every time a user views a patient record.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked disabled />
                        <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 shadow-inner opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">Prevent PHI Bulk Export</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Blocks download sizes &gt; 50 records without Master Admin approval.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
                      </label>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {(activeTab === "notifications" || activeTab === "billing" || activeTab === "team") && (
              <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <SettingsIcon size={24} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Module Not Yet Implemented</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  The {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} panel is currently in development and will be available in the next release cycle.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </AppShell>
  );
}
