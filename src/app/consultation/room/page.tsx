"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { getSessionCookie } from "@/lib/auth";
import {
  Mic, MicOff, Video, VideoOff,
  MessageSquare, PhoneOff, FileText, FlaskConical,
  ChevronRight, Send, Pill,
} from "lucide-react";

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/* ---------------------------------------------------------------------------
   Patient video tile (simulated remote video)
   --------------------------------------------------------------------------- */

function PatientTile({ name, initials }: { name: string; initials: string }) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 60%, #7C3AED, transparent)",
        }}
      />
      {/* Avatar */}
      <div
        className="relative w-28 h-28 rounded-full flex items-center justify-center text-3xl font-light text-white shadow-2xl"
        style={{ background: "linear-gradient(135deg, #7C3AED88, #2DD4BF88)", border: "2px solid rgba(255,255,255,0.15)" }}
      >
        {initials}
      </div>
      <p className="mt-4 text-white/70 text-sm font-light tracking-wide">{name}</p>
      {/* Mic active indicator */}
      <div className="mt-2 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-white/40 text-[11px] tracking-wide">Audio connected</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   AI sidebar tabs
   --------------------------------------------------------------------------- */

type SidebarTab = "transcript" | "patient" | "rx";

interface PatientData {
  name: string;
  initials: string;
  dob: string;
  chief: string;
  allergies: string[];
  currentMeds: string[];
}

function AiSidebar({ patient }: { patient: PatientData }) {
  const [tab, setTab] = useState<SidebarTab>("transcript");
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState<Array<{ timestamp: string; speaker: string; text: string }>>([]);
  const [chat, setChat] = useState([
    { role: "ai", text: "Session started. Ready to assist with this consultation." },
  ]);

  function sendMessage() {
    if (!message.trim()) return;
    const userMsg = message.trim();
    setMessage("");
    setChat((c) => [...c, { role: "user", text: userMsg }]);
    // Simulated AI response
    setTimeout(() => {
      setChat((c) => [...c, {
        role: "ai",
        text: "I can help you with clinical decision support. Please describe what you need assistance with.",
      }]);
    }, 800);
  }

  const tabs: { id: SidebarTab; label: string }[] = [
    { id: "transcript", label: "Transcript" },
    { id: "patient", label: "Chart" },
    { id: "rx", label: "Prescribe" },
  ];

  return (
    <aside
      className="w-80 flex flex-col border-l shrink-0"
      style={{ background: "#0e0e1a", borderColor: "rgba(255,255,255,0.08)" }}
    >
      {/* Tab bar */}
      <div className="flex border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-3 text-[11px] tracking-[0.12em] uppercase font-medium transition-colors"
            style={{
              color: tab === t.id ? "#A78BFA" : "rgba(255,255,255,0.4)",
              borderBottom: tab === t.id ? "2px solid #7C3AED" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Transcript tab */}
      {tab === "transcript" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcript.length === 0 ? (
              <p className="text-xs text-white/30 italic">Transcript will appear here as the consultation progresses.</p>
            ) : (
              transcript.map((line, i) => (
                <div key={i}>
                  <span className="text-[10px] font-mono text-white/30">{line.timestamp} · {line.speaker}</span>
                  <p className="text-sm text-white/75 font-light leading-relaxed mt-0.5">{line.text}</p>
                </div>
              ))
            )}
            <div className="flex items-center gap-2 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[11px] text-white/30 italic">Live transcribing...</span>
            </div>
          </div>

          {/* AI chat */}
          <div className="border-t p-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase mb-2">Ask AI</p>
            <div className="space-y-2 mb-2 max-h-28 overflow-y-auto">
              {chat.map((m, i) => (
                <div key={i} className={`text-xs leading-relaxed ${m.role === "ai" ? "text-violet-300/80" : "text-white/70"}`}>
                  <span className="text-[9px] uppercase tracking-widest text-white/30 mr-1">{m.role === "ai" ? "AI:" : "You:"}</span>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask anything..."
                className="flex-1 bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
              />
              <button
                onClick={sendMessage}
                className="p-1.5 rounded transition-colors hover:bg-violet-500/20"
                style={{ color: "#A78BFA" }}
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart tab */}
      {tab === "patient" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-[10px] tracking-widest text-white/40 uppercase mb-2">Patient</p>
            <p className="text-white font-medium">{patient.name}</p>
            {patient.dob && <p className="text-white/50 text-xs mt-0.5">DOB: {patient.dob}</p>}
          </div>
          {patient.chief && (
            <div>
              <p className="text-[10px] tracking-widest text-white/40 uppercase mb-2">Chief Complaint</p>
              <p className="text-white/80 text-sm">{patient.chief}</p>
            </div>
          )}
          {patient.allergies.length > 0 && (
            <div>
              <p className="text-[10px] tracking-widest text-white/40 uppercase mb-2">Allergies</p>
              <div className="flex flex-wrap gap-1.5">
                {patient.allergies.map((a) => (
                  <span key={a} className="px-2 py-0.5 text-xs rounded-full text-red-300 border border-red-500/30 bg-red-500/10">{a}</span>
                ))}
              </div>
            </div>
          )}
          {patient.currentMeds.length > 0 && (
            <div>
              <p className="text-[10px] tracking-widest text-white/40 uppercase mb-2">Current Medications</p>
              <div className="space-y-1.5">
                {patient.currentMeds.map((m) => (
                  <div key={m} className="flex items-center gap-2 text-xs text-white/70">
                    <Pill size={11} className="text-violet-400 shrink-0" />
                    {m}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="pt-2 space-y-2">
            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs text-white/70 border border-white/10 hover:bg-white/5 transition-colors">
              <span className="flex items-center gap-2"><FileText size={13} />View Full Chart</span>
              <ChevronRight size={12} />
            </button>
            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs text-white/70 border border-white/10 hover:bg-white/5 transition-colors">
              <span className="flex items-center gap-2"><FlaskConical size={13} />Order Labs</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Prescribe tab */}
      {tab === "rx" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-[10px] tracking-widest text-white/40 uppercase">Quick Prescribe</p>
          {[
            { name: "Sumatriptan", dose: "50 mg", sig: "Take 1 tablet at onset, may repeat once after 2h" },
            { name: "Ibuprofen", dose: "600 mg", sig: "Take 1 tablet every 6h with food, max 3 days" },
            { name: "Ondansetron", dose: "4 mg", sig: "Take 1 tablet every 8h as needed for nausea" },
          ].map((rx) => (
            <div key={rx.name} className="p-3 rounded-lg border border-white/10 bg-white/[0.03] space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white font-medium">{rx.name} {rx.dose}</p>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">{rx.sig}</p>
              <button
                className="mt-2 w-full py-1.5 text-[11px] tracking-wide text-white rounded transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
              >
                Send to Pharmacy
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

/* ---------------------------------------------------------------------------
   Inner page — uses useSearchParams (requires Suspense boundary)
   --------------------------------------------------------------------------- */

function ConsultationRoomInner() {
  const router = useRouter();
  const params = useSearchParams();
  const consultationId = params.get("id");

  const session = getSessionCookie();
  const memberId = session?.memberId;

  const [duration, setDuration] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Query real consultation data
  const consultation = useQuery(
    api.consultations.getById,
    consultationId ? { consultationId: consultationId as any } : "skip"
  );

  // Query patient record via consultation.patientId
  const patient = useQuery(
    api.patients.getById,
    consultation?.patientId ? { patientId: consultation.patientId } : "skip"
  );

  // Query patient member record for name
  const patientMember = useQuery(
    api.members.getByEmail,
    patient?.email ? { email: patient.email } : "skip"
  );

  // Derive display data from real records, fall back gracefully
  const patientName = patientMember?.name ?? patient?.email ?? "Patient";
  const patientInitials = patientName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "PT";

  const patientData: PatientData = {
    name: patientName,
    initials: patientInitials,
    dob: patient?.dateOfBirth ?? "",
    chief: "",
    allergies: patient?.allergies ?? [],
    currentMeds: patient?.currentMedications ?? [],
  };

  // Duration timer — start from consultation.startedAt if available
  useEffect(() => {
    const startMs = consultation?.startedAt ?? Date.now();
    const initialSecs = Math.max(0, Math.round((Date.now() - startMs) / 1000));
    setDuration(initialSecs);
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [consultation?.startedAt]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#0A0A12" }}>

      {/* Top bar */}
      <header
        className="flex items-center justify-between px-5 h-12 shrink-0 border-b"
        style={{ background: "rgba(10,10,18,0.95)", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm tracking-[0.2em] font-medium text-white uppercase">SCRIPTSXO</span>
          <span className="w-px h-4 bg-white/20" />
          <span className="text-xs font-light text-white/60">{patientName}</span>
          <span className="w-px h-4 bg-white/20" />
          <span className="flex items-center gap-1.5 text-xs font-light text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
        </div>

        <span className="font-mono text-sm text-white/60 tracking-widest tabular-nums">
          {formatDuration(duration)}
        </span>

        <button
          onClick={() => router.push("/consultation/complete")}
          className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
        >
          <PhoneOff size={12} />
          End Call
        </button>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Video panel */}
        <div className="flex-1 flex flex-col relative">

          {/* Remote video */}
          <div className="flex-1">
            <PatientTile name={patientName} initials={patientInitials} />
          </div>

          {/* Self preview */}
          <div
            className="absolute top-4 right-4 w-36 h-[100px] rounded-xl border overflow-hidden"
            style={{ background: "#141420", borderColor: "rgba(255,255,255,0.12)" }}
          >
            {cameraOn ? (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1e1e2e, #2a1a3e)" }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-light text-white"
                  style={{ background: "rgba(124,58,237,0.4)" }}>
                  DR
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <VideoOff size={18} className="text-white/20" />
              </div>
            )}
            <span
              className="absolute bottom-1.5 left-0 right-0 text-center text-[9px] text-white/40 tracking-wide"
            >
              You (Provider)
            </span>
          </div>

          {/* Controls */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-4 py-2 rounded-2xl border backdrop-blur-md"
            style={{ background: "rgba(20,20,32,0.9)", borderColor: "rgba(255,255,255,0.1)" }}
          >
            {[
              {
                active: micOn, setActive: setMicOn,
                onIcon: <Mic size={16} />, offIcon: <MicOff size={16} />, label: "Mic",
              },
              {
                active: cameraOn, setActive: setCameraOn,
                onIcon: <Video size={16} />, offIcon: <VideoOff size={16} />, label: "Camera",
              },
              {
                active: sidebarOpen, setActive: setSidebarOpen,
                onIcon: <MessageSquare size={16} />, offIcon: <MessageSquare size={16} />, label: "Panel",
              },
            ].map((ctrl) => (
              <button
                key={ctrl.label}
                onClick={() => ctrl.setActive((v: boolean) => !v)}
                aria-pressed={ctrl.active}
                aria-label={ctrl.label}
                className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all"
                style={{
                  background: ctrl.active ? "rgba(124,58,237,0.2)" : "transparent",
                  color: ctrl.active ? "#A78BFA" : "rgba(255,255,255,0.45)",
                }}
              >
                {ctrl.active ? ctrl.onIcon : ctrl.offIcon}
                <span className="text-[9px] tracking-[0.1em] uppercase">{ctrl.label}</span>
              </button>
            ))}
            <div className="w-px h-8 mx-1 bg-white/10" />
            <button
              onClick={() => router.push("/consultation/complete")}
              aria-label="End call"
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors bg-red-600/20 hover:bg-red-600/40 text-red-400"
            >
              <PhoneOff size={16} />
              <span className="text-[9px] tracking-[0.1em] uppercase">End</span>
            </button>
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && <AiSidebar patient={patientData} />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Page — Suspense boundary for useSearchParams
   --------------------------------------------------------------------------- */

export default function ConsultationRoomPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center" style={{ background: "#0A0A12" }}>
        <span className="text-white/40 text-sm font-light">Loading consultation...</span>
      </div>
    }>
      <ConsultationRoomInner />
    </Suspense>
  );
}
