"use client";

import Link from "next/link";
import { ArrowLeft, Users, Building2, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const MODES = [
  {
    id: "client",
    label: "Client",
    plural: "Clients",
    description: "Default for ScriptsXO. People are clients — a modern, non-clinical framing suited to concierge and direct-to-consumer health.",
    examples: ["Client portal", "My clients", "New client intake"],
    recommended: true,
  },
  {
    id: "patient",
    label: "Patient",
    plural: "Patients",
    description: "For licensed clinics, hospitals, and medical organizations that use clinical terminology and may have regulatory requirements around the term \"patient\".",
    examples: ["Patient chart", "My patients", "New patient intake"],
    recommended: false,
  },
] as const;

export default function TerminologySettingsPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/admin/settings"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow mb-0.5">SETTINGS</p>
            <h1
              className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Terminology
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-10 ml-8">
          Control how people are labeled across the platform. The platform default is
          set in config. Each organization can override this individually.
        </p>

        {/* Platform default */}
        <section className="mb-10">
          <h2 className="text-sm font-medium text-foreground mb-1">Platform default</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Applied when no organization override is set. Currently: <strong>client</strong>.
            To change the platform default, update{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              SITECONFIG.terminology.clientTerm
            </code>{" "}
            in <code className="text-xs bg-muted px-1.5 py-0.5 rounded">src/lib/config.ts</code>.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {MODES.map((mode) => (
              <div
                key={mode.id}
                className="glass-card p-5 relative"
                style={{
                  borderColor: mode.id === "client" ? "rgba(124,58,237,0.35)" : undefined,
                }}
              >
                {mode.recommended && (
                  <span className="absolute top-3 right-3 text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                    Active default
                  </span>
                )}
                <div className="flex items-center gap-2 mb-2">
                  {mode.id === "client" ? <Users size={16} className="text-violet-600" /> : <Building2 size={16} className="text-teal-600" />}
                  <span className="font-medium text-foreground">{mode.label} / {mode.plural}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{mode.description}</p>
                <ul className="space-y-1">
                  {mode.examples.map((ex) => (
                    <li key={ex} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check size={12} className={mode.id === "client" ? "text-violet-500" : "text-teal-500"} />
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Per-org override */}
        <section>
          <h2 className="text-sm font-medium text-foreground mb-1">Per-organization override</h2>
          <p className="text-sm text-muted-foreground mb-5">
            When you onboard a clinic or hospital under a separate organization record, set{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">terminologyMode</code> on
            that organization to <code className="text-xs bg-muted px-1.5 py-0.5 rounded">"patient"</code>.
            The platform default (<strong>client</strong>) applies everywhere else.
          </p>

          <div className="glass-card p-5 text-sm text-muted-foreground space-y-3">
            <p className="font-medium text-foreground text-xs uppercase tracking-wide">How to configure a clinical org</p>
            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
              <li>
                Go to <Link href="/admin/integrations" className="text-violet-600 hover:underline">Admin → Organizations</Link> and open the org record.
              </li>
              <li>
                Set <strong>Terminology mode</strong> to <strong>Patient</strong> in the org settings form.
              </li>
              <li>
                Members of that org will see &quot;patient&quot; language throughout their portal.
                Members outside that org continue to see &quot;client&quot; language.
              </li>
            </ol>
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              The <code>terminologyMode</code> field is stored on the{" "}
              <code>organizations</code> table in Convex.
              The database role identifier (<code>role: &quot;patient&quot;</code>) is unchanged
              regardless of display terminology.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
