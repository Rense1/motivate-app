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
              <span className={`text-xs text-gray-700 leading-snug ${task.is_completed_today ? 'line-through text-gray-400' : ''}`}>
                {task.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
