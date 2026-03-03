"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Fingerprint,
} from "lucide-react";
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
import { api } from "../../../convex/_generated/api";
import {
  registerPasskey,
  authenticatePasskey,
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
} from "@/lib/webauthn";

/* ---------------------------------------------------------------------------
   Constants
   --------------------------------------------------------------------------- */

/** Video URL for the left panel background. Empty string = dark fallback. */
const LOGIN_VIDEO_URL = "";

const FEATURE_BULLETS = [
  "Board-Certified Telehealth",
  "Same-Day Prescriptions",
  "Secure Patient Intake",
  "Provider Portal",
  "Pharmacy Fulfillment",
] as const;

/* ---------------------------------------------------------------------------
   Auth step types
   --------------------------------------------------------------------------- */

type AuthStep =
  | "initial"
  | "create_account"
  | "form"
  | "processing"
  | "routing"
  | "error"
  | "passkey_register"
  | "magic_link_sent"
  | "magic_link_verify";

/* ---------------------------------------------------------------------------
   Login Page Component
   --------------------------------------------------------------------------- */

export default function LoginPage() {
  const router = useRouter();

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");

  // Auth state
  const [step, setStep] = useState<AuthStep>("initial");
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
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
      setPasskeysAvailable(false);
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
  }, [isDev]);

  // Focus code input when magic link step is shown
  useEffect(() => {
    if (step === "magic_link_verify" && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  // Route when patient/membership data loads (production flow)
  useEffect(() => {
    if (step !== "routing" || !routingEmail) return;

    const currentSession = getSessionCookie();
    const role = currentSession?.role;

    if (role === "admin") {
      router.push("/dashboard");
      return;
    }

    if (role === "unverified" || !role) {
      router.push("/access/setup");
      return;
    }

    if (role === "provider") {
      router.push("/provider");
      return;
    }

    if (role === "pharmacy") {
      router.push("/pharmacy");
      return;
    }

    // Verified patients -- check payment status
    if (isDev) {
      router.push("/dashboard");
      return;
    }

    if (patient === undefined || membership === undefined) return;

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

  /* -------------------------------------------------------------------------
     Auth handlers
     ------------------------------------------------------------------------- */

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

  function completeAuth(
    authEmail: string,
    authName?: string,
    sessionToken?: string
  ) {
    const baseSession = createSession(authEmail, authName);
    const session = sessionToken
      ? { ...baseSession, sessionToken }
      : baseSession;
    setSessionCookie(session);

    if (isAdminEmail(authEmail)) {
      setAdminCookie(createAdminSession(authEmail));
    }

    setRoutingEmail(authEmail.toLowerCase());
    setStep("routing");
    setStatusText("Signing you in...");
  }

  /** DEV MODE: Just create session and go. */
  async function handleDevLogin() {
    if (!email.trim() || !firstName.trim()) return;
    await getOrCreateMember({
      email: email.toLowerCase(),
      name: firstName,
    });
    completeAuth(email, firstName);
  }

  /**
   * Main form submit handler.
   * - Dev mode: instant login
   * - Production + no passkeys: magic link
   * - Production + passkeys: try passkey, fall back to magic link
   */
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !firstName.trim()) return;

    if (isDev) {
      await handleDevLogin();
      return;
    }

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

      completeAuth(email, firstName, result.sessionToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      const convexData = (err as Record<string, unknown>)?.data;
      const fullMessage =
        typeof convexData === "string" ? convexData : message;

      // No passkeys registered -- offer registration
      if (
        fullMessage.includes("No passkeys") ||
        fullMessage.includes("no credentials") ||
        fullMessage.includes("No passkeys registered")
      ) {
        setStep("passkey_register");
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

  /** Registration: create passkey bound to this device (production only). */
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;

    setStep("processing");
    setStatusText("Setting up your passkey...");
    setError("");

    try {
      const regOptions = await getRegOptions({
        email: email.toLowerCase(),
        userName: firstName,
      });

      setStatusText("Register with your device...");
      const registration = await registerPasskey(regOptions);

      setStatusText("Securing your account...");
      const result = await verifyReg({
        email: email.toLowerCase(),
        response: JSON.stringify(registration),
      });

      if (!result.success) throw new Error(result.error);

      completeAuth(email, firstName, result.sessionToken);
    } catch (err: unknown) {
      handleAuthError(err);
    }
  }

  /** Request a magic link code via email (production only). */
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
      const message =
        err instanceof Error ? err.message : "Failed to send code";
      setError(message);
      setStep("error");
    }
  }

  /** Verify the magic link code (production only). */
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

      completeAuth(email, firstName, result.sessionToken);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Verification failed";
      setError(message);
      setStep("magic_link_verify");
    }
  }

  /** Sign in with passkey (discoverable credential, no email needed). */
  async function handlePasskeySignIn() {
    if (isDev) {
      // Dev mode needs email, go to create_account form
      setStep("create_account");
      return;
    }

    if (!passkeysAvailable) {
      // No passkeys available, prompt for email via magic link
      setStep("create_account");
      return;
    }

    setStep("processing");
    setStatusText("Waiting for your device...");
    setError("");

    try {
      // Try discoverable credential (no email needed)
      const authOptions = await getAuthOptions({ email: "" });
      const authentication = await authenticatePasskey(authOptions);

      setStatusText("Verifying...");
      const result = await verifyAuth({
        email: "",
        response: JSON.stringify(authentication),
      });

      if (!result.success) throw new Error(result.error);

      const authEmail = (result as Record<string, unknown>).email as string || email;
      completeAuth(authEmail, firstName, result.sessionToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      const convexData = (err as Record<string, unknown>)?.data;
      const fullMessage = typeof convexData === "string" ? convexData : message;

      // If discoverable credentials fail, fall back to email-based flow
      if (
        fullMessage.includes("No passkeys") ||
        fullMessage.includes("no credentials") ||
        fullMessage.includes("NotAllowed") ||
        fullMessage.includes("cancelled") ||
        fullMessage.includes("aborted") ||
        fullMessage.includes("The operation either timed out")
      ) {
        // Fall back to email-based sign in
        setStep("create_account");
        setError("");
      } else {
        handleAuthError(err);
      }
    }
  }

  function handleRetry() {
    setStep("initial");
    setError("");
    setStatusText("");
    setVerificationCode("");
  }

  /* -------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------- */

  return (
    <main className="min-h-screen flex">
      {/* ==================================================================
          LEFT PANEL -- Editorial branding with video background
          Hidden on mobile, visible at lg+
          ================================================================== */}
      <div
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden"
        style={{ background: "var(--sidebar-background)" }}
      >
        {/* Video background -- falls back to dark panel when URL is empty */}
        {LOGIN_VIDEO_URL && (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden="true"
          >
            <source src={LOGIN_VIDEO_URL} />
          </video>
        )}

        {/* Dark overlay gradient for text readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(30, 16, 55, 0.92) 0%, rgba(30, 16, 55, 0.75) 50%, rgba(30, 16, 55, 0.95) 100%)",
          }}
        />

        {/* Subtle radial accent */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 20% 50%, rgba(91, 33, 182, 0.15) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Vertical gradient line accent */}
        <div
          className="absolute left-0 top-[20%] bottom-[20%] w-px opacity-30"
          style={{
            background:
              "linear-gradient(180deg, transparent, var(--brand-secondary), var(--brand), transparent)",
          }}
        />

        {/* Panel content */}
        <div className="relative z-10 grid grid-rows-[auto_1fr_auto] p-16 xl:p-24 w-full h-full">
          {/* Brand name */}
          <span
            className="text-[13px] tracking-[0.35em] font-light uppercase"
            style={{ color: "var(--sidebar-primary)" }}
          >
            SCRIPTSXO
          </span>

          {/* Headline block */}
          <div className="max-w-lg self-center">
            <h1
              className="text-5xl xl:text-[4.25rem] text-white/85 font-light leading-[1.08] tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Prescriptions, delivered
              <br />
              <em
                className="not-italic"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontStyle: "italic",
                  background:
                    "linear-gradient(135deg, var(--sidebar-primary), var(--brand))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                with precision.
              </em>
            </h1>

            {/* Feature bullets */}
            <ul className="mt-8 space-y-2.5">
              {FEATURE_BULLETS.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-center gap-3 text-[13px] font-light tracking-wide"
                  style={{ color: "rgba(255, 255, 255, 0.45)" }}
                >
                  <span
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ background: "var(--sidebar-primary)" }}
                    aria-hidden="true"
                  />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom words */}
          <div className="flex items-center gap-6">
            <span className="text-[12px] tracking-[0.15em] text-white/40 uppercase">HIPAA</span>
            <span className="text-[12px] text-white/20">&middot;</span>
            <span className="text-[12px] tracking-[0.15em] text-white/40 uppercase">Licensed</span>
            <span className="text-[12px] text-white/20">&middot;</span>
            <span className="text-[12px] tracking-[0.15em] text-white/40 uppercase">Secure</span>
          </div>
        </div>
      </div>

      {/* ==================================================================
          RIGHT PANEL -- Auth Form (Light theme)
          ================================================================== */}
      <div className="flex-1 flex items-center justify-center px-8 py-16 lg:py-0" style={{ backgroundColor: '#F8F7FC', color: '#0f172a' }}>
        <div className="w-full max-w-sm">

          {/* Mobile-only brand */}
          <div className="lg:hidden mb-12">
            <span className="text-sm tracking-[0.3em] font-light uppercase" style={{ color: 'rgba(15,23,42,0.5)' }}>
              SCRIPTSXO
            </span>
          </div>

          {/* STEP: Initial -- Sign in with passkey */}
          {step === "initial" && (
            <>
              <p className="text-xs tracking-[0.3em] mb-4 uppercase" style={{ color: 'rgba(15,23,42,0.4)' }}>
                Sign In
              </p>
              <h1 className="text-4xl md:text-5xl font-extralight tracking-tight mb-4" style={{ color: '#0f172a' }}>
                Welcome.
              </h1>
              <p className="font-light mb-8" style={{ color: 'rgba(15,23,42,0.5)' }}>
                Sign in with your passkey using Face ID, Touch ID, or Windows Hello.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-[5px]">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handlePasskeySignIn}
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 text-white text-sm tracking-wider font-medium transition-colors disabled:opacity-50 rounded-[5px]"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #2DD4BF)' }}
                >
                  <Fingerprint size={20} />
                  SIGN IN WITH PASSKEY
                </button>

                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(15,23,42,0.1)' }} />
                  <span className="text-xs tracking-wider" style={{ color: 'rgba(15,23,42,0.35)' }}>NEW USER?</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(15,23,42,0.1)' }} />
                </div>

                <button
                  type="button"
                  onClick={() => setStep("create_account")}
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 text-sm tracking-wider transition-colors rounded-[5px]"
                  style={{ border: '1px solid rgba(15,23,42,0.15)', color: '#0f172a' }}
                >
                  CREATE ACCOUNT
                </button>
              </div>

              <div className="mt-12 pt-8 space-y-3" style={{ borderTop: '1px solid rgba(15,23,42,0.1)' }}>
                <button
                  type="button"
                  onClick={() => setStep("create_account")}
                  className="block transition-colors text-sm"
                  style={{ color: 'rgba(15,23,42,0.5)' }}
                >
                  Lost your passkey?
                </button>
              </div>
            </>
          )}

          {/* STEP: Create Account -- Name + Email form */}
          {step === "create_account" && (
            <>
              <button
                type="button"
                onClick={handleRetry}
                className="text-sm mb-8 transition-colors"
                style={{ color: 'rgba(15,23,42,0.4)' }}
              >
                &larr; Back to sign in
              </button>

              <p className="text-xs tracking-[0.3em] mb-4 uppercase" style={{ color: 'rgba(15,23,42,0.4)' }}>
                Create Account
              </p>
              <h1 className="text-4xl md:text-5xl font-extralight tracking-tight mb-4" style={{ color: '#0f172a' }}>
                Set up your<br /><span className="italic">passkey.</span>
              </h1>
              <p className="font-light mb-8" style={{ color: 'rgba(15,23,42,0.5)' }}>
                Enter your name and email, then use Face ID, Touch ID, or Windows Hello to create your account.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-[5px]">
                  {error}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs tracking-wider mb-3 uppercase" style={{ color: 'rgba(15,23,42,0.4)' }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFirstName(e.target.value)
                    }
                    required
                    autoComplete="given-name"
                    autoFocus
                    className="w-full px-0 py-4 bg-transparent border-0 border-b transition-colors text-lg font-light focus:outline-none"
                    style={{ borderBottomColor: 'rgba(15,23,42,0.2)', color: '#0f172a', caretColor: '#7C3AED' }}
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-wider mb-3 uppercase" style={{ color: 'rgba(15,23,42,0.4)' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEmail(e.target.value)
                    }
                    required
                    autoComplete="email webauthn"
                    className="w-full px-0 py-4 bg-transparent border-0 border-b transition-colors text-lg font-light focus:outline-none"
                    style={{ borderBottomColor: 'rgba(15,23,42,0.2)', color: '#0f172a', caretColor: '#7C3AED' }}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 text-white text-sm tracking-wider font-medium transition-colors disabled:opacity-50 rounded-[5px]"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #2DD4BF)' }}
                >
                  <Fingerprint size={20} />
                  CONTINUE
                </button>
              </form>

              <div className="mt-8 p-4 rounded" style={{ backgroundColor: 'rgba(15,23,42,0.03)' }}>
                <p className="text-xs" style={{ color: 'rgba(15,23,42,0.4)' }}>
                  Your passkey is stored securely on your device. We never see your biometric data.
                </p>
              </div>
            </>
          )}

          {/* STEP: Processing / Routing spinner */}
          {(step === "processing" || step === "routing") && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-2 rounded-full animate-spin mb-4" style={{ borderColor: 'rgba(15,23,42,0.15)', borderTopColor: '#7C3AED' }} />
              <p className="text-sm font-light" style={{ color: 'rgba(15,23,42,0.4)' }}>
                {statusText || "Please wait..."}
              </p>
            </div>
          )}

          {/* STEP: Passkey registration (new user) */}
          {step === "passkey_register" && (
            <>
              <button
                type="button"
                onClick={handleRetry}
                className="text-sm mb-8 transition-colors"
                style={{ color: 'rgba(15,23,42,0.4)' }}
              >
                &larr; Back to sign in
              </button>

              <p className="text-xs tracking-[0.3em] mb-4 uppercase" style={{ color: 'rgba(15,23,42,0.4)' }}>
                Set Up Passkey
              </p>
              <h1 className="text-4xl md:text-5xl font-extralight tracking-tight mb-4" style={{ color: '#0f172a' }}>
                Create your<br /><span className="italic">passkey.</span>
              </h1>
              <p className="font-light mb-8" style={{ color: 'rgba(15,23,42,0.5)' }}>
                No account found for <strong style={{ color: '#0f172a' }}>{email}</strong>. Register a passkey to continue.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-[5px]">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-6">
                <p className="text-xs" style={{ color: 'rgba(15,23,42,0.4)' }}>
                  You will use Face ID, Touch ID, or Windows Hello to securely sign in. Your biometric data never leaves your device.
                </p>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 text-white text-sm tracking-wider font-medium transition-colors disabled:opacity-50 rounded-[5px]"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #2DD4BF)' }}
                >
                  <Fingerprint size={20} />
                  REGISTER WITH PASSKEY
                </button>
              </form>

              <div className="mt-12 pt-8 space-y-3" style={{ borderTop: '1px solid rgba(15,23,42,0.1)' }}>
                <button
                  type="button"
                  onClick={async () => {
                    await handleRequestMagicLink();
                  }}
                  className="block transition-colors text-sm"
                  style={{ color: 'rgba(15,23,42,0.5)' }}
                >
                  Register with email code instead
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="block transition-colors text-sm"
                  style={{ color: 'rgba(15,23,42,0.5)' }}
                >
                  Use a different email
                </button>
              </div>
            </>
          )}

          {/* STEP: Magic link code verification */}
          {step === "magic_link_verify" && (
            <>
              <button
                type="button"
                onClick={handleRetry}
                className="text-sm mb-8 transition-colors"
                style={{ color: 'rgba(15,23,42,0.4)' }}
              >
                &larr; Back to sign in
              </button>

              <p className="text-xs tracking-[0.3em] mb-4 uppercase" style={{ color: 'rgba(15,23,42,0.4)' }}>
                Verify Code
              </p>
              <h1 className="text-4xl md:text-5xl font-extralight tracking-tight mb-4" style={{ color: '#0f172a' }}>
                Check your email.
              </h1>
              <p className="font-light mb-8" style={{ color: 'rgba(15,23,42,0.5)' }}>
                We sent a 6-digit code to <strong style={{ color: '#0f172a' }}>{email}</strong>. Enter it below.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-[5px]">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div>
                  <label className="block text-xs tracking-wider mb-3 uppercase" style={{ color: 'rgba(15,23,42,0.4)' }}>
                    Verification Code
                  </label>
                  <input
                    ref={codeInputRef}
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
                    className="w-full px-0 py-4 bg-transparent border-0 border-b transition-colors text-lg font-light tracking-[0.3em] text-center focus:outline-none"
                    style={{ borderBottomColor: 'rgba(15,23,42,0.2)', color: '#0f172a', caretColor: '#7C3AED' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={verificationCode.length !== 6}
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 text-white text-sm tracking-wider font-medium transition-colors disabled:opacity-50 rounded-[5px]"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #2DD4BF)' }}
                >
                  VERIFY CODE
                </button>
              </form>

              <div className="mt-12 pt-8 space-y-3" style={{ borderTop: '1px solid rgba(15,23,42,0.1)' }}>
                <button
                  type="button"
                  onClick={async () => {
                    setError("");
                    await handleRequestMagicLink();
                  }}
                  className="block transition-colors text-sm"
                  style={{ color: 'rgba(15,23,42,0.5)' }}
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="block transition-colors text-sm"
                  style={{ color: 'rgba(15,23,42,0.5)' }}
                >
                  Use a different email
                </button>
              </div>
            </>
          )}

          {/* STEP: Error */}
          {step === "error" && (
            <>
              <p className="text-xs tracking-[0.3em] mb-4 uppercase" style={{ color: 'rgba(15,23,42,0.4)' }}>
                Error
              </p>
              <h1 className="text-4xl md:text-5xl font-extralight tracking-tight mb-4" style={{ color: '#0f172a' }}>
                Something went wrong.
              </h1>

              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-[5px]">
                {error || "An unexpected error occurred. Please try again."}
              </div>

              <button
                type="button"
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-3 px-8 py-5 text-sm tracking-wider transition-colors rounded-[5px]"
                style={{ border: '1px solid rgba(15,23,42,0.15)', color: '#0f172a' }}
              >
                TRY AGAIN
              </button>
            </>
          )}

        </div>
      </div>
    </main>
  );
}
