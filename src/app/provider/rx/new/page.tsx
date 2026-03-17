"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { prescriptions, patients, pharmacies } from "@/lib/api";
import { getSessionCookie } from "@/lib/auth";

/* ---------------------------------------------------------------------------
   Constants
   --------------------------------------------------------------------------- */

const MEDICATION_FORMS = [
  "Injectable",
  "Capsule",
  "Tablet",
  "Cream",
  "Gel",
  "Troche",
  "Lozenge",
  "Suppository",
] as const;

const DEA_SCHEDULES = [
  { value: "none", label: "Not Scheduled" },
  { value: "II", label: "Schedule II" },
  { value: "III", label: "Schedule III" },
  { value: "IV", label: "Schedule IV" },
  { value: "V", label: "Schedule V" },
] as const;

/* ---------------------------------------------------------------------------
   Types
   --------------------------------------------------------------------------- */

interface RxFormData {
  patientEmail: string;
  consultationId: string;
  pharmacyId: string;
  medicationName: string;
  genericName: string;
  ndc: string;
  dosage: string;
  form: string;
  quantity: string;
  daysSupply: string;
  refillsAuthorized: string;
  directions: string;
  deaSchedule: string;
  priorAuthRequired: boolean;
  expiresAt: string;
  base: string;
  bud: string;
  strength: string;
  specialInstructions: string;
}

/* ---------------------------------------------------------------------------
   Helper
   --------------------------------------------------------------------------- */

function oneYearFromToday(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

/* ---------------------------------------------------------------------------
   Field label component
   --------------------------------------------------------------------------- */

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs tracking-wide text-muted-foreground mb-2 font-medium"
    >
      {children}
      {required && (
        <span className="text-destructive/50 ml-1" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

/* ---------------------------------------------------------------------------
   Section heading component
   --------------------------------------------------------------------------- */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-sm font-medium text-foreground mb-4 pb-2 border-b border-border"
      style={{ fontFamily: "var(--font-heading)" }}
    >
      {children}
    </h2>
  );
}

/* ---------------------------------------------------------------------------
   Page
   --------------------------------------------------------------------------- */

export default function NewPrescriptionPage() {
  const router = useRouter();
  const session = getSessionCookie();
  const providerEmail = session?.email ?? "";

  const [pharmacyList, setPharmacyList] = useState<any[]>([]);
  const [patientResult, setPatientResult] = useState<any | null>(null);
  const [patientSearching, setPatientSearching] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState<RxFormData>({
    patientEmail: "",
    consultationId: "",
    pharmacyId: "",
    medicationName: "",
    genericName: "",
    ndc: "",
    dosage: "",
    form: "Injectable",
    quantity: "",
    daysSupply: "",
    refillsAuthorized: "0",
    directions: "",
    deaSchedule: "none",
    priorAuthRequired: false,
    expiresAt: oneYearFromToday(),
    base: "",
    bud: "",
    strength: "",
    specialInstructions: "",
  });

  // Load pharmacy list on mount
  useEffect(() => {
    pharmacies
      .list()
      .then((data) => setPharmacyList(Array.isArray(data) ? data : []))
      .catch(() => setPharmacyList([]));
  }, []);

  function setField<K extends keyof RxFormData>(key: K, value: RxFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Patient search — debounced
  const searchPatient = useCallback(async (email: string) => {
    if (!email || !email.includes("@")) {
      setPatientResult(null);
      setPatientError(null);
      return;
    }
    setPatientSearching(true);
    setPatientError(null);
    try {
      const result = await patients.getByEmail(email);
      setPatientResult(result ?? null);
      if (!result) setPatientError("No patient found with this email.");
    } catch {
      setPatientResult(null);
      setPatientError("Failed to look up patient.");
    } finally {
      setPatientSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchPatient(form.patientEmail), 600);
    return () => clearTimeout(timer);
  }, [form.patientEmail, searchPatient]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientResult) {
      setSubmitError("Please find a valid patient before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    try {
      await prescriptions.create({
        providerEmail,
        patientId: (patientResult as any)._id ?? (patientResult as any).id,
        consultationId: form.consultationId || undefined,
        pharmacyId: form.pharmacyId || undefined,
        medicationName: form.medicationName,
        genericName: form.genericName || undefined,
        ndc: form.ndc || undefined,
        dosage: form.dosage,
        form: form.form,
        quantity: form.quantity,
        daysSupply: form.daysSupply ? Number(form.daysSupply) : undefined,
        refillsAuthorized: Number(form.refillsAuthorized),
        directions: form.directions,
        deaSchedule: form.deaSchedule,
        priorAuthRequired: form.priorAuthRequired,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : undefined,
        base: form.base || undefined,
        bud: form.bud ? new Date(form.bud).getTime() : undefined,
        strength: form.strength || undefined,
        specialInstructions: form.specialInstructions || undefined,
        status: "draft",
      });
      router.push("/provider/prescriptions?created=1");
    } catch (err: any) {
      setSubmitError(err?.message ?? "Failed to create prescription.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1100px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/provider/prescriptions"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow mb-0.5">PROVIDER PORTAL</p>
            <h1
              className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              New Prescription
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">
          Write a compound prescription for a patient.
        </p>

        {submitError && (
          <div className="mb-6 px-4 py-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700 font-light">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            {/* ── LEFT COLUMN: Medication Details ── */}
            <div className="space-y-8">
              {/* Medication Details */}
              <section className="bg-card border border-border rounded-md p-6">
                <SectionHeading>Medication Details</SectionHeading>
                <div className="space-y-5">
                  <div>
                    <FieldLabel htmlFor="medicationName" required>
                      Medication Name
                    </FieldLabel>
                    <Input
                      id="medicationName"
                      placeholder="e.g. Tirzepatide Injection"
                      value={form.medicationName}
                      onChange={(e) => setField("medicationName", e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel htmlFor="genericName">Generic Name</FieldLabel>
                      <Input
                        id="genericName"
                        placeholder="Generic name"
                        value={form.genericName}
                        onChange={(e) => setField("genericName", e.target.value)}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="ndc">NDC</FieldLabel>
                      <Input
                        id="ndc"
                        placeholder="00000-0000-00"
                        value={form.ndc}
                        onChange={(e) => setField("ndc", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <FieldLabel htmlFor="dosage" required>
                        Dosage
                      </FieldLabel>
                      <Input
                        id="dosage"
                        placeholder="e.g. 5mg/mL"
                        value={form.dosage}
                        onChange={(e) => setField("dosage", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="form">Form</FieldLabel>
                      <select
                        id="form"
                        value={form.form}
                        onChange={(e) => setField("form", e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-border text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors text-base font-light"
                      >
                        {MEDICATION_FORMS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel htmlFor="quantity" required>
                        Quantity
                      </FieldLabel>
                      <Input
                        id="quantity"
                        placeholder="e.g. 2mL vial"
                        value={form.quantity}
                        onChange={(e) => setField("quantity", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel htmlFor="daysSupply">Days Supply</FieldLabel>
                      <Input
                        id="daysSupply"
                        type="number"
                        min={1}
                        placeholder="30"
                        value={form.daysSupply}
                        onChange={(e) => setField("daysSupply", e.target.value)}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="refillsAuthorized">Refills Authorized</FieldLabel>
                      <Input
                        id="refillsAuthorized"
                        type="number"
                        min={0}
                        max={11}
                        placeholder="0"
                        value={form.refillsAuthorized}
                        onChange={(e) => setField("refillsAuthorized", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Compound Details */}
              <section className="bg-card border border-border rounded-md p-6">
                <SectionHeading>Compound Details</SectionHeading>
                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel htmlFor="strength">Strength</FieldLabel>
                      <Input
                        id="strength"
                        placeholder="e.g. 5mg/mL"
                        value={form.strength}
                        onChange={(e) => setField("strength", e.target.value)}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="base">Base / Vehicle</FieldLabel>
                      <Input
                        id="base"
                        placeholder="e.g. Bacteriostatic Water"
                        value={form.base}
                        onChange={(e) => setField("base", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel htmlFor="bud">BUD (Beyond Use Date)</FieldLabel>
                    <Input
                      id="bud"
                      type="date"
                      value={form.bud}
                      onChange={(e) => setField("bud", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="specialInstructions">
                      Special Instructions
                    </FieldLabel>
                    <textarea
                      id="specialInstructions"
                      rows={3}
                      placeholder="Compounding notes, storage requirements..."
                      value={form.specialInstructions}
                      onChange={(e) => setField("specialInstructions", e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-border text-foreground placeholder-muted-foreground/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors text-base font-light resize-none"
                    />
                  </div>
                </div>
              </section>

              {/* Sig / Directions */}
              <section className="bg-card border border-border rounded-md p-6">
                <SectionHeading>Sig / Directions</SectionHeading>
                <div>
                  <FieldLabel htmlFor="directions" required>
                    Patient Instructions
                  </FieldLabel>
                  <textarea
                    id="directions"
                    rows={4}
                    placeholder="Inject 0.5mL subcutaneously once weekly..."
                    value={form.directions}
                    onChange={(e) => setField("directions", e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white border border-border text-foreground placeholder-muted-foreground/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors text-base font-light resize-none"
                  />
                </div>
              </section>
            </div>

            {/* ── RIGHT COLUMN: Patient / Pharmacy / Admin ── */}
            <div className="space-y-8">
              {/* Patient */}
              <section className="bg-card border border-border rounded-md p-6">
                <SectionHeading>Patient</SectionHeading>
                <div className="space-y-4">
                  <div className="relative">
                    <FieldLabel htmlFor="patientEmail" required>
                      Patient Email
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id="patientEmail"
                        type="email"
                        placeholder="patient@email.com"
                        value={form.patientEmail}
                        onChange={(e) => setField("patientEmail", e.target.value)}
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {patientSearching ? (
                          <Loader2 size={14} className="animate-spin text-muted-foreground" />
                        ) : patientResult ? (
                          <CheckCircle2 size={14} className="text-primary" />
                        ) : (
                          <Search size={14} className="text-muted-foreground/40" />
                        )}
                      </div>
                    </div>
                  </div>

                  {patientError && (
                    <p className="text-xs text-destructive/70 font-light">{patientError}</p>
                  )}

                  {patientResult && (
                    <div className="px-4 py-3 rounded-md bg-primary/5 border border-primary/20">
                      <p className="text-sm font-medium text-foreground">
                        {(patientResult as any).name ?? (patientResult as any).firstName + " " + (patientResult as any).lastName}
                      </p>
                      <p className="text-xs text-muted-foreground font-light mt-0.5">
                        {(patientResult as any).email}
                      </p>
                      {(patientResult as any).dob && (
                        <p className="text-xs text-muted-foreground font-light">
                          DOB: {(patientResult as any).dob}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <FieldLabel htmlFor="consultationId">Consultation ID</FieldLabel>
                    <Input
                      id="consultationId"
                      placeholder="Optional"
                      value={form.consultationId}
                      onChange={(e) => setField("consultationId", e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {/* Pharmacy */}
              <section className="bg-card border border-border rounded-md p-6">
                <SectionHeading>Pharmacy</SectionHeading>
                <div>
                  <FieldLabel htmlFor="pharmacyId">Select Pharmacy</FieldLabel>
                  <select
                    id="pharmacyId"
                    value={form.pharmacyId}
                    onChange={(e) => setField("pharmacyId", e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors text-base font-light"
                  >
                    <option value="">— Select pharmacy —</option>
                    {pharmacyList.map((ph: any) => (
                      <option key={ph._id ?? ph.id} value={ph._id ?? ph.id}>
                        {ph.name}
                        {ph.city ? ` — ${ph.city}, ${ph.state}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {/* Admin */}
              <section className="bg-card border border-border rounded-md p-6">
                <SectionHeading>Administrative</SectionHeading>
                <div className="space-y-5">
                  <div>
                    <FieldLabel htmlFor="deaSchedule">DEA Schedule</FieldLabel>
                    <select
                      id="deaSchedule"
                      value={form.deaSchedule}
                      onChange={(e) => setField("deaSchedule", e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-border text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors text-base font-light"
                    >
                      {DEA_SCHEDULES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel htmlFor="expiresAt">Expiration Date</FieldLabel>
                    <Input
                      id="expiresAt"
                      type="date"
                      value={form.expiresAt}
                      onChange={(e) => setField("expiresAt", e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="priorAuthRequired"
                      type="checkbox"
                      checked={form.priorAuthRequired}
                      onChange={(e) => setField("priorAuthRequired", e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                    />
                    <label
                      htmlFor="priorAuthRequired"
                      className="text-sm font-light text-foreground"
                    >
                      Prior Authorization Required
                    </label>
                  </div>
                </div>
              </section>

              {/* Submit */}
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={submitting || !form.medicationName || !patientResult}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                      Saving...
                    </>
                  ) : (
                    "Save as Draft"
                  )}
                </button>
                <Link
                  href="/provider/prescriptions"
                  className="w-full inline-flex items-center justify-center px-6 py-3.5 border border-border text-foreground text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
