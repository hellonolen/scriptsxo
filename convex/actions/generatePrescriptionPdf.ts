"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const generate = action({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args): Promise<{ storageId: string; url: string }> => {
    // Fetch prescription data
    const rx = await ctx.runQuery(api.prescriptions.getById, {
      prescriptionId: args.prescriptionId,
    });
    if (!rx) throw new Error("Prescription not found");

    // Fetch patient (we need patient info for PDF)
    const patient = await ctx.runQuery(api.patients.getById, {
      patientId: rx.patientId,
    });

    // Fetch provider
    const provider = await ctx.runQuery(api.providers.getById, {
      providerId: rx.providerId,
    });

    // Fetch pharmacy if assigned
    let pharmacy = null;
    if (rx.pharmacyId) {
      pharmacy = await ctx.runQuery(api.pharmacies.getById, {
        pharmacyId: rx.pharmacyId,
      });
    }

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { height } = page.getSize();

    const brandColor = rgb(0.357, 0.227, 0.714); // #5B21B6
    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);

    let y = height - 50;

    // === HEADER: ScriptsXO Branding ===
    page.drawText("ScriptsXO", {
      x: 50,
      y,
      size: 24,
      font: helveticaBold,
      color: brandColor,
    });
    y -= 18;
    page.drawText("Telehealth Prescription Service", {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: gray,
    });

    // Provider credentials (right side, for pharmacy)
    if (provider) {
      const providerLines = [
        `${provider.firstName} ${provider.lastName}, ${provider.title}`,
        `NPI: ${provider.npiNumber}`,
        provider.deaNumber ? `DEA: ${provider.deaNumber}` : "",
        `Licensed: ${provider.licensedStates.join(", ")}`,
      ].filter(Boolean);

      let py = height - 50;
      for (const line of providerLines) {
        page.drawText(line, {
          x: 350,
          y: py,
          size: 9,
          font: helvetica,
          color: gray,
        });
        py -= 14;
      }
    }

    // Divider line
    y -= 20;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 562, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });

    // === PATIENT INFO ===
    y -= 30;
    page.drawText("PATIENT", {
      x: 50,
      y,
      size: 8,
      font: helveticaBold,
      color: gray,
    });
    y -= 16;

    const patientName = patient
      ? `${patient.email}` // Use email as identifier for privacy
      : "Unknown Patient";
    page.drawText(patientName, {
      x: 50,
      y,
      size: 12,
      font: helveticaBold,
      color: black,
    });
    y -= 16;

    if (patient) {
      page.drawText(`DOB: ${patient.dateOfBirth}`, {
        x: 50,
        y,
        size: 10,
        font: helvetica,
        color: black,
      });
      const addr = patient.address;
      page.drawText(
        `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`,
        {
          x: 200,
          y,
          size: 10,
          font: helvetica,
          color: black,
        }
      );
    }

    // === Rx SYMBOL ===
    y -= 40;
    page.drawText("Rx", {
      x: 50,
      y,
      size: 28,
      font: helveticaBold,
      color: brandColor,
    });

    // === MEDICATION DETAILS ===
    y -= 35;
    page.drawText(rx.medicationName, {
      x: 50,
      y,
      size: 16,
      font: helveticaBold,
      color: black,
    });

    if (rx.genericName) {
      y -= 18;
      page.drawText(`(${rx.genericName})`, {
        x: 50,
        y,
        size: 11,
        font: helvetica,
        color: gray,
      });
    }

    y -= 25;
    const details = [
      `Dosage: ${rx.dosage}`,
      `Form: ${rx.form}`,
      `Quantity: ${rx.quantity}`,
      `Days Supply: ${rx.daysSupply}`,
      `Refills: ${rx.refillsAuthorized}`,
    ];

    for (const detail of details) {
      page.drawText(detail, {
        x: 50,
        y,
        size: 11,
        font: helvetica,
        color: black,
      });
      y -= 18;
    }

    // DEA Schedule
    if (rx.deaSchedule && rx.deaSchedule !== "none") {
      y -= 5;
      page.drawText(`DEA Schedule: ${rx.deaSchedule}`, {
        x: 50,
        y,
        size: 11,
        font: helveticaBold,
        color: rgb(0.8, 0, 0),
      });
      y -= 18;
    }

    // Directions (Sig)
    y -= 10;
    page.drawText("DIRECTIONS:", {
      x: 50,
      y,
      size: 8,
      font: helveticaBold,
      color: gray,
    });
    y -= 16;
    page.drawText(rx.directions, {
      x: 50,
      y,
      size: 12,
      font: helvetica,
      color: black,
    });

    // === PHARMACY ===
    if (pharmacy) {
      y -= 35;
      page.drawText("PHARMACY", {
        x: 50,
        y,
        size: 8,
        font: helveticaBold,
        color: gray,
      });
      y -= 16;
      page.drawText(pharmacy.name, {
        x: 50,
        y,
        size: 11,
        font: helveticaBold,
        color: black,
      });
      y -= 16;
      const pAddr = pharmacy.address;
      page.drawText(
        `${pAddr.street}, ${pAddr.city}, ${pAddr.state} ${pAddr.zip}`,
        {
          x: 50,
          y,
          size: 10,
          font: helvetica,
          color: black,
        }
      );
      y -= 14;
      page.drawText(`Phone: ${pharmacy.phone}${pharmacy.fax ? ` | Fax: ${pharmacy.fax}` : ""}`, {
        x: 50,
        y,
        size: 10,
        font: helvetica,
        color: black,
      });
    }

    // === SIGNATURE ===
    y -= 45;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 300, y },
      thickness: 0.5,
      color: black,
    });
    y -= 16;
    if (provider) {
      page.drawText(
        `Electronically signed by ${provider.firstName} ${provider.lastName}, ${provider.title}`,
        {
          x: 50,
          y,
          size: 10,
          font: helvetica,
          color: black,
        }
      );
    }

    // === FOOTER ===
    y -= 14;
    const rxDate = new Date(rx.createdAt).toLocaleDateString("en-US");
    const expDate = new Date(rx.expiresAt).toLocaleDateString("en-US");
    page.drawText(`Date: ${rxDate}  |  Expires: ${expDate}`, {
      x: 50,
      y,
      size: 9,
      font: helvetica,
      color: gray,
    });

    y -= 30;
    page.drawText(
      "This prescription was generated electronically by ScriptsXO Telehealth.",
      {
        x: 50,
        y,
        size: 8,
        font: helvetica,
        color: gray,
      }
    );

    // Serialize PDF
    const pdfBytes = await pdfDoc.save();

    // Store in Convex file storage
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const storageId = await ctx.storage.store(blob);
    const url = (await ctx.storage.getUrl(storageId)) ?? "";

    return { storageId, url };
  },
});
