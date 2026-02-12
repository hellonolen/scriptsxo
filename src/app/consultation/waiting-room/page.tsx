import type { Metadata } from "next";
import Link from "next/link";
import { Clock, CheckCircle, Wifi } from "lucide-react";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Waiting Room",
  description: "Please wait while we connect you with a licensed healthcare provider.",
};

export default function WaitingRoomPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Clock size={32} className="text-primary animate-pulse-slow" aria-hidden="true" />
          </div>

          <h1 className="text-2xl font-bold tracking-tighter text-foreground mb-2">
            You Are in the Waiting Room
          </h1>
          <p className="text-muted-foreground mb-8">
            A licensed provider will be with you shortly. Average wait time is under 15 minutes.
          </p>

          {/* Status indicators */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4 text-left mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-green-500" aria-hidden="true" />
              <span className="text-sm text-foreground">Intake form completed</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-green-500" aria-hidden="true" />
              <span className="text-sm text-foreground">ID verified</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-green-500" aria-hidden="true" />
              <span className="text-sm text-foreground">Payment authorized</span>
            </div>
            <div className="flex items-center gap-3">
              <Wifi size={18} className="text-primary animate-pulse" aria-hidden="true" />
              <span className="text-sm text-foreground">Connecting to provider...</span>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">
              Please keep this page open. You will be connected automatically when a provider is available. Make sure your camera and microphone are enabled.
            </p>
          </div>

          <Link
            href="/portal"
            className="inline-flex items-center gap-2 mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel and return to portal
          </Link>
        </div>
      </main>
    </>
  );
}
