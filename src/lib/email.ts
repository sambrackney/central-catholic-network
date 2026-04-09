import { Resend } from 'resend'

// Only instantiate on the server — never import this in client components
const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_ADDRESS = 'Central Connect <no-reply@mail.centralcatholichsconnect.com>'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centralcatholichsconnect.com'

export interface EmailPayload {
  to: string
  subject: string
  html: string
}

/**
 * Send a single transactional email via Resend.
 * Returns { success: true } or { success: false, error }.
 * Never throws — callers should not block on email delivery.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    })
    if (error) {
      console.error('[email] Resend error:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    console.error('[email] Unexpected error:', err)
    return { success: false, error: String(err) }
  }
}
