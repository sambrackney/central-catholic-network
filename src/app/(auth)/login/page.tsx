'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import GoogleButton from '@/components/ui/GoogleButton'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const notice       = searchParams.get('notice')
  const oauthError   = searchParams.get('error')
  const supabase     = createClient()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push('/feed')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border p-8"
        style={{ borderColor: 'var(--cc-border)' }}>

        <div className="text-center mb-7">
          <h1 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--cc-text-muted)' }}>
            Sign in to your Central Connect account
          </p>
        </div>

        {oauthError && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm border"
            style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
            <p className="font-semibold mb-0.5">Sign-in failed</p>
            <p className="text-xs" style={{ color: '#b91c1c' }}>
              Something went wrong with Google sign-in. Please try again or use email and password.
            </p>
          </div>
        )}

        {notice === 'confirm-email' && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm border"
            style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
            <p className="font-semibold mb-0.5">Check your email</p>
            <p className="text-xs" style={{ color: '#15803d' }}>
              We sent a confirmation link to your inbox. Click it to activate your account, then sign in here.
            </p>
          </div>
        )}

        {/* Google — primary CTA */}
        <GoogleButton label="Continue with Google" variant="light" />

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: 'var(--cc-border)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--cc-text-muted)' }}>or sign in with email</span>
          <div className="flex-1 h-px" style={{ background: 'var(--cc-border)' }} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cc-text)' }}>Email</label>
            <input
              type="email" required value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="you@example.com" autoComplete="email"
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-navy)] transition-shadow"
              style={{ borderColor: 'var(--cc-border)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cc-text)' }}>Password</label>
            <input
              type="password" required value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••" autoComplete="current-password"
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-navy)] transition-shadow"
              style={{ borderColor: 'var(--cc-border)' }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 mt-1"
            style={{ background: 'var(--cc-navy)' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--cc-text-muted)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-semibold hover:underline" style={{ color: 'var(--cc-navy)' }}>
          Create one
        </Link>
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--cc-surface)' }}>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <Image src="/cc-seal.png" alt="Central Catholic seal" width={36} height={36} />
        <span className="text-base font-bold" style={{ color: 'var(--cc-navy)' }}>Central Connect</span>
      </Link>

      <Suspense fallback={<div className="w-full max-w-sm h-80 bg-white rounded-2xl border animate-pulse" style={{ borderColor: 'var(--cc-border)' }} />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
