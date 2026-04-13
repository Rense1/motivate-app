export interface Profile {
  id: string
  is_premium: boolean
  premium_started_at: string | null
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

export type TaskFrequency = 'daily' | 'weekly' | 'none'

export interface Task {
  id: string
  milestone_id: string
  title: string
  is_daily: boolean
  frequency: TaskFrequency
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
