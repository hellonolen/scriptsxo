"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { requireCap, CAP } from "../lib/capabilities";

const PHAXIO_API_URL = "https://api.phaxio.com/v2.1/faxes";

export const send = action({
  args: {
    prescriptionId: v.id("prescriptions"),
    pharmacyId: v.id("pharmacies"),
    sessionToken: v.string(),
  },
  handler: async (ctx, args): Promise<{ faxLogId: string; phaxioFaxId?: string }> => {
    await requireCap(ctx, args.sessionToken, CAP.RX_VIEW);
    // Get pharmacy fax number
    const pharmacy = await ctx.runQuery(api.pharmacies.getById, {
      pharmacyId: args.pharmacyId,
    });
    if (!pharmacy) throw new Error("Pharmacy not found");
    if (!pharmacy.fax) throw new Error("Pharmacy has no fax number");

    // Generate PDF if not already generated
    const { storageId, url: pdfUrl } = await ctx.runAction(
      api.actions.generatePrescriptionPdf.generate,
      { prescriptionId: args.prescriptionId }
    );

    // Create fax log entry
    const faxLogId = await ctx.runMutation(api.faxLogs.create, {
      prescriptionId: args.prescriptionId,
      pharmacyId: args.pharmacyId,
      faxNumber: pharmacy.fax,
      pdfStorageId: storageId,
    });

    // Get Phaxio API key from environment
    const phaxioApiKey = process.env.PHAXIO_API_KEY;
    if (!phaxioApiKey) {
      // Update fax log as failed — no API key configured
      await ctx.runMutation(api.faxLogs.updateStatus, {
        faxLogId,
        status: "failed",
        errorMessage: "Phaxio API key not configured",
      });
      throw new Error("Phaxio API key not configured. Set PHAXIO_API_KEY in Convex environment.");
    }

    try {
      // Send fax via Phaxio API
      const formData = new FormData();
      formData.append("to", pharmacy.fax);
      formData.append("content_url", pdfUrl);

      const response = await fetch(PHAXIO_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${phaxioApiKey}:`).toString("base64")}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const phaxioFaxId = result.data?.id?.toString();
        await ctx.runMutation(api.faxLogs.updateStatus, {
          faxLogId,
          status: "sending",
          phaxioFaxId,
        });
        return { faxLogId: faxLogId as string, phaxioFaxId };
      } else {
        await ctx.runMutation(api.faxLogs.updateStatus, {
          faxLogId,
          status: "failed",
          errorMessage: result.message || "Phaxio API error",
        });
        throw new Error(result.message || "Failed to send fax");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown fax error";
      await ctx.runMutation(api.faxLogs.updateStatus, {
        faxLogId,
        status: "failed",
        errorMessage: msg,
      });
      throw error;
    }
  },
});
