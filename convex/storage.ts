// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createRecord = mutation({
  args: {
    ownerId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    storageId: v.optional(v.string()),
    url: v.optional(v.string()),
    purpose: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("fileStorage", {
      ...args,
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
    fileId: v.id("fileStorage"),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) return { success: false, error: "File not found" };

    if (file.ownerId !== args.ownerId) {
      return { success: false, error: "Unauthorized" };
    }

    // TODO: Delete from Convex storage if storageId exists
    // if (file.storageId) {
    //   await ctx.storage.delete(file.storageId);
    // }

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
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
