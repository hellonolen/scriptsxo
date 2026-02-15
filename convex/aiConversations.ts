// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * AI CONVERSATIONS
 * Persistent chat history that follows the patient across all pages.
 * Every message is tagged with the page it came from.
 */

const messageValidator = v.object({
  role: v.string(),
  content: v.string(),
  page: v.optional(v.string()),
  timestamp: v.number(),
});

/** Get or create a conversation for this email */
export const getOrCreate = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const existing = await ctx.db
      .query("aiConversations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .order("desc")
      .first();

    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert("aiConversations", {
      email,
      messages: [],
      currentPage: undefined,
      intakeId: undefined,
      patientType: undefined,
      collectedData: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Add a message to the conversation */
export const addMessage = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    role: v.string(),
    content: v.string(),
    page: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const updatedMessages = [
      ...conversation.messages,
      {
        role: args.role,
        content: args.content,
        page: args.page,
        timestamp: Date.now(),
      },
    ];

    await ctx.db.patch(args.conversationId, {
      messages: updatedMessages,
      currentPage: args.page || conversation.currentPage,
      updatedAt: Date.now(),
    });
  },
});

/** Get conversation by email */
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiConversations")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .order("desc")
      .first();
  },
});

/** Get conversation by ID */
export const getById = query({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

/** Update the current page context */
export const updatePageContext = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    page: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      currentPage: args.page,
      updatedAt: Date.now(),
    });
  },
});

/** Store collected data from forms/intake */
export const updateCollectedData = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    const merged = {
      ...(conversation.collectedData || {}),
      ...args.data,
    };

    await ctx.db.patch(args.conversationId, {
      collectedData: merged,
      updatedAt: Date.now(),
    });
  },
});

/** Get recent messages formatted for LLM context */
export const getRecentForLLM = query({
  args: { email: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("aiConversations")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .order("desc")
      .first();

    if (!conversation) return [];

    const limit = args.limit || 20;
    const recent = conversation.messages.slice(-limit);

    return recent.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  },
});
