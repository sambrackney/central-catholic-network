'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import GoogleButton from '@/components/ui/GoogleButton'
import { containsProfanity } from '@/lib/moderation'
import { computeRole, getClassTitle } from '@/lib/classYear'

const STEPS = [
  { id: 'name',     label: 'Your name',   progress: 25  },
  { id: 'email',    label: 'Email',       progress: 50  },
  { id: 'password', label: 'Password',    progress: 75  },
  { id: 'year',     label: 'Grad year',   progress: 100 },
]

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

// ── Eye-toggle button ─────────────────────────────────────────────────────
function EyeButton({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={visible ? 'Hide password' : 'Show password'}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
    >
      {visible ? (
        // Eye-off
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        // Eye
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  )
}

export default function SignupPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step, setStep]         = useState(0)
  const [dir,  setDir]          = useState(1)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef             = useRef<ReturnType<typeof setInterval> | null>(null)

  const [fullName, setFullName]       = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [gradYear, setGradYear]       = useState('')

  // Eye-toggle state
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250)
    return () => clearTimeout(t)
  }, [step])

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }
  }, [])

  function startCooldown(seconds: number) {
    setCooldown(seconds)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          cooldownRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

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
      if (!fullName.trim())            { setError('Please enter your full name.'); return false }
      if (containsProfanity(fullName)) { setError('Your name contains prohibited language.'); return false }
    }
    if (step === 1) {
      if (!email.trim())                 { setError('Please enter your email.'); return false }
      if (!/\S+@\S+\.\S+/.test(email))  { setError('Please enter a valid email address.'); return false }
    }
    if (step === 2) {
      if (password.length < 6)               { setError('Password must be at least 6 characters.'); return false }
      if (!confirmPassword)                  { setError('Please confirm your password.'); return false }
      if (password !== confirmPassword)      { setError('Passwords do not match.'); return false }
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (cooldown > 0) return

    // Final validation before submit
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    // Use our server-side route that bypasses Supabase's shared email rate limit
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        password,
        graduationYear: gradYear || null,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong. Please try again.')
      setLoading(false)
      if (res.status === 429) startCooldown(60)
      return
    }

    // Account created — sign in immediately (user is auto-confirmed server-side)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      // Edge case: account created but sign-in failed — send to login
      router.push('/login?notice=account-created')
      return
    }

    router.push('/feed')
    router.refresh()
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
          style={{ borderColor: 'var(--cc-border)', minHeight: 360 }}>

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
                {/* ── Step 0: Name ─────────────────────────────────── */}
                {step === 0 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                        style={{ color: 'var(--cc-gold)' }}>Welcome, Viking</p>
                      <h2 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>
                        What&apos;s your full name?
                      </h2>
                    </div>
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

                {/* ── Step 1: Email ─────────────────────────────────── */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                        style={{ color: 'var(--cc-gold)' }}>Nice to meet you, {firstName}</p>
                      <h2 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>
                        What&apos;s your email?
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
                      We&apos;ll use this to sign you in. It won&apos;t be shared without your permission.
                    </p>
                  </div>
                )}

                {/* ── Step 2: Password + Confirm ────────────────────── */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                        style={{ color: 'var(--cc-gold)' }}>Almost there</p>
                      <h2 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>
                        Create a password
                      </h2>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--cc-text-muted)' }}>
                        Password
                      </label>
                      <div className="relative">
                        <input
                          ref={inputRef}
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => { setPassword(e.target.value); setError('') }}
                          placeholder="At least 6 characters"
                          autoComplete="new-password"
                          className="w-full border rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-navy)] transition-shadow"
                          style={{ borderColor: 'var(--cc-border)' }}
                        />
                        <EyeButton visible={showPassword} onToggle={() => setShowPassword(v => !v)} />
                      </div>
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--cc-text-muted)' }}>
                        Confirm password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => { setConfirm(e.target.value); setError('') }}
                          placeholder="Re-enter your password"
                          autoComplete="new-password"
                          className="w-full border rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-navy)] transition-shadow"
                          style={{
                            borderColor: confirmPassword && password !== confirmPassword
                              ? '#dc2626'
                              : confirmPassword && password === confirmPassword
                                ? '#16a34a'
                                : 'var(--cc-border)',
                          }}
                        />
                        <EyeButton visible={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
                        {/* Match indicator */}
                        {confirmPassword.length > 0 && (
                          <span className="absolute right-9 top-1/2 -translate-y-1/2 text-base">
                            {password === confirmPassword ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs mt-1 text-red-600">Passwords do not match.</p>
                      )}
                      {confirmPassword && password === confirmPassword && (
                        <p className="text-xs mt-1" style={{ color: '#16a34a' }}>Passwords match.</p>
                      )}
                    </div>

                    {password.length > 0 && <PasswordStrength password={password} />}
                  </div>
                )}

                {/* ── Step 3: Grad year ─────────────────────────────── */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                        style={{ color: 'var(--cc-gold)' }}>One last thing</p>
                      <h2 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>
                        What is your Central Catholic graduation year?
                      </h2>
                      <p className="text-sm mt-1" style={{ color: 'var(--cc-text-muted)' }}>
                        Current or future year for students; past year if you&apos;re an alum. You can skip this and add it later.
                      </p>
                    </div>
                    <input
                      ref={inputRef}
                      type="number"
                      value={gradYear}
                      onChange={e => { setGradYear(e.target.value); setError('') }}
                      placeholder="e.g. 2027"
                      min={1940}
                      max={new Date().getFullYear() + 6}
                      className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-navy)] transition-shadow"
                      style={{ borderColor: 'var(--cc-border)' }}
                    />
                    {gradYear && parseInt(gradYear) > 1940 && (
                      <GradYearPreview year={parseInt(gradYear)} />
                    )}
                  </div>
                )}

                {/* Error message */}
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

            {/* Nav buttons */}
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
                  disabled={loading || cooldown > 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                  style={{ background: 'var(--cc-gold)' }}
                >
                  {loading
                    ? 'Creating your account…'
                    : cooldown > 0
                      ? `Try again in ${cooldown}s`
                      : 'Join Central Connect →'}
                </button>
              )}
            </div>
          </form>
        </div>

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

function GradYearPreview({ year }: { year: number }) {
  const role  = computeRole(year)
  const title = getClassTitle(year)
  const isAlumni = role === 'alumni'
  const label = isAlumni
    ? `Class of ${year} · Alumni`
    : title ? `Class of ${year} · ${title}` : `Class of ${year} · Student`
  const bg    = isAlumni ? '#fef3c7' : '#dbeafe'
  const color = isAlumni ? '#92400e' : '#1e3a8a'

  return (
    <div className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
      style={{ background: bg, color }}>
      <span className="text-base">{isAlumni ? '🎓' : '📚'}</span>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs font-normal opacity-75">
          {isAlumni ? "You'll join as an Alumni member." : `You'll join as a ${title ?? 'Student'}.`}
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
  const score  = checks.filter(Boolean).length
  const label  = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score]
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']
  const color  = colors[score]

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
