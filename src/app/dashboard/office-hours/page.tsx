"use client";

import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import {
  Headphones,
  Clock,
  Users,
  MessageCircle,
  Send,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Mic,
  MicOff,
  Play,
} from "lucide-react";
import {
  DEFAULT_OFFICE_HOURS,
  getNextOfficeHoursDate,
  formatOfficeHoursSchedule,
} from "@/lib/membership-config";
import type {
  OfficeHoursQuestion,
  OfficeHoursSessionStatus,
} from "@/lib/membership-config";

/* -----------------------------------------------------------------------
   Demo data
   ----------------------------------------------------------------------- */

const DEMO_UPCOMING_SESSION = {
  id: "oh-2026-02-25",
  scheduledDate: getNextOfficeHoursDate().toISOString(),
  startTime: DEFAULT_OFFICE_HOURS.startTime,
  endTime: "15:00",
  status: "open_for_questions" as OfficeHoursSessionStatus,
  hostName: "Jessica Ramirez",
  hostCredentials: "RN, BSN",
  participantCount: 14,
  maxParticipants: DEFAULT_OFFICE_HOURS.maxParticipants,
  questions: [
    {
      id: "q1",
      memberName: "Anonymous",
      memberId: "m1",
      question: "Can you help me understand my CMP results? My BUN/creatinine ratio seems high.",
      submittedAt: new Date(Date.now() - 3600000).toISOString(),
      isAnonymous: true,
      status: "pending" as const,
    },
    {
      id: "q2",
      memberName: "David C.",
      memberId: "m2",
      question: "I was prescribed Lisinopril 10mg. Are there foods I should avoid while taking it?",
      submittedAt: new Date(Date.now() - 7200000).toISOString(),
      isAnonymous: false,
      status: "pending" as const,
    },
    {
      id: "q3",
      memberName: "Anonymous",
      memberId: "m3",
      question: "What does it mean if my HbA1c went from 6.1 to 5.8 after starting Metformin?",
      submittedAt: new Date(Date.now() - 10800000).toISOString(),
      isAnonymous: true,
      status: "pending" as const,
    },
  ] as OfficeHoursQuestion[],
};

const DEMO_PAST_SESSIONS = [
  {
    id: "oh-2026-02-18",
    date: "Feb 18, 2026",
    host: "Jessica Ramirez, RN",
    participants: 22,
    questionsAnswered: 8,
    hasRecording: true,
  },
  {
    id: "oh-2026-02-11",
    date: "Feb 11, 2026",
    host: "Jessica Ramirez, RN",
    participants: 18,
    questionsAnswered: 6,
    hasRecording: true,
  },
  {
    id: "oh-2026-02-04",
    date: "Feb 4, 2026",
    host: "Maria Santos, RN",
    participants: 25,
    questionsAnswered: 10,
    hasRecording: true,
  },
];

/* -----------------------------------------------------------------------
   Component
   ----------------------------------------------------------------------- */

export default function OfficeHoursPage() {
  const [newQuestion, setNewQuestion] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const nextDate = useMemo(() => getNextOfficeHoursDate(), []);
  const schedule = useMemo(() => formatOfficeHoursSchedule(), []);

  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date();
      const diff = nextDate.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown("Starting now");
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      parts.push(`${mins}m`);
      setCountdown(parts.join(" "));
    }
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [nextDate]);

  function handleSubmitQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setSubmitted(true);
    setNewQuestion("");
    setTimeout(() => setSubmitted(false), 4000);
  }

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1000px]">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] tracking-[0.2em] uppercase text-violet-600 mb-1">
            INCLUDED WITH MEMBERSHIP
          </p>
          <h1 className="text-3xl lg:text-4xl font-light tracking-tight text-foreground mb-2">
            Nurse Office Hours
          </h1>
          <p className="text-sm text-muted-foreground max-w-[600px]">
            Weekly live Q&A with a registered nurse. Ask about blood work,
            medications, wellness, and more. Audio only, no video required.
          </p>
        </div>

        {/* Schedule + Countdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card rounded-2xl p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={14} className="text-violet-500" />
              <span className="text-[10px] tracking-widest uppercase text-muted-foreground">
                SCHEDULE
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">{schedule}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {DEFAULT_OFFICE_HOURS.durationMinutes} minutes per session
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-teal-500" />
              <span className="text-[10px] tracking-widest uppercase text-muted-foreground">
                NEXT SESSION
              </span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {nextDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Starts in {countdown}
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} className="text-violet-500" />
              <span className="text-[10px] tracking-widest uppercase text-muted-foreground">
                REGISTERED
              </span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {DEMO_UPCOMING_SESSION.participantCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              of {DEMO_UPCOMING_SESSION.maxParticipants} spots
            </p>
          </div>
        </div>

        {/* Disclaimer Banner */}
        <div
          className="rounded-xl p-4 mb-8 flex items-start gap-3"
          style={{ background: "rgba(124, 58, 237, 0.06)", border: "1px solid rgba(124, 58, 237, 0.12)" }}
        >
          <AlertCircle size={16} className="text-violet-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {DEFAULT_OFFICE_HOURS.disclaimer}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-4 py-2.5 text-xs tracking-wider uppercase transition-colors ${
              activeTab === "upcoming"
                ? "text-violet-600 border-b-2 border-violet-600 font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upcoming Session
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`px-4 py-2.5 text-xs tracking-wider uppercase transition-colors ${
              activeTab === "past"
                ? "text-violet-600 border-b-2 border-violet-600 font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Past Sessions
          </button>
        </div>

        {activeTab === "upcoming" && (
          <div className="space-y-6">
            {/* Submit Question */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                <MessageCircle size={14} />
                Submit Your Question
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Questions are collected before and during the session. The nurse
                will address them in order.
              </p>

              <form onSubmit={handleSubmitQuestion} className="space-y-3">
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="e.g., Can you help me understand my recent blood work results?"
                  className="w-full rounded-xl border border-border bg-white p-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
                  rows={3}
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-xs text-muted-foreground">
                      Ask anonymously
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={!newQuestion.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs tracking-wider uppercase font-medium text-white transition-all disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
                  >
                    <Send size={12} />
                    Submit Question
                  </button>
                </div>

                {submitted && (
                  <div className="flex items-center gap-2 text-xs text-teal-600 mt-2">
                    <CheckCircle2 size={14} />
                    Question submitted. The nurse will address it during the session.
                  </div>
                )}
              </form>
            </div>

            {/* Queued Questions */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <Headphones size={14} />
                Questions Queue
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  {DEMO_UPCOMING_SESSION.questions.length} submitted
                </span>
              </h3>

              <div className="space-y-3">
                {DEMO_UPCOMING_SESSION.questions.map((q, i) => (
                  <div
                    key={q.id}
                    className="rounded-xl p-4"
                    style={{
                      background: "rgba(124, 58, 237, 0.03)",
                      border: "1px solid rgba(124, 58, 237, 0.06)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] tracking-wider uppercase text-muted-foreground">
                        Q{i + 1}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {q.isAnonymous ? "Anonymous" : q.memberName}
                      </span>
                      <span
                        className="ml-auto text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{
                          background: "rgba(45, 212, 191, 0.1)",
                          color: "#14B8A6",
                        }}
                      >
                        {q.status}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {q.question}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* How It Works */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-medium text-foreground mb-4">
                How Office Hours Work
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    icon: Send,
                    title: "Submit questions",
                    desc: "Submit your question before or during the live session. You can ask anonymously.",
                  },
                  {
                    icon: Headphones,
                    title: "Join the audio call",
                    desc: "At the scheduled time, join the live audio session. No video required.",
                  },
                  {
                    icon: Mic,
                    title: "Listen or speak",
                    desc: "The nurse answers queued questions. You can unmute to discuss if comfortable.",
                  },
                  {
                    icon: Play,
                    title: "Replay anytime",
                    desc: "Sessions are recorded and available for replay in case you miss one.",
                  },
                ].map((step) => (
                  <div key={step.title} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(124, 58, 237, 0.08)" }}
                    >
                      <step.icon size={14} className="text-violet-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground mb-0.5">
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Topics */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-medium text-foreground mb-4">
                Topics You Can Ask About
              </h3>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_OFFICE_HOURS.topics.map((topic) => (
                  <span
                    key={topic}
                    className="text-xs px-3 py-1.5 rounded-full"
                    style={{
                      background: "rgba(124, 58, 237, 0.06)",
                      color: "#6D28D9",
                      border: "1px solid rgba(124, 58, 237, 0.1)",
                    }}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "past" && (
          <div className="space-y-3">
            {DEMO_PAST_SESSIONS.map((session) => (
              <div
                key={session.id}
                className="glass-card rounded-2xl p-5 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {session.date}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {session.host}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      {session.participants}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Joined
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      {session.questionsAnswered}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Answered
                    </p>
                  </div>
                  {session.hasRecording && (
                    <button
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] tracking-wider uppercase transition-colors"
                      style={{
                        background: "rgba(124, 58, 237, 0.08)",
                        color: "#7C3AED",
                      }}
                    >
                      <Play size={11} />
                      Replay
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
