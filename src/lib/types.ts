export interface Profile {
  id: string
  is_premium: boolean
  premium_started_at: string | null
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  vision_image_url: string | null
  vision_text: string | null
  created_at: string
  updated_at: string
  milestones?: Milestone[]
}

export interface Milestone {
  id: string
  goal_id: string
  title: string
  order_index: number
  deadline: string | null
  is_achieved: boolean
  achieved_at: string | null
  created_at: string
  reasons?: MilestoneReason[]
  tasks?: Task[]
}

export interface MilestoneReason {
  id: string
  milestone_id: string
  reason: string
  order_index: number
}

export type TaskFrequency =
  | 'daily'
  | 'weekly'
  | 'none'
  | 'weekly_2'      // Premium: 毎週2回（後方互換）
  | 'every_3_days'  // Premium: 3日に1回（後方互換）
  | 'monthly_n'     // Premium: 毎月n回（後方互換）
  | 'custom'        // Premium: カスタム（interval_value / interval_unit / monthly_count）

export type IntervalUnit = 'day' | 'week' | 'month'

/** Premium専用の頻度かどうか */
export const PREMIUM_FREQUENCIES: TaskFrequency[] = ['weekly_2', 'every_3_days', 'monthly_n', 'custom']
export const isPremiumFrequency = (f: TaskFrequency): boolean =>
  (PREMIUM_FREQUENCIES as string[]).includes(f)

export interface Task {
  id: string
  milestone_id: string
  title: string
  is_daily: boolean
  frequency: TaskFrequency
  /** monthly_n / custom 頻度で使う目標回数（custom では times_per_interval として使用） */
  monthly_count: number | null
  /** custom 頻度: 間隔の数値（例: 3日に1回 → 3） */
  interval_value?: number | null
  /** custom 頻度: 間隔の単位 'day' | 'week' | 'month' */
  interval_unit?: IntervalUnit | null
  /** タスク単体の期日 */
  deadline?: string | null
  /** 現在の期間（週 or 月）内の完了数 */
  period_done_count: number
  /** period_done_count のカウント開始日 */
  period_start: string | null
  order_index: number
  is_completed_today: boolean
  last_completed_at: string | null
  created_at: string
  reasons?: TaskReason[]

  // ── 通知設定（オプション） ──────────────────────────────────────────────
  /** 通知を有効にするか */
  notification_enabled?: boolean | null
  /** 通知時刻 "HH:mm" */
  notification_time?: string | null
  /** 期限通知（1回）の日時 ISO8601 */
  notification_deadline?: string | null
  /** Premium: 複数通知時刻 ["HH:mm", ...] */
  notification_times?: string[] | null
}

// ── 通知スケジュール入力型 ─────────────────────────────────────────────────
export interface NotificationScheduleInput {
  taskId: string
  taskTitle: string
  frequency: TaskFrequency
  notificationTime: string      // "HH:mm"
  notificationDeadline?: string // ISO8601 (1回限りの場合)
  extraTimes?: string[]         // Premium: 追加通知時刻
}

export interface TaskReason {
  id: string
  task_id: string
  reason: string
  order_index: number
}
