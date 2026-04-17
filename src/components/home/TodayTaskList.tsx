'use client'

import { useState } from 'react'
import { Task, Milestone } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Circle } from 'lucide-react'
import { calcPeriodUpdate, localizedFrequencyLabel } from '@/lib/taskUtils'
import { useI18n } from '@/lib/i18n'

interface TodayTaskListProps {
  tasks: (Task & { milestone: Milestone })[]
  onTaskToggle: (taskId: string, completed: boolean) => void
}

export default function TodayTaskList({ tasks, onTaskToggle }: TodayTaskListProps) {
  const { t, lang } = useI18n()
  const supabase = createClient()
  const [animId, setAnimId] = useState<string | null>(null)

  async function toggleTask(task: Task) {
    const newCompleted = !task.is_completed_today

    if (newCompleted) {
      setAnimId(task.id)
      setTimeout(() => setAnimId(null), 500)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      is_completed_today: newCompleted,
      last_completed_at: newCompleted ? new Date().toISOString() : null,
    }

    if (newCompleted) {
      if (task.frequency === 'weekly_2' || task.frequency === 'monthly_n' || task.frequency === 'custom') {
        const periodUpdates = calcPeriodUpdate(
          task.frequency,
          task.period_start,
          task.period_done_count ?? 0,
          task.interval_value,
          task.interval_unit,
          task.task_start_at,
        )
        updates.period_done_count = periodUpdates.period_done_count
        updates.period_start = periodUpdates.period_start
      }
    } else {
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
        <h2 className="text-sm font-bold text-gray-800">{t('home.today')}</h2>
        {tasks.length > 0 && (
          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            {completed}/{tasks.length}
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-400 text-xs">{t('home.noTasks')}</p>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <button
              key={task.id}
              onClick={() => toggleTask(task)}
              className="flex items-start gap-2.5 w-full text-left group"
            >
              {/* チェックアイコン + アニメーション */}
              <div className="relative mt-0.5 flex-shrink-0 w-5 h-5">
                {task.is_completed_today ? (
                  <CheckCircle2
                    className={`w-5 h-5 text-red-500 transition-transform duration-200 ${
                      animId === task.id ? 'scale-[1.45]' : 'scale-100'
                    }`}
                  />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 group-active:text-gray-400 transition-colors" />
                )}
                {animId === task.id && (
                  <span
                    className="absolute inset-[-4px] rounded-full bg-red-400/30 pointer-events-none"
                    style={{ animation: 'task-complete-ripple 0.5s ease-out forwards' }}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className={`text-xs text-gray-700 leading-snug transition-colors ${
                  task.is_completed_today ? 'line-through text-gray-400' : ''
                }`}>
                  {task.title}
                </span>
                {(task.frequency === 'weekly_2' || task.frequency === 'every_3_days' ||
                  task.frequency === 'monthly_n' || task.frequency === 'custom') && (
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    {localizedFrequencyLabel(task.frequency, t, lang, task.monthly_count, task.interval_value, task.interval_unit)}
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
