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
  | 'weekly_2'      // Premium: 毎週2回
  | 'every_3_days'  // Premium: 3日に1回
  | 'monthly_n'     // Premium: 毎月n回

/** Premium専用の頻度かどうか */
export const PREMIUM_FREQUENCIES: TaskFrequency[] = ['weekly_2', 'every_3_days', 'monthly_n']
export const isPremiumFrequency = (f: TaskFrequency): boolean =>
  (PREMIUM_FREQUENCIES as string[]).includes(f)

export interface Task {
  id: string
  milestone_id: string
  title: string
  is_daily: boolean
  frequency: TaskFrequency
  /** monthly_n 頻度で使う月間目標回数 */
  monthly_count: number | null
  /** 現在の期間（週 or 月）内の完了数 */
  period_done_count: number
  /** period_done_count のカウント開始日 */
  period_start: string | null
  order_index: number
  is_completed_today: boolean
  last_completed_at: string | null
  created_at: string
  reasons?: TaskReason[]
}

export interface TaskReason {
  id: string
  task_id: string
  reason: string
  order_index: number
}
