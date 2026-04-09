import { APP_URL } from './email'

// ── Brand tokens ──────────────────────────────────────────────────────────
const NAVY  = '#001F5B'
const GOLD  = '#C9A84C'
const LIGHT = '#F8F9FB'
const MUTED = '#6B7280'

// ── Shared layout wrapper ──────────────────────────────────────────────────
function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Central Connect</title>
</head>
<body style="margin:0;padding:0;background:${LIGHT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${LIGHT};padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <a href="${APP_URL}" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px;">
              <span style="display:inline-block;width:36px;height:36px;border-radius:50%;background:${NAVY};color:white;font-size:14px;font-weight:700;line-height:36px;text-align:center;">CC</span>
              <span style="font-size:16px;font-weight:700;color:${NAVY};letter-spacing:-0.3px;">Central Connect</span>
            </a>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:white;border-radius:16px;padding:36px 40px;border:1px solid #E5E7EB;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding-top:20px;">
            <p style="margin:0;font-size:12px;color:${MUTED};">
              Sent by <a href="${APP_URL}" style="color:${NAVY};text-decoration:none;font-weight:600;">Central Catholic Alumni Network</a>
              &nbsp;·&nbsp;
              <a href="${APP_URL}/profile" style="color:${MUTED};text-decoration:none;">Manage notifications</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Button helper ──────────────────────────────────────────────────────────
function btn(href: string, label: string, style: 'primary' | 'gold' = 'primary'): string {
  const bg = style === 'gold' ? GOLD : NAVY
  return `<a href="${href}" style="display:inline-block;background:${bg};color:white;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">${label}</a>`
}

// ── Divider ────────────────────────────────────────────────────────────────
const HR = `<hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />`

// ═════════════════════════════════════════════════════════════════════════
// 1. WELCOME EMAIL
// ═════════════════════════════════════════════════════════════════════════
export function welcomeEmail(fullName: string): string {
  const firstName = fullName.split(' ')[0] || 'Viking'
  return layout(`
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${GOLD};letter-spacing:.08em;text-transform:uppercase;">Welcome, Viking</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${NAVY};">You're in, ${firstName}!</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Your Central Connect account is live. You're now part of a private network of Central Catholic alumni, students, and faculty — all here to connect, mentor, and open doors.
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">
      Here's what you can do right now:
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">📋 &nbsp;<strong>Complete your profile</strong> — add your class year, career, and headline</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">🤝 &nbsp;<strong>Browse the directory</strong> — find classmates and request mentorship</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">💼 &nbsp;<strong>Explore opportunities</strong> — internships and jobs posted by alumni</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#374151;">📅 &nbsp;<strong>Check upcoming events</strong> — reunions, networking nights, and more</td></tr>
    </table>
    <p style="margin:0 0 28px;">
      ${btn(`${APP_URL}/feed`, 'Go to your feed →', 'gold')}
    </p>
    ${HR}
    <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.6;">
      Questions? Reply to this email or reach out through the platform. Welcome to the network, ${firstName} — once a Viking, always a Viking.
    </p>
  `)
}

// ═════════════════════════════════════════════════════════════════════════
// 2. NEW DIRECT MESSAGE NOTIFICATION
// ═════════════════════════════════════════════════════════════════════════
export function newMessageEmail(opts: {
  recipientName: string
  senderName: string
  preview: string
  threadUrl: string
}): string {
  const firstName = opts.recipientName.split(' ')[0] || 'there'
  const safePreview = opts.preview.length > 120 ? opts.preview.slice(0, 117) + '…' : opts.preview
  return layout(`
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${GOLD};letter-spacing:.08em;text-transform:uppercase;">New message</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${NAVY};">Hi ${firstName}, you have a new message</h1>
    <p style="margin:0 0 8px;font-size:15px;color:#374151;">
      <strong>${opts.senderName}</strong> sent you a direct message on Central Connect:
    </p>
    <blockquote style="margin:0 0 28px;padding:14px 18px;background:${LIGHT};border-left:3px solid ${GOLD};border-radius:4px;font-size:14px;color:#374151;line-height:1.6;">
      "${safePreview}"
    </blockquote>
    <p style="margin:0 0 28px;">
      ${btn(opts.threadUrl, 'Reply now →')}
    </p>
    ${HR}
    <p style="margin:0;font-size:13px;color:${MUTED};">
      You received this because ${opts.senderName} messaged you on Central Connect. To stop these emails, update your notification preferences in your profile settings.
    </p>
  `)
}

// ═════════════════════════════════════════════════════════════════════════
// 3. CONNECTION REQUEST NOTIFICATION
// ═════════════════════════════════════════════════════════════════════════
export function connectionRequestEmail(opts: {
  recipientName: string
  senderName: string
  senderTitle: string
  senderYear: number | null
  senderProfileUrl: string
  networkUrl: string
}): string {
  const firstName = opts.recipientName.split(' ')[0] || 'there'
  const classLine = opts.senderYear ? `Class of ${opts.senderYear}` : 'Alumni'
  return layout(`
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${GOLD};letter-spacing:.08em;text-transform:uppercase;">Connection request</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${NAVY};">Hey ${firstName}, someone wants to connect</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${opts.senderName}</strong> (${classLine}${opts.senderTitle ? ` · ${opts.senderTitle}` : ''}) sent you a connection request on Central Connect.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="padding-right:12px;">
          ${btn(opts.senderProfileUrl, 'View profile →')}
        </td>
        <td>
          ${btn(opts.networkUrl, 'Go to network', 'gold')}
        </td>
      </tr>
    </table>
    ${HR}
    <p style="margin:0;font-size:13px;color:${MUTED};">
      You can accept or decline this request from your network page on Central Connect.
    </p>
  `)
}

// ═════════════════════════════════════════════════════════════════════════
// 4. GROUP CHAT INVITE NOTIFICATION
// ═════════════════════════════════════════════════════════════════════════
export function groupChatInviteEmail(opts: {
  recipientName: string
  inviterName: string
  chatName: string
  chatUrl: string
}): string {
  const firstName = opts.recipientName.split(' ')[0] || 'there'
  return layout(`
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${GOLD};letter-spacing:.08em;text-transform:uppercase;">Group chat invite</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${NAVY};">You've been added to a group chat</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      <strong>${opts.inviterName}</strong> added you to the <strong>${opts.chatName}</strong> group chat on Central Connect.
    </p>
    <p style="margin:0 0 28px;">
      ${btn(opts.chatUrl, 'Open group chat →')}
    </p>
    ${HR}
    <p style="margin:0;font-size:13px;color:${MUTED};">
      You can leave the group at any time from within the chat.
    </p>
  `)
}

// ═════════════════════════════════════════════════════════════════════════
// 5. PASSWORD RESET (Supabase custom template override)
// ═════════════════════════════════════════════════════════════════════════
export function passwordResetEmail(opts: { resetUrl: string }): string {
  return layout(`
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${GOLD};letter-spacing:.08em;text-transform:uppercase;">Security</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${NAVY};">Reset your password</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      We received a request to reset your Central Connect password. Click the button below — the link expires in 1 hour.
    </p>
    <p style="margin:0 0 28px;">
      ${btn(opts.resetUrl, 'Reset my password →', 'gold')}
    </p>
    ${HR}
    <p style="margin:0;font-size:13px;color:${MUTED};">
      If you didn't request this, you can safely ignore this email. Your password has not been changed.
    </p>
  `)
}
