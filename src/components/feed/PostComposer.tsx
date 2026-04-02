'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface Props {
  profile: Profile
  onPost: () => void
}

export default function PostComposer({ profile, onPost }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    await supabase.from('posts').insert({
      author_id: profile.id,
      content: content.trim(),
      post_type: 'update',
      visibility: 'alumni',
    })
    setContent('')
    setOpen(false)
    setLoading(false)
    onPost()
  }

  return (
    <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--cc-border)' }}>
      <div className="flex items-center gap-3">
        {profile.photo_url ? (
          <Image src={profile.photo_url} alt={initials} width={40} height={40}
            className="rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: 'var(--cc-navy)' }}>
            {initials}
          </div>
        )}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 text-left text-sm border rounded-full px-4 py-2 hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'var(--cc-border)', color: 'var(--cc-text-muted)' }}>
          Share a career update, internship, or milestone…
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--cc-navy)' }}>New post</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              {profile.photo_url ? (
                <Image src={profile.photo_url} alt={initials} width={40} height={40} className="rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: 'var(--cc-navy)' }}>{initials}</div>
              )}
              <div>
                <p className="text-sm font-semibold">{profile.full_name}</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-navy)' }}>
                  Alumni only
                </span>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={5}
                autoFocus
                placeholder="Internship highlights, new role, grad school, certifications, volunteer work…"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)] resize-none"
                style={{ borderColor: 'var(--cc-border)' }}
              />
              <div className="flex justify-end gap-2 mt-3">
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border font-medium"
                  style={{ borderColor: 'var(--cc-border)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading || !content.trim()}
                  className="px-4 py-2 text-sm rounded-lg font-semibold text-white disabled:opacity-60"
                  style={{ background: 'var(--cc-navy)' }}>
                  {loading ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
