import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Pill, Clock } from "lucide-react";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Prescription Queue",
  description: "Incoming prescriptions awaiting fulfillment.",
};

const QUEUE = [
  { id: "RX-1042", patient: "Jane D.", medication: "Amoxicillin 500mg", qty: 30, received: "2 min ago", priority: "standard" },
  { id: "RX-1041", patient: "Mark S.", medication: "Lisinopril 10mg", qty: 90, received: "15 min ago", priority: "routine" },
  { id: "RX-1040", patient: "Lisa K.", medication: "Fluconazole 150mg", qty: 1, received: "22 min ago", priority: "urgent" },
  { id: "RX-1039", patient: "Robert J.", medication: "Metformin 500mg", qty: 60, received: "45 min ago", priority: "standard" },
  { id: "RX-1038", patient: "Sarah W.", medication: "Omeprazole 20mg", qty: 30, received: "1 hr ago", priority: "routine" },
];

export default function PharmacyQueuePage() {
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
                Prescription Queue
              </h1>
              <p className="text-sm text-muted-foreground">
                {QUEUE.length} prescriptions awaiting fulfillment
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border">
              {QUEUE.map((rx) => (
                <div key={rx.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Pill size={18} className="text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {rx.medication} <span className="text-muted-foreground font-normal">x{rx.qty}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rx.id} -- {rx.patient}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground hidden sm:flex">
                      <Clock size={12} aria-hidden="true" />
                      {rx.received}
                    </div>
                    <Badge variant={rx.priority === "urgent" ? "warning" : rx.priority === "standard" ? "info" : "secondary"}>
                      {rx.priority}
                    </Badge>
                    <button className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-[5px] hover:bg-primary/90 transition-colors">
                      Process
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
