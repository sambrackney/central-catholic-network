/**
 * Class-year logic for Central Connect.
 *
 * The "transition date" is May 20 each year:
 *   - Before May 20 of year Y: class of Y = Senior, Y+1 = Junior, Y+2 = Sophomore, Y+3 = Freshman
 *   - On/after May 20 of year Y: class of Y becomes Alumni; Y+1 = Senior, Y+2 = Junior, etc.
 *
 * This module is safe to import on both the server and client.
 */

/**
 * Returns the graduation year of the current cohort of seniors.
 * Before May 20: senior year = current calendar year.
 * On/after May 20: senior year = next calendar year (the current seniors have graduated).
 */
export function getSeniorYear(now: Date = new Date()): number {
  const year  = now.getFullYear()
  const month = now.getMonth() + 1 // 1-indexed
  const day   = now.getDate()
  const pastTransition = month > 5 || (month === 5 && day >= 20)
  return pastTransition ? year + 1 : year
}

/**
 * Derives whether a graduation year maps to 'student' or 'alumni'.
 * Defaults to 'student' when gradYear is null/undefined.
 */
export function computeRole(gradYear: number | null | undefined): 'student' | 'alumni' {
  if (!gradYear) return 'student'
  return gradYear >= getSeniorYear() ? 'student' : 'alumni'
}

/**
 * Returns the class title for a graduation year ("Freshman" … "Senior"), or null for alumni
 * or years too far in the future.
 */
export function getClassTitle(gradYear: number | null | undefined): string | null {
  if (!gradYear) return null
  const seniorYear = getSeniorYear()
  const diff = gradYear - seniorYear
  if (diff === 0) return 'Senior'
  if (diff === 1) return 'Junior'
  if (diff === 2) return 'Sophomore'
  if (diff === 3) return 'Freshman'
  return null
}

/**
 * Returns a human-readable label for internal UI (e.g. admin panel badges).
 * Examples: "Admin", "Senior", "Class of 2019 Alum"
 */
export function getAccountLabel(
  gradYear: number | null | undefined,
  role: string,
): string {
  if (role === 'admin')   return 'Admin'
  if (role === 'faculty') return 'Faculty'

  const title = getClassTitle(gradYear)
  if (title) return title

  if (role === 'alumni' || (gradYear && gradYear < getSeniorYear())) {
    return gradYear ? `Class of ${gradYear}` : 'Alumni'
  }

  return 'Student'
}

/**
 * Returns the single-line label shown publicly next to a user's name.
 *
 * Rules:
 *   - Faculty            → "Faculty"
 *   - Alumni             → "Alumni · Class of 2019"  (or just "Alumni" with no year)
 *   - Student (in 4-yr)  → "2027 · Junior"  /  "2026 · Senior"  etc.
 *   - Admin              → treated as student/alumni based on grad year (admin status hidden)
 *
 * Returns null when there is not enough information to produce a meaningful label.
 */
export function getDisplayLabel(
  gradYear: number | null | undefined,
  role: string,
): string | null {
  if (role === 'faculty') return 'Faculty'

  // Admins are shown as student/alumni based on graduation year (status not exposed)
  const effectiveRole = role === 'admin' ? computeRole(gradYear) : role

  if (effectiveRole === 'alumni') {
    return gradYear ? `Alumni · Class of ${gradYear}` : 'Alumni'
  }

  // Student — show year and class title when available
  const title = getClassTitle(gradYear)
  if (title && gradYear) return `${gradYear} · ${title}`

  return null
}
