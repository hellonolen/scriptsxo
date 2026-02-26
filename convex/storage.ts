// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAnyCap } from "./lib/serverAuth";
import { CAP } from "./lib/capabilities";
import { ConvexError } from "convex/values";

export const createRecord = mutation({
  args: {
    sessionToken: v.string(),
    ownerId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    storageId: v.optional(v.string()),
    url: v.optional(v.string()),
    purpose: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.VIEW_DASHBOARD]);
    const { sessionToken: _s, ...record } = args;
    return await ctx.db.insert("fileStorage", {
      ...record,
      createdAt: Date.now(),
    });
  },
});

export const getByOwner = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fileStorage")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.ownerId))
      .order("desc")
      .collect();
  },
});

export const getByPurpose = query({
  args: {
    ownerId: v.string(),
    purpose: v.string(),
  },
  handler: async (ctx, args) => {
    const ownerFiles = await ctx.db
      .query("fileStorage")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    return ownerFiles.filter((f) => f.purpose === args.purpose);
  },
});

export const deleteRecord = mutation({
  args: {
    sessionToken: v.string(),
    fileId: v.id("fileStorage"),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.VIEW_DASHBOARD]);

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new ConvexError({ code: "NOT_FOUND", message: "File not found." });
    }

    // Verify the caller owns this file — ownerId must match what caller passed
    if (file.ownerId !== args.ownerId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot delete a file you do not own." });
    }

    if (file.storageId) await ctx.storage.delete(file.storageId);

    await ctx.db.delete(args.fileId);
    return { success: true };
  },
});

export const getById = query({
  args: { fileId: v.id("fileStorage") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fileId);
  },
});

/**
 * Generate an upload URL for Convex file storage.
 * Requires at least VIEW_DASHBOARD cap to prevent anonymous uploads.
 */
export const generateUploadUrl = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAnyCap(ctx, args.sessionToken, [CAP.INTAKE_SELF, CAP.VIEW_DASHBOARD]);
    return await ctx.storage.generateUploadUrl();
  },
});
