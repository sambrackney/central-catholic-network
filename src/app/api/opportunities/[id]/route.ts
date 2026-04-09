import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID, isValidURL, LIMITS, sanitize } from '@/lib/validation'
import { profanityError } from '@/lib/moderation'
import type { Database } from '@/types/database.types'

type OppType = Database['public']['Enums']['opportunity_type']

const ALLOWED_OPP_TYPES = ['internship', 'full_time', 'part_time', 'networking_event', 'webinar'] as const

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// DELETE /api/opportunities/[id] — poster or admin can delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid opportunity ID.' }, { status: 400 })
  }

  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const adminDb = createAdminClient()

  const { data: opp } = await adminDb
    .from('opportunities')
    .select('id, posted_by')
    .eq('id', id)
    .single()

  if (!opp) return NextResponse.json({ error: 'Opportunity not found.' }, { status: 404 })

  const { data: profile } = await adminDb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isOwner = opp.posted_by === user.id

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const { error } = await adminDb.from('opportunities').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// PATCH /api/opportunities/[id] — poster or admin can edit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid opportunity ID.' }, { status: 400 })
  }

  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const adminDb = createAdminClient()

  const { data: opp } = await adminDb
    .from('opportunities')
    .select('id, posted_by')
    .eq('id', id)
    .single()

  if (!opp) return NextResponse.json({ error: 'Opportunity not found.' }, { status: 404 })

  const { data: profile } = await adminDb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isOwner = opp.posted_by === user.id

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const type = typeof body.type === 'string' ? body.type : ''
  const title = typeof body.title === 'string' ? sanitize(body.title.trim()) : ''
  const company = typeof body.company === 'string' ? sanitize(body.company.trim()) : ''
  const description = typeof body.description === 'string' ? sanitize(body.description.trim()) : ''
  const location = typeof body.location === 'string' ? sanitize(body.location.trim()) : ''
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  const expires_at = typeof body.expires_at === 'string' ? body.expires_at || null : null
  const is_remote = typeof body.is_remote === 'boolean' ? body.is_remote : false

  if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
  if (title.length > LIMITS.TITLE)
    return NextResponse.json({ error: `Title must be ${LIMITS.TITLE} characters or fewer.` }, { status: 400 })
  if (description.length > LIMITS.DESCRIPTION)
    return NextResponse.json({ error: `Description must be ${LIMITS.DESCRIPTION} characters or fewer.` }, { status: 400 })
  if (company.length > LIMITS.COMPANY)
    return NextResponse.json({ error: `Company must be ${LIMITS.COMPANY} characters or fewer.` }, { status: 400 })
  if (location.length > LIMITS.SHORT_TEXT)
    return NextResponse.json({ error: `Location must be ${LIMITS.SHORT_TEXT} characters or fewer.` }, { status: 400 })
  if (!(ALLOWED_OPP_TYPES as readonly string[]).includes(type))
    return NextResponse.json({ error: 'Invalid opportunity type.' }, { status: 400 })
  if (url && !isValidURL(url))
    return NextResponse.json({ error: 'Apply URL must be a valid https:// URL.' }, { status: 400 })

  const profanityErr = profanityError({ title, company, description, location })
  if (profanityErr) return NextResponse.json({ error: profanityErr }, { status: 422 })

  const { data, error } = await adminDb
    .from('opportunities')
    .update({ type: type as OppType, title, company, description, location, url, expires_at, is_remote })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ opportunity: data })
}
