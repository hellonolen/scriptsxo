import type { Metadata } from "next";
import Link from "next/link";
import { Video, ArrowLeft, Mic, PhoneOff, MessageSquare, FileText, Pill } from "lucide-react";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Provider Consultation",
  description: "Conduct a secure telehealth consultation with your patient.",
};

export default function ProviderConsultationPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/provider" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tighter text-foreground">
              Consultation Room
            </h1>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Video area */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Video size={32} className="text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-muted-foreground">
                      Ready to connect with next patient
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 p-4 border-t border-border">
                  <button className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors" aria-label="Toggle microphone">
                    <Mic size={20} className="text-foreground" />
                  </button>
                  <button className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors" aria-label="Toggle camera">
                    <Video size={20} className="text-foreground" />
                  </button>
                  <button className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors" aria-label="Chat">
                    <MessageSquare size={20} className="text-foreground" />
                  </button>
                  <button className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors" aria-label="End call">
                    <PhoneOff size={22} className="text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Side panel */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-primary" aria-hidden="true" />
                  Patient Notes
                </h3>
                <textarea
                  placeholder="Add consultation notes..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px] resize-y"
                />
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                  <Pill size={16} className="text-primary" aria-hidden="true" />
                  Quick Prescribe
                </h3>
                <input
                  type="text"
                  placeholder="Search medications..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                />
                <button className="w-full px-4 py-2 bg-primary text-primary-foreground text-sm rounded-[5px] hover:bg-primary/90 transition-colors">
                  Create Prescription
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
