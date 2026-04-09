import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { newMessageEmail } from '@/lib/email-templates'
import { isValidUUID } from '@/lib/validation'
import { APP_URL } from '@/lib/email'

// POST /api/notifications/dm
// Body: { recipientId: string, messagePreview: string }
// Sends a DM notification email to the recipient.
// Skips sending if the recipient already has an unread notification pending
// (i.e. there are already unread messages from this sender — meaning we've
//  already notified them and they haven't read it yet).
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { recipientId?: unknown; messagePreview?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { recipientId, messagePreview } = body

  if (typeof recipientId !== 'string' || !isValidUUID(recipientId))
    return NextResponse.json({ error: 'Invalid recipientId' }, { status: 400 })
  if (typeof messagePreview !== 'string')
    return NextResponse.json({ error: 'Invalid messagePreview' }, { status: 400 })

  // Don't notify if already have unread messages from this sender to this recipient
  // (prevents email flooding during rapid conversations)
  const adminDb = createAdminClient()
  const { count: unreadCount } = await adminDb
    .from('direct_messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', user.id)
    .eq('recipient_id', recipientId)
    .eq('is_read', false)

  // Only send if this is the FIRST unread message in this conversation
  // (count will be 1 after the insert that triggered this call, or 0 if somehow read already)
  if ((unreadCount ?? 0) > 1) {
    return NextResponse.json({ skipped: true, reason: 'existing unread messages' })
  }

  // Fetch both profiles
  const [{ data: senderProfile }, { data: recipientProfile }] = await Promise.all([
    adminDb.from('profiles').select('full_name').eq('id', user.id).single(),
    adminDb.from('profiles').select('full_name, contact_email').eq('id', recipientId).single(),
  ])

  const recipientEmail = recipientProfile?.contact_email
  if (!recipientEmail) {
    // Fall back to auth email via service role
    const { data: { user: recipientUser } } = await adminDb.auth.admin.getUserById(recipientId)
    if (!recipientUser?.email) {
      return NextResponse.json({ skipped: true, reason: 'no recipient email' })
    }
    const result = await sendEmail({
      to: recipientUser.email,
      subject: `${senderProfile?.full_name ?? 'Someone'} sent you a message on Central Connect`,
      html: newMessageEmail({
        recipientName: recipientProfile?.full_name ?? 'there',
        senderName: senderProfile?.full_name ?? 'A Viking',
        preview: messagePreview,
        threadUrl: `${APP_URL}/messages/${user.id}`,
      }),
    })
    return NextResponse.json(result)
  }

  const result = await sendEmail({
    to: recipientEmail,
    subject: `${senderProfile?.full_name ?? 'Someone'} sent you a message on Central Connect`,
    html: newMessageEmail({
      recipientName: recipientProfile?.full_name ?? 'there',
      senderName: senderProfile?.full_name ?? 'A Viking',
      preview: messagePreview,
      threadUrl: `${APP_URL}/messages/${user.id}`,
    }),
  })

  return NextResponse.json(result)
}
