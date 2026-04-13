import { Task, TaskFrequency } from './types'

// ── 期間計算ヘルパー ────────────────────────────────────────────────────────

/** 指定日を含む週の月曜日（00:00:00）を返す */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=日, 1=月...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** 指定日を含む月の1日（00:00:00）を返す */
function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// ── 日付ユーティリティ ──────────────────────────────────────────────────────

/**
 * Determine if a task was completed today based on last_completed_at.
 */
export function isCompletedToday(lastCompletedAt: string | null): boolean {
  if (!lastCompletedAt) return false
  const last = new Date(lastCompletedAt)
  const now = new Date()
  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
  )
}

/**
 * Compute days remaining until a deadline date.
 * Returns null if no deadline. Negative = overdue.
 */
export function daysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null
  const end = new Date(deadline)
  const now = new Date()
  end.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Deadline badge text and urgency level.
 */
export function deadlineBadge(deadline: string | null): { text: string; urgent: boolean } | null {
  const days = daysUntilDeadline(deadline)
  if (days === null) return null
  if (days < 0)  return { text: `${Math.abs(days)}日超過`, urgent: true }
  if (days === 0) return { text: '今日が期限', urgent: true }
  if (days <= 7)  return { text: `残り${days}日`, urgent: true }
  return { text: `残り${days}日`, urgent: false }
}

// ── タスク表示ロジック ─────────────────────────────────────────────────────

/**
 * ホーム画面「今日のタスク」に表示するかどうかを判定する。
 *
 * @param frequency        タスクの頻度
 * @param lastCompletedAt  最終完了日時
 * @param periodDoneCount  現在の期間内の完了数（weekly_2 / monthly_n 用）
 * @param periodStart      period_done_count のカウント開始日
 * @param monthlyCount     monthly_n の月間目標回数
 */
export function shouldShowInToday(
  frequency: TaskFrequency,
  lastCompletedAt?: string | null,
  periodDoneCount?: number | null,
  periodStart?: string | null,
  monthlyCount?: number | null,
): boolean {
  const now = new Date()

  switch (frequency) {
    // ── 毎日 ──────────────────────────────────────────────────────────────
    case 'daily':
      // 毎日表示（完了チェックは is_completed_today で管理。翌日自動リセット）
      return true

    // ── 毎週 1 回 ─────────────────────────────────────────────────────────
    case 'weekly': {
      // 今週まだ完了していなければ表示
      if (!lastCompletedAt) return true
      const last = new Date(lastCompletedAt)
      const weekStart = getWeekStart(now)
      return last < weekStart // 今週以前に完了 → 今週はまだ未完了
    }

    // ── 1 回のみ ──────────────────────────────────────────────────────────
    case 'none':
      // 一度でも完了したら非表示
      return !lastCompletedAt

    // ── Premium: 毎週 2 回 ────────────────────────────────────────────────
    case 'weekly_2': {
      const weekStart = getWeekStart(now)
      // period_start が今週より前なら新しい週 → カウントをリセット扱い
      const effectiveDone =
        periodStart && new Date(periodStart) >= weekStart
          ? (periodDoneCount ?? 0)
          : 0
      return effectiveDone < 2
    }

    // ── Premium: 3 日に 1 回 ──────────────────────────────────────────────
    case 'every_3_days': {
      if (!lastCompletedAt) return true
      const last = new Date(lastCompletedAt)
      const daysSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
      return daysSince >= 3
    }

    // ── Premium: 毎月 n 回 ────────────────────────────────────────────────
    case 'monthly_n': {
      const target = monthlyCount ?? 1
      const monthStart = getMonthStart(now)
      // period_start が今月より前なら月初リセット扱い
      const effectiveDone =
        periodStart && new Date(periodStart) >= monthStart
          ? (periodDoneCount ?? 0)
          : 0
      return effectiveDone < target
    }

    default:
      return true
  }
}

// ── 表示ラベル ────────────────────────────────────────────────────────────

/**
 * Human-readable label for frequency.
 */
export function frequencyLabel(frequency: TaskFrequency, monthlyCount?: number | null): string {
  switch (frequency) {
    case 'daily':        return '毎日'
    case 'weekly':       return '毎週'
    case 'none':         return '1回'
    case 'weekly_2':     return '毎週2回'
    case 'every_3_days': return '3日に1回'
    case 'monthly_n':    return `毎月${monthlyCount ?? 1}回`
  }
}

// ── 期間カウント更新ロジック ──────────────────────────────────────────────

/**
 * weekly_2 / monthly_n のタスク完了時に渡す DB 更新フィールドを計算する。
 * period が新しい週/月に入っていたらカウントをリセットする。
 */
export function calcPeriodUpdate(
  frequency: 'weekly_2' | 'monthly_n',
  periodStart: string | null,
  periodDoneCount: number,
): { period_done_count: number; period_start: string } {
  const now = new Date()

  if (frequency === 'weekly_2') {
    const weekStart = getWeekStart(now)
    const isNewPeriod = !periodStart || new Date(periodStart) < weekStart
    return {
      period_done_count: isNewPeriod ? 1 : periodDoneCount + 1,
      period_start: isNewPeriod
        ? weekStart.toISOString().split('T')[0]
        : periodStart!,
    }
  } else {
    // monthly_n
    const monthStart = getMonthStart(now)
    const isNewPeriod = !periodStart || new Date(periodStart) < monthStart
    return {
      period_done_count: isNewPeriod ? 1 : periodDoneCount + 1,
      period_start: isNewPeriod
        ? monthStart.toISOString().split('T')[0]
        : periodStart!,
    }
  }
}
