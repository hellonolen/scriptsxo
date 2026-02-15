"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Pill,
  Receipt,
  Calendar,
  FileText,
  Menu,
  X,
  Stethoscope,
  Users,
  ExternalLink,
  ClipboardList,
  DollarSign,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { SITECONFIG } from "@/lib/config";
import { getSessionCookie, isAdmin as checkIsAdmin } from "@/lib/auth";
import { PageContextTracker } from "@/components/page-context-tracker";
import { MessageSquare } from "lucide-react";

const CLIENT_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/prescriptions", label: "Prescriptions", icon: Pill },
  { href: "/dashboard/appointments", label: "Appointments", icon: Calendar },
  { href: "/dashboard/billing", label: "Billing", icon: Receipt },
] as const;

const PROVIDER_NAV = [
  { href: "/provider", label: "Queue", icon: ClipboardList },
  { href: "/provider/patients", label: "Clients", icon: Users },
  { href: "/provider/schedule", label: "Schedule", icon: Calendar },
  { href: "/provider/payouts", label: "Payouts", icon: DollarSign },
] as const;

const ADMIN_NAV = [
  { href: "/admin", label: "Admin Panel", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/providers", label: "Providers", icon: Stethoscope },
  { href: "/admin/prescriptions", label: "Prescriptions", icon: Pill },
  { href: "/admin/fax-logs", label: "Fax Logs", icon: FileText },
] as const;

interface AppShellProps {
  children: React.ReactNode;
  /** Optional content rendered below nav links in the sidebar (e.g. step progress) */
  sidebarExtra?: React.ReactNode;
}

export function AppShell({ children, sidebarExtra }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [adminAccess, setAdminAccess] = useState(false);

  useEffect(() => {
    const session = getSessionCookie();
    if (session) {
      setUserName(session.name || session.email.split("@")[0]);
      setUserEmail(session.email);
    }
    // In dev, always show full nav including admin
    const isDev = process.env.NODE_ENV === "development";
    setAdminAccess(isDev || checkIsAdmin());
    if (isDev && !session) {
      setUserName("Nolen");
      setUserEmail("nolen@doclish.com");
    }
  }, []);

  const initials = useMemo(() => {
    if (!userName) return "??";
    return userName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [userName]);

  const isProviderRoute = pathname.startsWith("/provider");
  const isAdminRoute = pathname.startsWith("/admin");
  const isMessagesRoute = pathname === "/dashboard/messages" || pathname === "/start" || pathname === "/dashboard/order";

  /** Build nav as sections with labels for clear separation */
  type NavSection = { label: string | null; items: ReadonlyArray<{ href: string; label: string; icon: typeof LayoutDashboard }> };

  const sidebarSections = useMemo(() => {
    const sections: NavSection[] = [];

    if (isProviderRoute) {
      sections.push({ label: null, items: PROVIDER_NAV });
    } else if (isAdminRoute) {
      sections.push({ label: null, items: ADMIN_NAV });
    } else {
      sections.push({ label: null, items: CLIENT_NAV });
    }

    // Admin users get extra sections with labels
    if (adminAccess) {
      if (!isProviderRoute) {
        sections.push({ label: "Provider", items: PROVIDER_NAV });
      }
      if (!isAdminRoute) {
        sections.push({ label: "Admin", items: ADMIN_NAV });
      }
    }

    return sections;
  }, [adminAccess, isProviderRoute, isAdminRoute]);

  return (
    <div className="min-h-screen flex">
      {/* ===== Desktop Sidebar — Deep rich panel ===== */}
      <aside
        className="hidden lg:flex flex-col w-[260px] fixed inset-y-0 left-0 z-40 bg-sidebar-background"
      >
        {/* Logo area */}
        <div className="px-6 h-[72px] flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-[13px] tracking-[0.18em] font-medium uppercase"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {SITECONFIG.brand.name}
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {sidebarSections.map((section, sIdx) => (
            <div key={section.label || sIdx}>
              {/* Section divider + label for secondary sections */}
              {section.label && (
                <div className="mt-4 mb-2 px-4">
                  <div className="border-t border-sidebar-border mb-3" />
                  <p className="text-[9px] tracking-[0.2em] uppercase font-medium" style={{ color: "var(--sidebar-foreground)" }}>
                    {section.label}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((link) => {
                  const exactRoots = ["/dashboard", "/provider", "/admin"];
                  const isExactRoot = exactRoots.includes(link.href);
                  // Messages link is active on /dashboard/messages, /start, and /dashboard/order
                  const isActive = link.href === "/dashboard/messages"
                    ? isMessagesRoute
                    : isExactRoot
                      ? pathname === link.href
                      : pathname === link.href || pathname.startsWith(link.href + "/");
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-3 px-4 py-3 text-[13px] rounded-xl transition-all duration-200"
                      style={{
                        color: isActive ? "#FFFFFF" : "var(--sidebar-foreground)",
                        background: isActive
                          ? "var(--sidebar-accent)"
                          : "transparent",
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      <link.icon size={16} aria-hidden="true" />
                      {link.label}
                      {isActive && (
                        <div
                          className="ml-auto w-1.5 h-1.5 rounded-full"
                          style={{ background: "#A78BFA" }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar extra content (e.g. step progress on Messages page) */}
        {sidebarExtra && (
          <div className="px-3 pb-2 border-t border-sidebar-border mt-1 pt-3">
            {sidebarExtra}
          </div>
        )}

        {/* Back to Website */}
        <div className="px-3 pb-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 text-[13px] rounded-xl transition-all duration-200"
            style={{ color: "var(--sidebar-foreground)" }}
          >
            <ExternalLink size={16} aria-hidden="true" />
            Back to Website
          </Link>
        </div>

        {/* User section */}
        <div
          className="px-4 py-5"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-medium"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #2DD4BF)",
                color: "#FFFFFF",
              }}
            >
              {initials}
            </div>
            <div>
              <p
                className="text-[13px] font-medium"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                {userName || "Guest"}
              </p>
              <p className="text-[11px]" style={{ color: "var(--sidebar-foreground)" }}>
                {adminAccess ? "Admin" : "Client"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== Mobile Header ===== */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-5 bg-sidebar-background border-b border-sidebar-border"
      >
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
          <aside
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col animate-slide-in-left bg-sidebar-background"
          >
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
            <nav className="flex-1 px-3 py-3 overflow-y-auto">
              {sidebarSections.map((section, sIdx) => (
                <div key={section.label || sIdx}>
                  {section.label && (
                    <div className="mt-4 mb-2 px-4">
                      <div className="border-t border-sidebar-border mb-3" />
                      <p className="text-[9px] tracking-[0.2em] uppercase font-medium" style={{ color: "var(--sidebar-foreground)" }}>
                        {section.label}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    {section.items.map((link) => {
                      const exactRoots = ["/dashboard", "/provider", "/admin"];
                      const isExactRoot = exactRoots.includes(link.href);
                      const isActive = link.href === "/dashboard/messages"
                        ? isMessagesRoute
                        : isExactRoot
                          ? pathname === link.href
                          : pathname === link.href || pathname.startsWith(link.href + "/");
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-[13px] rounded-xl transition-all duration-200"
                          style={{
                            color: isActive ? "#FFFFFF" : "var(--sidebar-foreground)",
                            background: isActive
                              ? "var(--sidebar-accent)"
                              : "transparent",
                            fontWeight: isActive ? 500 : 400,
                          }}
                        >
                          <link.icon size={16} aria-hidden="true" />
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Mobile: sidebar extra (step progress) */}
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
          </aside>
        </>
      )}

      {/* ===== Main Content — Mesh gradient bg ===== */}
      <main className="flex-1 lg:ml-[260px] pt-14 lg:pt-0 min-h-screen mesh-bg bg-background">
        <div className="relative z-10">{children}</div>
      </main>

      {/* Silent page context tracker — no UI, feeds LLM awareness */}
      <PageContextTracker />
    </div>
  );
}
