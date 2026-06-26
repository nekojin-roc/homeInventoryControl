import bwipjs from "bwip-js";

// Generate a unique barcode string like "PKG-20260414-001"
export function generateBarcodeId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PKG-${dateStr}-${random}`;
}

// Render a barcode to a PNG buffer
export async function renderBarcodePng(
  text: string,
  options?: { width?: number; height?: number }
): Promise<Buffer> {
  const png = await bwipjs.toBuffer({
    bcid: "code128",
    text,
    scale: 3,
    height: options?.height ?? 12,
    width: options?.width,
    includetext: true,
    textxalign: "center",
    textsize: 10,
  });
  return png;
}
