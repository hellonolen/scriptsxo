/**
 * Client-side helper for prescription PDF operations.
 * Triggers PDF generation via Convex action and handles browser download.
 */

export async function downloadPrescriptionPdf(
  generateAction: (args: { prescriptionId: string }) => Promise<{ storageId: string; url: string }>,
  prescriptionId: string,
  fileName?: string
): Promise<void> {
  const result = await generateAction({ prescriptionId });

  if (!result.url) {
    throw new Error("PDF generation returned no URL");
  }

  // Trigger browser download
  const response = await fetch(result.url);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName || `prescription-${prescriptionId.slice(-8)}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(blobUrl);
}
