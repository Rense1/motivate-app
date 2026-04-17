'use client'

const KEY_MS      = 'tutorial_ms_pending'
const KEY_TASK    = 'tutorial_task_pending'
// 永続無効化フラグ（スキップ専用）
// 旧キー 'tutorial_done' は complete でもセットされていたため廃止
const KEY_SKIPPED = 'tutorial_skipped'

export function useTutorial() {
  /** スキップボタンを一度でも押したか */
  const isDone        = () => localStorage.getItem(KEY_SKIPPED) === '1'
  const isMsPending   = () => !isDone() && localStorage.getItem(KEY_MS) === '1'
  const isTaskPending = () => !isDone() && localStorage.getItem(KEY_TASK) === '1'

  /** ゴール作成後に呼ぶ — マイルストーン画面チュートリアルを予約 */
  const startMsTutorial = () => {
    localStorage.setItem(KEY_MS, '1')
  }

  /** マイルストーンカードタップ後に呼ぶ — タスク画面チュートリアルに引き継ぐ */
  const advanceToTaskTutorial = () => {
    localStorage.removeItem(KEY_MS)
    localStorage.setItem(KEY_TASK, '1')
  }

  /** タスク追加完了後に呼ぶ — 今回分のフラグを消す（次回ゴール作成時に再び始まる） */
  const completeTutorial = () => {
    localStorage.removeItem(KEY_MS)
    localStorage.removeItem(KEY_TASK)
  }

  /** スキップボタン押下時に呼ぶ — 以降二度と表示しない */
  const skipTutorial = () => {
    localStorage.removeItem(KEY_MS)
    localStorage.removeItem(KEY_TASK)
    localStorage.setItem(KEY_SKIPPED, '1')
  }

  return { isDone, isMsPending, isTaskPending, startMsTutorial, advanceToTaskTutorial, completeTutorial, skipTutorial }
}
