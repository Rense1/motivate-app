'use client'

import { useCallback } from 'react'

/**
 * 端末バイブレーション（Web Vibration API）フック。
 * Capacitor / PWA 環境で動作し、未対応環境ではサイレントに無視する。
 */
export function useHaptic() {
  const vibrate = useCallback((pattern: number | number[]) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern)
      }
    } catch {
      /* バイブレーション非対応環境ではスキップ */
    }
  }, [])

  /** 軽いフィードバック（UI タップ） */
  const light = useCallback(() => vibrate(8), [vibrate])

  /** 中程度のフィードバック（達成ボタン押下） */
  const medium = useCallback(() => vibrate(22), [vibrate])

  /** 強いフィードバック（最終達成・王冠獲得） */
  const heavy = useCallback(() => vibrate([35, 15, 45]), [vibrate])

  return { light, medium, heavy }
}
