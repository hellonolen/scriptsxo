import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock next/link as a simple anchor tag
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () =>
  new Proxy(
    {},
    {
      get: (_, name) => (props: any) => (
        <span data-icon={String(name)} {...props} />
      ),
    }
  )
);

import { Nav } from "@/components/nav";

describe("Nav", () => {
  it("renders the brand name ScriptsXO", () => {
    render(<Nav />);
    expect(screen.getByText("ScriptsXO")).toBeInTheDocument();
  });

  it("renders a link to /portal with the brand name", () => {
    render(<Nav />);
    const brandLink = screen.getByLabelText("ScriptsXO home");
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute("href", "/portal");
  });

  it("renders navigation links from SITECONFIG.navigation.main", () => {
    render(<Nav />);
    // The config has: Patient Portal, Providers, Admin
    // These appear in both desktop and mobile menus, so use getAllByText
    const patientPortalLinks = screen.getAllByText("Patient Portal");
    expect(patientPortalLinks.length).toBeGreaterThanOrEqual(1);

    const providersLinks = screen.getAllByText("Providers");
    expect(providersLinks.length).toBeGreaterThanOrEqual(1);

    const adminLinks = screen.getAllByText("Admin");
    expect(adminLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders navigation links with correct href values", () => {
    render(<Nav />);
    // Desktop nav links (role="menuitem")
    const menuItems = screen.getAllByRole("menuitem");
    const hrefs = menuItems.map((item) => item.getAttribute("href"));
    expect(hrefs).toContain("/portal");
    expect(hrefs).toContain("/provider");
    expect(hrefs).toContain("/admin");
  });

  it("renders the Account link pointing to /access", () => {
    render(<Nav />);
    const accountLinks = screen.getAllByText("Account");
    expect(accountLinks.length).toBeGreaterThanOrEqual(1);
    // Check that at least one Account link points to /access
    const hasAccessHref = accountLinks.some(
      (link) => link.getAttribute("href") === "/access"
    );
    expect(hasAccessHref).toBe(true);
  });

  it("has the mobile menu toggle button", () => {
    render(<Nav />);
    const toggleButton = screen.getByLabelText("Open menu");
    expect(toggleButton).toBeInTheDocument();
  });

  it("has aria-expanded set to false on the toggle button initially", () => {
    render(<Nav />);
    const toggleButton = screen.getByLabelText("Open menu");
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles mobile menu when button is clicked", () => {
    render(<Nav />);
    const toggleButton = screen.getByLabelText("Open menu");

    // Mobile menu should not be visible initially
    expect(
      screen.queryByRole("menu", { name: "Mobile navigation" })
    ).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(toggleButton);

    // After opening, the button label changes to "Close menu"
    const closeButton = screen.getByLabelText("Close menu");
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveAttribute("aria-expanded", "true");

    // Mobile menu should now be visible
    expect(
      screen.getByRole("menu", { name: "Mobile navigation" })
    ).toBeInTheDocument();
  });

  it("closes mobile menu when Escape key is pressed", () => {
    render(<Nav />);

    // Open the menu
    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(
      screen.getByRole("menu", { name: "Mobile navigation" })
    ).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: "Escape" });

    // Menu should close
    expect(
      screen.queryByRole("menu", { name: "Mobile navigation" })
    ).not.toBeInTheDocument();
  });

  it("renders with role=navigation and proper aria-label", () => {
    render(<Nav />);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toBeInTheDocument();
  });

  it("renders desktop menubar", () => {
    render(<Nav />);
    const menubar = screen.getByRole("menubar");
    expect(menubar).toBeInTheDocument();
  });

  it("locks body scroll when mobile menu is open and unlocks when closed", () => {
    render(<Nav />);

    // Open the menu
    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(document.body.style.overflow).toBe("hidden");

    // Close the menu
    fireEvent.click(screen.getByLabelText("Close menu"));
    expect(document.body.style.overflow).toBe("");
  });

  it("closes mobile menu when a navigation link is clicked", () => {
    render(<Nav />);

    // Open the menu
    fireEvent.click(screen.getByLabelText("Open menu"));
    const mobileMenu = screen.getByRole("menu", {
      name: "Mobile navigation",
    });
    expect(mobileMenu).toBeInTheDocument();

    // Click a link within the mobile menu
    const mobileLinks = mobileMenu.querySelectorAll("a");
    expect(mobileLinks.length).toBeGreaterThan(0);
    fireEvent.click(mobileLinks[0]);

    // Menu should close
    expect(
      screen.queryByRole("menu", { name: "Mobile navigation" })
    ).not.toBeInTheDocument();
  });
});
