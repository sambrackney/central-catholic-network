'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LIMITS, isValidUUID, sanitize, checkRateLimit } from '@/lib/validation'
import { containsProfanity } from '@/lib/moderation'
import type { Database } from '@/types/database.types'

type Message = Database['public']['Tables']['direct_messages']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type RealtimeChannel = ReturnType<ReturnType<typeof createClient>['channel']>

const MAX_LENGTH = LIMITS.MESSAGE

export default function MessageThreadPage() {
  const params = useParams<{ id: string }>()
  const recipientId = params.id

  // Stable client reference — createClient() returns a new object every render
  // without this, every render recreates fetchMessages → useEffect → new channel
  const supabase = useMemo(() => createClient(), [])

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [recipient, setRecipient] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const validRecipient = isValidUUID(recipientId)

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  const fetchMessages = useCallback(async (userId: string) => {
    if (!validRecipient) return
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${userId})`
      )
      .order('created_at', { ascending: true })
    setMessages(data ?? [])

    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('sender_id', recipientId)
      .eq('recipient_id', userId)
      .eq('is_read', false)
  }, [supabase, recipientId, validRecipient])

  useEffect(() => {
    if (!validRecipient) return
    let mounted = true

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !mounted) return
      setCurrentUserId(user.id)
      fetchMessages(user.id)

      const { data } = await supabase.from('profiles').select('*').eq('id', recipientId).single()
      if (mounted) setRecipient(data)

      // Subscribe — store ref so the cleanup below can remove it
      const channel = supabase
        .channel(`dm-${user.id}-${recipientId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'direct_messages',
          filter: `recipient_id=eq.${user.id}`,
        }, () => { if (mounted) fetchMessages(user.id) })
        .subscribe()

      channelRef.current = channel
    })

    // This cleanup now actually runs when the component unmounts or deps change
    return () => {
      mounted = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [supabase, recipientId, fetchMessages, validRecipient])

  useEffect(() => { scrollToBottom() }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    setSendError('')
    const text = input.trim()

    if (!text || !currentUserId) return
    if (!validRecipient) { setSendError('Invalid recipient.'); return }
    if (text.length > MAX_LENGTH) {
      setSendError(`Message must be ${MAX_LENGTH} characters or fewer.`)
      return
    }
    if (containsProfanity(text)) {
      setSendError('Your message contains prohibited language.')
      return
    }
    if (!checkRateLimit('dm-send', 800)) return

    setSending(true)
    const cleanText = sanitize(text)
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: currentUserId,
      recipient_id: recipientId,
      content: cleanText,
    })
    setSending(false)

    if (error) {
      setSendError('Failed to send. Please try again.')
      return
    }

    // Fire notification email (non-blocking)
    fetch('/api/notifications/dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId, messagePreview: cleanText }),
    }).catch(() => {})

    setInput('')
    fetchMessages(currentUserId)
  }

  const initials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (!validRecipient) {
    return (
      <div className="max-w-2xl mx-auto pt-16 text-center">
        <p className="text-sm" style={{ color: 'var(--cc-text-muted)' }}>Invalid conversation URL.</p>
        <Link href="/messages" className="text-sm font-semibold underline mt-2 inline-block" style={{ color: 'var(--cc-navy)' }}>
          Back to messages
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="bg-white rounded-t-xl border-b border-x px-5 py-3 flex items-center gap-3 shrink-0"
        style={{ borderColor: 'var(--cc-border)' }}>
        <Link href="/messages" className="text-sm hover:underline mr-1" style={{ color: 'var(--cc-text-muted)' }}>←</Link>
        {recipient ? (
          <>
            {recipient.photo_url ? (
              <Image src={recipient.photo_url} alt={initials(recipient.full_name)} width={36} height={36}
                className="rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'var(--cc-navy)' }}>
                {initials(recipient.full_name)}
              </div>
            )}
            <div>
              <Link href={`/profile/${recipient.id}`} className="text-sm font-semibold hover:underline"
                style={{ color: 'var(--cc-navy)' }}>
                {recipient.full_name}
              </Link>
              {recipient.graduation_year && (
                <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>Class of {recipient.graduation_year}</p>
              )}
            </div>
          </>
        ) : (
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-white border-x px-5 py-4 space-y-3"
        style={{ borderColor: 'var(--cc-border)' }}>
        {messages.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: 'var(--cc-text-muted)' }}>
            No messages yet. Say hello!
          </p>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
              <div
                className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                style={{
                  background: isMine ? 'var(--cc-navy)' : '#f3f4f6',
                  color: isMine ? 'white' : 'var(--cc-text)',
                  borderBottomRightRadius: isMine ? '4px' : undefined,
                  borderBottomLeftRadius: !isMine ? '4px' : undefined,
                }}>
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className="text-[10px] mt-1"
                  style={{ color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--cc-text-muted)' }}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white rounded-b-xl border px-4 py-3 shrink-0" style={{ borderColor: 'var(--cc-border)' }}>
        {sendError && <p className="text-xs text-red-600 mb-1.5">{sendError}</p>}
        <form onSubmit={sendMessage} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setSendError('') }}
              placeholder="Write a message…"
              maxLength={MAX_LENGTH}
              className="w-full border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)]"
              style={{ borderColor: 'var(--cc-border)' }}
            />
            {input.length > MAX_LENGTH * 0.85 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]"
                style={{ color: input.length >= MAX_LENGTH ? '#dc2626' : 'var(--cc-text-muted)' }}>
                {MAX_LENGTH - input.length}
              </span>
            )}
          </div>
          <button type="submit" disabled={sending || !input.trim()}
            className="px-4 py-2 text-sm rounded-full font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--cc-navy)' }}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
