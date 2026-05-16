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

function generateResetPinEmailHtml(params: SendResetPinEmailParams): string {
  const { userName, resetUrl, expiresInHours } = params;
  const escapedName = escapeHtml(userName);
  const escapedUrl = escapeHtml(resetUrl);

  return `<!doctype html>
<html lang="id">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <title>Reset PIN – Warga Digital</title>
        <style>
            body,
            table,
            td,
            a {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }
            table,
            td {
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }
            img {
                border: 0;
                outline: none;
                text-decoration: none;
                -ms-interpolation-mode: bicubic;
            }
            body {
                margin: 0;
                padding: 0;
                background-color: #f4f6f4;
                font-family:
                    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                    Helvetica, Arial, sans-serif;
            }
            .email-wrapper {
                width: 100%;
                background-color: #f4f6f4;
                padding: 32px 0;
            }
            .email-container {
                max-width: 560px;
                margin: 0 auto;
            }
            .brand-header {
                text-align: center;
                margin-bottom: 20px;
            }
            .brand-name {
                font-size: 15px;
                font-weight: 500;
                color: #333;
                vertical-align: middle;
                margin-left: 8px;
            }
            .brand-icon {
                width: 32px;
                height: 32px;
                background: #1d9e75;
                border-radius: 8px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                vertical-align: middle;
            }
            .card {
                background: #ffffff;
                border-radius: 16px;
                border: 1px solid #e8e8e8;
                overflow: hidden;
            }
            .card-hero {
                background: #1d9e75;
                padding: 36px 32px 40px;
                text-align: center;
            }
            .hero-icon-wrap {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                margin: 0 auto 16px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .hero-title {
                color: #ffffff;
                font-size: 22px;
                font-weight: 600;
                margin: 0 0 6px;
            }
            .hero-sub {
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
                margin: 0;
            }
            .card-body {
                padding: 28px 32px;
            }
            .greeting-label {
                font-size: 14px;
                color: #666;
                margin: 0 0 4px;
            }
            .greeting-name {
                font-size: 17px;
                font-weight: 600;
                color: #111;
                margin: 0 0 18px;
            }
            .body-text {
                font-size: 14px;
                color: #555;
                line-height: 1.7;
                margin: 0 0 20px;
            }
            .info-box {
                background: #e1f5ee;
                border-radius: 10px;
                padding: 12px 16px;
                margin-bottom: 24px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .info-box p {
                font-size: 13px;
                color: #085041;
                margin: 0;
            }
            .btn-wrap {
                text-align: center;
                margin-bottom: 24px;
            }
            .btn-reset {
                display: inline-block;
                background: #1d9e75;
                color: #ffffff !important;
                text-decoration: none;
                font-size: 15px;
                font-weight: 600;
                padding: 14px 40px;
                border-radius: 10px;
                letter-spacing: 0.01em;
            }
            .divider {
                border: none;
                border-top: 1px solid #eee;
                margin: 0 0 20px;
            }
            .fallback-label {
                font-size: 13px;
                color: #888;
                margin: 0 0 8px;
            }
            .fallback-url {
                background: #f7f7f5;
                border-radius: 8px;
                padding: 10px 14px;
                border: 1px solid #e8e8e8;
            }
            .fallback-url a {
                font-size: 11px;
                color: #555;
                word-break: break-all;
                font-family: "Courier New", Courier, monospace;
                line-height: 1.6;
                text-decoration: none;
            }
            .warning-box {
                background: #faeeda;
                border-radius: 10px;
                padding: 12px 16px;
                margin-top: 20px;
            }
            .warning-box p {
                font-size: 13px;
                color: #633806;
                margin: 0;
                line-height: 1.6;
            }
            .card-footer {
                border-top: 1px solid #eee;
                padding: 18px 32px;
                text-align: center;
            }
            .footer-text {
                font-size: 12px;
                color: #aaa;
                margin: 0;
            }
            .email-note {
                text-align: center;
                font-size: 12px;
                color: #aaa;
                margin-top: 16px;
            }
            @media (max-width: 600px) {
                .card-body {
                    padding: 20px 18px;
                }
                .card-hero {
                    padding: 28px 18px 32px;
                }
                .card-footer {
                    padding: 14px 18px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="email-container">
                <!-- Brand Header -->
                <div class="brand-header">
                    <span
                        style="
                            display: inline-flex;
                            align-items: center;
                            gap: 8px;
                        "
                    >
                        <span
                            style="
                                width: 32px;
                                height: 32px;
                                background: #1d9e75;
                                border-radius: 8px;
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                            "
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#fff"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path
                                    d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                                />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </span>
                        <span
                            style="
                                font-size: 15px;
                                font-weight: 500;
                                color: #333;
                            "
                            >Warga Digital</span
                        >
                    </span>
                </div>

                <!-- Card -->
                <div class="card">
                    <!-- Hero -->
                    <div class="card-hero">
                        <div
                            style="
                                width: 56px;
                                height: 56px;
                                border-radius: 50%;
                                background: rgba(255, 255, 255, 0.2);
                                margin: 0 auto 16px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            "
                        >
                            <svg
                                width="28"
                                height="28"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#fff"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <rect
                                    x="3"
                                    y="11"
                                    width="18"
                                    height="11"
                                    rx="2"
                                    ry="2"
                                />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>
                        <h1 class="hero-title">Reset PIN Anda</h1>
                        <p class="hero-sub">Permintaan reset PIN diterima</p>
                    </div>

                    <!-- Body -->
                    <div class="card-body">
                        <p class="greeting-label">Halo,</p>
                        <p class="greeting-name">${escapedName}</p>

                        <p class="body-text">
                            Kami menerima permintaan untuk mereset PIN akun
                            Anda. Klik tombol di bawah ini untuk mengatur PIN
                            baru.
                        </p>

                        <!-- Info box -->
                        <div
                            style="
                                background: #e1f5ee;
                                border-radius: 10px;
                                padding: 12px 16px;
                                margin-bottom: 24px;
                                display: flex;
                                align-items: center;
                                gap: 10px;
                            "
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#0F6E56"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                style="flex-shrink: 0"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v4l2 2" />
                            </svg>
                            <p
                                style="
                                    font-size: 13px;
                                    color: #085041;
                                    margin: 0;
                                "
                            >
                                Tautan ini berlaku selama
                                <strong>${expiresInHours} jam</strong> sejak email ini dikirim
                            </p>
                        </div>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin-bottom: 24px">
                            <a
                                href="${escapedUrl}"
                                style="
                                    display: inline-block;
                                    background: #1d9e75;
                                    color: #ffffff;
                                    text-decoration: none;
                                    font-size: 15px;
                                    font-weight: 600;
                                    padding: 14px 40px;
                                    border-radius: 10px;
                                    letter-spacing: 0.01em;
                                "
                            >
                                Reset PIN Sekarang
                            </a>
                        </div>

                        <hr
                            style="
                                border: none;
                                border-top: 1px solid #eee;
                                margin: 0 0 20px;
                            "
                        />

                        <!-- Fallback URL -->
                        <p
                            style="
                                font-size: 13px;
                                color: #888;
                                margin: 0 0 8px;
                            "
                        >
                            Jika tombol tidak berfungsi, salin tautan berikut ke
                            browser Anda:
                        </p>
                        <div
                            style="
                                background: #f7f7f5;
                                border-radius: 8px;
                                padding: 10px 14px;
                                border: 1px solid #e8e8e8;
                            "
                        >
                            <a
                                href="${escapedUrl}"
                                style="
                                    font-size: 11px;
                                    color: #555;
                                    word-break: break-all;
                                    font-family:
                                        &quot;Courier New&quot;, Courier,
                                        monospace;
                                    line-height: 1.6;
                                    text-decoration: none;
                                "
                            >
                                ${escapedUrl}
                            </a>
                        </div>

                        <!-- Warning box -->
                        <div
                            style="
                                background: #faeeda;
                                border-radius: 10px;
                                padding: 12px 16px;
                                margin-top: 20px;
                                display: flex;
                                align-items: flex-start;
                                gap: 10px;
                            "
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#854F0B"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                style="flex-shrink: 0; margin-top: 1px"
                            >
                                <path
                                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                                />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <p
                                style="
                                    font-size: 13px;
                                    color: #633806;
                                    margin: 0;
                                    line-height: 1.6;
                                "
                            >
                                Jika Anda tidak meminta reset PIN, abaikan email
                                ini. Akun Anda tetap aman dan tidak ada
                                perubahan yang dibuat.
                            </p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div
                        style="
                            border-top: 1px solid #eee;
                            padding: 18px 32px;
                            text-align: center;
                        "
                    >
                        <p style="font-size: 12px; color: #aaa; margin: 0">
                            © ${new Date().getFullYear()} Warga Digital · Semua hak dilindungi
                        </p>
                    </div>
                </div>

                <p
                    style="
                        text-align: center;
                        font-size: 12px;
                        color: #aaa;
                        margin-top: 16px;
                    "
                >
                    Email ini dikirim secara otomatis, harap tidak membalas.
                </p>
            </div>
        </div>
    </body>
</html>`;
}

export async function sendResetPinEmail(
  params: SendResetPinEmailParams,
): Promise<void> {
  const resend = getResendClient();
  const from = getFromEmail();

  const { to, userName, resetUrl, expiresInHours } = params;

  const html = generateResetPinEmailHtml(params);

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
