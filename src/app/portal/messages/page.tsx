import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, ArrowLeft, Send } from "lucide-react";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Messages",
  description: "Secure messaging with your care team.",
};

export default function MessagesPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/portal" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={20} aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-foreground">
                Messages
              </h1>
              <p className="text-sm text-muted-foreground">
                Secure communication with your care team.
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Messages list */}
            <div className="divide-y divide-border">
              <div className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">Dr. Johnson</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your lab results look good. Continue with the current medication...
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">Feb 10</span>
                </div>
              </div>
              <div className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">Dr. Martinez</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please remember to schedule your follow-up appointment for next week...
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">Feb 8</span>
                </div>
              </div>
            </div>

            {/* Compose */}
            <div className="border-t border-border p-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
                  aria-label="Send message"
                >
                  <Send size={16} className="text-primary-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
