'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sanitize, isValidURL, LIMITS, validateFields } from '@/lib/validation'
import { profanityError } from '@/lib/moderation'
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

type FormState = {
  title: string
  description: string
  event_type: EventType
  event_date: string
  location: string
  is_virtual: boolean
  registration_url: string
}

const emptyForm: FormState = {
  title: '', description: '', event_type: 'networking',
  event_date: '', location: '', is_virtual: false, registration_url: ''
}

export default function EventsPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  // Search + filter state
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<EventType | ''>('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setIsAdmin(profile?.role === 'admin')
    })
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

  function openCreateModal() {
    setEditingEvent(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  function openEditModal(evt: Event) {
    setEditingEvent(evt)
    setForm({
      title: evt.title,
      description: evt.description ?? '',
      event_type: evt.event_type,
      event_date: evt.event_date.slice(0, 16),
      location: evt.location ?? '',
      is_virtual: evt.is_virtual ?? false,
      registration_url: evt.registration_url ?? '',
    })
    setFormError('')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!currentUserId || !form.event_date) return

    // Client-side validation
    const title = sanitize(form.title.trim())
    const description = sanitize(form.description.trim())
    const location = sanitize(form.location.trim())
    const registration_url = form.registration_url.trim()

    const validationErr = validateFields([
      { value: title, label: 'Title', required: true, maxLength: LIMITS.TITLE, checkProfanity: true },
      { value: description, label: 'Description', maxLength: LIMITS.DESCRIPTION, checkProfanity: true },
      { value: location, label: 'Location', maxLength: LIMITS.SHORT_TEXT, checkProfanity: true },
      { value: registration_url, label: 'Registration URL', isUrl: true },
    ])
    if (validationErr) { setFormError(validationErr); return }

    const profanityErr = profanityError({ title, description, location })
    if (profanityErr) { setFormError(profanityErr); return }

    if (!isValidURL(registration_url) && registration_url) {
      setFormError('Registration URL must be a valid URL.')
      return
    }

    setSaving(true)

    if (editingEvent) {
      const res = await fetch(`/api/events/${editingEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, title, description, location, registration_url }),
      })
      if (!res.ok) {
        const json = await res.json()
        setFormError(json.error ?? 'Failed to save event.')
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from('events').insert({
        title, description, event_type: form.event_type, event_date: form.event_date,
        location, is_virtual: form.is_virtual, registration_url,
        created_by: currentUserId,
      })
      if (error) {
        setFormError('Failed to create event.')
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setModalOpen(false)
    setForm(emptyForm)
    setEditingEvent(null)
    fetchEvents()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this event?')) return
    setDeletingId(id)
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setEvents(prev => prev.filter(e => e.id !== id))
    }
    setDeletingId(null)
  }

  // Client-side search + filter
  const visibleEvents = events.filter(evt => {
    const matchesType = !filterType || evt.event_type === filterType
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      evt.title.toLowerCase().includes(q) ||
      (evt.description ?? '').toLowerCase().includes(q) ||
      (evt.location ?? '').toLowerCase().includes(q) ||
      (evt.profiles?.full_name ?? '').toLowerCase().includes(q)
    return matchesType && matchesSearch
  })

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)]"
  const labelClass = "block text-sm font-medium mb-1"

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>Events</h1>
        <button onClick={openCreateModal}
          className="px-4 py-2 text-sm rounded-lg font-semibold text-white"
          style={{ background: 'var(--cc-navy)' }}>
          + Create event
        </button>
      </div>

      {/* Search + type filters */}
      <div className="space-y-3">
        <input
          type="search"
          placeholder="Search events…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)]"
          style={{ borderColor: 'var(--cc-border)' }}
        />
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
          {(Object.keys(TYPE_LABELS) as EventType[]).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(prev => prev === t ? '' : t)}
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
      </div>

      {/* Event cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl border p-5 animate-pulse" style={{ borderColor: 'var(--cc-border)' }}>
              <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-64" />
            </div>
          ))}
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: 'var(--cc-border)' }}>
          <p className="text-sm" style={{ color: 'var(--cc-text-muted)' }}>
            {search || filterType ? 'No events match your search.' : 'No upcoming events. Create the first one!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEvents.map(evt => {
            const colors = TYPE_COLORS[evt.event_type]
            const date = new Date(evt.event_date)
            const canManage = isAdmin || evt.created_by === currentUserId
            return (
              <div key={evt.id} className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--cc-border)' }}>
                <div className="flex items-start gap-4">
                  {/* Date block */}
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
                    {evt.description && <p className="text-sm mt-2 text-gray-700">{evt.description}</p>}
                    <p className="text-xs mt-2" style={{ color: 'var(--cc-text-muted)' }}>
                      Hosted by <span className="font-medium">{evt.profiles?.full_name ?? 'Alumni'}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {evt.registration_url && (
                      <a href={evt.registration_url} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs rounded-lg font-semibold"
                        style={{ background: 'var(--cc-gold)', color: 'white' }}>
                        Register →
                      </a>
                    )}
                    {canManage && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(evt)}
                          className="text-xs px-2 py-1 rounded border font-medium"
                          style={{ borderColor: 'var(--cc-border)', color: 'var(--cc-navy)' }}>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(evt.id)}
                          disabled={deletingId === evt.id}
                          className="text-xs px-2 py-1 rounded border font-medium disabled:opacity-40"
                          style={{ borderColor: '#dc2626', color: '#dc2626' }}>
                          {deletingId === evt.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--cc-navy)' }}>
                {editingEvent ? 'Edit event' : 'Create an event'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 text-xl" disabled={saving}>&times;</button>
            </div>
            {formError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Event title *</label>
                <input type="text" required maxLength={LIMITS.TITLE}
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }} />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select value={form.event_type}
                  onChange={e => setForm(f => ({ ...f, event_type: e.target.value as EventType }))}
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
                <textarea value={form.description} maxLength={LIMITS.DESCRIPTION}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }} />
              </div>
              <div>
                <label className={labelClass}>Location</label>
                <input type="text" maxLength={LIMITS.SHORT_TEXT} value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }}
                  placeholder="Central Catholic High School" />
              </div>
              <div>
                <label className={labelClass}>Registration URL (optional)</label>
                <input type="url" maxLength={LIMITS.URL} value={form.registration_url}
                  onChange={e => setForm(f => ({ ...f, registration_url: e.target.value }))}
                  className={inputClass} style={{ borderColor: 'var(--cc-border)' }} placeholder="https://…" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_virtual}
                  onChange={e => setForm(f => ({ ...f, is_virtual: e.target.checked }))} />
                Virtual event
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg border font-medium" style={{ borderColor: 'var(--cc-border)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg font-semibold text-white disabled:opacity-60"
                  style={{ background: 'var(--cc-navy)' }}>
                  {saving ? (editingEvent ? 'Saving…' : 'Creating…') : (editingEvent ? 'Save changes' : 'Create event')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
