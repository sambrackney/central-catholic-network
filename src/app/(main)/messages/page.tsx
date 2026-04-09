'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { sanitize, LIMITS } from '@/lib/validation'
import { profanityError } from '@/lib/moderation'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type ChatType = Database['public']['Enums']['chat_type']

interface Conversation {
  profile: Profile
  lastMessage: string
  lastAt: string
  unread: number
}

interface GroupChat {
  id: string
  name: string
  description: string | null
  chat_type: ChatType
}

// ── tiny avatar helper ────────────────────────────────────────────────────
function initials(name: string | null) {
  return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
}

const CHAT_TYPE_LABELS: Record<ChatType, string> = {
  industry: 'Industry',
  grad_year: 'Class year',
  club_sport: 'Club / Sport',
  general: 'General',
}

const POLL_INTERVAL_MS = 20_000 // refresh conversations every 20 s

export default function MessagesPage() {
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [groupChats, setGroupChats] = useState<GroupChat[]>([])
  const [loading, setLoading] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── New DM modal state ─────────────────────────────────────────────────
  const [dmOpen, setDmOpen] = useState(false)
  const [dmSearch, setDmSearch] = useState('')
  const [dmResults, setDmResults] = useState<Pick<Profile, 'id' | 'full_name' | 'photo_url' | 'graduation_year' | 'title_company'>[]>([])
  const [dmSearching, setDmSearching] = useState(false)

  // ── Create group chat modal state ─────────────────────────────────────
  const [gcOpen, setGcOpen] = useState(false)
  const [gcForm, setGcForm] = useState({
    name: '', description: '', chat_type: 'general' as ChatType,
  })
  const [gcMemberSearch, setGcMemberSearch] = useState('')
  const [gcMemberResults, setGcMemberResults] = useState<Pick<Profile, 'id' | 'full_name' | 'photo_url' | 'graduation_year' | 'title_company'>[]>([])
  const [gcMembers, setGcMembers] = useState<Pick<Profile, 'id' | 'full_name' | 'photo_url' | 'graduation_year' | 'title_company'>[]>([])
  const [gcSearching, setGcSearching] = useState(false)
  const [gcCreating, setGcCreating] = useState(false)
  const [gcError, setGcError] = useState('')

  // ── Load conversations ─────────────────────────────────────────────────
  const loadConversations = useCallback(async (userId: string) => {
    const { data: msgs } = await supabase
      .from('direct_messages')
      .select('sender_id, recipient_id, content, created_at, is_read')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (!msgs) return

    const seen = new Set<string>()
    const convMap = new Map<string, Conversation>()
    const otherIds: string[] = []

    for (const msg of msgs) {
      const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id
      if (!seen.has(otherId)) {
        seen.add(otherId)
        otherIds.push(otherId)
      }
    }

    if (otherIds.length === 0) {
      setConversations([])
      return
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', otherIds)

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

    for (const otherId of otherIds) {
      const profile = profileMap.get(otherId)
      if (!profile) continue
      const lastMsg = msgs.find(m =>
        (m.sender_id === userId && m.recipient_id === otherId) ||
        (m.sender_id === otherId && m.recipient_id === userId)
      )
      const unread = msgs.filter(
        m => m.sender_id === otherId && m.recipient_id === userId && !m.is_read
      ).length
      convMap.set(otherId, {
        profile,
        lastMessage: lastMsg?.content ?? '',
        lastAt: lastMsg?.created_at ?? '',
        unread,
      })
    }

    setConversations(Array.from(convMap.values()))
  }, [supabase])

  const loadGroupChats = useCallback(async (userId: string) => {
    const { data: memberships } = await supabase
      .from('group_chat_members')
      .select('chat_id, group_chats(id, name, description, chat_type)')
      .eq('profile_id', userId)
    setGroupChats(
      (memberships ?? [])
        .map((m: { group_chats: unknown }) => m.group_chats as GroupChat | null)
        .filter((g): g is GroupChat => Boolean(g))
    )
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)
      await Promise.all([loadConversations(user.id), loadGroupChats(user.id)])
      setLoading(false)

      // Realtime: new DM arrives → refresh conversation list
      const channel = supabase
        .channel(`inbox-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'direct_messages',
          filter: `recipient_id=eq.${user.id}`,
        }, () => loadConversations(user.id))
        .subscribe()

      // Polling fallback for sent messages updating order
      pollRef.current = setInterval(() => {
        loadConversations(user.id)
        loadGroupChats(user.id)
      }, POLL_INTERVAL_MS)

      return () => {
        supabase.removeChannel(channel)
        if (pollRef.current) clearInterval(pollRef.current)
      }
    })

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [supabase, loadConversations, loadGroupChats])

  // ── DM user search ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!dmSearch.trim() || !currentUserId) { setDmResults([]); return }
    const t = setTimeout(async () => {
      setDmSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, graduation_year, title_company')
        .neq('id', currentUserId)
        .ilike('full_name', `%${dmSearch.trim()}%`)
        .limit(8)
      setDmResults(data ?? [])
      setDmSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [dmSearch, currentUserId, supabase])

  // ── Group chat member search ───────────────────────────────────────────
  useEffect(() => {
    if (!gcMemberSearch.trim() || !currentUserId) { setGcMemberResults([]); return }
    const t = setTimeout(async () => {
      setGcSearching(true)
      const alreadyAdded = gcMembers.map(m => m.id)
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, graduation_year, title_company')
        .neq('id', currentUserId)
        .not('id', 'in', `(${alreadyAdded.join(',') || 'null'})`)
        .ilike('full_name', `%${gcMemberSearch.trim()}%`)
        .limit(8)
      setGcMemberResults(data ?? [])
      setGcSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [gcMemberSearch, currentUserId, gcMembers, supabase])

  async function createGroupChat(e: React.FormEvent) {
    e.preventDefault()
    setGcError('')
    if (!gcForm.name.trim()) { setGcError('Chat name is required.'); return }
    if (gcForm.name.length > LIMITS.TITLE) { setGcError(`Name must be ${LIMITS.TITLE} chars or fewer.`); return }
    if (gcMembers.length === 0) { setGcError('Add at least one other member to the group.'); return }

    const sanitizedName = sanitize(gcForm.name.trim())
    const sanitizedDesc = sanitize(gcForm.description.trim())

    const profanityErr = profanityError({ name: sanitizedName, description: sanitizedDesc })
    if (profanityErr) { setGcError(profanityErr); return }

    setGcCreating(true)
    const res = await fetch('/api/messages/group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: sanitizedName,
        description: sanitizedDesc,
        chat_type: gcForm.chat_type,
        member_ids: gcMembers.map(m => m.id),
      }),
    })
    const json = await res.json()
    setGcCreating(false)
    if (!res.ok) { setGcError(json.error ?? 'Failed to create chat.'); return }

    // Refresh and close
    if (currentUserId) await loadGroupChats(currentUserId)
    setGcOpen(false)
    setGcForm({ name: '', description: '', chat_type: 'general' })
    setGcMembers([])
    setGcMemberSearch('')
  }

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)]"

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>Messages</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setDmOpen(true)}
            className="px-3 py-1.5 text-sm rounded-lg font-semibold border"
            style={{ borderColor: 'var(--cc-navy)', color: 'var(--cc-navy)' }}>
            + New message
          </button>
          <button
            onClick={() => setGcOpen(true)}
            className="px-3 py-1.5 text-sm rounded-lg font-semibold text-white"
            style={{ background: 'var(--cc-navy)' }}>
            + New group
          </button>
        </div>
      </div>

      {/* ── Direct messages ────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--cc-border)' }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--cc-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--cc-navy)' }}>Direct messages</p>
          <span className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>
            Refreshes every {POLL_INTERVAL_MS / 1000}s
          </span>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-24" />
                  <div className="h-3 bg-gray-100 rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--cc-text-muted)' }}>No direct messages yet.</p>
            <button
              onClick={() => setDmOpen(true)}
              className="text-sm font-semibold underline"
              style={{ color: 'var(--cc-navy)' }}>
              Start a conversation →
            </button>
          </div>
        ) : (
          <ul>
            {conversations.map(conv => (
              <li key={conv.profile.id}>
                <Link href={`/messages/${conv.profile.id}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                  style={{ borderColor: 'var(--cc-border)' }}>
                  {conv.profile.photo_url ? (
                    <Image src={conv.profile.photo_url} alt={initials(conv.profile.full_name)}
                      width={40} height={40} className="rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: 'var(--cc-navy)' }}>
                      {initials(conv.profile.full_name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--cc-navy)' }}>
                        {conv.profile.full_name}
                      </p>
                      {conv.unread > 0 && (
                        <span className="w-5 h-5 rounded-full text-[11px] font-bold text-white flex items-center justify-center shrink-0"
                          style={{ background: 'var(--cc-navy)' }}>{conv.unread}</span>
                      )}
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--cc-text-muted)' }}>{conv.lastMessage}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Group chats ────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--cc-border)' }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--cc-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--cc-navy)' }}>Group chats</p>
          <button
            onClick={() => setGcOpen(true)}
            className="text-xs font-semibold underline"
            style={{ color: 'var(--cc-navy)' }}>
            + Create
          </button>
        </div>
        {!loading && groupChats.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--cc-text-muted)' }}>No group chats yet.</p>
            <button
              onClick={() => setGcOpen(true)}
              className="text-sm font-semibold underline"
              style={{ color: 'var(--cc-navy)' }}>
              Create one →
            </button>
          </div>
        ) : (
          <ul>
            {groupChats.map(chat => (
              <li key={chat.id}>
                <Link href={`/messages/group/${chat.id}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                  style={{ borderColor: 'var(--cc-border)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: 'var(--cc-gold)' }}>
                    #
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--cc-navy)' }}>{chat.name}</p>
                    <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>
                      {CHAT_TYPE_LABELS[chat.chat_type]}
                      {chat.description ? ` · ${chat.description}` : ''}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── New DM modal ────────────────────────────────────────────────── */}
      {dmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDmOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--cc-navy)' }}>New direct message</h2>
              <button onClick={() => setDmOpen(false)} className="text-gray-400 text-xl">&times;</button>
            </div>
            <input
              type="text"
              placeholder="Search by name…"
              value={dmSearch}
              onChange={e => setDmSearch(e.target.value)}
              className={inputCls}
              style={{ borderColor: 'var(--cc-border)' }}
              autoFocus
            />
            <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
              {dmSearching && <p className="text-xs text-center py-3" style={{ color: 'var(--cc-text-muted)' }}>Searching…</p>}
              {!dmSearching && dmSearch.trim() && dmResults.length === 0 && (
                <p className="text-xs text-center py-3" style={{ color: 'var(--cc-text-muted)' }}>No users found.</p>
              )}
              {dmResults.map(p => (
                <Link
                  key={p.id}
                  href={`/messages/${p.id}`}
                  onClick={() => setDmOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  {p.photo_url ? (
                    <Image src={p.photo_url} alt={initials(p.full_name)} width={36} height={36}
                      className="rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: 'var(--cc-navy)' }}>
                      {initials(p.full_name)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--cc-navy)' }}>{p.full_name}</p>
                    {p.title_company && <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>{p.title_company}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Create group chat modal ─────────────────────────────────────── */}
      {gcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !gcCreating && setGcOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--cc-navy)' }}>Create group chat</h2>
              <button onClick={() => setGcOpen(false)} className="text-gray-400 text-xl" disabled={gcCreating}>&times;</button>
            </div>
            {gcError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                {gcError}
              </div>
            )}
            <form onSubmit={createGroupChat} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chat name *</label>
                <input
                  type="text"
                  required
                  maxLength={LIMITS.TITLE}
                  value={gcForm.name}
                  onChange={e => setGcForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                  style={{ borderColor: 'var(--cc-border)' }}
                  placeholder="e.g. Engineering Alumni 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  maxLength={LIMITS.SHORT_TEXT}
                  value={gcForm.description}
                  onChange={e => setGcForm(f => ({ ...f, description: e.target.value }))}
                  className={inputCls}
                  style={{ borderColor: 'var(--cc-border)' }}
                  placeholder="Optional short description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={gcForm.chat_type}
                  onChange={e => setGcForm(f => ({ ...f, chat_type: e.target.value as ChatType }))}
                  className={inputCls}
                  style={{ borderColor: 'var(--cc-border)' }}>
                  {(Object.entries(CHAT_TYPE_LABELS) as [ChatType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Member picker */}
              <div>
                <label className="block text-sm font-medium mb-1">Add members</label>
                {/* Selected chips */}
                {gcMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {gcMembers.map(m => (
                      <span key={m.id}
                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium text-white"
                        style={{ background: 'var(--cc-navy)' }}>
                        {initials(m.full_name)} {m.full_name}
                        <button type="button" onClick={() => setGcMembers(prev => prev.filter(x => x.id !== m.id))}
                          className="ml-0.5 opacity-70 hover:opacity-100">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Search by name…"
                  value={gcMemberSearch}
                  onChange={e => setGcMemberSearch(e.target.value)}
                  className={inputCls}
                  style={{ borderColor: 'var(--cc-border)' }}
                />
                {(gcMemberResults.length > 0 || gcSearching) && (
                  <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto" style={{ borderColor: 'var(--cc-border)' }}>
                    {gcSearching && <p className="text-xs text-center py-2" style={{ color: 'var(--cc-text-muted)' }}>Searching…</p>}
                    {gcMemberResults.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setGcMembers(prev => [...prev, p])
                          setGcMemberResults(prev => prev.filter(x => x.id !== p.id))
                          setGcMemberSearch('')
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                        {p.photo_url ? (
                          <Image src={p.photo_url} alt={initials(p.full_name)} width={28} height={28}
                            className="rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ background: 'var(--cc-navy)' }}>
                            {initials(p.full_name)}
                          </div>
                        )}
                        <span className="text-sm" style={{ color: 'var(--cc-navy)' }}>{p.full_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setGcOpen(false)} disabled={gcCreating}
                  className="px-4 py-2 text-sm rounded-lg border font-medium" style={{ borderColor: 'var(--cc-border)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={gcCreating || !gcForm.name.trim() || gcMembers.length === 0}
                  className="px-4 py-2 text-sm rounded-lg font-semibold text-white disabled:opacity-60"
                  style={{ background: 'var(--cc-navy)' }}>
                  {gcCreating ? 'Creating…' : 'Create group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
