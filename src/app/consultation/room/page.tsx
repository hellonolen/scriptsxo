"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MessageSquare,
  User,
  PhoneOff,
} from "lucide-react";

/* ---------------------------------------------------------------------------
   Constants
   --------------------------------------------------------------------------- */

const DEMO_TRANSCRIPT = [
  { timestamp: "00:23", speaker: "Provider", text: "Good morning, how are you feeling today?" },
  { timestamp: "00:31", speaker: "Client", text: "I've had a persistent headache for 3 days..." },
  { timestamp: "00:45", speaker: "Provider", text: "Any fever or sensitivity to light?" },
] as const;

const AI_SUGGESTIONS = ["Check drug interactions", "Lookup: Ibuprofen dosing"] as const;

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/* ---------------------------------------------------------------------------
   Control button
   --------------------------------------------------------------------------- */

interface ControlButtonProps {
  active: boolean;
  onClick: () => void;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  label: string;
  disabled?: boolean;
  title?: string;
}

function ControlButton({
  active,
  onClick,
  activeIcon,
  inactiveIcon,
  label,
  disabled = false,
  title,
}: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      aria-pressed={active}
      className={[
        "flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg transition-all duration-200",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-white/10 cursor-pointer",
        !active && !disabled
          ? "text-red-400"
          : "text-white",
      ].join(" ")}
    >
      <span className="w-5 h-5 flex items-center justify-center">
        {active ? activeIcon : inactiveIcon}
      </span>
      <span className="text-[10px] tracking-[0.1em] uppercase font-light">{label}</span>
    </button>
  );
}

/* ---------------------------------------------------------------------------
   AI sidebar
   --------------------------------------------------------------------------- */

function AiSidebar() {
  return (
    <aside
      className="w-80 flex flex-col border-l shrink-0"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {/* Live Transcript */}
      <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
        <p className="eyebrow mb-3">LIVE TRANSCRIPT</p>
        <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
          {DEMO_TRANSCRIPT.map((line, i) => (
            <div key={i} className="space-y-0.5">
              <span className="text-[10px] font-mono text-muted-foreground">
                {line.timestamp} — {line.speaker}
              </span>
              <p className="text-sm font-light text-foreground leading-relaxed">
                {line.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Assist */}
      <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
        <p className="eyebrow mb-3">AI ASSIST</p>
        <div className="flex flex-wrap gap-2">
          {AI_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              className="px-3 py-1.5 text-xs font-light rounded-full border transition-colors hover:bg-[#7C3AED]/10"
              style={{
                borderColor: "#7C3AED",
                color: "#7C3AED",
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 space-y-2 mt-auto">
        <p className="eyebrow mb-3">QUICK ACTIONS</p>
        <button
          onClick={() => {}}
          className="w-full px-4 py-2.5 text-sm font-light text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
        >
          Send Rx to Pharmacy
        </button>
        <button
          onClick={() => {}}
          className="w-full px-4 py-2.5 text-sm font-light rounded-lg border transition-colors hover:bg-foreground/5"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          Request Lab Work
        </button>
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------------------------
   Page
   --------------------------------------------------------------------------- */

export default function ConsultationRoomPage() {
  const router = useRouter();
  const [duration, setDuration] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "#0A0A12", color: "var(--foreground)" }}
    >
      {/* ---- Top bar ---- */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0 border-b"
        style={{ background: "rgba(10,10,18,0.95)", borderColor: "rgba(255,255,255,0.08)" }}
      >
        {/* Left: logo */}
        <div className="flex items-center gap-3">
          <span
            className="text-sm tracking-[0.2em] font-light text-white uppercase"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            SCRIPTSXO
          </span>
          <span className="w-px h-4 bg-white/20" />
          <span className="flex items-center gap-1.5 text-xs font-light text-white/70">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </span>
        </div>

        {/* Center: timer */}
        <span
          className="font-mono text-sm text-white/80 tracking-widest tabular-nums"
          aria-label={`Call duration: ${formatDuration(duration)}`}
        >
          {formatDuration(duration)}
        </span>

        {/* Right: end call */}
        <button
          onClick={() => router.push("/consultation/complete")}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-light text-white rounded-lg transition-colors bg-red-600 hover:bg-red-700"
          aria-label="End call"
        >
          <PhoneOff size={13} aria-hidden="true" />
          End Call
        </button>
      </header>

      {/* ---- Main area ---- */}
      <div className="flex flex-1 overflow-hidden">

        {/* ---- Video panel ---- */}
        <div className="flex-1 flex flex-col relative" style={{ background: "#0A0A12" }}>

          {/* Remote video placeholder */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <Video
              size={48}
              className="text-white"
              style={{ opacity: 0.18 }}
              aria-hidden="true"
            />
            <p className="text-white/30 text-sm font-light mt-3 tracking-wide">
              Waiting for video connection...
            </p>
          </div>

          {/* Local camera preview */}
          <div
            className="absolute bottom-20 left-4 w-40 h-[120px] rounded-lg border flex flex-col items-center justify-center"
            style={{
              background: "#141420",
              borderColor: "rgba(255,255,255,0.12)",
            }}
            aria-label="Local camera preview"
          >
            <User size={22} className="text-white/20" aria-hidden="true" />
            <span className="text-white/25 text-[10px] mt-1.5 tracking-wide">You</span>
          </div>

          {/* Controls bar */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-4 py-2 rounded-xl border backdrop-blur-md"
            style={{
              background: "rgba(20,20,32,0.85)",
              borderColor: "rgba(255,255,255,0.12)",
            }}
            role="toolbar"
            aria-label="Call controls"
          >
            <ControlButton
              active={micOn}
              onClick={() => setMicOn((v) => !v)}
              activeIcon={<Mic size={18} />}
              inactiveIcon={<MicOff size={18} />}
              label="Mic"
            />
            <ControlButton
              active={cameraOn}
              onClick={() => setCameraOn((v) => !v)}
              activeIcon={<Video size={18} />}
              inactiveIcon={<VideoOff size={18} />}
              label="Camera"
            />
            <ControlButton
              active={false}
              onClick={() => {}}
              activeIcon={<Monitor size={18} />}
              inactiveIcon={<Monitor size={18} />}
              label="Share"
              disabled
              title="Coming soon"
            />
            <ControlButton
              active={sidebarOpen}
              onClick={() => setSidebarOpen((v) => !v)}
              activeIcon={<MessageSquare size={18} />}
              inactiveIcon={<MessageSquare size={18} />}
              label="Chat"
            />
          </div>
        </div>

        {/* ---- AI sidebar ---- */}
        {sidebarOpen && <AiSidebar />}
      </div>
    </div>
  );
}
