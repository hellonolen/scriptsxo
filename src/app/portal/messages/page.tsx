"use client";

import { useState, useEffect } from "react";
import { Send, Bot, MessageCircle, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

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

  const conversations = useQuery(
    api.messages.getConversations,
    email ? { email } : "skip"
  );

  const sendMessage = useMutation(api.messages.send);

  const handleSendMessage = async () => {
    if (!email || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage({
        conversationId: `${email}-support`,
        senderEmail: email,
        senderRole: "patient",
        recipientEmail: "support@scriptsxo.com",
        content: newMessage.trim(),
      });
      setNewMessage("");
    } catch (error) {
      // Silently ignore — compose box remains available
    } finally {
      setSending(false);
    }
  };

  // Show spinner until both session check completes and query resolves
  const isLoading = !sessionChecked || (email !== null && conversations === undefined);

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-6 lg:p-10 max-w-[1200px]">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 size={28} className="animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const convoList = conversations ?? [];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">

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
        {convoList.length > 0 ? (
          <div className="glass-card p-0 divide-y divide-border mb-8">
            {convoList.map((convo: any) => {
              const { latestMessage, unreadCount } = convo;
              const timeAgo = (() => {
                const days = Math.floor((Date.now() - latestMessage.createdAt) / (1000 * 60 * 60 * 24));
                if (days === 0) return "Today";
                if (days === 1) return "1d ago";
                if (days < 7) return `${days}d ago`;
                if (days < 14) return "1w ago";
                return `${Math.floor(days / 7)}w ago`;
              })();

              return (
                <div
                  key={convo.conversationId}
                  className="flex items-start gap-5 px-6 py-5 hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(124, 58, 237, 0.08)" }}>
                    {latestMessage.senderRole === "patient" ? (
                      <MessageCircle size={16} className="text-[#7C3AED]" aria-hidden="true" />
                    ) : (
                      <Bot size={16} className="text-[#7C3AED]" aria-hidden="true" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-[14px] font-medium text-foreground">
                        {latestMessage.senderRole === "patient" ? "You" : "ScriptsXO Care Team"}
                      </p>
                      {unreadCount > 0 && (
                        <span className="w-2 h-2 bg-[#7C3AED] rounded-full shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-light leading-relaxed line-clamp-2">
                      {latestMessage.content}
                    </p>
                  </div>

                  <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground shrink-0 mt-1">
                    {timeAgo}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card text-center py-16 mb-8">
            <MessageCircle size={48} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-light text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
              No Messages Yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No messages yet — start a conversation with your care team.
            </p>
          </div>
        )}

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
                style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
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
