"use client";

import { useState, useEffect } from "react";
import { Package, CheckCircle, Truck, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { shouldShowDemoData } from "@/lib/demo";
import { SEED_FULFILLMENT_ORDERS } from "@/lib/seed-data";
import { prescriptions as prescriptionsApi } from "@/lib/api";

const STATUS_MAP = {
  filling:  { label: "Filling",  variant: "warning"  as const },
  ready:    { label: "Ready",    variant: "success"  as const },
  shipped:  { label: "Shipped",  variant: "info"     as const },
  sent:     { label: "Queued",   variant: "secondary" as const },
  signed:   { label: "Approved", variant: "info"     as const },
};

type FulfillmentOrder = {
  id: string;
  patient: string;
  medication: string;
  status: keyof typeof STATUS_MAP;
  eta?: string;
  tracking?: string;
  _id?: string;
};

export default function FulfillmentPage() {
  const [showDemo, setShowDemo]   = useState(false);
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const demo = shouldShowDemoData();
    setShowDemo(demo);

    if (!demo) {
      setIsLoading(true);
      prescriptionsApi.getByProvider("all")
        .then((data) => {
          const all = Array.isArray(data) ? data as any[] : [];
          const mapped: FulfillmentOrder[] = [
            ...all.filter((rx) => rx.status === "filling").map((rx) => ({
              id: rx._id, _id: rx._id,
              patient: rx.patientEmail ?? "Patient",
              medication: rx.medicationName + (rx.dosage ? ` ${rx.dosage}` : ""),
              status: "filling" as const,
              eta: "In queue",
            })),
            ...all.filter((rx) => rx.status === "ready").map((rx) => ({
              id: rx._id, _id: rx._id,
              patient: rx.patientEmail ?? "Patient",
              medication: rx.medicationName + (rx.dosage ? ` ${rx.dosage}` : ""),
              status: "ready" as const,
              eta: "Pickup",
            })),
            ...all.filter((rx) => rx.status === "shipped").map((rx) => ({
              id: rx._id, _id: rx._id,
              patient: rx.patientEmail ?? "Patient",
              medication: rx.medicationName + (rx.dosage ? ` ${rx.dosage}` : ""),
              status: "shipped" as const,
              tracking: rx.trackingNumber,
            })),
          ];
          setOrders(mapped);
        })
        .catch(() => setOrders([]))
        .finally(() => setIsLoading(false));
    }
  }, []);

  async function handleStatusChange(rxId: string, newStatus: string) {
    try {
      await prescriptionsApi.updateStatus(rxId, newStatus);
      // Optimistically remove/update in list
      setOrders((prev) => prev.filter((o) => o._id !== rxId));
    } catch {
      // silently fail
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-6 lg:p-10 max-w-[1200px] flex items-center justify-center py-20">
          <div className="text-left">
            <Loader2 size={28} className="animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading fulfillment queue...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const displayOrders: FulfillmentOrder[] = showDemo ? SEED_FULFILLMENT_ORDERS : orders;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <PageHeader
          eyebrow="PHARMACY"
          title="Fulfillment"
          description="Track and manage order fulfillment."
          backHref="/pharmacy"
        />

        {displayOrders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No active fulfillment orders"
            description="Prescriptions in filling, ready, or shipped status will appear here."
            cta={{ label: "View Queue", href: "/pharmacy/queue" }}
          />
        ) : (
          <div className="space-y-4">
            {displayOrders.map((order) => {
              const statusInfo = STATUS_MAP[order.status] ?? { label: order.status, variant: "secondary" as const };
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
                          {order.id} — {order.patient}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {order.status === "shipped"
                        ? `Tracking: ${order.tracking ?? "—"}`
                        : `ETA: ${order.eta ?? "—"}`}
                    </span>

                    {order.status === "filling" && order._id && (
                      <button
                        onClick={() => handleStatusChange(order._id!, "ready")}
                        className="px-4 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors"
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status === "ready" && order._id && (
                      <button
                        onClick={() => handleStatusChange(order._id!, "picked_up")}
                        className="px-4 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors"
                      >
                        Mark Picked Up
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
