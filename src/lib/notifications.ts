/**
 * REVIVE — ローカル通知サービス
 * @capacitor/local-notifications を使用
 * Web では UI のみ（スケジュールは無視）、Android/iOS では実際に発火
 */

import { Capacitor } from '@capacitor/core'
import type { TaskFrequency } from './types'

// ── 通知エントリ型（フォーム & スケジュール共用） ─────────────────────────
export type NotifEntry =
  | { id: string; type: 'weekly'; day: number; time: string }   // day: 0=日〜6=土
  | { id: string; type: 'once';   datetime: string }             // "YYYY-MM-DDTHH:mm"

// ── 通知 ID 生成（UUID → 安定した数値） ──────────────────────────────────
function stableId(taskId: string, suffix: number = 0): number {
  let h = 0
  for (let i = 0; i < taskId.length; i++) {
    h = (Math.imul(31, h) + taskId.charCodeAt(i)) | 0
  }
  return Math.abs(h) * 10 + suffix
}

// ── パーミッション確認・要求 ───────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // POST_NOTIFICATIONS 権限 (Android 13+)
    const { display } = await LocalNotifications.checkPermissions()
    if (display !== 'granted') {
      const { display: result } = await LocalNotifications.requestPermissions()
      if (result !== 'granted') return false
    }

    // SCHEDULE_EXACT_ALARM 権限 (Android 12+)
    // これがないと指定時刻に通知が来ない（大幅に遅延または未着）
    if (Capacitor.getPlatform() === 'android') {
      try {
        const exactSetting = await LocalNotifications.checkExactNotificationSetting()
        if (exactSetting.exact_alarm !== 'granted') {
          await LocalNotifications.changeExactNotificationSetting()
        }
      } catch {
        // 古い Capacitor バージョンでは API が存在しない場合がある → 無視
      }
    }

    return true
  } catch {
    return false
  }
}

// ── 既存通知をキャンセル ───────────────────────────────────────────────────
export async function cancelTaskNotifications(taskId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const ids = Array.from({ length: 20 }, (_, i) => ({ id: stableId(taskId, i) }))
    await LocalNotifications.cancel({ notifications: ids })
  } catch { /* ignore */ }
}

// ── 構造化エントリをスケジュール ──────────────────────────────────────────
// 「毎週◯曜日 ◯時◯分」または「年/月/日 ◯時◯分」を複数登録できる
export async function scheduleStructuredNotifications(
  taskId: string,
  taskTitle: string,
  entries: NotifEntry[],
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (entries.length === 0) return

  try {
    const granted = await requestNotificationPermission()
    if (!granted) return

    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await cancelTaskNotifications(taskId)

    const notifications: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = []

    entries.forEach((entry, idx) => {
      if (entry.type === 'weekly') {
        const [hh, mm] = entry.time.split(':').map(Number)
        // Capacitor weekday: 1=日, 2=月, ..., 7=土
        const weekday = (entry.day + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7
        notifications.push({
          id: stableId(taskId, idx),
          title: '今日のタスクを完了して自分の理想に近づこう！',
          body: `タスク：${taskTitle}`,
          sound: 'default',
          schedule: {
            on: { weekday, hour: hh, minute: mm },
            repeats: true,
          },
          channelId: 'revive_tasks',
        })
      } else {
        // once
        const at = new Date(entry.datetime)
        if (at > new Date()) {
          notifications.push({
            id: stableId(taskId, idx),
            title: '今日のタスクを完了して自分の理想に近づこう！',
            body: `タスク：${taskTitle}`,
            sound: 'default',
            schedule: { at },
            channelId: 'revive_tasks',
          })
        }
      }
    })

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications })
    }
  } catch { /* ignore */ }
}

// ── 通知チャンネル作成（Android 8+） ──────────────────────────────────────
export async function createNotificationChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.createChannel({
      id: 'revive_tasks',
      name: 'タスクリマインダー',
      description: 'REVIVEのタスク通知',
      importance: 4,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#ef4444',
    })
  } catch { /* ignore */ }
}

// ── 旧API互換（削除せず残す） ──────────────────────────────────────────────
export async function scheduleTaskNotification(input: {
  taskId: string
  taskTitle: string
  frequency: TaskFrequency
  notificationTime: string
  notificationDeadline?: string
  extraTimes?: string[]
}): Promise<void> {
  const { taskId, taskTitle, notificationTime, notificationDeadline, extraTimes = [] } = input
  const allTimes = [notificationTime, ...extraTimes]

  if (input.frequency === 'none' && notificationDeadline) {
    await scheduleStructuredNotifications(taskId, taskTitle, [
      { id: '0', type: 'once', datetime: notificationDeadline },
    ])
    return
  }

  const entries: NotifEntry[] = allTimes.map((t, i) => ({
    id: String(i),
    type: 'weekly' as const,
    day: 1, // 月曜日
    time: t,
  }))
  await scheduleStructuredNotifications(taskId, taskTitle, entries)
}
