/**
 * usePushNotifications
 *
 * Registers for push notifications via Capacitor.
 * • On native (iOS/Android): requests permission, registers with FCM/APNS,
 *   returns the device token, and wires up foreground notification handlers.
 * • On web: gracefully no-ops so the hook is safe to call everywhere.
 *
 * Usage:
 *   Call `usePushNotifications()` once from a top-level component after login
 *   (e.g. the `(app)/layout.tsx`).  The hook registers the device token with
 *   your backend so the server can send targeted push notifications.
 *
 * Server-side:
 *   POST /api/devices  { token: string, platform: 'ios' | 'android' }
 *   → store in a `DeviceToken` table keyed by userId + token.
 *   Use Firebase Admin SDK / APNs to send messages.
 */

'use client'

import { useEffect } from 'react'
import { api } from '@/lib/api'

// ── Capacitor type helpers ────────────────────────────────────────────────────
// We import dynamically to avoid SSR errors (Capacitor is browser-only).

async function loadCapacitorPush() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const { Capacitor }         = await import('@capacitor/core')
    return { PushNotifications, Capacitor }
  } catch {
    return null
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePushNotifications() {
  useEffect(() => {
    let cleanupFns: Array<() => void> = []

    async function register() {
      const cap = await loadCapacitorPush()
      if (!cap) return                               // running in browser / SSR
      const { PushNotifications, Capacitor } = cap

      // Only works on native platforms
      if (!Capacitor.isNativePlatform()) return

      // Request permission
      const { receive } = await PushNotifications.requestPermissions()
      if (receive !== 'granted') {
        console.warn('[Push] Permission denied')
        return
      }

      await PushNotifications.register()

      // ── Registration success → send token to server ─────────────────────
      const regListener = await PushNotifications.addListener(
        'registration',
        async (token) => {
          const platform = Capacitor.getPlatform() as 'ios' | 'android'
          try {
            await api.post('/api/devices', { token: token.value, platform })
          } catch {
            // Non-critical — server may not have the endpoint yet
          }
        },
      )

      // ── Registration error ───────────────────────────────────────────────
      const errListener = await PushNotifications.addListener(
        'registrationError',
        (err) => console.error('[Push] Registration error:', err),
      )

      // ── Foreground notification received ─────────────────────────────────
      const fgListener = await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification) => {
          // In foreground, Capacitor doesn't auto-show the notification.
          // You can show a custom in-app toast here.
          console.log('[Push] Foreground notification:', notification.title)
        },
      )

      // ── Notification tapped ──────────────────────────────────────────────
      const tapListener = await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action) => {
          // Navigate based on data payload from the notification
          const data = action.notification.data as Record<string, string> | undefined
          if (data?.url && typeof window !== 'undefined') {
            window.location.href = data.url
          }
        },
      )

      cleanupFns = [
        () => regListener.remove(),
        () => errListener.remove(),
        () => fgListener.remove(),
        () => tapListener.remove(),
      ]
    }

    register()

    return () => {
      cleanupFns.forEach((fn) => fn())
    }
  }, [])
}
