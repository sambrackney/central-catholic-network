import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { welcomeEmail } from '@/lib/email-templates'

// POST /api/notifications/welcome
// Called immediately after a successful signup.
// Uses the server-side session so no extra auth token is needed.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch name from profile (may have just been created by trigger)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const fullName = profile?.full_name || user.user_metadata?.full_name || 'Viking'
  const toEmail  = user.email

  if (!toEmail) return NextResponse.json({ error: 'No email on user' }, { status: 400 })

  const result = await sendEmail({
    to: toEmail,
    subject: `Welcome to Central Connect, ${fullName.split(' ')[0]}!`,
    html: welcomeEmail(fullName),
  })

  return NextResponse.json(result)
}
