'use server'

import { createClient } from '@/lib/supabase/server'
import { profanityError } from '@/lib/moderation'

export async function createPost(content: string): Promise<{ error?: string }> {
  const trimmed = content.trim()
  if (!trimmed) return { error: 'Post cannot be empty.' }

  const err = profanityError({ 'post content': trimmed })
  if (err) return { error: err }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('posts').insert({
    author_id: user.id,
    content: trimmed,
    post_type: 'update',
    visibility: 'alumni',
  })

  if (error) return { error: error.message }
  return {}
}
