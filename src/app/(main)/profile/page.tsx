import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'

export default async function MyProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: education }, { data: experience }, { data: skills }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('education').select('*').eq('profile_id', user.id),
    supabase.from('experience').select('*').eq('profile_id', user.id).order('sort_order'),
    supabase.from('skills').select('*').eq('profile_id', user.id),
  ])

  return (
    <ProfileClient
      profile={profile}
      education={education ?? []}
      experience={experience ?? []}
      skills={skills ?? []}
      isOwner={true}
    />
  )
}
