'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import PostComposer from '@/components/feed/PostComposer'
import PostCard from '@/components/feed/PostCard'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface Props {
  initialProfile: Profile | null
  userId: string
}

export default function FeedClient({ initialProfile, userId }: Props) {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [posts, setPosts] = useState<any[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [suggestions, setSuggestions] = useState<Pick<Profile, 'id' | 'full_name' | 'photo_url' | 'title_company' | 'graduation_year'>[]>([])

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true)
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!author_id (id, full_name, photo_url, title_company, graduation_year)
      `)
      .order('created_at', { ascending: false })
      .limit(30)

    if (data) {
      const postIds = data.map(p => p.id)
      const { data: reactions } = await supabase
        .from('post_reactions')
        .select('post_id, profile_id')
        .in('post_id', postIds)

      const withReactions = data.map(post => ({
        ...post,
        reaction_count: reactions?.filter(r => r.post_id === post.id).length ?? 0,
        user_reacted: reactions?.some(r => r.post_id === post.id && r.profile_id === userId) ?? false,
      }))
      setPosts(withReactions)
    }
    setLoadingPosts(false)
  }, [supabase, userId])

  useEffect(() => {
    fetchPosts()

    // Realtime subscription for new posts
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => fetchPosts())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchPosts, supabase])

  useEffect(() => {
    supabase.from('profiles')
      .select('id, full_name, photo_url, title_company, graduation_year')
      .neq('id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setSuggestions(data ?? []))
  }, [supabase, userId])

  const initials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-6">
      {/* Left rail — my mini profile card */}
      <aside className="hidden lg:block space-y-4">
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--cc-border)' }}>
          <div className="h-16 w-full" style={{ background: 'linear-gradient(135deg, var(--cc-navy), var(--cc-navy-dark))' }} />
          <div className="px-4 pb-4">
            <div className="-mt-8 mb-3">
              {profile?.photo_url ? (
                <Image src={profile.photo_url} alt={initials(profile.full_name)} width={56} height={56}
                  className="rounded-full object-cover border-4 border-white" />
              ) : (
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold text-white border-4 border-white"
                  style={{ background: 'var(--cc-navy)' }}>
                  {initials(profile?.full_name ?? null)}
                </div>
              )}
            </div>
            <Link href="/profile" className="text-sm font-semibold hover:underline block" style={{ color: 'var(--cc-navy)' }}>
              {profile?.full_name || 'Your name'}
            </Link>
            {profile?.title_company && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--cc-text-muted)' }}>{profile.title_company}</p>
            )}
            {profile?.graduation_year && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--cc-text-muted)' }}>Class of {profile.graduation_year}</p>
            )}
            {profile?.engagement_points !== undefined && profile.engagement_points > 0 && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--cc-border)' }}>
                <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>
                  Points: <span className="font-semibold" style={{ color: 'var(--cc-gold)' }}>{profile.engagement_points}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className="bg-white rounded-xl border p-4 space-y-2" style={{ borderColor: 'var(--cc-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--cc-text-muted)' }}>Shortcuts</p>
          {[
            { href: '/network', label: 'Alumni Directory' },
            { href: '/network?filter=mentor', label: 'Find a Mentor' },
            { href: '/opportunities', label: 'Job Opportunities' },
            { href: '/events', label: 'Upcoming Events' },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="block text-sm py-1.5 hover:underline" style={{ color: 'var(--cc-navy)' }}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main feed */}
      <section className="space-y-4">
        {profile && <PostComposer profile={profile} onPost={fetchPosts} />}

        {loadingPosts ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border p-5 animate-pulse" style={{ borderColor: 'var(--cc-border)' }}>
                <div className="flex gap-3">
                  <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-48" />
                    <div className="h-16 bg-gray-100 rounded mt-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: 'var(--cc-border)' }}>
            <p className="text-sm" style={{ color: 'var(--cc-text-muted)' }}>
              No posts yet. Be the first to share an update!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard key={post.id} post={post} currentUserId={userId} onDelete={fetchPosts} />
            ))}
          </div>
        )}
      </section>

      {/* Right rail — suggestions */}
      <aside className="hidden lg:block space-y-4">
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--cc-border)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--cc-navy)' }}>People you may know</p>
          <div className="space-y-3">
            {suggestions.map(s => (
              <div key={s.id} className="flex items-center gap-2.5">
                {s.photo_url ? (
                  <Image src={s.photo_url} alt={initials(s.full_name)} width={36} height={36}
                    className="rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: 'var(--cc-navy)' }}>
                    {initials(s.full_name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${s.id}`} className="text-xs font-semibold block truncate hover:underline"
                    style={{ color: 'var(--cc-navy)' }}>
                    {s.full_name}
                  </Link>
                  {s.graduation_year && (
                    <p className="text-[11px] truncate" style={{ color: 'var(--cc-text-muted)' }}>Class of {s.graduation_year}</p>
                  )}
                </div>
                <Link href={`/profile/${s.id}`}
                  className="text-[11px] font-medium px-2 py-1 rounded-full border whitespace-nowrap"
                  style={{ borderColor: 'var(--cc-navy)', color: 'var(--cc-navy)' }}>
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--cc-border)' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>Central news</p>
          <a href="https://www.centralcatholichs.com/" target="_blank" rel="noopener noreferrer"
            className="text-xs hover:underline" style={{ color: 'var(--cc-gold)' }}>
            centralcatholichs.com →
          </a>
        </div>

        <footer className="text-[11px] space-x-3 leading-relaxed" style={{ color: 'var(--cc-text-muted)' }}>
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <p className="mt-1">Central Connect · Central Catholic High School Pittsburgh, PA</p>
        </footer>
      </aside>
    </div>
  )
}
