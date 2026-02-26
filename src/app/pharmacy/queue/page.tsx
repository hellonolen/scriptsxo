"use client";

import Link from "next/link";
import { ArrowLeft, Pill, Clock, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

function mapPriority(deaSchedule: string | undefined): "urgent" | "standard" | "routine" {
  if (!deaSchedule) return "routine";
  if (deaSchedule === "II" || deaSchedule === "III") return "urgent";
  if (deaSchedule === "IV") return "standard";
  return "routine";
}

function timeAgoLabel(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const hrs = Math.floor(diffMin / 60);
  return `${hrs} hr ago`;
}

export default function PharmacyQueuePage() {
  // Fetch prescriptions with status "sent" — these are queued for filling
  const sentRx = useQuery(api.prescriptions.listAll, { status: "sent" });
  const signedRx = useQuery(api.prescriptions.listAll, { status: "signed" });

  const isLoading = sentRx === undefined && signedRx === undefined;

  const queue = [
    ...(sentRx ?? []),
    ...(signedRx ?? []),
  ].sort((a: any, b: any) => (a.sentToPharmacyAt ?? a.createdAt) - (b.sentToPharmacyAt ?? b.createdAt));

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
              Prescription Queue
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground font-light mb-8 ml-8">
          {isLoading ? "Loading..." : `${queue.length} prescriptions awaiting fulfillment`}
        </p>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading queue...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">No prescriptions awaiting fulfillment.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {queue.map((rx: any) => {
                const priority = mapPriority(rx.deaSchedule);
                const receivedAt = rx.sentToPharmacyAt ?? rx.createdAt ?? Date.now();

                return (
                  <div key={rx._id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Pill size={18} className="text-primary" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {rx.medicationName}{" "}
                          <span className="text-muted-foreground font-normal">
                            x{rx.quantity}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {rx.dosage}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground hidden sm:flex">
                        <Clock size={12} aria-hidden="true" />
                        {timeAgoLabel(receivedAt)}
                      </div>
                      <Badge
                        variant={
                          priority === "urgent"
                            ? "warning"
                            : priority === "standard"
                              ? "info"
                              : "secondary"
                        }
                      >
                        {priority}
                      </Badge>
                      <button className="px-3 py-1.5 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors">
                        Process
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
