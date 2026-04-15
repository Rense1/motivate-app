'use client'

import { Task, Milestone } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Circle } from 'lucide-react'
import { calcPeriodUpdate, frequencyLabel } from '@/lib/taskUtils'

interface TodayTaskListProps {
  tasks: (Task & { milestone: Milestone })[]
  onTaskToggle: (taskId: string, completed: boolean) => void
}

export default function TodayTaskList({ tasks, onTaskToggle }: TodayTaskListProps) {
  const supabase = createClient()

  async function toggleTask(task: Task) {
    const newCompleted = !task.is_completed_today

    // ── DB 更新フィールドを構築 ──────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      is_completed_today: newCompleted,
      last_completed_at: newCompleted ? new Date().toISOString() : null,
    }

    if (newCompleted) {
      // Premium 頻度は期間カウントも更新
      if (task.frequency === 'weekly_2' || task.frequency === 'monthly_n' || task.frequency === 'custom') {
        const periodUpdates = calcPeriodUpdate(
          task.frequency,
          task.period_start,
          task.period_done_count ?? 0,
          task.interval_value,
          task.interval_unit,
        )
        updates.period_done_count = periodUpdates.period_done_count
        updates.period_start = periodUpdates.period_start
      }
    } else {
      // 完了を取り消すときは期間カウントを 1 減らす（min 0）
      if (task.frequency === 'weekly_2' || task.frequency === 'monthly_n' || task.frequency === 'custom') {
        updates.period_done_count = Math.max(0, (task.period_done_count ?? 1) - 1)
      }
    }

    await supabase.from('tasks').update(updates).eq('id', task.id)
    onTaskToggle(task.id, newCompleted)
  }

  const completed = tasks.filter(t => t.is_completed_today).length

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-800">今日のタスク</h2>
        {tasks.length > 0 && (
          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            {completed}/{tasks.length}
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-400 text-xs">タスクがありません</p>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <button
              key={task.id}
              onClick={() => toggleTask(task)}
              className="flex items-start gap-2.5 w-full text-left"
            >
              {task.is_completed_today ? (
                <CheckCircle2 className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-xs text-gray-700 leading-snug ${task.is_completed_today ? 'line-through text-gray-400' : ''}`}>
                  {task.title}
                </span>
                {/* premium 頻度はラベルを小さく表示 */}
                {(task.frequency === 'weekly_2' || task.frequency === 'every_3_days' || task.frequency === 'monthly_n') && (
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    {frequencyLabel(task.frequency, task.monthly_count)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
