import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const adminDb = createAdminClient()
  const { data: profile } = await adminDb
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? profile : null
}

// DELETE /api/admin/opportunities?id=...
export async function DELETE(request: NextRequest) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const adminDb = createAdminClient()
  const { error } = await adminDb.from('opportunities').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
