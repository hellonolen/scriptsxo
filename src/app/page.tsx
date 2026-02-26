"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, ShieldCheck, AlertCircle, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITECONFIG } from "@/lib/config";
import {
  createSession,
  setSessionCookie,
  getSessionCookie,
  isAdminEmail,
  createAdminSession,
  setAdminCookie,
} from "@/lib/auth";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  registerPasskey,
  authenticatePasskey,
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
} from "@/lib/webauthn";

type AuthStep =
  | "hero"
  | "email"
  | "name"
  | "processing"
  | "routing"
  | "error"
  | "unsupported"
  | "magic_link_sent"
  | "magic_link_verify";

/* ---------------------------------------------------------------------------
   DEV MODE DETECTION
   In development (localhost), env vars aren't set so we skip external services
   and let users log in directly. Middleware also skips auth in dev.
   NOTE: Must be computed inside useEffect to avoid SSR hydration mismatch.
   --------------------------------------------------------------------------- */

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>("hero");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [intent, setIntent] = useState<"client" | "provider" | null>(null);
  const [passkeysAvailable, setPasskeysAvailable] = useState(true);
  const [isDev, setIsDev] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Detect dev mode after mount to prevent SSR hydration mismatch
  useEffect(() => {
    const dev =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    setIsDev(dev);
  }, []);

  // WebAuthn server actions (used in production)
  const getRegOptions = useAction(
    api.actions.webauthn.getRegistrationOptions
  );
  const verifyReg = useAction(
    api.actions.webauthn.verifyAndStoreRegistration
  );
  const getAuthOptions = useAction(
    api.actions.webauthn.getAuthenticationOptions
  );
  const verifyAuth = useAction(api.actions.webauthn.verifyAuthentication);

  // Magic link actions (used in production)
  const requestMagicCode = useAction(api.actions.emailAuth.requestCode);
  const verifyMagicCode = useAction(api.actions.emailAuth.verifyCode);
  const getOrCreateMember = useMutation(api.members.getOrCreate);

  // Patient/membership queries for post-auth routing
  const [routingEmail, setRoutingEmail] = useState<string | null>(null);

  const patient = useQuery(
    api.patients.getByEmail,
    routingEmail ? { email: routingEmail } : "skip"
  );
  const membership = useQuery(
    api.passkeys.getMembershipStatus,
    routingEmail ? { email: routingEmail } : "skip"
  );

  // Check WebAuthn support on mount (skip in dev)
  useEffect(() => {
    if (isDev) {
      setPasskeysAvailable(false); // Don't show passkey UI in dev
      return;
    }
    async function checkSupport() {
      if (!isWebAuthnSupported()) {
        setPasskeysAvailable(false);
        return;
      }
      const platformAvailable = await isPlatformAuthenticatorAvailable();
      if (!platformAvailable) {
        setPasskeysAvailable(false);
      }
    }
    checkSupport();
  }, []);

  // Focus code input when magic link step is shown
  useEffect(() => {
    if (step === "magic_link_verify" && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  // Route when patient/membership data loads (production flow)
  useEffect(() => {
    if (step !== "routing" || !routingEmail) return;

    // Check session role — route based on verified role
    const currentSession = getSessionCookie();
    const role = currentSession?.role;

    // Admins always go straight to dashboard
    if (role === "admin") {
      router.push("/dashboard");
      return;
    }

    // Unverified users go to credential verification onboarding
    if (role === "unverified" || !role) {
      router.push("/access/setup");
      return;
    }

    // Verified providers go to provider portal
    if (role === "provider") {
      router.push("/provider");
      return;
    }

    // Verified pharmacy users go to pharmacy portal
    if (role === "pharmacy") {
      router.push("/pharmacy");
      return;
    }

    // Verified patients — check payment status
    if (isDev) {
      router.push("/dashboard");
      return;
    }

    if (patient === undefined || membership === undefined) return;

    // Update session cookie with payment status before routing
    if (currentSession) {
      const paymentStatus = membership?.isPaid === true ? "active" : "none";
      setSessionCookie({ ...currentSession, paymentStatus });
    }

    const hasPaid = membership?.isPaid === true;
    if (patient && hasPaid) {
      router.push("/dashboard");
    } else {
      router.push("/intake/symptoms");
    }
  }, [step, routingEmail, patient, membership, router, isDev]);

  function handleAuthError(err: unknown) {
    const rawMessage =
      err instanceof Error ? err.message : "An unexpected error occurred";
    const convexData = (err as Record<string, unknown>)?.data;
    const message = typeof convexData === "string" ? convexData : rawMessage;

    if (
      message.includes("NotAllowed") ||
      message.includes("cancelled") ||
      message.includes("aborted") ||
      message.includes("The operation either timed out")
    ) {
      setError("Authentication was cancelled. Please try again.");
    } else {
      setError(message);
    }
    setStep("error");
  }

  function completeAuth(authEmail: string, authName?: string, sessionToken?: string) {
    const baseSession = createSession(authEmail, authName);
    const session = sessionToken ? { ...baseSession, sessionToken } : baseSession;
    setSessionCookie(session);

    if (isAdminEmail(authEmail)) {
      setAdminCookie(createAdminSession(authEmail));
    }

    setRoutingEmail(authEmail.toLowerCase());
    setStep("routing");
    setStatusText("Signing you in...");
  }

  /**
   * DEV MODE: Just create session and go. No external services needed.
   */
  async function handleDevLogin() {
    if (!email.trim()) return;
    const displayName = email.split("@")[0];
    // Ensure a Convex member record exists before navigating to /onboard
    await getOrCreateMember({ email: email.toLowerCase(), name: displayName });
    completeAuth(email, displayName);
  }

  /**
   * Email submit handler.
   * - Dev mode: instant login (no external services)
   * - Production + no passkeys: magic link
   * - Production + passkeys: try passkey, fall back to magic link
   */
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    // Dev mode: skip everything, just log in
    if (isDev) {
      await handleDevLogin();
      return;
    }

    // Production: if no passkeys available, use magic link
    if (!passkeysAvailable) {
      await handleRequestMagicLink();
      return;
    }

    setStep("processing");
    setStatusText("Checking your account...");
    setError("");

    try {
      const authOptions = await getAuthOptions({
        email: email.toLowerCase(),
      });

      setStatusText("Verify with your device...");
      const authentication = await authenticatePasskey(authOptions);

      setStatusText("Verifying...");
      const result = await verifyAuth({
        email: email.toLowerCase(),
        response: JSON.stringify(authentication),
      });

      if (!result.success) throw new Error(result.error);

      completeAuth(email, undefined, result.sessionToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      const convexData = (err as Record<string, unknown>)?.data;
      const fullMessage = typeof convexData === "string" ? convexData : message;
      // No passkeys → show registration form
      if (
        fullMessage.includes("No passkeys") ||
        fullMessage.includes("no credentials") ||
        fullMessage.includes("No passkeys registered")
      ) {
        setStep("name");
        setError("");
      } else if (
        message.includes("RP ID") ||
        message.includes("invalid for this domain")
      ) {
        await handleRequestMagicLink();
      } else {
        handleAuthError(err);
      }
    }
  }

  /**
   * Registration: create passkey bound to this device (production only).
   */
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setStep("processing");
    setStatusText("Setting up your passkey...");
    setError("");

    try {
      const regOptions = await getRegOptions({
        email: email.toLowerCase(),
        userName: name,
      });

      setStatusText("Register with your device...");
      const registration = await registerPasskey(regOptions);

      setStatusText("Securing your account...");
      const result = await verifyReg({
        email: email.toLowerCase(),
        response: JSON.stringify(registration),
      });

      if (!result.success) throw new Error(result.error);

      completeAuth(email, name, result.sessionToken);
    } catch (err: unknown) {
      handleAuthError(err);
    }
  }

  /**
   * Request a magic link code via email (production only).
   */
  async function handleRequestMagicLink() {
    setStep("processing");
    setStatusText("Sending verification code...");
    setError("");

    try {
      const result = await requestMagicCode({
        email: email.toLowerCase(),
      });

      if (!result.success) {
        setError(result.error || "Failed to send verification code");
        setStep("error");
        return;
      }

      setStep("magic_link_verify");
      setVerificationCode("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send code";
      setError(message);
      setStep("error");
    }
  }

  /**
   * Verify the magic link code (production only).
   */
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!verificationCode.trim()) return;

    setStep("processing");
    setStatusText("Verifying code...");
    setError("");

    try {
      const result = await verifyMagicCode({
        email: email.toLowerCase(),
        code: verificationCode.trim(),
      });

      if (!result.success) {
        setError(result.error || "Invalid code");
        setStep("magic_link_verify");
        return;
      }

      completeAuth(email, undefined, result.sessionToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
      setStep("magic_link_verify");
    }
  }

  function handleRetry() {
    setStep("email");
    setError("");
    setStatusText("");
    setVerificationCode("");
  }

  return (
    <main className="min-h-screen flex">
      {/* Left — Editorial Branding Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[#1E1037]">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(124, 58, 237, 0.12) 0%, transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(45, 212, 191, 0.06) 0%, transparent 70%)`,
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-16 xl:p-24 w-full">
          <span
            className="text-[13px] tracking-[0.35em] font-light uppercase"
            style={{ color: "rgba(167, 139, 250, 0.7)" }}
          >
            {SITECONFIG.brand.name}
          </span>

          <div className="max-w-lg">
            <h1
              className="text-5xl xl:text-[4.25rem] text-white/85 font-light leading-[1.08] tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              See a provider.
              <br />
              <em className="gradient-text-soft">Get your prescription. Today.</em>
            </h1>
            <p className="text-white/50 text-base font-light leading-relaxed mt-10 max-w-sm">
              Board-certified telehealth consultations with same-day prescriptions sent directly to your pharmacy.
            </p>
            <div className="mt-10 space-y-3">
              <div className="flex items-center gap-3 text-white/50 text-sm font-light">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
                Same-day consultations with board-certified providers
              </div>
              <div className="flex items-center gap-3 text-white/50 text-sm font-light">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
                Prescriptions sent directly to your pharmacy
              </div>
              <div className="flex items-center gap-3 text-white/50 text-sm font-light">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
                Credential-verified providers and pharmacies
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 text-[10px] tracking-[0.25em] text-white/35 uppercase font-light">
            <span>HIPAA Secure</span>
            <span className="w-5 h-px bg-white/10" />
            <span>Board Certified</span>
            <span className="w-5 h-px bg-white/10" />
            <span>Encrypted</span>
          </div>
        </div>
      </div>

      {/* Right — Auth Form */}
      <div className="flex-1 flex items-center justify-center px-8 sm:px-16 py-16 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo — hidden on hero step which has its own */}
          {step !== "hero" && (
            <div className="lg:hidden mb-16">
              <span
                className="text-[13px] tracking-[0.35em] text-foreground font-light uppercase"
              >
                {SITECONFIG.brand.name}
              </span>
            </div>
          )}

          {/* STEP: Hero — conversion CTAs */}
          {step === "hero" && (
            <>
              <div className="mb-12">
                <div className="lg:hidden mb-8">
                  <span className="text-[13px] tracking-[0.35em] text-foreground font-light uppercase">
                    {SITECONFIG.brand.name}
                  </span>
                </div>
                <h2
                  className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em] mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Secure access
                  <br />
                  for everyone.
                </h2>
                <p className="text-muted-foreground font-light text-sm leading-relaxed max-w-xs">
                  Credential-verified access for clients, providers, and pharmacies.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setIntent("client");
                    setStep("email");
                  }}
                  className="w-full flex items-center justify-between px-6 py-4 rounded-xl bg-[#7C3AED] text-white text-sm font-light tracking-wide hover:bg-[#6D28D9] transition-colors"
                >
                  <span>Get Your Prescription Today</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>

                <button
                  onClick={() => {
                    setIntent("provider");
                    setStep("email");
                  }}
                  className="w-full flex items-center justify-between px-6 py-4 rounded-xl border border-border text-foreground text-sm font-light tracking-wide hover:bg-muted/50 transition-colors"
                >
                  <span>Providers & Clinics</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-3 font-light">
                From $97/month · Cancel anytime · No contracts
              </p>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setStep("email")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors font-light"
                >
                  Already have an account? <span className="underline underline-offset-2">Sign in</span>
                </button>
              </div>

              <div className="mt-10 flex items-center gap-6 text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-light">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={11} aria-hidden="true" />
                  HIPAA
                </div>
                <div className="flex items-center gap-2">
                  <Fingerprint size={11} aria-hidden="true" />
                  Passkey
                </div>
              </div>
            </>
          )}

          {/* STEP: Processing / Routing spinner */}
          {(step === "processing" || step === "routing") && (
            <div className="text-center py-20">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                style={{
                  borderColor: "#7C3AED",
                  borderTopColor: "transparent",
                }}
              />
              <p className="text-sm text-muted-foreground font-light">
                {statusText || "Please wait..."}
              </p>
            </div>
          )}

          {/* STEP: Email entry (initial) */}
          {step === "email" && (
            <>
              <div className="mb-12">
                <h2
                  className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em] mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {intent === "provider" ? "Provider Login" : "Welcome"}
                </h2>
                <p className="text-muted-foreground font-light">
                  Enter your email to sign in or create an account.
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  required
                  autoComplete="email webauthn"
                />

                <Button type="submit" className="w-full" size="lg">
                  {passkeysAvailable ? (
                    <Fingerprint size={16} aria-hidden="true" />
                  ) : (
                    <Mail size={16} aria-hidden="true" />
                  )}
                  Continue
                </Button>
              </form>

              {/* In production: show magic link fallback if passkeys available */}
              {!isDev && passkeysAvailable && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!email.trim()) return;
                    await handleRequestMagicLink();
                  }}
                  className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors font-light flex items-center gap-2"
                >
                  <Mail size={13} aria-hidden="true" />
                  Sign in with email code instead
                </button>
              )}

              <p className="mt-6 text-xs text-muted-foreground font-light">
                New to this device? Use the email code option above.
              </p>
            </>
          )}

          {/* STEP: Name entry (new user registration — production only) */}
          {step === "name" && (
            <>
              <div className="mb-12">
                <h2
                  className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em] mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Create Account
                </h2>
                <p className="text-muted-foreground font-light">
                  No account found for{" "}
                  <span className="text-foreground font-normal">{email}</span>.
                  Enter your name to register.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                <Input
                  label="Full Name"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                  required
                  autoComplete="name"
                  autoFocus
                />

                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  You will use Face ID, Touch ID, or Windows Hello to securely
                  sign in. Your biometric data never leaves your device.
                </p>

                <Button type="submit" className="w-full" size="lg">
                  <Fingerprint size={16} aria-hidden="true" />
                  Register with Passkey
                </Button>
              </form>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    await handleRequestMagicLink();
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light flex items-center gap-2"
                >
                  <Mail size={13} aria-hidden="true" />
                  Register with email code instead
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError("");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
                >
                  Use a different email
                </button>
              </div>
            </>
          )}

          {/* STEP: Magic link code verification (production only) */}
          {step === "magic_link_verify" && (
            <>
              <div className="mb-12">
                <h2
                  className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em] mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Check Your Email
                </h2>
                <p className="text-muted-foreground font-light">
                  We sent a 6-digit code to{" "}
                  <span className="text-foreground font-normal">{email}</span>.
                  Enter it below.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-md mb-6">
                  <AlertCircle
                    size={18}
                    className="text-destructive mt-0.5 flex-shrink-0"
                  />
                  <p className="text-sm text-destructive font-light">{error}</p>
                </div>
              )}

              <form onSubmit={handleVerifyCode} className="space-y-6">
                <Input
                  ref={codeInputRef}
                  label="Verification Code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setVerificationCode(val);
                    setError("");
                  }}
                  required
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.3em] font-mono"
                />

                <Button type="submit" className="w-full" size="lg" disabled={verificationCode.length !== 6}>
                  <ShieldCheck size={16} aria-hidden="true" />
                  Verify Code
                </Button>
              </form>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setError("");
                    await handleRequestMagicLink();
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
                >
                  Use a different email
                </button>
              </div>
            </>
          )}

          {/* STEP: Error */}
          {step === "error" && (
            <>
              <div className="mb-8">
                <h2
                  className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em] mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Something went wrong
                </h2>
              </div>

              <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-md mb-6">
                <AlertCircle
                  size={18}
                  className="text-destructive mt-0.5 flex-shrink-0"
                />
                <p className="text-sm text-destructive font-light">
                  {error || "An unexpected error occurred. Please try again."}
                </p>
              </div>

              <Button
                onClick={handleRetry}
                className="w-full"
                size="lg"
                variant="outline"
              >
                Try Again
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
