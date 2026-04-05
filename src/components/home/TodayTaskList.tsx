'use client'

import { Task, Milestone } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Circle } from 'lucide-react'

interface TodayTaskListProps {
  tasks: (Task & { milestone: Milestone })[]
  onTaskToggle: (taskId: string, completed: boolean) => void
}

export default function TodayTaskList({ tasks, onTaskToggle }: TodayTaskListProps) {
  const supabase = createClient()

  async function toggleTask(task: Task) {
    const newCompleted = !task.is_completed_today
    await supabase
      .from('tasks')
      .update({
        is_completed_today: newCompleted,
        last_completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq('id', task.id)
    onTaskToggle(task.id, newCompleted)
  }

  return (
    <div className="bg-red-600 rounded-2xl p-4 h-full">
      <h2 className="text-white font-bold text-sm mb-3">タスク</h2>
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-red-200 text-xs">タスクがありません</p>
        ) : (
          tasks.map(task => (
            <button
              key={task.id}
              onClick={() => toggleTask(task)}
              className="flex items-start gap-2 w-full text-left"
            >
              {task.is_completed_today ? (
                <CheckCircle2 className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-red-300 mt-0.5 flex-shrink-0" />
              )}
              <span className={`text-xs text-white leading-tight ${task.is_completed_today ? 'line-through opacity-60' : ''}`}>
                {task.title}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
