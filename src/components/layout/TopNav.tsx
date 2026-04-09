'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

export default function TopNav() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single()
          .then(({ data }) => setProfile(data))
      }
    })
  }, [supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) router.push(`/network?q=${encodeURIComponent(search.trim())}`)
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const isAdmin = profile?.role === 'admin'

  const navLinks = [
    { href: '/feed', label: 'Home', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )},
    { href: '/network', label: 'Network', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )},
    { href: '/opportunities', label: 'Opportunities', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    )},
    { href: '/events', label: 'Events', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    )},
    { href: '/messages', label: 'Messages', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    )},
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: <ShieldIcon /> }] : []),
  ]

  return (
    <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: 'var(--cc-border)' }}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Brand */}
        <Link href="/feed" className="flex items-center gap-2.5 shrink-0">
          <Image src="/cc-seal.png" alt="Central Catholic seal" width={36} height={36} />
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-tight" style={{ color: 'var(--cc-navy)' }}>Central Connect</p>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--cc-text-muted)' }}>Central Catholic HS · Pittsburgh</p>
          </div>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xs hidden md:block">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            type="search"
            placeholder="Search alumni, classes, clubs…"
            className="w-full text-sm border rounded-full px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--cc-gold)] bg-gray-50"
            style={{ borderColor: 'var(--cc-border)' }}
          />
        </form>

        {/* Nav links */}
        <nav className="flex items-center gap-1 ml-auto">
          {navLinks.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors"
                style={{ color: active ? 'var(--cc-navy)' : 'var(--cc-text-muted)' }}
              >
                {icon}
                <span className="hidden sm:block">{label}</span>
              </Link>
            )
          })}

          {/* Avatar */}
          <Link href="/profile" className="ml-2">
            {profile?.photo_url ? (
              <Image src={profile.photo_url} alt={initials} width={32} height={32}
                className="rounded-full object-cover border-2"
                style={{ borderColor: pathname === '/profile' ? 'var(--cc-gold)' : 'transparent' }} />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2"
                style={{
                  background: 'var(--cc-navy)',
                  borderColor: pathname === '/profile' ? 'var(--cc-gold)' : 'transparent'
                }}>
                {initials}
              </div>
            )}
          </Link>

          <button onClick={handleLogout}
            className="ml-1 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--cc-border)', color: 'var(--cc-text-muted)' }}>
            Log out
          </button>
        </nav>
      </div>
    </header>
  )
}
