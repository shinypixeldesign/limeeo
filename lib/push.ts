import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidEmail = process.env.VAPID_EMAIL ?? 'mailto:admin@freelio.ro'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
}

interface PushNotification {
  title: string
  body: string
  url?: string
}

interface PushSubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
}

export async function sendPushToUser(
  userId: string,
  notification: PushNotification,
): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[push] VAPID keys nu sunt configurate. Push skipped.')
    return
  }

  const supabase = await createClient()

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subscriptions || subscriptions.length === 0) return

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    url: notification.url ?? '/',
  })

  const results = await Promise.allSettled(
    (subscriptions as PushSubscriptionRow[]).map(sub =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload,
      )
    )
  )

  // Curăță subscripțiile invalide (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'rejected') {
      const err = result.reason as { statusCode?: number }
      if (err?.statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', (subscriptions as PushSubscriptionRow[])[i].endpoint)
      }
    }
  }
}
