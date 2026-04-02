'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import GoogleButton from '@/components/ui/GoogleButton'

type Tab = 'signin' | 'signup'

export default function HeroAuth() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [siEmail, setSiEmail] = useState('')
  const [siPassword, setSiPassword] = useState('')

  const [suName, setSuName] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suYear, setSuYear] = useState('')

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPassword })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/feed')
    router.refresh()
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPassword,
      options: { data: { full_name: suName } },
    })
    if (error) { setError(error.message); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (user && suYear) {
      await supabase.from('profiles').update({ graduation_year: parseInt(suYear) }).eq('id', user.id)
    }
    router.push('/feed')
    router.refresh()
  }

  const inputClass =
    'w-full bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--cc-gold)] focus:ring-1 focus:ring-[var(--cc-gold)] transition-colors'

  return (
    <div
      className="rounded-2xl p-6 shadow-2xl"
      style={{
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {/* Tabs */}
      <div className="flex rounded-lg overflow-hidden mb-5 border border-white/15">
        {(['signin', 'signup'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setError('') }}
            className="flex-1 py-2 text-sm font-semibold transition-colors"
            style={{
              background: tab === t ? 'var(--cc-gold)' : 'transparent',
              color: tab === t ? 'white' : 'rgba(255,255,255,0.55)',
            }}
          >
            {t === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      {/* Google OAuth button — always visible on both tabs */}
      <GoogleButton
        label={tab === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
        variant="dark"
      />

      {/* Divider */}
      <div className="flex items-center gap-2 my-4">
        <div className="flex-1 h-px bg-white/15" />
        <span className="text-[11px] text-white/40 font-medium">or</span>
        <div className="flex-1 h-px bg-white/15" />
      </div>

      {/* Sign-in form */}
      {tab === 'signin' && (
        <form onSubmit={handleSignIn} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-white/70">Email</label>
            <input type="email" required value={siEmail} onChange={e => setSiEmail(e.target.value)}
              placeholder="you@example.com" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white/70">Password</label>
            <input type="password" required value={siPassword} onChange={e => setSiPassword(e.target.value)}
              placeholder="••••••••" className={inputClass} />
          </div>

          {error && (
            <p className="text-xs text-red-300 bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--cc-navy)' }}>
            {loading ? 'Signing in…' : 'Sign in with email →'}
          </button>

          <p className="text-center text-xs text-white/40 pt-1">
            No account yet?{' '}
            <button type="button" onClick={() => setTab('signup')}
              className="text-[var(--cc-gold-light)] font-semibold hover:underline">
              Create one
            </button>
          </p>
        </form>
      )}

      {/* Sign-up form */}
      {tab === 'signup' && (
        <form onSubmit={handleSignUp} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-white/70">Full name</label>
            <input type="text" required value={suName} onChange={e => setSuName(e.target.value)}
              placeholder="Sam Brackney" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white/70">Email</label>
            <input type="email" required value={suEmail} onChange={e => setSuEmail(e.target.value)}
              placeholder="you@example.com" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white/70">Password</label>
            <input type="password" required minLength={6} value={suPassword} onChange={e => setSuPassword(e.target.value)}
              placeholder="At least 6 characters" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white/70">
              PCC grad year <span className="text-white/35">(optional)</span>
            </label>
            <input type="number" value={suYear} onChange={e => setSuYear(e.target.value)}
              placeholder="e.g. 2025" min={1900} max={2035} className={inputClass} />
          </div>

          {error && (
            <p className="text-xs text-red-300 bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--cc-gold)' }}>
            {loading ? 'Creating account…' : 'Join with email →'}
          </button>

          <p className="text-center text-xs text-white/40 pt-1">
            Already a member?{' '}
            <button type="button" onClick={() => setTab('signin')}
              className="text-[var(--cc-gold-light)] font-semibold hover:underline">
              Sign in
            </button>
          </p>
        </form>
      )}

      <p className="text-[11px] text-center mt-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.28)' }}>
        Full-page view:{' '}
        <Link href="/login" className="underline hover:text-white/60">Sign in</Link>
        {' '}·{' '}
        <Link href="/signup" className="underline hover:text-white/60">Sign up</Link>
      </p>
    </div>
  )
}
