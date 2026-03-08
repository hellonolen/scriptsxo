"use client";

import { useState, useEffect } from "react";
import { Send, Bot, MessageCircle, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";

export default function MessagesPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const session = getSessionCookie();
    if (session?.email) {
      setEmail(session.email);
    }
    setSessionChecked(true);
  }, []);

  const handleSendMessage = async () => {
    if (!email || !newMessage.trim() || sending) return;
    setSending(true);
    // Messages API not yet available in REST API — no-op with brief delay
    await new Promise((r) => setTimeout(r, 500));
    setNewMessage("");
    setSending(false);
  };

  if (!sessionChecked) {
    return (
      <AppShell>
        <div className="p-6 lg:p-10 max-w-[1400px]">
          <div className="flex items-center justify-center py-20">
            <div className="text-left">
              <Loader2 size={28} className="animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">

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

        {/* ---- EMPTY STATE ---- */}
        <div className="glass-card py-16 px-10 mb-8">
          <MessageCircle size={48} className="text-muted-foreground mb-4" />
          <h3 className="text-xl font-light text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            No Messages Yet
          </h3>
          <p className="text-sm text-muted-foreground w-full">
            No messages yet — start a conversation with your care team.
          </p>
        </div>

        {/* ---- COMPOSE ---- */}
        {email && (
          <div className="glass-card">
            <p className="eyebrow mb-4">New Message</p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Type a message to your care team..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sending}
                className="flex-1 px-4 py-3 bg-background border border-border rounded-md text-sm text-foreground font-light placeholder-muted-foreground focus:outline-none focus:border-[#7C3AED] transition-colors disabled:opacity-50"
                aria-label="Message input"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="w-11 h-11 flex items-center justify-center hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50 rounded-md"
                style={{ background: "#5B21B6" }}
                aria-label="Send message"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={16} className="text-white" />
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
