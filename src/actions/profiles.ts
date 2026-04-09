'use server'

import { createClient } from '@/lib/supabase/server'
import { profanityError } from '@/lib/moderation'

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
  return {}
}
