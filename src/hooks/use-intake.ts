"use client";

import { useState } from "react";

const INTAKE_STEPS = [
  "medical-history",
  "symptoms",
  "id-verification",
  "review",
] as const;

type IntakeStep = (typeof INTAKE_STEPS)[number];

interface IntakeState {
  currentStep: IntakeStep;
  completedSteps: IntakeStep[];
  data: Record<string, unknown>;
}

export function useIntake() {
  const [state, setState] = useState<IntakeState>({
    currentStep: "medical-history",
    completedSteps: [],
    data: {},
  });

  const nextStep = () => {
    const idx = INTAKE_STEPS.indexOf(state.currentStep);
    if (idx < INTAKE_STEPS.length - 1) {
      setState((prev) => ({
        ...prev,
        completedSteps: [...prev.completedSteps, prev.currentStep],
        currentStep: INTAKE_STEPS[idx + 1],
      }));
    }
  };

  const prevStep = () => {
    const idx = INTAKE_STEPS.indexOf(state.currentStep);
    if (idx > 0) {
      setState((prev) => ({
        ...prev,
        currentStep: INTAKE_STEPS[idx - 1],
      }));
    }
  };

  const updateData = (key: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, [key]: value },
    }));
  };

  return { ...state, steps: INTAKE_STEPS, nextStep, prevStep, updateData };
}
