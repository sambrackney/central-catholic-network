import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import TopNav from '@/components/layout/TopNav'
import { computeRole } from '@/lib/classYear'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Sync the stored role with the computed role on every visit.
  // This handles the automatic May 20 transition without a cron job:
  // when a user first loads the app after the transition date their
  // role is silently updated.  Admin/faculty roles are never touched.
  try {
    const adminDb = createAdminClient()
    const { data: profile } = await adminDb
      .from('profiles')
      .select('id, role, graduation_year')
      .eq('id', user.id)
      .single()

    if (
      profile?.graduation_year &&
      (profile.role === 'student' || profile.role === 'alumni')
    ) {
      const expected = computeRole(profile.graduation_year)
      if (expected !== profile.role) {
        await adminDb
          .from('profiles')
          .update({ role: expected })
          .eq('id', user.id)
      }
    }
  } catch {
    // Non-fatal: proceed even if the sync fails
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--cc-surface)' }}>
      <TopNav />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
