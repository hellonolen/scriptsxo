"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, Loader2 } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionCookie } from "@/lib/auth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIConciergeProps {
  context?: string;
  placeholder?: string;
  welcomeMessage?: string;
  intakeId?: string;
}

const DEFAULT_WELCOME =
  "Welcome to ScriptsXO. I\u2019m your health concierge. I can help you with prescriptions, schedule consultations, screen for medication conflicts, or guide you through your intake. How can I help you today?";

export function AIConcierge({
  placeholder = "Ask me anything about your care\u2026",
  welcomeMessage = DEFAULT_WELCOME,
  intakeId,
}: AIConciergeProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: welcomeMessage,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatAction = useAction(api.actions.aiChat.chat);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const session = getSessionCookie();
    const email = session?.email || "anonymous@scriptsxo.com";

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      // Build conversation history (exclude welcome message)
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role as string,
          content: m.content,
        }));

      const response = await chatAction({
        message: text,
        conversationHistory: history,
        patientEmail: email,
        intakeId: intakeId || undefined,
      });

      const aiResponse: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get response";

      // Fallback response if API key not configured
      if (errorMessage.includes("ANTHROPIC_API_KEY")) {
        const fallback: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "The system is being configured. Once active, I\u2019ll provide personalized guidance based on your medical history, current prescriptions, and any potential drug interactions.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, fallback]);
      } else {
        setError(errorMessage);
        const errMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "I apologize, but I\u2019m having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, messages, chatAction, intakeId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleVoice = () => {
    setIsListening((prev) => !prev);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-8 pb-6 scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] lg:max-w-[75%] ${
                msg.role === "user"
                  ? "bg-foreground text-background px-6 py-4"
                  : ""
              }`}
            >
              {msg.role === "assistant" && (
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#7C3AED] font-medium mb-2">
                  ScriptsXO
                </p>
              )}
              <p
                className={`text-[15px] leading-relaxed ${
                  msg.role === "user"
                    ? "font-light"
                    : "text-foreground font-light"
                }`}
              >
                {msg.content}
              </p>
              <p
                className={`text-[10px] mt-3 ${
                  msg.role === "user"
                    ? "text-background/40"
                    : "text-muted-foreground"
                }`}
              >
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#7C3AED] font-medium mb-2">
              ScriptsXO
            </p>
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="text-[#7C3AED] animate-spin" />
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive/70">{error}</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border pt-5 mt-auto">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleVoice}
            className={`p-3 transition-colors ${
              isListening
                ? "text-[#7C3AED] bg-[#7C3AED]/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? (
              <MicOff size={18} aria-hidden="true" />
            ) : (
              <Mic size={18} aria-hidden="true" />
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isTyping}
            className="flex-1 bg-transparent border-0 text-foreground placeholder-muted-foreground text-[15px] font-light focus:outline-none disabled:opacity-50"
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="p-3 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            aria-label="Send message"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
