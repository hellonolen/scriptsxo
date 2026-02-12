// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
    pharmacyId: v.id("pharmacies"),
    faxNumber: v.string(),
    pdfStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("faxLogs", {
      prescriptionId: args.prescriptionId,
      pharmacyId: args.pharmacyId,
      faxNumber: args.faxNumber,
      pdfStorageId: args.pdfStorageId,
      status: "queued",
      attempts: 0,
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    faxLogId: v.id("faxLogs"),
    status: v.string(),
    phaxioFaxId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    pages: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.faxLogId);
    if (!existing) {
      throw new Error("Fax log not found");
    }

    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.phaxioFaxId !== undefined) {
      updates.phaxioFaxId = args.phaxioFaxId;
    }
    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }
    if (args.pages !== undefined) {
      updates.pages = args.pages;
    }

    if (args.status === "sent") {
      updates.sentAt = Date.now();
    }
    if (args.status === "confirmed") {
      updates.confirmedAt = Date.now();
    }
    if (args.status === "failed") {
      updates.attempts = existing.attempts + 1;
    }

    await ctx.db.patch(args.faxLogId, updates);
    return { success: true };
  },
});

export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("faxLogs")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("faxLogs")
      .order("desc")
      .collect();
  },
});

export const getByPrescription = query({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("faxLogs")
      .withIndex("by_prescriptionId", (q) =>
        q.eq("prescriptionId", args.prescriptionId)
      )
      .order("desc")
      .collect();
  },
});
