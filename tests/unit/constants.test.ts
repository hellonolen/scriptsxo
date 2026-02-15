import { describe, it, expect } from "vitest";
import {
  US_STATES,
  SPECIALTIES,
  DEA_SCHEDULES,
  URGENCY_LEVELS,
  CONSULTATION_TYPES,
  PRESCRIPTION_STATUSES,
} from "@/lib/constants";

describe("US_STATES", () => {
  it("is a non-empty array", () => {
    expect(US_STATES.length).toBeGreaterThan(0);
  });

  it("contains Florida with telehealth active", () => {
    const florida = US_STATES.find((s) => s.code === "FL");
    expect(florida).toBeDefined();
    expect(florida?.name).toBe("Florida");
    expect(florida?.telehealthActive).toBe(true);
  });

  it("contains Texas with telehealth inactive", () => {
    const texas = US_STATES.find((s) => s.code === "TX");
    expect(texas).toBeDefined();
    expect(texas?.name).toBe("Texas");
    expect(texas?.telehealthActive).toBe(false);
  });

  it("each state has code, name, and telehealthActive fields", () => {
    for (const state of US_STATES) {
      expect(typeof state.code).toBe("string");
      expect(state.code.length).toBe(2);
      expect(typeof state.name).toBe("string");
      expect(state.name.length).toBeGreaterThan(0);
      expect(typeof state.telehealthActive).toBe("boolean");
    }
  });

  it("has unique state codes", () => {
    const codes = US_STATES.map((s) => s.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("contains 4 states", () => {
    expect(US_STATES).toHaveLength(4);
  });
});

describe("SPECIALTIES", () => {
  it("is a non-empty array", () => {
    expect(SPECIALTIES.length).toBeGreaterThan(0);
  });

  it("contains General Medicine", () => {
    expect(SPECIALTIES).toContain("General Medicine");
  });

  it("contains Dermatology", () => {
    expect(SPECIALTIES).toContain("Dermatology");
  });

  it("contains Mental Health", () => {
    expect(SPECIALTIES).toContain("Mental Health");
  });

  it("contains Pain Management", () => {
    expect(SPECIALTIES).toContain("Pain Management");
  });

  it("contains Sexual Health", () => {
    expect(SPECIALTIES).toContain("Sexual Health");
  });

  it("has 8 specialties", () => {
    expect(SPECIALTIES).toHaveLength(8);
  });

  it("has all unique entries", () => {
    const unique = new Set(SPECIALTIES);
    expect(unique.size).toBe(SPECIALTIES.length);
  });
});

describe("DEA_SCHEDULES", () => {
  it("has schedules II through V and none", () => {
    expect(DEA_SCHEDULES).toHaveProperty("II");
    expect(DEA_SCHEDULES).toHaveProperty("III");
    expect(DEA_SCHEDULES).toHaveProperty("IV");
    expect(DEA_SCHEDULES).toHaveProperty("V");
    expect(DEA_SCHEDULES).toHaveProperty("none");
  });

  it("has descriptive strings for each schedule", () => {
    expect(typeof DEA_SCHEDULES.II).toBe("string");
    expect(DEA_SCHEDULES.II).toContain("abuse");
    expect(typeof DEA_SCHEDULES.none).toBe("string");
    expect(DEA_SCHEDULES.none).toContain("Not a controlled");
  });

  it("schedule II has highest abuse potential description", () => {
    expect(DEA_SCHEDULES.II).toBe("High potential for abuse");
  });

  it("schedule V has lowest abuse potential description", () => {
    expect(DEA_SCHEDULES.V).toBe("Lowest potential for abuse");
  });

  it("none is not a controlled substance", () => {
    expect(DEA_SCHEDULES.none).toBe("Not a controlled substance");
  });
});

describe("URGENCY_LEVELS", () => {
  it("has emergency, urgent, standard, and routine levels", () => {
    expect(URGENCY_LEVELS).toHaveProperty("emergency");
    expect(URGENCY_LEVELS).toHaveProperty("urgent");
    expect(URGENCY_LEVELS).toHaveProperty("standard");
    expect(URGENCY_LEVELS).toHaveProperty("routine");
  });

  it("each level has label, color, and maxWaitMinutes", () => {
    const levels = Object.values(URGENCY_LEVELS);
    for (const level of levels) {
      expect(typeof level.label).toBe("string");
      expect(typeof level.color).toBe("string");
      expect(typeof level.maxWaitMinutes).toBe("number");
    }
  });

  it("emergency has zero wait time", () => {
    expect(URGENCY_LEVELS.emergency.maxWaitMinutes).toBe(0);
    expect(URGENCY_LEVELS.emergency.color).toBe("red");
    expect(URGENCY_LEVELS.emergency.label).toBe("Emergency");
  });

  it("urgent has 30 minute max wait", () => {
    expect(URGENCY_LEVELS.urgent.maxWaitMinutes).toBe(30);
    expect(URGENCY_LEVELS.urgent.color).toBe("orange");
  });

  it("standard has 120 minute max wait", () => {
    expect(URGENCY_LEVELS.standard.maxWaitMinutes).toBe(120);
    expect(URGENCY_LEVELS.standard.color).toBe("blue");
  });

  it("routine has 1440 minute (24 hour) max wait", () => {
    expect(URGENCY_LEVELS.routine.maxWaitMinutes).toBe(1440);
    expect(URGENCY_LEVELS.routine.color).toBe("green");
  });

  it("urgency levels are in ascending order of wait time", () => {
    expect(URGENCY_LEVELS.emergency.maxWaitMinutes).toBeLessThan(
      URGENCY_LEVELS.urgent.maxWaitMinutes
    );
    expect(URGENCY_LEVELS.urgent.maxWaitMinutes).toBeLessThan(
      URGENCY_LEVELS.standard.maxWaitMinutes
    );
    expect(URGENCY_LEVELS.standard.maxWaitMinutes).toBeLessThan(
      URGENCY_LEVELS.routine.maxWaitMinutes
    );
  });
});

describe("CONSULTATION_TYPES", () => {
  it("includes video, phone, and chat", () => {
    expect(CONSULTATION_TYPES).toContain("video");
    expect(CONSULTATION_TYPES).toContain("phone");
    expect(CONSULTATION_TYPES).toContain("chat");
  });

  it("has exactly 3 types", () => {
    expect(CONSULTATION_TYPES).toHaveLength(3);
  });
});

describe("PRESCRIPTION_STATUSES", () => {
  it("is a non-empty array", () => {
    expect(PRESCRIPTION_STATUSES.length).toBeGreaterThan(0);
  });

  it("starts with draft status", () => {
    expect(PRESCRIPTION_STATUSES[0]).toBe("draft");
  });

  it("contains all expected lifecycle statuses", () => {
    const expected = [
      "draft",
      "pending_review",
      "signed",
      "sent",
      "filling",
      "ready",
      "picked_up",
      "delivered",
      "cancelled",
    ];
    for (const status of expected) {
      expect(PRESCRIPTION_STATUSES).toContain(status);
    }
  });

  it("has 9 statuses", () => {
    expect(PRESCRIPTION_STATUSES).toHaveLength(9);
  });

  it("includes a cancelled status for termination", () => {
    expect(PRESCRIPTION_STATUSES).toContain("cancelled");
  });

  it("has all unique entries", () => {
    const unique = new Set(PRESCRIPTION_STATUSES);
    expect(unique.size).toBe(PRESCRIPTION_STATUSES.length);
  });
});
