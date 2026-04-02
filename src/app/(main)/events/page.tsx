'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Event = Database['public']['Tables']['events']['Row'] & {
  profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name'>
}
type EventType = Database['public']['Enums']['event_type']

const TYPE_LABELS: Record<EventType, string> = {
  reunion: 'Reunion',
  networking: 'Networking night',
  fundraiser: 'Fundraiser',
  webinar: 'Webinar',
  other: 'Other',
}

const TYPE_COLORS: Record<EventType, { bg: string; text: string }> = {
  reunion: { bg: 'var(--cc-gold-pale)', text: 'var(--cc-navy)' },
  networking: { bg: '#e3f2fd', text: '#1565c0' },
  fundraiser: { bg: '#fce4ec', text: '#880e4f' },
  webinar: { bg: '#f3e5f5', text: '#6a1b9a' },
  other: { bg: '#f5f5f5', text: '#555' },
}

export default function EventsPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '', description: '', event_type: 'networking' as EventType,
    event_date: '', location: '', is_virtual: false, registration_url: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null))
  }, [supabase])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select('*, profiles!created_by(id, full_name)')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
    setEvents((data as Event[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId || !form.event_date) return
    setSaving(true)
    await supabase.from('events').insert({
      ...form,
      created_by: currentUserId,
    })
    setSaving(false)
    setModalOpen(false)
    setForm({ title: '', description: '', event_type: 'networking', event_date: '', location: '', is_virtual: false, registration_url: '' })
    fetchEvents()
  }

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)]"
  const labelClass = "block text-sm font-medium mb-1"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>Events</h1>
        <button onClick={() => setModalOpen(true)}
          className="px-4 py-2 text-sm rounded-lg font-semibold text-white"
          style={{ background: 'var(--cc-navy)' }}>
          + Create event
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl border p-5 animate-pulse" style={{ borderColor: 'var(--cc-border)' }}>
              <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-64" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: 'var(--cc-border)' }}>
          <p className="text-sm" style={{ color: 'var(--cc-text-muted)' }}>No upcoming events. Create the first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(evt => {
            const colors = TYPE_COLORS[evt.event_type]
            const date = new Date(evt.event_date)
            return (
              <div key={evt.id} className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--cc-border)' }}>
                <div className="flex items-start gap-4">
                  <div className="text-center shrink-0 w-14">
                    <p className="text-xs font-medium uppercase" style={{ color: 'var(--cc-gold)' }}>
                      {date.toLocaleString('default', { month: 'short' })}
                    </p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--cc-navy)' }}>
                      {date.getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: colors.bg, color: colors.text }}>
                        {TYPE_LABELS[evt.event_type]}
                      </span>
                      {evt.is_virtual && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: '#f5f5f5', color: '#555' }}>Virtual</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--cc-navy)' }}>{evt.title}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--cc-text-muted)' }}>
                      {date.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {evt.location && <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>{evt.location}</p>}
                    {evt.description && <p className="text-sm mt-2">{evt.description}</p>}
                    <p className="text-xs mt-2" style={{ color: 'var(--cc-text-muted)' }}>
                      Hosted by <span className="font-medium">{evt.profiles?.full_name ?? 'Alumni'}</span>
                    </p>
                  </div>
                  {evt.registration_url && (
                    <a href={evt.registration_url} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 px-3 py-1.5 text-xs rounded-lg font-semibold"
                      style={{ background: 'var(--cc-gold)', color: 'white' }}>
                      Register →
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create event modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--cc-navy)' }}>Create an event</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 text-xl">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className={labelClass}>Event title *</label>
                <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }} />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value as EventType }))}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }}>
                  {(Object.entries(TYPE_LABELS) as [EventType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Date &amp; time *</label>
                <input type="datetime-local" required value={form.event_date}
                  onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }} />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }} />
              </div>
              <div>
                <label className={labelClass}>Location</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="Central Catholic High School" />
              </div>
              <div>
                <label className={labelClass}>Registration URL (optional)</label>
                <input type="url" value={form.registration_url}
                  onChange={e => setForm(f => ({ ...f, registration_url: e.target.value }))}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="https://…" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_virtual}
                  onChange={e => setForm(f => ({ ...f, is_virtual: e.target.checked }))} />
                Virtual event
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border font-medium" style={{ borderColor: 'var(--cc-border)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg font-semibold text-white disabled:opacity-60"
                  style={{ background: 'var(--cc-navy)' }}>
                  {saving ? 'Creating…' : 'Create event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
