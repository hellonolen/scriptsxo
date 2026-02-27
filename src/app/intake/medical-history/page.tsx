"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Heart,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Stethoscope,
  ScanLine,
  FileCheck,
  CreditCard,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { getSessionCookie } from "@/lib/auth";
import type { Id } from "../../../../convex/_generated/dataModel";
import { isDev, DevIntakeStore } from "@/lib/dev-helpers";

const INTAKE_STEPS = [
  { label: "Symptoms", icon: Stethoscope, desc: "Initial details" },
  { label: "Medical History", icon: Heart, desc: "Health background" },
  { label: "Verification", icon: ScanLine, desc: "Verify identity" },
  { label: "Payment", icon: CreditCard, desc: "Security deposit" },
  { label: "Review", icon: FileCheck, desc: "Final check" },
] as const;

const MEDICAL_CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "Heart Disease",
  "Asthma",
  "COPD",
  "Thyroid Disorder",
  "Arthritis",
  "Depression",
  "Anxiety",
  "High Cholesterol",
  "Kidney Disease",
  "Liver Disease",
] as const;

const FAMILY_CONDITIONS = [
  "Heart Disease",
  "Diabetes",
  "Cancer",
  "Stroke",
  "High Blood Pressure",
  "Mental Health Conditions",
  "Autoimmune Disorders",
  "Kidney Disease",
] as const;

const GENDER_OPTIONS = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
] as const;

export default function MedicalHistoryPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");

  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

  const [medications, setMedications] = useState<string[]>([]);
  const [medicationInput, setMedicationInput] = useState("");

  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState("");

  const [surgeries, setSurgeries] = useState("");

  const [selectedFamilyHistory, setSelectedFamilyHistory] = useState<string[]>(
    []
  );

  const [intakeId, setIntakeId] = useState<Id<"intakes"> | null>(null);
  const [loading, setLoading] = useState(true);

  const createIntake = useMutation(api.intake.create);
  const getOrCreateMember = useMutation(api.members.getOrCreate);
  const updateIntakeStep = useMutation(api.intake.updateStep);

  const currentStep = 1;

  useEffect(() => {
    async function initialize() {
      const session = getSessionCookie();
      if (!session?.email) {
        router.push("/access");
        return;
      }

      // Dev mode: use localStorage instead of Convex
      if (isDev()) {
        const devId = DevIntakeStore.getId();
        if (devId) {
          setIntakeId(devId as Id<"intakes">);
        } else {
          const newId = DevIntakeStore.create(session.email);
          setIntakeId(newId as Id<"intakes">);
        }
        setLoading(false);
        return;
      }

      // Production: use Convex
      try {
        await getOrCreateMember({ email: session.email });

        const storedIntakeId = localStorage.getItem("sxo_intake_id");
        if (storedIntakeId) {
          setIntakeId(storedIntakeId as Id<"intakes">);
        } else {
          const newIntakeId = await createIntake({
            email: session.email,
          });
          setIntakeId(newIntakeId);
          localStorage.setItem("sxo_intake_id", newIntakeId);
        }
      } catch (err) {
        console.error("Failed to initialize intake:", err);
        // Fallback: create a local ID so the form still works
        const fallbackId = `fallback_${Date.now()}`;
        setIntakeId(fallbackId as Id<"intakes">);
        localStorage.setItem("sxo_intake_id", fallbackId);
      }
      setLoading(false);
    }

    initialize();
  }, [router, createIntake, getOrCreateMember]);

  function toggleCondition(condition: string) {
    setSelectedConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
  }

  function toggleFamilyCondition(condition: string) {
    setSelectedFamilyHistory((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
  }

  function addMedication() {
    const trimmed = medicationInput.trim();
    if (trimmed && !medications.includes(trimmed)) {
      setMedications((prev) => [...prev, trimmed]);
      setMedicationInput("");
    }
  }

  function removeMedication(med: string) {
    setMedications((prev) => prev.filter((m) => m !== med));
  }

  function addAllergy() {
    const trimmed = allergyInput.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies((prev) => [...prev, trimmed]);
      setAllergyInput("");
    }
  }

  function removeAllergy(allergy: string) {
    setAllergies((prev) => prev.filter((a) => a !== allergy));
  }

  function handleKeyDown(
    event: React.KeyboardEvent,
    action: () => void
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      action();
    }
  }

  async function handleContinue() {
    if (!intakeId) return;

    const medData = {
      firstName,
      lastName,
      dob: dateOfBirth,
      gender,
      phone,
      conditions: selectedConditions,
      medications,
      allergies,
      surgeries,
      familyHistory: selectedFamilyHistory,
    };

    if (isDev()) {
      // Dev mode: save to localStorage
      DevIntakeStore.updateStep("medical_history", medData);
    } else {
      // Production: save to Convex
      try {
        await updateIntakeStep({
          intakeId,
          stepName: "medical_history",
          data: medData,
        });
      } catch (err) {
        console.error("Failed to save medical history:", err);
        // Save locally as fallback
        DevIntakeStore.updateStep("medical_history", medData);
      }
    }

    router.push("/intake/id-verification");
  }

  if (loading) {
    return (
      <AppShell>
        <main className="min-h-screen pt-24 pb-32 px-6 sm:px-8 lg:px-16 w-full max-w-[1600px] mx-auto flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="min-h-screen pt-24 pb-32 px-6 sm:px-8 lg:px-16 w-full max-w-[1600px] mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">

          {/* ==========================================
              LEFT COLUMN - Sticky header & progress 
          =========================================== */}
          <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit">

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* Page header */}
              <div className="mb-12">
                <span className="text-[11px] tracking-[0.2em] text-[#7C3AED] uppercase font-bold mb-4 block">
                  Step 2 of 5
                </span>
                <h1
                  className="text-3xl lg:text-[40px] font-light text-foreground leading-[1.1] tracking-tight mb-5"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Medical History
                </h1>
                <p className="text-muted-foreground font-light text-[15px] leading-relaxed max-w-[340px]">
                  Help your provider understand your health background. All
                  information is kept strictly confidential.
                </p>
              </div>

              {/* Progress (Vertical Version - Desktop) */}
              <div className="hidden lg:block pb-8 border-b border-border/50">
                <div className="space-y-6">
                  {INTAKE_STEPS.map((step, index) => {
                    const StepIcon = step.icon;
                    const isActive = index === currentStep;
                    const isPast = index < currentStep;

                    return (
                      <div key={step.label} className="flex items-start gap-5">
                        <div className="relative flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${isActive
                              ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED] shadow-[0_0_15px_rgba(124,58,237,0.15)]"
                              : isPast
                                ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                                : "border-border/60 bg-transparent text-muted-foreground/60"
                            }`}>
                            <StepIcon size={15} />
                          </div>
                          {index < INTAKE_STEPS.length - 1 && (
                            <div className={`w-px h-8 mt-2 -mb-4 ${isPast ? "bg-[#7C3AED]/40" : "bg-border/60"}`} />
                          )}
                        </div>
                        <div className="pt-2 flex flex-col">
                          <span className={`text-[14px] font-medium tracking-wide ${isActive ? "text-foreground" : isPast ? "text-foreground/80" : "text-muted-foreground/60"}`}>
                            {step.label}
                          </span>
                          <span className={`text-[12px] font-light ${isActive ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                            {step.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Mobile Horizontal Progress (fallback) */}
            <div className="lg:hidden mb-10">
              <div className="flex items-center gap-0 mt-6">
                {INTAKE_STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;
                  return (
                    <div
                      key={step.label}
                      className="flex items-center flex-1 last:flex-0"
                    >
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${isActive
                          ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                          : isCompleted
                            ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                            : "border-border bg-transparent text-muted-foreground/50"
                        }`}
                      >
                        <StepIcon size={13} />
                      </div>
                      {index < INTAKE_STEPS.length - 1 && (
                        <div className={`flex-1 h-px mx-2 ${isCompleted ? "bg-[#7C3AED]/50" : "bg-border"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ==========================================
              RIGHT COLUMN - Continuous Form flow 
          =========================================== */}
          <div className="lg:col-span-8 lg:pt-8 relative">
            <motion.div
              className="space-y-16 max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            >

              {/* Personal Information */}
              <section>
                <div className="mb-5">
                  <h2
                    className="text-[22px] font-light text-foreground mb-1 tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Personal Information
                  </h2>
                  <p className="text-[13px] text-muted-foreground font-light uppercase tracking-widest">
                    Basic details for your medical record
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13px] font-medium tracking-wider text-muted-foreground mb-2 uppercase">
                      First Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      required
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-5 py-4 bg-white border border-border/80 rounded-[8px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all text-[15px] font-light shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium tracking-wider text-muted-foreground mb-2 uppercase">
                      Last Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      required
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-5 py-4 bg-white border border-border/80 rounded-[8px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all text-[15px] font-light shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium tracking-wider text-muted-foreground mb-2 uppercase">
                      Date of Birth <span className="text-destructive">*</span>
                    </label>
                    <input
                      required
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-5 py-4 bg-white border border-border/80 rounded-[8px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all text-[15px] font-light shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                    />
                  </div>
                  <div className="w-full">
                    <label className="block text-[13px] font-medium tracking-wider text-muted-foreground mb-2 uppercase">
                      Gender <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-5 py-4 bg-white border border-border/80 rounded-[8px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all text-[15px] font-light shadow-[0_2px_4px_rgba(0,0,0,0.02)] appearance-none cursor-pointer"
                        required
                      >
                        <option value="" disabled>Select gender</option>
                        {GENDER_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-slate-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[13px] font-medium tracking-wider text-muted-foreground mb-2 uppercase">
                      Phone Number <span className="text-destructive">*</span>
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-5 py-4 bg-white border border-border/80 rounded-[8px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all text-[15px] font-light shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                    />
                  </div>
                </div>
              </section>

              {/* Medical Conditions */}
              <section>
                <div className="mb-5">
                  <h2
                    className="text-[22px] font-light text-foreground mb-1 tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Medical Conditions
                  </h2>
                  <p className="text-[13px] text-muted-foreground font-light uppercase tracking-widest">
                    Select any that you currently have
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {MEDICAL_CONDITIONS.map((condition) => {
                    const isSelected = selectedConditions.includes(condition);
                    return (
                      <button
                        key={condition}
                        type="button"
                        onClick={() => toggleCondition(condition)}
                        className={`px-5 py-2.5 text-[14px] tracking-wide font-light rounded-full border transition-all duration-200 ${isSelected
                            ? "border-[#7C3AED] bg-[#7C3AED]/5 text-[#7C3AED]"
                            : "border-border/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
                          }`}
                        aria-pressed={isSelected}
                      >
                        {condition}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Current Medications */}
              <section>
                <div className="mb-5">
                  <h2
                    className="text-[22px] font-light text-foreground mb-1 tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Current Medications
                  </h2>
                  <p className="text-[13px] text-muted-foreground font-light uppercase tracking-widest">
                    Include dosage if known
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="e.g., Metformin 500mg twice daily"
                      value={medicationInput}
                      onChange={(e) => setMedicationInput(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, addMedication)}
                      className="w-full px-5 py-4 bg-white border border-border/80 rounded-[8px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all text-[15px] font-light shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addMedication}
                    className="h-auto sm:h-[54px] rounded-[8px] shrink-0 border-border/80 bg-white hover:bg-slate-50 text-slate-700 shadow-[0_2px_4px_rgba(0,0,0,0.02)] px-6"
                    aria-label="Add medication"
                  >
                    <Plus size={16} aria-hidden="true" className="mr-2" />
                    Add
                  </Button>
                </div>
                {medications.length > 0 && (
                  <div className="space-y-2">
                    {medications.map((med) => (
                      <div
                        key={med}
                        className="flex items-center justify-between px-5 py-3.5 bg-white border border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.01)] rounded-[8px]"
                      >
                        <span className="text-[15px] font-light text-slate-800">
                          {med}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMedication(med)}
                          className="text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors p-2 rounded-full"
                          aria-label={`Remove ${med}`}
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {medications.length === 0 && (
                  <p className="text-[14px] text-slate-400 font-light italic">
                    No medications added yet.
                  </p>
                )}
              </section>

              {/* Allergies */}
              <section>
                <div className="mb-5">
                  <h2
                    className="text-[22px] font-light text-foreground mb-1 tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Allergies
                  </h2>
                  <p className="text-[13px] text-muted-foreground font-light uppercase tracking-widest">
                    Any drug or food allergies?
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="e.g., Penicillin - causes rash"
                      value={allergyInput}
                      onChange={(e) => setAllergyInput(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, addAllergy)}
                      className="w-full px-5 py-4 bg-white border border-border/80 rounded-[8px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all text-[15px] font-light shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addAllergy}
                    className="h-auto sm:h-[54px] rounded-[8px] shrink-0 border-border/80 bg-white hover:bg-slate-50 text-slate-700 shadow-[0_2px_4px_rgba(0,0,0,0.02)] px-6"
                    aria-label="Add allergy"
                  >
                    <Plus size={16} aria-hidden="true" className="mr-2" />
                    Add
                  </Button>
                </div>
                {allergies.length > 0 && (
                  <div className="space-y-2">
                    {allergies.map((allergy) => (
                      <div
                        key={allergy}
                        className="flex items-center justify-between px-5 py-3.5 bg-white border border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.01)] rounded-[8px]"
                      >
                        <span className="text-[15px] font-light text-slate-800">
                          {allergy}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAllergy(allergy)}
                          className="text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors p-2 rounded-full"
                          aria-label={`Remove ${allergy}`}
                        >
                          <X size={16} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {allergies.length === 0 && (
                  <p className="text-[14px] text-slate-400 font-light italic">
                    No allergies added yet.
                  </p>
                )}
              </section>

              {/* Previous Surgeries */}
              <section>
                <div className="mb-5">
                  <h2
                    className="text-[22px] font-light text-foreground mb-1 tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Previous Surgeries
                  </h2>
                  <p className="text-[13px] text-muted-foreground font-light uppercase tracking-widest">
                    Include dates if known
                  </p>
                </div>
                <textarea
                  placeholder="Describe any previous surgeries or major procedures, including approximate dates..."
                  value={surgeries}
                  onChange={(e) => setSurgeries(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-border/80 rounded-[8px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all min-h-[140px] resize-y text-[15px] font-light leading-relaxed shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                />
              </section>

              {/* Family History */}
              <section>
                <div className="mb-5">
                  <h2
                    className="text-[22px] font-light text-foreground mb-1 tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Family Medical History
                  </h2>
                  <p className="text-[13px] text-muted-foreground font-light uppercase tracking-widest">
                    Conditions in your immediate family
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {FAMILY_CONDITIONS.map((condition) => {
                    const isSelected =
                      selectedFamilyHistory.includes(condition);
                    return (
                      <button
                        key={condition}
                        type="button"
                        onClick={() => toggleFamilyCondition(condition)}
                        className={`px-5 py-2.5 text-[14px] tracking-wide font-light rounded-full border transition-all duration-200 ${isSelected
                            ? "border-[#7C3AED] bg-[#7C3AED]/5 text-[#7C3AED]"
                            : "border-border/80 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
                          }`}
                        aria-pressed={isSelected}
                      >
                        {condition}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Navigation */}
              <div className="flex flex-col-reverse sm:flex-row gap-4 justify-between pt-10 mt-10 border-t border-border/50">
                <button
                  onClick={() => router.push("/intake/symptoms")}
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-8 py-4 border border-border/80 bg-white text-slate-700 text-[12px] tracking-[0.15em] font-medium uppercase hover:bg-slate-50 hover:text-slate-900 transition-colors rounded-[8px] shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Back
                </button>
                <button
                  onClick={handleContinue}
                  className="w-full sm:w-auto bg-[#7C3AED] inline-flex justify-center items-center gap-3 px-10 py-4 text-white text-[12px] tracking-[0.2em] font-medium uppercase hover:bg-[#6D28D9] transition-all duration-300 rounded-[8px] shadow-lg shadow-purple-500/20"
                >
                  Continue
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>

            </motion.div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
