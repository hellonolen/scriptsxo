import type { Metadata } from "next";
import Link from "next/link";
import { Users, ArrowLeft, Search, UserPlus } from "lucide-react";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Manage Providers",
  description: "Manage provider roster, credentials, and availability.",
};

const PROVIDERS = [
  { name: "Dr. Sarah Johnson", specialty: "General Medicine", license: "FL-MD-12345", status: "online", patients: 8 },
  { name: "Dr. Carlos Martinez", specialty: "Internal Medicine", license: "FL-MD-12346", status: "online", patients: 5 },
  { name: "Dr. Emily Chen", specialty: "Dermatology", license: "FL-MD-12347", status: "offline", patients: 0 },
  { name: "PA Michael Brown", specialty: "Urgent Care", license: "FL-PA-12348", status: "online", patients: 3 },
  { name: "Dr. Lisa Park", specialty: "Mental Health", license: "FL-MD-12349", status: "break", patients: 0 },
];

export default function AdminProvidersPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft size={20} aria-hidden="true" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tighter text-foreground">
                  Providers
                </h1>
                <p className="text-sm text-muted-foreground">
                  {PROVIDERS.length} providers in the system
                </p>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-[5px] hover:bg-primary/90 transition-colors">
              <UserPlus size={16} aria-hidden="true" />
              Add Provider
            </button>
          </div>

          <div className="relative mb-6">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search providers..."
              className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="divide-y divide-border">
              {PROVIDERS.map((provider, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {provider.name.split(" ").pop()?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{provider.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {provider.specialty} -- {provider.license}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {provider.patients} patient{provider.patients !== 1 ? "s" : ""}
                    </span>
                    <Badge
                      variant={
                        provider.status === "online"
                          ? "success"
                          : provider.status === "break"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {provider.status}
                    </Badge>
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
