import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { welcomeEmail } from '@/lib/email-templates'
import { sanitize, LIMITS } from '@/lib/validation'
import { profanityError } from '@/lib/moderation'
import { computeRole } from '@/lib/classYear'

// POST /api/auth/signup
//
// Uses the Supabase service-role admin API to create the user directly.
// This bypasses Supabase's shared email pool entirely — no confirmation email
// is queued, so there is no 3/hour rate limit.  We send our own branded
// welcome email via Resend instead.
//
// Because this is a closed alumni network (members know they belong here),
// we set email_confirm: true so the account is immediately active.  The
// admin dashboard can still revoke / unverify accounts as needed.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const fullName      = typeof body.fullName      === 'string' ? sanitize(body.fullName.trim())      : ''
  const email         = typeof body.email         === 'string' ? body.email.trim().toLowerCase()     : ''
  const password      = typeof body.password      === 'string' ? body.password                       : ''
  const rawYear       = typeof body.graduationYear === 'string' ? body.graduationYear                : ''
  const graduationYear = rawYear ? parseInt(rawYear) : null

  // ── Server-side validation ────────────────────────────────────────────
  if (!fullName)
    return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
  if (fullName.length > LIMITS.NAME)
    return NextResponse.json({ error: 'Name is too long.' }, { status: 400 })
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  if (!password || password.length < 6)
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
  if (password.length > 128)
    return NextResponse.json({ error: 'Password is too long.' }, { status: 400 })
  if (graduationYear !== null && (graduationYear < 1940 || graduationYear > new Date().getFullYear() + 6))
    return NextResponse.json({ error: 'Invalid graduation year.' }, { status: 400 })

  const profanityErr = profanityError({ name: fullName })
  if (profanityErr) return NextResponse.json({ error: profanityErr }, { status: 422 })

  const adminDb = createAdminClient()

  // ── Create the user without triggering any Supabase email ─────────────
  const { data, error: createError } = await adminDb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // auto-confirm — no email queued from Supabase
    user_metadata: {
      full_name: fullName,
      graduation_year: graduationYear,
    },
  })

  if (createError) {
    // Map common errors to friendly messages
    const msg = createError.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('unique'))
      return NextResponse.json({ error: 'An account with that email already exists. Try signing in.' }, { status: 409 })
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  const userId = data.user?.id
  if (userId) {
    const role = computeRole(graduationYear)

    // Upsert profile row (the DB trigger may have already created one)
    await adminDb.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      graduation_year: graduationYear,
      contact_email: email,
      role,
    })

    // Send branded welcome email via Resend (fire-and-forget)
    sendEmail({
      to: email,
      subject: `Welcome to Central Connect, ${fullName.split(' ')[0]}!`,
      html: welcomeEmail(fullName),
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
