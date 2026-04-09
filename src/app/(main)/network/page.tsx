'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import type { Database } from '@/types/database.types'
import { getDisplayLabel } from '@/lib/classYear'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function NetworkPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [gradYear, setGradYear] = useState('')
  const [location, setLocation] = useState('')
  const [filterMentor, setFilterMentor] = useState(searchParams.get('filter') === 'mentor')
  const [filterHiring, setFilterHiring] = useState(false)
  const [filterOpps, setFilterOpps] = useState(false)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('profiles')
      .select('*')
      .order('graduation_year', { ascending: false })

    if (search.trim()) {
      query = query.or(`full_name.ilike.%${search}%,headline.ilike.%${search}%,title_company.ilike.%${search}%,hs_activities.ilike.%${search}%`)
    }
    if (gradYear) query = query.eq('graduation_year', parseInt(gradYear))
    if (location) query = query.ilike('location', `%${location}%`)
    if (filterMentor) query = query.eq('is_mentor', true)
    if (filterHiring) query = query.eq('is_hiring', true)
    if (filterOpps) query = query.eq('open_to_opportunities', true)

    const { data } = await query.limit(60)
    setProfiles(data ?? [])
    setLoading(false)
  }, [supabase, search, gradYear, location, filterMentor, filterHiring, filterOpps])

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  const initials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>Alumni Directory</h1>
        <p className="text-sm" style={{ color: 'var(--cc-text-muted)' }}>{profiles.length} alumni</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--cc-border)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <input
            type="search"
            placeholder="Search name, role, activity…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)]"
            style={{ borderColor: 'var(--cc-border)' }}
          />
          <input
            type="number"
            placeholder="Grad year (e.g. 2022)"
            value={gradYear}
            onChange={e => setGradYear(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)]"
            style={{ borderColor: 'var(--cc-border)' }}
          />
          <input
            type="text"
            placeholder="Location (e.g. Pittsburgh)"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)]"
            style={{ borderColor: 'var(--cc-border)' }}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Open to mentoring', val: filterMentor, set: setFilterMentor },
            { label: 'Hiring', val: filterHiring, set: setFilterHiring },
            { label: 'Open to opportunities', val: filterOpps, set: setFilterOpps },
          ].map(({ label, val, set }) => (
            <label key={label} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="rounded" />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Results grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-5 animate-pulse" style={{ borderColor: 'var(--cc-border)' }}>
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-28" />
                  <div className="h-3 bg-gray-100 rounded w-36" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: 'var(--cc-border)' }}>
          <p className="text-sm" style={{ color: 'var(--cc-text-muted)' }}>No alumni found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(p => (
            <Link key={p.id} href={`/profile/${p.id}`}
              className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow block"
              style={{ borderColor: 'var(--cc-border)' }}>
              <div className="flex items-start gap-3">
                {p.photo_url ? (
                  <Image src={p.photo_url} alt={initials(p.full_name)} width={48} height={48}
                    className="rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: 'var(--cc-navy)' }}>
                    {initials(p.full_name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate flex items-center gap-1" style={{ color: 'var(--cc-navy)' }}>
                    {p.full_name}
                    {p.is_verified && (
                      <VerifiedBadge size={14} />
                    )}
                  </p>
                  {p.title_company && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--cc-text-muted)' }}>{p.title_company}</p>
                  )}
                  {p.graduation_year && (
                    <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>Class of {p.graduation_year}</p>
                  )}
                  {p.location && (
                    <p className="text-xs truncate" style={{ color: 'var(--cc-text-muted)' }}>{p.location}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {p.is_mentor && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-navy)' }}>Mentor</span>
                )}
                {p.is_hiring && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: '#e3f2fd', color: '#1565c0' }}>Hiring</span>
                )}
                {p.open_to_opportunities && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: '#e8f5e9', color: '#2e7d32' }}>Open to opps</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
