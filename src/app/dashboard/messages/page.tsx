"use client";

import { useState, useEffect } from "react";
import { Send, Bot, MessageCircle, Stethoscope, Loader2, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSessionCookie } from "@/lib/auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const MOCK_THREADS = [
    {
        id: "t1",
        sender: "Dr. Angela White, MD",
        role: "provider",
        preview: "Your prescription for Sumatriptan 50mg has been signed and sent to CVS on Main St.",
        time: "Today",
        unread: true,
    },
    {
        id: "t2",
        sender: "ScriptsXO Care Team",
        role: "support",
        preview: "Welcome to ScriptsXO! Your account is active and your first consultation is scheduled for today at 2:30 PM.",
        time: "Feb 24",
        unread: false,
    },
    {
        id: "t3",
        sender: "ScriptsXO AI",
        role: "ai",
        preview: "Your intake has been reviewed. We noticed you listed ibuprofen as a current medication — please let your provider know the dosage.",
        time: "Feb 23",
        unread: false,
    },
];

function ThreadIcon({ role }: { role: string }) {
    const base = "w-10 h-10 flex items-center justify-center shrink-0 mt-0.5 rounded-full";
    if (role === "provider" || role === "support") return (
        <div className={base} style={{ background: "rgba(124, 58, 237, 0.08)" }}>
            <MessageCircle size={16} className="text-[#7C3AED]" aria-hidden="true" />
        </div>
    );
    if (role === "ai") return (
        <div className={base} style={{ background: "rgba(124, 58, 237, 0.08)" }}>
            <Bot size={16} className="text-[#7C3AED]" aria-hidden="true" />
        </div>
    );
    return (
        <div className={base} style={{ background: "rgba(124, 58, 237, 0.08)" }}>
            <MessageCircle size={16} className="text-[#7C3AED]" aria-hidden="true" />
        </div>
    );
}

export default function DashboardMessagesPage() {
    const [email, setEmail] = useState<string | null>(null);
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [sessionChecked, setSessionChecked] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    useEffect(() => {
        const session = getSessionCookie();
        if (session?.email) setEmail(session.email);
        if (session?.sessionToken) setSessionToken(session.sessionToken);
        setSessionChecked(true);
    }, []);

    const conversations = useQuery(api.messages.getConversations, email ? { email } : "skip");
    const sendMessage = useMutation(api.messages.send);

    const handleSend = async () => {
        if (!email || !newMessage.trim() || sending) return;
        setSending(true);
        try {
            await sendMessage({
                conversationId: `${email}-support`,
                senderEmail: email,
                senderRole: "patient",
                recipientEmail: "support@scriptsxo.com",
                content: newMessage.trim(),
                sessionToken: sessionToken as any,
            });
            setNewMessage("");
            setSent(true);
            setTimeout(() => setSent(false), 3000);
        } catch {
            // Compose box stays open
        } finally {
            setSending(false);
        }
    };

    const isLoading = !sessionChecked || (email !== null && conversations === undefined);

    if (isLoading) {
        return (
            <AppShell>
                <div className="p-6 lg:p-10 max-w-[1200px]">
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={28} className="animate-spin text-muted-foreground" />
                    </div>
                </div>
            </AppShell>
        );
    }

    const threads = (conversations && conversations.length > 0) ? conversations : MOCK_THREADS;

    return (
        <AppShell>
            <div className="p-6 lg:p-10 max-w-[1200px]">

                {/* Header */}
                <header className="mb-10">
                    <p className="eyebrow mb-2">Communication</p>
                    <h1 className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em]" style={{ fontFamily: "var(--font-heading)" }}>
                        Secure <span className="text-[#7C3AED]">Messages</span>
                    </h1>
                    <p className="text-sm text-muted-foreground font-light mt-1">HIPAA-compliant messaging with your care team and providers.</p>
                </header>

                {/* Thread list */}
                <div className="glass-card p-0 divide-y divide-border mb-8">
                    {(threads as any[]).map((thread: any, i: number) => {
                        const sender = thread.sender ?? (thread.latestMessage?.senderRole === "patient" ? "You" : "ScriptsXO Care Team");
                        const preview = thread.preview ?? thread.latestMessage?.content ?? "";
                        const time = thread.time ?? (() => {
                            const d = thread.latestMessage?.createdAt;
                            if (!d) return "";
                            const days = Math.floor((Date.now() - d) / 86400000);
                            return days === 0 ? "Today" : days === 1 ? "1d ago" : `${days}d ago`;
                        })();
                        const unread = thread.unread ?? (thread.unreadCount > 0);

                        return (
                            <div key={thread.id ?? thread.conversationId ?? i} className="flex items-start gap-5 px-6 py-5 hover:bg-muted/30 transition-colors cursor-pointer group">
                                <ThreadIcon role={thread.role ?? thread.latestMessage?.senderRole ?? "support"} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <p className="text-[14px] font-medium text-foreground">{sender}</p>
                                        {unread && <span className="w-2 h-2 rounded-full bg-[#7C3AED] shrink-0" />}
                                    </div>
                                    <p className="text-sm text-muted-foreground font-light leading-relaxed line-clamp-2">{preview}</p>
                                </div>
                                <span className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground shrink-0 mt-1">{time}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Compose */}
                {email && (
                    <div className="glass-card">
                        <p className="eyebrow mb-4">New Message to Care Team</p>
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                disabled={sending}
                                placeholder="Type a message to your care team..."
                                className="flex-1 px-4 py-3 bg-background border border-border rounded-md text-sm text-foreground font-light placeholder-muted-foreground focus:outline-none focus:border-[#7C3AED] transition-colors disabled:opacity-50"
                                aria-label="Message"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!newMessage.trim() || sending}
                                className="w-11 h-11 flex items-center justify-center hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50 rounded-md"
                                style={{ background: "#5B21B6" }}
                                aria-label="Send message"
                            >
                                {sending ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : sent ? (
                                    <CheckCheck size={16} className="text-white" />
                                ) : (
                                    <Send size={16} className="text-white" />
                                )}
                            </button>
                        </div>
                        {sent && <p className="text-xs text-[#7C3AED] mt-2">Message sent successfully.</p>}
                    </div>
                )}

            </div>
        </AppShell>
    );
}
