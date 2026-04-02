'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Education = Database['public']['Tables']['education']['Row']
type Experience = Database['public']['Tables']['experience']['Row']
type Skill = Database['public']['Tables']['skills']['Row']

interface Props {
  profile: Profile
  education: Education[]
  experience: Experience[]
  skills: Skill[]
  onClose: () => void
  onSaved: () => void
}

export default function EditProfileModal({ profile, education, experience, skills, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  // Profile fields
  const [fullName, setFullName] = useState(profile.full_name)
  const [titleCompany, setTitleCompany] = useState(profile.title_company ?? '')
  const [location, setLocation] = useState(profile.location ?? '')
  const [headline, setHeadline] = useState(profile.headline ?? '')
  const [about, setAbout] = useState(profile.about ?? '')
  const [gradYear, setGradYear] = useState(profile.graduation_year?.toString() ?? '')
  const [hsActivities, setHsActivities] = useState(profile.hs_activities ?? '')
  const [isMentor, setIsMentor] = useState(profile.is_mentor)
  const [openToOpps, setOpenToOpps] = useState(profile.open_to_opportunities)
  const [isHiring, setIsHiring] = useState(profile.is_hiring)
  const [contactEmail, setContactEmail] = useState(profile.contact_email ?? '')
  const [contactPhone, setContactPhone] = useState(profile.contact_phone ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url ?? '')
  const [privacyContact, setPrivacyContact] = useState(profile.privacy_contact_visible)
  const [privacyJob, setPrivacyJob] = useState(profile.privacy_job_visible)

  // College education (first college row or blank)
  const college = education.find(e => e.school_type === 'college')
  const [collegeName, setCollegeName] = useState(college?.institution_name ?? '')
  const [collegeDegree, setCollegeDegree] = useState(college?.degree ?? '')
  const [collegeMajor, setCollegeMajor] = useState(college?.major ?? '')
  const [collegeHonors, setCollegeHonors] = useState(college?.honors ?? '')
  const [collegeYear, setCollegeYear] = useState(college?.grad_year?.toString() ?? '')
  const [collegeWebsite, setCollegeWebsite] = useState(college?.website ?? '')

  // Experience as multi-line text
  const [expText, setExpText] = useState(
    experience.map(e => `${e.title} — ${e.company}${e.description ? ' | ' + e.description : ''}`).join('\n')
  )

  // Skills as comma / newline separated
  const [skillsText, setSkillsText] = useState(skills.map(s => s.skill_name).join(', '))

  async function handleSave() {
    setSaving(true)

    // 1. Update profile table (DB-first)
    await supabase.from('profiles').update({
      full_name: fullName,
      title_company: titleCompany,
      location,
      headline,
      about,
      graduation_year: gradYear ? parseInt(gradYear) : null,
      hs_activities: hsActivities,
      is_mentor: isMentor,
      open_to_opportunities: openToOpps,
      is_hiring: isHiring,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      linkedin_url: linkedinUrl,
      privacy_contact_visible: privacyContact,
      privacy_job_visible: privacyJob,
    }).eq('id', profile.id)

    // 2. Upsert college education
    if (collegeName.trim()) {
      if (college) {
        await supabase.from('education').update({
          institution_name: collegeName,
          degree: collegeDegree,
          major: collegeMajor,
          honors: collegeHonors,
          grad_year: collegeYear ? parseInt(collegeYear) : null,
          website: collegeWebsite,
        }).eq('id', college.id)
      } else {
        await supabase.from('education').insert({
          profile_id: profile.id,
          school_type: 'college',
          institution_name: collegeName,
          degree: collegeDegree,
          major: collegeMajor,
          honors: collegeHonors,
          grad_year: collegeYear ? parseInt(collegeYear) : null,
          website: collegeWebsite,
        })
      }
    }

    // 3. Replace experience rows
    await supabase.from('experience').delete().eq('profile_id', profile.id)
    const expLines = expText.split('\n').filter(l => l.trim())
    if (expLines.length > 0) {
      const rows = expLines.map((line, i) => {
        const [titlePart, rest] = line.split(' — ')
        const [companyPart, descPart] = (rest || '').split(' | ')
        return {
          profile_id: profile.id,
          title: titlePart?.trim() || line.trim(),
          company: companyPart?.trim() || '',
          description: descPart?.trim() || '',
          sort_order: i,
        }
      })
      await supabase.from('experience').insert(rows)
    }

    // 4. Replace skills
    await supabase.from('skills').delete().eq('profile_id', profile.id)
    const skillList = skillsText
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean)
    if (skillList.length > 0) {
      await supabase.from('skills').insert(
        skillList.map(skill_name => ({ profile_id: profile.id, skill_name }))
      )
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)]"
  const labelClass = "block text-sm font-medium mb-1"
  const sectionClass = "text-base font-semibold pt-4 pb-1 border-t mt-4"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10"
          style={{ borderColor: 'var(--cc-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--cc-navy)' }}>Edit profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Header section */}
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cc-text-muted)' }}>Header</p>
          <div><label className={labelClass}>Full name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} /></div>
          <div><label className={labelClass}>Current title + company</label>
            <input type="text" value={titleCompany} onChange={e => setTitleCompany(e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }}
              placeholder="e.g. Software Engineer · Google" /></div>
          <div><label className={labelClass}>Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} /></div>
          <div><label className={labelClass}>Headline</label>
            <input type="text" value={headline} onChange={e => setHeadline(e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }}
              placeholder="Short personal brand statement" /></div>

          {/* About */}
          <div className={sectionClass} style={{ color: 'var(--cc-navy)', borderColor: 'var(--cc-border)' }}>About</div>
          <div><label className={labelClass}>Personal summary</label>
            <textarea value={about} onChange={e => setAbout(e.target.value)} rows={5}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} /></div>

          {/* Status */}
          <div className={sectionClass} style={{ color: 'var(--cc-navy)', borderColor: 'var(--cc-border)' }}>Status & visibility</div>
          <div className="space-y-2">
            {[
              { label: 'Open to mentoring students or alumni', value: isMentor, set: setIsMentor },
              { label: 'Open to opportunities (job searching)', value: openToOpps, set: setOpenToOpps },
              { label: 'Hiring / recruiting', value: isHiring, set: setIsHiring },
              { label: 'Show contact info publicly', value: privacyContact, set: setPrivacyContact },
              { label: 'Show current job publicly', value: privacyJob, set: setPrivacyJob },
            ].map(({ label, value, set }) => (
              <label key={label} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={value} onChange={e => set(e.target.checked)}
                  className="rounded" />
                {label}
              </label>
            ))}
          </div>

          {/* Education */}
          <div className={sectionClass} style={{ color: 'var(--cc-navy)', borderColor: 'var(--cc-border)' }}>Education</div>
          <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-navy)' }}>
            High school: <strong>Central Catholic High School, Pittsburgh PA</strong>
          </div>
          <div><label className={labelClass}>Graduation year at Central Catholic</label>
            <input type="number" value={gradYear} onChange={e => setGradYear(e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="e.g. 2025" /></div>
          <div><label className={labelClass}>Clubs, activities, and sports at PCC</label>
            <textarea value={hsActivities} onChange={e => setHsActivities(e.target.value)} rows={3}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} /></div>

          <p className="text-sm font-medium pt-2" style={{ color: 'var(--cc-navy)' }}>College / University</p>
          <div><label className={labelClass}>Institution name</label>
            <input type="text" value={collegeName} onChange={e => setCollegeName(e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} /></div>
          <div><label className={labelClass}>Website (for logo)</label>
            <input type="text" value={collegeWebsite} onChange={e => setCollegeWebsite(e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="e.g. pitt.edu" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Degree</label>
              <input type="text" value={collegeDegree} onChange={e => setCollegeDegree(e.target.value)}
                className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="B.S." /></div>
            <div><label className={labelClass}>Major</label>
              <input type="text" value={collegeMajor} onChange={e => setCollegeMajor(e.target.value)}
                className={inputClass} style={{ borderColor: 'var(--cc-border)' }} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Honors</label>
              <input type="text" value={collegeHonors} onChange={e => setCollegeHonors(e.target.value)}
                className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="Cum Laude" /></div>
            <div><label className={labelClass}>Graduation year</label>
              <input type="number" value={collegeYear} onChange={e => setCollegeYear(e.target.value)}
                className={inputClass} style={{ borderColor: 'var(--cc-border)' }} /></div>
          </div>

          {/* Experience */}
          <div className={sectionClass} style={{ color: 'var(--cc-navy)', borderColor: 'var(--cc-border)' }}>Experience &amp; involvement</div>
          <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>
            One entry per line. Format: <strong>Title — Company | Description (optional)</strong>
          </p>
          <textarea value={expText} onChange={e => setExpText(e.target.value)} rows={6}
            className={inputClass} style={{ borderColor: 'var(--cc-border)' }}
            placeholder="Software Engineer Intern — Google | Built internal tooling&#10;Senior Class President — Central Catholic | Led student council" />

          {/* Skills */}
          <div className={sectionClass} style={{ color: 'var(--cc-navy)', borderColor: 'var(--cc-border)' }}>Skills &amp; interests</div>
          <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>Separate with commas or new lines</p>
          <textarea value={skillsText} onChange={e => setSkillsText(e.target.value)} rows={3}
            className={inputClass} style={{ borderColor: 'var(--cc-border)' }}
            placeholder="Python, Public speaking, Leadership, React" />

          {/* Contact */}
          <div className={sectionClass} style={{ color: 'var(--cc-navy)', borderColor: 'var(--cc-border)' }}>Contact information</div>
          <div><label className={labelClass}>Contact email</label>
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} /></div>
          <div><label className={labelClass}>Phone (optional)</label>
            <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} /></div>
          <div><label className={labelClass}>LinkedIn URL (optional)</label>
            <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }}
              placeholder="https://linkedin.com/in/yourname" /></div>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3"
          style={{ borderColor: 'var(--cc-border)' }}>
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border font-medium"
            style={{ borderColor: 'var(--cc-border)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm rounded-lg font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--cc-navy)' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
