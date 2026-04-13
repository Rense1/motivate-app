'use client'

import { useState } from 'react'
import { Task, TaskReason } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import TaskReasonModal from './TaskReasonModal'
import { Trash2 } from 'lucide-react'
import { frequencyLabel } from '@/lib/taskUtils'

interface TaskCardProps {
  task: Task
  onDelete: (id: string) => void
}

export default function TaskCard({ task, onDelete }: TaskCardProps) {
  const [reasonModalOpen, setReasonModalOpen] = useState(false)
  const [reasons, setReasons] = useState<TaskReason[]>([])
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  async function openReasons() {
    const { data } = await supabase
      .from('task_reasons')
      .select('*')
      .eq('task_id', task.id)
      .order('order_index')
    setReasons(data || [])
    setReasonModalOpen(true)
  }

  function startLongPress() {
    const timer = setTimeout(() => openReasons(), 600)
    setLongPressTimer(timer)
  }

  function cancelLongPress() {
    if (longPressTimer) clearTimeout(longPressTimer)
    setLongPressTimer(null)
  }

  async function handleDelete() {
    await supabase.from('tasks').delete().eq('id', task.id)
    onDelete(task.id)
  }

  return (
    <>
      <div
        className="w-full select-none active:scale-98 transition-transform"
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #f87171 0%, #dc2626 60%, #b91c1c 100%)',
          boxShadow: '0 4px 16px rgba(185,28,28,0.18)',
        }}
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
      >
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-white font-semibold text-base leading-snug">{task.title}</p>
            <span className="inline-block bg-white/20 text-white/90 text-xs font-medium px-2.5 py-0.5 rounded-full mt-1.5">
              {frequencyLabel(task.frequency ?? (task.is_daily ? 'daily' : 'none'))}
            </span>
          </div>
          <button
            onClick={e => { e.stopPropagation(); handleDelete() }}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            className="p-1.5 text-white/50 hover:text-white transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <TaskReasonModal
        isOpen={reasonModalOpen}
        onClose={() => setReasonModalOpen(false)}
        task={task}
        reasons={reasons}
        onReasonsChange={setReasons}
      />
    </>
  )
}
