import nodemailer from 'nodemailer'

// ── Transport ─────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
  },
})

const FROM    = process.env.SMTP_FROM   ?? 'LensLinkUp <noreply@lenslinkup.in>'
const APP_URL = process.env.APP_URL     ?? 'http://35.154.114.186:3000'

// ── Helpers ───────────────────────────────────────────────────────────────────

function base(body: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
        <tr><td style="background:#0D9488;padding:24px 32px">
          <span style="color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px">
            Lens<span style="color:#F97316">Link</span>Up
          </span>
        </td></tr>
        <tr><td style="padding:32px">
          ${body}
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:12px">
          You received this email because you have an account on LensLinkUp.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()
}

// ── Emails ────────────────────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${APP_URL}/verify-email?token=${token}`
  await transporter.sendMail({
    from:    FROM,
    to,
    subject: 'Verify your LensLinkUp email',
    html: base(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px">Confirm your email address</h2>
      <p style="margin:0 0 24px;color:#475569;line-height:1.6">
        Click the button below to verify your email. The link expires in <strong>24 hours</strong>.
      </p>
      <a href="${link}"
         style="display:inline-block;background:#0D9488;color:#fff;text-decoration:none;
                font-weight:700;font-size:15px;padding:12px 28px;border-radius:10px">
        Verify Email
      </a>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:12px">
        Or copy this link:<br>
        <a href="${link}" style="color:#0D9488;word-break:break-all">${link}</a>
      </p>
    `),
  })
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${APP_URL}/reset-password?token=${token}`
  await transporter.sendMail({
    from:    FROM,
    to,
    subject: 'Reset your LensLinkUp password',
    html: base(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px">Reset your password</h2>
      <p style="margin:0 0 24px;color:#475569;line-height:1.6">
        Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
        If you didn't request this, you can safely ignore this email.
      </p>
      <a href="${link}"
         style="display:inline-block;background:#0D9488;color:#fff;text-decoration:none;
                font-weight:700;font-size:15px;padding:12px 28px;border-radius:10px">
        Reset Password
      </a>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:12px">
        Or copy this link:<br>
        <a href="${link}" style="color:#0D9488;word-break:break-all">${link}</a>
      </p>
    `),
  })
}
