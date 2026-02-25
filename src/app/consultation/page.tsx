"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Video, Phone, Clock, Shield } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";

/* ---------------------------------------------------------------------------
   CONSULTATION LANDING — Entry point for booking a consultation
   --------------------------------------------------------------------------- */

export default function ConsultationPage() {
  const router = useRouter();
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [_email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const session = getSessionCookie();
    if (session?.email) {
      setEmail(session.email);
    }
  }, []);

  function handleJoinQueue(path: string) {
    if (!chiefComplaint.trim()) return;
    router.push(path);
  }

  const complaintFilled = chiefComplaint.trim().length > 0;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[900px]">
        <header className="mb-10">
          <p className="eyebrow mb-2">CONSULTATIONS</p>
          <h1
            className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Request a{" "}
            <span className="gradient-text">Consultation</span>
          </h1>
          <p className="text-muted-foreground font-light mt-3 max-w-lg">
            Connect with a board-certified physician for a private telehealth
            consultation. Available same-day or by appointment.
          </p>
        </header>

        {/* Chief Complaint */}
        <div className="glass-card mb-6" style={{ padding: "24px" }}>
          <label
            htmlFor="chief-complaint"
            className="block text-xs font-medium text-muted-foreground mb-2"
          >
            What brings you in today?
          </label>
          <textarea
            id="chief-complaint"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="Describe your reason for visit..."
            required
            rows={4}
            className="w-full border border-border bg-background rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none transition-colors"
          />
          {!complaintFilled && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Required before joining the queue.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Video Consultation Card */}
          <div className="glass-card glow-accent flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(124, 58, 237, 0.08)" }}
              >
                <Video size={20} style={{ color: "#7C3AED" }} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-foreground">Video Visit</h2>
                <p className="text-xs text-muted-foreground">Face-to-face with your provider</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
              <span className="flex items-center gap-1.5">
                <Clock size={12} aria-hidden="true" /> 15 min
              </span>
              <span className="flex items-center gap-1.5">
                <Shield size={12} aria-hidden="true" /> HIPAA Encrypted
              </span>
            </div>
            <div className="mt-auto">
              <button
                onClick={() => handleJoinQueue("/consultation/waiting-room")}
                disabled={!complaintFilled}
                className="w-full px-4 py-3 text-white text-sm font-medium rounded-lg transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
              >
                Join Queue — Video
              </button>
            </div>
          </div>

          {/* Nurse Call Card */}
          <div className="glass-card flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(45, 212, 191, 0.08)" }}
              >
                <Phone size={20} style={{ color: "#14B8A6" }} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-foreground">Nurse Call</h2>
                <p className="text-xs text-muted-foreground">Quick same-day nurse callback</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
              <span className="flex items-center gap-1.5">
                <Clock size={12} aria-hidden="true" /> 10 min
              </span>
              <span className="flex items-center gap-1.5">
                <Shield size={12} aria-hidden="true" /> Secure Line
              </span>
            </div>
            <div className="mt-auto">
              <button
                onClick={() => handleJoinQueue("/dashboard/office-hours")}
                disabled={!complaintFilled}
                className="w-full px-4 py-3 text-sm font-medium rounded-lg border border-border text-foreground bg-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/30"
              >
                Schedule Nurse Call
              </button>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="flex items-center justify-center gap-8 text-[10px] tracking-[0.25em] text-muted-foreground uppercase font-light pt-4">
          <span>Board Certified</span>
          <span className="w-5 h-px bg-border" />
          <span>Same-Day</span>
          <span className="w-5 h-px bg-border" />
          <span>HIPAA Encrypted</span>
        </div>
      </div>
    </AppShell>
  );
}
