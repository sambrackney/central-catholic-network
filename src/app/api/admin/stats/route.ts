import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

// GET /api/admin/stats — aggregate platform statistics
export async function GET() {
  const caller = await getCallerProfile()
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminDb = createAdminClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: adminCount },
    { count: alumniCount },
    { count: studentCount },
    { count: facultyCount },
    { count: verifiedCount },
    { count: totalPosts },
    { count: totalConnections },
    { count: newUsersThisWeek },
    { count: newPostsThisWeek },
    { data: recentUsers },
    { data: recentPosts },
    { data: recentConnections },
  ] = await Promise.all([
    adminDb.from('profiles').select('*', { count: 'exact', head: true }),
    adminDb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    adminDb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'alumni'),
    adminDb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    adminDb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'faculty'),
    adminDb.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true),
    adminDb.from('posts').select('*', { count: 'exact', head: true }),
    adminDb.from('connections').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
    adminDb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    adminDb.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    adminDb.from('profiles').select('id, full_name, role, is_verified, created_at, contact_email').order('created_at', { ascending: false }).limit(5),
    adminDb.from('posts').select('id, content, created_at, post_type, author_id').order('created_at', { ascending: false }).limit(5),
    adminDb.from('connections').select('id, created_at, status, requester_id, recipient_id').order('created_at', { ascending: false }).limit(5),
  ])

  return NextResponse.json({
    totals: {
      users: totalUsers ?? 0,
      posts: totalPosts ?? 0,
      connections: totalConnections ?? 0,
      verified: verifiedCount ?? 0,
    },
    byRole: {
      admin: adminCount ?? 0,
      alumni: alumniCount ?? 0,
      student: studentCount ?? 0,
      faculty: facultyCount ?? 0,
    },
    thisWeek: {
      newUsers: newUsersThisWeek ?? 0,
      newPosts: newPostsThisWeek ?? 0,
    },
    recent: {
      users: recentUsers ?? [],
      posts: recentPosts ?? [],
      connections: recentConnections ?? [],
    },
  })
}
