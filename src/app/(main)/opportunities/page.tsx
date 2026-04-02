'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Opportunity = Database['public']['Tables']['opportunities']['Row'] & {
  profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'graduation_year'>
}
type OpportunityType = Database['public']['Enums']['opportunity_type']

const TYPE_LABELS: Record<OpportunityType, string> = {
  internship: 'Internship',
  full_time: 'Full-time',
  part_time: 'Part-time',
  networking_event: 'Networking event',
  webinar: 'Webinar',
}

const TYPE_COLORS: Record<OpportunityType, { bg: string; text: string }> = {
  internship: { bg: '#e3f2fd', text: '#1565c0' },
  full_time: { bg: '#e8f5e9', text: '#2e7d32' },
  part_time: { bg: '#f3e5f5', text: '#6a1b9a' },
  networking_event: { bg: 'var(--cc-gold-pale)', text: 'var(--cc-navy)' },
  webinar: { bg: '#fbe9e7', text: '#bf360c' },
}

export default function OpportunitiesPage() {
  const supabase = createClient()
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [filterType, setFilterType] = useState<OpportunityType | ''>('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    type: 'internship' as OpportunityType,
    title: '', company: '', description: '', location: '', is_remote: false, url: '', expires_at: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null))
  }, [supabase])

  const fetchOpps = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('opportunities')
      .select('*, profiles!posted_by(id, full_name, graduation_year)')
      .order('created_at', { ascending: false })
    if (filterType) query = query.eq('type', filterType)
    const { data } = await query
    setOpps((data as Opportunity[]) ?? [])
    setLoading(false)
  }, [supabase, filterType])

  useEffect(() => { fetchOpps() }, [fetchOpps])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId) return
    setSaving(true)
    await supabase.from('opportunities').insert({
      ...form,
      posted_by: currentUserId,
      expires_at: form.expires_at || null,
    })
    setSaving(false)
    setModalOpen(false)
    setForm({ type: 'internship', title: '', company: '', description: '', location: '', is_remote: false, url: '', expires_at: '' })
    fetchOpps()
  }

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)]"
  const labelClass = "block text-sm font-medium mb-1"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>Opportunities Board</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 text-sm rounded-lg font-semibold text-white"
          style={{ background: 'var(--cc-navy)' }}>
          + Post an opportunity
        </button>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType('')}
          className="text-xs px-3 py-1.5 rounded-full border font-medium transition-colors"
          style={{
            borderColor: filterType === '' ? 'var(--cc-navy)' : 'var(--cc-border)',
            background: filterType === '' ? 'var(--cc-navy)' : 'white',
            color: filterType === '' ? 'white' : 'var(--cc-text-muted)',
          }}>
          All
        </button>
        {(Object.keys(TYPE_LABELS) as OpportunityType[]).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className="text-xs px-3 py-1.5 rounded-full border font-medium transition-colors"
            style={{
              borderColor: filterType === t ? 'var(--cc-navy)' : 'var(--cc-border)',
              background: filterType === t ? 'var(--cc-navy)' : 'white',
              color: filterType === t ? 'white' : 'var(--cc-text-muted)',
            }}>
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border p-5 animate-pulse" style={{ borderColor: 'var(--cc-border)' }}>
              <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-64" />
            </div>
          ))}
        </div>
      ) : opps.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: 'var(--cc-border)' }}>
          <p className="text-sm" style={{ color: 'var(--cc-text-muted)' }}>No opportunities posted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {opps.map(opp => {
            const colors = TYPE_COLORS[opp.type]
            return (
              <div key={opp.id} className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--cc-border)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: colors.bg, color: colors.text }}>
                        {TYPE_LABELS[opp.type]}
                      </span>
                      {opp.is_remote && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: '#f5f5f5', color: '#555' }}>Remote</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--cc-navy)' }}>{opp.title}</h3>
                    {opp.company && <p className="text-xs mt-0.5" style={{ color: 'var(--cc-text-muted)' }}>{opp.company}</p>}
                    {opp.location && <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>{opp.location}</p>}
                    {opp.description && <p className="text-sm mt-2">{opp.description}</p>}
                    <p className="text-xs mt-2" style={{ color: 'var(--cc-text-muted)' }}>
                      Posted by <span className="font-medium">{opp.profiles?.full_name ?? 'Alumni'}</span>
                      {opp.profiles?.graduation_year ? ` · Class of ${opp.profiles.graduation_year}` : ''}
                    </p>
                  </div>
                  {opp.url && (
                    <a href={opp.url} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 px-3 py-1.5 text-xs rounded-lg font-semibold text-white"
                      style={{ background: 'var(--cc-navy)' }}>
                      Apply →
                    </a>
                  )}
                </div>
                {opp.expires_at && (
                  <p className="text-xs mt-3 pt-3 border-t" style={{ borderColor: 'var(--cc-border)', color: 'var(--cc-text-muted)' }}>
                    Expires: {new Date(opp.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Post modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--cc-navy)' }}>Post an opportunity</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={handlePost} className="space-y-4">
              <div>
                <label className={labelClass}>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as OpportunityType }))}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }}>
                  {(Object.entries(TYPE_LABELS) as [OpportunityType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Title *</label>
                <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="Summer Software Engineering Intern" />
              </div>
              <div>
                <label className={labelClass}>Company / Organization</label>
                <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }} />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Location</label>
                  <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="Pittsburgh, PA" />
                </div>
                <div>
                  <label className={labelClass}>Apply URL</label>
                  <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="https://…" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className={labelClass}>Expires</label>
                  <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                    className={inputClass} style={{ borderColor: 'var(--cc-border)' }} />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                  <input type="checkbox" checked={form.is_remote} onChange={e => setForm(f => ({ ...f, is_remote: e.target.checked }))} />
                  Remote
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border font-medium" style={{ borderColor: 'var(--cc-border)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg font-semibold text-white disabled:opacity-60"
                  style={{ background: 'var(--cc-navy)' }}>
                  {saving ? 'Posting…' : 'Post opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
