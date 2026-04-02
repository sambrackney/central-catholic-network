import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProfileClient from '../ProfileClient'

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: education }, { data: experience }, { data: skills }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('education').select('*').eq('profile_id', id),
    supabase.from('experience').select('*').eq('profile_id', id).order('sort_order'),
    supabase.from('skills').select('*').eq('profile_id', id),
  ])

  if (!profile) notFound()

  return (
    <ProfileClient
      profile={profile}
      education={education ?? []}
      experience={experience ?? []}
      skills={skills ?? []}
      isOwner={user.id === id}
    />
  )
}
