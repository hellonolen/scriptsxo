"use client";

import { ClipboardList, Clock, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import Link from "next/link";

const DEMO_WORKFLOWS = [
  {
    id: "wf-1",
    title: "New Patient Intake Review",
    patient: "Amara Johnson",
    step: "Medical History",
    stepsTotal: 5,
    stepsComplete: 3,
    priority: "high",
    due: "Today",
  },
  {
    id: "wf-2",
    title: "Prescription Authorization",
    patient: "Marcus Rivera",
    step: "Provider Signature",
    stepsTotal: 4,
    stepsComplete: 3,
    priority: "normal",
    due: "Tomorrow",
  },
  {
    id: "wf-3",
    title: "Lab Result Review",
    patient: "Elena Vasquez",
    step: "Pending Results",
    stepsTotal: 3,
    stepsComplete: 1,
    priority: "normal",
    due: "In 3 days",
  },
  {
    id: "wf-4",
    title: "Follow-Up Consultation",
    patient: "David Park",
    step: "Schedule Confirmation",
    stepsTotal: 3,
    stepsComplete: 2,
    priority: "low",
    due: "This week",
  },
];

const PRIORITY_STYLES: Record<string, string> = {
  high: "tag tag-active",
  normal: "tag",
  low: "tag",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Urgent",
  normal: "Normal",
  low: "Low",
};

export default function WorkflowsPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1100px]">

        {/* Header */}
        <header className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">CLINICAL</p>
            <h1
              className="text-3xl lg:text-4xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Workflows
            </h1>
          </div>
          <div className="flex gap-3">
            <span className="tag tag-violet">4 Active</span>
            <span className="tag tag-active">1 Urgent</span>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Active", value: "4" },
            { label: "Completed Today", value: "7" },
            { label: "Avg. Time", value: "2.4h" },
            { label: "On Track", value: "92%" },
          ].map((s) => (
            <div key={s.label} className="glass-card flex flex-col gap-2">
              <span className="stat-label">{s.label}</span>
              <span className="stat-value">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Workflow list */}
        <div className="space-y-3">
          {DEMO_WORKFLOWS.map((wf) => {
            const pct = Math.round((wf.stepsComplete / wf.stepsTotal) * 100);
            return (
              <div
                key={wf.id}
                className="glass-card flex flex-col sm:flex-row sm:items-center gap-4"
                style={{ padding: "20px 24px" }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(124, 58, 237, 0.08)" }}
                >
                  <ClipboardList size={16} style={{ color: "#7C3AED" }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-[14px] font-medium text-foreground">{wf.title}</h3>
                    <span className={PRIORITY_STYLES[wf.priority]}>
                      {PRIORITY_LABELS[wf.priority]}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mb-2">
                    {wf.patient} — Current step: {wf.step}
                  </p>
                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(135deg, #7C3AED, #2DD4BF)",
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {wf.stepsComplete}/{wf.stepsTotal}
                    </span>
                  </div>
                </div>

                {/* Due + action */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <Clock size={12} />
                      <span>{wf.due}</span>
                    </div>
                  </div>
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] tracking-[0.1em] uppercase font-medium text-white hover:opacity-90 transition-opacity"
                    style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}>
                    Continue
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
