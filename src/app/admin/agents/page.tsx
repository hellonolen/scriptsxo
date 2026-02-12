import type { Metadata } from "next";
import Link from "next/link";
import { Bot, ArrowLeft, Brain, MessageSquare, Pill, Settings } from "lucide-react";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "AI Agents",
  description: "Configure and monitor AI agents -- triage, prescription assistant, and patient chatbot.",
};

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
                AI Agents
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure and monitor platform AI agents.
              </p>
            </div>
          </div>

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
      </main>
    </>
  );
}
