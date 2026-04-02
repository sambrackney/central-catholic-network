'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Message = Database['public']['Tables']['direct_messages']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

export default function MessageThreadPage() {
  const { id: recipientId } = useParams<{ id: string }>()
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [recipient, setRecipient] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  const fetchMessages = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${userId})`
      )
      .order('created_at', { ascending: true })
    setMessages(data ?? [])

    // Mark received messages as read
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('sender_id', recipientId)
      .eq('recipient_id', userId)
      .eq('is_read', false)
  }, [supabase, recipientId])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)
      fetchMessages(user.id)

      const { data } = await supabase.from('profiles').select('*').eq('id', recipientId).single()
      setRecipient(data)

      // Realtime subscription
      const channel = supabase
        .channel(`dm-${user.id}-${recipientId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'direct_messages',
          filter: `recipient_id=eq.${user.id}`,
        }, () => fetchMessages(user.id))
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [supabase, recipientId, fetchMessages])

  useEffect(() => { scrollToBottom() }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !currentUserId) return
    setSending(true)
    await supabase.from('direct_messages').insert({
      sender_id: currentUserId,
      recipient_id: recipientId,
      content: input.trim(),
    })
    setInput('')
    setSending(false)
    fetchMessages(currentUserId)
  }

  const initials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

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
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-blue-200' : ''}`}
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
      <form onSubmit={sendMessage}
        className="bg-white rounded-b-xl border px-4 py-3 flex gap-2 shrink-0"
        style={{ borderColor: 'var(--cc-border)' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)]"
          style={{ borderColor: 'var(--cc-border)' }}
        />
        <button type="submit" disabled={sending || !input.trim()}
          className="px-4 py-2 text-sm rounded-full font-semibold text-white disabled:opacity-60"
          style={{ background: 'var(--cc-navy)' }}>
          Send
        </button>
      </form>
    </div>
  )
}
