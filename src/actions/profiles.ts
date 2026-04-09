'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { profanityError } from '@/lib/moderation'
import { computeRole } from '@/lib/classYear'

export interface ProfileUpdatePayload {
  full_name: string | null
  title_company: string
  location: string
  headline: string
  about: string
  graduation_year: number | null
  hs_activities: string
  is_mentor: boolean
  open_to_opportunities: boolean
  is_hiring: boolean
  contact_email: string
  contact_phone: string
  linkedin_url: string
  privacy_contact_visible: boolean
  privacy_job_visible: boolean
}

export async function updateProfile(
  payload: ProfileUpdatePayload
): Promise<{ error?: string }> {
  const err = profanityError({
    name: payload.full_name ?? '',
    headline: payload.headline,
    'about section': payload.about,
    'activities section': payload.hs_activities,
  })
  if (err) return { error: err }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('profiles').update({
    full_name: payload.full_name ?? undefined,
    title_company: payload.title_company || null,
    location: payload.location || null,
    headline: payload.headline || null,
    about: payload.about || null,
    graduation_year: payload.graduation_year,
    hs_activities: payload.hs_activities || null,
    is_mentor: payload.is_mentor,
    open_to_opportunities: payload.open_to_opportunities,
    is_hiring: payload.is_hiring,
    contact_email: payload.contact_email || null,
    contact_phone: payload.contact_phone || null,
    linkedin_url: payload.linkedin_url || null,
    privacy_contact_visible: payload.privacy_contact_visible,
    privacy_job_visible: payload.privacy_job_visible,
  }).eq('id', user.id)

  if (error) return { error: error.message }

  // If graduation_year changed, recompute the role for student/alumni accounts.
  // The DB trigger handles this automatically, but we also do it here via the
  // admin client so the change is reflected immediately (bypasses RLS).
  if (payload.graduation_year !== undefined) {
    const adminDb = createAdminClient()
    const { data: existing } = await adminDb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (existing && (existing.role === 'student' || existing.role === 'alumni')) {
      const newRole = computeRole(payload.graduation_year)
      if (newRole !== existing.role) {
        await adminDb.from('profiles').update({ role: newRole }).eq('id', user.id)
      }
    }
  }

  return {}
}
