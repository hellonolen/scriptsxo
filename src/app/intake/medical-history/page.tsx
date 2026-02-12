"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Stethoscope,
  ScanLine,
  FileCheck,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INTAKE_STEPS = [
  { label: "Medical History", icon: Heart },
  { label: "Symptoms", icon: Stethoscope },
  { label: "Verification", icon: ScanLine },
  { label: "Review", icon: FileCheck },
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

  const currentStep = 0;

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

  return (
    <>
      <Nav />
      <main className="min-h-screen pt-28 pb-24 px-6 sm:px-8 lg:px-12">
        <div className="max-w-[1400px] mx-auto">
          {/* Progress bar */}
          <div className="max-w-2xl mb-12">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] tracking-[0.2em] text-brand-secondary uppercase font-light">
                Step 1 of 4
              </span>
            </div>
            <div className="w-full h-px bg-border relative">
              <div
                className="absolute top-0 left-0 h-px bg-brand-secondary transition-all duration-500"
                style={{ width: "25%" }}
              />
            </div>
            {/* Step indicators */}
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
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-sm border flex items-center justify-center transition-colors ${
                          isActive
                            ? "border-brand-secondary bg-brand-secondary-muted"
                            : isCompleted
                              ? "border-brand-secondary bg-brand-secondary text-white"
                              : "border-border bg-card"
                        }`}
                      >
                        <StepIcon
                          size={14}
                          className={
                            isActive
                              ? "text-brand-secondary"
                              : isCompleted
                                ? "text-white"
                                : "text-muted-foreground"
                          }
                          aria-hidden="true"
                        />
                      </div>
                      <span
                        className={`text-[10px] tracking-[0.1em] uppercase font-light hidden sm:block ${
                          isActive
                            ? "text-brand-secondary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < INTAKE_STEPS.length - 1 && (
                      <div className="flex-1 h-px bg-border mx-3 mb-5 sm:mb-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Page header */}
          <div className="max-w-2xl mb-10">
            <h1
              className="text-3xl lg:text-4xl font-light text-foreground mb-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Medical History
            </h1>
            <p className="text-muted-foreground font-light">
              Help your provider understand your health background. All
              information is kept strictly confidential.
            </p>
          </div>

          {/* Form */}
          <div className="max-w-2xl space-y-10">
            {/* Personal Information */}
            <section>
              <h2
                className="text-lg font-light text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Personal Information
              </h2>
              <div className="h-px bg-border mb-6" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="First Name"
                  required
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="rounded-sm"
                />
                <Input
                  label="Last Name"
                  required
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="rounded-sm"
                />
                <Input
                  label="Date of Birth"
                  required
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="rounded-sm"
                />
                <div className="w-full">
                  <label className="block text-xs tracking-wider text-muted-foreground mb-2 uppercase">
                    Gender <span className="text-destructive ml-1">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-base"
                    required
                  >
                    <option value="">Select</option>
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Phone Number"
                    required
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-sm"
                  />
                </div>
              </div>
            </section>

            {/* Medical Conditions */}
            <section>
              <h2
                className="text-lg font-light text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Medical Conditions
              </h2>
              <div className="h-px bg-border mb-4" />
              <p className="text-sm text-muted-foreground font-light mb-5">
                Select any conditions you currently have or have been diagnosed
                with.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MEDICAL_CONDITIONS.map((condition) => {
                  const isSelected = selectedConditions.includes(condition);
                  return (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => toggleCondition(condition)}
                      className={`px-4 py-3 text-sm font-light rounded-sm border transition-all duration-200 text-left ${
                        isSelected
                          ? "border-brand-secondary bg-brand-secondary-muted text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/50"
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
              <h2
                className="text-lg font-light text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Current Medications
              </h2>
              <div className="h-px bg-border mb-4" />
              <p className="text-sm text-muted-foreground font-light mb-5">
                List any medications you are currently taking, including dosage
                if known.
              </p>
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="e.g., Metformin 500mg twice daily"
                    value={medicationInput}
                    onChange={(e) => setMedicationInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, addMedication)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-base"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addMedication}
                  className="rounded-sm shrink-0"
                  aria-label="Add medication"
                >
                  <Plus size={16} aria-hidden="true" />
                  Add
                </Button>
              </div>
              {medications.length > 0 && (
                <div className="space-y-2">
                  {medications.map((med) => (
                    <div
                      key={med}
                      className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-sm"
                    >
                      <span className="text-sm font-light text-foreground">
                        {med}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMedication(med)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        aria-label={`Remove ${med}`}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {medications.length === 0 && (
                <p className="text-sm text-muted-foreground/60 font-light italic">
                  No medications added yet.
                </p>
              )}
            </section>

            {/* Allergies */}
            <section>
              <h2
                className="text-lg font-light text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Allergies
              </h2>
              <div className="h-px bg-border mb-4" />
              <p className="text-sm text-muted-foreground font-light mb-5">
                List any known drug allergies or adverse reactions.
              </p>
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="e.g., Penicillin - causes rash"
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, addAllergy)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-base"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAllergy}
                  className="rounded-sm shrink-0"
                  aria-label="Add allergy"
                >
                  <Plus size={16} aria-hidden="true" />
                  Add
                </Button>
              </div>
              {allergies.length > 0 && (
                <div className="space-y-2">
                  {allergies.map((allergy) => (
                    <div
                      key={allergy}
                      className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-sm"
                    >
                      <span className="text-sm font-light text-foreground">
                        {allergy}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAllergy(allergy)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        aria-label={`Remove ${allergy}`}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {allergies.length === 0 && (
                <p className="text-sm text-muted-foreground/60 font-light italic">
                  No allergies added yet.
                </p>
              )}
            </section>

            {/* Previous Surgeries */}
            <section>
              <h2
                className="text-lg font-light text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Previous Surgeries
              </h2>
              <div className="h-px bg-border mb-4" />
              <textarea
                placeholder="Describe any previous surgeries or major procedures, including approximate dates..."
                value={surgeries}
                onChange={(e) => setSurgeries(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors min-h-[120px] resize-y text-base font-light"
              />
            </section>

            {/* Family History */}
            <section>
              <h2
                className="text-lg font-light text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Family Medical History
              </h2>
              <div className="h-px bg-border mb-4" />
              <p className="text-sm text-muted-foreground font-light mb-5">
                Select any conditions that run in your immediate family (parents,
                siblings, grandparents).
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FAMILY_CONDITIONS.map((condition) => {
                  const isSelected =
                    selectedFamilyHistory.includes(condition);
                  return (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => toggleFamilyCondition(condition)}
                      className={`px-4 py-3 text-sm font-light rounded-sm border transition-all duration-200 text-left ${
                        isSelected
                          ? "border-brand-secondary bg-brand-secondary-muted text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/50"
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
            <div className="flex justify-between pt-6 border-t border-border">
              <Link
                href="/intake"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground text-sm font-light hover:bg-muted transition-colors rounded-sm"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </Link>
              <Link
                href="/intake/symptoms"
                className="inline-flex items-center gap-2 px-8 py-3 bg-foreground text-background text-[11px] tracking-[0.15em] uppercase font-light hover:bg-foreground/90 transition-all duration-300 rounded-sm"
              >
                Continue
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
