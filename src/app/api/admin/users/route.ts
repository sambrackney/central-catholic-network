import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'

type UserRole = Database['public']['Enums']['user_role']

async function getCallerProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const adminDb = createAdminClient()
  const { data: profile } = await adminDb
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  return profile
}

// GET /api/admin/users — list all users with profile data
export async function GET() {
  const caller = await getCallerProfile()
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminDb = createAdminClient()

  // Join auth.users email via admin API
  const { data: profiles, error } = await adminDb
    .from('profiles')
    .select('id, full_name, contact_email, role, is_verified, created_at, graduation_year, title_company, location')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users: profiles })
}

// PATCH /api/admin/users — update a user's role or is_verified
export async function PATCH(request: NextRequest) {
  const caller = await getCallerProfile()
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json() as {
    userId: string
    role?: UserRole
    is_verified?: boolean
  }

  const { userId, role, is_verified } = body

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (role !== undefined) updates.role = role
  if (is_verified !== undefined) updates.is_verified = is_verified

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('id, full_name, role, is_verified')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user: data })
}
