'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LIMITS, isValidUUID, sanitize, checkRateLimit } from '@/lib/validation'
import { containsProfanity } from '@/lib/moderation'
import type { Database } from '@/types/database.types'

type GroupMessage = Database['public']['Tables']['group_messages']['Row'] & {
  profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'photo_url'>
}

type GroupChat = Database['public']['Tables']['group_chats']['Row']

const MAX_LENGTH = LIMITS.MESSAGE

export default function GroupChatPage() {
  const params = useParams<{ id: string }>()
  const chatId = params.id

  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [chat, setChat] = useState<GroupChat | null>(null)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [isMember, setIsMember] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [loading, setLoading] = useState(true)
  const [memberCount, setMemberCount] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  const validChat = isValidUUID(chatId)

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  const fetchMessages = useCallback(async () => {
    if (!validChat) return
    const { data } = await supabase
      .from('group_messages')
      .select('*, profiles!sender_id(id, full_name, photo_url)')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    setMessages((data as GroupMessage[]) ?? [])
  }, [supabase, chatId, validChat])

  useEffect(() => {
    if (!validChat) return

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)

      // Load chat info
      const { data: chatData } = await supabase
        .from('group_chats')
        .select('*')
        .eq('id', chatId)
        .single()
      setChat(chatData)

      // Check membership
      const { data: membership } = await supabase
        .from('group_chat_members')
        .select('profile_id')
        .eq('chat_id', chatId)
        .eq('profile_id', user.id)
        .maybeSingle()
      setIsMember(Boolean(membership))

      // Get member count
      const { count } = await supabase
        .from('group_chat_members')
        .select('profile_id', { count: 'exact', head: true })
        .eq('chat_id', chatId)
      setMemberCount(count ?? 0)

      await fetchMessages()
      setLoading(false)

      // Realtime subscription — group messages for this chat
      const channel = supabase
        .channel(`group-${chatId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'group_messages',
          filter: `chat_id=eq.${chatId}`,
        }, () => fetchMessages())
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [supabase, chatId, fetchMessages, validChat])

  useEffect(() => { scrollToBottom() }, [messages])

  async function joinChat() {
    if (!currentUserId || !validChat) return
    const { error } = await supabase
      .from('group_chat_members')
      .insert({ chat_id: chatId, profile_id: currentUserId })
    if (!error) {
      setIsMember(true)
      setMemberCount(c => c + 1)
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    setSendError('')
    const text = input.trim()
    if (!text || !currentUserId) return
    if (!isMember) { setSendError('You must join this chat to send messages.'); return }
    if (text.length > MAX_LENGTH) {
      setSendError(`Message must be ${MAX_LENGTH} characters or fewer.`)
      return
    }
    if (containsProfanity(text)) {
      setSendError('Your message contains prohibited language.')
      return
    }
    if (!checkRateLimit(`gc-send-${chatId}`, 800)) return

    setSending(true)
    const cleanText = sanitize(text)
    const { error } = await supabase.from('group_messages').insert({
      chat_id: chatId,
      sender_id: currentUserId,
      content: cleanText,
    })
    setSending(false)

    if (error) {
      setSendError('Failed to send. Please try again.')
      return
    }

    setInput('')
    fetchMessages()
  }

  const initials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    const today = new Date()
    const sameDay = d.toDateString() === today.toDateString()
    if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!validChat) {
    return (
      <div className="max-w-2xl mx-auto pt-16 text-center">
        <p className="text-sm" style={{ color: 'var(--cc-text-muted)' }}>Invalid chat URL.</p>
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
        {loading ? (
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
        ) : (
          <>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: 'var(--cc-gold)' }}>
              #
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--cc-navy)' }}>{chat?.name}</p>
              <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
            </div>
            {!isMember && (
              <button
                onClick={joinChat}
                className="px-3 py-1 text-xs rounded-full font-semibold text-white shrink-0"
                style={{ background: 'var(--cc-navy)' }}>
                Join
              </button>
            )}
          </>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-white border-x px-5 py-4 space-y-3"
        style={{ borderColor: 'var(--cc-border)' }}>
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm py-8" style={{ color: 'var(--cc-text-muted)' }}>
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === currentUserId
          const prevMsg = idx > 0 ? messages[idx - 1] : null
          const showSender = !isMine && prevMsg?.sender_id !== msg.sender_id
          return (
            <div key={msg.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
              {/* Avatar: show for others when sender changes */}
              {!isMine && (
                <div className="shrink-0 w-8 flex flex-col justify-end">
                  {showSender && (
                    msg.profiles?.photo_url ? (
                      <Image src={msg.profiles.photo_url} alt={initials(msg.profiles?.full_name ?? null)}
                        width={28} height={28} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: 'var(--cc-navy)' }}>
                        {initials(msg.profiles?.full_name ?? null)}
                      </div>
                    )
                  )}
                </div>
              )}
              <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[75%]`}>
                {showSender && !isMine && (
                  <p className="text-[11px] font-medium mb-0.5 px-1" style={{ color: 'var(--cc-text-muted)' }}>
                    {msg.profiles?.full_name}
                  </p>
                )}
                <div
                  className="rounded-2xl px-4 py-2.5 text-sm"
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
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white rounded-b-xl border px-4 py-3 shrink-0" style={{ borderColor: 'var(--cc-border)' }}>
        {!isMember && !loading && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200 flex items-center justify-between">
            <p className="text-xs" style={{ color: '#92400e' }}>Join this group to participate.</p>
            <button onClick={joinChat} className="text-xs font-semibold underline" style={{ color: '#92400e' }}>
              Join now
            </button>
          </div>
        )}
        {sendError && <p className="text-xs text-red-600 mb-1.5">{sendError}</p>}
        <form onSubmit={sendMessage} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setSendError('') }}
              placeholder={isMember ? 'Write a message…' : 'Join to send messages'}
              disabled={!isMember}
              maxLength={MAX_LENGTH}
              className="w-full border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)] disabled:opacity-50"
              style={{ borderColor: 'var(--cc-border)' }}
            />
            {input.length > MAX_LENGTH * 0.85 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]"
                style={{ color: input.length >= MAX_LENGTH ? '#dc2626' : 'var(--cc-text-muted)' }}>
                {MAX_LENGTH - input.length}
              </span>
            )}
          </div>
          <button type="submit" disabled={sending || !input.trim() || !isMember}
            className="px-4 py-2 text-sm rounded-full font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--cc-navy)' }}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
