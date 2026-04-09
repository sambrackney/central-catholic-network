import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { connectionRequestEmail } from '@/lib/email-templates'
import { isValidUUID } from '@/lib/validation'
import { APP_URL } from '@/lib/email'

// POST /api/notifications/connection
// Body: { recipientId: string }
// Called when a user sends a connection request.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { recipientId?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { recipientId } = body
  if (typeof recipientId !== 'string' || !isValidUUID(recipientId))
    return NextResponse.json({ error: 'Invalid recipientId' }, { status: 400 })

  const adminDb = createAdminClient()

  const [{ data: sender }, { data: recipient }] = await Promise.all([
    adminDb.from('profiles').select('full_name, title_company, graduation_year').eq('id', user.id).single(),
    adminDb.from('profiles').select('full_name, contact_email').eq('id', recipientId).single(),
  ])

  // Resolve recipient email: prefer contact_email, fall back to auth email
  let toEmail = recipient?.contact_email ?? ''
  if (!toEmail) {
    const { data: { user: recipientUser } } = await adminDb.auth.admin.getUserById(recipientId)
    toEmail = recipientUser?.email ?? ''
  }

  if (!toEmail) return NextResponse.json({ skipped: true, reason: 'no recipient email' })

  const result = await sendEmail({
    to: toEmail,
    subject: `${sender?.full_name ?? 'A Viking'} wants to connect with you on Central Connect`,
    html: connectionRequestEmail({
      recipientName: recipient?.full_name ?? 'there',
      senderName: sender?.full_name ?? 'A Viking',
      senderTitle: sender?.title_company ?? '',
      senderYear: sender?.graduation_year ?? null,
      senderProfileUrl: `${APP_URL}/profile/${user.id}`,
      networkUrl: `${APP_URL}/network`,
    }),
  })

  return NextResponse.json(result)
}
