import { Filter } from 'bad-words'

const filter = new Filter()

/**
 * Returns true if the text contains profanity.
 * Works in both server actions and client components.
 */
export function containsProfanity(text: string): boolean {
  if (!text?.trim()) return false
  return filter.isProfane(text)
}

/**
 * Returns a user-facing error message if any of the given
 * labeled fields contain profanity, otherwise null.
 */
export function profanityError(
  fields: Record<string, string | null | undefined>
): string | null {
  for (const [label, value] of Object.entries(fields)) {
    if (value && containsProfanity(value)) {
      return `Your ${label} contains prohibited language.`
    }
  }
  return null
}
