import { describe, it, expect } from "vitest";
import { SITECONFIG, formatPrice } from "@/lib/config";

describe("SITECONFIG", () => {
  it("has all required top-level keys", () => {
    const requiredKeys = [
      "brand",
      "visuals",
      "auth",
      "billing",
      "features",
      "navigation",
      "specialties",
    ];
    for (const key of requiredKeys) {
      expect(SITECONFIG).toHaveProperty(key);
    }
  });

  describe("brand", () => {
    it("has brand name set to ScriptsXO", () => {
      expect(SITECONFIG.brand.name).toBe("ScriptsXO");
    });

    it("has a non-empty tagline", () => {
      expect(SITECONFIG.brand.tagline).toBeTruthy();
      expect(typeof SITECONFIG.brand.tagline).toBe("string");
    });

    it("has required contact fields", () => {
      expect(SITECONFIG.brand.domain).toBe("scriptsxo.com");
      expect(SITECONFIG.brand.email).toBe("hello@scriptsxo.com");
      expect(SITECONFIG.brand.supportEmail).toBe("support@scriptsxo.com");
      expect(SITECONFIG.brand.phone).toBeTruthy();
      expect(SITECONFIG.brand.phoneNumber).toBeTruthy();
    });
  });

  describe("visuals", () => {
    it("has a primary color defined", () => {
      expect(SITECONFIG.visuals.primaryColor).toBe("#0D6E8A");
    });

    it("has image paths defined", () => {
      expect(SITECONFIG.visuals.images.logo).toBeTruthy();
      expect(SITECONFIG.visuals.images.favicon).toBeTruthy();
      expect(SITECONFIG.visuals.images.ogImage).toBeTruthy();
    });
  });

  describe("auth", () => {
    it("uses Passkey authentication type", () => {
      expect(SITECONFIG.auth.type).toBe("Passkey");
    });

    it("has session duration of 60 days", () => {
      expect(SITECONFIG.auth.sessionDays).toBe(60);
    });

    it("has admin emails list with at least one entry", () => {
      expect(SITECONFIG.auth.adminEmails.length).toBeGreaterThan(0);
      expect(SITECONFIG.auth.adminEmails).toContain("hellonolen@gmail.com");
    });
  });

  describe("billing", () => {
    it("has consultation fee of 9700 cents ($97)", () => {
      expect(SITECONFIG.billing.consultationFee).toBe(9700);
    });

    it("uses Stripe as billing provider", () => {
      expect(SITECONFIG.billing.provider).toBe("Stripe");
    });

    it("uses USD currency", () => {
      expect(SITECONFIG.billing.currency).toBe("USD");
    });
  });

  describe("features", () => {
    it("has passkeys enabled", () => {
      expect(SITECONFIG.features.enablePasskeys).toBe(true);
    });

    it("has maintenance mode disabled by default", () => {
      expect(SITECONFIG.features.maintenanceMode).toBe(false);
    });

    it("has expected boolean feature flags", () => {
      expect(typeof SITECONFIG.features.enableSubscriptions).toBe("boolean");
      expect(typeof SITECONFIG.features.enableInsurance).toBe("boolean");
      expect(typeof SITECONFIG.features.enableVideoConsultation).toBe("boolean");
      expect(typeof SITECONFIG.features.enableAITriage).toBe("boolean");
      expect(typeof SITECONFIG.features.enableEPrescribe).toBe("boolean");
      expect(typeof SITECONFIG.features.enableAnalytics).toBe("boolean");
    });
  });

  describe("navigation", () => {
    it("has main navigation with portal and admin links", () => {
      const labels = SITECONFIG.navigation.main.map((item) => item.label);
      expect(labels).toContain("Patient Portal");
      expect(labels).toContain("Admin");
    });

    it("has footer navigation items", () => {
      expect(SITECONFIG.navigation.footer.length).toBeGreaterThan(0);
    });

    it("navigation items have label and href", () => {
      for (const item of SITECONFIG.navigation.main) {
        expect(item.label).toBeTruthy();
        expect(item.href).toBeTruthy();
        expect(item.href.startsWith("/")).toBe(true);
      }
    });
  });

  describe("specialties", () => {
    it("contains expected medical specialties", () => {
      expect(SITECONFIG.specialties).toContain("General Medicine");
      expect(SITECONFIG.specialties).toContain("Dermatology");
      expect(SITECONFIG.specialties).toContain("Mental Health");
    });

    it("has 8 specialties", () => {
      expect(SITECONFIG.specialties).toHaveLength(8);
    });
  });
});

describe("formatPrice", () => {
  it("formats zero cents as $0.00", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("formats 100 cents as $1.00", () => {
    expect(formatPrice(100)).toBe("$1.00");
  });

  it("formats 9700 cents (consultation fee) as $97.00", () => {
    expect(formatPrice(9700)).toBe("$97.00");
  });

  it("formats 1 cent as $0.01", () => {
    expect(formatPrice(1)).toBe("$0.01");
  });

  it("formats large amount 999999 cents as $9,999.99", () => {
    expect(formatPrice(999999)).toBe("$9,999.99");
  });

  it("formats 50 cents as $0.50", () => {
    expect(formatPrice(50)).toBe("$0.50");
  });

  it("formats 1099 cents as $10.99", () => {
    expect(formatPrice(1099)).toBe("$10.99");
  });

  it("handles negative values", () => {
    expect(formatPrice(-500)).toBe("-$5.00");
  });
});
