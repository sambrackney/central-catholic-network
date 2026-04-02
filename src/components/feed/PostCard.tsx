'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Pick<Database['public']['Tables']['profiles']['Row'],
    'id' | 'full_name' | 'photo_url' | 'title_company' | 'graduation_year'>
  reaction_count: number
  user_reacted: boolean
}

interface Props {
  post: Post
  currentUserId: string
  onDelete?: () => void
}

export default function PostCard({ post, currentUserId, onDelete }: Props) {
  const supabase = createClient()
  const [liked, setLiked] = useState(post.user_reacted)
  const [likeCount, setLikeCount] = useState(post.reaction_count)
  const [deleting, setDeleting] = useState(false)

  const author = post.profiles
  const initials = author.full_name
    ? author.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  async function toggleLike() {
    if (liked) {
      await supabase.from('post_reactions')
        .delete().eq('post_id', post.id).eq('profile_id', currentUserId)
      setLiked(false)
      setLikeCount(c => c - 1)
    } else {
      await supabase.from('post_reactions')
        .insert({ post_id: post.id, profile_id: currentUserId })
      setLiked(true)
      setLikeCount(c => c + 1)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('posts').delete().eq('id', post.id)
    onDelete?.()
  }

  const timeAgo = (ts: string) => {
    const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
    if (d < 60) return `${d}s ago`
    if (d < 3600) return `${Math.floor(d / 60)}m ago`
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`
    return `${Math.floor(d / 86400)}d ago`
  }

  return (
    <article className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--cc-border)' }}>
      <div className="flex items-start gap-3">
        <Link href={`/profile/${author.id}`}>
          {author.photo_url ? (
            <Image src={author.photo_url} alt={initials} width={44} height={44}
              className="rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: 'var(--cc-navy)' }}>
              {initials}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link href={`/profile/${author.id}`} className="text-sm font-semibold hover:underline"
                style={{ color: 'var(--cc-navy)' }}>
                {author.full_name}
              </Link>
              {author.title_company && (
                <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>{author.title_company}</p>
              )}
              {author.graduation_year && (
                <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>Class of {author.graduation_year}</p>
              )}
            </div>
            <span className="text-xs shrink-0" style={{ color: 'var(--cc-text-muted)' }}>
              {timeAgo(post.created_at)}
            </span>
          </div>

          <p className="text-sm mt-3 whitespace-pre-wrap leading-relaxed">{post.content}</p>

          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={toggleLike}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: liked ? 'var(--cc-navy)' : 'var(--cc-text-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
              {likeCount > 0 && <span>{likeCount}</span>}
              <span>Like</span>
            </button>

            {author.id === currentUserId && (
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs transition-colors disabled:opacity-40"
                style={{ color: 'var(--cc-text-muted)' }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
