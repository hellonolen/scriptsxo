"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { SITECONFIG, formatPrice } from "@/lib/config";
import { getSessionCookie, isAdmin as checkIsAdmin } from "@/lib/auth";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/* ---------------------------------------------------------------------------
   STEP DEFINITIONS
   --------------------------------------------------------------------------- */

const STEPS = [
  { id: "welcome", label: "Get Started", icon: Home, number: 1 },
  { id: "intake", label: "New Intake", icon: User, number: 2 },
  { id: "payment", label: "Payment", icon: CreditCard, number: 3 },
  { id: "medical", label: "Medical History", icon: FileText, number: 4 },
  { id: "symptoms", label: "Symptoms", icon: Pill, number: 5 },
  { id: "verification", label: "Verification", icon: Shield, number: 6 },
  { id: "video", label: "Video Verification", icon: Video, number: 7 },
  { id: "review", label: "Review", icon: ClipboardCheck, number: 8 },
  { id: "approved", label: "Approved", icon: Check, number: 9 },
  { id: "pharmacy", label: "Send to Pharmacy", icon: Truck, number: 10 },
  { id: "fulfilled", label: "Fulfilled", icon: Package, number: 11 },
] as const;

/** Steps 9-11 are completion states — they only highlight when reached */
const COMPLETION_STEPS: Set<StepId> = new Set(["approved", "pharmacy", "fulfilled"]);

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
  "Do you understand that a licensed physician will review this before any prescription is issued?",
];

/* ---------------------------------------------------------------------------
   PROXY/CAREGIVER TYPES
   --------------------------------------------------------------------------- */

type OrdererRole = "self" | "physician" | "nurse" | "caregiver" | "family";

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

export default function StartPage() {
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

  // Gemini chat integration
  const aiChat = useAction(api.actions.aiChat.chat);
  const validateFormStep = useAction(api.actions.validateInput.validateFormStep);
  const scanGovId = useAction(api.actions.scanDocument.scanGovernmentId);
  const scanRx = useAction(api.actions.scanDocument.scanPrescription);
  const analyzeFace = useAction(api.actions.scanDocument.analyzeFacePhoto);
  const verifyNpi = useAction(api.actions.verifyLicense.verifyNpi);

  // Persistent memory — save every message to Convex
  const getOrCreateConversation = useMutation(api.aiConversations.getOrCreate);
  const addConversationMessage = useMutation(api.aiConversations.addMessage);
  const [conversationId, setConversationId] = useState<Id<"aiConversations"> | null>(null);

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

  // Initialize persistent conversation
  useEffect(() => {
    if (!userEmail) return;
    getOrCreateConversation({ email: userEmail })
      .then((id) => setConversationId(id))
      .catch(() => {});
  }, [userEmail, getOrCreateConversation]);

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

  // Payment consent
  const [noRefundAccepted, setNoRefundAccepted] = useState(false);

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
    // Persist AI messages to Convex
    if (conversationId) {
      addConversationMessage({
        conversationId,
        role: "assistant",
        content,
        page: "/start",
      }).catch(() => {});
    }
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
    // Persist user messages to Convex
    if (conversationId) {
      addConversationMessage({
        conversationId,
        role: "user",
        content,
        page: "/start",
      }).catch(() => {});
    }
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

  /** Advance from welcome landing page into the intake chat flow */
  function handleWelcomeStart() {
    completeStep("welcome");
    advanceTo("intake");
    addSystemMessage(
      "Welcome to ScriptsXO. I'll walk you through the process to get your medication. First — are you ordering for yourself, or on behalf of someone else?",
      "intake"
    );
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
        physician: "I'm a licensed physician ordering for a client",
        nurse: "I'm a licensed nurse ordering for a client",
        caregiver: "I'm a home caregiver ordering for someone",
        family: "I'm a family member ordering for someone",
      };
      addUserMessage(labels[role] || "Ordering for someone else");
      simulateTyping(() => {
        if (role === "physician" || role === "nurse") {
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
        setNpiError(result.issues.join(". ") || "Could not verify this NPI number");
        addSystemMessage(
          `I wasn't able to verify that NPI number. ${result.issues.join(". ")}. Please double-check and try again.`
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
      advanceTo("medical");
      addSystemMessage(
        "All set. Now let's get the medical history. Please fill out the following — this helps our providers understand the health background.",
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
    advanceTo("verification");
    const fallback = patientType === "returning"
      ? "Now I need to verify identity. Please upload a government-issued ID. Since this is a returning client, also upload a photo of the previous prescription — this helps us get set up faster."
      : "Now I need to verify identity. Please upload a government-issued ID. If there's a previous prescription for this medication, upload a photo of it as well.";
    addSystemMessage(response || fallback, "verification");
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
          `ID scanned successfully — ${scanResult.documentType?.replace(/_/g, " ") || "document"} detected. Name: ${scanResult.fullName || "readable"}, DOB: ${scanResult.dateOfBirth || "readable"}${scanResult.isExpired ? " (Warning: this ID appears to be expired)" : ""}. Confidence: ${scanResult.confidence}%.`
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
          `Prescription scanned — ${med} prescribed by ${prescriber}${scanResult.dateWritten ? ` on ${scanResult.dateWritten}` : ""}.${scanResult.dosage ? ` Dosage: ${scanResult.dosage}.` : ""} This will be cross-referenced during physician review.`
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
        "Everything looks good so far. Next step — we need a short video recording. You'll see yourself on camera and I'll ask you 5 quick questions. This video is recorded and will be reviewed by a licensed physician. A face photo will also be captured for identity verification. Ready when you are.",
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
        reviewResponse || "Everything looks good. Before we submit for physician review, which pharmacy would you like to pick up the prescription from? Please provide the pharmacy name and location.",
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

    addUserMessage(`Pharmacy: ${pharmacyLocation}`);
    setPharmacyLocation("");
    completeStep("review");
    advanceTo("approved");

    addSystemMessage(
      "Your intake is now being reviewed by a licensed physician. This typically takes 3 to 8 minutes. You'll be notified here as soon as a decision is made. Please note: the physician may decline the request if it does not meet clinical criteria. Feel free to ask me anything while you wait.",
      "approved"
    );

    // Random wait between 3-8 seconds for demo (change to minutes in production)
    const approvalWaitMs = Math.floor(Math.random() * 5000 + 3000);

    setTimeout(() => {
      completeStep("approved");
      advanceTo("pharmacy");
      addSystemMessage(
        "The request has been approved by a licensed physician. We're now sending the prescription to the pharmacy. This usually takes a few minutes.",
        "pharmacy"
      );

      const pharmacyWaitMs = Math.floor(Math.random() * 5000 + 3000);

      setTimeout(() => {
        completeStep("pharmacy");
        advanceTo("fulfilled");
        addSystemMessage(
          `The prescription has been sent to ${pharmacyLocation}. It can be picked up there once the pharmacy has it ready — they'll notify directly. Thank you for using ScriptsXO.`,
          "fulfilled"
        );
      }, pharmacyWaitMs);
    }, approvalWaitMs);
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
      contextHint = `This is a provider using the AI assistant. They may ask about their client queue, clinical questions, prescriptions, or practice management. Answer helpfully and concisely.`;
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

      case "intake":
        // Phase 1: Who is ordering?
        if (ordererRole === "self" && patientType === null) {
          // After selecting "self", show new/returning
          return null; // Will show after orderer role is set
        }

        if (!patientType && ordererRole !== "self" && !proxyInfo.npiVerified && (ordererRole === "physician" || ordererRole === "nurse") && proxyInfo.role !== "self") {
          // Licensed provider needs NPI verification
          if (ordererRole === "physician" || ordererRole === "nurse") {
            return (
              <div className="mt-4 space-y-4">
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Stethoscope className="w-4 h-4 text-[#7C3AED]" />
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
                          className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Last Name</label>
                        <input
                          type="text"
                          value={proxyInfo.lastName}
                          onChange={(e) => setProxyInfo((p) => ({ ...p, lastName: e.target.value }))}
                          placeholder="Last name"
                          className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
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
                        className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
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
                  className="w-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white h-11 text-xs font-medium tracking-wide"
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
                  <Users className="w-4 h-4 text-[#7C3AED]" />
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
                        className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Last Name</label>
                      <input
                        type="text"
                        value={proxyInfo.lastName}
                        onChange={(e) => setProxyInfo((p) => ({ ...p, lastName: e.target.value }))}
                        placeholder="Last name"
                        className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
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
                      className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Phone Number</label>
                    <input
                      type="tel"
                      value={proxyInfo.phone}
                      onChange={(e) => setProxyInfo((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="(555) 555-5555"
                      className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={handleCaregiverInfoSubmit}
                disabled={!proxyInfo.firstName.trim() || !proxyInfo.relationship.trim()}
                className="w-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white h-11 text-xs font-medium tracking-wide"
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
                  className="w-full h-12 text-sm border-2 hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors justify-start px-4"
                >
                  <User className="w-4 h-4 mr-3" />
                  I'm ordering for myself
                </Button>
                <Button
                  onClick={() => handleOrdererRole("physician")}
                  variant="outline"
                  className="w-full h-12 text-sm border-2 hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors justify-start px-4"
                >
                  <Stethoscope className="w-4 h-4 mr-3" />
                  I'm a physician ordering for a client
                </Button>
                <Button
                  onClick={() => handleOrdererRole("nurse")}
                  variant="outline"
                  className="w-full h-12 text-sm border-2 hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors justify-start px-4"
                >
                  <BadgeCheck className="w-4 h-4 mr-3" />
                  I'm a nurse ordering for a client
                </Button>
                <Button
                  onClick={() => handleOrdererRole("caregiver")}
                  variant="outline"
                  className="w-full h-12 text-sm border-2 hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors justify-start px-4"
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
                className="flex-1 h-12 text-sm border-2 hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors"
              >
                <User className="w-4 h-4 mr-2" />
                New Client
              </Button>
              <Button
                onClick={() => handlePatientType("returning")}
                variant="outline"
                className="flex-1 h-12 text-sm border-2 hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors"
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
                  className="flex-1 h-12 text-sm border-2 hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors"
                >
                  <User className="w-4 h-4 mr-2" />
                  New Client
                </Button>
                <Button
                  onClick={() => handlePatientType("returning")}
                  variant="outline"
                  className="flex-1 h-12 text-sm border-2 hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Returning Client
                </Button>
              </div>
            );
          }
        }

        return null;

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
                Payment is non-refundable. A licensed physician will review your request within 3-8 minutes. There is no guarantee your prescription will be approved — the physician may decline if clinical criteria are not met.
              </p>
            </div>
            <label className="flex items-start gap-3 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={noRefundAccepted}
                onChange={(e) => setNoRefundAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border accent-[#7C3AED]"
              />
              <span className="text-xs text-foreground leading-relaxed">
                I understand there is no refund and no guarantee that my prescription will be approved.
              </span>
            </label>
            <Button
              onClick={handlePaymentComplete}
              disabled={!noRefundAccepted}
              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white h-11 text-xs font-medium tracking-wide"
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
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.conditions ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]`}
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
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.medications ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]`}
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
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.allergies ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]`}
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
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.familyHistory ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]`}
              />
              {renderFieldError("familyHistory")}
            </div>
            <Button
              onClick={handleMedicalSubmit}
              disabled={!medicalData.conditions.trim() || isValidating}
              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white h-11 text-xs font-medium tracking-wide"
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
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.complaint ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]`}
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
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.duration ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]`}
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
                className="w-full accent-[#7C3AED]"
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
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.previousTreatments ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]`}
              />
              {renderFieldError("previousTreatments")}
            </div>
            <Button
              onClick={handleSymptomsSubmit}
              disabled={!symptomData.complaint.trim() || !symptomData.duration.trim() || isValidating}
              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white h-11 text-xs font-medium tracking-wide"
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
                  <Loader2 className="w-4 h-4 text-[#7C3AED] animate-spin" />
                )}
              </div>
              <label className="flex items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-[#7C3AED] transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleGovIdUpload}
                />
                {isScanningId ? (
                  <span className="text-sm text-[#7C3AED] font-medium">Scanning ID...</span>
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
                  <Loader2 className="w-4 h-4 text-[#7C3AED] animate-spin" />
                )}
              </div>

              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setVerificationData((p) => ({ ...p, isNewPrescription: false }))}
                  className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
                    !verificationData.isNewPrescription
                      ? "border-[#7C3AED] text-[#7C3AED] bg-[#7C3AED]/5"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  I have a previous Rx
                </button>
                <button
                  onClick={() => setVerificationData((p) => ({ ...p, isNewPrescription: true }))}
                  className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
                    verificationData.isNewPrescription
                      ? "border-[#7C3AED] text-[#7C3AED] bg-[#7C3AED]/5"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  New prescription
                </button>
              </div>

              {!verificationData.isNewPrescription && (
                <>
                  <label className="flex items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-[#7C3AED] transition-colors mb-3">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleRxUpload}
                    />
                    {isScanningRx ? (
                      <span className="text-sm text-[#7C3AED] font-medium">Scanning prescription...</span>
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
                      placeholder="Provider name, practice, or clinic"
                      className="w-full px-4 py-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                    />
                  </div>
                </>
              )}
            </div>

            <Button
              onClick={handleVerificationSubmit}
              disabled={!verificationData.govIdUploaded || isScanningId || isScanningRx}
              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white h-11 text-xs font-medium tracking-wide"
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
                  <Video className="w-8 h-8 text-[#7C3AED] mx-auto mb-3" />
                  <p className="text-sm text-foreground mb-1 font-medium">Video Verification</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    You'll answer 5 questions on camera as part of the verification process. A face photo will be captured for identity confirmation.
                  </p>
                  <Button
                    onClick={startVideo}
                    className="bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white h-11 text-xs font-medium tracking-wide px-8"
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
                    <p className="text-xs text-[#7C3AED]/70 mt-3 italic">
                      {liveTranscript}...
                    </p>
                  )}
                </div>

                <Button
                  onClick={nextVideoQuestion}
                  className="w-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white h-11 text-xs font-medium tracking-wide"
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
                className={`w-full px-4 py-3 rounded-md border ${validationErrors.pharmacy ? "border-red-400" : "border-border"} bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]`}
              />
              {renderFieldError("pharmacy")}
            </div>
            <Button
              onClick={handlePharmacySubmit}
              disabled={!pharmacyLocation.trim() || isValidating}
              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#2DD4BF] text-white h-11 text-xs font-medium tracking-wide"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Submit for Physician Review
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        );

      case "approved":
        return (
          <div className="mt-4 glass-card p-5 text-center">
            <Loader2 className="w-6 h-6 text-[#7C3AED] animate-spin mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium">Physician review in progress</p>
            <p className="text-xs text-muted-foreground mt-1">This typically takes 3 to 8 minutes. The physician may decline if criteria are not met.</p>
          </div>
        );

      case "pharmacy":
        return (
          <div className="mt-4 glass-card p-5 text-center">
            <Loader2 className="w-6 h-6 text-[#2DD4BF] animate-spin mx-auto mb-3" />
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
          ? "Welcome back. I'm your clinical assistant — I can help you review patient cases, check your queue, look up prescriptions, and manage your practice. What would you like to do?"
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
          <div className="px-6 lg:px-8 py-4 border-b border-border bg-background">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
              >
                {userRole === "provider" ? (
                  <Stethoscope className="w-4 h-4 text-white" />
                ) : (
                  <Shield className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {userRole === "provider" ? "Clinical Assistant" : "Platform Intelligence"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Powered by AI
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
                        ? "bg-[#7C3AED] text-white rounded-br-md"
                        : "bg-muted/50 text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.role === "system" && (
                      <p className="text-[10px] tracking-[0.15em] uppercase text-[#7C3AED] font-medium mb-1.5">
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
                <div className="bg-muted/50 rounded-2xl rounded-bl-md px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#7C3AED]/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#7C3AED]/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#7C3AED]/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-border bg-background px-4 lg:px-8 py-4">
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
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                size="icon"
                className="h-11 w-11 rounded-xl bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-30"
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
        <div className="hidden lg:flex flex-col w-[220px] border-r border-border p-5" style={{ background: "rgba(124,58,237,0.02)" }}>
          <p className="text-[10px] tracking-[0.2em] uppercase font-medium text-[#7C3AED] mb-4">
            Progress
          </p>
          <div className="space-y-1">
            {STEPS.map((step) => {
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = currentStep === step.id;
              const isCompletionStep = COMPLETION_STEPS.has(step.id);
              // Completion steps (Approved, Send to Pharmacy, Fulfilled) stay dimmed until reached
              const isDimmed = isCompletionStep && !isCompleted && !isCurrent;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] transition-all ${
                    isCurrent
                      ? "bg-[#7C3AED]/5 text-[#7C3AED] font-medium"
                      : isCompleted
                        ? "text-emerald-600"
                        : isDimmed
                          ? "text-muted-foreground/40"
                          : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                          ? "bg-[#7C3AED] text-white"
                          : isDimmed
                            ? "bg-muted/50 text-muted-foreground/30"
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
                {(ordererRole === "physician" || ordererRole === "nurse") ? (
                  <Stethoscope className="w-3.5 h-3.5 text-[#7C3AED]" />
                ) : (
                  <Users className="w-3.5 h-3.5 text-[#7C3AED]" />
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
          <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-border bg-background overflow-x-auto">
            {STEPS.map((step) => {
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = currentStep === step.id;
              const isCompletionStep = COMPLETION_STEPS.has(step.id);
              const isDimmed = isCompletionStep && !isCompleted && !isCurrent;
              return (
                <div
                  key={step.id}
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                        ? "bg-[#7C3AED] text-white"
                        : isDimmed
                          ? "bg-muted/50 text-muted-foreground/30"
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
            <div className="flex-1 overflow-y-auto p-6 lg:p-8">
              <div className="max-w-[680px]">
                {/* Eyebrow */}
                <p className="eyebrow text-[10px] tracking-[0.2em] uppercase font-medium text-[#7C3AED] mb-2">
                  New Intake
                </p>

                {/* Heading */}
                <h1 className="text-3xl lg:text-4xl font-medium text-foreground mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
                  Let&apos;s get started
                </h1>
                <p className="text-sm text-muted-foreground mb-5">
                  This process takes about 5 minutes. A licensed provider will review your request.
                </p>

                {/* 4-step overview */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { num: "01", title: "Medical History", desc: "Share your health background" },
                    { num: "02", title: "Symptoms", desc: "Describe what you need" },
                    { num: "03", title: "Verification", desc: "Confirm your identity" },
                    { num: "04", title: "Review", desc: "Provider reviews your request" },
                  ].map((item) => (
                    <div key={item.num} className="glass-card p-4">
                      <p className="text-[10px] tracking-[0.15em] uppercase font-medium text-[#7C3AED] mb-1.5">
                        {item.num}
                      </p>
                      <p className="text-sm font-medium text-foreground mb-0.5">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Choose Your Path */}
                <p className="eyebrow text-[10px] tracking-[0.2em] uppercase font-medium text-[#7C3AED] mb-3">
                  Choose Your Path
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* New Client card */}
                  <button
                    onClick={handleWelcomeStart}
                    className="glass-card p-6 text-left group hover:border-[#7C3AED]/30 transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF]">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">New Client</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      First time getting a prescription through ScriptsXO
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7C3AED] group-hover:gap-2.5 transition-all">
                      Begin Intake <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Returning Client card */}
                  <button
                    onClick={handleWelcomeStart}
                    className="glass-card p-6 text-left group hover:border-[#7C3AED]/30 transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF]">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">Returning Client</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      You&apos;ve ordered through ScriptsXO before
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7C3AED] group-hover:gap-2.5 transition-all">
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
                            ? "bg-[#7C3AED] text-white rounded-br-md"
                            : "bg-muted/50 text-foreground rounded-bl-md"
                        }`}
                      >
                        {msg.role === "system" && (
                          <p className="text-[10px] tracking-[0.15em] uppercase text-[#7C3AED] font-medium mb-1.5">
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
                    <div className="bg-muted/50 rounded-2xl rounded-bl-md px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#7C3AED]/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-[#7C3AED]/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-[#7C3AED]/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input bar */}
              <div className="border-t border-border bg-background px-4 lg:px-8 py-4">
                <div className="flex items-center gap-3 max-w-[800px]">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask a question at any time..."
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    size="icon"
                    className="h-11 w-11 rounded-xl bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-30"
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
