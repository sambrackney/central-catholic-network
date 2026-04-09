import { profanityError } from './moderation'

// ── Length caps ────────────────────────────────────────────────────────────
export const LIMITS = {
  MESSAGE: 2000,
  POST: 5000,
  TITLE: 150,
  DESCRIPTION: 3000,
  SHORT_TEXT: 120,
  URL: 2048,
  NAME: 100,
  COMPANY: 120,
} as const

// ── UUID validation ────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value)
}

// ── URL validation ─────────────────────────────────────────────────────────
export function isValidURL(value: string): boolean {
  if (!value) return true
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

// ── Strip dangerous content ─────────────────────────────────────────────────
// Removes script/iframe/etc. tags and javascript: href values.
export function sanitize(text: string): string {
  return text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
}

// ── Generic text validator ──────────────────────────────────────────────────
export interface FieldValidation {
  value: string | null | undefined
  label: string
  required?: boolean
  maxLength?: number
  isUrl?: boolean
  checkProfanity?: boolean
}

export function validateField(f: FieldValidation): string | null {
  const val = f.value?.trim() ?? ''
  if (f.required && !val) return `${f.label} is required.`
  if (val && f.maxLength && val.length > f.maxLength)
    return `${f.label} must be ${f.maxLength} characters or fewer.`
  if (val && f.isUrl && !isValidURL(val))
    return `${f.label} must be a valid URL (https://…).`
  if (val && f.checkProfanity) {
    const err = profanityError({ [f.label]: val })
    if (err) return err
  }
  return null
}

// ── Validate a collection of fields, returning the first error ──────────────
export function validateFields(fields: FieldValidation[]): string | null {
  for (const f of fields) {
    const err = validateField(f)
    if (err) return err
  }
  return null
}

// ── Rate-limit helper (client-side, per action key) ─────────────────────────
const _lastSent: Record<string, number> = {}

export function checkRateLimit(key: string, minMs = 1000): boolean {
  const now = Date.now()
  if (_lastSent[key] && now - _lastSent[key] < minMs) return false
  _lastSent[key] = now
  return true
}
