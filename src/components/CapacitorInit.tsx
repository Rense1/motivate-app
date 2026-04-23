'use client'

import { useEffect } from 'react'
import { createNotificationChannel, requestNotificationPermission } from '@/lib/notifications'
import { Capacitor } from '@capacitor/core'

export function CapacitorInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const platform = Capacitor.getPlatform()

    if (platform === 'android') {
      // Android: チャンネル作成後に通知権限を要求（iOS と同様、起動時に取得する）
      createNotificationChannel()
      requestNotificationPermission()
    } else if (platform === 'ios') {
      // iOS: アプリ初回起動時に通知許可をリクエスト
      requestNotificationPermission()
    }
  }, [])

  return null
}
