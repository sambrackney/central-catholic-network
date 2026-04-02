'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface Conversation {
  profile: Profile
  lastMessage: string
  lastAt: string
  unread: number
}

export default function MessagesPage() {
  const supabase = createClient()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [groupChats, setGroupChats] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)

      // Fetch DM conversations
      const { data: msgs } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (msgs) {
        const seen = new Set<string>()
        const convMap = new Map<string, Conversation>()
        for (const msg of msgs) {
          const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id
          if (!seen.has(otherId)) {
            seen.add(otherId)
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', otherId).single()
            if (profile) {
              convMap.set(otherId, {
                profile,
                lastMessage: msg.content,
                lastAt: msg.created_at,
                unread: msgs.filter(m => m.sender_id === otherId && m.recipient_id === user.id && !m.is_read).length,
              })
            }
          }
        }
        setConversations(Array.from(convMap.values()))
      }

      // Fetch group chats the user is in
      const { data: memberships } = await supabase
        .from('group_chat_members')
        .select('chat_id, group_chats(id, name, description, chat_type)')
        .eq('profile_id', user.id)
      setGroupChats(memberships?.map((m: any) => m.group_chats).filter(Boolean) ?? [])
      setLoading(false)
    })
  }, [supabase])

  const initials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--cc-navy)' }}>Messages</h1>

      {/* Direct messages */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--cc-border)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--cc-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--cc-navy)' }}>Direct messages</p>
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
            <p className="text-sm" style={{ color: 'var(--cc-text-muted)' }}>
              No messages yet. Visit an alumni's profile to start a conversation.
            </p>
          </div>
        ) : (
          <ul>
            {conversations.map(conv => (
              <li key={conv.profile.id}>
                <Link href={`/messages/${conv.profile.id}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                  style={{ borderColor: 'var(--cc-border)' }}>
                  {conv.profile.photo_url ? (
                    <Image src={conv.profile.photo_url} alt={initials(conv.profile.full_name)} width={40} height={40}
                      className="rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: 'var(--cc-navy)' }}>
                      {initials(conv.profile.full_name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--cc-navy)' }}>{conv.profile.full_name}</p>
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
      </div>

      {/* Group chats */}
      {groupChats.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--cc-border)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--cc-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--cc-navy)' }}>Group chats</p>
          </div>
          <ul>
            {groupChats.map((chat: any) => (
              <li key={chat.id}>
                <Link href={`/messages/group/${chat.id}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                  style={{ borderColor: 'var(--cc-border)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: 'var(--cc-gold)' }}>
                    #
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--cc-navy)' }}>{chat.name}</p>
                    {chat.description && <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>{chat.description}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
