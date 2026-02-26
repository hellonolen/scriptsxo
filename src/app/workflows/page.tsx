"use client";

import { ClipboardList, Clock, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";

const DEMO_WORKFLOWS = [
  {
    id: "wf-1",
    title: "New Patient Intake Review",
    patient: "Amara Johnson",
    step: "Medical History",
    stepsTotal: 5,
    stepsComplete: 3,
    priority: "urgent",
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
] as const;

type Priority = "urgent" | "normal" | "low";

const PRIORITY_VARIANT: Record<Priority, "warning" | "secondary" | "default"> = {
  urgent:  "warning",
  normal:  "secondary",
  low:     "secondary",
};

export default function WorkflowsPage() {
  return (
    <AppShell>
      <div className="app-content">
        <PageHeader
          eyebrow="CLINICAL"
          title="Workflows"
          description="Active clinical tasks and care coordination."
          cta={
            <div className="flex items-center gap-2">
              <Badge variant="default">4 Active</Badge>
              <Badge variant="warning">1 Urgent</Badge>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard label="Active"          value="4"    icon={ClipboardList} />
          <StatCard label="Completed Today" value="7"    icon={ClipboardList} />
          <StatCard label="Avg. Time"       value="2.4h" icon={Clock} />
          <StatCard label="On Track"        value="92%"  icon={ClipboardList} />
        </div>

        {/* Workflow list — surface cards (not glass-card; these are list items) */}
        <div className="space-y-3">
          {DEMO_WORKFLOWS.map((wf) => {
            const pct = Math.round((wf.stepsComplete / wf.stepsTotal) * 100);
            return (
              <div
                key={wf.id}
                className="bg-card border border-border rounded-lg flex flex-col sm:flex-row sm:items-center gap-4"
                style={{ padding: "20px 24px" }}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-brand-secondary-muted flex items-center justify-center shrink-0">
                  <ClipboardList size={16} className="text-primary" aria-hidden="true" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-[14px] font-medium text-foreground">{wf.title}</h3>
                    <Badge variant={PRIORITY_VARIANT[wf.priority]}>
                      {wf.priority === "urgent" ? "Urgent" : wf.priority === "low" ? "Low" : "Normal"}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground mb-2">
                    {wf.patient} — Current step: {wf.step}
                  </p>
                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: "var(--brand-gradient)" }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {wf.stepsComplete}/{wf.stepsTotal}
                    </span>
                  </div>
                </div>

                {/* Due + action */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Clock size={12} aria-hidden="true" />
                    <span>{wf.due}</span>
                  </div>
                  <button
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] tracking-[0.1em] uppercase font-medium text-white hover:opacity-90 transition-opacity rounded-md"
                    style={{ background: "var(--brand-gradient)" }}
                  >
                    Continue
                    <ArrowRight size={11} aria-hidden="true" />
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
