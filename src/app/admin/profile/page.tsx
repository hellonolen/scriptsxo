"use client";

import { Save, User, Shield, Bell, Camera, KeySquare, Smartphone, Clock, Mail, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";
import Image from "next/image";

const PROFILE_TABS = [
    { id: "personal", label: "Personal Information", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
];

export default function AdminProfilePage() {
    const [activeTab, setActiveTab] = useState("personal");

    return (
        <AppShell>
            <div className="p-6 lg:p-10 max-w-[1400px]">
                <header className="mb-8">
                    <PageHeader
                        eyebrow="ACCOUNT DETAILS"
                        title="Your Profile"
                        description="Manage your personal information, security preferences, and alert settings."
                    />
                </header>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                    {/* Profile Sidebar Nav */}
                    <div className="md:col-span-3 lg:col-span-2 space-y-1">
                        {PROFILE_TABS.map((tab) => {
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

                    {/* Profile Content Area */}
                    <div className="md:col-span-9 lg:col-span-8 xl:col-span-7">

                        {activeTab === "personal" && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                                {/* Avatar & Basic Info */}
                                <section className="bg-card border border-border rounded-xl p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                                    <div className="relative shrink-0">
                                        <div className="w-20 h-20 rounded-full border-2 border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                                            <User size={32} className="text-muted-foreground" />
                                        </div>
                                        <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:scale-105 transition-transform border-2 border-card">
                                            <Camera size={14} />
                                        </button>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <h2 className="text-xl font-medium text-foreground">Dr. Sarah Jenkins</h2>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span className="inline-block w-2 h-2 rounded-full bg-success"></span>
                                            Master Admin
                                        </p>
                                    </div>
                                </section>

                                {/* Personal Details Form */}
                                <section className="bg-card border border-border rounded-xl overflow-hidden">
                                    <div className="p-5 border-b border-border bg-muted/20">
                                        <h2 className="text-base font-medium text-foreground flex items-center gap-2">
                                            <User size={16} className="text-primary" />
                                            Personal Details
                                        </h2>
                                    </div>

                                    <div className="p-6 space-y-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-foreground">First Name</label>
                                                <input
                                                    defaultValue="Sarah"
                                                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-foreground">Last Name</label>
                                                <input
                                                    defaultValue="Jenkins"
                                                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-foreground">Email Address</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    defaultValue="sarah.jenkins@scriptsxo.com"
                                                    type="email"
                                                    className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                                />
                                                <span className="px-2 py-1 bg-success/10 text-success text-[10px] font-medium uppercase tracking-wider rounded border border-success/20 flex items-center gap-1 shrink-0">
                                                    <CheckCircle2 size={12} /> Verified
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-foreground">Phone Number</label>
                                            <input
                                                defaultValue="+1 (555) 019-2834"
                                                type="tel"
                                                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                                        <button className="flex items-center gap-2 px-4 py-2 text-sm text-white font-medium rounded-md hover:opacity-90 transition-opacity bg-primary shadow-sm" style={{ background: "#5B21B6" }}>
                                            <Save size={14} /> Update Profile
                                        </button>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === "security" && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                                {/* Two-Factor Auth */}
                                <section className="bg-card border border-border rounded-xl overflow-hidden">
                                    <div className="p-5 border-b border-border bg-muted/20">
                                        <h2 className="text-base font-medium text-foreground flex items-center gap-2">
                                            <Shield size={16} className="text-primary" />
                                            Two-Factor Authentication
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-1">Add an extra layer of security to your account.</p>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                                    <Smartphone size={16} className="text-muted-foreground" />
                                                    Authenticator App
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-1">Use an app like Google Authenticator or Authy to generate verification codes.</p>
                                            </div>
                                            <span className="px-2 py-1 bg-success/10 text-success text-xs font-medium rounded border border-success/20 shrink-0">
                                                Configured
                                            </span>
                                        </div>

                                        <div className="flex items-start justify-between gap-4 pt-4 border-t border-border">
                                            <div>
                                                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                                                    <KeySquare size={16} className="text-muted-foreground" />
                                                    Hardware Security Key
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-1">Use a YubiKey or biometric authenticator (WebAuthn).</p>
                                            </div>
                                            <button className="px-3 py-1.5 text-xs font-medium bg-muted text-foreground hover:bg-muted/80 rounded transition-colors shrink-0">
                                                Add Key
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {/* Password Management */}
                                <section className="bg-card border border-border rounded-xl overflow-hidden">
                                    <div className="p-5 border-b border-border bg-muted/20">
                                        <h2 className="text-base font-medium text-foreground flex items-center gap-2">
                                            <KeySquare size={16} className="text-primary" />
                                            Password Management
                                        </h2>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-foreground">Current Password</label>
                                            <input
                                                type="password"
                                                placeholder="••••••••••••"
                                                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-foreground">New Password</label>
                                                <input
                                                    type="password"
                                                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                                                <input
                                                    type="password"
                                                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                                        <button className="flex items-center gap-2 px-4 py-2 text-sm text-foreground font-medium rounded-md hover:bg-muted bg-background border border-border transition-colors shadow-sm">
                                            Update Password
                                        </button>
                                    </div>
                                </section>

                                {/* Active Sessions */}
                                <section className="bg-card border border-border rounded-xl overflow-hidden">
                                    <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
                                        <h2 className="text-base font-medium text-foreground flex items-center gap-2">
                                            <Clock size={16} className="text-primary" />
                                            Active Sessions
                                        </h2>
                                        <button className="text-xs text-destructive hover:underline font-medium">Log out all devices</button>
                                    </div>

                                    <div className="divide-y divide-border">
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <Smartphone size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">Mac OS • Safari</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">New York, USA • 192.168.1.1</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded">Current Session</span>
                                        </div>
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                    <Smartphone size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">iOS • ScriptsXO App</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">New York, USA • Last active 2h ago</p>
                                                </div>
                                            </div>
                                            <button className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors">Revoke</button>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === "notifications" && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <section className="bg-card border border-border rounded-xl overflow-hidden">
                                    <div className="p-5 border-b border-border bg-muted/20">
                                        <h2 className="text-base font-medium text-foreground flex items-center gap-2">
                                            <Bell size={16} className="text-primary" />
                                            Alert Preferences
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-1">Choose how you want to be notified about platform activity.</p>
                                    </div>

                                    <div className="divide-y divide-border">
                                        <div className="p-6 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-medium text-foreground">System Audit Alerts</h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">Receive emails when critical settings are changed.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                                <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                                            </label>
                                        </div>

                                        <div className="p-6 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-medium text-foreground">New User Verifications</h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">Notify me when a provider profile requires manual approval.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                                <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                                            </label>
                                        </div>

                                        <div className="p-6 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-medium text-foreground">Weekly Digest</h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">Receive a summary report of platform activity every Monday.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" />
                                                <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                                            </label>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </AppShell>
    );
}
