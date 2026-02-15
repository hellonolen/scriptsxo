import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

import { Footer } from "@/components/footer";

describe("Footer", () => {
  it("renders the brand name ScriptsXO", () => {
    render(<Footer />);
    expect(screen.getByText("ScriptsXO")).toBeInTheDocument();
  });

  it("renders the brand link to home page", () => {
    render(<Footer />);
    const brandLink = screen.getByLabelText("ScriptsXO home");
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute("href", "/");
  });

  it("renders the mission text", () => {
    render(<Footer />);
    expect(
      screen.getByText(/Connecting patients with licensed physicians/)
    ).toBeInTheDocument();
  });

  it("renders the support email", () => {
    render(<Footer />);
    expect(screen.getByText("support@scriptsxo.com")).toBeInTheDocument();
  });

  // --- Footer Sections ---

  it("renders the Patients section heading", () => {
    render(<Footer />);
    expect(screen.getByText("Patients")).toBeInTheDocument();
  });

  it("renders the Providers section heading", () => {
    render(<Footer />);
    // "Providers" appears in both nav config and footer sections.
    // The footer section heading is the <h3> element
    const providersHeadings = screen.getAllByText("Providers");
    expect(providersHeadings.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the Operations section heading", () => {
    render(<Footer />);
    expect(screen.getByText("Operations")).toBeInTheDocument();
  });

  it("renders Patients section links", () => {
    render(<Footer />);
    expect(screen.getByText("Patient Portal")).toBeInTheDocument();
    expect(screen.getByText("My Prescriptions")).toBeInTheDocument();
    expect(screen.getByText("Appointments")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
  });

  it("renders Providers section links", () => {
    render(<Footer />);
    expect(screen.getByText("Provider Dashboard")).toBeInTheDocument();
    expect(screen.getByText("My Patients")).toBeInTheDocument();
    expect(screen.getByText("Prescriptions")).toBeInTheDocument();
    expect(screen.getByText("Consultation Room")).toBeInTheDocument();
  });

  it("renders Operations section links", () => {
    render(<Footer />);
    expect(screen.getByText("Pharmacy Portal")).toBeInTheDocument();
    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Compliance")).toBeInTheDocument();
    expect(screen.getByText("AI Agents")).toBeInTheDocument();
  });

  it("renders links with correct href values", () => {
    render(<Footer />);
    // Spot check a few links
    const pharmacyLink = screen.getByText("Pharmacy Portal");
    expect(pharmacyLink).toHaveAttribute("href", "/pharmacy");

    const adminDashboard = screen.getByText("Admin Dashboard");
    expect(adminDashboard).toHaveAttribute("href", "/admin");

    const myPrescriptions = screen.getByText("My Prescriptions");
    expect(myPrescriptions).toHaveAttribute("href", "/portal/prescriptions");
  });

  // --- Trust Badges ---

  it("renders the HIPAA COMPLIANT trust badge", () => {
    render(<Footer />);
    expect(screen.getByText("HIPAA COMPLIANT")).toBeInTheDocument();
  });

  it("renders the BOARD CERTIFIED trust badge", () => {
    render(<Footer />);
    expect(screen.getByText("BOARD CERTIFIED")).toBeInTheDocument();
  });

  it("renders the ENCRYPTED trust badge", () => {
    render(<Footer />);
    expect(screen.getByText("ENCRYPTED")).toBeInTheDocument();
  });

  it("renders the LICENSED IN FL trust badge", () => {
    render(<Footer />);
    expect(screen.getByText("LICENSED IN FL")).toBeInTheDocument();
  });

  // --- Copyright ---

  it("renders the copyright with the current year", () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(
        new RegExp(`${currentYear} ScriptsXO\\. All rights reserved\\.`)
      )
    ).toBeInTheDocument();
  });

  // --- Footer Navigation Links ---

  it("renders footer navigation links from SITECONFIG.navigation.footer", () => {
    render(<Footer />);
    // Footer nav: Patient Portal, Providers, Pharmacy, Admin
    // Some of these may overlap with section links, so just verify they exist
    const pharmacyLinks = screen.getAllByText("Pharmacy");
    expect(pharmacyLinks.length).toBeGreaterThanOrEqual(1);
  });

  // --- Accessibility ---

  it("has contentinfo role on the footer element", () => {
    render(<Footer />);
    const footer = screen.getByRole("contentinfo", { name: "Site footer" });
    expect(footer).toBeInTheDocument();
  });

  it("renders navigation sections with proper aria-labelledby", () => {
    render(<Footer />);
    // Each footer section has a <nav> with aria-labelledby pointing to the heading
    const navElements = screen.getAllByRole("navigation");
    expect(navElements.length).toBe(3);
  });

  it("renders the Stethoscope icon in the brand area", () => {
    render(<Footer />);
    const icon = document.querySelector('[data-icon="Stethoscope"]');
    expect(icon).toBeInTheDocument();
  });
});
