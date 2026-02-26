"use node";
// @ts-nocheck
import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Create or retrieve a Daily.co video room for a consultation.
 * Requires DAILY_API_KEY in Convex env vars.
 *
 * Returns { roomUrl, roomToken } — store in consultations table.
 * If DAILY_API_KEY is not set, returns a local dev placeholder.
 */
export const createRoom = action({
  args: {
    sessionToken: v.string(),
    consultationId: v.id("consultations"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DAILY_API_KEY;

    if (!apiKey) {
      // Dev mode — return placeholder room info
      const roomName = `dev-room-${args.consultationId}`;
      await ctx.runMutation(internal.consultations.setRoomInfo, {
        consultationId: args.consultationId,
        roomUrl: `https://demo.daily.co/${roomName}`,
        roomToken: "dev-token",
      });
      return {
        roomUrl: `https://demo.daily.co/${roomName}`,
        roomToken: "dev-token",
        isDev: true,
      };
    }

    // Create Daily.co room
    const roomName = `scriptsxo-${args.consultationId}`;

    const createRoomRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
          eject_at_room_exp: true,
          enable_screenshare: true,
          enable_chat: true,
        },
      }),
    });

    if (!createRoomRes.ok) {
      const err = await createRoomRes.text();
      throw new Error(`Failed to create Daily room: ${err}`);
    }

    const room = await createRoomRes.json();

    // Create a meeting token for this user
    const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          exp: Math.floor(Date.now() / 1000) + 3600,
          is_owner: true,
        },
      }),
    });

    if (!tokenRes.ok) {
      throw new Error("Failed to create meeting token");
    }

    const { token } = await tokenRes.json();

    // Store room info in consultation
    await ctx.runMutation(internal.consultations.setRoomInfo, {
      consultationId: args.consultationId,
      roomUrl: room.url,
      roomToken: token,
    });

    return { roomUrl: room.url, roomToken: token, isDev: false };
  },
});
