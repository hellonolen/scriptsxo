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
  ExternalLink,
  UserCog,
  MapPin,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
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
import { AIConcierge } from "@/components/ai-concierge";

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
    id: "tracking",
    label: "Tracking",
    icon: MapPin,
    caps: [CAP.REPORT_VIEW],
    href: "/admin/tracking",
    matchPaths: ["/admin/tracking"],
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
  /** Optional content rendered below the tab nav (e.g. step progress in intake flow) */
  sidebarExtra?: React.ReactNode;
}

/* -----------------------------------------------------------------------
   Component
   ----------------------------------------------------------------------- */

export function AppShell({ children, sidebarExtra }: AppShellProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Use null on first render (matches SSR) then hydrate from cookie on client.
  // This eliminates the React hydration mismatch error.
  const [session, setSession] = useState<ReturnType<typeof getSessionCookie>>(null);

  useEffect(() => {
    setSession(getSessionCookie());
    setMounted(true);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const userName: string = session?.name
    || session?.email?.split("@")[0]
    || "Guest";

  const roles: Role[] = (() => {
    if (!mounted || !session) return ["unverified"];
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
     Render
     ----------------------------------------------------------------------- */

  return (
    <div className="min-h-screen flex flex-col">

      {/* ===== Top Header (64px) ===== */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6"
        style={{
          height: "64px",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        {/* Logo — left */}
        <Link
          href="/dashboard"
          className="text-[13px] tracking-[0.18em] font-medium uppercase shrink-0"
          style={{ color: "#1B2A4A" }}
        >
          {SITECONFIG.brand.name}
        </Link>

        {/* Right: user section */}
        <div className="flex items-center gap-3" ref={userMenuRef}>
          {/* Back to website link — subtle */}
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 text-[12px] transition-colors"
            style={{ color: "#64748b" }}
          >
            <ExternalLink size={13} aria-hidden="true" />
            Website
          </Link>

          {/* Divider */}
          <div className="hidden sm:block w-px h-4" style={{ background: "#e2e8f0" }} />

          {/* User avatar + name + role — triggers dropdown */}
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
            style={{
              background: userMenuOpen ? "#f1f5f9" : "transparent",
            }}
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
          >
            {/* Initials avatar */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-medium shrink-0"
              style={{
                background: "var(--brand-gradient)",
                color: "#FFFFFF",
              }}
            >
              {initials}
            </div>

            {/* Name + role */}
            <div className="hidden sm:block text-left">
              <p
                className="text-[12px] font-medium leading-none"
                style={{ color: "#1B2A4A" }}
              >
                {userName}
              </p>
              <p
                className="text-[11px] leading-none mt-0.5"
                style={{ color: "#64748b" }}
              >
                {roleLabel(primaryRole)}
              </p>
            </div>

            <ChevronDown
              size={13}
              className="hidden sm:block transition-transform"
              style={{
                color: "#64748b",
                transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <div
              className="absolute top-[58px] right-4 w-48 rounded-xl shadow-lg border overflow-hidden z-50"
              style={{
                background: "#ffffff",
                borderColor: "#e2e8f0",
                boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
              }}
            >
              {/* User info header */}
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid #f1f5f9" }}
              >
                <p className="text-[12px] font-medium truncate" style={{ color: "#1B2A4A" }}>
                  {userName}
                </p>
                <p className="text-[11px] truncate" style={{ color: "#64748b" }}>
                  {roleLabel(primaryRole)}
                </p>
              </div>

              {/* Actions */}
              <div className="py-1">
                <Link
                  href="/"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors hover:bg-slate-50"
                  style={{ color: "#64748b" }}
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  Back to Website
                </Link>

                <Link
                  href="/api/auth/signout"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors hover:bg-slate-50"
                  style={{ color: "#dc2626" }}
                >
                  <LogOut size={13} aria-hidden="true" />
                  Sign Out
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ===== Horizontal Tab Nav (below header, sticky) ===== */}
      <nav
        className="fixed left-0 right-0 z-40 flex items-end overflow-x-auto scrollbar-hide"
        style={{
          top: "64px",
          height: "44px",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div className="flex items-end h-full px-4 gap-0" style={{ minWidth: "max-content" }}>
          {visibleNavItems.map((item) => {
            const href = resolveHref(item, primaryRole);
            const isActive = isLinkActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={href}
                className="relative flex items-center gap-1.5 h-full transition-colors whitespace-nowrap"
                style={{
                  padding: "0 20px",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#1B2A4A" : "#64748b",
                  borderBottom: isActive
                    ? "3px solid #0D9488"
                    : "3px solid transparent",
                }}
              >
                <Icon size={13} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ===== sidebarExtra strip (optional — renders below tab nav) ===== */}
      {sidebarExtra && (
        <div
          className="fixed left-0 right-0 z-30 px-6 py-2"
          style={{
            top: "108px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          {sidebarExtra}
        </div>
      )}

      {/* ===== Main Content Area ===== */}
      <main
        className="flex-1 min-h-screen mesh-bg"
        style={{
          paddingTop: sidebarExtra ? "144px" : "108px",
          background: "#f0f4f8",
        }}
      >
        <div className="relative z-10" style={{ padding: "28px 32px" }}>
          {children}
        </div>
      </main>

      <PageContextTracker />
      <AIConcierge context={{ userRole: primaryRole, userEmail: session?.email }} />
    </div>
  );
}
