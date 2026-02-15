"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Check,
  ArrowLeft,
  Shield,
  Loader2,
  Clock,
  UserCheck,
  Pill,
  Building2,
  CalendarCheck,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SITECONFIG, formatPrice } from "@/lib/config";
import { getSessionCookie } from "@/lib/auth";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";

// Dynamic import to avoid SSR issues with Whop embed
const WhopCheckoutEmbed = dynamic(
  () =>
    import("@whop/checkout/react").then((mod) => mod.WhopCheckoutEmbed),
  { ssr: false }
);

const STEPS = [
  { number: 1, label: "Payment", active: true },
  { number: 2, label: "Medical History", active: false },
  { number: 3, label: "Symptoms", active: false },
  { number: 4, label: "Verification", active: false },
  { number: 5, label: "Review", active: false },
];

const INCLUDED_FEATURES = [
  { icon: UserCheck, label: "Health Screening" },
  { icon: Clock, label: "Licensed Provider Review" },
  { icon: Pill, label: "E-Prescription" },
  { icon: Building2, label: "Pharmacy Coordination" },
  { icon: CalendarCheck, label: "Unlimited Consultations" },
];

export default function IntakePaymentPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="min-h-[80vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
          </div>
        </AppShell>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const createCheckoutSession = useAction(
    api.actions.whopCheckout.createCheckoutSession
  );
  const verifyMembership = useAction(
    api.actions.whopCheckout.verifyMembership
  );

  // Handle redirect-based return (fallback for external payment flows)
  useEffect(() => {
    const whopCheckout = searchParams.get("whop_checkout");
    if (whopCheckout === "success") {
      handlePostPayment();
      return;
    }

    // Create embedded checkout session on mount
    initCheckout();
  }, []);

  async function initCheckout() {
    try {
      const session = getSessionCookie();
      if (!session?.email) {
        setError("Session expired. Please sign in again.");
        setLoading(false);
        return;
      }

      const result = await createCheckoutSession({
        patientEmail: session.email,
      });

      setSessionId(result.sessionId);
    } catch (err: any) {
      setError(err.message || "Failed to initialize checkout");
    } finally {
      setLoading(false);
    }
  }

  async function handlePostPayment() {
    setCompleted(true);
    try {
      const session = getSessionCookie();
      if (!session?.email) {
        router.push("/access");
        return;
      }

      await verifyMembership({ patientEmail: session.email });
    } catch {
      // Webhook will handle it — proceed regardless
    }

    // Short delay for visual feedback then navigate
    setTimeout(() => {
      router.push("/intake/medical-history");
    }, 1500);
  }

  function handleCheckoutComplete() {
    setCompleted(true);

    const session = getSessionCookie();
    if (session?.email) {
      verifyMembership({ patientEmail: session.email }).catch(() => {
        // Webhook will handle async
      });
    }

    // Navigate after brief success state
    setTimeout(() => {
      router.push("/intake/medical-history");
    }, 1500);
  }

  if (completed) {
    return (
      <AppShell>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED]/10 to-[#2DD4BF]/10 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-[#2DD4BF]" />
            </div>
            <h2
              className="text-2xl font-light text-foreground mb-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Welcome to ScriptsXO
            </h2>
            <p className="text-muted-foreground font-light">
              Membership activated. Starting your intake...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[900px] mx-auto">
        {/* Step Progress */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((step, idx) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    step.active
                      ? "bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.number}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="w-12 h-[2px] bg-border mx-2" />
                )}
              </div>
            ))}
          </div>
          <p className="eyebrow text-[#7C3AED]">Step 1 of 5</p>
        </div>

        {/* Header */}
        <header className="mb-12">
          <h1
            className="text-4xl lg:text-5xl font-light tracking-[-0.03em] leading-[0.95] text-foreground mb-4"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Start Your <span className="gradient-text">Membership</span>
          </h1>
          <p className="text-muted-foreground font-light text-lg leading-relaxed max-w-2xl">
            Join ScriptsXO for unlimited telehealth consultations with licensed
            providers. Cancel anytime.
          </p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="glass-card p-4 mb-8 border-l-4 border-destructive">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Checkout Embed */}
          <div className="lg:col-span-3">
            <div className="glass-card p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-xl font-light text-foreground"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Complete Payment
                </h2>
                <div className="text-right">
                  <p
                    className="text-2xl font-light text-foreground"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {formatPrice(SITECONFIG.billing.membershipFee)}
                  </p>
                  <p className="text-xs text-muted-foreground font-light">
                    per month
                  </p>
                </div>
              </div>

              {/* Whop Embedded Checkout */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
                </div>
              ) : sessionId ? (
                <div className="min-h-[400px]">
                  <WhopCheckoutEmbed
                    sessionId={sessionId}
                    theme="light"
                    skipRedirect
                    onComplete={handleCheckoutComplete}
                    themeOptions={{ accentColor: "violet" }}
                    returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/intake/medical-history?whop_checkout=success`}
                    fallback={
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
                      </div>
                    }
                  />
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-sm text-muted-foreground">
                    Unable to load checkout. Please refresh the page.
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-start gap-3 bg-muted/30 rounded-lg p-4">
                <Shield className="w-5 h-5 text-[#2DD4BF] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  Secure, encrypted payment. We never store your card details.
                </p>
              </div>
            </div>
          </div>

          {/* Right: What's Included */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6 lg:p-8">
              <h3 className="text-sm font-medium text-foreground mb-5 flex items-center gap-2">
                <Check className="w-4 h-4 text-[#2DD4BF]" />
                What&apos;s Included
              </h3>
              <div className="space-y-4">
                {INCLUDED_FEATURES.map((feature) => (
                  <div key={feature.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#7C3AED]/10 to-[#2DD4BF]/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-4 h-4 text-[#7C3AED]" />
                    </div>
                    <span className="text-sm text-foreground font-light">
                      {feature.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cancel Anytime */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-start gap-3">
                  <X className="w-4 h-4 text-[#7C3AED] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">
                      Cancel Anytime
                    </p>
                    <p className="text-xs text-muted-foreground font-light leading-relaxed">
                      No contracts, no commitment. Cancel with one click.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 mt-8 border-t border-border">
          <Link
            href="/access"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
          <p className="text-xs text-muted-foreground font-light">
            Next: Medical History
          </p>
        </div>
      </div>
    </AppShell>
  );
}
