"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Pill,
  Video,
  ClipboardList,
  MessageSquare,
  Users,
  Package,
  Stethoscope,
  BarChart3,
  ShieldCheck,
  Settings,
  Menu,
  X,
  ExternalLink,
  UserCog,
} from "lucide-react";
import { useState, useMemo } from "react";
import { SITECONFIG, term } from "@/lib/config";
import {
  CAP,
  Capability,
  Role,
  hasAnyCap,
  getPrimaryRole,
  parseRolesFromSession,
  roleLabel,
} from "@/lib/capabilities";
import { getSessionCookie, isAdmin as checkIsAdmin } from "@/lib/auth";
import { PageContextTracker } from "@/components/page-context-tracker";

/* -----------------------------------------------------------------------
   Nav item type
   ----------------------------------------------------------------------- */

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  caps: Capability[];
  href: string;
  hrefByRole?: Partial<Record<Role, string>>;
  matchPaths?: string[];
}

/* -----------------------------------------------------------------------
   Unified nav definition
   ----------------------------------------------------------------------- */

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    caps: [CAP.VIEW_DASHBOARD],
    href: "/dashboard",
    hrefByRole: {
      provider: "/provider",
      nurse: "/provider",
      pharmacy: "/pharmacy",
      admin: "/admin",
      unverified: "/access/setup",
    },
    matchPaths: ["/dashboard", "/provider", "/pharmacy", "/admin", "/access/setup", "/onboard"],
  },
  {
    id: "intake",
    label: "Intake",
    icon: ClipboardList,
    caps: [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW],
    href: "/intake/symptoms",
    hrefByRole: {
      provider: "/intake",
      nurse: "/intake",
    },
    matchPaths: ["/intake", "/start"],
  },
  {
    id: "consultation",
    label: "Consultation",
    icon: Video,
    caps: [CAP.CONSULT_START, CAP.CONSULT_JOIN],
    href: "/consultation/waiting-room",
    hrefByRole: {
      provider: "/consultation/waiting-room",
      nurse: "/consultation/waiting-room",
    },
    matchPaths: ["/consultation", "/provider/consultation"],
  },
  {
    id: "prescriptions",
    label: "Prescriptions",
    icon: Pill,
    caps: [CAP.RX_VIEW],
    href: "/dashboard/prescriptions",
    hrefByRole: {
      provider: "/provider/prescriptions",
      nurse: "/provider/prescriptions",
      admin: "/admin/prescriptions",
    },
    matchPaths: [
      "/dashboard/prescriptions",
      "/provider/prescriptions",
      "/admin/prescriptions",
    ],
  },
  {
    id: "workflows",
    label: "Workflows",
    icon: ClipboardList,
    caps: [CAP.WORKFLOW_VIEW],
    href: "/workflows",
    matchPaths: ["/workflows"],
  },
  {
    id: "messages",
    label: "Messages",
    icon: MessageSquare,
    caps: [CAP.MSG_VIEW],
    href: "/dashboard/messages",
    matchPaths: ["/dashboard/messages", "/messages"],
  },
  {
    id: "pharmacy-ops",
    label: "Pharmacy Ops",
    icon: Package,
    caps: [CAP.PHARMACY_QUEUE],
    href: "/pharmacy",
    matchPaths: ["/pharmacy"],
  },
  {
    id: "patients",
    label: term("titlePlural"),
    icon: Users,
    caps: [CAP.PATIENT_VIEW],
    href: "/provider/patients",
    hrefByRole: {
      admin: "/admin/clients",
    },
    matchPaths: ["/provider/patients", "/admin/clients"],
  },
  {
    id: "providers",
    label: "Providers",
    icon: Stethoscope,
    caps: [CAP.PROVIDER_MANAGE],
    href: "/admin/providers",
  },
  {
    id: "reporting",
    label: "Reporting",
    icon: BarChart3,
    caps: [CAP.REPORT_VIEW],
    href: "/admin/analytics",
  },
  {
    id: "audit-logs",
    label: "Audit Logs",
    icon: ShieldCheck,
    caps: [CAP.AUDIT_VIEW],
    href: "/admin/compliance",
  },
  {
    id: "users-access",
    label: "Users & Access",
    icon: UserCog,
    caps: [CAP.USER_MANAGE],
    href: "/admin/users",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    caps: [CAP.SETTINGS_VIEW],
    href: "/admin/settings",
  },
];

/* -----------------------------------------------------------------------
   href resolution
   ----------------------------------------------------------------------- */

function resolveHref(item: NavItem, primaryRole: Role): string {
  return item.hrefByRole?.[primaryRole] ?? item.href;
}

/* -----------------------------------------------------------------------
   Component props
   ----------------------------------------------------------------------- */

interface AppShellProps {
  children: React.ReactNode;
  /** Optional content rendered below nav links in the sidebar (e.g. step progress) */
  sidebarExtra?: React.ReactNode;
}

/* -----------------------------------------------------------------------
   Component
   ----------------------------------------------------------------------- */

export function AppShell({ children, sidebarExtra }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Compute session synchronously so nav renders correctly on first paint —
  // no useEffect flash. getSessionCookie() reads document.cookie which is
  // available immediately on the client. On the server (SSR) it returns null.
  const session = getSessionCookie();

  const userName: string = session?.name
    || session?.email?.split("@")[0]
    || "Guest";

  const userEmail: string | null = session?.email || null;

  const roles: Role[] = (() => {
    if (!session) return ["unverified"];
    if (checkIsAdmin()) return ["admin"];
    return parseRolesFromSession(session.role);
  })();

  const primaryRole = useMemo(() => getPrimaryRole(roles), [roles]);

  const initials = useMemo(() => {
    if (!userName) return "??";
    return userName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [userName]);

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => hasAnyCap(roles, item.caps)),
    [roles]
  );

  /* -----------------------------------------------------------------------
     Active link detection
     ----------------------------------------------------------------------- */

  const DASHBOARD_ROOTS = ["/dashboard", "/provider", "/pharmacy", "/admin"];

  function isLinkActive(item: NavItem): boolean {
    const resolved = resolveHref(item, primaryRole);
    const isRoot = DASHBOARD_ROOTS.includes(resolved);

    if (
      item.matchPaths?.some(
        (p) =>
          pathname === p ||
          (!DASHBOARD_ROOTS.includes(p) && pathname.startsWith(p + "/"))
      )
    ) {
      return true;
    }

    if (isRoot) return pathname === resolved;
    return pathname === resolved || pathname.startsWith(resolved + "/");
  }

  /* -----------------------------------------------------------------------
     Nav links renderer
     ----------------------------------------------------------------------- */

  function renderNavLinks(onLinkClick?: () => void) {
    return (
      <div className="space-y-0.5">
        {visibleNavItems.map((item) => {
          const href = resolveHref(item, primaryRole);
          const isActive = isLinkActive(item);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={href}
              onClick={onLinkClick}
              className="flex items-center gap-2.5 px-3 py-2 text-[12px] rounded-lg transition-all duration-200"
              style={{
                color: isActive ? "#FFFFFF" : "var(--sidebar-foreground)",
                background: isActive ? "var(--sidebar-accent)" : "transparent",
                fontWeight: isActive ? 500 : 400,
              }}
            >
              <Icon size={14} aria-hidden="true" />
              {item.label}
              {isActive && (
                <div
                  className="ml-auto w-1 h-1 rounded-full"
                  style={{ background: "var(--sidebar-primary)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    );
  }

  /* -----------------------------------------------------------------------
     User section (shared between desktop and mobile)
     ----------------------------------------------------------------------- */

  function renderUserSection() {
    return (
      <div
        className="px-3 py-3"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-medium shrink-0"
            style={{
              background: "var(--brand-gradient)",
              color: "#FFFFFF",
            }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p
              className="text-[12px] font-medium truncate"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              {userName || "Guest"}
            </p>
            <p
              className="text-[11px]"
              style={{ color: "var(--sidebar-foreground)" }}
            >
              {roleLabel(primaryRole)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* -----------------------------------------------------------------------
     Render
     ----------------------------------------------------------------------- */

  return (
    <div className="min-h-screen flex">
      {/* ===== Desktop Sidebar ===== */}
      <aside className="hidden lg:flex flex-col w-[260px] fixed inset-y-0 left-0 z-40 bg-sidebar-background">
        {/* Logo */}
        <div className="px-5 h-[52px] flex items-center">
          <Link
            href="/dashboard"
            className="text-[13px] tracking-[0.18em] font-medium uppercase"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {SITECONFIG.brand.name}
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-1 overflow-y-auto">
          {renderNavLinks()}
        </nav>

        {/* Sidebar extra */}
        {sidebarExtra && (
          <div className="px-3 pb-2 border-t border-sidebar-border mt-1 pt-3">
            {sidebarExtra}
          </div>
        )}

        {/* Back to Website */}
        <div className="px-2 pb-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 text-[12px] rounded-lg transition-all duration-200"
            style={{ color: "var(--sidebar-foreground)" }}
          >
            <ExternalLink size={14} aria-hidden="true" />
            Back to Website
          </Link>
        </div>

        {/* User section */}
        {renderUserSection()}
      </aside>

      {/* ===== Mobile Header ===== */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-5 bg-sidebar-background border-b border-sidebar-border">
        <Link
          href="/dashboard"
          className="text-[11px] tracking-[0.2em] font-medium uppercase"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          {SITECONFIG.brand.name}
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg"
          style={{ color: "var(--sidebar-foreground)" }}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ===== Mobile Sidebar Overlay ===== */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col animate-slide-in-left bg-sidebar-background">
            <div className="px-5 h-14 flex items-center justify-between">
              <span
                className="text-[11px] tracking-[0.2em] font-medium uppercase"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                {SITECONFIG.brand.name}
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1"
                style={{ color: "var(--sidebar-foreground)" }}
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 px-3 py-1 overflow-y-auto">
              {renderNavLinks(() => setMobileOpen(false))}

              {sidebarExtra && (
                <div className="mt-3 pt-3 border-t border-sidebar-border">
                  {sidebarExtra}
                </div>
              )}

              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-[13px] rounded-xl transition-all duration-200 mt-4"
                style={{
                  color: "var(--sidebar-foreground)",
                  borderTop: "1px solid var(--sidebar-border)",
                  paddingTop: "1rem",
                }}
              >
                <ExternalLink size={16} aria-hidden="true" />
                Back to Website
              </Link>
            </nav>

            {renderUserSection()}
          </aside>
        </>
      )}

      {/* ===== Main Content ===== */}
      <main className="flex-1 lg:ml-[260px] pt-14 lg:pt-0 min-h-screen mesh-bg bg-background">
        <div className="relative z-10">{children}</div>
      </main>

      <PageContextTracker />
    </div>
  );
}
