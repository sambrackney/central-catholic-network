'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import GoogleButton from '@/components/ui/GoogleButton'
import { containsProfanity } from '@/lib/moderation'

const STEPS = [
  { id: 'name',     label: 'Your name',     progress: 25  },
  { id: 'email',    label: 'Email',         progress: 50  },
  { id: 'password', label: 'Password',      progress: 75  },
  { id: 'year',     label: 'Grad year',     progress: 100 },
]

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

export default function SignupPage() {
  const router  = useRouter()
  const supabase = createClient()

  const [step, setStep]       = useState(0)
  const [dir,  setDir]        = useState(1)       // 1 = forward, -1 = back
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [gradYear, setGradYear]     = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input whenever the step changes
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250)
    return () => clearTimeout(t)
  }, [step])

  function advance() {
    setError('')
    if (!validate()) return
    setDir(1)
    setStep(s => s + 1)
  }

  function back() {
    setError('')
    setDir(-1)
    setStep(s => s - 1)
  }

  function validate() {
    if (step === 0) {
      if (!fullName.trim())                  { setError('Please enter your full name.'); return false }
      if (containsProfanity(fullName))       { setError('Your name contains prohibited language.'); return false }
    }
    if (step === 1) {
      if (!email.trim())                   { setError('Please enter your email.'); return false }
      if (!/\S+@\S+\.\S+/.test(email))    { setError('Please enter a valid email address.'); return false }
    }
    if (step === 2 && password.length < 6) { setError('Password must be at least 6 characters.'); return false }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          graduation_year: gradYear ? parseInt(gradYear) : null,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Use the user returned directly from signUp — don't call getUser() separately,
    // as the session may not be established yet if email confirmation is required.
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        graduation_year: gradYear ? parseInt(gradYear) : null,
      })
    }

    // If Supabase issued a session immediately (email confirmation disabled) → go to feed.
    // Otherwise the user needs to confirm their email first → send to login with a notice.
    if (data.session) {
      router.push('/feed')
      router.refresh()
    } else {
      router.push('/login?notice=confirm-email')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (step < STEPS.length - 1) advance()
    }
  }

  const firstName = fullName.split(' ')[0] || 'there'
  const progress  = STEPS[step].progress

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--cc-surface)' }}>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <Image src="/cc-seal.png" alt="Central Catholic seal" width={36} height={36} />
        <span className="text-base font-bold" style={{ color: 'var(--cc-navy)' }}>Central Connect</span>
      </Link>

      <div className="w-full max-w-sm">

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{ color: 'var(--cc-text-muted)' }}>
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="text-xs font-semibold" style={{ color: 'var(--cc-navy)' }}>{progress}%</p>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--cc-border)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--cc-navy)' }}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          </div>
        </div>

        {/* Step card */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden"
          style={{ borderColor: 'var(--cc-border)', minHeight: 340 }}>

          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="px-7 pt-8 pb-7"
              >
                {/* Step 0 — Name */}
                {step === 0 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                        style={{ color: 'var(--cc-gold)' }}>Welcome, Viking</p>
                      <h2 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>
                        What's your full name?
                      </h2>
                    </div>

                    {/* Google shortcut */}
                    <GoogleButton label="Sign up with Google" variant="light" />
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px" style={{ background: 'var(--cc-border)' }} />
                      <span className="text-[11px] font-medium" style={{ color: 'var(--cc-text-muted)' }}>or</span>
                      <div className="flex-1 h-px" style={{ background: 'var(--cc-border)' }} />
                    </div>

                    <input
                      ref={inputRef}
                      type="text"
                      value={fullName}
                      onChange={e => { setFullName(e.target.value); setError('') }}
                      placeholder="Sam Brackney"
                      className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-navy)] transition-shadow"
                      style={{ borderColor: 'var(--cc-border)' }}
                    />
                  </div>
                )}

                {/* Step 1 — Email */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                        style={{ color: 'var(--cc-gold)' }}>Nice to meet you, {firstName}</p>
                      <h2 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>
                        What's your email?
                      </h2>
                    </div>
                    <input
                      ref={inputRef}
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-navy)] transition-shadow"
                      style={{ borderColor: 'var(--cc-border)' }}
                    />
                    <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>
                      We'll use this to sign you in. It won't be shared without your permission.
                    </p>
                  </div>
                )}

                {/* Step 2 — Password */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                        style={{ color: 'var(--cc-gold)' }}>Almost there</p>
                      <h2 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>
                        Create a password
                      </h2>
                    </div>
                    <input
                      ref={inputRef}
                      type="password"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-navy)] transition-shadow"
                      style={{ borderColor: 'var(--cc-border)' }}
                    />
                    {/* Password strength indicator */}
                    {password.length > 0 && (
                      <PasswordStrength password={password} />
                    )}
                  </div>
                )}

                {/* Step 3 — Grad year */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                        style={{ color: 'var(--cc-gold)' }}>One last thing</p>
                      <h2 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>
                        When did you graduate?
                      </h2>
                      <p className="text-sm mt-1" style={{ color: 'var(--cc-text-muted)' }}>
                        Your PCC graduation year — you can skip this and add it later.
                      </p>
                    </div>
                    <input
                      ref={inputRef}
                      type="number"
                      value={gradYear}
                      onChange={e => { setGradYear(e.target.value); setError('') }}
                      placeholder="e.g. 2025"
                      min={1900}
                      max={2035}
                      className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-navy)] transition-shadow"
                      style={{ borderColor: 'var(--cc-border)' }}
                    />
                  </div>
                )}

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="px-7 pb-7 flex items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="flex items-center justify-center w-10 h-10 rounded-xl border text-sm font-medium transition-colors hover:bg-gray-50 shrink-0"
                  style={{ borderColor: 'var(--cc-border)', color: 'var(--cc-text-muted)' }}
                >
                  ←
                </button>
              )}

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={advance}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'var(--cc-navy)' }}
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                  style={{ background: 'var(--cc-gold)' }}
                >
                  {loading ? 'Creating your account…' : 'Join Central Connect →'}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Sign in link */}
        <p className="text-center text-sm mt-6" style={{ color: 'var(--cc-text-muted)' }}>
          Already a member?{' '}
          <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--cc-navy)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 6,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score   = checks.filter(Boolean).length
  const label   = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score]
  const colors  = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']
  const color   = colors[score]

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            className="flex-1 h-1 rounded-full"
            animate={{ background: i < score ? color : '#e5e7eb' }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color }}>{label}</p>
    </div>
  )
}
