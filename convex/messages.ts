// @ts-nocheck
/**
 * MESSAGES CRUD
 * Patient-provider messaging system.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCap } from "./lib/serverAuth";
import { CAP } from "./lib/capabilities";

/**
 * Send a message.
 */
export const send = mutation({
  args: {
    sessionToken: v.string(),
    senderEmail: v.string(),
    senderRole: v.string(),
    recipientEmail: v.string(),
    conversationId: v.string(),
    content: v.string(),
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.sessionToken, CAP.MSG_SEND);
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderEmail: args.senderEmail.toLowerCase(),
      senderRole: args.senderRole,
      recipientEmail: args.recipientEmail.toLowerCase(),
      content: args.content,
      attachments: args.attachments,
      readAt: undefined,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get messages for a conversation, ascending order.
 */
export const getByConversation = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

/**
 * Get all messages for a recipient, descending order.
 */
export const getForRecipient = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_recipientEmail", (q) =>
        q.eq("recipientEmail", args.email.toLowerCase())
      )
      .order("desc")
      .collect();
  },
});

/**
 * Get unread message count for a recipient.
 */
export const getUnreadCount = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_recipientEmail", (q) =>
        q.eq("recipientEmail", args.email.toLowerCase())
      )
      .collect();

    return messages.filter((m) => !m.readAt).length;
  },
});

/**
 * Mark a message as read.
 */
export const markRead = mutation({
  args: {
    sessionToken: v.string(),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    await requireCap(ctx, args.sessionToken, CAP.MSG_VIEW);
    await ctx.db.patch(args.messageId, {
      readAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Get distinct conversations for an email.
 * Returns the latest message per conversation.
 */
export const getConversations = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const emailLower = args.email.toLowerCase();

    // Get all messages where user is sender or recipient
    const received = await ctx.db
      .query("messages")
      .withIndex("by_recipientEmail", (q) =>
        q.eq("recipientEmail", emailLower)
      )
      .collect();

    // Also get sent messages (scan by conversation from received)
    const conversationIds = [...new Set(received.map((m) => m.conversationId))];

    const conversations = [];
    for (const convId of conversationIds) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", convId)
        )
        .order("desc")
        .take(1);

      if (messages.length > 0) {
        const latest = messages[0];
        const unreadCount = received.filter(
          (m) => m.conversationId === convId && !m.readAt
        ).length;

        conversations.push({
          conversationId: convId,
          latestMessage: latest,
          unreadCount,
        });
      }
    }

    // Sort by latest message timestamp
    conversations.sort(
      (a, b) => b.latestMessage.createdAt - a.latestMessage.createdAt
    );

    return conversations;
  },
});
