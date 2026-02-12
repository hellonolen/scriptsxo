import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Package, CheckCircle, Truck } from "lucide-react";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Fulfillment",
  description: "Track prescription fulfillment status and shipping.",
};

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
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/pharmacy" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-foreground">
                Fulfillment
              </h1>
              <p className="text-sm text-muted-foreground">
                Track and manage order fulfillment.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {ORDERS.map((order) => {
              const statusInfo = STATUS_MAP[order.status as keyof typeof STATUS_MAP];
              return (
                <div key={order.id} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {order.status === "shipped" ? (
                          <Truck size={18} className="text-primary" aria-hidden="true" />
                        ) : order.status === "ready" ? (
                          <CheckCircle size={18} className="text-green-500" aria-hidden="true" />
                        ) : (
                          <Package size={18} className="text-primary" aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{order.medication}</h3>
                        <p className="text-xs text-muted-foreground">
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
                      <button className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-[5px] hover:bg-primary/90 transition-colors">
                        Mark Ready
                      </button>
                    )}
                    {order.status === "ready" && (
                      <button className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-[5px] hover:bg-primary/90 transition-colors">
                        Mark Picked Up
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
