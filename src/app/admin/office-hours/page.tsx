"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  ArrowLeft,
  Headphones,
  Clock,
  Users,
  Calendar,
  Save,
  Play,
  Pause,
  CheckCircle2,
  MessageCircle,
  Settings,
  BarChart3,
} from "lucide-react";
import {
  DEFAULT_OFFICE_HOURS,
  formatOfficeHoursSchedule,
} from "@/lib/membership-config";
import type { DayOfWeek, OfficeHoursConfig } from "@/lib/membership-config";

/* -----------------------------------------------------------------------
   Demo analytics
   ----------------------------------------------------------------------- */

const DEMO_ANALYTICS = {
  totalSessions: 12,
  totalParticipants: 234,
  totalQuestionsAnswered: 89,
  avgParticipantsPerSession: 19.5,
  avgQuestionsPerSession: 7.4,
  topTopics: [
    { topic: "Blood work interpretation", count: 24 },
    { topic: "Medication interactions", count: 19 },
    { topic: "General wellness", count: 15 },
    { topic: "Treatment plan clarity", count: 12 },
    { topic: "Lab result follow-up", count: 11 },
  ],
  recentSessions: [
    { date: "Feb 19, 2026", host: "Jessica Ramirez, RN", participants: 22, questions: 8, status: "completed" },
    { date: "Feb 12, 2026", host: "Jessica Ramirez, RN", participants: 18, questions: 6, status: "completed" },
    { date: "Feb 5, 2026", host: "Maria Santos, RN", participants: 25, questions: 10, status: "completed" },
    { date: "Jan 29, 2026", host: "Jessica Ramirez, RN", participants: 21, questions: 9, status: "completed" },
    { date: "Jan 22, 2026", host: "Jessica Ramirez, RN", participants: 16, questions: 5, status: "completed" },
  ],
};

/* -----------------------------------------------------------------------
   Component
   ----------------------------------------------------------------------- */

export default function AdminOfficeHoursPage() {
  const router = useRouter();
  const [config, setConfig] = useState<OfficeHoursConfig>({ ...DEFAULT_OFFICE_HOURS });
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"config" | "analytics" | "sessions">("config");

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function updateConfig<K extends keyof OfficeHoursConfig>(key: K, value: OfficeHoursConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  const DAYS: { value: DayOfWeek; label: string }[] = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" },
  ];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => router.push("/admin")}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft size={16} className="text-muted-foreground" />
          </button>
          <p className="text-[11px] tracking-[0.2em] uppercase text-violet-600">
            ADMINISTRATION
          </p>
        </div>
        <h1 className="text-3xl lg:text-4xl font-light tracking-tight text-foreground mb-2">
          Office Hours Management
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Configure weekly nurse Q&A sessions, view analytics, and manage session history.
        </p>

        {/* Status Banner */}
        <div
          className="rounded-xl p-4 mb-8 flex items-center justify-between"
          style={{
            background: config.enabled ? "rgba(45, 212, 191, 0.06)" : "rgba(239, 68, 68, 0.06)",
            border: config.enabled
              ? "1px solid rgba(45, 212, 191, 0.15)"
              : "1px solid rgba(239, 68, 68, 0.15)",
          }}
        >
          <div className="flex items-center gap-3">
            <Headphones
              size={18}
              className={config.enabled ? "text-teal-500" : "text-red-400"}
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Office Hours are {config.enabled ? "Active" : "Paused"}
              </p>
              <p className="text-xs text-muted-foreground">
                {config.enabled
                  ? formatOfficeHoursSchedule(config)
                  : "Sessions are currently paused. Members cannot join."}
              </p>
            </div>
          </div>
          <button
            onClick={() => updateConfig("enabled", !config.enabled)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs tracking-wider uppercase font-medium transition-colors"
            style={{
              background: config.enabled ? "rgba(239, 68, 68, 0.08)" : "rgba(45, 212, 191, 0.08)",
              color: config.enabled ? "#EF4444" : "#14B8A6",
            }}
          >
            {config.enabled ? <Pause size={12} /> : <Play size={12} />}
            {config.enabled ? "Pause" : "Enable"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {[
            { id: "config", label: "Configuration", icon: Settings },
            { id: "analytics", label: "Analytics", icon: BarChart3 },
            { id: "sessions", label: "Session History", icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-wider uppercase transition-colors ${
                activeTab === tab.id
                  ? "text-violet-600 border-b-2 border-violet-600 font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Configuration Tab */}
        {activeTab === "config" && (
          <div className="space-y-6">
            {/* Schedule Settings */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <Clock size={14} />
                Schedule Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Day of Week
                  </label>
                  <select
                    value={config.dayOfWeek}
                    onChange={(e) => updateConfig("dayOfWeek", e.target.value as DayOfWeek)}
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  >
                    {DAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Start Time (ET)
                  </label>
                  <input
                    type="time"
                    value={config.startTime}
                    onChange={(e) => updateConfig("startTime", e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={config.durationMinutes}
                    onChange={(e) => updateConfig("durationMinutes", parseInt(e.target.value) || 60)}
                    min={15}
                    max={180}
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    value={config.maxParticipants}
                    onChange={(e) => updateConfig("maxParticipants", parseInt(e.target.value) || 50)}
                    min={5}
                    max={200}
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Early Join (minutes before start)
                  </label>
                  <input
                    type="number"
                    value={config.earlyJoinMinutes}
                    onChange={(e) => updateConfig("earlyJoinMinutes", parseInt(e.target.value) || 10)}
                    min={0}
                    max={30}
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
              </div>
            </div>

            {/* Host Settings */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <Users size={14} />
                Host Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Host Title
                  </label>
                  <input
                    type="text"
                    value={config.hostTitle}
                    onChange={(e) => updateConfig("hostTitle", e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Credentials
                  </label>
                  <input
                    type="text"
                    value={config.hostCredentials}
                    onChange={(e) => updateConfig("hostCredentials", e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <Settings size={14} />
                Features
              </h3>
              <div className="space-y-4">
                {[
                  {
                    key: "allowPreSubmitQuestions" as keyof OfficeHoursConfig,
                    label: "Pre-Submit Questions",
                    desc: "Allow members to submit questions before the session starts.",
                  },
                  {
                    key: "recordSessions" as keyof OfficeHoursConfig,
                    label: "Record Sessions",
                    desc: "Automatically record sessions and make replays available to members.",
                  },
                ].map((toggle) => (
                  <div key={toggle.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground">{toggle.label}</p>
                      <p className="text-xs text-muted-foreground">{toggle.desc}</p>
                    </div>
                    <button
                      onClick={() =>
                        updateConfig(toggle.key, !config[toggle.key])
                      }
                      className="relative w-11 h-6 rounded-full transition-colors"
                      style={{
                        background: config[toggle.key]
                          ? "#5B21B6"
                          : "#D1D5DB",
                      }}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                        style={{
                          transform: config[toggle.key]
                            ? "translateX(22px)"
                            : "translateX(2px)",
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-medium text-foreground mb-4">
                Session Disclaimer
              </h3>
              <textarea
                value={config.disclaimer}
                onChange={(e) => updateConfig("disclaimer", e.target.value)}
                rows={4}
                className="w-full rounded-md border border-border bg-white p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                This disclaimer is shown to all participants before and during Office Hours.
              </p>
            </div>

            {/* Save */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs tracking-wider uppercase font-medium text-white transition-all"
                style={{ background: "#5B21B6" }}
              >
                {saved ? (
                  <>
                    <CheckCircle2 size={14} />
                    Configuration Saved
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "TOTAL SESSIONS", value: DEMO_ANALYTICS.totalSessions },
                { label: "TOTAL PARTICIPANTS", value: DEMO_ANALYTICS.totalParticipants },
                { label: "QUESTIONS ANSWERED", value: DEMO_ANALYTICS.totalQuestionsAnswered },
                { label: "AVG ATTENDANCE", value: DEMO_ANALYTICS.avgParticipantsPerSession.toFixed(1) },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-2xl p-5">
                  <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-light text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Top Topics */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <MessageCircle size={14} />
                Most Asked Topics
              </h3>
              <div className="space-y-3">
                {DEMO_ANALYTICS.topTopics.map((topic, i) => {
                  const maxCount = DEMO_ANALYTICS.topTopics[0].count;
                  const pct = (topic.count / maxCount) * 100;
                  return (
                    <div key={topic.topic}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground">{topic.topic}</span>
                        <span className="text-xs text-muted-foreground">
                          {topic.count} questions
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: "#5B21B6",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div className="space-y-3">
            {DEMO_ANALYTICS.recentSessions.map((session) => (
              <div
                key={session.date}
                className="glass-card rounded-2xl p-5 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{session.date}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{session.host}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{session.participants}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Joined</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{session.questions}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Q&A</p>
                  </div>
                  <span
                    className="text-[10px] px-2 py-1 rounded-full uppercase tracking-wider"
                    style={{
                      background: "rgba(45, 212, 191, 0.1)",
                      color: "#14B8A6",
                    }}
                  >
                    {session.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
