"use client";

import Link from "next/link";
import { ArrowLeft, Brain, MessageSquare, Pill, Settings } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

const AGENTS = [
  {
    icon: Brain,
    name: "Triage AI",
    description: "Analyzes patient symptoms and routes to the appropriate specialty provider. Powered by Gemini.",
    status: "active",
    model: "Gemini Flash",
    interactions: "142 today",
  },
  {
    icon: Pill,
    name: "Prescription Assistant",
    description: "Helps providers with drug interactions, dosing recommendations, and formulary checks.",
    status: "active",
    model: "Gemini Pro",
    interactions: "38 today",
  },
  {
    icon: MessageSquare,
    name: "Patient Chatbot",
    description: "Answers common patient questions about scheduling, billing, and general health information.",
    status: "active",
    model: "Gemini Flash",
    interactions: "89 today",
  },
];

export default function AgentsPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1000px]">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow mb-0.5">ADMINISTRATION</p>
            <h1 className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]" style={{ fontFamily: "var(--font-heading)" }}>
              AI Agents
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">Configure and monitor platform AI agents.</p>

          <div className="space-y-6">
            {AGENTS.map((agent, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <agent.icon size={22} className="text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Model: {agent.model}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">{agent.status}</Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {agent.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {agent.interactions}
                  </span>
                  <button className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <Settings size={14} aria-hidden="true" />
                    Configure
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </AppShell>
  );
}
