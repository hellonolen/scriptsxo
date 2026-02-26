"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  ShieldCheck,
  Building2,
  ArrowLeftRight,
  Zap,
  Bitcoin,
  Check,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PAYMENT_METHODS, type PaymentMethodConfig, type PaymentMethodId } from "@/lib/payment-config";

const ICON_MAP: Record<PaymentMethodId, typeof CreditCard> = {
  credit_card: CreditCard,
  insurance: ShieldCheck,
  ach: Building2,
  wire_transfer: ArrowLeftRight,
  zelle: Zap,
  crypto: Bitcoin,
};

function PaymentMethodCard({
  method,
  onToggle,
  onSettingChange,
}: {
  method: PaymentMethodConfig;
  onToggle: () => void;
  onSettingChange: (key: string, value: string | boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ICON_MAP[method.id];

  return (
    <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: method.enabled
              ? "rgba(124, 58, 237, 0.1)"
              : "rgba(0,0,0,0.04)",
          }}
        >
          <Icon
            size={20}
            style={{ color: method.enabled ? "#7C3AED" : "#94A3B8" }}
            aria-hidden="true"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-medium text-foreground">
            {method.label}
          </h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {method.description}
          </p>
        </div>

        {/* Toggle */}
        <button
          onClick={onToggle}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            method.enabled ? "bg-primary" : "bg-muted"
          }`}
          role="switch"
          aria-checked={method.enabled}
          aria-label={`Toggle ${method.label}`}
        >
          <div
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
              method.enabled ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          >
            {method.enabled && (
              <Check size={12} className="text-primary m-auto mt-1.5" />
            )}
          </div>
        </button>
      </div>

      {/* Expand toggle for settings */}
      {method.enabled && Object.keys(method.settings).length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-6 py-3 border-t border-border text-[12px] tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Configuration</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="px-6 pb-6 pt-2 border-t border-border space-y-4">
              {Object.entries(method.settings).map(([key, value]) => {
                const label = key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (s) => s.toUpperCase())
                  .replace(/_/g, " ");

                if (typeof value === "boolean") {
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <label className="text-sm text-foreground font-light">
                        {label}
                      </label>
                      <button
                        onClick={() => onSettingChange(key, !value)}
                        className={`relative w-10 h-6 rounded-full transition-colors ${
                          value ? "bg-primary" : "bg-muted"
                        }`}
                        role="switch"
                        aria-checked={value}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                            value ? "translate-x-[18px]" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => onSettingChange(key, e.target.value)}
                      placeholder={`Enter ${label.toLowerCase()}...`}
                      className="w-full px-3 py-2.5 bg-white border border-border rounded-md text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PaymentSettingsPage() {
  const [methods, setMethods] = useState<PaymentMethodConfig[]>(
    () => JSON.parse(JSON.stringify(PAYMENT_METHODS))
  );
  const [saved, setSaved] = useState(false);

  function handleToggle(id: PaymentMethodId) {
    setMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
    setSaved(false);
  }

  function handleSettingChange(
    id: PaymentMethodId,
    key: string,
    value: string | boolean
  ) {
    setMethods((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, settings: { ...m.settings, [key]: value } }
          : m
      )
    );
    setSaved(false);
  }

  function handleSave() {
    // In production this would persist to Convex
    // For now just show success feedback
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const enabledCount = methods.filter((m) => m.enabled).length;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[900px]">
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
              Payment Methods
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">
          {enabledCount} of {methods.length} payment methods active. Toggle
          methods on/off and configure their settings below.
        </p>

        {/* Methods */}
        <div className="space-y-4">
          {methods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              onToggle={() => handleToggle(method.id)}
              onSettingChange={(key, value) =>
                handleSettingChange(method.id, key, value)
              }
            />
          ))}
        </div>

        {/* Save Bar */}
        <div className="mt-8 flex items-center justify-end gap-4">
          {saved && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
              <Check size={14} />
              Settings saved
            </span>
          )}
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-3 text-white text-xs tracking-[0.15em] uppercase font-medium hover:opacity-90 transition-opacity rounded-md"
            style={{ background: "linear-gradient(135deg, #7C3AED, #2DD4BF)" }}
          >
            <Save size={14} aria-hidden="true" />
            Save Configuration
          </button>
        </div>
      </div>
    </AppShell>
  );
}
