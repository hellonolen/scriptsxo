"use client";

import { useState, useEffect } from "react";
import { CreditCard, Receipt, Download, DollarSign, Loader2, CheckCircle2, Calendar, Shield } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";
import { formatPrice } from "@/lib/config";

export default function DashboardBillingPage() {
    const [sessionChecked, setSessionChecked] = useState(false);

    useEffect(() => {
        getSessionCookie();
        setSessionChecked(true);
    }, []);

    if (!sessionChecked) {
        return (
            <AppShell>
                <div className="p-6 lg:p-10 max-w-[1200px]">
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={28} className="animate-spin text-muted-foreground" />
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="p-6 lg:p-10 max-w-[1200px]">

                {/* Header */}
                <header className="mb-10">
                    <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground mb-2">ACCOUNT</p>
                    <h1 className="text-3xl font-light text-foreground tracking-[-0.02em]" style={{ fontFamily: "var(--font-heading)" }}>
                        Billing <span style={{ color: "#7C3AED" }}>&amp; Payments</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your membership, view payment history, and download receipts.</p>
                </header>

                {/* Membership Card */}
                <section className="mb-10">
                    <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground mb-4">Membership</p>
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(91,33,182,0.10)" }}>
                                    <Shield size={20} style={{ color: "#5B21B6" }} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">ScriptsXO Consumer Plan</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">$97 / month · Renews automatically</p>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase font-medium px-3 py-1.5 rounded-full" style={{ background: "rgba(5,150,105,0.10)", color: "#059669" }}>
                                <CheckCircle2 size={11} />
                                Active
                            </span>
                        </div>

                        <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-6">
                            {[
                                { label: "Next Billing Date", value: "Mar 26, 2026", icon: Calendar },
                                { label: "Amount Due", value: "$97.00", icon: DollarSign },
                                { label: "Payment Method", value: "Card on file", icon: CreditCard },
                            ].map(({ label, value, icon: Icon }) => (
                                <div key={label}>
                                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                                        <Icon size={11} />
                                        {label}
                                    </p>
                                    <p className="text-sm font-medium text-foreground">{value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button className="px-4 py-2 text-xs font-medium border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
                                Update Payment Method
                            </button>
                            <button className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                Cancel Membership
                            </button>
                        </div>
                    </div>
                </section>

                {/* Payment History */}
                <section>
                    <p className="text-[10px] tracking-[0.2em] font-medium uppercase text-muted-foreground mb-4">Payment History</p>

                    {/* Static mock history — billing API not yet available */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="divide-y divide-border">
                            {[
                                { label: "Monthly Membership", date: "Feb 26, 2026", amount: "$97.00", status: "paid" },
                                { label: "Monthly Membership", date: "Jan 26, 2026", amount: "$97.00", status: "paid" },
                                { label: "Monthly Membership", date: "Dec 26, 2025", amount: "$97.00", status: "paid" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50">
                                            <Receipt size={14} className="text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{item.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-medium text-foreground">{item.amount}</span>
                                        <span className="text-[10px] tracking-wide uppercase font-medium px-2.5 py-1 rounded-full text-emerald-700 bg-emerald-50">Paid</span>
                                        <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Download receipt">
                                            <Download size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

            </div>
        </AppShell>
    );
}
