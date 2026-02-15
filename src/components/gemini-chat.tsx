"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, Send, X, Loader2, Minimize2 } from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionCookie } from "@/lib/auth";
import type { Id } from "../../convex/_generated/dataModel";

/* ---------------------------------------------------------------------------
   PAGE CONTEXT MAP
   Maps route paths to human-readable context for Gemini
   --------------------------------------------------------------------------- */

function getPageContext(pathname: string): string {
  if (pathname === "/portal") return "Client Dashboard — viewing their overview, prescriptions, and recent activity";
  if (pathname.startsWith("/portal/prescriptions")) return "Prescriptions — viewing their active and past prescriptions";
  if (pathname.startsWith("/portal/messages")) return "Messages — reading or sending messages to their care team";
  if (pathname.startsWith("/portal/appointments")) return "Appointments — viewing scheduled and past consultations";
  if (pathname.startsWith("/portal/billing")) return "Billing — reviewing payment history and membership status";
  if (pathname === "/consultation") return "Concierge — main consultation and chat interface";
  if (pathname === "/intake") return "Intake landing — choosing to start a new intake";
  if (pathname.startsWith("/intake/payment")) return "Intake Payment — completing their membership payment";
  if (pathname.startsWith("/intake/medical-history")) return "Intake Medical History — filling out medical conditions, medications, allergies";
  if (pathname.startsWith("/intake/symptoms")) return "Intake Symptoms — describing their symptoms and medication request";
  if (pathname.startsWith("/intake/id-verification")) return "Intake ID Verification — uploading government ID and previous prescriptions";
  if (pathname.startsWith("/intake/review")) return "Intake Review — reviewing all submitted information before final submission";
  if (pathname === "/start") return "Guided Intake — chat-driven onboarding flow";
  if (pathname.startsWith("/admin")) return "Admin Panel — managing providers, prescriptions, and system settings";
  if (pathname.startsWith("/provider")) return "Provider Portal — reviewing patients, consultations, and prescribing";
  return `Browsing ${pathname}`;
}

/* ---------------------------------------------------------------------------
   COMPONENT
   --------------------------------------------------------------------------- */

export function GeminiChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<
    { role: string; content: string; page?: string }[]
  >([]);
  const [conversationId, setConversationId] = useState<Id<"aiConversations"> | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convex hooks
  const aiChat = useAction(api.actions.aiChat.chat);
  const getOrCreate = useMutation(api.aiConversations.getOrCreate);
  const addMessage = useMutation(api.aiConversations.addMessage);
  const updatePageContext = useMutation(api.aiConversations.updatePageContext);

  // Load conversation from Convex
  const conversation = useQuery(
    api.aiConversations.getByEmail,
    userEmail ? { email: userEmail } : "skip"
  );

  // Initialize session + conversation
  useEffect(() => {
    const session = getSessionCookie();
    if (session?.email) {
      setUserEmail(session.email);
    }
  }, []);

  // Create or load conversation when email is available
  useEffect(() => {
    if (!userEmail) return;
    getOrCreate({ email: userEmail }).then((id) => {
      setConversationId(id);
    });
  }, [userEmail]);

  // Sync Convex messages to local state
  useEffect(() => {
    if (conversation?.messages) {
      setLocalMessages(
        conversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
          page: m.page,
        }))
      );
    }
  }, [conversation?.messages]);

  // Update page context in Convex when navigating
  useEffect(() => {
    if (conversationId && pathname) {
      updatePageContext({ conversationId, page: pathname });
    }
  }, [conversationId, pathname]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [localMessages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue("");

    // Add user message locally + to Convex
    const userMsg = { role: "user", content: message, page: pathname };
    setLocalMessages((prev) => [...prev, userMsg]);

    if (conversationId) {
      addMessage({
        conversationId,
        role: "user",
        content: message,
        page: pathname,
      });
    }

    setIsLoading(true);

    try {
      const pageContext = getPageContext(pathname);
      const contextHint = `The client is currently on: ${pageContext}. Answer their question helpfully. If they're asking about something on this page, guide them. Keep responses concise (2-3 sentences).`;

      // Build conversation history from recent messages
      const recentHistory = localMessages.slice(-16).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await aiChat({
        message: `[Page: ${pathname}] ${message}`,
        conversationHistory: recentHistory,
        patientEmail: userEmail || "anonymous",
      });

      const assistantMsg = {
        role: "assistant",
        content: result.content,
        page: pathname,
      };
      setLocalMessages((prev) => [...prev, assistantMsg]);

      if (conversationId) {
        addMessage({
          conversationId,
          role: "assistant",
          content: result.content,
          page: pathname,
        });
      }
    } catch {
      const errorMsg = {
        role: "assistant",
        content: "I wasn't able to process that right now. Please try again in a moment.",
        page: pathname,
      };
      setLocalMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, conversationId, pathname, userEmail, localMessages]);

  // Don't render on /start page (it has its own integrated chat)
  if (pathname === "/start") return null;

  // Don't render if no user session
  if (!userEmail) return null;

  return (
    <>
      {/* Floating chat bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #7C3AED, #2DD4BF)",
          }}
          aria-label="Open chat"
        >
          <MessageSquare className="w-6 h-6 text-white" />
          {localMessages.length > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: "#7C3AED" }}
              />
            </div>
          )}
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border bg-background">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{
              background: "linear-gradient(135deg, #5B21B6, #1E1037)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">ScriptsXO</p>
                <p className="text-[10px] text-white/60">
                  {getPageContext(pathname).split(" — ")[0]}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close chat"
            >
              <Minimize2 className="w-4 h-4 text-white/70" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[300px] max-h-[420px]">
            {localMessages.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-light">
                  Ask me anything about your health, medications, or how to navigate ScriptsXO.
                </p>
              </div>
            )}

            {localMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-[#7C3AED] text-white rounded-br-md"
                      : "bg-muted/50 text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.role !== "user" && (
                    <p className="text-[9px] tracking-[0.15em] uppercase text-[#7C3AED] font-medium mb-1">
                      ScriptsXO
                    </p>
                  )}
                  <p className="text-[13px] font-light leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]/40 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]/40 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]/40 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask anything..."
                className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="h-10 w-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ background: "#7C3AED" }}
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
