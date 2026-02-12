// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    recipientEmail: v.string(),
    recipientId: v.optional(v.id("members")),
    type: v.string(),
    channel: v.string(),
    subject: v.string(),
    body: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      status: "pending",
      sentAt: undefined,
      readAt: undefined,
      createdAt: Date.now(),
    });
  },
});

export const markSent = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      status: "sent",
      sentAt: Date.now(),
    });
    return { success: true };
  },
});

export const markRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      status: "read",
      readAt: Date.now(),
    });
    return { success: true };
  },
});

export const markFailed = mutation({
  args: {
    notificationId: v.id("notifications"),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      status: "failed",
      metadata: { errorMessage: args.errorMessage },
    });
    return { success: true };
  },
});

export const getByRecipient = query({
  args: {
    recipientEmail: v.string(),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_recipientEmail", (q) => q.eq("recipientEmail", args.recipientEmail))
      .order("desc")
      .collect();

    if (args.unreadOnly) {
      return all.filter((n) => !n.readAt);
    }
    return all;
  },
});

export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

export const getByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();
  },
});

export const getUnreadCount = query({
  args: { recipientEmail: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_recipientEmail", (q) => q.eq("recipientEmail", args.recipientEmail))
      .collect();

    return all.filter((n) => !n.readAt).length;
  },
});

export const markAllRead = mutation({
  args: { recipientEmail: v.string() },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipientEmail", (q) => q.eq("recipientEmail", args.recipientEmail))
      .collect();

    const now = Date.now();
    let count = 0;
    for (const notification of unread) {
      if (!notification.readAt) {
        await ctx.db.patch(notification._id, {
          status: "read",
          readAt: now,
        });
        count++;
      }
    }

    return { success: true, markedCount: count };
  },
});
