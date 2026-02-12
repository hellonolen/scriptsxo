"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback, useId } from "react";
import { Menu, X } from "lucide-react";
import { SITECONFIG } from "@/lib/config";

const NAV_LINKS = SITECONFIG.navigation.main;

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuId = useId();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    },
    [mobileOpen]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/60"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/portal"
          className="flex items-center gap-3"
          aria-label={`${SITECONFIG.brand.name} home`}
        >
          <span className="text-lg tracking-[0.2em] text-foreground font-light uppercase">
            {SITECONFIG.brand.name}
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8" role="menubar">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[11px] tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors py-2 uppercase font-light"
              role="menuitem"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Side */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/access"
            className="px-6 py-2.5 bg-foreground text-background text-[10px] tracking-[0.2em] hover:bg-foreground/90 transition-all duration-300 uppercase font-light"
          >
            Account
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-muted-foreground hover:text-foreground"
            aria-expanded={mobileOpen}
            aria-controls={mobileMenuId}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X size={22} aria-hidden="true" />
            ) : (
              <Menu size={22} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          id={mobileMenuId}
          ref={mobileMenuRef}
          className="md:hidden bg-background border-t border-border px-6 sm:px-8 py-8 space-y-6"
          role="menu"
          aria-label="Mobile navigation"
        >
          <div className="space-y-4" role="group" aria-label="Main links">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm text-muted-foreground hover:text-foreground py-1 tracking-wide font-light"
                role="menuitem"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-6 border-t border-border" role="group" aria-label="Account">
            <Link
              href="/access"
              onClick={() => setMobileOpen(false)}
              className="block text-center px-6 py-3 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase font-light"
              role="menuitem"
            >
              Account
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
