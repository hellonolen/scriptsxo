"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Plug,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Mail,
  Printer,
  ShieldCheck,
  Pill,
  FileText,
  Activity,
} from "lucide-react";
import { COMPOSIO_REGISTRY, type ComposioToolkit } from "@/lib/composio-config";

/* ---------------------------------------------------------------------------
   TYPES
   --------------------------------------------------------------------------- */

interface HealthResult {
  configured: boolean;
  reachable: boolean;
  status?: number;
  apiVersion?: string;
  connectedAccounts?: number;
  error?: string;
}

interface ToolkitProbeResult {
  toolkit: string;
  available: boolean;
  toolCount?: number;
  error?: string;
}

/* ---------------------------------------------------------------------------
   ICON MAP — category to lucide icon
   --------------------------------------------------------------------------- */

const CATEGORY_ICON: Record<ComposioToolkit["category"], React.ElementType> = {
  prescribing: Pill,
  ehr: FileText,
  pharmacy: Activity,
  communication: Mail,
  scheduling: Calendar,
  insurance: ShieldCheck,
};

/* ---------------------------------------------------------------------------
   PAGE
   --------------------------------------------------------------------------- */

export default function AdminIntegrationsPage() {
  // Convex actions
  const runHealthCheck = useAction(api.integrations.composio.healthCheck);
  const runListActions = useAction(api.integrations.composio.listActions);

  // State
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [probes, setProbes] = useState<Record<string, ToolkitProbeResult>>({});
  const [probing, setProbing] = useState<string | null>(null);

  /* -----------------------------------------------------------------------
     HEALTH CHECK
     ----------------------------------------------------------------------- */

  const doHealthCheck = useCallback(async () => {
    setHealthLoading(true);
    try {
      const result = await runHealthCheck();
      setHealth(result as HealthResult);
    } catch (err) {
      setHealth({
        configured: false,
        reachable: false,
        error: err instanceof Error ? err.message : "Health check failed",
      });
    } finally {
      setHealthLoading(false);
    }
  }, [runHealthCheck]);

  /* -----------------------------------------------------------------------
     TOOLKIT PROBE — test a specific toolkit by listing its tools
     ----------------------------------------------------------------------- */

  const probeToolkit = useCallback(
    async (toolkitId: string, composioToolkitSlug: string) => {
      setProbing(toolkitId);
      try {
        const result = await runListActions({ toolkit: composioToolkitSlug });
        const r = result as { success: boolean; data?: unknown; error?: string };
        if (r.success) {
          const items = Array.isArray(r.data) ? r.data : [];
          setProbes((prev) => ({
            ...prev,
            [toolkitId]: {
              toolkit: composioToolkitSlug,
              available: true,
              toolCount: items.length,
            },
          }));
        } else {
          setProbes((prev) => ({
            ...prev,
            [toolkitId]: {
              toolkit: composioToolkitSlug,
              available: false,
              error: r.error || "No tools found",
            },
          }));
        }
      } catch (err) {
        setProbes((prev) => ({
          ...prev,
          [toolkitId]: {
            toolkit: composioToolkitSlug,
            available: false,
            error: err instanceof Error ? err.message : "Probe failed",
          },
        }));
      } finally {
        setProbing(null);
      }
    },
    [runListActions]
  );

  /* -----------------------------------------------------------------------
     RENDER
     ----------------------------------------------------------------------- */

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1000px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow mb-0.5">ADMINISTRATION</p>
            <h1
              className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Integrations
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">
          Composio API connection status and toolkit health for external service
          routing.
        </p>

        {/* Composio Connection Card */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(124, 58, 237, 0.08)" }}
              >
                <Plug size={20} style={{ color: "#7C3AED" }} />
              </div>
              <div>
                <h2 className="text-lg font-medium text-foreground">
                  Composio API
                </h2>
                <p className="text-xs text-muted-foreground">
                  Unified integration layer for external services (v3)
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={doHealthCheck}
              disabled={healthLoading}
            >
              {healthLoading ? (
                <Loader2 size={14} className="animate-spin mr-1.5" />
              ) : (
                <RefreshCw size={14} className="mr-1.5" />
              )}
              {healthLoading ? "Checking..." : "Health Check"}
            </Button>
          </div>

          {/* Health result */}
          {health && (
            <div className="border border-border rounded-md p-4 bg-muted/30">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    Configured
                  </span>
                  {health.configured ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                      <CheckCircle2 size={14} /> Yes
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-500 font-medium">
                      <XCircle size={14} /> No
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    Reachable
                  </span>
                  {health.reachable ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                      <CheckCircle2 size={14} /> Yes
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-500 font-medium">
                      <XCircle size={14} /> No
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    API Version
                  </span>
                  <span className="font-medium text-foreground">
                    {health.apiVersion || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    Connected Accounts
                  </span>
                  <span className="font-medium text-foreground">
                    {health.connectedAccounts ?? "—"}
                  </span>
                </div>
              </div>
              {health.error && (
                <p className="text-xs text-red-500 mt-3 font-mono">
                  {health.error}
                </p>
              )}
              {health.status && (
                <p className="text-xs text-muted-foreground mt-2">
                  HTTP {health.status}
                </p>
              )}
            </div>
          )}

          {!health && (
            <p className="text-sm text-muted-foreground">
              Click &quot;Health Check&quot; to verify the Composio API connection.
            </p>
          )}
        </div>

        {/* Toolkit Registry */}
        <h2
          className="text-xl font-light text-foreground tracking-[-0.02em] mb-4"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Toolkit Registry
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Each toolkit maps to an external service that ScriptsXO agents can
          dispatch to via Composio.
        </p>

        <div className="space-y-3">
          {COMPOSIO_REGISTRY.map((tk) => {
            const Icon = CATEGORY_ICON[tk.category] || Plug;
            const probe = probes[tk.id];
            const isProbing = probing === tk.id;

            return (
              <div
                key={tk.id}
                className="bg-card border border-border rounded-lg p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(124, 58, 237, 0.06)" }}
                    >
                      <Icon size={18} style={{ color: "#7C3AED" }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {tk.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {tk.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {probe ? (
                      probe.available ? (
                        <Badge variant="success">
                          {probe.toolCount} tool{probe.toolCount !== 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <Badge variant="error">unavailable</Badge>
                      )
                    ) : (
                      <Badge variant="secondary">{tk.status}</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => probeToolkit(tk.id, tk.id)}
                      disabled={isProbing || !health?.reachable}
                      title="Test toolkit connection"
                    >
                      {isProbing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Actions list */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tk.actions.map((a) => (
                    <span
                      key={a.id}
                      className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
                      title={a.description}
                    >
                      {a.label}
                    </span>
                  ))}
                </div>

                {/* Probe error */}
                {probe && !probe.available && probe.error && (
                  <p className="text-xs text-red-500 mt-2 font-mono">
                    {probe.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground mt-8 text-center">
          Configure toolkit auth credentials in the{" "}
          <a
            href="https://app.composio.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Composio Dashboard
          </a>
          . Toolkit slugs must match between this registry and Composio.
        </p>
      </div>
    </AppShell>
  );
}
