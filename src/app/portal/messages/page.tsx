"use client";

import { Send, Bot, Shield, FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";

/* ---------------------------------------------------------------------------
   DATA
   --------------------------------------------------------------------------- */

const THREADS = [
  {
    sender: "ScriptsXO AI Concierge",
    icon: Bot,
    preview:
      "Your prescription for Tretinoin Cream has been filled and is ready for delivery via Alto Pharmacy. Expected arrival within 2 business days.",
    time: "2d ago",
    unread: true,
  },
  {
    sender: "Compliance Agent",
    icon: Shield,
    preview:
      "Identity verification complete. Your profile is now active and you are cleared to receive AI-screened prescriptions.",
    time: "5d ago",
    unread: false,
  },
  {
    sender: "Intake Agent",
    icon: FileText,
    preview:
      "Welcome to ScriptsXO. Your medical history has been recorded and securely stored. An AI screening will begin shortly.",
    time: "1w ago",
    unread: false,
  },
] as const;

/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

export default function MessagesPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1100px]">

        {/* ---- HEADER ---- */}
        <header className="mb-10">
          <p className="eyebrow mb-2">Communication</p>
          <h1
            className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Secure <span className="text-[#7C3AED]">Messages</span>
          </h1>
        </header>

        {/* ---- THREADS ---- */}
        <div className="glass-card p-0 divide-y divide-border mb-8">
          {THREADS.map((thread) => (
            <div
              key={thread.sender}
              className="flex items-start gap-5 px-6 py-5 hover:bg-muted/30 transition-colors cursor-pointer group"
            >
              {/* Icon */}
              <div className="w-10 h-10 flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(124, 58, 237, 0.08)" }}>
                <thread.icon size={16} className="text-[#7C3AED]" aria-hidden="true" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-[14px] font-medium text-foreground">
                    {thread.sender}
                  </p>
                  {thread.unread && (
                    <span className="w-2 h-2 bg-[#7C3AED] rounded-full shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-light leading-relaxed line-clamp-2">
                  {thread.preview}
                </p>
              </div>

              {/* Time */}
              <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground shrink-0 mt-1">
                {thread.time}
              </span>
            </div>
          ))}
        </div>

        {/* ---- COMPOSE ---- */}
        <div className="glass-card">
          <p className="eyebrow mb-4">New Message</p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Type a message to your care team..."
              className="flex-1 px-4 py-3 bg-background border border-border text-sm text-foreground font-light placeholder-muted-foreground focus:outline-none focus:border-[#7C3AED] transition-colors"
              aria-label="Message input"
            />
            <button
              className="w-11 h-11 flex items-center justify-center hover:opacity-90 transition-opacity shrink-0"
              style={{ background: "linear-gradient(135deg, #7C3AED, #E11D48)" }}
              aria-label="Send message"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
