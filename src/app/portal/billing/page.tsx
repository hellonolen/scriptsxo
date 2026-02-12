"use client";

import { CreditCard, Receipt, Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { formatPrice } from "@/lib/config";

/* ---------------------------------------------------------------------------
   DATA
   --------------------------------------------------------------------------- */

const PAYMENT_METHOD = {
  brand: "Visa",
  last4: "4242",
  expires: "12/27",
};

const PAYMENT_HISTORY = [
  { date: "Feb 7, 2026", description: "AI Consultation", amount: 7500, status: "Paid" as const },
  { date: "Jan 20, 2026", description: "AI Consultation", amount: 7500, status: "Paid" as const },
  { date: "Dec 15, 2025", description: "AI Consultation", amount: 7500, status: "Paid" as const },
] as const;

/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

export default function BillingPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1100px]">

        {/* ---- HEADER ---- */}
        <header className="mb-10">
          <p className="eyebrow mb-2">Account</p>
          <h1
            className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Billing <span className="text-[#7C3AED]">&amp; Payments</span>
          </h1>
        </header>

        {/* ---- PAYMENT METHOD ---- */}
        <section className="mb-10">
          <p className="eyebrow mb-4">Payment Method</p>

          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 flex items-center justify-center shrink-0" style={{ background: "rgba(124, 58, 237, 0.08)" }}>
                  <CreditCard size={18} className="text-[#7C3AED]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    {PAYMENT_METHOD.brand} ending in {PAYMENT_METHOD.last4}
                  </p>
                  <p className="text-[12px] text-muted-foreground font-light">
                    Expires {PAYMENT_METHOD.expires}
                  </p>
                </div>
              </div>
              <button className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground hover:text-[#7C3AED] transition-colors">
                Update
              </button>
            </div>
          </div>
        </section>

        {/* ---- PAYMENT HISTORY ---- */}
        <section>
          <p className="eyebrow mb-4">Payment History</p>

          <div className="glass-card p-0 divide-y divide-border">
            {PAYMENT_HISTORY.map((payment) => (
              <div
                key={payment.date}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-[#16A34A]/8 flex items-center justify-center shrink-0">
                    <Receipt size={14} className="text-[#16A34A]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-foreground">
                      {payment.description}
                    </p>
                    <p className="text-[12px] text-muted-foreground font-light">
                      {payment.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <span
                    className="text-[15px] font-light text-foreground"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {formatPrice(payment.amount)}
                  </span>
                  <span className="text-[9px] tracking-[0.15em] uppercase font-medium px-2.5 py-1 text-[#16A34A] bg-[#16A34A]/8">
                    {payment.status}
                  </span>
                  <button
                    className="text-muted-foreground hover:text-[#7C3AED] transition-colors"
                    aria-label={`Download receipt for ${payment.date}`}
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </AppShell>
  );
}
