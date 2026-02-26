import type { Metadata } from "next";
import Link from "next/link";
import { Bot, ArrowLeft, Brain, MessageSquare, Pill, Settings } from "lucide-react";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Agents",
  description: "Configure and monitor platform agents — triage, prescription assistant, and patient support.",
};

/**
 * Agent configuration derived from convex/agents/conductor.ts dispatch map.
 * These represent the known agent types wired into the conductor.
 * Live interaction counts are not yet tracked — shown as "—" until telemetry is connected.
 */
const AGENT_CONFIG = [
  {
    icon: Brain,
    name: "Triage AI",
    conductorKey: "triage",
    description:
      "Analyzes patient symptoms and routes to the appropriate specialty provider. Powered by Gemini Flash.",
    model: "Gemini Flash",
  },
  {
    icon: Pill,
    name: "Prescription Assistant",
    conductorKey: "prescription",
    description:
      "Helps providers with drug interactions, dosing recommendations, and formulary checks.",
    model: "Claude (Anthropic)",
  },
  {
    icon: MessageSquare,
    name: "Patient Concierge",
    conductorKey: "intake",
    description:
      "Guides patients through intake, answers general health questions, and collects structured medical history.",
    model: "Gemini Flash",
  },
] as const;

export default function AgentsPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/admin" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-foreground">
                Platform Agents
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure platform agents. Live metrics require telemetry connection.
              </p>
            </div>
          </div>

          {/* Info banner */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-5 py-4 mb-8">
            <p className="text-sm text-foreground font-light">
              Agent status monitoring connects via the admin dashboard once the Convex deployment is active.
              The agents below are registered in the conductor and ready to dispatch.
            </p>
          </div>

          <div className="space-y-6">
            {AGENT_CONFIG.map((agent) => (
              <div key={agent.conductorKey} className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <agent.icon size={22} className="text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Model: {agent.model} &middot; Key:{" "}
                        <code className="font-mono text-[11px] bg-muted px-1 rounded">
                          {agent.conductorKey}
                        </code>
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Configured</Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {agent.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Interactions today: —
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
      </main>
    </>
  );
}
