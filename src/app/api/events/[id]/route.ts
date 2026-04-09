import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID, isValidURL, LIMITS, sanitize } from '@/lib/validation'
import { profanityError } from '@/lib/moderation'
import type { Database } from '@/types/database.types'

type EventType = Database['public']['Enums']['event_type']

const ALLOWED_EVENT_TYPES = ['reunion', 'networking', 'fundraiser', 'webinar', 'other'] as const

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// PATCH /api/events/[id] — creator or admin can edit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid event ID.' }, { status: 400 })
  }

  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const adminDb = createAdminClient()

  // Fetch the event to verify ownership
  const { data: event } = await adminDb
    .from('events')
    .select('id, created_by')
    .eq('id', id)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })

  // Check if the caller is the creator or an admin
  const { data: profile } = await adminDb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isOwner = event.created_by === user.id

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  // Validate and sanitize inputs
  const title = typeof body.title === 'string' ? sanitize(body.title.trim()) : ''
  const description = typeof body.description === 'string' ? sanitize(body.description.trim()) : ''
  const location = typeof body.location === 'string' ? sanitize(body.location.trim()) : ''
  const registration_url = typeof body.registration_url === 'string' ? body.registration_url.trim() : ''
  const event_type = typeof body.event_type === 'string' ? body.event_type : ''
  const event_date = typeof body.event_date === 'string' ? body.event_date.trim() : ''
  const is_virtual = typeof body.is_virtual === 'boolean' ? body.is_virtual : false

  if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
  if (title.length > LIMITS.TITLE)
    return NextResponse.json({ error: `Title must be ${LIMITS.TITLE} characters or fewer.` }, { status: 400 })
  if (description.length > LIMITS.DESCRIPTION)
    return NextResponse.json({ error: `Description must be ${LIMITS.DESCRIPTION} characters or fewer.` }, { status: 400 })
  if (location.length > LIMITS.SHORT_TEXT)
    return NextResponse.json({ error: `Location must be ${LIMITS.SHORT_TEXT} characters or fewer.` }, { status: 400 })
  if (!event_date)
    return NextResponse.json({ error: 'Event date is required.' }, { status: 400 })
  if (!(ALLOWED_EVENT_TYPES as readonly string[]).includes(event_type))
    return NextResponse.json({ error: 'Invalid event type.' }, { status: 400 })
  if (registration_url && !isValidURL(registration_url))
    return NextResponse.json({ error: 'Registration URL must be a valid https:// URL.' }, { status: 400 })

  const profanityErr = profanityError({ title, description, location })
  if (profanityErr) return NextResponse.json({ error: profanityErr }, { status: 422 })

  // event_type is validated above against ALLOWED_EVENT_TYPES, safe to cast
  const { data, error } = await adminDb
    .from('events')
    .update({ title, description, event_type: event_type as EventType, event_date, location, is_virtual, registration_url })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}

// DELETE /api/events/[id] — creator or admin can delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid event ID.' }, { status: 400 })
  }

  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const adminDb = createAdminClient()

  const { data: event } = await adminDb
    .from('events')
    .select('id, created_by')
    .eq('id', id)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 })

  const { data: profile } = await adminDb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isOwner = event.created_by === user.id

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const { error } = await adminDb.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
