"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { agentsApi } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function AIConcierge({ context }: { context?: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentRecentlyActive, setAgentRecentlyActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check for recent agent activity (within 5 minutes)
  useEffect(() => {
    agentsApi.getRuns()
      .then((runs) => {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const hasRecent = runs.some((run) => {
          const ts = run.createdAt as number | undefined;
          return ts !== undefined && ts > fiveMinutesAgo;
        });
        setAgentRecentlyActive(hasRecent);
      })
      .catch(() => {
        // Silently ignore — pulse dot stays off
      });
  }, []);

  // Seed initial greeting when opened for the first time
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `Good ${getTimeOfDay()}. I'm your ScriptsXO clinical assistant. Ask me about any case, prescription, or workflow question.`,
        },
      ]);
    }
  }, [open, messages.length]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const result = await agentsApi.chat(text, context);
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <>
      {/* Chat Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="ScriptsXO clinical assistant"
          style={{
            position: "fixed",
            bottom: "84px",
            right: "24px",
            width: "400px",
            height: "520px",
            borderRadius: "16px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #1B2A4A 0%, #0D9488 100%)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div>
              <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: 600, lineHeight: 1, margin: 0 }}>
                ScriptsXO
              </p>
              <p
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "11px",
                  marginTop: "4px",
                  lineHeight: 1,
                  margin: "4px 0 0",
                }}
              >
                Clinical Assistant &middot; Online
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "8px",
                padding: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: "#ffffff",
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "10px 14px",
                    borderRadius:
                      msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user" ? "#0D9488" : "#f1f5f9",
                    color: msg.role === "user" ? "#ffffff" : "#1B2A4A",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "14px 14px 14px 4px",
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Loader2
                    size={13}
                    style={{ color: "#64748b" }}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  <span style={{ fontSize: "13px", color: "#64748b" }}>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              padding: "12px 16px",
              display: "flex",
              gap: "8px",
              flexShrink: 0,
              background: "#ffffff",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about a case or workflow..."
              disabled={isLoading}
              aria-label="Message input"
              style={{
                flex: 1,
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "9px 12px",
                fontSize: "13px",
                color: "#1B2A4A",
                background: "#f8fafc",
                outline: "none",
              }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={isLoading || !inputValue.trim()}
              aria-label="Send message"
              style={{
                background: inputValue.trim() && !isLoading ? "#0D9488" : "#e2e8f0",
                border: "none",
                borderRadius: "8px",
                padding: "9px 12px",
                cursor: inputValue.trim() && !isLoading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                color: inputValue.trim() && !isLoading ? "#ffffff" : "#94a3b8",
                transition: "background 0.15s ease",
                flexShrink: 0,
              }}
            >
              <Send size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close ScriptsXO assistant" : "Open ScriptsXO assistant"}
        aria-expanded={open}
        className="concierge-trigger"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #0D9488, #1B2A4A)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(13, 148, 136, 0.4)",
          zIndex: 10000,
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <MessageSquare size={22} color="#ffffff" aria-hidden="true" />

        {/* Activity pulse dot */}
        {agentRecentlyActive && !open && (
          <span
            aria-label="Agents recently active"
            style={{
              position: "absolute",
              top: "3px",
              right: "3px",
              width: "11px",
              height: "11px",
              borderRadius: "50%",
              background: "#22c55e",
              border: "2px solid #ffffff",
            }}
            className="animate-ping"
          />
        )}
      </button>
    </>
  );
}
