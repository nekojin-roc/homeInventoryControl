import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface NotifyArrivalParams {
  recipientName: string;
  recipientEmail: string;
  packageBarcode: string;
  description?: string | null;
  binLabel?: string | null;
  orderNumber?: string | null;
}

export async function sendArrivalNotification(
  params: NotifyArrivalParams
): Promise<boolean> {
  const {
    recipientName,
    recipientEmail,
    packageBarcode,
    description,
    binLabel,
    orderNumber,
  } = params;

  const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2>Hey ${recipientName}, you have a package!</h2>
      <p>A package has arrived and is being held for you.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Barcode</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace;">${packageBarcode}</td>
        </tr>
        ${description ? `<tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Description</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${description}</td></tr>` : ""}
        ${orderNumber ? `<tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Order #</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${orderNumber}</td></tr>` : ""}
        ${binLabel ? `<tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Stored in</td><td style="padding: 8px; border-bottom: 1px solid #eee;">Bin ${binLabel}</td></tr>` : ""}
      </table>
      <p style="color: #666; font-size: 14px;">
        Please arrange pickup at your earliest convenience.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: recipientEmail,
      subject: `Package arrived for you [${packageBarcode}]`,
      html,
    });
    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  }
}

export async function sendPickupConfirmation(params: {
  recipientName: string;
  recipientEmail: string;
  packageBarcode: string;
  collectedBy?: string | null;
}): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2>Package picked up</h2>
      <p>Hi ${params.recipientName}, your package <strong>${params.packageBarcode}</strong> has been collected${params.collectedBy ? ` by ${params.collectedBy}` : ""}.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: params.recipientEmail,
      subject: `Package collected [${params.packageBarcode}]`,
      html,
    });
    return true;
  } catch (err) {
    console.error("Failed to send pickup email:", err);
    return false;
  }
}
