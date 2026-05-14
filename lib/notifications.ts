'use server'

import { createClient } from '@/lib/supabase/server'
import type { NotificationType } from '@/types/database'

interface CreateNotificationInput {
  type: NotificationType
  title: string
  body?: string
  resource_href?: string
}

export async function createNotification(
  userId: string,
  input: CreateNotificationInput,
): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('notifications').insert({
      user_id: userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      resource_href: input.resource_href ?? null,
      is_read: false,
    })
  } catch {
    // Eșec silențios — notificările nu trebuie să blocheze acțiunile principale
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient()
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    return count ?? 0
  } catch {
    return 0
  }
}
