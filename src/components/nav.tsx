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
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="editorial-container h-20 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="text-[13px] tracking-[0.35em] text-foreground font-light uppercase"
          aria-label={`${SITECONFIG.brand.name} home`}
        >
          {SITECONFIG.brand.name}
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10" role="menubar">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[11px] tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors uppercase"
              role="menuitem"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/access"
            className="text-[11px] tracking-[0.15em] text-foreground uppercase border-b border-foreground/30 hover:border-foreground transition-colors pb-0.5"
          >
            Account
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={mobileOpen}
          aria-controls={mobileMenuId}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X size={20} aria-hidden="true" />
          ) : (
            <Menu size={20} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          id={mobileMenuId}
          ref={mobileMenuRef}
          className="md:hidden bg-background px-8 lg:px-16 py-12 space-y-8 border-t border-border/15"
          role="menu"
          aria-label="Mobile navigation"
        >
          <div className="space-y-5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors tracking-wide"
                role="menuitem"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="pt-8 border-t border-border/15">
            <Link
              href="/access"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-foreground font-light tracking-wide"
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
