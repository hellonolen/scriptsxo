"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSessionCookie, setSessionCookie } from "@/lib/auth";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SITECONFIG } from "@/lib/config";

type PharmStep = "entry" | "verifying" | "verified" | "failed";

export default function PharmacyOnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<PharmStep>("entry");
  const [ncpdpId, setNcpdpId] = useState("");
  const [npiNumber, setNpiNumber] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const initVerification = useAction(
    api.actions.credentialVerificationOrchestrator.initializeVerification
  );
  const verifyPharmacy = useAction(
    api.agents.credentialVerificationAgent.verifyPharmacy
  );
  const finalizeVerification = useAction(
    api.actions.credentialVerificationOrchestrator.finalizeVerification
  );
  const devBypass = useAction(
    api.actions.credentialVerificationOrchestrator.devBypassVerification
  );

  useEffect(() => {
    const dev =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    setIsDev(dev);

    const sessionData = getSessionCookie();
    if (!sessionData) {
      router.push("/");
      return;
    }
    setSession(sessionData);
  }, [router]);

  const member = useQuery(
    api.members.getByEmail,
    session?.email ? { email: session.email } : "skip"
  );

  useEffect(() => {
    if (member?._id) {
      setMemberId(member._id);
    }
  }, [member]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!ncpdpId && !npiNumber) {
      setError("Please enter either an NCPDP ID or Pharmacy NPI number.");
      return;
    }

    setLoading(true);
    setError("");
    setStep("verifying");

    try {
      // Dev mode: simulate
      if (isDev && memberId) {
        await new Promise((r) => setTimeout(r, 1200));

        const result = await devBypass({
          memberId,
          email: session.email,
          selectedRole: "pharmacy",
        });

        if (result.success) {
          const updatedSession = { ...session, role: "pharmacy" };
          setSessionCookie(updatedSession);
          setStep("verified");
        }
        setLoading(false);
        return;
      }

      // Production flow
      if (!memberId) {
        setError("Account not ready.");
        setStep("entry");
        setLoading(false);
        return;
      }

      // Initialize verification
      const initResult = await initVerification({
        memberId,
        email: session.email,
        selectedRole: "pharmacy",
      });

      // Verify pharmacy credentials
      const pharmResult = await verifyPharmacy({
        verificationId: initResult.verificationId,
        ncpdpId: ncpdpId || undefined,
        npiNumber: npiNumber || undefined,
        pharmacyName: pharmacyName || undefined,
      });

      setVerificationResult(pharmResult);

      if (pharmResult.verified) {
        // Finalize
        const finalResult = await finalizeVerification({
          verificationId: initResult.verificationId,
          memberId,
        });

        if (finalResult.success) {
          const updatedSession = { ...session, role: "pharmacy" };
          setSessionCookie(updatedSession);
          setStep("verified");
        } else {
          setStep("failed");
          setError("Pharmacy verification was not approved.");
        }
      } else {
        setStep("failed");
        setError(
          pharmResult.npiResult?.issues?.join("; ") ||
            "Pharmacy credentials could not be verified."
        );
      }
    } catch (err) {
      setStep("failed");
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="h-14 border-b border-border flex items-center px-6 bg-background">
        <span className="text-[11px] tracking-[0.25em] text-foreground font-light uppercase">
          {SITECONFIG.brand.name}
        </span>
        <span className="mx-4 text-border">|</span>
        <span className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase font-light">
          Pharmacy Verification
        </span>
      </div>

      <div className="max-w-lg mx-auto px-6 py-16">
        {isDev && step !== "verified" && (
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-medium">
            DEV MODE
          </div>
        )}

        {/* ENTRY */}
        {step === "entry" && (
          <div className="space-y-8">
            <div>
              <h1
                className="text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Pharmacy Verification
              </h1>
              <p className="text-muted-foreground font-light text-sm">
                Enter your pharmacy credentials. We will verify them against federal registries.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-md">
                <XCircle size={16} className="text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive font-light">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Pharmacy Name"
                placeholder="Main Street Pharmacy"
                value={pharmacyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPharmacyName(e.target.value)
                }
              />

              <Input
                label="NCPDP Provider ID"
                placeholder="1234567"
                value={ncpdpId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setNcpdpId(e.target.value.replace(/\D/g, "").slice(0, 7));
                  setError("");
                }}
                maxLength={7}
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-xs text-muted-foreground font-light">
                    or
                  </span>
                </div>
              </div>

              <Input
                label="Pharmacy NPI Number"
                placeholder="1234567890"
                value={npiNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setNpiNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
                  setError("");
                }}
                maxLength={10}
              />

              <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-md">
                <Package size={16} className="text-[#2DD4BF] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground font-light">
                  Provide either your NCPDP ID or pharmacy NPI number. Our AI agents will verify your pharmacy credentials automatically.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || (!ncpdpId && !npiNumber)}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                Verify Pharmacy
              </Button>
            </form>

            <button
              onClick={() => router.push("/onboard")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light flex items-center gap-2"
            >
              <ArrowLeft size={13} />
              Choose a different role
            </button>
          </div>
        )}

        {/* VERIFYING */}
        {step === "verifying" && (
          <div className="text-center py-20 space-y-6">
            <div className="w-10 h-10 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground font-light">
              {isDev ? "Simulating verification..." : "Verifying pharmacy credentials..."}
            </p>
          </div>
        )}

        {/* VERIFIED */}
        {step === "verified" && (
          <div className="text-center py-12 space-y-8">
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
            >
              <CheckCircle2 size={28} className="text-white" />
            </div>
            <div>
              <h1
                className="text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Pharmacy Verified
              </h1>
              <p className="text-muted-foreground font-light text-sm max-w-sm mx-auto">
                Your pharmacy credentials have been confirmed. You now have access to the pharmacy portal.
              </p>
            </div>
            <Button onClick={() => router.push("/pharmacy")} size="lg">
              Go to Pharmacy Portal
              <ArrowRight size={14} />
            </Button>
          </div>
        )}

        {/* FAILED */}
        {step === "failed" && (
          <div className="text-center py-12 space-y-8">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-destructive/10">
              <XCircle size={28} className="text-destructive" />
            </div>
            <div>
              <h1
                className="text-3xl font-light text-foreground mb-3"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Verification Failed
              </h1>
              <p className="text-muted-foreground font-light text-sm max-w-sm mx-auto">
                {error || "Pharmacy credentials could not be verified."}
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => {
                  setStep("entry");
                  setError("");
                }}
                variant="outline"
              >
                Try Again
              </Button>
              <Button
                onClick={() => {
                  window.location.href = `mailto:${SITECONFIG.brand.supportEmail}?subject=Pharmacy Verification Issue`;
                }}
                variant="outline"
              >
                Contact Support
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
