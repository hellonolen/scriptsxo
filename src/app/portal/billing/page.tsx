"use client";

import { useState, useEffect } from "react";
import { CreditCard, Receipt, Download, DollarSign } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatPrice } from "@/lib/config";

/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

export default function BillingPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const session = getSessionCookie();
    if (session?.email) {
      setEmail(session.email);
    }
  }, []);

  // Fetch patient data
  const patient = useQuery(
    api.patients.getByEmail,
    email ? { email } : "skip"
  );

  // Fetch billing records
  const billingRecords = useQuery(
    api.billing.getByPatient,
    patient ? { patientId: patient._id } : "skip"
  );

  // Loading state
  if (patient === undefined || billingRecords === undefined) {
    return (
      <AppShell>
        <div className="p-6 lg:p-10 max-w-[1100px]">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "#7C3AED", borderTopColor: "transparent" }} />
              <p className="text-sm text-muted-foreground">Loading billing...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

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
                    Payment on file
                  </p>
                  <p className="text-[12px] text-muted-foreground font-light">
                    Managed via Stripe
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

          {billingRecords && billingRecords.length > 0 ? (
            <div className="glass-card p-0 divide-y divide-border">
              {billingRecords.map((payment) => (
                <div
                  key={payment._id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 flex items-center justify-center shrink-0 ${
                      payment.status === "paid" ? "bg-[#16A34A]/8" : "bg-[#CA8A04]/8"
                    }`}>
                      <Receipt size={14} className={payment.status === "paid" ? "text-[#16A34A]" : "text-[#CA8A04]"} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-foreground capitalize">
                        {payment.type.replace("_", " ")}
                      </p>
                      <p className="text-[12px] text-muted-foreground font-light">
                        {new Date(payment.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
                    <span className={`text-[9px] tracking-[0.15em] uppercase font-medium px-2.5 py-1 ${
                      payment.status === "paid"
                        ? "text-[#16A34A] bg-[#16A34A]/8"
                        : payment.status === "pending"
                        ? "text-[#CA8A04] bg-[#CA8A04]/8"
                        : "text-muted-foreground bg-muted"
                    }`}>
                      {payment.status}
                    </span>
                    {payment.status === "paid" && (
                      <button
                        className="text-muted-foreground hover:text-[#7C3AED] transition-colors"
                        aria-label={`Download receipt for ${new Date(payment.createdAt).toLocaleDateString()}`}
                      >
                        <Download size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card text-center py-16">
              <DollarSign size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-light text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                No Payment History
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your payment history will appear here after your first consultation.
              </p>
            </div>
          )}
        </section>

      </div>
    </AppShell>
  );
}
