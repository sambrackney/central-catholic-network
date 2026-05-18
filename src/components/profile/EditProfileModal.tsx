'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/actions/profiles'
import type { Database } from '@/types/database.types'
import { computeRole, getAccountLabel } from '@/lib/classYear'

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

type UniResult = { name: string; domain: string }

// Shown immediately when the field is focused with no query typed yet
const POPULAR_UNIVERSITIES: UniResult[] = [
  { name: 'University of Pittsburgh', domain: 'pitt.edu' },
  { name: 'Carnegie Mellon University', domain: 'cmu.edu' },
  { name: 'Duquesne University', domain: 'duq.edu' },
  { name: 'Point Park University', domain: 'pointpark.edu' },
  { name: 'Chatham University', domain: 'chatham.edu' },
  { name: 'Penn State University', domain: 'psu.edu' },
  { name: 'University of Pennsylvania', domain: 'upenn.edu' },
  { name: 'Temple University', domain: 'temple.edu' },
  { name: 'Villanova University', domain: 'villanova.edu' },
  { name: 'Drexel University', domain: 'drexel.edu' },
  { name: 'La Salle University', domain: 'lasalle.edu' },
  { name: 'Saint Joseph\'s University', domain: 'sju.edu' },
  { name: 'University of Notre Dame', domain: 'nd.edu' },
  { name: 'Georgetown University', domain: 'georgetown.edu' },
  { name: 'Boston College', domain: 'bc.edu' },
  { name: 'Fordham University', domain: 'fordham.edu' },
  { name: 'Loyola University Chicago', domain: 'luc.edu' },
  { name: 'Marquette University', domain: 'marquette.edu' },
  { name: 'University of Dayton', domain: 'udayton.edu' },
  { name: 'Ohio State University', domain: 'osu.edu' },
  { name: 'University of Michigan', domain: 'umich.edu' },
  { name: 'Indiana University', domain: 'indiana.edu' },
  { name: 'Purdue University', domain: 'purdue.edu' },
  { name: 'West Virginia University', domain: 'wvu.edu' },
  { name: 'Harvard University', domain: 'harvard.edu' },
  { name: 'Yale University', domain: 'yale.edu' },
  { name: 'Princeton University', domain: 'princeton.edu' },
  { name: 'Columbia University', domain: 'columbia.edu' },
  { name: 'New York University', domain: 'nyu.edu' },
  { name: 'Duke University', domain: 'duke.edu' },
  { name: 'Vanderbilt University', domain: 'vanderbilt.edu' },
  { name: 'Emory University', domain: 'emory.edu' },
  { name: 'University of Virginia', domain: 'virginia.edu' },
  { name: 'University of North Carolina', domain: 'unc.edu' },
  { name: 'Georgia Institute of Technology', domain: 'gatech.edu' },
  { name: 'University of Florida', domain: 'ufl.edu' },
  { name: 'University of Southern California', domain: 'usc.edu' },
  { name: 'UCLA', domain: 'ucla.edu' },
  { name: 'UC Berkeley', domain: 'berkeley.edu' },
  { name: 'Stanford University', domain: 'stanford.edu' },
]

function CollegeAutocomplete({
  name,
  website,
  onSelect,
}: {
  name: string
  website: string
  onSelect: (name: string, domain: string) => void
}) {
  const [query, setQuery] = useState(name)
  const [suggestions, setSuggestions] = useState<UniResult[]>([])
  const [open, setOpen] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset logo error when domain changes
  const prevDomain = useRef(website)
  useEffect(() => {
    if (website !== prevDomain.current) {
      setLogoFailed(false)
      prevDomain.current = website
    }
  }, [website])

  // Keep query in sync if parent resets the value
  useEffect(() => { setQuery(name) }, [name])

  function handleFocus() {
    if (!query.trim()) {
      setSuggestions(POPULAR_UNIVERSITIES)
    }
    setOpen(true)
  }

  function handleChange(value: string) {
    setQuery(value)
    setLogoFailed(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setSuggestions(POPULAR_UNIVERSITIES)
      setOpen(true)
      setSearching(false)
      return
    }

    // Instant client-side filter of popular list while API loads
    const local = POPULAR_UNIVERSITIES.filter(u =>
      u.name.toLowerCase().includes(value.toLowerCase())
    )
    setSuggestions(local)
    setOpen(true)
    setSearching(true)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://universities.hipolabs.com/search?name=${encodeURIComponent(value)}&limit=20`
        )
        if (!res.ok) return
        const data: Array<{ name: string; domains: string[] }> = await res.json()
        const results = data
          .filter(u => u.domains?.[0])
          .map(u => ({ name: u.name, domain: u.domains[0] }))
          .slice(0, 12)
        setSuggestions(results.length > 0 ? results : local)
        setOpen(true)
      } catch { /* keep local results on network failure */ }
      finally { setSearching(false) }
    }, 350)
  }

  function pick(uni: UniResult) {
    setQuery(uni.name)
    setOpen(false)
    setSuggestions([])
    onSelect(uni.name, uni.domain)
  }

  function clear() {
    setQuery('')
    setLogoFailed(false)
    setSuggestions(POPULAR_UNIVERSITIES)
    onSelect('', '')
    setOpen(true)
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const domain = website.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const isSelected = !!name.trim()

  // ── Selected state: show logo + name inline, with a change button ──────
  if (isSelected) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
        style={{ borderColor: 'var(--cc-border)', background: 'var(--cc-surface)' }}>
        {domain && !logoFailed ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
            alt={name}
            width={40}
            height={40}
            className="rounded object-contain bg-white shrink-0"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span
            className="w-10 h-10 rounded flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: 'var(--cc-navy)' }}
          >
            {name[0]?.toUpperCase()}
          </span>
        )}
        <span className="text-sm font-medium flex-1" style={{ color: 'var(--cc-navy)' }}>{name}</span>
        <button
          type="button"
          onClick={clear}
          className="text-xs px-2 py-1 rounded border font-medium shrink-0 hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'var(--cc-border)', color: 'var(--cc-text-muted)' }}
        >
          Change
        </button>
      </div>
    )
  }

  // ── Unselected state: search input + dropdown ────────────────────────
  const showDropdown = open && (suggestions.length > 0 || query.trim())

  return (
    <div ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={handleFocus}
          placeholder="Search for a college or university…"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)]"
          style={{ borderColor: 'var(--cc-border)' }}
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--cc-text-muted)' }}>
            Searching…
          </span>
        )}
        {showDropdown && (
          <ul
            className="absolute z-50 left-0 right-0 mt-1 rounded-lg border shadow-lg overflow-y-auto"
            style={{ background: 'white', borderColor: 'var(--cc-border)', maxHeight: 280 }}
          >
            {!query.trim() && (
              <li className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cc-text-muted)', background: 'var(--cc-surface)' }}>
                Popular universities
              </li>
            )}
            {suggestions.map(uni => (
              <SuggestionRow key={uni.domain} uni={uni} onPick={pick} />
            ))}
            {query.trim() && (
              <li className="border-t" style={{ borderColor: 'var(--cc-border)' }}>
                <button
                  type="button"
                  onMouseDown={() => pick({ name: query.trim(), domain: '' })}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                >
                  <span
                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: 'var(--cc-gold)' }}
                  >
                    +
                  </span>
                  <span style={{ color: 'var(--cc-text-muted)' }}>
                    Add &ldquo;<span className="font-medium" style={{ color: 'var(--cc-navy)' }}>{query.trim()}</span>&rdquo;
                  </span>
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

function SuggestionRow({ uni, onPick }: { uni: UniResult; onPick: (u: UniResult) => void }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <li>
      <button
        type="button"
        onMouseDown={() => onPick(uni)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
      >
        {!imgFailed ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${uni.domain}&sz=32`}
            alt=""
            width={20}
            height={20}
            className="rounded object-contain bg-white shrink-0"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: 'var(--cc-navy)' }}
          >
            {uni.name[0]}
          </span>
        )}
        <span style={{ color: 'var(--cc-text)' }}>{uni.name}</span>
        <span className="ml-auto text-xs" style={{ color: 'var(--cc-text-muted)' }}>{uni.domain}</span>
      </button>
    </li>
  )
}

export default function EditProfileModal({ profile, education, experience, skills, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

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
    setSaveError('')

    // 1. Update profile table via server action (enforces content policy)
    const result = await updateProfile({
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
    })

    if (result.error) {
      setSaveError(result.error)
      setSaving(false)
      return
    }

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
          <div>
            <label className={labelClass}>Graduation year at Central Catholic</label>
            <input type="number" value={gradYear} onChange={e => setGradYear(e.target.value)}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="e.g. 2027" />
            {/* Live read-only account-status preview */}
            {gradYear && parseInt(gradYear) > 1940 && (() => {
              const yr   = parseInt(gradYear)
              const role = profile.role === 'admin' || profile.role === 'faculty'
                ? profile.role
                : computeRole(yr)
              const label = getAccountLabel(yr, role)
              const isAlumni  = role === 'alumni'
              const isSpecial = role === 'admin' || role === 'faculty'
              const bg    = isSpecial ? '#dcfce7' : isAlumni ? '#fef3c7' : '#dbeafe'
              const color = isSpecial ? '#166534' : isAlumni ? '#92400e' : '#1e3a8a'
              return (
                <div
                  className="mt-2 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
                  style={{ background: bg, color }}
                >
                  <span>Account status (auto-assigned):</span>
                  <span className="font-bold">{label}</span>
                </div>
              )
            })()}
          </div>
          <div><label className={labelClass}>Clubs, activities, and sports at PCC</label>
            <textarea value={hsActivities} onChange={e => setHsActivities(e.target.value)} rows={3}
              className={inputClass} style={{ borderColor: 'var(--cc-border)' }} /></div>

          <p className="text-sm font-medium pt-2" style={{ color: 'var(--cc-navy)' }}>College / University</p>
          <div>
            <label className={labelClass}>Institution name</label>
            <CollegeAutocomplete
              name={collegeName}
              website={collegeWebsite}
              onSelect={(name, domain) => { setCollegeName(name); setCollegeWebsite(domain) }}
            />
          </div>
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

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 space-y-3"
          style={{ borderColor: 'var(--cc-border)' }}>
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
          <div className="flex justify-end gap-3">
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
    </div>
  )
}
