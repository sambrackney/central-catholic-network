'use client'

import { useState, useTransition, useMemo } from 'react'
import type { Database } from '@/types/database.types'

type UserRole = Database['public']['Enums']['user_role']

type UserRow = {
  id: string
  full_name: string
  contact_email: string | null
  role: UserRole
  is_verified: boolean
  created_at: string
  graduation_year: number | null
  title_company: string | null
  location: string | null
}

type RecentPost = {
  id: string
  content: string
  created_at: string
  post_type: string
  author_id: string
}

type RecentConnection = {
  id: string
  created_at: string
  status: string
  requester_id: string
  recipient_id: string
}

type Stats = {
  totals: { users: number; posts: number; connections: number; verified: number }
  byRole: { admin: number; alumni: number; student: number; faculty: number }
  thisWeek: { newUsers: number; newPosts: number }
}

interface Props {
  currentUserId: string
  initialUsers: UserRow[]
  stats: Stats
  recentPosts: RecentPost[]
  recentConnections: RecentConnection[]
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  alumni: 'Alumni',
  student: 'Student',
  faculty: 'Faculty',
}

const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  admin: { bg: '#1a2a4e', text: '#fff' },
  alumni: { bg: '#c9a227', text: '#fff' },
  student: { bg: '#2563eb', text: '#fff' },
  faculty: { bg: '#059669', text: '#fff' },
}

function RoleBadge({ role }: { role: UserRole }) {
  const { bg, text } = ROLE_COLORS[role]
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: bg, color: text }}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: 'white', borderColor: 'var(--cc-border)' }}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--cc-text-muted)' }}>{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: 'var(--cc-navy)' }}>{value.toLocaleString()}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--cc-text-muted)' }}>{sub}</p>}
    </div>
  )
}

export default function AdminClient({ currentUserId, initialUsers, stats, recentPosts, recentConnections }: Props) {
  const [activeTab, setActiveTab] = useState<'users' | 'activity'>('users')
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function updateUser(userId: string, patch: { role?: UserRole; is_verified?: boolean }) {
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, ...patch }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Update failed')
        setUsers(prev =>
          prev.map(u => (u.id === userId ? { ...u, ...patch } : u))
        )
        showToast('User updated successfully', 'success')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Update failed', 'error')
      }
    })
  }

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch =
        !search ||
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (u.contact_email ?? '').toLowerCase().includes(search.toLowerCase())
      const matchRole = roleFilter === 'all' || u.role === roleFilter
      const matchVerified =
        verifiedFilter === 'all' ||
        (verifiedFilter === 'verified' ? u.is_verified : !u.is_verified)
      return matchSearch && matchRole && matchVerified
    })
  }, [users, search, roleFilter, verifiedFilter])

  const tabs = [
    { id: 'users' as const, label: `Users (${users.length})` },
    { id: 'activity' as const, label: 'Activity' },
  ]

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium"
          style={{
            background: toast.type === 'success' ? '#059669' : '#dc2626',
            color: 'white',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totals.users} sub={`+${stats.thisWeek.newUsers} this week`} />
        <StatCard label="Total Posts" value={stats.totals.posts} sub={`+${stats.thisWeek.newPosts} this week`} />
        <StatCard label="Connections" value={stats.totals.connections} />
        <StatCard label="Verified" value={stats.totals.verified} sub={`of ${stats.totals.users} total`} />
      </div>

      {/* Role Breakdown */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'white', borderColor: 'var(--cc-border)' }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--cc-text-muted)' }}>
          Users by Role
        </h2>
        <div className="flex flex-wrap gap-4">
          {(Object.entries(stats.byRole) as [UserRole, number][]).map(([role, count]) => (
            <div key={role} className="flex items-center gap-2">
              <RoleBadge role={role} />
              <span className="text-lg font-bold" style={{ color: 'var(--cc-navy)' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: 'white', borderColor: 'var(--cc-border)' }}
      >
        <div className="flex border-b" style={{ borderColor: 'var(--cc-border)' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-6 py-3 text-sm font-medium transition-colors"
              style={{
                color: activeTab === tab.id ? 'var(--cc-navy)' : 'var(--cc-text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--cc-gold)' : '2px solid transparent',
                background: 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'users' && (
          <div>
            {/* Filters */}
            <div className="p-4 border-b flex flex-wrap gap-3 items-center" style={{ borderColor: 'var(--cc-border)' }}>
              <input
                type="search"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 w-64"
                style={{ borderColor: 'var(--cc-border)', '--tw-ring-color': 'var(--cc-gold)' } as React.CSSProperties}
              />
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}
                className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                style={{ borderColor: 'var(--cc-border)' }}
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="alumni">Alumni</option>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
              <select
                value={verifiedFilter}
                onChange={e => setVerifiedFilter(e.target.value as 'all' | 'verified' | 'unverified')}
                className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                style={{ borderColor: 'var(--cc-border)' }}
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
              <span className="text-xs ml-auto" style={{ color: 'var(--cc-text-muted)' }}>
                Showing {filteredUsers.length} of {users.length}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--cc-text-muted)', background: 'var(--cc-surface)' }}
                  >
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Verified</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--cc-text-muted)' }}>
                        No users match your filters
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, idx) => (
                      <tr
                        key={user.id}
                        className="border-t transition-colors hover:bg-gray-50"
                        style={{ borderColor: 'var(--cc-border)' }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ background: 'var(--cc-navy)' }}
                            >
                              {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium" style={{ color: 'var(--cc-text)' }}>
                                {user.full_name}
                                {user.id === currentUserId && (
                                  <span className="ml-2 text-[10px] text-gray-400">(you)</span>
                                )}
                              </p>
                              {user.graduation_year && (
                                <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>Class of {user.graduation_year}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--cc-text-muted)' }}>
                          {user.contact_email ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={user.role}
                            disabled={isPending}
                            onChange={e => updateUser(user.id, { role: e.target.value as UserRole })}
                            className="border rounded-lg px-2 py-1 text-xs focus:outline-none disabled:opacity-50"
                            style={{ borderColor: 'var(--cc-border)' }}
                          >
                            <option value="admin">Admin</option>
                            <option value="alumni">Alumni</option>
                            <option value="student">Student</option>
                            <option value="faculty">Faculty</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            disabled={isPending}
                            onClick={() => updateUser(user.id, { is_verified: !user.is_verified })}
                            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50"
                            style={{ background: user.is_verified ? 'var(--cc-gold)' : '#d1d5db' }}
                            role="switch"
                            aria-checked={user.is_verified}
                          >
                            <span
                              className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                              style={{ transform: user.is_verified ? 'translateX(16px)' : 'translateX(0)' }}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--cc-text-muted)' }}>
                          {new Date(user.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--cc-text-muted)' }}>
                          {user.title_company || user.location
                            ? [user.title_company, user.location].filter(Boolean).join(' · ')
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="p-4 space-y-6">
            {/* Recent Posts */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--cc-text)' }}>
                Recent Posts
              </h3>
              {recentPosts.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--cc-text-muted)' }}>No posts yet</p>
              ) : (
                <div className="space-y-2">
                  {recentPosts.map(post => (
                    <div
                      key={post.id}
                      className="rounded-lg border p-3"
                      style={{ borderColor: 'var(--cc-border)', background: 'var(--cc-surface)' }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-gold)' }}
                        >
                          {post.post_type}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>
                          {new Date(post.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </span>
                      </div>
                      <p
                        className="text-sm line-clamp-2"
                        style={{ color: 'var(--cc-text)' }}
                      >
                        {post.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Connections */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--cc-text)' }}>
                Recent Connections
              </h3>
              {recentConnections.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--cc-text-muted)' }}>No connections yet</p>
              ) : (
                <div className="space-y-2">
                  {recentConnections.map(conn => (
                    <div
                      key={conn.id}
                      className="rounded-lg border p-3 flex items-center justify-between"
                      style={{ borderColor: 'var(--cc-border)', background: 'var(--cc-surface)' }}
                    >
                      <div className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>
                        <span className="font-mono" style={{ color: 'var(--cc-navy)' }}>
                          {conn.requester_id.slice(0, 8)}…
                        </span>
                        {' → '}
                        <span className="font-mono" style={{ color: 'var(--cc-navy)' }}>
                          {conn.recipient_id.slice(0, 8)}…
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                          style={{
                            background: conn.status === 'accepted' ? '#dcfce7' : '#fef9c3',
                            color: conn.status === 'accepted' ? '#166534' : '#854d0e',
                          }}
                        >
                          {conn.status}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>
                          {new Date(conn.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
