import { Task, TaskFrequency, IntervalUnit } from './types'

// ── 期間計算ヘルパー ────────────────────────────────────────────────────────

/**
 * task_start_at を起点にした、現在の期間の開始日を YYYY-MM-DD で返す。
 * 例: 開始2024-01-01, 2週間ごと → 2週ごとに更新される "今の期間の開始日"
 */
function getPeriodStartFromTaskStart(
  taskStartAt: string,
  intervalValue: number,
  intervalUnit: IntervalUnit,
): string {
  const startDate = new Date(taskStartAt)
  const now = new Date()
  let periodStart: Date

  if (intervalUnit === 'month') {
    const totalMonthsElapsed =
      (now.getFullYear() - startDate.getFullYear()) * 12 +
      (now.getMonth() - startDate.getMonth())
    const periodsElapsed = Math.max(0, Math.floor(totalMonthsElapsed / intervalValue))
    periodStart = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + periodsElapsed * intervalValue,
      startDate.getDate(),
    )
  } else {
    const periodMs =
      intervalUnit === 'week'
        ? intervalValue * 7 * 24 * 60 * 60 * 1000
        : intervalValue * 24 * 60 * 60 * 1000
    const elapsed = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / periodMs))
    periodStart = new Date(startDate.getTime() + elapsed * periodMs)
  }

  return periodStart.toISOString().split('T')[0]
}

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
  intervalValue?: number | null,
  intervalUnit?: IntervalUnit | null,
  taskStartAt?: string | null,
  taskEndAt?: string | null,
): boolean {
  const now = new Date()

  switch (frequency) {
    // ── 毎日 ──────────────────────────────────────────────────────────────
    case 'daily':
      return true

    // ── 毎週 1 回 ─────────────────────────────────────────────────────────
    case 'weekly': {
      if (!lastCompletedAt) return true
      const last = new Date(lastCompletedAt)
      const weekStart = getWeekStart(now)
      return last < weekStart
    }

    // ── 1 回のみ ──────────────────────────────────────────────────────────
    case 'none':
      return !lastCompletedAt

    // ── Premium: 毎週 2 回（後方互換） ────────────────────────────────────
    case 'weekly_2': {
      const weekStart = getWeekStart(now)
      const effectiveDone =
        periodStart && new Date(periodStart) >= weekStart
          ? (periodDoneCount ?? 0)
          : 0
      return effectiveDone < 2
    }

    // ── Premium: 3 日に 1 回（後方互換） ──────────────────────────────────
    case 'every_3_days': {
      if (!lastCompletedAt) return true
      const last = new Date(lastCompletedAt)
      const daysSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
      return daysSince >= 3
    }

    // ── Premium: 毎月 n 回（後方互換） ────────────────────────────────────
    case 'monthly_n': {
      const target = monthlyCount ?? 1
      const monthStart = getMonthStart(now)
      const effectiveDone =
        periodStart && new Date(periodStart) >= monthStart
          ? (periodDoneCount ?? 0)
          : 0
      return effectiveDone < target
    }

    // ── Premium: カスタム（N日/週/月 に M回、開始日起点） ─────────────────
    case 'custom': {
      if (!taskStartAt) return false

      // 開始日前は表示しない
      if (now < new Date(taskStartAt)) return false
      // 終了日後は表示しない
      if (taskEndAt && now > new Date(taskEndAt)) return false

      const iv = intervalValue ?? 1
      const iu = intervalUnit ?? 'week'
      const times = monthlyCount ?? 1

      // 開始日を起点にした現在の期間開始日を計算
      const currentPeriodStart = getPeriodStartFromTaskStart(taskStartAt, iv, iu)
      // 保存された period_start が現在の期間と一致するか確認
      const effectiveDone = periodStart === currentPeriodStart ? (periodDoneCount ?? 0) : 0
      return effectiveDone < times
    }

    default:
      return true
  }
}

// ── 表示ラベル ────────────────────────────────────────────────────────────

/**
 * Human-readable label for frequency.
 */
export function frequencyLabel(
  frequency: TaskFrequency,
  monthlyCount?: number | null,
  intervalValue?: number | null,
  intervalUnit?: IntervalUnit | null,
): string {
  switch (frequency) {
    case 'daily':        return '毎日'
    case 'weekly':       return '毎週'
    case 'none':         return '1回'
    case 'weekly_2':     return '毎週2回'
    case 'every_3_days': return '3日に1回'
    case 'monthly_n':    return `毎月${monthlyCount ?? 1}回`
    case 'custom': {
      const iv = intervalValue ?? 1
      const iu = intervalUnit ?? 'week'
      const t = monthlyCount ?? 1
      const unitLabel = iu === 'day' ? '日' : iu === 'week' ? '週' : 'ヶ月'
      return `${iv}${unitLabel}に${t}回`
    }
  }
}

// ── 期間カウント更新ロジック ──────────────────────────────────────────────

/**
 * weekly_2 / monthly_n のタスク完了時に渡す DB 更新フィールドを計算する。
 * period が新しい週/月に入っていたらカウントをリセットする。
 */
export function calcPeriodUpdate(
  frequency: 'weekly_2' | 'monthly_n' | 'custom',
  periodStart: string | null,
  periodDoneCount: number,
  intervalValue?: number | null,
  intervalUnit?: IntervalUnit | null,
  taskStartAt?: string | null,
): { period_done_count: number; period_start: string } {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  if (frequency === 'weekly_2') {
    const weekStart = getWeekStart(now)
    const isNewPeriod = !periodStart || new Date(periodStart) < weekStart
    return {
      period_done_count: isNewPeriod ? 1 : periodDoneCount + 1,
      period_start: isNewPeriod ? weekStart.toISOString().split('T')[0] : periodStart!,
    }
  }

  if (frequency === 'monthly_n') {
    const monthStart = getMonthStart(now)
    const isNewPeriod = !periodStart || new Date(periodStart) < monthStart
    return {
      period_done_count: isNewPeriod ? 1 : periodDoneCount + 1,
      period_start: isNewPeriod ? monthStart.toISOString().split('T')[0] : periodStart!,
    }
  }

  // custom: 開始日を起点にした期間計算
  const iv = intervalValue ?? 1
  const iu = intervalUnit ?? 'week'

  if (taskStartAt) {
    // 開始日起点: 現在の期間の開始日を計算
    const currentPeriodStart = getPeriodStartFromTaskStart(taskStartAt, iv, iu)
    const isNewPeriod = periodStart !== currentPeriodStart
    return {
      period_done_count: isNewPeriod ? 1 : periodDoneCount + 1,
      period_start: currentPeriodStart,
    }
  }

  // task_start_at がない場合のフォールバック（旧データ互換）
  const periodStartDate = periodStart ? new Date(periodStart) : null
  let isNewPeriod: boolean
  if (!periodStartDate) {
    isNewPeriod = true
  } else if (iu === 'day') {
    isNewPeriod = (now.getTime() - periodStartDate.getTime()) >= iv * 24 * 60 * 60 * 1000
  } else if (iu === 'week') {
    isNewPeriod = (now.getTime() - periodStartDate.getTime()) >= iv * 7 * 24 * 60 * 60 * 1000
  } else {
    const target = new Date(periodStartDate.getFullYear(), periodStartDate.getMonth() + iv, periodStartDate.getDate())
    isNewPeriod = now >= target
  }
  return {
    period_done_count: isNewPeriod ? 1 : periodDoneCount + 1,
    period_start: isNewPeriod ? today : periodStart!,
  }
}
