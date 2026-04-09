'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import EditProfileModal from '@/components/profile/EditProfileModal'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import type { Database } from '@/types/database.types'
import { getDisplayLabel } from '@/lib/classYear'

type Profile = Database['public']['Tables']['profiles']['Row']
type Education = Database['public']['Tables']['education']['Row']
type Experience = Database['public']['Tables']['experience']['Row']
type Skill = Database['public']['Tables']['skills']['Row']

interface Props {
  profile: Profile | null
  education: Education[]
  experience: Experience[]
  skills: Skill[]
  isOwner: boolean
}

export default function ProfileClient({ profile: initialProfile, education: initialEdu, experience: initialExp, skills: initialSkills, isOwner }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(initialProfile)
  const [education, setEducation] = useState(initialEdu)
  const [experience, setExperience] = useState(initialExp)
  const [skills, setSkills] = useState(initialSkills)
  const [editOpen, setEditOpen] = useState(false)

  if (!profile) return <p className="text-center py-20 text-sm" style={{ color: 'var(--cc-text-muted)' }}>Profile not found.</p>

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const college = education.find(e => e.school_type === 'college')

  async function refreshData() {
    const [{ data: p }, { data: edu }, { data: exp }, { data: sk }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', profile!.id).single(),
      supabase.from('education').select('*').eq('profile_id', profile!.id),
      supabase.from('experience').select('*').eq('profile_id', profile!.id).order('sort_order'),
      supabase.from('skills').select('*').eq('profile_id', profile!.id),
    ])
    if (p) setProfile(p)
    if (edu) setEducation(edu)
    if (exp) setExperience(exp)
    if (sk) setSkills(sk)
  }

  async function sendMessage() {
    router.push(`/messages/${profile!.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/feed" className="text-sm hover:underline" style={{ color: 'var(--cc-text-muted)' }}>← Back to feed</Link>

      {/* Hero card */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--cc-border)' }}>
        <div className="h-24 w-full" style={{ background: 'linear-gradient(135deg, var(--cc-navy), var(--cc-navy-dark))' }} />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div>
              {profile.photo_url ? (
                <Image src={profile.photo_url} alt={initials} width={80} height={80}
                  className="rounded-full object-cover border-4 border-white" />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold text-white border-4 border-white"
                  style={{ background: 'var(--cc-navy)' }}>
                  {initials}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-10">
              {isOwner ? (
                <button onClick={() => setEditOpen(true)}
                  className="px-4 py-1.5 text-sm rounded-lg border font-medium"
                  style={{ borderColor: 'var(--cc-navy)', color: 'var(--cc-navy)' }}>
                  Edit profile
                </button>
              ) : (
                <button onClick={sendMessage}
                  className="px-4 py-1.5 text-sm rounded-lg font-semibold text-white"
                  style={{ background: 'var(--cc-navy)' }}>
                  Message
                </button>
              )}
            </div>
          </div>

          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--cc-navy)' }}>
            {profile.full_name}
            {profile.is_verified && (
              <VerifiedBadge size={20} />
            )}
          </h1>
          {profile.headline && <p className="text-sm mt-1">{profile.headline}</p>}
          {profile.title_company && (
            <p className="text-sm mt-1" style={{ color: 'var(--cc-text-muted)' }}>{profile.title_company}</p>
          )}
          {(() => {
            const label = getDisplayLabel(profile.graduation_year, profile.role ?? 'student')
            return label ? (
              <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--cc-navy)' }}>{label}</p>
            ) : null
          })()}
          {profile.location && (
            <p className="text-sm" style={{ color: 'var(--cc-text-muted)' }}>{profile.location}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {profile.is_mentor && (
              <span className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-navy)' }}>
                Open to mentoring
              </span>
            )}
            {profile.open_to_opportunities && (
              <span className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                Open to opportunities
              </span>
            )}
            {profile.is_hiring && (
              <span className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ background: '#e3f2fd', color: '#1565c0' }}>
                Hiring
              </span>
            )}
          </div>

          {profile.engagement_points > 0 && (
            <p className="text-xs mt-3" style={{ color: 'var(--cc-text-muted)' }}>
              Engagement points: <span className="font-semibold" style={{ color: 'var(--cc-gold)' }}>{profile.engagement_points}</span>
            </p>
          )}
        </div>
      </div>

      {/* About */}
      {profile.about && (
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--cc-border)' }}>
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>About</h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{profile.about}</p>
        </div>
      )}

      {/* Education */}
      <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--cc-border)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--cc-navy)' }}>Education</h2>
        <div className="flex items-start gap-3 mb-4">
          <Image src="/cc-seal.png" alt="Central Catholic seal" width={44} height={44} className="rounded shrink-0" />
          <div>
            <p className="text-sm font-semibold">Central Catholic High School</p>
            <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>Pittsburgh, Pennsylvania</p>
            {profile.graduation_year && (
              <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>Class of {profile.graduation_year}</p>
            )}
            {profile.hs_activities && (
              <p className="text-xs mt-1" style={{ color: 'var(--cc-text-muted)' }}>{profile.hs_activities}</p>
            )}
          </div>
        </div>

        {college && (
          <div className="flex items-start gap-3 border-t pt-4" style={{ borderColor: 'var(--cc-border)' }}>
            {college.website ? (
              <img
                src={`https://www.google.com/s2/favicons?sz=44&domain=${college.website}`}
                alt={college.institution_name}
                width={44} height={44}
                className="rounded shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded bg-gray-100 flex items-center justify-center text-xs font-bold shrink-0"
                style={{ color: 'var(--cc-navy)' }}>
                {college.institution_name[0]}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">{college.institution_name}</p>
              {college.degree && <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>{college.degree}{college.major ? `, ${college.major}` : ''}</p>}
              {college.honors && <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>{college.honors}</p>}
              {college.grad_year && <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>Class of {college.grad_year}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Experience */}
      {experience.length > 0 && (
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--cc-border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--cc-navy)' }}>Experience &amp; involvement</h2>
          <ul className="space-y-3">
            {experience.map(exp => (
              <li key={exp.id} className="flex flex-col text-sm">
                <span className="font-semibold">{exp.title}</span>
                {exp.company && <span style={{ color: 'var(--cc-text-muted)' }}>{exp.company}</span>}
                {exp.description && <span className="text-xs mt-0.5" style={{ color: 'var(--cc-text-muted)' }}>{exp.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--cc-border)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--cc-navy)' }}>Skills &amp; interests</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map(skill => (
              <span key={skill.id} className="text-xs px-3 py-1.5 rounded-full border font-medium"
                style={{ borderColor: 'var(--cc-border)', color: 'var(--cc-navy)' }}>
                {skill.skill_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      {isOwner || profile.privacy_contact_visible ? (
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--cc-border)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--cc-navy)' }}>Contact</h2>
          <div className="space-y-2 text-sm">
            {profile.contact_email && (
              <p><span className="font-medium">Email:</span>{' '}
                <a href={`mailto:${profile.contact_email}`} className="hover:underline"
                  style={{ color: 'var(--cc-gold)' }}>{profile.contact_email}</a>
              </p>
            )}
            {profile.contact_phone && (
              <p><span className="font-medium">Phone:</span> {profile.contact_phone}</p>
            )}
            {profile.linkedin_url && (
              <p><a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="hover:underline" style={{ color: 'var(--cc-gold)' }}>LinkedIn →</a>
              </p>
            )}
          </div>
        </div>
      ) : null}

      {editOpen && profile && (
        <EditProfileModal
          profile={profile}
          education={education}
          experience={experience}
          skills={skills}
          onClose={() => setEditOpen(false)}
          onSaved={refreshData}
        />
      )}
    </div>
  )
}
