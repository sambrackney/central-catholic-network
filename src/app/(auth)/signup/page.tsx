'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import GoogleButton from '@/components/ui/GoogleButton'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    graduationYear: '',
    location: '',
    headline: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        graduation_year: form.graduationYear ? parseInt(form.graduationYear) : null,
        location: form.location,
        headline: form.headline,
      }).eq('id', user.id)
    }

    router.push('/feed')
    router.refresh()
    setLoading(false)
  }

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)]"
  const labelClass = "block text-sm font-medium mb-1"

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--cc-surface)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <Image src="/cc-seal.png" alt="Central Catholic seal" width={64} height={64} className="mb-3" />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--cc-navy)' }}>Create your account</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--cc-text-muted)' }}>Central Connect · Central Catholic HS</p>
        </div>

        {/* Google OAuth — fastest path */}
        <GoogleButton label="Sign up with Google" variant="light" />

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: 'var(--cc-border)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--cc-text-muted)' }}>or fill in your details</span>
          <div className="flex-1 h-px" style={{ background: 'var(--cc-border)' }} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Full name</label>
            <input type="text" required value={form.fullName} onChange={e => set('fullName', e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="Sam Brackney" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="you@example.com" />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <input type="password" required minLength={6} value={form.password} onChange={e => set('password', e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="At least 6 characters" />
          </div>
          <div>
            <label className={labelClass}>Graduation year</label>
            <input type="number" value={form.graduationYear} onChange={e => set('graduationYear', e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="e.g. 2025" min={1900} max={2035} />
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="Pittsburgh, PA" />
          </div>
          <div>
            <label className={labelClass}>
              Headline <span className="font-normal" style={{ color: 'var(--cc-text-muted)' }}>(optional)</span>
            </label>
            <input type="text" value={form.headline} onChange={e => set('headline', e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="Short personal brand statement" />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: 'var(--cc-navy)' }}>
            {loading ? 'Creating account…' : 'Create account & continue'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--cc-text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--cc-gold)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
