"use client";

import Link from "next/link";
import { ArrowLeft, Package, CheckCircle, Truck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

const ORDERS = [
  { id: "RX-1037", patient: "Amy T.", medication: "Doxycycline 100mg", status: "filling", eta: "30 min" },
  { id: "RX-1036", patient: "David L.", medication: "Prednisone 10mg", status: "ready", eta: "Pickup" },
  { id: "RX-1035", patient: "Chen W.", medication: "Azithromycin 250mg", status: "shipped", tracking: "1Z999..." },
  { id: "RX-1034", patient: "Maria G.", medication: "Ciprofloxacin 500mg", status: "ready", eta: "Pickup" },
];

const STATUS_MAP = {
  filling: { label: "Filling", variant: "warning" as const },
  ready: { label: "Ready", variant: "success" as const },
  shipped: { label: "Shipped", variant: "info" as const },
};

export default function FulfillmentPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/pharmacy" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow mb-0.5">PHARMACY</p>
            <h1
              className="text-2xl lg:text-3xl font-light text-foreground tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Fulfillment
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">
          Track and manage order fulfillment.
        </p>

        <div className="space-y-4">
          {ORDERS.map((order) => {
            const statusInfo = STATUS_MAP[order.status as keyof typeof STATUS_MAP];
            return (
              <div key={order.id} className="glass-card" style={{ padding: "24px" }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(124, 58, 237, 0.08)" }}
                    >
                      {order.status === "shipped" ? (
                        <Truck size={20} style={{ color: "#7C3AED" }} aria-hidden="true" />
                      ) : order.status === "ready" ? (
                        <CheckCircle size={20} style={{ color: "#059669" }} aria-hidden="true" />
                      ) : (
                        <Package size={20} style={{ color: "#7C3AED" }} aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-medium text-foreground">{order.medication}</h3>
                      <p className="text-[13px] text-muted-foreground">
                        {order.id} -- {order.patient}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {order.status === "shipped"
                      ? `Tracking: ${order.tracking}`
                      : `ETA: ${order.eta}`}
                  </span>
                  {order.status === "filling" && (
                    <button className="px-4 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors">
                      Mark Ready
                    </button>
                  )}
                  {order.status === "ready" && (
                    <button className="px-4 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors">
                      Mark Picked Up
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
