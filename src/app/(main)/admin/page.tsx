import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'

export const metadata = {
  title: 'Admin Dashboard — Central Connect',
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminDb = createAdminClient()

  // Fetch all profiles for the users table
  const { data: profiles } = await adminDb
    .from('profiles')
    .select('id, full_name, contact_email, role, is_verified, created_at, graduation_year, title_company, location')
    .order('created_at', { ascending: false })

  // Aggregate stats
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
    adminDb.from('posts').select('id, content, created_at, post_type, author_id').order('created_at', { ascending: false }).limit(10),
    adminDb.from('connections').select('id, created_at, status, requester_id, recipient_id').order('created_at', { ascending: false }).limit(10),
  ])

  const stats = {
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
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--cc-text)' }}>
            Admin Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--cc-text-muted)' }}>
            Manage users, roles, and monitor platform activity
          </p>
        </div>
        <span
          className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
          style={{ background: 'var(--cc-primary)', color: 'white' }}
        >
          Administrator
        </span>
      </div>

      <AdminClient
        currentUserId={user?.id ?? ''}
        initialUsers={profiles ?? []}
        stats={stats}
        recentPosts={recentPosts ?? []}
        recentConnections={recentConnections ?? []}
      />
    </div>
  )
}
