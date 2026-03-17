"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Upload,
  Video,
  VideoOff,
  Check,
  ChevronRight,
  Loader2,
  Camera,
  FileText,
  Pill,
  Shield,
  ClipboardCheck,
  Truck,
  Package,
  CreditCard,
  User,
  AlertTriangle,
  Users,
  Stethoscope,
  BadgeCheck,
  X,
  Home,
  ArrowRight,
  ScanFace,
  Scale,
  Heart,
  Zap,
  Brain,
  Activity,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { SITECONFIG, formatPrice } from "@/lib/config";
import { getSessionCookie, isAdmin as checkIsAdmin } from "@/lib/auth";
import { consultations, storage } from "@/lib/api";

/* ---------------------------------------------------------------------------
   STEP DEFINITIONS
   --------------------------------------------------------------------------- */

const STEPS = [
  { id: "welcome", label: "Get Started", icon: Home, number: 1 },
  { id: "service", label: "Select Service", icon: Stethoscope, number: 2 },
  { id: "intake", label: "New Intake", icon: User, number: 3 },
  { id: "payment", label: "Payment", icon: CreditCard, number: 4 },
  { id: "identity", label: "Identity Check", icon: ScanFace, number: 5 },
  { id: "medical", label: "Medical History", icon: FileText, number: 6 },
  { id: "symptoms", label: "Symptoms", icon: Pill, number: 7 },
  { id: "consent", label: "Consent", icon: Shield, number: 8 },
  { id: "verification", label: "Verification", icon: Shield, number: 9 },
  { id: "video", label: "Video Verification", icon: Video, number: 10 },
  { id: "review", label: "Review", icon: ClipboardCheck, number: 11 },
  { id: "approved", label: "Approved", icon: Check, number: 12 },
  { id: "pharmacy", label: "Send to Pharmacy", icon: Truck, number: 13 },
  { id: "fulfilled", label: "Fulfilled", icon: Package, number: 14 },
] as const;

/** Steps 12-14 are completion states — they only highlight when reached */
const COMPLETION_STEPS: Set<StepId> = new Set(["approved", "pharmacy", "fulfilled"]);

/* ---------------------------------------------------------------------------
   US STATES
   --------------------------------------------------------------------------- */

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

/* ---------------------------------------------------------------------------
   SERVICE CATEGORIES
   --------------------------------------------------------------------------- */

const SERVICE_CATEGORIES = [
  { id: "weight-management", label: "Weight Management", desc: "Semaglutide, Tirzepatide, GLP-1", icon: Scale },
  { id: "mens-health", label: "Men's Health", desc: "Testosterone, ED, hair loss", icon: User },
  { id: "womens-health", label: "Women's Health", desc: "Hormones, fertility, weight", icon: Users },
  { id: "general-wellness", label: "General Wellness", desc: "Supplements, peptides, general", icon: Heart },
  { id: "pain-management", label: "Pain Management", desc: "Peptides, anti-inflammatory", icon: Zap },
  { id: "mental-wellness", label: "Mental Wellness", desc: "Anxiety support", icon: Brain },
] as const;

type StepId = (typeof STEPS)[number]["id"];

/* ---------------------------------------------------------------------------
   MESSAGE TYPES
   --------------------------------------------------------------------------- */

interface ChatMessage {
  id: string;
  role: "system" | "user";
  content: string;
  timestamp: Date;
  step?: StepId;
  component?: React.ReactNode;
}

/* ---------------------------------------------------------------------------
   VIDEO QUESTIONS
   --------------------------------------------------------------------------- */

const VIDEO_QUESTIONS = [
  "Please state your full name and date of birth.",
  "What medication are you requesting, and why do you need it?",
  "Have you taken this medication before? If yes, how did it work for you and did you experience any side effects?",
  "Please list all medications you are currently taking and any known allergies.",
  "Do you understand that a provider will review this before any prescription is issued?",
];

/* ---------------------------------------------------------------------------
   PROXY/CAREGIVER TYPES
   --------------------------------------------------------------------------- */

type OrdererRole = "self" | "provider" | "nurse" | "caregiver" | "family";

interface ProxyInfo {
  role: OrdererRole;
  firstName: string;
  lastName: string;
  npiNumber: string;
  relationship: string; // for caregiver/family
  phone: string;
  email: string;
  npiVerified: boolean;
  npiData: Record<string, unknown> | null;
}

/* ---------------------------------------------------------------------------
   VALIDATION STATE
   --------------------------------------------------------------------------- */

interface FieldValidation {
  valid: boolean;
  reason: string;
  suggestion: string | null;
}

/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

type UserRole = "client" | "provider" | "admin";

function StartPageInner() {
  const [currentStep, setCurrentStep] = useState<StepId>("welcome");
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Role detection — providers/admins get chat-only (no progress tracker)
  const [userRole, setUserRole] = useState<UserRole>("client");
  const [roleReady, setRoleReady] = useState(false);

  // API stubs — these endpoints will be wired to the Worker API once implemented
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function aiChat(args: { message: string; conversationHistory: { role: string; content: string }[]; patientEmail: string; userRole: string }): Promise<{ content: string }> {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";
    const res = await fetch(`${API_BASE}/ai/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
    if (!res.ok) throw new Error("AI service unavailable");
    const json = await res.json() as { success: boolean; data?: { content: string }; error?: string };
    if (!json.success) throw new Error(json.error ?? "AI error");
    return json.data!;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function validateFormStep(args: { fields: { name: string; value: string; required: boolean }[]; stepContext: string }): Promise<{ allValid: boolean; results: Record<string, { valid: boolean; reason: string; suggestion: string | null }> }> {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";
    const res = await fetch(`${API_BASE}/ai/validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
    if (!res.ok) throw new Error("Validation service unavailable");
    const json = await res.json() as { success: boolean; data?: { allValid: boolean; results: Record<string, { valid: boolean; reason: string; suggestion: string | null }> }; error?: string };
    if (!json.success) throw new Error(json.error ?? "Validation error");
    return json.data!;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function scanGovId(args: { imageBase64: string; mimeType: string }): Promise<Record<string, unknown>> {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";
    const res = await fetch(`${API_BASE}/scan/gov-id`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
    if (!res.ok) throw new Error("Scan service unavailable");
    const json = await res.json() as { success: boolean; data?: Record<string, unknown>; error?: string };
    if (!json.success) throw new Error(json.error ?? "Scan error");
    return json.data!;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function scanRx(args: { imageBase64: string; mimeType: string }): Promise<Record<string, unknown>> {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";
    const res = await fetch(`${API_BASE}/scan/prescription`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
    if (!res.ok) throw new Error("Scan service unavailable");
    const json = await res.json() as { success: boolean; data?: Record<string, unknown>; error?: string };
    if (!json.success) throw new Error(json.error ?? "Scan error");
    return json.data!;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function analyzeFace(args: { faceImageBase64: string; faceMimeType: string; idImageBase64?: string; idMimeType?: string }): Promise<Record<string, unknown>> {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";
    const res = await fetch(`${API_BASE}/scan/face`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
    if (!res.ok) throw new Error("Face analysis service unavailable");
    const json = await res.json() as { success: boolean; data?: Record<string, unknown>; error?: string };
    if (!json.success) throw new Error(json.error ?? "Face analysis error");
    return json.data!;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function verifyNpi(args: { npiNumber: string; expectedFirstName?: string; expectedLastName?: string }): Promise<Record<string, unknown>> {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";
    const res = await fetch(`${API_BASE}/verify/npi`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
    if (!res.ok) throw new Error("NPI verification service unavailable");
    const json = await res.json() as { success: boolean; data?: Record<string, unknown>; error?: string };
    if (!json.success) throw new Error(json.error ?? "NPI verification error");
    return json.data!;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function createIntakeVerification(args: { patientEmail: string; returnUrl: string }): Promise<{ url?: string; sessionId: string; error?: string }> {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";
    const res = await fetch(`${API_BASE}/identity/create`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
    if (!res.ok) throw new Error("Identity verification service unavailable");
    const json = await res.json() as { success: boolean; data?: { url?: string; sessionId: string; error?: string }; error?: string };
    if (!json.success) throw new Error(json.error ?? "Identity verification error");
    return json.data!;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function checkIntakeVerification(args: { sessionId: string; patientEmail: string }): Promise<{ verified: boolean; lastError?: unknown }> {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://scriptsxo-api.hellonolen.workers.dev";
    const res = await fetch(`${API_BASE}/identity/check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
    if (!res.ok) throw new Error("Identity check service unavailable");
    const json = await res.json() as { success: boolean; data?: { verified: boolean; lastError?: unknown }; error?: string };
    if (!json.success) throw new Error(json.error ?? "Identity check error");
    return json.data!;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function submitIntakeVideo(args: { patientEmail: string; patientName: string; transcript: string; medicalHistory: { conditions?: string; medications?: string; allergies?: string }; chiefComplaint: string; pharmacyLocation: string; videoStorageId: string; patientState?: string }): Promise<{ consultationId: string }> {
    const result = await consultations.create({ ...args, status: "pending_review" });
    return { consultationId: result.id };
  }

  const [conversationHistory, setConversationHistory] = useState<
    { role: string; content: string }[]
  >([]);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const session = getSessionCookie();
    const isDev = process.env.NODE_ENV === "development";

    if (session?.email) {
      setUserEmail(session.email);
      // Determine role from session
      if (session.role === "provider") {
        setUserRole("provider");
      } else if (session.role === "admin" || checkIsAdmin()) {
        setUserRole("admin");
      } else {
        setUserRole("client");
      }
    } else if (isDev) {
      setUserEmail("nolen@doclish.com");
      setUserRole("admin"); // Dev shows admin
    }

    setRoleReady(true);
  }, []);

  // Conversation persistence is handled server-side via the API calls

  // Form state
  const [patientType, setPatientType] = useState<"new" | "returning" | null>(null);
  const [medicalData, setMedicalData] = useState({
    conditions: "",
    medications: "",
    allergies: "",
    familyHistory: "",
  });
  const [symptomData, setSymptomData] = useState({
    complaint: "",
    duration: "",
    severity: 5,
    previousTreatments: "",
  });
  const [verificationData, setVerificationData] = useState({
    govIdUploaded: false,
    govIdBase64: "",
    govIdMimeType: "",
    govIdScanResult: null as Record<string, unknown> | null,
    previousRxUploaded: false,
    rxBase64: "",
    rxMimeType: "",
    rxScanResult: null as Record<string, unknown> | null,
    previousPrescriber: "",
    isNewPrescription: false,
  });

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, FieldValidation>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [isScanningId, setIsScanningId] = useState(false);
  const [isScanningRx, setIsScanningRx] = useState(false);

  // Proxy/caregiver state
  const [ordererRole, setOrdererRole] = useState<OrdererRole>("self");
  const [proxyInfo, setProxyInfo] = useState<ProxyInfo>({
    role: "self",
    firstName: "",
    lastName: "",
    npiNumber: "",
    relationship: "",
    phone: "",
    email: "",
    npiVerified: false,
    npiData: null,
  });
  const [isVerifyingNpi, setIsVerifyingNpi] = useState(false);
  const [npiError, setNpiError] = useState("");

  // Video state
  const [videoState, setVideoState] = useState<"idle" | "recording" | "done">("idle");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Face capture state
  const [facePhotoBase64, setFacePhotoBase64] = useState<string>("");
  const [faceAnalysis, setFaceAnalysis] = useState<Record<string, unknown> | null>(null);

  // Speech transcription state
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  // Pharmacy location state
  const [pharmacyLocation, setPharmacyLocation] = useState("");

  // Submission tracking
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "uploading" | "analyzing" | "pending_review" | "approved" | "rejected"
  >("idle");

  // Payment consent
  const [noRefundAccepted, setNoRefundAccepted] = useState(false);

  // Service + state selection (Step 2)
  const [serviceCategory, setServiceCategory] = useState<string>("");
  const [patientState, setPatientState] = useState<string>("");

  // Telehealth consent (Step 8)
  const [consentChecks, setConsentChecks] = useState({ telehealth: false, noEmergency: false, privacyTerms: false });

  // Stripe Identity state
  const searchParams = useSearchParams();
  const [identityStatus, setIdentityStatus] = useState<"pending" | "verifying" | "verified" | "failed" | "skipped">("pending");
  const [identitySessionId, setIdentitySessionId] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [isLaunchingIdentity, setIsLaunchingIdentity] = useState(false);

  /* ---- Stripe Identity return URL detection ---- */
  useEffect(() => {
    const stripeVerified = searchParams.get("stripe_verified");
    const sessionId = searchParams.get("session_id");
    if (!stripeVerified || !sessionId || !roleReady) return;

    // Restore state — user returned from Stripe redirect
    setCurrentStep("identity");
    setIdentitySessionId(sessionId);
    setIdentityStatus("verifying");
    addSystemMessage(
      "Welcome back. Checking your identity verification status...",
      "identity"
    );

    // Check the actual status from Stripe
    checkIntakeVerification({
      sessionId,
      patientEmail: userEmail || "anonymous@scriptsxo.com",
    })
      .then((result) => {
        if (result.verified) {
          setIdentityStatus("verified");
          completeStep("identity");
          simulateTyping(() => {
            advanceTo("medical");
            addSystemMessage(
              "Identity verified. Now let's get the medical history. Please fill out the following — this helps our providers understand the health background.",
              "medical"
            );
          });
        } else {
          setIdentityStatus("failed");
          setIdentityError(
            result.lastError
              ? `Verification could not be completed: ${(result.lastError as any)?.reason || "please try again"}.`
              : "Verification could not be completed. Please try again."
          );
          addSystemMessage(
            "We weren't able to complete your identity verification. Please try again below.",
            "identity"
          );
        }
      })
      .catch(() => {
        setIdentityStatus("failed");
        setIdentityError("Unable to confirm verification status. Please try again or contact support.");
      });
  }, [searchParams, roleReady]);

  /* ---- Attach video stream when element renders ---- */
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.play().catch(() => {});
    }
  }, [videoStream, videoState]);

  /* ---- Auto-scroll chat ---- */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* ---- Initial message fires when advancing from welcome to intake ---- */
  // (No auto-message on mount — welcome landing page is shown first)

  /* ---- Helpers ---- */

  function addSystemMessage(content: string, step?: StepId) {
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}-${Math.random()}`,
        role: "system",
        content,
        timestamp: new Date(),
        step,
      },
    ]);
  }

  function addUserMessage(content: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `usr-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      },
    ]);
  }

  function completeStep(stepId: StepId) {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
  }

  function advanceTo(stepId: StepId) {
    setCurrentStep(stepId);
  }

  async function simulateTyping(callback: () => void, delay = 800) {
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, delay));
    setIsTyping(false);
    callback();
  }

  /** Advance from welcome landing page into the service selection step */
  function handleWelcomeStart() {
    completeStep("welcome");
    advanceTo("service");
    addSystemMessage(
      "Welcome to ScriptsXO. Let's get you started. First, select the treatment category you're interested in and the state where you're located — this helps us match you with a licensed provider.",
      "service"
    );
  }

  /** Handle service + state selection completion */
  function handleServiceContinue() {
    const categoryLabel = SERVICE_CATEGORIES.find((c) => c.id === serviceCategory)?.label ?? serviceCategory;
    try {
      localStorage.setItem(
        "sxo_service_intake",
        JSON.stringify({ category: serviceCategory, categoryLabel, state: patientState, savedAt: Date.now() })
      );
    } catch {
      // localStorage may be unavailable in some environments
    }
    completeStep("service");
    advanceTo("intake");
    addSystemMessage(
      `Got it. You're in ${patientState} looking for ${categoryLabel} options. Let me get you started.`,
      "intake"
    );
    simulateTyping(() => {
      addSystemMessage(
        "Now — are you ordering for yourself, or on behalf of someone else?",
        "intake"
      );
    });
  }

  /** Handle telehealth consent completion */
  function handleConsentContinue() {
    try {
      localStorage.setItem(
        "sxo_consent",
        JSON.stringify({ consentedAt: Date.now(), checks: consentChecks })
      );
    } catch {
      // localStorage may be unavailable in some environments
    }
    addUserMessage("Telehealth consent accepted");
    completeStep("consent");
    simulateTyping(() => {
      advanceTo("verification");
      addSystemMessage(
        "Consent recorded. Now I need to verify your identity. Please upload a government-issued ID. If there's a previous prescription for this medication, upload a photo of it as well.",
        "verification"
      );
    });
  }

  /** Call AI via the aiChat action with role-aware context.
   *  Note: persistence is handled by addSystemMessage/addUserMessage — do NOT double-persist here. */
  async function callAI(userMessage: string, contextHint?: string): Promise<string> {
    const email = userEmail || "anonymous";
    const fullMessage = contextHint
      ? `[Context: ${contextHint}]\n\n${userRole === "client" ? "Client" : userRole === "provider" ? "Provider" : "Admin"} says: ${userMessage}`
      : userMessage;

    try {
      const result = await aiChat({
        message: fullMessage,
        conversationHistory,
        patientEmail: email,
        userRole,
      });

      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: fullMessage },
        { role: "assistant", content: result.content },
      ]);

      return result.content;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      if (errMsg.includes("GEMINI_API_KEY")) {
        return "I'm currently unable to process that — the service is being configured. Please continue with the guided steps.";
      }
      return "I wasn't able to process that right now. Please continue with the current step, or try again in a moment.";
    }
  }

  /** Convert file to base64 (strips data: prefix) */
  function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1]; // Strip "data:image/jpeg;base64,"
        resolve({ base64, mimeType: file.type });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /** Capture a still frame from the video element */
  function captureVideoFrame(): string | null {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return dataUrl.split(",")[1]; // Return base64 only
  }

  /* ---- Step: Intake — Now includes proxy ordering ---- */

  function handleOrdererRole(role: OrdererRole) {
    setOrdererRole(role);
    setProxyInfo((prev) => ({ ...prev, role }));

    if (role === "self") {
      addUserMessage("I'm ordering for myself");
      simulateTyping(() => {
        addSystemMessage(
          "Got it. Are you a new client or a returning client?",
          "intake"
        );
      });
    } else {
      const labels: Record<string, string> = {
        provider: "I'm a provider ordering for a client",
        nurse: "I'm a licensed nurse ordering for a client",
        caregiver: "I'm a home caregiver ordering for someone",
        family: "I'm a family member ordering for someone",
      };
      addUserMessage(labels[role] || "Ordering for someone else");
      simulateTyping(() => {
        if (role === "provider" || role === "nurse") {
          addSystemMessage(
            `Since you're a licensed ${role}, I'll need to verify your credentials. Please provide your NPI number and name so we can confirm your license through the national registry.`,
            "intake"
          );
        } else {
          addSystemMessage(
            "We'll need some information about you as the person placing this order. Please provide your name, contact information, and your relationship to the client.",
            "intake"
          );
        }
      });
    }
  }

  async function handleNpiVerification() {
    if (!proxyInfo.npiNumber.trim() || proxyInfo.npiNumber.replace(/\D/g, "").length !== 10) {
      setNpiError("Please enter a valid 10-digit NPI number");
      return;
    }

    setIsVerifyingNpi(true);
    setNpiError("");
    addUserMessage(`NPI: ${proxyInfo.npiNumber}, Name: ${proxyInfo.firstName} ${proxyInfo.lastName}`);

    try {
      const result = await verifyNpi({
        npiNumber: proxyInfo.npiNumber,
        expectedFirstName: proxyInfo.firstName || undefined,
        expectedLastName: proxyInfo.lastName || undefined,
      });

      if (result.verified) {
        setProxyInfo((prev) => ({ ...prev, npiVerified: true, npiData: result }));
        addSystemMessage(
          `License verified: ${result.firstName} ${result.lastName}, ${result.credential || ""} — ${result.taxonomyDescription || "Healthcare Provider"}${result.state ? `, ${result.state}` : ""}. Now let's continue with the client's information. Are they a new or returning client?`,
          "intake"
        );
      } else {
        const issues = (result.issues as string[] | undefined) ?? [];
        setNpiError(issues.join(". ") || "Could not verify this NPI number");
        addSystemMessage(
          `I wasn't able to verify that NPI number. ${issues.join(". ")}. Please double-check and try again.`
        );
      }
    } catch {
      setNpiError("Verification service temporarily unavailable. Please try again.");
    } finally {
      setIsVerifyingNpi(false);
    }
  }

  function handleCaregiverInfoSubmit() {
    if (!proxyInfo.firstName.trim() || !proxyInfo.relationship.trim()) return;
    addUserMessage(`${proxyInfo.firstName} ${proxyInfo.lastName}, ${proxyInfo.relationship}, Phone: ${proxyInfo.phone || "not provided"}`);
    simulateTyping(() => {
      addSystemMessage(
        "Thank you. Now let's get the client's information. Is the client a new or returning client?",
        "intake"
      );
    });
  }

  function handlePatientType(type: "new" | "returning") {
    setPatientType(type);
    addUserMessage(type === "new" ? "New client" : "Returning client");
    completeStep("intake");

    simulateTyping(() => {
      advanceTo("payment");
      addSystemMessage(
        `Great${type === "returning" ? ", welcome back" : ""}. Before we begin, let's get the membership set up. The ScriptsXO membership is ${formatPrice(SITECONFIG.billing.membershipFee)}/month — cancel anytime. This gives unlimited access to licensed providers and prescriptions.`,
        "payment"
      );
    });
  }

  /* ---- Step: Payment ---- */

  function handlePaymentComplete() {
    addUserMessage("Payment completed");
    completeStep("payment");

    simulateTyping(() => {
      advanceTo("identity");
      addSystemMessage(
        "Payment confirmed. Before we continue, we need to verify your identity. You'll be directed to a secure Stripe verification — you'll need your government-issued ID ready. This is required by law before any prescription can be issued.",
        "identity"
      );
    });
  }

  /* ---- Step: Identity Verification (Stripe) ---- */

  async function handleIdentityVerify() {
    setIsLaunchingIdentity(true);
    setIdentityError(null);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://scriptsxo.com";
      const returnUrl = `${origin}/start?stripe_verified=true&session_id={VERIFICATION_SESSION_ID}`;

      const result = await createIntakeVerification({
        patientEmail: userEmail || "anonymous@scriptsxo.com",
        returnUrl,
      });

      if (result.error || !result.url) {
        setIdentityError(result.error || "Identity verification service temporarily unavailable. Please contact support.");
        setIsLaunchingIdentity(false);
        return;
      }

      setIdentitySessionId(result.sessionId);
      // Redirect to Stripe hosted verification page
      window.location.href = result.url;
    } catch {
      setIdentityError("Unable to start identity verification. Please try again or contact support at support@scriptsxo.com.");
      setIsLaunchingIdentity(false);
    }
  }

  function handleIdentitySkip() {
    // Admin/support use only — records that verification was skipped
    addUserMessage("Identity verification skipped (support override)");
    setIdentityStatus("skipped");
    completeStep("identity");
    simulateTyping(() => {
      advanceTo("medical");
      addSystemMessage(
        "Continuing without identity verification. Note: a manual review will be required. Now let's get the medical history.",
        "medical"
      );
    });
  }

  /* ---- Step: Medical History (with validation) ---- */

  async function handleMedicalSubmit() {
    setIsValidating(true);
    setValidationErrors({});

    // Validate all fields via Gemini
    try {
      const result = await validateFormStep({
        fields: [
          { name: "conditions", value: medicalData.conditions, required: true },
          { name: "medications", value: medicalData.medications, required: false },
          { name: "allergies", value: medicalData.allergies, required: false },
          { name: "familyHistory", value: medicalData.familyHistory, required: false },
        ],
        stepContext: "medical_history",
      });

      if (!result.allValid) {
        const errors: Record<string, FieldValidation> = {};
        for (const [key, val] of Object.entries(result.results as Record<string, FieldValidation>)) {
          if (!val.valid) errors[key] = val;
        }
        setValidationErrors(errors);
        setIsValidating(false);
        addSystemMessage(
          "Some of the information provided doesn't look quite right. Please review the highlighted fields and provide real medical information."
        );
        return;
      }
    } catch {
      // If validation fails, proceed anyway (don't block)
    }

    setIsValidating(false);

    const summary = `Medical history submitted — Conditions: ${medicalData.conditions || "None"}, Medications: ${medicalData.medications || "None"}, Allergies: ${medicalData.allergies || "None"}`;
    addUserMessage(summary);
    completeStep("medical");
    setIsTyping(true);

    const response = await callAI(
      summary,
      "The client just submitted their medical history. Briefly acknowledge what they reported (conditions, medications, allergies), note anything worth following up on, and then transition them to the symptoms step by asking what medication they're requesting and what's bringing them in today. Keep it to 2-3 sentences."
    );

    setIsTyping(false);
    advanceTo("symptoms");
    addSystemMessage(response || "Got it. Now tell me about your symptoms — what medication are you requesting?", "symptoms");
  }

  /* ---- Step: Symptoms (with validation) ---- */

  async function handleSymptomsSubmit() {
    setIsValidating(true);
    setValidationErrors({});

    try {
      const result = await validateFormStep({
        fields: [
          { name: "complaint", value: symptomData.complaint, required: true },
          { name: "duration", value: symptomData.duration, required: true },
          { name: "previousTreatments", value: symptomData.previousTreatments, required: false },
        ],
        stepContext: "symptoms_and_medication_request",
      });

      if (!result.allValid) {
        const errors: Record<string, FieldValidation> = {};
        for (const [key, val] of Object.entries(result.results as Record<string, FieldValidation>)) {
          if (!val.valid) errors[key] = val;
        }
        setValidationErrors(errors);
        setIsValidating(false);
        addSystemMessage(
          "Please provide valid information about your symptoms and medication request. The highlighted fields need to be corrected."
        );
        return;
      }
    } catch {
      // Proceed if validation service fails
    }

    setIsValidating(false);

    const summary = `Requesting: ${symptomData.complaint}, Duration: ${symptomData.duration}, Severity: ${symptomData.severity}/10, Previous treatments: ${symptomData.previousTreatments || "None"}`;
    addUserMessage(summary);
    completeStep("symptoms");
    setIsTyping(true);

    const patientTypeLabel = patientType === "returning" ? "returning" : "new";
    const response = await callAI(
      summary,
      `The ${patientTypeLabel} client just submitted their symptom details and medication request. Briefly acknowledge what they reported, mention anything that might need follow-up (but don't diagnose), and transition them to the identity verification step. For returning clients, mention uploading their previous prescription. Keep it to 2-3 sentences.`
    );

    setIsTyping(false);
    advanceTo("consent");
    const fallback = "Before we continue, please review and accept the telehealth consent agreement.";
    addSystemMessage(response || fallback, "consent");
  }

  /* ---- Step: Verification (with AI document scanning) ---- */

  async function handleGovIdUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningId(true);

    try {
      const { base64, mimeType } = await fileToBase64(file);
      setVerificationData((prev) => ({
        ...prev,
        govIdUploaded: true,
        govIdBase64: base64,
        govIdMimeType: mimeType,
      }));

      // Scan the ID with Gemini Vision
      const scanResult = await scanGovId({
        imageBase64: base64,
        mimeType,
      });

      setVerificationData((prev) => ({ ...prev, govIdScanResult: scanResult }));

      if (scanResult.isValidId) {
        addSystemMessage(
          `ID scanned successfully — ${(scanResult.documentType as string | undefined)?.replace(/_/g, " ") || "document"} detected. Name: ${scanResult.fullName || "readable"}, DOB: ${scanResult.dateOfBirth || "readable"}${scanResult.isExpired ? " (Warning: this ID appears to be expired)" : ""}. Confidence: ${scanResult.confidence}%.`
        );
      } else {
        addSystemMessage(
          `I had trouble reading that document. ${(scanResult.issues as string[])?.join(". ") || "Please try a clearer photo."}. You can upload a different photo if needed.`
        );
      }
    } catch {
      setVerificationData((prev) => ({ ...prev, govIdUploaded: true }));
      addSystemMessage("ID uploaded. I wasn't able to scan it automatically, but a provider will review it manually.");
    } finally {
      setIsScanningId(false);
    }
  }

  async function handleRxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningRx(true);

    try {
      const { base64, mimeType } = await fileToBase64(file);
      setVerificationData((prev) => ({
        ...prev,
        previousRxUploaded: true,
        rxBase64: base64,
        rxMimeType: mimeType,
      }));

      // Scan the prescription with Gemini Vision
      const scanResult = await scanRx({
        imageBase64: base64,
        mimeType,
      });

      setVerificationData((prev) => ({ ...prev, rxScanResult: scanResult }));

      if (scanResult.isValidPrescription) {
        const med = scanResult.medicationName || "medication";
        const prescriber = scanResult.prescriber || "a provider";
        addSystemMessage(
          `Prescription scanned — ${med} prescribed by ${prescriber}${scanResult.dateWritten ? ` on ${scanResult.dateWritten}` : ""}.${scanResult.dosage ? ` Dosage: ${scanResult.dosage}.` : ""} This will be cross-referenced during provider review.`
        );
        // Auto-fill prescriber if found
        if (scanResult.prescriber) {
          setVerificationData((prev) => ({
            ...prev,
            previousPrescriber: scanResult.prescriber as string,
          }));
        }
      } else {
        addSystemMessage(
          "I had trouble reading that prescription. A provider will review it manually during the approval process."
        );
      }
    } catch {
      setVerificationData((prev) => ({ ...prev, previousRxUploaded: true }));
      addSystemMessage("Prescription uploaded. A provider will review it during the approval process.");
    } finally {
      setIsScanningRx(false);
    }
  }

  function handleVerificationSubmit() {
    addUserMessage(
      `Verification submitted — ID: ${verificationData.govIdScanResult?.isValidId ? "verified" : "uploaded"}${verificationData.previousRxUploaded ? ", Previous Rx: uploaded" : ""}${verificationData.isNewPrescription ? ", New prescription request" : ""}`
    );
    completeStep("verification");

    simulateTyping(() => {
      advanceTo("video");
      addSystemMessage(
        "Everything looks good so far. Next step — we need a short video recording. You'll see yourself on camera and I'll ask you 5 quick questions. This video is recorded and will be reviewed by a provider. A face photo will also be captured for identity verification. Ready when you are.",
        "video"
      );
    });
  }

  /* ---- Step: Video ---- */

  async function startVideo() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setVideoStream(stream);

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setVideoState("recording");
      setCurrentQuestion(0);
      setTranscripts([]);
      setLiveTranscript("");

      // Capture face photo after a brief delay (let camera stabilize)
      setTimeout(() => {
        const faceBase64 = captureVideoFrame();
        if (faceBase64) {
          setFacePhotoBase64(faceBase64);
          // Analyze face in the background
          analyzeFace({
            faceImageBase64: faceBase64,
            faceMimeType: "image/jpeg",
            idImageBase64: verificationData.govIdBase64 || undefined,
            idMimeType: verificationData.govIdMimeType || undefined,
          })
            .then((result) => setFaceAnalysis(result))
            .catch(() => {});
        }
      }, 2000);

      // Start speech-to-text transcription
      startTranscription();
    } catch {
      addSystemMessage(
        "Unable to access your camera. Please check your browser permissions and try again."
      );
    }
  }

  function startTranscription() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        setTranscripts((prev) => [...prev, final.trim()]);
        setLiveTranscript("");
        addUserMessage(final.trim());
      } else {
        setLiveTranscript(interim);
      }
    };

    recognition.onerror = () => {};
    recognition.onend = () => {
      if (mediaRecorderRef.current?.state === "recording") {
        try { recognition.start(); } catch {}
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }

  function nextVideoQuestion() {
    // Capture additional face frame at mid-point
    if (currentQuestion === 2) {
      const midFrame = captureVideoFrame();
      if (midFrame && !facePhotoBase64) {
        setFacePhotoBase64(midFrame);
      }
    }

    if (currentQuestion < VIDEO_QUESTIONS.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      finishVideo();
    }
  }

  function finishVideo() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (videoStream) {
      videoStream.getTracks().forEach((t) => t.stop());
      setVideoStream(null);
    }
    setVideoState("done");
    setLiveTranscript("");

    addUserMessage("Video recording completed — all 5 questions answered");
    completeStep("video");

    (async () => {
      setIsTyping(true);
      advanceTo("review");

      const reviewContext = [
        `Client type: ${patientType}`,
        ordererRole !== "self" ? `Ordered by: ${proxyInfo.firstName} ${proxyInfo.lastName} (${ordererRole})${proxyInfo.npiVerified ? " — NPI verified" : ""}` : "",
        `Conditions: ${medicalData.conditions || "None"}`,
        `Medications: ${medicalData.medications || "None"}`,
        `Allergies: ${medicalData.allergies || "None"}`,
        `Family history: ${medicalData.familyHistory || "None"}`,
        `Requesting: ${symptomData.complaint}`,
        `Duration: ${symptomData.duration}`,
        `Severity: ${symptomData.severity}/10`,
        `Previous treatments: ${symptomData.previousTreatments || "None"}`,
        `ID verified: ${verificationData.govIdScanResult?.isValidId ? "Yes — " + (verificationData.govIdScanResult?.fullName || "name readable") : verificationData.govIdUploaded ? "Uploaded (pending manual review)" : "No"}`,
        `Previous Rx uploaded: ${verificationData.previousRxUploaded ? "Yes" : "No"}`,
        verificationData.rxScanResult?.isValidPrescription ? `Previous Rx: ${verificationData.rxScanResult?.medicationName} from ${verificationData.rxScanResult?.prescriber}` : "",
        `Video completed: Yes (5 questions answered)`,
        `Face captured: ${facePhotoBase64 ? "Yes" : "No"}`,
        faceAnalysis ? `Face analysis: ${(faceAnalysis as any).faceDetected ? "Face detected" : "No face detected"}, Live person: ${(faceAnalysis as any).isLivePerson ? "Yes" : "Uncertain"}` : "",
        `Transcribed answers: ${transcripts.join(" | ") || "Transcription unavailable"}`,
      ].filter(Boolean).join(", ");

      const reviewResponse = await callAI(
        reviewContext,
        "The client has completed all intake steps including video recording and face capture. Summarize their submission concisely — mention the key medical details, the medication they are requesting, whether their ID and video are on file, and any notable findings from the document scans. Then ask which pharmacy they'd like to pick up their prescription from. Be warm and professional. 3-4 sentences."
      );

      setIsTyping(false);
      addSystemMessage(
        reviewResponse || "Everything looks good. Before we submit for provider review, which pharmacy would you like to pick up the prescription from? Please provide the pharmacy name and location.",
        "review"
      );
    })();
  }

  /** After pharmacy location is provided, start the approval flow with real timing */
  async function handlePharmacySubmit() {
    if (!pharmacyLocation.trim()) return;

    // Validate pharmacy location
    setIsValidating(true);
    try {
      const result = await validateFormStep({
        fields: [{ name: "pharmacy", value: pharmacyLocation, required: true }],
        stepContext: "pharmacy_location",
      });
      if (!result.allValid) {
        setValidationErrors({ pharmacy: (result.results as any).pharmacy });
        setIsValidating(false);
        addSystemMessage("Please provide a real pharmacy name and location (e.g., 'CVS Pharmacy, 123 Main St, Miami FL').");
        return;
      }
    } catch {}
    setIsValidating(false);
    setValidationErrors({});

    const savedPharmacyLocation = pharmacyLocation;
    addUserMessage(`Pharmacy: ${savedPharmacyLocation}`);
    setPharmacyLocation("");
    completeStep("review");
    advanceTo("approved");

    addSystemMessage(
      "Your intake is now being reviewed by a provider. This typically takes 3 to 8 minutes. You'll be notified here as soon as a decision is made. Please note: the provider may decline the request if it does not meet practiceal criteria. Feel free to ask me anything while you wait.",
      "approved"
    );

    // Real async pipeline: upload video → AI analysis → provider queue
    setSubmissionStatus("uploading");
    addSystemMessage(
      "Uploading your video recording for provider review...",
      "approved"
    );

    try {
      // 1. Upload video blob to R2 via the storage API
      let videoStorageId = "";
      const videoBlob =
        chunksRef.current.length > 0
          ? new Blob(chunksRef.current, { type: "video/webm" })
          : null;

      if (videoBlob && videoBlob.size > 0) {
        try {
          const videoFile = new File([videoBlob], "intake-video.webm", { type: "video/webm" });
          const uploadResult = await storage.upload(videoFile, "intake_video");
          videoStorageId = uploadResult.r2Key;
        } catch {
          // Video upload failure is non-fatal — proceed without it
        }
      }

      setSubmissionStatus("analyzing");
      addSystemMessage(
        "Video uploaded. Our AI is preparing your case for provider review...",
        "approved"
      );

      // 2. Submit to async review pipeline
      const transcript = transcripts.join(" | ") || "Transcription unavailable";
      const patientName =
        (verificationData.govIdScanResult?.fullName as string | undefined) ||
        userEmail ||
        "Unknown";

      const result = await submitIntakeVideo({
        patientEmail: userEmail || "anonymous@scriptsxo.com",
        patientName,
        transcript,
        medicalHistory: {
          conditions: medicalData.conditions || undefined,
          medications: medicalData.medications || undefined,
          allergies: medicalData.allergies || undefined,
        },
        chiefComplaint: symptomData.complaint || "General prescription request",
        pharmacyLocation: savedPharmacyLocation,
        videoStorageId,
        patientState: patientState || undefined,
      });

      setSubmissionId(result.consultationId);
      setSubmissionStatus("pending_review");

      addSystemMessage(
        "Your consultation has been submitted for provider review. A licensed provider will review your video and medical history — you'll receive an email notification as soon as a decision is made. This typically takes a few hours during business hours. You can close this window safely.",
        "approved"
      );
    } catch (err) {
      console.error("Submission error:", err);
      setSubmissionStatus("idle");
      addSystemMessage(
        "There was an issue submitting your consultation. Please try again or contact support at support@scriptsxo.com.",
        "approved"
      );
    }
  }

  /* ---- Free-text chat (Gemini-powered) ---- */

  async function handleSend() {
    if (!inputValue.trim()) return;
    const message = inputValue.trim();
    addUserMessage(message);
    setInputValue("");
    setIsTyping(true);

    let contextHint: string;
    if (userRole === "provider") {
      contextHint = `This is a provider using the AI assistant. They may ask about their client queue, practiceal questions, prescriptions, or practice management. Answer helpfully and concisely.`;
    } else if (userRole === "admin") {
      contextHint = `This is a platform admin using the AI assistant. They may ask about platform stats, client records, revenue, prescriptions, or compliance. Answer with real data when available.`;
    } else {
      const stepLabel = STEPS.find((s) => s.id === currentStep)?.label || currentStep;
      contextHint = `Client is on step "${stepLabel}" of the intake process. They may be asking a question about the process, their health, or their medication. Answer helpfully and concisely, then remind them to continue with the current step if appropriate.`;
    }

    const response = await callAI(message, contextHint);

    setIsTyping(false);
    addSystemMessage(response);
  }

  /* ---- Render validation error for a field ---- */

  function renderFieldError(fieldName: string) {
    const error = validationErrors[fieldName];
    if (!error || error.valid) return null;
    return (
      <div className="flex items-start gap-2 mt-1.5 text-xs text-red-600">
        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>{error.reason}{error.suggestion ? ` — ${error.suggestion}` : ""}</span>
      </div>
    );
  }

  /* ---- Render step content inline in chat ---- */

  function renderStepContent() {
    switch (currentStep) {
      case "welcome":
        return null; // Welcome renders its own full-page layout below

      case "service":
        return (
          <div className="mt-4 space-y-5">
            {/* Treatment category grid */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">Select a treatment category</p>
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = serviceCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setServiceCategory(cat.id)}
                      className={`glass-card p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-brand-secondary/60 bg-brand-secondary/5 shadow-[0_4px_16px_rgba(124,58,237,0.15)]"
                          : "hover:border-brand-secondary/30 hover:shadow-[0_4px_12px_rgba(124,58,237,0.08)]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 transition-colors ${
                        isSelected ? "bg-brand-secondary text-white shadow-[0_2px_8px_rgba(124,58,237,0.3)]" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className={`text-xs font-medium mb-0.5 ${isSelected ? "text-brand-secondary" : "text-foreground"}`}>
                        {cat.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-snug">{cat.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* State dropdown */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                What state are you located in?
              </label>
              <select
                value={patientState}
                onChange={(e) => setPatientState(e.target.value)}
                className="w-full px-4 py-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring appearance-none"
              >
                <option value="">Select your state</option>
                {US_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleServiceContinue}
              disabled={!serviceCategory || !patientState}
              className="w-full bg-brand hover:bg-brand-hover text-white h-11 text-xs font-medium tracking-wide shadow-[0_4px_14px_rgba(91,33,182,0.3)]"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );

      case "intake":
        // Phase 1: Who is ordering?
        if (ordererRole === "self" && patientType === null) {
          // After selecting "self", show new/returning
          return null; // Will show after orderer role is set
        }

        if (!patientType && ordererRole !== "self" && !proxyInfo.npiVerified && (ordererRole === "provider" || ordererRole === "nurse") && proxyInfo.role !== "self") {
          // Licensed provider needs NPI verification
          if (ordererRole === "provider" || ordererRole === "nurse") {
            return (
              <div className="mt-4 space-y-4">
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Stethoscope className="w-4 h-4 text-brand-secondary" />
                    <span className="text-sm font-medium text-foreground">License Verification</span>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">First Name</label>
                        <input
                          type="text"
                          value={proxyInfo.firstName}
                          onChange={(e) => setProxyInfo((p) => ({ ...p, firstName: e.target.value }))}
                          placeholder="First name"
                          className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Name</label>
                        <input
                          type="text"
                          value={proxyInfo.lastName}
                          onChange={(e) => setProxyInfo((p) => ({ ...p, lastName: e.target.value }))}
                          placeholder="Last name"
                          className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">NPI Number</label>
                      <input
                        type="text"
                        value={proxyInfo.npiNumber}
                        onChange={(e) => {
                          setProxyInfo((p) => ({ ...p, npiNumber: e.target.value }));
                          setNpiError("");
                        }}
                        placeholder="10-digit NPI number"
                        maxLength={10}
                        className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                      />
                      {npiError && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{npiError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleNpiVerification}
                  disabled={!proxyInfo.npiNumber.trim() || !proxyInfo.firstName.trim() || !proxyInfo.lastName.trim() || isVerifyingNpi}
                  className="w-full bg-brand hover:bg-brand-hover text-white h-11 text-xs font-medium tracking-wide shadow-[0_4px_14px_rgba(91,33,182,0.3)]"
                >
                  {isVerifyingNpi ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying License...
                    </>
                  ) : (
                    <>
                      <BadgeCheck className="w-4 h-4 mr-2" />
                      Verify NPI
                    </>
                  )}
                </Button>
              </div>
            );
          }
        }

        // Caregiver/family info collection
        if (!patientType && (ordererRole === "caregiver" || ordererRole === "family")) {
          return (
            <div className="mt-4 space-y-4">
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-brand-secondary" />
                  <span className="text-sm font-medium text-foreground">Your Information</span>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Your First Name</label>
                      <input
                        type="text"
                        value={proxyInfo.firstName}
                        onChange={(e) => setProxyInfo((p) => ({ ...p, firstName: e.target.value }))}
                        placeholder="First name"
                        className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Last Name</label>
                      <input
                        type="text"
                        value={proxyInfo.lastName}
                        onChange={(e) => setProxyInfo((p) => ({ ...p, lastName: e.target.value }))}
                        placeholder="Last name"
                        className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Relationship to Client</label>
                    <input
                      type="text"
                      value={proxyInfo.relationship}
                      onChange={(e) => setProxyInfo((p) => ({ ...p, relationship: e.target.value }))}
                      placeholder="e.g., Home caregiver, Son, Daughter, Spouse"
                      className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Phone Number</label>
                    <input
                      type="tel"
                      value={proxyInfo.phone}
                      onChange={(e) => setProxyInfo((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="(555) 555-5555"
                      className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={handleCaregiverInfoSubmit}
                disabled={!proxyInfo.firstName.trim() || !proxyInfo.relationship.trim()}
                className="w-full bg-brand hover:bg-brand-hover text-white h-11 text-xs font-medium tracking-wide shadow-[0_4px_14px_rgba(91,33,182,0.3)]"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          );
        }

        // Show orderer role selector (initial state) or patient type selector
        if (ordererRole === "self" && patientType === null) {
          // Need to determine: are we at the orderer question or the patient type question?
          // Check if we've already answered orderer question
          const hasOrdererAnswer = messages.some((m) => m.role === "user" && (m.content.includes("ordering for myself") || m.content.includes("ordering for")));

          if (!hasOrdererAnswer) {
            return (
              <div className="mt-4 space-y-3">
                <Button
                  onClick={() => handleOrdererRole("self")}
                  variant="outline"
                  className="w-full h-12 text-sm border-2 hover:border-ring hover:text-brand-secondary transition-colors justify-start px-4"
                >
                  <User className="w-4 h-4 mr-3" />
                  I'm ordering for myself
                </Button>
                <Button
                  onClick={() => handleOrdererRole("provider")}
                  variant="outline"
                  className="w-full h-12 text-sm border-2 hover:border-ring hover:text-brand-secondary transition-colors justify-start px-4"
                >
                  <Stethoscope className="w-4 h-4 mr-3" />
                  I'm a provider ordering for a client
                </Button>
                <Button
                  onClick={() => handleOrdererRole("nurse")}
                  variant="outline"
                  className="w-full h-12 text-sm border-2 hover:border-ring hover:text-brand-secondary transition-colors justify-start px-4"
                >
                  <BadgeCheck className="w-4 h-4 mr-3" />
                  I'm a nurse ordering for a client
                </Button>
                <Button
                  onClick={() => handleOrdererRole("caregiver")}
                  variant="outline"
                  className="w-full h-12 text-sm border-2 hover:border-ring hover:text-brand-secondary transition-colors justify-start px-4"
                >
                  <Users className="w-4 h-4 mr-3" />
                  I'm a caregiver or family member
                </Button>
              </div>
            );
          }

          // Orderer answered "self" — show new/returning
          return (
            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => handlePatientType("new")}
                variant="outline"
                className="flex-1 h-12 text-sm border-2 hover:border-ring hover:text-brand-secondary transition-colors"
              >
                <User className="w-4 h-4 mr-2" />
                New Client
              </Button>
              <Button
                onClick={() => handlePatientType("returning")}
                variant="outline"
                className="flex-1 h-12 text-sm border-2 hover:border-ring hover:text-brand-secondary transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Returning Client
              </Button>
            </div>
          );
        }

        // NPI verified or caregiver info submitted — show new/returning for the patient
        if (patientType === null && ((proxyInfo.npiVerified) || (ordererRole === "caregiver" || ordererRole === "family"))) {
          const hasInfoSubmitted = messages.some((m) => m.role === "user" && (m.content.includes("NPI:") || m.content.includes(proxyInfo.relationship)));
          if (hasInfoSubmitted) {
            return (
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => handlePatientType("new")}
                  variant="outline"
                  className="flex-1 h-12 text-sm border-2 hover:border-ring hover:text-brand-secondary transition-colors"
                >
                  <User className="w-4 h-4 mr-2" />
                  New Client
                </Button>
                <Button
                  onClick={() => handlePatientType("returning")}
                  variant="outline"
                  className="flex-1 h-12 text-sm border-2 hover:border-ring hover:text-brand-secondary transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Returning Client
                </Button>
              </div>
            );
          }
        }

        return null;

      case "identity":
        // Already verified (returned from Stripe with success)
        if (identityStatus === "verified") {
          return (
            <div className="mt-4 glass-card p-6 text-center">
              <BadgeCheck className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Identity Verified</p>
              <p className="text-xs text-muted-foreground mt-1">Continuing to next step...</p>
            </div>
          );
        }

        // Checking status after Stripe redirect
        if (identityStatus === "verifying") {
          return (
            <div className="mt-4 glass-card p-6 text-center">
              <Loader2 className="w-8 h-8 text-brand-secondary animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Checking verification status...</p>
              <p className="text-xs text-muted-foreground mt-1">This only takes a moment.</p>
            </div>
          );
        }

        // Verification failed — show error and retry
        if (identityStatus === "failed") {
          return (
            <div className="mt-4 space-y-4">
              <div className="glass-card p-5">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Verification incomplete</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {identityError || "We were unable to verify your identity. Please try again."}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleIdentityVerify}
                  disabled={isLaunchingIdentity}
                  className="w-full bg-brand hover:bg-brand-hover text-white h-11 text-xs font-medium tracking-wide shadow-[0_4px_14px_rgba(91,33,182,0.3)]"
                >
                  {isLaunchingIdentity ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Launching...
                    </>
                  ) : (
                    <>
                      <ScanFace className="w-4 h-4 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>
              </div>
              {userRole === "admin" && (
                <button
                  onClick={handleIdentitySkip}
                  className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Skip (admin override)
                </button>
              )}
            </div>
          );
        }

        // Default: pending — show the verify button
        return (
          <div className="mt-4 space-y-4">
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-secondary/10 flex items-center justify-center flex-shrink-0">
                  <ScanFace className="w-5 h-5 text-brand-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Stripe Identity Verification</p>
                  <p className="text-xs text-muted-foreground">Secure • Takes about 1 minute</p>
                </div>
              </div>
              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  Government-issued photo ID (driver's license, passport, or national ID)
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  Live selfie to confirm you match your ID
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  Required before any prescription can be issued
                </div>
              </div>
              {identityError && (
                <div className="flex items-start gap-2 mb-4 p-3 rounded-md bg-red-50 border border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{identityError}</p>
                </div>
              )}
              <Button
                onClick={handleIdentityVerify}
                disabled={isLaunchingIdentity}
                className="w-full bg-brand hover:bg-brand-hover text-white h-11 text-xs font-medium tracking-wide shadow-[0_4px_14px_rgba(91,33,182,0.3)]"
              >
                {isLaunchingIdentity ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Launching verification...
                  </>
                ) : (
                  <>
                    <ScanFace className="w-4 h-4 mr-2" />
                    Verify My Identity
                  </>
                )}
              </Button>
            </div>
            {userRole === "admin" && (
              <button
                onClick={handleIdentitySkip}
                className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Skip (admin override)
              </button>
            )}
          </div>
        );

      case "payment":
        return (
          <div className="mt-4 glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-foreground">ScriptsXO Membership</span>
              <span className="text-lg font-light text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                {formatPrice(SITECONFIG.billing.membershipFee)}/mo
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Cancel anytime. Unlimited access.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 mb-4">
              <p className="text-xs text-amber-800 leading-relaxed">
                Payment is non-refundable. A provider will review your request within 3-8 minutes. There is no guarantee your prescription will be approved — the provider may decline if practiceal criteria are not met.
              </p>
            </div>
            <label className="flex items-start gap-3 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={noRefundAccepted}
                onChange={(e) => setNoRefundAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border accent-brand-secondary"
              />
              <span className="text-xs text-foreground leading-relaxed">
                I understand there is no refund and no guarantee that my prescription will be approved.
              </span>
            </label>
            <Button
              onClick={handlePaymentComplete}
              disabled={!noRefundAccepted}
              className="w-full bg-brand hover:bg-brand-hover text-white h-11 text-xs font-medium tracking-wide shadow-[0_4px_14px_rgba(91,33,182,0.3)]"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Complete Payment
            </Button>
          </div>
        );

      case "medical":
        return (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Current Medical Conditions
              </label>
              <input
                type="text"
                value={medicalData.conditions}
                onChange={(e) => {
                  setMedicalData((p) => ({ ...p, conditions: e.target.value }));
                  setValidationErrors((prev) => ({ ...prev, conditions: undefined as any }));
                }}
                placeholder="e.g., High blood pressure, Diabetes"
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.conditions ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring`}
              />
              {renderFieldError("conditions")}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Current Medications
              </label>
              <input
                type="text"
                value={medicalData.medications}
                onChange={(e) => {
                  setMedicalData((p) => ({ ...p, medications: e.target.value }));
                  setValidationErrors((prev) => ({ ...prev, medications: undefined as any }));
                }}
                placeholder="e.g., Lisinopril 10mg, Metformin 500mg"
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.medications ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring`}
              />
              {renderFieldError("medications")}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Allergies
              </label>
              <input
                type="text"
                value={medicalData.allergies}
                onChange={(e) => {
                  setMedicalData((p) => ({ ...p, allergies: e.target.value }));
                  setValidationErrors((prev) => ({ ...prev, allergies: undefined as any }));
                }}
                placeholder="e.g., Penicillin, Sulfa drugs"
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.allergies ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring`}
              />
              {renderFieldError("allergies")}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Family Medical History
              </label>
              <input
                type="text"
                value={medicalData.familyHistory}
                onChange={(e) => {
                  setMedicalData((p) => ({ ...p, familyHistory: e.target.value }));
                  setValidationErrors((prev) => ({ ...prev, familyHistory: undefined as any }));
                }}
                placeholder="e.g., Father — heart disease, Mother — diabetes"
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.familyHistory ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring`}
              />
              {renderFieldError("familyHistory")}
            </div>
            <Button
              onClick={handleMedicalSubmit}
              disabled={!medicalData.conditions.trim() || isValidating}
              className="w-full bg-brand hover:bg-brand-hover text-white h-11 text-xs font-medium tracking-wide shadow-[0_4px_14px_rgba(91,33,182,0.3)]"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying information...
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        );

      case "symptoms":
        return (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                What medication are you requesting?
              </label>
              <input
                type="text"
                value={symptomData.complaint}
                onChange={(e) => {
                  setSymptomData((p) => ({ ...p, complaint: e.target.value }));
                  setValidationErrors((prev) => ({ ...prev, complaint: undefined as any }));
                }}
                placeholder="Medication name and what it's for"
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.complaint ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring`}
              />
              {renderFieldError("complaint")}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                How long have you had these symptoms?
              </label>
              <input
                type="text"
                value={symptomData.duration}
                onChange={(e) => {
                  setSymptomData((p) => ({ ...p, duration: e.target.value }));
                  setValidationErrors((prev) => ({ ...prev, duration: undefined as any }));
                }}
                placeholder="e.g., 2 weeks, 3 months, ongoing"
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.duration ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring`}
              />
              {renderFieldError("duration")}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Severity (1-10): {symptomData.severity}
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={symptomData.severity}
                onChange={(e) => setSymptomData((p) => ({ ...p, severity: parseInt(e.target.value) }))}
                className="w-full accent-brand-secondary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Mild</span>
                <span>Severe</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Previous treatments tried
              </label>
              <input
                type="text"
                value={symptomData.previousTreatments}
                onChange={(e) => {
                  setSymptomData((p) => ({ ...p, previousTreatments: e.target.value }));
                  setValidationErrors((prev) => ({ ...prev, previousTreatments: undefined as any }));
                }}
                placeholder="What have you tried before?"
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.previousTreatments ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring`}
              />
              {renderFieldError("previousTreatments")}
            </div>
            <Button
              onClick={handleSymptomsSubmit}
              disabled={!symptomData.complaint.trim() || !symptomData.duration.trim() || isValidating}
              className="w-full bg-brand hover:bg-brand-hover text-white h-11 text-xs font-medium tracking-wide shadow-[0_4px_14px_rgba(91,33,182,0.3)]"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying information...
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        );

      case "consent":
        return (
          <div className="mt-4 glass-card p-5 space-y-5">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Telehealth Consent &amp; Privacy Agreement</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
                ScriptsXO telehealth services are provided by licensed, independent physicians. Providers review your intake asynchronously — this is not an emergency service. If you are experiencing a medical emergency, call 911 immediately.
              </p>
              <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
                <p>Your information is handled on a HIPAA-compliant platform. All data is encrypted at rest and in transit and is never sold to third parties.</p>
                <p>E-prescriptions are sent directly to your selected pharmacy upon provider approval. Approval is not guaranteed.</p>
                <p>You have the right to decline treatment at any time and to request that your data be deleted.</p>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 border-t border-border pt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecks.telehealth}
                  onChange={(e) => setConsentChecks((prev) => ({ ...prev, telehealth: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-brand-secondary flex-shrink-0"
                />
                <span className="text-xs text-foreground leading-relaxed">
                  I consent to asynchronous telehealth services provided by licensed physicians through ScriptsXO.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecks.noEmergency}
                  onChange={(e) => setConsentChecks((prev) => ({ ...prev, noEmergency: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-brand-secondary flex-shrink-0"
                />
                <span className="text-xs text-foreground leading-relaxed">
                  I acknowledge that this service is not for emergency care and I will call 911 or go to the nearest emergency room in a medical emergency.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecks.privacyTerms}
                  onChange={(e) => setConsentChecks((prev) => ({ ...prev, privacyTerms: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-brand-secondary flex-shrink-0"
                />
                <span className="text-xs text-foreground leading-relaxed">
                  I have read and agree to the Privacy Policy and Terms of Service.
                </span>
              </label>
            </div>

            <Button
              onClick={handleConsentContinue}
              disabled={!consentChecks.telehealth || !consentChecks.noEmergency || !consentChecks.privacyTerms}
              className="w-full bg-brand hover:bg-brand-hover text-white h-11 text-xs font-medium tracking-wide shadow-[0_4px_14px_rgba(91,33,182,0.3)]"
            >
              <Shield className="w-4 h-4 mr-2" />
              Accept &amp; Continue
            </Button>
          </div>
        );

      case "verification":
        return (
          <div className="mt-4 space-y-4">
            {/* Government ID */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Government-Issued ID</span>
                {verificationData.govIdUploaded && !isScanningId && (
                  <Check className="w-4 h-4 text-emerald-600" />
                )}
                {isScanningId && (
                  <Loader2 className="w-4 h-4 text-brand-secondary animate-spin" />
                )}
              </div>
              <label className="flex items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-ring transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleGovIdUpload}
                />
                {isScanningId ? (
                  <span className="text-sm text-brand-secondary font-medium">Scanning ID...</span>
                ) : verificationData.govIdUploaded ? (
                  <span className="text-sm text-emerald-600 font-medium">
                    ID {verificationData.govIdScanResult?.isValidId ? "Verified" : "Uploaded"} — tap to replace
                  </span>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload photo of your ID</span>
                  </>
                )}
              </label>
              {verificationData.govIdScanResult && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {verificationData.govIdScanResult.isValidId ? (
                    <span className="text-emerald-600">
                      {(verificationData.govIdScanResult.documentType as string)?.replace(/_/g, " ")} — {verificationData.govIdScanResult.fullName as string}
                    </span>
                  ) : (
                    <span className="text-amber-600">
                      {((verificationData.govIdScanResult.issues as string[]) || []).join(". ")}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Previous Prescription */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Previous Prescription</span>
                {verificationData.previousRxUploaded && !isScanningRx && (
                  <Check className="w-4 h-4 text-emerald-600" />
                )}
                {isScanningRx && (
                  <Loader2 className="w-4 h-4 text-brand-secondary animate-spin" />
                )}
              </div>

              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setVerificationData((p) => ({ ...p, isNewPrescription: false }))}
                  className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
                    !verificationData.isNewPrescription
                      ? "border-ring text-brand-secondary bg-brand-secondary/5"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  I have a previous Rx
                </button>
                <button
                  onClick={() => setVerificationData((p) => ({ ...p, isNewPrescription: true }))}
                  className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
                    verificationData.isNewPrescription
                      ? "border-ring text-brand-secondary bg-brand-secondary/5"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  New prescription
                </button>
              </div>

              {!verificationData.isNewPrescription && (
                <>
                  <label className="flex items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-ring transition-colors mb-3">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleRxUpload}
                    />
                    {isScanningRx ? (
                      <span className="text-sm text-brand-secondary font-medium">Scanning prescription...</span>
                    ) : verificationData.previousRxUploaded ? (
                      <span className="text-sm text-emerald-600 font-medium">Prescription Scanned — tap to replace</span>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Photo of previous prescription</span>
                      </>
                    )}
                  </label>
                  {verificationData.rxScanResult?.isValidPrescription && (
                    <div className="text-xs text-emerald-600 mb-3">
                      Found: {verificationData.rxScanResult.medicationName as string} from {verificationData.rxScanResult.prescriber as string}
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Who prescribed it previously?
                    </label>
                    <input
                      type="text"
                      value={verificationData.previousPrescriber}
                      onChange={(e) =>
                        setVerificationData((p) => ({ ...p, previousPrescriber: e.target.value }))
                      }
                      placeholder="Provider name, practice, or practice"
                      className="w-full px-4 py-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
                    />
                  </div>
                </>
              )}
            </div>

            <Button
              onClick={handleVerificationSubmit}
              disabled={!verificationData.govIdUploaded || isScanningId || isScanningRx}
              className="w-full bg-brand hover:bg-brand-hover text-white h-11 text-xs font-medium tracking-wide shadow-[0_4px_14px_rgba(91,33,182,0.3)]"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );

      case "video":
        return (
          <div className="mt-4">
            {videoState === "idle" && (
              <div className="text-center">
                <div className="glass-card p-6 mb-4">
                  <Video className="w-8 h-8 text-brand-secondary mx-auto mb-3" />
                  <p className="text-sm text-foreground mb-1 font-medium">Video Verification</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    You'll answer 5 questions on camera as part of the verification process. A face photo will be captured for identity confirmation.
                  </p>
                  <Button
                    onClick={startVideo}
                    className="bg-brand hover:bg-brand-hover text-white h-11 text-xs font-medium tracking-wide shadow-[0_4px_14px_rgba(91,33,182,0.3)] px-8"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                </div>
              </div>
            )}

            {videoState === "recording" && (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs text-white font-medium">Recording</span>
                  </div>
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <span className="text-xs text-white">
                      Question {currentQuestion + 1} of {VIDEO_QUESTIONS.length}
                    </span>
                  </div>
                  {facePhotoBase64 && (
                    <div className="absolute bottom-4 left-4 bg-emerald-600/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <span className="text-xs text-white">Face captured</span>
                    </div>
                  )}
                </div>

                <div className="glass-card p-5">
                  <p className="text-xs text-muted-foreground mb-2">
                    Question {currentQuestion + 1}
                  </p>
                  <p className="text-sm text-foreground font-medium leading-relaxed">
                    {VIDEO_QUESTIONS[currentQuestion]}
                  </p>
                  {liveTranscript && (
                    <p className="text-xs text-brand-secondary/70 mt-3 italic">
                      {liveTranscript}...
                    </p>
                  )}
                </div>

                <Button
                  onClick={nextVideoQuestion}
                  className="w-full bg-brand hover:bg-brand-hover text-white h-11 text-xs font-medium tracking-wide shadow-[0_4px_14px_rgba(91,33,182,0.3)]"
                >
                  {currentQuestion < VIDEO_QUESTIONS.length - 1 ? (
                    <>
                      Next Question
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Finish Recording
                    </>
                  )}
                </Button>
              </div>
            )}

            {videoState === "done" && (
              <div className="glass-card p-6 text-center">
                <Check className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Video recorded successfully</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All 5 questions answered{facePhotoBase64 ? " — face photo captured" : ""}. Moving to review...
                </p>
              </div>
            )}
          </div>
        );

      case "review":
        return (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Pharmacy name and location for pickup
              </label>
              <input
                type="text"
                value={pharmacyLocation}
                onChange={(e) => {
                  setPharmacyLocation(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, pharmacy: undefined as any }));
                }}
                placeholder="e.g., CVS Pharmacy, 123 Main St, Miami FL"
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.pharmacy ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring`}
              />
              {renderFieldError("pharmacy")}
            </div>
            <Button
              onClick={handlePharmacySubmit}
              disabled={!pharmacyLocation.trim() || isValidating}
              className="w-full bg-brand hover:bg-brand-hover text-white h-11 text-xs font-medium tracking-wide shadow-[0_4px_14px_rgba(91,33,182,0.3)]"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Submit for Provider Review
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        );

      case "approved":
        return (
          <div className="mt-4 glass-card p-5 text-center">
            <Loader2 className="w-6 h-6 text-brand-secondary animate-spin mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium">Provider review in progress</p>
            <p className="text-xs text-muted-foreground mt-1">This typically takes 3 to 8 minutes. The provider may decline if criteria are not met.</p>
          </div>
        );

      case "pharmacy":
        return (
          <div className="mt-4 glass-card p-5 text-center">
            <Loader2 className="w-6 h-6 text-brand-secondary animate-spin mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium">Sending to pharmacy</p>
            <p className="text-xs text-muted-foreground mt-1">Almost there...</p>
          </div>
        );

      case "fulfilled":
        return null;

      default:
        return null;
    }
  }

  /* ---- Provider/Admin welcome message on mount ---- */
  const hasGreeted = useRef(false);
  useEffect(() => {
    if (!roleReady || hasGreeted.current) return;
    if (userRole === "provider" || userRole === "admin") {
      hasGreeted.current = true;
      const greeting =
        userRole === "provider"
          ? "Welcome back. I'm your practiceal assistant — I can help you review patient cases, check your queue, look up prescriptions, and manage your practice. What would you like to do?"
          : "Welcome to the admin console. I can help you with platform stats, client lookups, prescription volumes, revenue data, and compliance. What would you like to know?";
      addSystemMessage(greeting);
    }
  }, [roleReady, userRole]);

  /* ---- Render ---- */

  const isClientRole = userRole === "client";
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Provider/Admin: full-width chat, no progress tracker
  if (!isClientRole) {
    return (
      <AppShell>
        <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen">
          {/* Header */}
          <div className="px-6 lg:px-8 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand shadow-[0_4px_14px_rgba(91,33,182,0.3)]">
                {userRole === "provider" ? (
                  <Stethoscope className="w-4 h-4 text-white" />
                ) : (
                  <Shield className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {userRole === "provider" ? "Practiceal Assistant" : "Platform Intelligence"}
                </p>
                <p className="text-[11px] text-muted-foreground tracking-wide">
                  ScriptsXO
                </p>
              </div>
            </div>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] lg:max-w-[70%] rounded-2xl px-5 py-3.5 ${
                      msg.role === "user"
                        ? "bg-brand-secondary text-white rounded-br-md shadow-[0_4px_14px_rgba(124,58,237,0.25)]"
                        : "bg-muted/60 text-foreground rounded-bl-md border border-border/50"
                    }`}
                  >
                    {msg.role === "system" && (
                      <p className="text-[10px] tracking-[0.15em] uppercase text-brand-secondary font-medium mb-1.5">
                        ScriptsXO
                      </p>
                    )}
                    <p className="text-sm font-light leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted/60 rounded-2xl rounded-bl-md px-5 py-3.5 border border-border/50">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-brand-secondary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-brand-secondary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-brand-secondary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 lg:px-8 py-4">
            <div className="flex items-center gap-3 max-w-[800px]">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={
                  userRole === "provider"
                    ? "Ask about patients, prescriptions, or your queue..."
                    : "Ask about platform stats, clients, or prescriptions..."
                }
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-card/80 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                size="icon"
                className="h-11 w-11 rounded-xl bg-brand-secondary text-white hover:bg-brand-secondary-hover disabled:opacity-30 shadow-[0_4px_14px_rgba(124,58,237,0.3)]"
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Client role: full intake flow with progress tracker
  return (
    <AppShell>
      <div className="flex h-[calc(100vh-56px)] lg:h-screen">
        {/* ===== Left: Step Tracker ===== */}
        <div className="hidden lg:flex flex-col w-[220px] border-r border-border p-5 bg-gradient-to-b from-brand-muted/30 to-transparent">
          <p className="text-[10px] tracking-[0.2em] uppercase font-medium text-brand-secondary mb-5">
            Progress
          </p>
          <div className="relative space-y-0">
            {/* Connecting line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-brand/20 via-border to-transparent pointer-events-none" />

            {STEPS.map((step) => {
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = currentStep === step.id;
              const isCompletionStep = COMPLETION_STEPS.has(step.id);
              const isDimmed = isCompletionStep && !isCompleted && !isCurrent;

              return (
                <div
                  key={step.id}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] transition-all duration-200 ${
                    isCurrent
                      ? "bg-brand/8 text-brand-secondary font-medium border-l-2 border-brand-secondary"
                      : isCompleted
                        ? "text-emerald-600"
                        : isDimmed
                          ? "text-muted-foreground/35"
                          : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={isCurrent ? { background: "rgba(91,33,182,0.06)" } : undefined}
                >
                  <div
                    className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      isCompleted
                        ? "bg-emerald-600 text-white shadow-[0_2px_8px_rgba(5,150,105,0.3)]"
                        : isCurrent
                          ? "bg-brand-secondary text-white shadow-[0_2px_10px_rgba(124,58,237,0.4)]"
                          : isDimmed
                            ? "bg-muted/40 text-muted-foreground/30"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={12} />
                    ) : (
                      <span className="text-[10px]">{step.number}</span>
                    )}
                  </div>
                  {step.label}
                </div>
              );
            })}
          </div>

          {/* Proxy indicator */}
          {ordererRole !== "self" && (
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-2">Ordering by</p>
              <div className="flex items-center gap-2 text-xs text-foreground">
                {(ordererRole === "provider" || ordererRole === "nurse") ? (
                  <Stethoscope className="w-3.5 h-3.5 text-brand-secondary" />
                ) : (
                  <Users className="w-3.5 h-3.5 text-brand-secondary" />
                )}
                <span>
                  {proxyInfo.firstName} {proxyInfo.lastName}
                  {proxyInfo.npiVerified && (
                    <BadgeCheck className="w-3 h-3 text-emerald-600 inline ml-1" />
                  )}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{ordererRole}</p>
            </div>
          )}
        </div>

        {/* ===== Right: Chat Area ===== */}
        <div className="flex-1 flex flex-col">
          {/* Mobile step indicator */}
          <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-border bg-background/90 backdrop-blur-sm overflow-x-auto">
            {STEPS.map((step) => {
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = currentStep === step.id;
              const isCompletionStep = COMPLETION_STEPS.has(step.id);
              const isDimmed = isCompletionStep && !isCompleted && !isCurrent;
              return (
                <div
                  key={step.id}
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                    isCompleted
                      ? "bg-emerald-600 text-white shadow-[0_2px_6px_rgba(5,150,105,0.3)]"
                      : isCurrent
                        ? "bg-brand-secondary text-white shadow-[0_2px_8px_rgba(124,58,237,0.4)]"
                        : isDimmed
                          ? "bg-muted/40 text-muted-foreground/30"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={10} />
                  ) : (
                    <span className="text-[9px]">{step.number}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Welcome landing OR Chat messages */}
          {currentStep === "welcome" ? (
            <div className="flex-1 overflow-y-auto">
              {/* Welcome header */}
              <div className="px-6 lg:px-10 pt-10 pb-8 border-b border-[var(--border)]">
                <div className="max-w-[680px]">
                  <p className="text-[10px] tracking-[0.25em] uppercase font-medium text-brand-secondary mb-3">
                    ScriptsXO &mdash; New Intake
                  </p>
                  <h1 className="text-3xl lg:text-4xl font-medium text-foreground mb-3 leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
                    Let&apos;s get started
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This process takes about 5 minutes. A licensed provider will review your request before any prescription is issued.
                  </p>
                </div>
              </div>

              <div className="p-6 lg:p-8 max-w-[680px]">
                {/* 4-step overview */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {[
                    { num: "01", title: "Medical History", desc: "Share your health background" },
                    { num: "02", title: "Symptoms", desc: "Describe what you need" },
                    { num: "03", title: "Verification", desc: "Confirm your identity" },
                    { num: "04", title: "Review", desc: "Provider reviews your request" },
                  ].map((item) => (
                    <div key={item.num} className="glass-card p-4">
                      <p className="text-[10px] tracking-[0.15em] uppercase font-medium text-brand-secondary mb-1.5">
                        {item.num}
                      </p>
                      <p className="text-sm font-medium text-foreground mb-0.5">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Choose Your Path */}
                <p className="eyebrow text-brand-secondary mb-4">
                  Choose Your Path
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* New Client card */}
                  <button
                    onClick={handleWelcomeStart}
                    className="glass-card p-6 text-left group hover:border-brand-secondary/30 hover:shadow-[0_8px_30px_rgba(124,58,237,0.12)] transition-all duration-300"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-brand shadow-[0_4px_14px_rgba(91,33,182,0.35)]">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">New Client</p>
                    <p className="text-xs text-muted-foreground mb-5">
                      First time getting a prescription through ScriptsXO
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-secondary group-hover:gap-3 transition-all duration-200">
                      Begin Intake <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Returning Client card */}
                  <button
                    onClick={handleWelcomeStart}
                    className="glass-card p-6 text-left group hover:border-brand-secondary/30 hover:shadow-[0_8px_30px_rgba(124,58,237,0.12)] transition-all duration-300"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-brand shadow-[0_4px_14px_rgba(91,33,182,0.35)]">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">Returning Client</p>
                    <p className="text-xs text-muted-foreground mb-5">
                      You&apos;ve ordered through ScriptsXO before
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-secondary group-hover:gap-3 transition-all duration-200">
                      Describe Symptoms <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id}>
                    <div
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] lg:max-w-[70%] rounded-2xl px-5 py-3.5 ${
                          msg.role === "user"
                            ? "bg-brand-secondary text-white rounded-br-md shadow-[0_4px_14px_rgba(124,58,237,0.25)]"
                            : "bg-muted/60 text-foreground rounded-bl-md border border-border/50"
                        }`}
                      >
                        {msg.role === "system" && (
                          <p className="text-[10px] tracking-[0.15em] uppercase text-brand-secondary font-medium mb-1.5">
                            ScriptsXO
                          </p>
                        )}
                        <p className="text-sm font-light leading-relaxed">{msg.content}</p>
                      </div>
                    </div>

                    {msg.role === "system" &&
                      msg.step === currentStep &&
                      msg.id === messages.filter((m) => m.step === currentStep).pop()?.id && (
                        <div className="max-w-[85%] lg:max-w-[70%] mt-2">
                          {renderStepContent()}
                        </div>
                      )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted/60 rounded-2xl rounded-bl-md px-5 py-3.5 border border-border/50">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-brand-secondary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-brand-secondary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-brand-secondary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input bar */}
              <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 lg:px-8 py-4">
                <div className="flex items-center gap-3 max-w-[800px]">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask a question at any time..."
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-card/80 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    size="icon"
                    className="h-11 w-11 rounded-xl bg-brand-secondary text-white hover:bg-brand-secondary-hover disabled:opacity-30 shadow-[0_4px_14px_rgba(124,58,237,0.3)]"
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function StartPage() {
  return (
    <Suspense fallback={null}>
      <StartPageInner />
    </Suspense>
  );
}
