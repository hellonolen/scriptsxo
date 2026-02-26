import { describe, it, expect } from "vitest";
import {
  CAP,
  ROLE_CAPS,
  getEffectiveCaps,
  hasCap,
  hasAnyCap,
  hasAllCaps,
  getPrimaryRole,
  parseRolesFromSession,
  roleLabel,
  type Role,
  type Capability,
} from "@/lib/capabilities";

// ---------------------------------------------------------------------------
// 1. Capability isolation per role
// ---------------------------------------------------------------------------

describe("Capability isolation per role", () => {
  describe("patient capabilities", () => {
    const patientCaps = ROLE_CAPS.patient;

    it("has VIEW_DASHBOARD", () => {
      expect(patientCaps).toContain(CAP.VIEW_DASHBOARD);
    });

    it("has INTAKE_SELF", () => {
      expect(patientCaps).toContain(CAP.INTAKE_SELF);
    });

    it("has RX_VIEW", () => {
      expect(patientCaps).toContain(CAP.RX_VIEW);
    });

    it("has RX_REFILL", () => {
      expect(patientCaps).toContain(CAP.RX_REFILL);
    });

    it("has CONSULT_JOIN", () => {
      expect(patientCaps).toContain(CAP.CONSULT_JOIN);
    });

    it("has CONSULT_HISTORY", () => {
      expect(patientCaps).toContain(CAP.CONSULT_HISTORY);
    });

    it("has MSG_VIEW and MSG_SEND", () => {
      expect(patientCaps).toContain(CAP.MSG_VIEW);
      expect(patientCaps).toContain(CAP.MSG_SEND);
    });

    it("does NOT have RX_WRITE", () => {
      expect(patientCaps).not.toContain(CAP.RX_WRITE);
    });

    it("does NOT have RX_SIGN", () => {
      expect(patientCaps).not.toContain(CAP.RX_SIGN);
    });

    it("does NOT have PHARMACY_QUEUE", () => {
      expect(patientCaps).not.toContain(CAP.PHARMACY_QUEUE);
    });

    it("does NOT have REPORT_VIEW", () => {
      expect(patientCaps).not.toContain(CAP.REPORT_VIEW);
    });

    it("does NOT have AUDIT_VIEW", () => {
      expect(patientCaps).not.toContain(CAP.AUDIT_VIEW);
    });

    it("does NOT have USER_MANAGE", () => {
      expect(patientCaps).not.toContain(CAP.USER_MANAGE);
    });

    it("does NOT have PATIENT_VIEW (patient views own data via different flow)", () => {
      expect(patientCaps).not.toContain(CAP.PATIENT_VIEW);
    });

    it("does NOT have WORKFLOW_VIEW", () => {
      expect(patientCaps).not.toContain(CAP.WORKFLOW_VIEW);
    });

    it("does NOT have PROVIDER_MANAGE", () => {
      expect(patientCaps).not.toContain(CAP.PROVIDER_MANAGE);
    });

    it("does NOT have SETTINGS_VIEW", () => {
      expect(patientCaps).not.toContain(CAP.SETTINGS_VIEW);
    });
  });

  describe("provider capabilities", () => {
    const providerCaps = ROLE_CAPS.provider;

    it("has RX_WRITE and RX_SIGN", () => {
      expect(providerCaps).toContain(CAP.RX_WRITE);
      expect(providerCaps).toContain(CAP.RX_SIGN);
    });

    it("has CONSULT_START", () => {
      expect(providerCaps).toContain(CAP.CONSULT_START);
    });

    it("has WORKFLOW_VIEW and WORKFLOW_MANAGE", () => {
      expect(providerCaps).toContain(CAP.WORKFLOW_VIEW);
      expect(providerCaps).toContain(CAP.WORKFLOW_MANAGE);
    });

    it("has PATIENT_VIEW and PATIENT_MANAGE", () => {
      expect(providerCaps).toContain(CAP.PATIENT_VIEW);
      expect(providerCaps).toContain(CAP.PATIENT_MANAGE);
    });

    it("has INTAKE_REVIEW", () => {
      expect(providerCaps).toContain(CAP.INTAKE_REVIEW);
    });

    it("does NOT have PHARMACY_QUEUE", () => {
      expect(providerCaps).not.toContain(CAP.PHARMACY_QUEUE);
    });

    it("does NOT have USER_MANAGE", () => {
      expect(providerCaps).not.toContain(CAP.USER_MANAGE);
    });

    it("does NOT have REPORT_VIEW", () => {
      expect(providerCaps).not.toContain(CAP.REPORT_VIEW);
    });

    it("does NOT have AUDIT_VIEW", () => {
      expect(providerCaps).not.toContain(CAP.AUDIT_VIEW);
    });

    it("does NOT have PROVIDER_MANAGE", () => {
      expect(providerCaps).not.toContain(CAP.PROVIDER_MANAGE);
    });

    it("does NOT have SETTINGS_VIEW", () => {
      expect(providerCaps).not.toContain(CAP.SETTINGS_VIEW);
    });
  });

  describe("nurse capabilities", () => {
    const nurseCaps = ROLE_CAPS.nurse;

    it("has PATIENT_VIEW", () => {
      expect(nurseCaps).toContain(CAP.PATIENT_VIEW);
    });

    it("has INTAKE_REVIEW", () => {
      expect(nurseCaps).toContain(CAP.INTAKE_REVIEW);
    });

    it("has WORKFLOW_VIEW", () => {
      expect(nurseCaps).toContain(CAP.WORKFLOW_VIEW);
    });

    it("has CONSULT_JOIN and CONSULT_HISTORY", () => {
      expect(nurseCaps).toContain(CAP.CONSULT_JOIN);
      expect(nurseCaps).toContain(CAP.CONSULT_HISTORY);
    });

    it("does NOT have RX_WRITE", () => {
      expect(nurseCaps).not.toContain(CAP.RX_WRITE);
    });

    it("does NOT have RX_SIGN", () => {
      expect(nurseCaps).not.toContain(CAP.RX_SIGN);
    });

    it("does NOT have PHARMACY_QUEUE", () => {
      expect(nurseCaps).not.toContain(CAP.PHARMACY_QUEUE);
    });

    it("does NOT have CONSULT_START", () => {
      expect(nurseCaps).not.toContain(CAP.CONSULT_START);
    });

    it("does NOT have USER_MANAGE", () => {
      expect(nurseCaps).not.toContain(CAP.USER_MANAGE);
    });

    it("does NOT have REPORT_VIEW", () => {
      expect(nurseCaps).not.toContain(CAP.REPORT_VIEW);
    });

    it("does NOT have AUDIT_VIEW", () => {
      expect(nurseCaps).not.toContain(CAP.AUDIT_VIEW);
    });
  });

  describe("pharmacy capabilities", () => {
    const pharmacyCaps = ROLE_CAPS.pharmacy;

    it("has PHARMACY_QUEUE and PHARMACY_FILL", () => {
      expect(pharmacyCaps).toContain(CAP.PHARMACY_QUEUE);
      expect(pharmacyCaps).toContain(CAP.PHARMACY_FILL);
    });

    it("has PHARMACY_VERIFY", () => {
      expect(pharmacyCaps).toContain(CAP.PHARMACY_VERIFY);
    });

    it("has RX_VIEW (to view prescriptions in queue)", () => {
      expect(pharmacyCaps).toContain(CAP.RX_VIEW);
    });

    it("has MSG_VIEW and MSG_SEND", () => {
      expect(pharmacyCaps).toContain(CAP.MSG_VIEW);
      expect(pharmacyCaps).toContain(CAP.MSG_SEND);
    });

    it("does NOT have RX_WRITE", () => {
      expect(pharmacyCaps).not.toContain(CAP.RX_WRITE);
    });

    it("does NOT have PATIENT_VIEW", () => {
      expect(pharmacyCaps).not.toContain(CAP.PATIENT_VIEW);
    });

    it("does NOT have REPORT_VIEW", () => {
      expect(pharmacyCaps).not.toContain(CAP.REPORT_VIEW);
    });

    it("does NOT have CONSULT_START", () => {
      expect(pharmacyCaps).not.toContain(CAP.CONSULT_START);
    });

    it("does NOT have CONSULT_JOIN", () => {
      expect(pharmacyCaps).not.toContain(CAP.CONSULT_JOIN);
    });

    it("does NOT have WORKFLOW_VIEW", () => {
      expect(pharmacyCaps).not.toContain(CAP.WORKFLOW_VIEW);
    });

    it("does NOT have USER_MANAGE", () => {
      expect(pharmacyCaps).not.toContain(CAP.USER_MANAGE);
    });
  });

  describe("admin capabilities", () => {
    const adminCaps = ROLE_CAPS.admin;
    const allCapValues = Object.values(CAP);

    it("has ALL defined capabilities", () => {
      for (const cap of allCapValues) {
        expect(adminCaps).toContain(cap);
      }
    });

    it("has the same count as total CAP keys", () => {
      expect(adminCaps.length).toBe(allCapValues.length);
    });
  });

  describe("unverified capabilities", () => {
    it("has NO capabilities (empty array)", () => {
      expect(ROLE_CAPS.unverified).toEqual([]);
      expect(ROLE_CAPS.unverified).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. getEffectiveCaps
// ---------------------------------------------------------------------------

describe("getEffectiveCaps", () => {
  it("returns the correct set for a single patient role", () => {
    const caps = getEffectiveCaps(["patient"]);
    expect(caps.size).toBe(ROLE_CAPS.patient.length);
    for (const cap of ROLE_CAPS.patient) {
      expect(caps.has(cap)).toBe(true);
    }
  });

  it("returns the correct set for a single provider role", () => {
    const caps = getEffectiveCaps(["provider"]);
    expect(caps.size).toBe(ROLE_CAPS.provider.length);
    for (const cap of ROLE_CAPS.provider) {
      expect(caps.has(cap)).toBe(true);
    }
  });

  it("returns empty set for unverified", () => {
    const caps = getEffectiveCaps(["unverified"]);
    expect(caps.size).toBe(0);
  });

  it("returns empty set for empty roles array", () => {
    const caps = getEffectiveCaps([]);
    expect(caps.size).toBe(0);
  });

  it("returns union of capabilities for multi-role (patient + provider)", () => {
    const caps = getEffectiveCaps(["patient", "provider"]);
    // Should contain all patient caps
    for (const cap of ROLE_CAPS.patient) {
      expect(caps.has(cap)).toBe(true);
    }
    // Should contain all provider caps
    for (const cap of ROLE_CAPS.provider) {
      expect(caps.has(cap)).toBe(true);
    }
  });

  it("returns union without duplicates for multi-role (patient + nurse)", () => {
    const caps = getEffectiveCaps(["patient", "nurse"]);
    // Both share VIEW_DASHBOARD, MSG_VIEW, MSG_SEND, RX_VIEW, CONSULT_JOIN, CONSULT_HISTORY
    // The Set guarantees no duplicates
    const expectedUnion = new Set([...ROLE_CAPS.patient, ...ROLE_CAPS.nurse]);
    expect(caps.size).toBe(expectedUnion.size);
  });

  it("handles unknown role gracefully by returning empty for that role", () => {
    // Force an unknown role string through the type system
    const caps = getEffectiveCaps(["bogusrole" as Role]);
    expect(caps.size).toBe(0);
  });

  it("handles mix of valid and unknown roles", () => {
    const caps = getEffectiveCaps(["patient", "bogus" as Role]);
    // Should still have all patient caps
    expect(caps.size).toBe(ROLE_CAPS.patient.length);
    for (const cap of ROLE_CAPS.patient) {
      expect(caps.has(cap)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. hasCap
// ---------------------------------------------------------------------------

describe("hasCap", () => {
  it("returns true when patient has VIEW_DASHBOARD", () => {
    expect(hasCap(["patient"], CAP.VIEW_DASHBOARD)).toBe(true);
  });

  it("returns true when patient has RX_VIEW", () => {
    expect(hasCap(["patient"], CAP.RX_VIEW)).toBe(true);
  });

  it("returns false when patient lacks RX_WRITE", () => {
    expect(hasCap(["patient"], CAP.RX_WRITE)).toBe(false);
  });

  it("returns false when patient lacks PHARMACY_QUEUE", () => {
    expect(hasCap(["patient"], CAP.PHARMACY_QUEUE)).toBe(false);
  });

  it("returns true when provider has RX_SIGN", () => {
    expect(hasCap(["provider"], CAP.RX_SIGN)).toBe(true);
  });

  it("returns true when provider has CONSULT_START", () => {
    expect(hasCap(["provider"], CAP.CONSULT_START)).toBe(true);
  });

  it("returns false when provider lacks PHARMACY_FILL", () => {
    expect(hasCap(["provider"], CAP.PHARMACY_FILL)).toBe(false);
  });

  it("returns true when nurse has PATIENT_VIEW", () => {
    expect(hasCap(["nurse"], CAP.PATIENT_VIEW)).toBe(true);
  });

  it("returns false when nurse lacks RX_SIGN", () => {
    expect(hasCap(["nurse"], CAP.RX_SIGN)).toBe(false);
  });

  it("returns true when pharmacy has PHARMACY_QUEUE", () => {
    expect(hasCap(["pharmacy"], CAP.PHARMACY_QUEUE)).toBe(true);
  });

  it("returns false when pharmacy lacks PATIENT_VIEW", () => {
    expect(hasCap(["pharmacy"], CAP.PATIENT_VIEW)).toBe(false);
  });

  it("returns true when admin has USER_MANAGE", () => {
    expect(hasCap(["admin"], CAP.USER_MANAGE)).toBe(true);
  });

  it("returns true when admin has every single capability", () => {
    for (const cap of Object.values(CAP)) {
      expect(hasCap(["admin"], cap)).toBe(true);
    }
  });

  it("returns false when unverified has VIEW_DASHBOARD", () => {
    expect(hasCap(["unverified"], CAP.VIEW_DASHBOARD)).toBe(false);
  });

  it("returns false when unverified has any capability", () => {
    for (const cap of Object.values(CAP)) {
      expect(hasCap(["unverified"], cap)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. hasAnyCap
// ---------------------------------------------------------------------------

describe("hasAnyCap", () => {
  it("returns true if ANY cap in list is held", () => {
    expect(
      hasAnyCap(["patient"], [CAP.RX_VIEW, CAP.RX_WRITE])
    ).toBe(true);
  });

  it("returns false if NONE of the caps are held", () => {
    expect(
      hasAnyCap(["patient"], [CAP.RX_WRITE, CAP.PHARMACY_QUEUE, CAP.AUDIT_VIEW])
    ).toBe(false);
  });

  it("returns false with empty cap list", () => {
    expect(hasAnyCap(["patient"], [])).toBe(false);
  });

  it("returns false for unverified with any caps", () => {
    expect(
      hasAnyCap(["unverified"], [CAP.VIEW_DASHBOARD, CAP.RX_VIEW])
    ).toBe(false);
  });

  it("returns true when one of multiple caps matches for provider", () => {
    expect(
      hasAnyCap(["provider"], [CAP.PHARMACY_QUEUE, CAP.RX_WRITE])
    ).toBe(true);
  });

  it("returns true when admin is checked against any caps", () => {
    expect(
      hasAnyCap(["admin"], [CAP.PHARMACY_QUEUE, CAP.RX_WRITE, CAP.AUDIT_VIEW])
    ).toBe(true);
  });

  it("works with multi-role: patient+nurse has PATIENT_VIEW (from nurse)", () => {
    expect(
      hasAnyCap(["patient", "nurse"], [CAP.PATIENT_VIEW])
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4b. hasAllCaps
// ---------------------------------------------------------------------------

describe("hasAllCaps", () => {
  it("returns true when all caps are present", () => {
    expect(
      hasAllCaps(["provider"], [CAP.RX_VIEW, CAP.RX_WRITE, CAP.RX_SIGN])
    ).toBe(true);
  });

  it("returns false when any cap is missing", () => {
    expect(
      hasAllCaps(["patient"], [CAP.RX_VIEW, CAP.RX_WRITE])
    ).toBe(false);
  });

  it("returns true for empty caps list (vacuously true)", () => {
    expect(hasAllCaps(["patient"], [])).toBe(true);
  });

  it("returns true when admin has all caps", () => {
    const allCaps = Object.values(CAP);
    expect(hasAllCaps(["admin"], allCaps)).toBe(true);
  });

  it("returns false for unverified with any requirement", () => {
    expect(hasAllCaps(["unverified"], [CAP.VIEW_DASHBOARD])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. getPrimaryRole
// ---------------------------------------------------------------------------

describe("getPrimaryRole", () => {
  it("returns 'admin' when admin is in list regardless of other roles", () => {
    expect(getPrimaryRole(["patient", "admin", "provider"])).toBe("admin");
  });

  it("returns 'admin' when admin is the only role", () => {
    expect(getPrimaryRole(["admin"])).toBe("admin");
  });

  it("returns 'provider' when provider + patient, no admin", () => {
    expect(getPrimaryRole(["patient", "provider"])).toBe("provider");
  });

  it("returns 'provider' when provider + nurse, no admin", () => {
    expect(getPrimaryRole(["nurse", "provider"])).toBe("provider");
  });

  it("returns 'nurse' when nurse + patient, no provider or admin", () => {
    expect(getPrimaryRole(["patient", "nurse"])).toBe("nurse");
  });

  it("returns 'pharmacy' when only pharmacy", () => {
    expect(getPrimaryRole(["pharmacy"])).toBe("pharmacy");
  });

  it("returns 'pharmacy' when pharmacy + patient, no nurse/provider/admin", () => {
    expect(getPrimaryRole(["patient", "pharmacy"])).toBe("pharmacy");
  });

  it("returns 'patient' when only patient", () => {
    expect(getPrimaryRole(["patient"])).toBe("patient");
  });

  it("returns 'unverified' for empty array", () => {
    expect(getPrimaryRole([])).toBe("unverified");
  });

  it("returns 'unverified' for ['unverified']", () => {
    expect(getPrimaryRole(["unverified"])).toBe("unverified");
  });

  it("admin takes priority over all other roles combined", () => {
    expect(
      getPrimaryRole(["patient", "nurse", "pharmacy", "provider", "admin"])
    ).toBe("admin");
  });

  it("priority order is admin > provider > nurse > pharmacy > patient > unverified", () => {
    // Test by removing each top role one at a time
    expect(getPrimaryRole(["provider", "nurse", "pharmacy", "patient"])).toBe("provider");
    expect(getPrimaryRole(["nurse", "pharmacy", "patient"])).toBe("nurse");
    expect(getPrimaryRole(["pharmacy", "patient"])).toBe("pharmacy");
    expect(getPrimaryRole(["patient"])).toBe("patient");
    expect(getPrimaryRole(["unverified"])).toBe("unverified");
  });
});

// ---------------------------------------------------------------------------
// 6. parseRolesFromSession
// ---------------------------------------------------------------------------

describe("parseRolesFromSession", () => {
  it('"admin" returns ["admin"]', () => {
    expect(parseRolesFromSession("admin")).toEqual(["admin"]);
  });

  it('"provider" returns ["provider"]', () => {
    expect(parseRolesFromSession("provider")).toEqual(["provider"]);
  });

  it('"nurse" returns ["nurse"]', () => {
    expect(parseRolesFromSession("nurse")).toEqual(["nurse"]);
  });

  it('"pharmacy" returns ["pharmacy"]', () => {
    expect(parseRolesFromSession("pharmacy")).toEqual(["pharmacy"]);
  });

  it('"patient" returns ["patient"]', () => {
    expect(parseRolesFromSession("patient")).toEqual(["patient"]);
  });

  it('"unverified" returns ["unverified"]', () => {
    expect(parseRolesFromSession("unverified")).toEqual(["unverified"]);
  });

  it("undefined returns ['unverified']", () => {
    expect(parseRolesFromSession(undefined)).toEqual(["unverified"]);
  });

  it('empty string returns ["unverified"]', () => {
    expect(parseRolesFromSession("")).toEqual(["unverified"]);
  });

  it('"garbage" returns ["unverified"]', () => {
    expect(parseRolesFromSession("garbage")).toEqual(["unverified"]);
  });

  it('"ADMIN" (uppercase) returns ["unverified"] -- case sensitive', () => {
    expect(parseRolesFromSession("ADMIN")).toEqual(["unverified"]);
  });

  it('"Provider" (title case) returns ["unverified"] -- case sensitive', () => {
    expect(parseRolesFromSession("Provider")).toEqual(["unverified"]);
  });

  it('"superadmin" returns ["unverified"] -- not a valid role', () => {
    expect(parseRolesFromSession("superadmin")).toEqual(["unverified"]);
  });
});

// ---------------------------------------------------------------------------
// 7. roleLabel
// ---------------------------------------------------------------------------

describe("roleLabel", () => {
  it("admin returns 'Admin'", () => {
    expect(roleLabel("admin")).toBe("Admin");
  });

  it("provider returns 'Provider'", () => {
    expect(roleLabel("provider")).toBe("Provider");
  });

  it("nurse returns 'Nurse'", () => {
    expect(roleLabel("nurse")).toBe("Nurse");
  });

  it("pharmacy returns 'Pharmacy'", () => {
    expect(roleLabel("pharmacy")).toBe("Pharmacy");
  });

  it("patient returns 'Client' (not 'Patient')", () => {
    expect(roleLabel("patient")).toBe("Client");
  });

  it("unverified returns 'Pending Verification'", () => {
    expect(roleLabel("unverified")).toBe("Pending Verification");
  });
});

// ---------------------------------------------------------------------------
// 8. Nav visibility by role (integration-style)
// ---------------------------------------------------------------------------

describe("Nav visibility by role", () => {
  /**
   * Nav item → required capability mapping.
   * A user sees a nav item if they have ANY of its required capabilities.
   */
  const NAV_ITEMS: Record<string, Capability[]> = {
    Dashboard: [CAP.VIEW_DASHBOARD],
    Intake: [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW],
    Consultation: [CAP.CONSULT_START, CAP.CONSULT_JOIN],
    Prescriptions: [CAP.RX_VIEW],
    Workflows: [CAP.WORKFLOW_VIEW],
    Messages: [CAP.MSG_VIEW],
    "Pharmacy Ops": [CAP.PHARMACY_QUEUE],
    Patients: [CAP.PATIENT_VIEW],
    Providers: [CAP.PROVIDER_MANAGE],
    Reporting: [CAP.REPORT_VIEW],
    "Audit Logs": [CAP.AUDIT_VIEW],
    "Users & Access": [CAP.USER_MANAGE],
    Settings: [CAP.SETTINGS_VIEW],
  };

  /** Helper: which nav items are visible for a given set of roles */
  function visibleNavItems(roles: Role[]): string[] {
    const caps = getEffectiveCaps(roles);
    return Object.entries(NAV_ITEMS)
      .filter(([, requiredCaps]) => requiredCaps.some((c) => caps.has(c)))
      .map(([name]) => name);
  }

  describe("patient nav visibility", () => {
    const visible = visibleNavItems(["patient"]);

    it("sees Dashboard", () => {
      expect(visible).toContain("Dashboard");
    });

    it("sees Intake (via INTAKE_SELF)", () => {
      expect(visible).toContain("Intake");
    });

    it("sees Prescriptions", () => {
      expect(visible).toContain("Prescriptions");
    });

    it("sees Consultation (via CONSULT_JOIN)", () => {
      expect(visible).toContain("Consultation");
    });

    it("sees Messages", () => {
      expect(visible).toContain("Messages");
    });

    it("does NOT see Pharmacy Ops", () => {
      expect(visible).not.toContain("Pharmacy Ops");
    });

    it("does NOT see Patients (management)", () => {
      expect(visible).not.toContain("Patients");
    });

    it("does NOT see Providers", () => {
      expect(visible).not.toContain("Providers");
    });

    it("does NOT see Reporting", () => {
      expect(visible).not.toContain("Reporting");
    });

    it("does NOT see Audit Logs", () => {
      expect(visible).not.toContain("Audit Logs");
    });

    it("does NOT see Users & Access", () => {
      expect(visible).not.toContain("Users & Access");
    });

    it("does NOT see Workflows", () => {
      expect(visible).not.toContain("Workflows");
    });

    it("does NOT see Settings", () => {
      expect(visible).not.toContain("Settings");
    });
  });

  describe("provider nav visibility", () => {
    const visible = visibleNavItems(["provider"]);

    it("sees Dashboard", () => {
      expect(visible).toContain("Dashboard");
    });

    it("sees Intake (via INTAKE_REVIEW)", () => {
      expect(visible).toContain("Intake");
    });

    it("sees Consultation (via CONSULT_START)", () => {
      expect(visible).toContain("Consultation");
    });

    it("sees Prescriptions", () => {
      expect(visible).toContain("Prescriptions");
    });

    it("sees Workflows", () => {
      expect(visible).toContain("Workflows");
    });

    it("sees Messages", () => {
      expect(visible).toContain("Messages");
    });

    it("sees Patients", () => {
      expect(visible).toContain("Patients");
    });

    it("does NOT see Pharmacy Ops", () => {
      expect(visible).not.toContain("Pharmacy Ops");
    });

    it("does NOT see Reporting", () => {
      expect(visible).not.toContain("Reporting");
    });

    it("does NOT see Audit Logs", () => {
      expect(visible).not.toContain("Audit Logs");
    });

    it("does NOT see Users & Access", () => {
      expect(visible).not.toContain("Users & Access");
    });

    it("does NOT see Providers", () => {
      expect(visible).not.toContain("Providers");
    });

    it("does NOT see Settings", () => {
      expect(visible).not.toContain("Settings");
    });
  });

  describe("pharmacy nav visibility", () => {
    const visible = visibleNavItems(["pharmacy"]);

    it("sees Dashboard", () => {
      expect(visible).toContain("Dashboard");
    });

    it("sees Prescriptions (via RX_VIEW)", () => {
      expect(visible).toContain("Prescriptions");
    });

    it("sees Messages", () => {
      expect(visible).toContain("Messages");
    });

    it("sees Pharmacy Ops", () => {
      expect(visible).toContain("Pharmacy Ops");
    });

    it("does NOT see Patients", () => {
      expect(visible).not.toContain("Patients");
    });

    it("does NOT see Workflows", () => {
      expect(visible).not.toContain("Workflows");
    });

    it("does NOT see Reporting", () => {
      expect(visible).not.toContain("Reporting");
    });

    it("does NOT see Consultation", () => {
      expect(visible).not.toContain("Consultation");
    });

    it("does NOT see Intake", () => {
      expect(visible).not.toContain("Intake");
    });

    it("does NOT see Settings", () => {
      expect(visible).not.toContain("Settings");
    });
  });

  describe("nurse nav visibility", () => {
    const visible = visibleNavItems(["nurse"]);

    it("sees Dashboard", () => {
      expect(visible).toContain("Dashboard");
    });

    it("sees Intake (via INTAKE_REVIEW)", () => {
      expect(visible).toContain("Intake");
    });

    it("sees Prescriptions", () => {
      expect(visible).toContain("Prescriptions");
    });

    it("sees Consultation (via CONSULT_JOIN)", () => {
      expect(visible).toContain("Consultation");
    });

    it("sees Workflows", () => {
      expect(visible).toContain("Workflows");
    });

    it("sees Messages", () => {
      expect(visible).toContain("Messages");
    });

    it("sees Patients", () => {
      expect(visible).toContain("Patients");
    });

    it("does NOT see Pharmacy Ops", () => {
      expect(visible).not.toContain("Pharmacy Ops");
    });

    it("does NOT see Reporting", () => {
      expect(visible).not.toContain("Reporting");
    });

    it("does NOT see Audit Logs", () => {
      expect(visible).not.toContain("Audit Logs");
    });

    it("does NOT see Users & Access", () => {
      expect(visible).not.toContain("Users & Access");
    });
  });

  describe("admin nav visibility", () => {
    const visible = visibleNavItems(["admin"]);

    it("sees ALL nav items", () => {
      const allNavItems = Object.keys(NAV_ITEMS);
      for (const item of allNavItems) {
        expect(visible).toContain(item);
      }
    });

    it("has count equal to all nav items", () => {
      expect(visible.length).toBe(Object.keys(NAV_ITEMS).length);
    });
  });

  describe("unverified nav visibility", () => {
    const visible = visibleNavItems(["unverified"]);

    it("sees NO nav items", () => {
      expect(visible).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 9. Unauthorized route tests (capability-based route guard logic)
// ---------------------------------------------------------------------------

describe("Route guard authorization logic", () => {
  /**
   * ROUTE_GUARDS configuration mirrored from middleware.ts.
   * We test the authorization logic inline here rather than importing
   * from middleware (which runs on the Edge runtime and is not importable).
   */
  type RouteGuard = {
    pattern: string;
    requireAnyCap: Capability[];
  };

  const ROUTE_GUARDS: RouteGuard[] = [
    {
      pattern: "/admin",
      requireAnyCap: [
        CAP.REPORT_VIEW,
        CAP.AUDIT_VIEW,
        CAP.USER_MANAGE,
        CAP.PROVIDER_MANAGE,
        CAP.AGENTS_VIEW,
        CAP.SETTINGS_VIEW,
      ],
    },
    {
      pattern: "/provider",
      requireAnyCap: [
        CAP.PATIENT_VIEW,
        CAP.RX_WRITE,
        CAP.CONSULT_START,
        CAP.WORKFLOW_VIEW,
      ],
    },
    {
      pattern: "/pharmacy",
      requireAnyCap: [CAP.PHARMACY_QUEUE, CAP.PHARMACY_FILL],
    },
    {
      pattern: "/consultation",
      requireAnyCap: [CAP.CONSULT_JOIN, CAP.CONSULT_START],
    },
    {
      pattern: "/dashboard",
      requireAnyCap: [CAP.VIEW_DASHBOARD],
    },
    {
      pattern: "/intake",
      requireAnyCap: [CAP.INTAKE_SELF, CAP.INTAKE_REVIEW],
    },
  ];

  /**
   * Check whether a role is authorized for a given route pattern.
   * Mirrors the middleware's cap check logic:
   *   matchedGuard.requireAnyCap.some(cap => userCaps.has(cap))
   */
  function isAuthorized(roles: Role[], routePattern: string): boolean {
    const guard = ROUTE_GUARDS.find((g) => g.pattern === routePattern);
    if (!guard) return true; // no guard = public route
    const caps = getEffectiveCaps(roles);
    return guard.requireAnyCap.some((cap) => caps.has(cap));
  }

  describe("unverified user is blocked from protected routes", () => {
    it("blocked from /dashboard", () => {
      expect(isAuthorized(["unverified"], "/dashboard")).toBe(false);
    });

    it("blocked from /admin", () => {
      expect(isAuthorized(["unverified"], "/admin")).toBe(false);
    });

    it("blocked from /provider", () => {
      expect(isAuthorized(["unverified"], "/provider")).toBe(false);
    });

    it("blocked from /pharmacy", () => {
      expect(isAuthorized(["unverified"], "/pharmacy")).toBe(false);
    });

    it("blocked from /consultation", () => {
      expect(isAuthorized(["unverified"], "/consultation")).toBe(false);
    });

    it("blocked from /intake", () => {
      expect(isAuthorized(["unverified"], "/intake")).toBe(false);
    });
  });

  describe("patient route restrictions", () => {
    it("allowed on /dashboard", () => {
      expect(isAuthorized(["patient"], "/dashboard")).toBe(true);
    });

    it("allowed on /intake (via INTAKE_SELF)", () => {
      expect(isAuthorized(["patient"], "/intake")).toBe(true);
    });

    it("allowed on /consultation (via CONSULT_JOIN)", () => {
      expect(isAuthorized(["patient"], "/consultation")).toBe(true);
    });

    it("blocked from /provider", () => {
      expect(isAuthorized(["patient"], "/provider")).toBe(false);
    });

    it("blocked from /admin", () => {
      expect(isAuthorized(["patient"], "/admin")).toBe(false);
    });

    it("blocked from /pharmacy", () => {
      expect(isAuthorized(["patient"], "/pharmacy")).toBe(false);
    });
  });

  describe("provider route restrictions", () => {
    it("allowed on /provider", () => {
      expect(isAuthorized(["provider"], "/provider")).toBe(true);
    });

    it("allowed on /dashboard", () => {
      expect(isAuthorized(["provider"], "/dashboard")).toBe(true);
    });

    it("allowed on /consultation (via CONSULT_START)", () => {
      expect(isAuthorized(["provider"], "/consultation")).toBe(true);
    });

    it("allowed on /intake (via INTAKE_REVIEW)", () => {
      expect(isAuthorized(["provider"], "/intake")).toBe(true);
    });

    it("blocked from /pharmacy", () => {
      expect(isAuthorized(["provider"], "/pharmacy")).toBe(false);
    });

    it("blocked from /admin (lacks REPORT_VIEW, AUDIT_VIEW, USER_MANAGE, PROVIDER_MANAGE, AGENTS_VIEW, SETTINGS_VIEW)", () => {
      expect(isAuthorized(["provider"], "/admin")).toBe(false);
    });
  });

  describe("pharmacy route restrictions", () => {
    it("allowed on /pharmacy", () => {
      expect(isAuthorized(["pharmacy"], "/pharmacy")).toBe(true);
    });

    it("allowed on /dashboard", () => {
      expect(isAuthorized(["pharmacy"], "/dashboard")).toBe(true);
    });

    it("blocked from /provider", () => {
      expect(isAuthorized(["pharmacy"], "/provider")).toBe(false);
    });

    it("blocked from /admin", () => {
      expect(isAuthorized(["pharmacy"], "/admin")).toBe(false);
    });

    it("blocked from /consultation", () => {
      expect(isAuthorized(["pharmacy"], "/consultation")).toBe(false);
    });
  });

  describe("nurse route restrictions", () => {
    it("allowed on /provider (via PATIENT_VIEW and WORKFLOW_VIEW)", () => {
      expect(isAuthorized(["nurse"], "/provider")).toBe(true);
    });

    it("allowed on /dashboard", () => {
      expect(isAuthorized(["nurse"], "/dashboard")).toBe(true);
    });

    it("allowed on /consultation (via CONSULT_JOIN)", () => {
      expect(isAuthorized(["nurse"], "/consultation")).toBe(true);
    });

    it("allowed on /intake (via INTAKE_REVIEW)", () => {
      expect(isAuthorized(["nurse"], "/intake")).toBe(true);
    });

    it("blocked from /pharmacy", () => {
      expect(isAuthorized(["nurse"], "/pharmacy")).toBe(false);
    });

    it("blocked from /admin", () => {
      expect(isAuthorized(["nurse"], "/admin")).toBe(false);
    });
  });

  describe("admin route access", () => {
    it("allowed on ALL guarded routes", () => {
      for (const guard of ROUTE_GUARDS) {
        expect(isAuthorized(["admin"], guard.pattern)).toBe(true);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// 10. CAP constant completeness
// ---------------------------------------------------------------------------

describe("CAP constant structure", () => {
  it("all CAP values are unique strings", () => {
    const values = Object.values(CAP);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it("all CAP values follow domain:action format", () => {
    for (const [, value] of Object.entries(CAP)) {
      expect(value).toMatch(/^[a-z]+:[a-z]+$/);
    }
  });

  it("ROLE_CAPS keys match the Role type exactly", () => {
    const expectedRoles: Role[] = [
      "patient",
      "provider",
      "nurse",
      "pharmacy",
      "admin",
      "unverified",
    ];
    const actualRoles = Object.keys(ROLE_CAPS) as Role[];
    expect(actualRoles.sort()).toEqual(expectedRoles.sort());
  });

  it("all capabilities referenced in ROLE_CAPS are valid CAP values", () => {
    const allCapValues = new Set(Object.values(CAP));
    for (const [role, caps] of Object.entries(ROLE_CAPS)) {
      for (const cap of caps) {
        expect(allCapValues.has(cap as Capability)).toBe(true);
      }
    }
  });
});
