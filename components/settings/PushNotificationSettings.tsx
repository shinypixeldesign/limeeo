'use client'

import { useState, useEffect } from 'react'

type PushState = 'loading' | 'unsupported' | 'denied' | 'inactive' | 'active' | 'error'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

export default function PushNotificationSettings() {
  const [state, setState] = useState<PushState>('loading')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }

    // getRegistration() resolves immediately with undefined if no SW is registered,
    // unlike serviceWorker.ready which hangs forever without an active SW.
    navigator.serviceWorker.getRegistration().then(registration => {
      if (!registration) {
        // No SW registered yet — check permission and show Activează button
        const permission = Notification.permission
        setState(permission === 'denied' ? 'denied' : 'inactive')
        return
      }

      registration.pushManager.getSubscription().then(sub => {
        if (sub) {
          setSubscription(sub)
          setState('active')
        } else {
          const permission = Notification.permission
          setState(permission === 'denied' ? 'denied' : 'inactive')
        }
      }).catch(() => setState('inactive'))
    }).catch(() => setState('inactive'))
  }, [])

  async function handleActivate() {
    setState('loading')
    setErrorMsg('')

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return
      }

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setErrorMsg('VAPID key lipsește din configurare.')
        setState('error')
        return
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const subJson = sub.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh ?? '',
            auth: subJson.keys?.auth ?? '',
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Eroare la salvare.')
      }

      setSubscription(sub)
      setState('active')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Eroare necunoscută.')
      setState('error')
    }
  }

  async function handleDeactivate() {
    if (!subscription) return
    setState('loading')

    try {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()

      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      })

      setSubscription(null)
      setState('inactive')
    } catch {
      setState('active')
    }
  }

  if (state === 'unsupported') {
    return (
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
        <p className="text-sm text-slate-500">
          Browserul tău nu suportă notificările push. Încearcă Chrome, Edge sau Firefox.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Notificări push în browser</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Primești notificări instant când o ofertă e acceptată sau respinsă.
          </p>
        </div>

        <div className="shrink-0">
          {state === 'loading' && (
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          )}

          {state === 'inactive' && (
            <button
              type="button"
              onClick={handleActivate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Activează
            </button>
          )}

          {state === 'active' && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Activ
              </span>
              <button
                type="button"
                onClick={handleDeactivate}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Dezactivează
              </button>
            </div>
          )}

          {state === 'denied' && (
            <span className="text-sm text-amber-600 font-medium">
              Permisiune blocată de browser
            </span>
          )}

          {state === 'error' && (
            <button
              type="button"
              onClick={handleActivate}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Reîncearcă
            </button>
          )}
        </div>
      </div>

      {state === 'denied' && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Ai blocat notificările push în browser. Mergi la setările browserului și activează notificările pentru acest site.
        </p>
      )}

      {state === 'error' && errorMsg && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
      )}
    </div>
  )
}
