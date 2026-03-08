"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ShieldCheck } from "lucide-react";
import { getSessionCookie } from "@/lib/auth";
import { members } from "@/lib/api";

const STEPS = [
  { id: 1, label: "Symptoms" },
  { id: 2, label: "History" },
  { id: 3, label: "Verify" },
  { id: 4, label: "Payment" },
  { id: 5, label: "Review" },
];

const MEDICAL_CONDITIONS = [
  "Diabetes", "Hypertension", "Heart Disease", "Asthma", "COPD",
  "Thyroid Disorder", "Arthritis", "Depression", "Anxiety",
  "High Cholesterol", "Kidney Disease", "Liver Disease",
] as const;

const FAMILY_CONDITIONS = [
  "Heart Disease", "Diabetes", "Cancer", "Stroke",
  "High Blood Pressure", "Mental Health Conditions",
  "Autoimmune Disorders", "Kidney Disease",
] as const;

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"] as const;

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
  const [selectedFamilyHistory, setSelectedFamilyHistory] = useState<string[]>([]);

  const currentStep = 2;
  const pct = (currentStep / STEPS.length) * 100;

  useEffect(() => {
    const session = getSessionCookie();
    if (!session?.email) { router.push("/access"); return; }

    // Restore previous step data if available
    const stored = localStorage.getItem("sxo_medical_history");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
        if (data.dob) setDateOfBirth(data.dob);
        if (data.gender) setGender(data.gender);
        if (data.phone) setPhone(data.phone);
        if (data.conditions) setSelectedConditions(data.conditions);
        if (data.medications) setMedications(data.medications);
        if (data.allergies) setAllergies(data.allergies);
        if (data.surgeries) setSurgeries(data.surgeries);
        if (data.familyHistory) setSelectedFamilyHistory(data.familyHistory);
      } catch {
        // Ignore malformed stored data
      }
    }

    // Ensure member exists
    members.getOrCreate(session.email).catch(() => {});
  }, [router]);

  function toggleCondition(c: string) {
    setSelectedConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }
  function toggleFamily(c: string) {
    setSelectedFamilyHistory(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }
  function addMedication() {
    const t = medicationInput.trim();
    if (t && !medications.includes(t)) { setMedications(prev => [...prev, t]); setMedicationInput(""); }
  }
  function addAllergy() {
    const t = allergyInput.trim();
    if (t && !allergies.includes(t)) { setAllergies(prev => [...prev, t]); setAllergyInput(""); }
  }

  const canContinue = firstName.trim() && lastName.trim() && dateOfBirth && gender && phone.trim();

  async function handleContinue() {
    if (!canContinue) return;
    const data = {
      firstName, lastName, dob: dateOfBirth, gender, phone,
      conditions: selectedConditions, medications, allergies,
      surgeries, familyHistory: selectedFamilyHistory,
    };
    // Persist locally for review page
    localStorage.setItem("sxo_medical_history", JSON.stringify(data));
    router.push("/intake/id-verification");
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
            <div className="mb-7">
              <h1 className="text-xl font-medium text-foreground mb-1.5 tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                Medical History
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Help your provider understand your health background. All information is kept strictly confidential.
              </p>
            </div>

            {/* Personal Info */}
            <div className="mb-6">
              <p className="eyebrow text-brand-secondary mb-4">Personal Information</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label form-label-required">First Name</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors" />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-required">Last Name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label form-label-required">Date of Birth</label>
                  <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors" />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-required">Gender</label>
                  <div className="relative">
                    <select value={gender} onChange={e => setGender(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors">
                      <option value="" disabled>Select</option>
                      {GENDER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors" />
              </div>
            </div>

            {/* Medical Conditions */}
            <div className="mb-6">
              <p className="eyebrow text-brand-secondary mb-3">Medical Conditions</p>
              <p className="form-description mb-3">Select any you currently have.</p>
              <div className="flex flex-wrap gap-2">
                {MEDICAL_CONDITIONS.map(c => {
                  const sel = selectedConditions.includes(c);
                  return (
                    <button key={c} type="button" onClick={() => toggleCondition(c)}
                      className={["px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150", sel ? "bg-brand-secondary/10 border-brand-secondary text-brand-secondary" : "bg-background border-input text-muted-foreground hover:border-brand-secondary/40"].join(" ")}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Medications */}
            <div className="mb-6">
              <p className="eyebrow text-brand-secondary mb-3">Current Medications</p>
              <p className="form-description mb-3">Include dosage if known.</p>
              <div className="flex gap-2 mb-3">
                <input value={medicationInput} onChange={e => setMedicationInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addMedication())}
                  placeholder="e.g., Metformin 500mg twice daily"
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors" />
                <button type="button" onClick={addMedication}
                  className="px-3 py-2.5 rounded-xl border border-input bg-background text-muted-foreground hover:text-foreground hover:border-brand-secondary/40 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {medications.map(m => (
                <div key={m} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 mb-1.5">
                  <span className="text-sm text-foreground">{m}</span>
                  <button onClick={() => setMedications(prev => prev.filter(x => x !== m))} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Allergies */}
            <div className="mb-6">
              <p className="eyebrow text-brand-secondary mb-3">Allergies</p>
              <p className="form-description mb-3">Drug or food allergies.</p>
              <div className="flex gap-2 mb-3">
                <input value={allergyInput} onChange={e => setAllergyInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addAllergy())}
                  placeholder="e.g., Penicillin — causes rash"
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors" />
                <button type="button" onClick={addAllergy}
                  className="px-3 py-2.5 rounded-xl border border-input bg-background text-muted-foreground hover:text-foreground hover:border-brand-secondary/40 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {allergies.map(a => (
                <div key={a} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 mb-1.5">
                  <span className="text-sm text-foreground">{a}</span>
                  <button onClick={() => setAllergies(prev => prev.filter(x => x !== a))} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Surgeries */}
            <div className="form-group mb-6">
              <p className="eyebrow text-brand-secondary mb-3">Previous Surgeries</p>
              <p className="form-description mb-2">Include dates if known.</p>
              <textarea value={surgeries} onChange={e => setSurgeries(e.target.value)}
                placeholder="Describe any previous surgeries or major procedures..."
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-y focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors" />
            </div>

            {/* Family History */}
            <div>
              <p className="eyebrow text-brand-secondary mb-3">Family Medical History</p>
              <p className="form-description mb-3">Conditions in your immediate family.</p>
              <div className="flex flex-wrap gap-2">
                {FAMILY_CONDITIONS.map(c => {
                  const sel = selectedFamilyHistory.includes(c);
                  return (
                    <button key={c} type="button" onClick={() => toggleFamily(c)}
                      className={["px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150", sel ? "bg-brand-secondary/10 border-brand-secondary text-brand-secondary" : "bg-background border-input text-muted-foreground hover:border-brand-secondary/40"].join(" ")}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button onClick={handleContinue} disabled={!canContinue}
            className={["btn-gradient w-full py-3.5 text-sm font-medium relative z-10", !canContinue && "opacity-40 cursor-not-allowed"].join(" ")}>
            Continue to ID Verification
          </button>

          <p className="text-center mt-5 text-[11px] text-muted-foreground leading-relaxed">
            Your information is protected under HIPAA and encrypted in transit.
          </p>
        </div>
      </main>
    </div>
  );
}
