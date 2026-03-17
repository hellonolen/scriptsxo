"use client";

export const runtime = 'edge';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  MessageSquare,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  MapPin,
  Clock,
  CreditCard,
  Hash,
  User,
  Stethoscope,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  consultations,
  patients,
  pharmacies,
  providers,
} from "@/lib/api";

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function calcAge(dobStr: string | null | undefined): string {
  if (!dobStr) return "—";
  const dob = new Date(dobStr);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return String(age);
}

function parseJsonField<T = unknown>(val: unknown): T | null {
  if (!val) return null;
  if (typeof val === "object") return val as T;
  try {
    return JSON.parse(String(val)) as T;
  } catch {
    return null;
  }
}

function asList(val: unknown): string[] {
  const arr = parseJsonField<string[]>(val);
  if (Array.isArray(arr)) return arr;
  if (typeof val === "string" && val.trim()) return [val];
  return [];
}

/* ---------------------------------------------------------------------------
   Section heading
   --------------------------------------------------------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-3 font-medium">
      {children}
    </p>
  );
}

/* ---------------------------------------------------------------------------
   Pill badge list
   --------------------------------------------------------------------------- */

function PillList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-sm text-muted-foreground font-light">None reported</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-light bg-muted text-foreground border border-border"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Loading skeleton
   --------------------------------------------------------------------------- */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-muted rounded ${className}`} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card p-6 space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-border bg-card p-6 space-y-4">
        <Skeleton className="h-4 w-36" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <div className="flex gap-1.5">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Page
   --------------------------------------------------------------------------- */

type ActionMode = "approve" | "moreinfo" | "deny" | null;

export default function CaseReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [consultation, setConsultation] = useState<any | null>(null);
  const [patient, setPatient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [action, setAction] = useState<ActionMode>(null);
  const [pharmacyList, setPharmacyList] = useState<any[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [licensedProviderCount, setLicensedProviderCount] = useState<number | null>(null);

  /* ------ load consultation + patient ------ */
  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const consult = await consultations.getById(id);
        setConsultation(consult);

        const patientId = consult.patient_id as string;
        if (patientId) {
          const pat = await patients.getById(patientId);
          setPatient(pat);
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to load case.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  /* ------ load pharmacies when approve is opened ------ */
  useEffect(() => {
    if (action !== "approve") return;
    pharmacies
      .list()
      .then((data) => setPharmacyList(Array.isArray(data) ? data : []))
      .catch(() => setPharmacyList([]));
  }, [action]);

  /* ------ load provider count for patient state ------ */
  useEffect(() => {
    const state =
      (consultation?.patient_state as string) ?? (patient?.state as string);
    if (!state) return;
    providers
      .getActive(state)
      .then((data) => setLicensedProviderCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setLicensedProviderCount(null));
  }, [consultation?.patient_state, patient?.state]);

  /* ------ action handlers ------ */

  function toggleAction(next: ActionMode) {
    setAction((prev) => (prev === next ? null : next));
    setNotes("");
    setSubmitError(null);
  }

  async function handleApprove() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await consultations.complete(id, {
        diagnosis: notes || "Approved",
        treatmentPlan: notes,
        notes,
      });
      const patientId = consultation?.patient_id as string;
      router.push(
        `/provider/rx/new?consultationId=${id}${patientId ? `&patientId=${patientId}` : ""}`
      );
    } catch (e: any) {
      setSubmitError(e?.message ?? "Failed to approve case.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMoreInfo() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await consultations.complete(id, {
        diagnosis: "More information requested",
        notes,
      });
      setAction(null);
      setNotes("");
    } catch (e: any) {
      setSubmitError(e?.message ?? "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeny() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await consultations.deny(id, notes);
      router.push("/provider");
    } catch (e: any) {
      setSubmitError(e?.message ?? "Failed to deny case.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ------ derived values ------ */

  const patientName =
    (consultation?.patient_name as string) ??
    (patient?.name as string) ??
    "Unknown Patient";

  const patientEmail =
    (consultation?.patient_email as string) ??
    (patient?.email as string) ??
    "—";

  const patientState =
    (consultation?.patient_state as string) ??
    (patient?.state as string) ??
    "—";

  const dob = patient?.dob as string | undefined;
  const age = calcAge(dob);

  const chiefComplaint =
    (consultation?.chief_complaint as string) ?? "—";

  const medicationRequested =
    (consultation?.medication_requested as string) ?? "—";

  const conditions = asList(consultation?.medical_conditions ?? patient?.medical_conditions);
  const currentMeds = asList(consultation?.current_medications ?? patient?.current_medications);
  const allergies = asList(consultation?.allergies ?? patient?.allergies);
  const familyHistory = asList(consultation?.family_history ?? patient?.family_history);

  const intakeAnswers = parseJsonField<Record<string, string>>(
    consultation?.intake_answers
  );

  const contraindications = asList(consultation?.contraindications);

  const videoUrl = consultation?.video_url as string | undefined;
  const transcript = consultation?.transcript as string | undefined;

  const paymentStatus = (consultation?.payment_status as string) ?? "—";
  const queuePosition = (consultation?.queue_position as number) ?? null;

  /* ------ render ------ */

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">

        {/* ── Sticky page header ────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 -mx-6 lg:-mx-10 px-6 lg:px-10 py-4 bg-background/95 backdrop-blur border-b border-border mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/provider"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] tracking-widest uppercase text-muted-foreground font-medium">
                PROVIDER PORTAL / CASE REVIEW
              </p>
              <p
                className="text-lg font-light tracking-[-0.02em] text-foreground truncate"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Case #{id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => toggleAction("approve")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.15em] uppercase font-light rounded-sm transition-colors ${
                action === "approve"
                  ? "bg-emerald-700 text-white"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              <CheckCircle size={12} aria-hidden="true" />
              Approve
            </button>
            <button
              onClick={() => toggleAction("moreinfo")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.15em] uppercase font-light rounded-sm transition-colors border ${
                action === "moreinfo"
                  ? "bg-amber-50 border-amber-500 text-amber-800"
                  : "border-amber-500 text-amber-700 hover:bg-amber-50"
              }`}
            >
              <MessageSquare size={12} aria-hidden="true" />
              Request Info
            </button>
            <button
              onClick={() => toggleAction("deny")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.15em] uppercase font-light rounded-sm transition-colors ${
                action === "deny"
                  ? "bg-red-700 text-white"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              <XCircle size={12} aria-hidden="true" />
              Deny
            </button>
          </div>
        </div>

        {/* ── Error state ──────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700 font-light flex items-center gap-2">
            <AlertTriangle size={14} aria-hidden="true" />
            {error}
          </div>
        )}

        {/* ── Two-column layout ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ──────────────────────────────────────────────────────────────
              LEFT COLUMN — main content
          ────────────────────────────────────────────────────────────── */}
          <div className="space-y-6 min-w-0">

            {loading ? (
              <LoadingSkeleton />
            ) : (
              <>
                {/* Patient Chart */}
                <section className="rounded-md border border-border bg-card p-6">
                  <SectionLabel>Patient Chart</SectionLabel>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <dt className="text-[10px] tracking-widest uppercase text-muted-foreground mb-0.5">Name</dt>
                      <dd className="text-sm font-light text-foreground">{patientName}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] tracking-widest uppercase text-muted-foreground mb-0.5">Date of Birth</dt>
                      <dd className="text-sm font-light text-foreground">
                        {dob ? `${dob} (Age ${age})` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] tracking-widest uppercase text-muted-foreground mb-0.5">State</dt>
                      <dd className="text-sm font-light text-foreground">{patientState}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] tracking-widest uppercase text-muted-foreground mb-0.5">Contact Email</dt>
                      <dd className="text-sm font-light text-foreground">{patientEmail}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] tracking-widest uppercase text-muted-foreground mb-0.5">Chief Complaint</dt>
                      <dd className="text-sm font-light text-foreground">{chiefComplaint}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] tracking-widest uppercase text-muted-foreground mb-0.5">Medication Requested</dt>
                      <dd className="text-sm font-light text-foreground">{medicationRequested}</dd>
                    </div>
                  </dl>
                </section>

                {/* Medical History */}
                <section className="rounded-md border border-border bg-card p-6">
                  <SectionLabel>Medical History</SectionLabel>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5">Current Conditions</p>
                      <PillList items={conditions} />
                    </div>
                    <div>
                      <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5">Current Medications</p>
                      <PillList items={currentMeds} />
                    </div>
                    <div>
                      <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5">Allergies</p>
                      <PillList items={allergies} />
                    </div>
                    <div>
                      <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5">Family History</p>
                      <PillList items={familyHistory} />
                    </div>
                  </div>
                </section>

                {/* Intake Answers */}
                <section className="rounded-md border border-border bg-card p-6">
                  <SectionLabel>Intake Answers</SectionLabel>
                  {intakeAnswers && Object.keys(intakeAnswers).length > 0 ? (
                    <ol className="space-y-4 list-none">
                      {Object.entries(intakeAnswers).map(([question, answer], i) => (
                        <li key={i} className="flex gap-3">
                          <span className="text-xs font-medium text-muted-foreground w-5 shrink-0 mt-0.5">
                            {i + 1}.
                          </span>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-0.5">{question}</p>
                            <p className="text-sm font-light text-foreground leading-relaxed">{answer}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    /* fallback structured fields */
                    <ol className="space-y-4 list-none">
                      {[
                        ["Describe your symptoms", consultation?.symptoms_description],
                        ["How long have you had these symptoms?", consultation?.symptom_duration],
                        ["Severity (1–10)", consultation?.symptom_severity],
                        ["Previous treatments tried", consultation?.previous_treatments],
                      ]
                        .filter(([, v]) => v)
                        .map(([q, a], i) => (
                          <li key={i} className="flex gap-3">
                            <span className="text-xs font-medium text-muted-foreground w-5 shrink-0 mt-0.5">
                              {i + 1}.
                            </span>
                            <div>
                              <p className="text-xs text-muted-foreground font-medium mb-0.5">{q as string}</p>
                              <p className="text-sm font-light text-foreground leading-relaxed">{a as string}</p>
                            </div>
                          </li>
                        ))}
                      {(!consultation?.symptoms_description &&
                        !intakeAnswers) && (
                        <li>
                          <p className="text-sm text-muted-foreground font-light">No intake answers recorded.</p>
                        </li>
                      )}
                    </ol>
                  )}
                </section>

                {/* Contraindications */}
                <section className="rounded-md border border-border bg-card p-6">
                  <SectionLabel>Contraindications</SectionLabel>
                  {contraindications.length > 0 ? (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
                        <p className="text-xs font-medium text-amber-800 tracking-wide uppercase">
                          {contraindications.length} flag{contraindications.length !== 1 ? "s" : ""} detected
                        </p>
                      </div>
                      <ul className="space-y-1.5">
                        {contraindications.map((flag, i) => (
                          <li key={i} className="text-sm font-light text-amber-900 flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">•</span>
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-md border border-green-200 bg-green-50 p-4 flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-600 shrink-0" aria-hidden="true" />
                      <p className="text-sm font-light text-green-800">No contraindications flagged.</p>
                    </div>
                  )}
                </section>

                {/* Video Intake */}
                {videoUrl && (
                  <section className="rounded-md border border-border bg-card p-6">
                    <SectionLabel>Video Intake</SectionLabel>
                    <div className="rounded-md overflow-hidden bg-black mb-4">
                      <video
                        controls
                        src={videoUrl}
                        className="w-full max-h-[360px]"
                        aria-label="Patient video intake"
                      />
                    </div>
                    {transcript && (
                      <div>
                        <button
                          onClick={() => setTranscriptOpen((o) => !o)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-light mb-3"
                        >
                          {transcriptOpen ? (
                            <ChevronUp size={13} aria-hidden="true" />
                          ) : (
                            <ChevronDown size={13} aria-hidden="true" />
                          )}
                          {transcriptOpen ? "Hide" : "Show"} Transcript
                        </button>
                        {transcriptOpen && (
                          <div className="rounded-md bg-muted/30 border border-border p-4 text-sm font-light text-foreground leading-relaxed whitespace-pre-wrap">
                            {transcript}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────
              RIGHT COLUMN — sidebar
          ────────────────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Provider Actions card */}
            <div className="rounded-md border border-border bg-card p-5 lg:sticky lg:top-[100px]">
              <SectionLabel>Provider Actions</SectionLabel>

              {!action && (
                <div className="space-y-2">
                  <button
                    onClick={() => toggleAction("approve")}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-emerald-700 transition-colors"
                  >
                    <CheckCircle size={12} aria-hidden="true" />
                    Approve
                  </button>
                  <button
                    onClick={() => toggleAction("moreinfo")}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-amber-500 text-amber-700 text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-amber-50 transition-colors"
                  >
                    <MessageSquare size={12} aria-hidden="true" />
                    Request More Info
                  </button>
                  <button
                    onClick={() => toggleAction("deny")}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-red-700 transition-colors"
                  >
                    <XCircle size={12} aria-hidden="true" />
                    Deny
                  </button>
                </div>
              )}

              {/* Approve panel */}
              {action === "approve" && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="pharmacySelect"
                      className="block text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5 font-medium"
                    >
                      Pharmacy
                    </label>
                    <select
                      id="pharmacySelect"
                      value={selectedPharmacy}
                      onChange={(e) => setSelectedPharmacy(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-border text-foreground rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors text-sm font-light"
                    >
                      <option value="">Select pharmacy…</option>
                      {pharmacyList.map((ph: any) => (
                        <option key={ph.id} value={ph.id}>
                          {ph.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="approveNotes"
                      className="block text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5 font-medium"
                    >
                      Prescription Notes
                    </label>
                    <textarea
                      id="approveNotes"
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add clinical notes, diagnosis, or treatment plan…"
                      className="w-full px-3 py-2.5 bg-white border border-border text-foreground placeholder-muted-foreground/60 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors text-sm font-light resize-none"
                    />
                  </div>
                  {submitError && (
                    <p className="text-xs text-red-600 font-light">{submitError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <CheckCircle size={11} aria-hidden="true" />
                      )}
                      Confirm Approval
                    </button>
                    <button
                      onClick={() => toggleAction(null)}
                      className="px-4 py-2.5 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* More Info panel */}
              {action === "moreinfo" && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="moreinfoNotes"
                      className="block text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5 font-medium"
                    >
                      What Information Do You Need?
                    </label>
                    <textarea
                      id="moreinfoNotes"
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe what additional information you need from the patient…"
                      className="w-full px-3 py-2.5 bg-white border border-border text-foreground placeholder-muted-foreground/60 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors text-sm font-light resize-none"
                    />
                  </div>
                  {submitError && (
                    <p className="text-xs text-red-600 font-light">{submitError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleMoreInfo}
                      disabled={submitting || !notes.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-amber-500 text-amber-700 text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-amber-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <MessageSquare size={11} aria-hidden="true" />
                      )}
                      Submit Request
                    </button>
                    <button
                      onClick={() => toggleAction(null)}
                      className="px-4 py-2.5 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Deny panel */}
              {action === "deny" && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="denyReason"
                      className="block text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5 font-medium"
                    >
                      Reason for Denial
                    </label>
                    <textarea
                      id="denyReason"
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Provide a clinical reason for denial…"
                      className="w-full px-3 py-2.5 bg-white border border-border text-foreground placeholder-muted-foreground/60 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors text-sm font-light resize-none"
                    />
                  </div>
                  {submitError && (
                    <p className="text-xs text-red-600 font-light">{submitError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeny}
                      disabled={submitting}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 text-white text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <XCircle size={11} aria-hidden="true" />
                      )}
                      Confirm Denial
                    </button>
                    <button
                      onClick={() => toggleAction(null)}
                      className="px-4 py-2.5 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Case Details card */}
            <div className="rounded-md border border-border bg-card p-5">
              <SectionLabel>Case Details</SectionLabel>
              <dl className="space-y-3">
                <div className="flex items-start gap-2">
                  <Hash size={13} className="text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <dt className="text-[10px] tracking-widest uppercase text-muted-foreground mb-0.5">Case ID</dt>
                    <dd className="text-xs font-light text-foreground font-mono">{id}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={13} className="text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <dt className="text-[10px] tracking-widest uppercase text-muted-foreground mb-0.5">Submitted</dt>
                    <dd className="text-sm font-light text-foreground">
                      {loading ? "—" : formatDate(consultation?.created_at as number)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <dt className="text-[10px] tracking-widest uppercase text-muted-foreground mb-0.5">Patient State</dt>
                    <dd className="text-sm font-light text-foreground">{patientState}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CreditCard size={13} className="text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <dt className="text-[10px] tracking-widest uppercase text-muted-foreground mb-0.5">Payment Status</dt>
                    <dd>
                      <Badge
                        variant={
                          paymentStatus === "paid"
                            ? "success"
                            : paymentStatus === "pending"
                            ? "warning"
                            : "default"
                        }
                      >
                        {paymentStatus}
                      </Badge>
                    </dd>
                  </div>
                </div>
                {queuePosition !== null && (
                  <div className="flex items-start gap-2">
                    <User size={13} className="text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <dt className="text-[10px] tracking-widests uppercase text-muted-foreground mb-0.5">Queue Position</dt>
                      <dd className="text-sm font-light text-foreground">#{queuePosition}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>

            {/* Patient Location card */}
            <div className="rounded-md border border-border bg-card p-5">
              <SectionLabel>Patient Location</SectionLabel>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-sm bg-muted flex items-center justify-center">
                  <MapPin size={16} className="text-muted-foreground" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xl font-light text-foreground tracking-[-0.02em]">
                    {patientState}
                  </p>
                  <p className="text-xs text-muted-foreground font-light">Patient state of residence</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-light">
                <Stethoscope size={13} className="text-muted-foreground shrink-0" aria-hidden="true" />
                {licensedProviderCount === null ? (
                  <span className="text-muted-foreground">Checking coverage…</span>
                ) : licensedProviderCount === 0 ? (
                  <span className="text-amber-700">
                    No licensed providers in {patientState}
                  </span>
                ) : (
                  <span className="text-foreground">
                    <strong className="font-medium">{licensedProviderCount}</strong> licensed provider{licensedProviderCount !== 1 ? "s" : ""} in {patientState}
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}
