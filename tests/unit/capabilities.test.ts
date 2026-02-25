/**
 * Unit tests for convex/lib/capabilities.ts
 *
 * These tests exercise the full override chain:
 *   base ROLE_CAPS → org capAllow → member capAllow → org capDeny → member capDeny
 *
 * The ctx mock simulates ctx.db.get() returning a member and optionally an org.
 */

import { describe, it, expect, vi } from "vitest";

// We import the pure logic we can test without Convex runtime.
// getMemberEffectiveCaps and the require* helpers are tested via a mock ctx.
import {
  CAP,
  ROLE_CAPS,
  getMemberEffectiveCaps,
  memberHasCap,
  requireCap,
  requireOrgMember,
} from "@convex/lib/capabilities";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(member: Record<string, unknown>, org?: Record<string, unknown>) {
  return {
    db: {
      get: vi.fn(async (id: string) => {
        if (id === "member_id") return member;
        if (id === "org_id" && org) return org;
        return null;
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// 1. patient cannot call prescriptions.create (requires RX_WRITE)
// ---------------------------------------------------------------------------

describe("patient role", () => {
  it("does NOT have RX_WRITE", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "patient@test.com", role: "patient" });
    const has = await memberHasCap(ctx, "member_id", CAP.RX_WRITE);
    expect(has).toBe(false);
  });

  it("does NOT have USER_MANAGE", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "patient@test.com", role: "patient" });
    const has = await memberHasCap(ctx, "member_id", CAP.USER_MANAGE);
    expect(has).toBe(false);
  });

  it("requireCap throws FORBIDDEN for RX_WRITE", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "patient@test.com", role: "patient" });
    await expect(requireCap(ctx, "member_id", CAP.RX_WRITE)).rejects.toMatchObject({
      data: { code: "FORBIDDEN" },
    });
  });

  it("does have CONSULT_JOIN (part of base bundle)", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "patient@test.com", role: "patient" });
    const has = await memberHasCap(ctx, "member_id", CAP.CONSULT_JOIN);
    expect(has).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. provider cannot call admin.users.create (requires USER_MANAGE)
// ---------------------------------------------------------------------------

describe("provider role", () => {
  it("does NOT have USER_MANAGE", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "provider@test.com", role: "provider" });
    const has = await memberHasCap(ctx, "member_id", CAP.USER_MANAGE);
    expect(has).toBe(false);
  });

  it("does NOT have SETTINGS_MANAGE", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "provider@test.com", role: "provider" });
    const has = await memberHasCap(ctx, "member_id", CAP.SETTINGS_MANAGE);
    expect(has).toBe(false);
  });

  it("does have RX_WRITE (part of base bundle)", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "provider@test.com", role: "provider" });
    const has = await memberHasCap(ctx, "member_id", CAP.RX_WRITE);
    expect(has).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. pharmacy cannot call patients.update (requires PATIENT_MANAGE)
// ---------------------------------------------------------------------------

describe("pharmacy role", () => {
  it("does NOT have PATIENT_MANAGE", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "pharmacy@test.com", role: "pharmacy" });
    const has = await memberHasCap(ctx, "member_id", CAP.PATIENT_MANAGE);
    expect(has).toBe(false);
  });

  it("does NOT have RX_WRITE", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "pharmacy@test.com", role: "pharmacy" });
    const has = await memberHasCap(ctx, "member_id", CAP.RX_WRITE);
    expect(has).toBe(false);
  });

  it("does have PHARMACY_FILL (part of base bundle)", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "pharmacy@test.com", role: "pharmacy" });
    const has = await memberHasCap(ctx, "member_id", CAP.PHARMACY_FILL);
    expect(has).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. deny override blocks even if role bundle allows
// ---------------------------------------------------------------------------

describe("deny overrides", () => {
  it("member-level capDeny removes a cap the role bundle grants", async () => {
    // Provider normally has RX_WRITE — deny it at member level
    const ctx = makeCtx({
      _id: "member_id",
      email: "provider@test.com",
      role: "provider",
      capDeny: [CAP.RX_WRITE],
    });
    const has = await memberHasCap(ctx, "member_id", CAP.RX_WRITE);
    expect(has).toBe(false);
  });

  it("org-level capDeny removes a cap the role bundle grants", async () => {
    // Provider has RX_SIGN, but org denies it
    const ctx = makeCtx(
      { _id: "member_id", email: "provider@test.com", role: "provider", orgId: "org_id" },
      { _id: "org_id", capDeny: [CAP.RX_SIGN] }
    );
    const has = await memberHasCap(ctx, "member_id", CAP.RX_SIGN);
    expect(has).toBe(false);
  });

  it("deny wins even when capAllow also grants the same cap", async () => {
    // capAllow grants AUDIT_VIEW, capDeny also denies it — deny wins
    const ctx = makeCtx({
      _id: "member_id",
      email: "patient@test.com",
      role: "patient",
      capAllow: [CAP.AUDIT_VIEW],
      capDeny: [CAP.AUDIT_VIEW],
    });
    const has = await memberHasCap(ctx, "member_id", CAP.AUDIT_VIEW);
    expect(has).toBe(false);
  });

  it("org capDeny wins over org capAllow", async () => {
    const ctx = makeCtx(
      { _id: "member_id", email: "patient@test.com", role: "patient", orgId: "org_id" },
      { _id: "org_id", capAllow: [CAP.PROVIDER_MANAGE], capDeny: [CAP.PROVIDER_MANAGE] }
    );
    const has = await memberHasCap(ctx, "member_id", CAP.PROVIDER_MANAGE);
    expect(has).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. capAllow grants extra caps beyond base bundle
// ---------------------------------------------------------------------------

describe("capAllow grants", () => {
  it("member-level capAllow grants a cap not in role bundle", async () => {
    const ctx = makeCtx({
      _id: "member_id",
      email: "nurse@test.com",
      role: "nurse",
      capAllow: [CAP.RX_WRITE],
    });
    const has = await memberHasCap(ctx, "member_id", CAP.RX_WRITE);
    expect(has).toBe(true);
  });

  it("org-level capAllow grants a cap to all org members", async () => {
    const ctx = makeCtx(
      { _id: "member_id", email: "pharmacy@test.com", role: "pharmacy", orgId: "org_id" },
      { _id: "org_id", capAllow: [CAP.REPORT_VIEW] }
    );
    const has = await memberHasCap(ctx, "member_id", CAP.REPORT_VIEW);
    expect(has).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Platform owner bypass — DB flag only, never email
// ---------------------------------------------------------------------------

describe("platform owner bypass", () => {
  it("isPlatformOwner:true gets ALL capabilities regardless of role", async () => {
    const ctx = makeCtx({
      _id: "member_id",
      email: "anyone@example.com",
      role: "patient",
      isPlatformOwner: true,
    });
    const effective = await getMemberEffectiveCaps(ctx, "member_id");
    for (const cap of Object.values(CAP)) {
      expect(effective.has(cap as any)).toBe(true);
    }
  });

  it("isPlatformOwner:true bypasses requireCap for admin-only cap", async () => {
    const ctx = makeCtx({
      _id: "member_id",
      email: "anyone@example.com",
      role: "unverified",
      isPlatformOwner: true,
    });
    await expect(requireCap(ctx, "member_id", CAP.SETTINGS_MANAGE)).resolves.toBeUndefined();
  });

  it("isPlatformOwner:false does NOT grant extra caps", async () => {
    const ctx = makeCtx({
      _id: "member_id",
      email: "anyone@example.com",
      role: "patient",
      isPlatformOwner: false,
    });
    const has = await memberHasCap(ctx, "member_id", CAP.SETTINGS_MANAGE);
    expect(has).toBe(false);
  });

  it("known admin email WITHOUT isPlatformOwner flag does NOT get extra caps", async () => {
    // The email backdoor is removed — email alone grants nothing
    const ctx = makeCtx({
      _id: "member_id",
      email: "hellonolen@gmail.com",
      role: "patient",
      isPlatformOwner: false,
    });
    const has = await memberHasCap(ctx, "member_id", CAP.SETTINGS_MANAGE);
    expect(has).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. requireCap with no callerId throws UNAUTHORIZED
// ---------------------------------------------------------------------------

describe("requireCap — unauthenticated", () => {
  it("throws UNAUTHORIZED when callerId is undefined", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "x@x.com", role: "patient" });
    await expect(requireCap(ctx, undefined, CAP.RX_VIEW)).rejects.toMatchObject({
      data: { code: "UNAUTHORIZED" },
    });
  });
});

// ---------------------------------------------------------------------------
// 8. requireOrgMember
// ---------------------------------------------------------------------------

describe("requireOrgMember", () => {
  it("passes when member belongs to the org", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "user@test.com", role: "provider", orgId: "org_id" });
    await expect(requireOrgMember(ctx, "member_id", "org_id")).resolves.toBeUndefined();
  });

  it("throws FORBIDDEN when member belongs to a different org", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "user@test.com", role: "provider", orgId: "other_org" });
    await expect(requireOrgMember(ctx, "member_id", "org_id")).rejects.toMatchObject({
      data: { code: "FORBIDDEN" },
    });
  });

  it("isPlatformOwner bypasses org membership check", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "anyone@example.com", role: "patient", orgId: "other_org", isPlatformOwner: true });
    await expect(requireOrgMember(ctx, "member_id", "org_id")).resolves.toBeUndefined();
  });

  it("throws UNAUTHORIZED when callerId is undefined", async () => {
    const ctx = makeCtx({ _id: "member_id", email: "x@x.com", role: "patient" });
    await expect(requireOrgMember(ctx, undefined, "org_id")).rejects.toMatchObject({
      data: { code: "UNAUTHORIZED" },
    });
  });
});

// ---------------------------------------------------------------------------
// 9. ROLE_CAPS completeness — sanity check bundles are consistent
// ---------------------------------------------------------------------------

describe("ROLE_CAPS bundles", () => {
  it("admin has every CAP constant", () => {
    const adminCaps = new Set(ROLE_CAPS.admin);
    for (const cap of Object.values(CAP)) {
      expect(adminCaps.has(cap as any)).toBe(true);
    }
  });

  it("unverified has NO capabilities", () => {
    expect(ROLE_CAPS.unverified).toHaveLength(0);
  });
});
