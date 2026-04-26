import { Resend } from "resend";

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

function getFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }
  return from;
}

function getAppUrl(): string {
  const url = process.env.APP_URL;
  if (!url) {
    throw new Error("APP_URL is not configured");
  }
  return url.replace(/\/$/, "");
}

export interface SendResetPinEmailParams {
  to: string;
  userName: string;
  resetUrl: string;
  expiresInHours: number;
}

export async function sendResetPinEmail(params: SendResetPinEmailParams): Promise<void> {
  const resend = getResendClient();
  const from = getFromEmail();

  const { to, userName, resetUrl, expiresInHours } = params;

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset PIN Warga Digital</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .brand { font-size: 20px; font-weight: 800; color: #16a34a; margin-bottom: 8px; }
    .title { font-size: 18px; font-weight: 700; color: #18181b; margin-bottom: 12px; }
    .body { font-size: 14px; line-height: 1.6; color: #3f3f46; margin-bottom: 24px; }
    .button { display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; }
    .footer { margin-top: 24px; font-size: 12px; color: #a1a1aa; line-height: 1.5; }
    .link { word-break: break-all; color: #16a34a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">Warga Digital</div>
    <div class="title">Reset PIN Anda</div>
    <div class="body">
      Halo <strong>${escapeHtml(userName)}</strong>,<br /><br />
      Kami menerima permintaan untuk mereset PIN akun Anda. Klik tombol di bawah ini untuk mengatur PIN baru. Tautan ini berlaku selama <strong>${expiresInHours} jam</strong>.
    </div>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${escapeHtml(resetUrl)}" class="button">Reset PIN</a>
    </div>
    <div class="body" style="margin-bottom: 8px;">
      Jika tombol tidak berfungsi, salin dan tempel tautan berikut ke browser Anda:
    </div>
    <div class="link">${escapeHtml(resetUrl)}</div>
    <div class="footer">
      Jika Anda tidak meminta reset PIN, abaikan email ini. Akun Anda tetap aman.<br />
      &copy; Warga Digital
    </div>
  </div>
</body>
</html>
  `.trim();

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Permintaan Reset PIN - Warga Digital",
    html,
    text: `Halo ${userName},\n\nKami menerima permintaan untuk mereset PIN akun Anda.\n\nSilakan buka tautan berikut untuk mengatur PIN baru:\n${resetUrl}\n\nTautan ini berlaku selama ${expiresInHours} jam.\n\nJika Anda tidak meminta reset PIN, abaikan email ini.`,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export { getAppUrl };
