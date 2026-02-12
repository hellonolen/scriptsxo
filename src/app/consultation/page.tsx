import type { Metadata } from "next";
import Link from "next/link";
import { Video, Mic, MicOff, VideoOff, PhoneOff, MessageSquare } from "lucide-react";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Consultation",
  description: "Your telehealth consultation session with a licensed provider.",
};

export default function ConsultationPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tighter text-foreground mb-2">
              Consultation Room
            </h1>
            <p className="text-sm text-muted-foreground">
              Your secure, HIPAA-compliant video session
            </p>
          </div>

          {/* Video Area */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="aspect-video bg-muted flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Video size={32} className="text-primary" aria-hidden="true" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Video will appear here when connected
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Waiting for provider to join...
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 p-4 bg-card border-t border-border">
              <button
                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                aria-label="Toggle microphone"
              >
                <Mic size={20} className="text-foreground" />
              </button>
              <button
                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                aria-label="Toggle camera"
              >
                <Video size={20} className="text-foreground" />
              </button>
              <button
                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                aria-label="Open chat"
              >
                <MessageSquare size={20} className="text-foreground" />
              </button>
              <button
                className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                aria-label="End call"
              >
                <PhoneOff size={22} className="text-white" />
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              This session is encrypted and HIPAA-compliant. Do not share your screen with anyone outside of this consultation.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
