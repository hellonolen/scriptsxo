"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Heart,
  Stethoscope,
  ScanLine,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  Upload,
  ShieldCheck,
  X,
  FileImage,
} from "lucide-react";
import { Nav } from "@/components/nav";

const INTAKE_STEPS = [
  { label: "Medical History", icon: Heart },
  { label: "Symptoms", icon: Stethoscope },
  { label: "Verification", icon: ScanLine },
  { label: "Review", icon: FileCheck },
] as const;

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface FilePreview {
  name: string;
  size: string;
  type: string;
  url: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createPreview(file: File): FilePreview {
  return {
    name: file.name,
    size: formatFileSize(file.size),
    type: file.type,
    url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
  };
}

export default function IDVerificationPage() {
  const [idFront, setIdFront] = useState<FilePreview | null>(null);
  const [idBack, setIdBack] = useState<FilePreview | null>(null);
  const [insurance, setInsurance] = useState<FilePreview | null>(null);
  const [consent, setConsent] = useState(false);

  const [dragOverFront, setDragOverFront] = useState(false);
  const [dragOverBack, setDragOverBack] = useState(false);
  const [dragOverInsurance, setDragOverInsurance] = useState(false);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const insuranceRef = useRef<HTMLInputElement>(null);

  const currentStep = 2;

  const handleFile = useCallback(
    (
      file: File,
      setter: (preview: FilePreview | null) => void
    ) => {
      if (!ACCEPTED_TYPES.includes(file.type)) return;
      if (file.size > MAX_FILE_SIZE) return;
      setter(createPreview(file));
    },
    []
  );

  function handleDrop(
    event: React.DragEvent,
    setter: (preview: FilePreview | null) => void,
    dragSetter: (v: boolean) => void
  ) {
    event.preventDefault();
    dragSetter(false);
    const file = event.dataTransfer.files[0];
    if (file) handleFile(file, setter);
  }

  function handleDragOver(
    event: React.DragEvent,
    dragSetter: (v: boolean) => void
  ) {
    event.preventDefault();
    dragSetter(true);
  }

  function handleDragLeave(dragSetter: (v: boolean) => void) {
    dragSetter(false);
  }

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement>,
    setter: (preview: FilePreview | null) => void
  ) {
    const file = event.target.files?.[0];
    if (file) handleFile(file, setter);
  }

  function clearFile(
    setter: (preview: FilePreview | null) => void,
    ref: React.RefObject<HTMLInputElement | null>
  ) {
    setter(null);
    if (ref.current) ref.current.value = "";
  }

  function renderUploadZone(
    label: string,
    description: string,
    preview: FilePreview | null,
    setter: (v: FilePreview | null) => void,
    ref: React.RefObject<HTMLInputElement | null>,
    isDragOver: boolean,
    dragSetter: (v: boolean) => void,
    isRequired: boolean
  ) {
    return (
      <div>
        <label className="block text-xs tracking-wider text-muted-foreground mb-3 uppercase">
          {label}
          {isRequired && <span className="text-destructive ml-1">*</span>}
          {!isRequired && (
            <span className="text-muted-foreground/60 ml-1 normal-case tracking-normal">
              (optional)
            </span>
          )}
        </label>

        {preview ? (
          <div className="border border-border rounded-sm p-5 bg-card">
            <div className="flex items-start gap-4">
              {preview.url ? (
                <div className="w-20 h-14 rounded-sm overflow-hidden bg-muted flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.url}
                    alt={`Preview of ${preview.name}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-14 rounded-sm bg-muted flex items-center justify-center flex-shrink-0">
                  <FileImage
                    size={20}
                    className="text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-light text-foreground truncate">
                  {preview.name}
                </p>
                <p className="text-xs text-muted-foreground font-light mt-1">
                  {preview.size}
                </p>
              </div>
              <button
                type="button"
                onClick={() => clearFile(setter, ref)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 flex-shrink-0"
                aria-label={`Remove ${preview.name}`}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onDrop={(e) => handleDrop(e, setter, dragSetter)}
            onDragOver={(e) => handleDragOver(e, dragSetter)}
            onDragLeave={() => handleDragLeave(dragSetter)}
            className={`border-2 border-dashed rounded-sm p-8 text-center transition-all duration-200 cursor-pointer ${
              isDragOver
                ? "border-brand-secondary bg-brand-secondary-muted"
                : "border-border hover:border-muted-foreground/30"
            }`}
            onClick={() => ref.current?.click()}
            role="button"
            tabIndex={0}
            aria-label={`Upload ${label}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                ref.current?.click();
              }
            }}
          >
            <Upload
              size={20}
              className="mx-auto mb-3 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm font-light text-foreground mb-1">
              {description}
            </p>
            <p className="text-xs text-muted-foreground font-light">
              Drag and drop or click to browse. JPEG, PNG, or PDF up to 10MB.
            </p>
            <input
              ref={ref}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => handleInputChange(e, setter)}
              className="hidden"
              aria-label={label}
            />
          </div>
        )}
      </div>
    );
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
                Step 3 of 4
              </span>
            </div>
            <div className="w-full h-px bg-border relative">
              <div
                className="absolute top-0 left-0 h-px bg-brand-secondary transition-all duration-500"
                style={{ width: "75%" }}
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
              Identity Verification
            </h1>
            <p className="text-muted-foreground font-light">
              Upload a government-issued photo ID. This is required for
              telehealth prescriptions to comply with federal and state
              regulations.
            </p>
          </div>

          {/* Upload zones */}
          <div className="max-w-2xl space-y-10">
            {/* Government ID */}
            <section>
              <h2
                className="text-lg font-light text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Government-Issued ID
              </h2>
              <div className="h-px bg-border mb-6" />
              <div className="space-y-5">
                {renderUploadZone(
                  "ID Front",
                  "Upload the front of your driver's license, state ID, or passport",
                  idFront,
                  setIdFront,
                  frontRef,
                  dragOverFront,
                  setDragOverFront,
                  true
                )}
                {renderUploadZone(
                  "ID Back",
                  "Upload the back of your ID (not required for passports)",
                  idBack,
                  setIdBack,
                  backRef,
                  dragOverBack,
                  setDragOverBack,
                  true
                )}
              </div>
            </section>

            {/* Insurance Card */}
            <section>
              <h2
                className="text-lg font-light text-foreground mb-1"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Insurance Card
              </h2>
              <div className="h-px bg-border mb-6" />
              {renderUploadZone(
                "Insurance Card",
                "Upload a photo of your insurance card (front preferred)",
                insurance,
                setInsurance,
                insuranceRef,
                dragOverInsurance,
                setDragOverInsurance,
                false
              )}
            </section>

            {/* Security note */}
            <div className="flex items-start gap-4 p-5 bg-card border border-border rounded-sm">
              <ShieldCheck
                size={18}
                className="text-brand-secondary mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-light text-foreground">
                  Your documents are encrypted and HIPAA-compliant
                </p>
                <p className="text-xs text-muted-foreground font-light mt-1">
                  All uploads are transmitted over TLS encryption and stored in
                  HIPAA-compliant infrastructure. Your ID is only used for identity
                  verification and is never shared with third parties.
                </p>
              </div>
            </div>

            {/* Consent */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="id-consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded-sm border-border text-primary focus:ring-primary accent-brand-secondary"
              />
              <label
                htmlFor="id-consent"
                className="text-sm text-muted-foreground font-light leading-relaxed cursor-pointer"
              >
                I confirm that the uploaded documents are authentic and belong to
                me. I consent to ScriptsXO verifying my identity for the purpose
                of telehealth consultation and prescription services.
              </label>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-border">
              <Link
                href="/intake/symptoms"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground text-sm font-light hover:bg-muted transition-colors rounded-sm"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </Link>
              <Link
                href="/intake/review"
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
