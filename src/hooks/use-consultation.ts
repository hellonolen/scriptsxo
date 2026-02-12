"use client";

import { useState } from "react";

interface ConsultationState {
  status: "idle" | "waiting" | "connecting" | "active" | "ended";
  roomUrl: string | null;
  duration: number;
}

export function useConsultation() {
  const [state, setState] = useState<ConsultationState>({
    status: "idle",
    roomUrl: null,
    duration: 0,
  });

  const joinWaitingRoom = () =>
    setState((prev) => ({ ...prev, status: "waiting" }));

  const startConsultation = (roomUrl: string) =>
    setState((prev) => ({ ...prev, status: "active", roomUrl }));

  const endConsultation = () =>
    setState((prev) => ({ ...prev, status: "ended", roomUrl: null }));

  return { ...state, joinWaitingRoom, startConsultation, endConsultation };
}
