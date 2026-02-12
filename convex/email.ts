// @ts-nocheck
import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Email sending via Emailit.
 * All emails are recorded as notifications for audit trail.
 */

export const sendAppointmentReminder = mutation({
  args: {
    recipientEmail: v.string(),
    patientName: v.string(),
    providerName: v.string(),
    scheduledAt: v.number(),
    consultationType: v.string(),
  },
  handler: async (ctx, args) => {
    const scheduledDate = new Date(args.scheduledAt).toLocaleString();

    await ctx.db.insert("notifications", {
      recipientEmail: args.recipientEmail,
      recipientId: undefined,
      type: "appointment_reminder",
      channel: "email",
      subject: `Appointment Reminder: ${scheduledDate}`,
      body: `Hi ${args.patientName}, your ${args.consultationType} consultation with ${args.providerName} is scheduled for ${scheduledDate}.`,
      status: "pending",
      sentAt: undefined,
      readAt: undefined,
      metadata: {
        scheduledAt: args.scheduledAt,
        providerName: args.providerName,
      },
      createdAt: Date.now(),
    });

    // TODO: Integrate with Emailit API
    // const response = await fetch("https://api.emailit.com/v1/emails", { ... });

    return { success: true, message: "Email queued for delivery" };
  },
});

export const sendPrescriptionReady = mutation({
  args: {
    recipientEmail: v.string(),
    patientName: v.string(),
    medicationName: v.string(),
    pharmacyName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      recipientEmail: args.recipientEmail,
      recipientId: undefined,
      type: "prescription_ready",
      channel: "email",
      subject: `Your Prescription is Ready: ${args.medicationName}`,
      body: `Hi ${args.patientName}, your prescription for ${args.medicationName} is ready for pickup at ${args.pharmacyName}.`,
      status: "pending",
      sentAt: undefined,
      readAt: undefined,
      metadata: {
        medicationName: args.medicationName,
        pharmacyName: args.pharmacyName,
      },
      createdAt: Date.now(),
    });

    return { success: true, message: "Email queued for delivery" };
  },
});

export const sendFollowUpReminder = mutation({
  args: {
    recipientEmail: v.string(),
    patientName: v.string(),
    followUpType: v.string(),
    scheduledFor: v.number(),
  },
  handler: async (ctx, args) => {
    const scheduledDate = new Date(args.scheduledFor).toLocaleString();

    await ctx.db.insert("notifications", {
      recipientEmail: args.recipientEmail,
      recipientId: undefined,
      type: "follow_up",
      channel: "email",
      subject: `Follow-Up Required: ${args.followUpType}`,
      body: `Hi ${args.patientName}, you have a ${args.followUpType} follow-up scheduled for ${scheduledDate}. Please log in to complete it.`,
      status: "pending",
      sentAt: undefined,
      readAt: undefined,
      metadata: {
        followUpType: args.followUpType,
        scheduledFor: args.scheduledFor,
      },
      createdAt: Date.now(),
    });

    return { success: true, message: "Email queued for delivery" };
  },
});

export const sendComplianceAlert = mutation({
  args: {
    recipientEmail: v.string(),
    subject: v.string(),
    body: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      recipientEmail: args.recipientEmail,
      recipientId: undefined,
      type: "compliance_alert",
      channel: "email",
      subject: args.subject,
      body: args.body,
      status: "pending",
      sentAt: undefined,
      readAt: undefined,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return { success: true, message: "Compliance alert email queued" };
  },
});
