import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID, LIMITS, sanitize } from '@/lib/validation'
import { profanityError } from '@/lib/moderation'
import { sendEmail } from '@/lib/email'
import { groupChatInviteEmail } from '@/lib/email-templates'
import { APP_URL } from '@/lib/email'
import type { Database } from '@/types/database.types'

type ChatType = Database['public']['Enums']['chat_type']

const ALLOWED_CHAT_TYPES = ['industry', 'grad_year', 'club_sport', 'general'] as const

// POST /api/messages/group — create a group chat and seed members
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? sanitize(body.name.trim()) : ''
  const description = typeof body.description === 'string' ? sanitize(body.description.trim()) : ''
  const chat_type = typeof body.chat_type === 'string' ? body.chat_type : 'general'
  const memberIds: string[] = Array.isArray(body.member_ids)
    ? (body.member_ids as unknown[]).filter((id): id is string => typeof id === 'string' && isValidUUID(id))
    : []

  if (!name) return NextResponse.json({ error: 'Chat name is required.' }, { status: 400 })
  if (name.length > LIMITS.TITLE)
    return NextResponse.json({ error: `Name must be ${LIMITS.TITLE} characters or fewer.` }, { status: 400 })
  if (description.length > LIMITS.SHORT_TEXT)
    return NextResponse.json({ error: `Description must be ${LIMITS.SHORT_TEXT} characters or fewer.` }, { status: 400 })
  if (!(ALLOWED_CHAT_TYPES as readonly string[]).includes(chat_type))
    return NextResponse.json({ error: 'Invalid chat type.' }, { status: 400 })

  const profanityErr = profanityError({ name, description })
  if (profanityErr) return NextResponse.json({ error: profanityErr }, { status: 422 })

  // Limit total members to prevent abuse
  const MAX_MEMBERS = 50
  const uniqueIds = [...new Set([user.id, ...memberIds])].slice(0, MAX_MEMBERS)

  const adminDb = createAdminClient()

  // Verify all specified member UUIDs exist in profiles
  if (memberIds.length > 0) {
    const { data: foundProfiles } = await adminDb
      .from('profiles')
      .select('id')
      .in('id', memberIds)
    const foundIds = new Set((foundProfiles ?? []).map(p => p.id))
    const invalid = memberIds.find(id => !foundIds.has(id))
    if (invalid) {
      return NextResponse.json({ error: 'One or more member IDs are invalid.' }, { status: 400 })
    }
  }

  // Create the group chat
  const { data: chat, error: chatError } = await adminDb
    .from('group_chats')
    .insert({ name, description, chat_type: chat_type as ChatType, created_by: user.id })
    .select()
    .single()

  if (chatError || !chat) {
    return NextResponse.json({ error: chatError?.message ?? 'Failed to create chat.' }, { status: 500 })
  }

  // Seed members using service role (bypasses RLS which only allows self-insert)
  const memberRows = uniqueIds.map(profile_id => ({ chat_id: chat.id, profile_id }))
  const { error: memberError } = await adminDb
    .from('group_chat_members')
    .insert(memberRows)

  if (memberError) {
    // Roll back the chat creation if member seeding fails
    await adminDb.from('group_chats').delete().eq('id', chat.id)
    return NextResponse.json({ error: 'Failed to add members.' }, { status: 500 })
  }

  // Send invite emails to added members (fire-and-forget, non-blocking)
  if (memberIds.length > 0) {
    const { data: creatorProfile } = await adminDb
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const { data: memberProfiles } = await adminDb
      .from('profiles')
      .select('id, full_name, contact_email')
      .in('id', memberIds)

    const inviterName = creatorProfile?.full_name ?? 'A Viking'
    const chatUrl = `${APP_URL}/messages/group/${chat.id}`

    for (const member of (memberProfiles ?? [])) {
      // Resolve email — prefer contact_email, fall back to auth email
      const email = member.contact_email || await adminDb.auth.admin
        .getUserById(member.id)
        .then(r => r.data.user?.email ?? '')
        .catch(() => '')

      if (!email) continue

      sendEmail({
        to: email,
        subject: `${inviterName} added you to "${name}" on Central Connect`,
        html: groupChatInviteEmail({
          recipientName: member.full_name ?? 'there',
          inviterName,
          chatName: name,
          chatUrl,
        }),
      }).catch(() => {})
    }
  }

  return NextResponse.json({ chat }, { status: 201 })
}
