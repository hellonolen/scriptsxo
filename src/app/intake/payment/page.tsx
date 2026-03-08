"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ShieldCheck, Loader2, UserCheck, Clock, Pill, Building2, CalendarCheck, Shield } from "lucide-react";
import { SITECONFIG, formatPrice } from "@/lib/config";
import { getSessionCookie } from "@/lib/auth";

const WhopCheckoutEmbed = dynamic(
  () => import("@whop/checkout/react").then((mod) => mod.WhopCheckoutEmbed),
  { ssr: false }
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";

const STEPS = [
  { id: 1, label: "Symptoms" },
  { id: 2, label: "History" },
  { id: 3, label: "Verify" },
  { id: 4, label: "Payment" },
  { id: 5, label: "Review" },
];

const INCLUDED = [
  { icon: UserCheck, label: "Health Screening" },
  { icon: Clock, label: "Licensed Provider Review" },
  { icon: Pill, label: "E-Prescription" },
  { icon: Building2, label: "Pharmacy Coordination" },
  { icon: CalendarCheck, label: "Unlimited Consultations" },
];

export default function IntakePaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}

function StepHeader({ currentStep, pct }: { currentStep: number; pct: number }) {
  return (
    <>
      <header className="bg-card border-b border-border px-6 h-14 flex items-center justify-between shrink-0">
        <div>
          <span className="text-[15px] font-bold tracking-tight text-foreground">ScriptsXO</span>
          <div className="mt-1 w-6 h-[2px] rounded-full bg-brand-secondary" />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          HIPAA Compliant
        </div>
      </header>
      <div className="progress-bar h-[3px] rounded-none shrink-0">
        <div className="progress-bar-fill transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </>
  );
}

function StepDots({ currentStep }: { currentStep: number }) {
  return (
    <>
      <div className="flex items-center mb-6 px-2">
        {STEPS.map((st, i) => (
          <div key={st.id} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div className={[
              "rounded-full shrink-0 flex items-center justify-center font-bold transition-all duration-300",
              st.id === currentStep
                ? "w-8 h-8 bg-brand-secondary text-white shadow-[0_0_0_4px_rgba(124,58,237,0.15)]"
                : st.id < currentStep
                ? "w-7 h-7 bg-brand-secondary text-white"
                : "w-7 h-7 bg-transparent border-2 border-border text-muted-foreground",
            ].join(" ")}>
              {st.id < currentStep ? (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span className={st.id === currentStep ? "text-[13px]" : "text-[11px]"}>{st.id}</span>
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div className={["flex-1 h-0.5 mx-1 rounded-full transition-colors duration-300", st.id < currentStep ? "bg-brand-secondary" : "bg-border"].join(" ")} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mb-8 px-1">
        {STEPS.map(st => (
          <div key={st.id} className={["flex-1 text-center eyebrow transition-colors duration-300", st.id === currentStep || st.id < currentStep ? "text-brand-secondary" : "text-muted-foreground"].join(" ")}>
            {st.label}
          </div>
        ))}
      </div>
    </>
  );
}

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const currentStep = 4;
  const pct = (currentStep / STEPS.length) * 100;

  useEffect(() => {
    const whopCheckout = searchParams.get("whop_checkout");
    if (whopCheckout === "success") { handlePostPayment(); return; }
    initCheckout();
  }, [searchParams]);

  async function initCheckout() {
    try {
      const session = getSessionCookie();
      if (!session?.email) { setError("Session expired. Please sign in again."); setLoading(false); return; }

      const res = await fetch(`${API_BASE}/whop/checkout/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patientEmail: session.email, sessionToken: session.sessionToken ?? "" }),
      });
      const json = await res.json() as { success: boolean; data?: { sessionId: string }; error?: string };
      if (!json.success || !json.data) throw new Error(json.error ?? "Failed to initialize checkout");
      setSessionId(json.data.sessionId);
    } catch (err: any) {
      setError(err.message || "Failed to initialize checkout");
    } finally {
      setLoading(false);
    }
  }

  async function verifyMembership(email: string, sessionToken: string) {
    await fetch(`${API_BASE}/whop/membership/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ patientEmail: email, sessionToken }),
    });
  }

  async function handlePostPayment() {
    setCompleted(true);
    try {
      const session = getSessionCookie();
      if (!session?.email) { router.push("/access"); return; }
      await verifyMembership(session.email, session.sessionToken ?? "");
    } catch { }
    setTimeout(() => router.push("/intake/review"), 1500);
  }

  function handleCheckoutComplete() {
    setCompleted(true);
    const session = getSessionCookie();
    if (session?.email) {
      verifyMembership(session.email, session.sessionToken ?? "").catch(() => {});
    }
    setTimeout(() => router.push("/intake/review"), 1500);
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <StepHeader currentStep={currentStep} pct={pct} />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="glass-card text-center max-w-sm w-full">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              Payment Successful
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Membership activated. Proceeding to review...</p>
            <Loader2 className="w-5 h-5 animate-spin text-brand-secondary mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StepHeader currentStep={currentStep} pct={pct} />

      <main className="flex-1 flex justify-center px-4 py-8 pb-16">
        <div className="w-full max-w-[560px]">
          <StepDots currentStep={currentStep} />

          <div className="glass-card mb-4">
            <div className="mb-5">
              <h1 className="text-xl font-medium text-foreground mb-1.5 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                Start Your Membership
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unlimited telehealth consultations with licensed providers. Cancel anytime.
              </p>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1 mb-5 pb-5 border-b border-border">
              <span className="text-3xl font-light text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                {formatPrice(SITECONFIG.billing.membershipFee)}
              </span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>

            {/* What's included */}
            <div className="space-y-3 mb-5">
              {INCLUDED.map(f => (
                <div key={f.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <f.icon className="w-4 h-4 text-brand-secondary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{f.label}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 mb-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Checkout area */}
            <div className="min-h-[200px] flex items-center justify-center">
              {loading ? (
                <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
              ) : sessionId ? (
                <div className="w-full relative z-10">
                  <WhopCheckoutEmbed
                    sessionId={sessionId}
                    theme="light"
                    skipRedirect
                    onComplete={handleCheckoutComplete}
                    themeOptions={{ accentColor: "violet" }}
                    returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/intake/review?whop_checkout=success`}
                    fallback={<div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-secondary" /></div>}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to load checkout. Please refresh.</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5 px-1">
            <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Secure, encrypted payment. We never store your card details on our servers.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
