/**
 * REVIVE WidgetPlugin — Capacitor カスタムプラグイン
 * Web → Android SharedPreferences → ホーム画面ウィジェット
 */

import { Capacitor, registerPlugin } from '@capacitor/core'

interface WidgetPlugin {
  /** Premium フラグを Android 側に渡す */
  setPremium(options: { value: boolean }): Promise<void>
  /** 現在表示中のタスクタイトル一覧・ゴール・マイルストーン名を Android 側に渡す */
  setCurrentTasks(options: { tasks: string[]; goalTitle?: string; milestoneTitle?: string }): Promise<void>
}

const Widget = registerPlugin<WidgetPlugin>('Widget')

/** Premium フラグを SharedPreferences に保存してウィジェットを更新 */
export async function syncWidgetPremium(isPremium: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Widget.setPremium({ value: isPremium })
  } catch {
    // プラグイン未登録環境では無視
  }
}

/** タスク一覧・ゴール・マイルストーン名を SharedPreferences に保存してウィジェットを更新 */
export async function syncWidgetTasks(
  taskTitles: string[],
  goalTitle?: string,
  milestoneTitle?: string,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Widget.setCurrentTasks({ tasks: taskTitles, goalTitle, milestoneTitle })
  } catch {
    // プラグイン未登録環境では無視
  }
}
