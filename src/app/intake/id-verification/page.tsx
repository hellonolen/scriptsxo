"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, CheckCircle2, XCircle, Lock } from "lucide-react";
import { getSessionCookie } from "@/lib/auth";
import { loadStripe } from "@stripe/stripe-js";

const STEPS = [
  { id: 1, label: "Symptoms" },
  { id: 2, label: "History" },
  { id: 3, label: "Verify" },
  { id: 4, label: "Payment" },
  { id: 5, label: "Review" },
];

export default function IDVerificationPage() {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const currentStep = 3;
  const pct = (currentStep / STEPS.length) * 100;

  useEffect(() => {
    const stored = localStorage.getItem("sxo_medical_history");
    if (!stored) router.push("/intake/medical-history");
  }, [router]);

  async function handleVerify() {
    if (!consent) return;

    const session = getSessionCookie();
    if (!session?.email) { setErrorMessage("No session found. Please sign in again."); return; }

    setStatus("verifying");
    setErrorMessage("");

    try {
      // Call the Worker API to create a Stripe Identity verification session
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev"}/stripe/identity/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ patientEmail: session.email }),
        }
      );
      const json = await res.json() as { success: boolean; data?: { verificationSessionId: string; clientSecret: string }; error?: string };

      if (!json.success || !json.data) {
        throw new Error(json.error ?? "Failed to create verification session");
      }

      const { verificationSessionId, clientSecret } = json.data;
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) throw new Error("Failed to load Stripe");

      const { error } = await stripe.verifyIdentity(clientSecret);
      if (error) { setStatus("failed"); setErrorMessage(error.message || "Verification failed"); return; }

      // Check verification status
      const checkRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev"}/stripe/identity/check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ verificationSessionId, patientEmail: session.email }),
        }
      );
      const checkJson = await checkRes.json() as { success: boolean; data?: { success: boolean; lastError?: { message?: string } }; error?: string };

      if (checkJson.success && checkJson.data?.success) {
        setStatus("verified");
        localStorage.setItem("sxo_id_verified", "true");
      } else {
        setStatus("failed");
        setErrorMessage(checkJson.data?.lastError?.message || "Verification was not completed");
      }
    } catch (err) {
      setStatus("failed");
      setErrorMessage(err instanceof Error ? err.message : "Verification failed");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
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

      {/* Progress bar */}
      <div className="progress-bar h-[3px] rounded-none shrink-0">
        <div className="progress-bar-fill transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <main className="flex-1 flex justify-center px-4 py-8 pb-16">
        <div className="w-full max-w-[560px]">

          {/* Step dots */}
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

          {/* Step labels */}
          <div className="flex justify-between mb-8 px-1">
            {STEPS.map(st => (
              <div key={st.id} className={["flex-1 text-center eyebrow transition-colors duration-300", st.id === currentStep || st.id < currentStep ? "text-brand-secondary" : "text-muted-foreground"].join(" ")}>
                {st.label}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="glass-card mb-6">
            <div className="mb-6">
              <h1 className="text-xl font-medium text-foreground mb-1.5 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                Identity Verification
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Regulations require identity verification for telehealth prescriptions.
              </p>
            </div>

            {/* Verified state */}
            {status === "verified" && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Identity Verified</p>
                  <p className="text-sm text-muted-foreground">Your identity has been confirmed. You can now proceed.</p>
                </div>
              </div>
            )}

            {/* Failed state */}
            {status === "failed" && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 flex flex-col items-center text-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-7 h-7 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Verification Failed</p>
                  <p className="text-sm text-muted-foreground">{errorMessage || "Please try again."}</p>
                </div>
              </div>
            )}

            {/* Idle state */}
            {status === "idle" && (
              <>
                <div className="space-y-4 mb-6">
                  {[
                    { n: "1", title: "Secure Portal", desc: "Click below to open the Stripe Identity verification portal." },
                    { n: "2", title: "ID Scan", desc: "Upload front and back of your government-issued ID." },
                    { n: "3", title: "Selfie Match", desc: "Take a quick selfie to match your ID photo." },
                  ].map(item => (
                    <div key={item.n} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-brand-secondary/10 flex items-center justify-center shrink-0 text-brand-secondary text-xs font-bold">{item.n}</div>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-0.5">{item.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Security notice */}
                <div className="flex gap-3 p-4 rounded-xl bg-brand-secondary/[0.04] border border-brand-secondary/15 mb-5">
                  <Lock className="w-4 h-4 text-brand-secondary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Processed securely by Stripe. ScriptsXO only receives a verification status — your ID images are never stored by us.
                  </p>
                </div>

                {/* Consent */}
                <div className="flex gap-3 p-4 rounded-xl border border-border hover:border-brand-secondary/30 bg-card cursor-pointer transition-colors"
                  onClick={() => setConsent(!consent)}>
                  <div className={["w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors", consent ? "border-brand-secondary bg-brand-secondary" : "border-muted-foreground/30 bg-background"].join(" ")}>
                    {consent && <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed select-none">
                    I confirm the identity documents I provide are authentic and belong to me. I consent to ScriptsXO verifying my identity through Stripe Identity.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Action button */}
          {status === "verified" ? (
            <button onClick={() => router.push("/intake/payment")}
              className="btn-gradient w-full py-3.5 text-sm font-medium relative z-10">
              Continue to Payment
            </button>
          ) : status === "verifying" ? (
            <div className="w-full py-3.5 flex items-center justify-center gap-2 text-sm text-muted-foreground border border-border rounded-xl bg-background">
              <span className="spinner" />
              Verifying...
            </div>
          ) : status === "failed" ? (
            <button onClick={handleVerify} disabled={!consent}
              className={["btn-gradient w-full py-3.5 text-sm font-medium relative z-10", !consent && "opacity-40 cursor-not-allowed"].join(" ")}>
              Try Again
            </button>
          ) : (
            <button onClick={handleVerify} disabled={!consent}
              className={["btn-gradient w-full py-3.5 text-sm font-medium relative z-10", !consent && "opacity-40 cursor-not-allowed"].join(" ")}>
              Verify Identity
            </button>
          )}

          <p className="text-center mt-5 text-[11px] text-muted-foreground leading-relaxed">
            Your information is protected under HIPAA and encrypted in transit.
          </p>
        </div>
      </main>
    </div>
  );
}
