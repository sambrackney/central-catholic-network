import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminDb = createAdminClient()
  const { data: profile } = await adminDb
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div
          className="max-w-md w-full rounded-2xl border p-8 text-center"
          style={{ background: 'white', borderColor: 'var(--cc-border)' }}
        >
          {/* Shield icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: '#fef2f2' }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <circle cx="12" cy="16" r="0.5" fill="#dc2626" />
            </svg>
          </div>

          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--cc-navy)' }}>
            Admin Access Required
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--cc-text-muted)' }}>
            {profile?.full_name ? `Hi ${profile.full_name} — this` : 'This'} page is restricted
            to administrator accounts only. If you believe this is a mistake, please contact a
            platform administrator.
          </p>

          <Link
            href="/feed"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-opacity hover:opacity-90"
            style={{ background: 'var(--cc-navy)', color: 'white' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
