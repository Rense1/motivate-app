import { Task, TaskFrequency } from './types'

/**
 * Determine if a task was completed today based on last_completed_at.
 * This avoids relying on the stale is_completed_today DB column.
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
  // Compare date only (strip time)
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

/**
 * Whether the task should appear in today's list based on frequency.
 */
export function shouldShowInToday(frequency: TaskFrequency): boolean {
  if (frequency === 'daily') return true
  if (frequency === 'weekly') {
    // Show on Mondays (0=Sun, 1=Mon)
    return new Date().getDay() === 1
  }
  return false
}

/**
 * Human-readable label for frequency.
 */
export function frequencyLabel(frequency: TaskFrequency): string {
  switch (frequency) {
    case 'daily':  return '毎日'
    case 'weekly': return '毎週'
    case 'none':   return '1回'
  }
}
