"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Pill,
  MessageSquare,
  Receipt,
  Calendar,
  Bot,
  FileText,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { SITECONFIG } from "@/lib/config";
import { getSessionCookie, isAdmin as checkIsAdmin } from "@/lib/auth";

const PATIENT_NAV = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/consultation", label: "AI Concierge", icon: Bot },
  { href: "/portal/prescriptions", label: "Prescriptions", icon: Pill },
  { href: "/portal/messages", label: "Messages", icon: MessageSquare },
  { href: "/portal/appointments", label: "Appointments", icon: Calendar },
  { href: "/portal/billing", label: "Billing", icon: Receipt },
  { href: "/intake", label: "New Intake", icon: FileText },
] as const;

const ADMIN_NAV = [
  { href: "/admin", label: "Admin Panel", icon: LayoutDashboard },
  { href: "/provider", label: "Provider View", icon: FileText },
] as const;

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
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
    setAdminAccess(checkIsAdmin());
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

  const sidebarNav = useMemo(() => {
    if (adminAccess) {
      return [...PATIENT_NAV, ...ADMIN_NAV];
    }
    return [...PATIENT_NAV];
  }, [adminAccess]);

  return (
    <div className="min-h-screen flex">
      {/* ===== Desktop Sidebar — Deep rich panel ===== */}
      <aside
        className="hidden lg:flex flex-col w-[260px] fixed inset-y-0 left-0 z-40 bg-sidebar-background"
      >
        {/* Logo area */}
        <div className="px-6 h-[72px] flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7C3AED, #E11D48)" }}
          >
            <Zap size={14} className="text-white" aria-hidden="true" />
          </div>
          <Link
            href="/portal"
            className="text-[13px] tracking-[0.18em] font-medium uppercase"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {SITECONFIG.brand.name}
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {sidebarNav.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/portal" && pathname.startsWith(link.href));
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
        </nav>

        {/* User section */}
        <div
          className="px-4 py-5"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-medium"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #E11D48)",
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
                {adminAccess ? "Admin" : "Patient"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== Mobile Header ===== */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-5 bg-sidebar-background border-b border-sidebar-border"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7C3AED, #E11D48)" }}
          >
            <Zap size={12} className="text-white" aria-hidden="true" />
          </div>
          <Link
            href="/portal"
            className="text-[11px] tracking-[0.2em] font-medium uppercase"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {SITECONFIG.brand.name}
          </Link>
        </div>
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
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #E11D48)" }}
                >
                  <Zap size={12} className="text-white" aria-hidden="true" />
                </div>
                <span
                  className="text-[11px] tracking-[0.2em] font-medium uppercase"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {SITECONFIG.brand.name}
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1"
                style={{ color: "var(--sidebar-foreground)" }}
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-1">
              {sidebarNav.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/portal" && pathname.startsWith(link.href));
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
            </nav>
          </aside>
        </>
      )}

      {/* ===== Main Content — Mesh gradient bg ===== */}
      <main className="flex-1 lg:ml-[260px] pt-14 lg:pt-0 min-h-screen mesh-bg bg-background">
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}
