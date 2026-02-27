"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Users,
  Pill,
  Video,
  Clock,
  CircleDot,
  DollarSign,
  CalendarCheck,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { NavCard } from "@/components/ui/nav-card";
import { term } from "@/lib/config";
import { getSessionCookie } from "@/lib/auth";

const URGENCY_VARIANT: Record<string, "warning" | "info" | "success"> = {
  urgent: "warning",
  standard: "info",
  routine: "success",
};

const NAV_CARDS = [
  {
    icon: Users,
    title: `My ${term("titlePlural")}`,
    description: `View and manage your complete ${term()} roster.`,
    href: "/provider/patients",
    stat: "View All",
  },
  {
    icon: Pill,
    title: "Prescriptions",
    description: "Review, sign, and manage prescription requests.",
    href: "/provider/prescriptions",
    stat: "View All",
  },
  {
    icon: Video,
    title: "Consultation Room",
    description: `Start or join a ${term()} video consultation.`,
    href: "/provider/consultation",
    stat: "Ready",
  },
] as const;

export default function ProviderDashboard() {
  const [providerEmail, setProviderEmail] = useState<string | undefined>(undefined);
  const [providerName, setProviderName] = useState<string>("Provider");
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const session = getSessionCookie();
    if (session?.email) {
      setProviderEmail(session.email);
      if (session.name) setProviderName(session.name);
    }
    setSessionReady(true);
  }, []);

  const queue = useQuery(
    api.consultations.getProviderQueue,
    providerEmail ? { providerEmail } : "skip"
  );

  const queueList = queue ?? [];
  const waitingQueue = queueList.filter(
    (c: any) => c.status === "scheduled" || c.status === "in_progress" || c.status === "waiting"
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayVisits = queueList.filter(
    (c: any) => c.status === "completed" && c.endedAt && c.endedAt >= todayStart.getTime()
  );

  const pendingRx = useQuery(
    api.prescriptions.listAll,
    { status: "draft" }
  );

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <PageHeader
          eyebrow="PROVIDER PORTAL"
          title={providerName}
          description="Licensed Provider"
          border
          size="lg"
          cta={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CircleDot size={14} className="text-primary" aria-hidden="true" />
                <Badge variant="success">Online</Badge>
              </div>
              <span className="text-xs text-muted-foreground font-light tracking-wide">
                Accepting patients
              </span>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard label="In Queue" value={queue === undefined ? "—" : String(waitingQueue.length)} icon={ClipboardList} />
          <StatCard label="Today's Visits" value={queue === undefined ? "—" : String(todayVisits.length)} icon={CalendarCheck} />
          <StatCard label="Pending Rx" value={pendingRx === undefined ? "—" : String(pendingRx.length)} icon={Pill} />
          <StatCard label="Revenue" value="—" icon={DollarSign} />
        </div>

        {/* Client Queue */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2
              className="text-xl text-foreground font-light"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {term("title")} Queue
            </h2>
            <span className="text-xs text-muted-foreground tracking-widest uppercase font-light">
              {queue === undefined ? "Loading..." : `${waitingQueue.length} waiting`}
            </span>
          </div>

          <div className="table-container">
            <table className="table-custom">
              <thead>
                <tr>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">{term("title")}</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Type</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Status</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light">Wait Time</th>
                  <th className="text-xs tracking-[0.1em] uppercase font-light text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {queue === undefined ? (
                  <tr>
                    <td colSpan={5} className="text-left py-12">
                      <Loader2 size={20} className="animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading queue...</p>
                    </td>
                  </tr>
                ) : waitingQueue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-left py-12">
                      <p className="text-sm text-muted-foreground">No patients currently in queue.</p>
                    </td>
                  </tr>
                ) : (
                  waitingQueue.map((consultation: any) => {
                    const waitMs = consultation.scheduledAt
                      ? Date.now() - consultation.scheduledAt
                      : 0;
                    const waitMin = Math.max(0, Math.floor(waitMs / 60000));
                    const waitLabel = waitMin < 60 ? `${waitMin} min` : `${Math.floor(waitMin / 60)}h ${waitMin % 60}m`;
                    const initials = (consultation.patientId ?? "?")
                      .toString()
                      .slice(-2)
                      .toUpperCase();

                    return (
                      <tr key={consultation._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-sm bg-brand-secondary-muted flex items-center justify-center text-xs font-light text-foreground tracking-wide">
                              {initials}
                            </div>
                            <span className="text-sm font-light text-foreground">
                              Patient
                            </span>
                          </div>
                        </td>
                        <td className="text-sm font-light text-muted-foreground">
                          {consultation.type ?? "video"}
                        </td>
                        <td>
                          <Badge variant={consultation.status === "in_progress" ? "warning" : "info"}>
                            {consultation.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 text-sm font-light text-muted-foreground">
                            <Clock size={13} aria-hidden="true" />
                            {waitLabel}
                          </div>
                        </td>
                        <td className="text-right">
                          <button className="px-5 py-2 bg-foreground text-background text-[10px] tracking-[0.15em] uppercase font-light rounded-sm hover:bg-foreground/90 transition-colors">
                            Accept
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid sm:grid-cols-3 gap-5">
          {NAV_CARDS.map((card) => (
            <NavCard
              key={card.title}
              href={card.href}
              icon={card.icon}
              title={card.title}
              description={card.description}
              stat={card.stat}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
