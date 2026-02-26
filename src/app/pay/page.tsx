"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Shield,
  Stethoscope,
  Pill,
  MessageSquare,
  Truck,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { SITECONFIG, formatPrice } from "@/lib/config";
import { getSessionCookie } from "@/lib/auth";

/* ---------------------------------------------------------------------------
   CONSTANTS
   --------------------------------------------------------------------------- */

const MEMBERSHIP_FEATURES = [
  {
    icon: Stethoscope,
    label: "Licensed Physicians",
    description: "Connect with board-certified providers on demand",
  },
  {
    icon: MessageSquare,
    label: "Health Concierge",
    description: "24/7 intelligent health guidance and triage",
  },
  {
    icon: Pill,
    label: "Prescription Management",
    description: "Seamless e-prescribe and medication tracking",
  },
  {
    icon: Shield,
    label: "Secure Messaging",
    description: "HIPAA-compliant provider communication",
  },
  {
    icon: Truck,
    label: "Pharmacy Routing",
    description: "Prescriptions sent to your preferred pharmacy",
  },
] as const;

/* ---------------------------------------------------------------------------
   PAGE (wrapped in Suspense for useSearchParams)
   --------------------------------------------------------------------------- */

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen mesh-bg bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#7C3AED" }} />
        </div>
      }
    >
      <PayPageInner />
    </Suspense>
  );
}

function PayPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckout = useAction(api.actions.whopCheckout.createCheckoutSession);
  const verifyMembership = useAction(api.actions.whopCheckout.verifyMembership);

  // Check session on mount
  useEffect(() => {
    const session = getSessionCookie();
    if (!session?.email) {
      router.replace("/access?redirect=/pay");
      return;
    }
    setEmail(session.email);

    // Already paid — go to dashboard
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((session as any).paymentStatus === "active") {
      router.replace("/dashboard/messages");
    }
  }, [router]);

  // Handle Whop checkout success callback
  const handlePostCheckoutVerification = useCallback(async () => {
    if (!email) return;
    setVerifying(true);
    setError(null);

    try {
      const result = await verifyMembership({ patientEmail: email });
      if (result.success) {
        // Update the session cookie with paymentStatus
        const session = getSessionCookie();
        if (session) {
          const updated = { ...session, paymentStatus: "active" as const };
          const cookieValue = encodeURIComponent(JSON.stringify(updated));
          const expires = new Date(updated.expiresAt).toUTCString();
          document.cookie = `app_session=${cookieValue}; path=/; expires=${expires}; SameSite=Lax; Secure`;
        }
        router.replace("/dashboard/messages");
      } else {
        setError(result.error || "Membership verification failed. Please contact support.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
    } finally {
      setVerifying(false);
    }
  }, [email, verifyMembership, router]);

  // Detect checkout success from URL
  useEffect(() => {
    if (searchParams.get("whop_checkout") === "success" && email) {
      handlePostCheckoutVerification();
    }
  }, [searchParams, email, handlePostCheckoutVerification]);

  async function handleSubscribe() {
    if (!email) return;
    setLoading(true);
    setError(null);

    try {
      const result = await createCheckout({ patientEmail: email });
      if (result.purchaseUrl) {
        window.location.href = result.purchaseUrl;
      } else {
        setError("Unable to create checkout session. Please try again.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Checkout failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const formattedPrice = formatPrice(SITECONFIG.billing.membershipFee);

  // Show a loading state while verifying post-checkout
  if (verifying) {
    return (
      <div className="min-h-screen mesh-bg bg-background flex items-center justify-center">
        <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: "#7C3AED" }} />
          <h2
            className="text-xl font-medium mb-2"
            style={{ fontFamily: "var(--font-playfair)", color: "#1E1037" }}
          >
            Verifying Your Membership
          </h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we confirm your payment...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg bg-background">
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
        {/* Header */}
        <div className="text-center mb-10 max-w-lg">
          <p
            className="text-[11px] tracking-[0.2em] uppercase font-medium mb-4"
            style={{ color: "#7C3AED" }}
          >
            {SITECONFIG.brand.name}
          </p>
          <h1
            className="text-3xl sm:text-4xl font-medium mb-4 gradient-text"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Activate Your Membership
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Unlock on-demand telehealth consultations, secure health guidance,
            and seamless prescription management.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="glass-card rounded-2xl p-8 sm:p-10 max-w-md w-full">
          {/* Price */}
          <div className="text-center mb-8">
            <div className="flex items-baseline justify-center gap-1">
              <span
                className="text-4xl sm:text-5xl font-semibold"
                style={{ fontFamily: "var(--font-playfair)", color: "#1E1037" }}
              >
                {formattedPrice}
              </span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Cancel anytime. No long-term commitment.
            </p>
          </div>

          {/* Divider */}
          <div
            className="h-px w-full mb-6"
            style={{
              background: "linear-gradient(90deg, transparent, #7C3AED40, #2DD4BF40, transparent)",
            }}
          />

          {/* Features */}
          <ul className="space-y-4 mb-8">
            {MEMBERSHIP_FEATURES.map((feature) => (
              <li key={feature.label} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "linear-gradient(135deg, #7C3AED15, #2DD4BF15)" }}
                >
                  <feature.icon
                    size={16}
                    style={{ color: "#7C3AED" }}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "#1E1037" }}
                  >
                    {feature.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Error */}
          {error && (
            <div
              className="rounded-lg px-4 py-3 mb-4 text-sm"
              style={{
                background: "#FEF2F2",
                color: "#991B1B",
                border: "1px solid #FECACA",
              }}
            >
              {error}
            </div>
          )}

          {/* Subscribe Button */}
          <button
            onClick={handleSubscribe}
            disabled={loading || !email}
            className="w-full py-3.5 px-6 rounded-xl text-sm font-medium text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #2DD4BF)",
              boxShadow: "0 4px 14px rgba(124, 58, 237, 0.3)",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating Checkout...
              </>
            ) : (
              <>
                Subscribe Now
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Security note */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <Shield size={12} style={{ color: "#2DD4BF" }} />
            <p className="text-[11px] text-muted-foreground">
              Secure, encrypted payment · HIPAA-compliant
            </p>
          </div>
        </div>

        {/* Already have membership? */}
        <div className="mt-8 text-center">
          <button
            onClick={handlePostCheckoutVerification}
            className="text-xs font-medium transition-colors hover:underline"
            style={{ color: "#7C3AED" }}
          >
            Already subscribed? Click here to verify your membership.
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-[11px] text-muted-foreground text-center max-w-sm">
          By subscribing, you agree to our{" "}
          <a
            href={SITECONFIG.legal.termsUrl}
            className="underline"
            style={{ color: "#7C3AED" }}
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href={SITECONFIG.legal.privacyUrl}
            className="underline"
            style={{ color: "#7C3AED" }}
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
