'use client'

import { useState } from 'react'
import { Task, TaskReason } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import TaskReasonModal from './TaskReasonModal'
import { Trash2, GripVertical } from 'lucide-react'

interface TaskCardProps {
  task: Task
  onDelete: (id: string) => void
}

export default function TaskCard({ task, onDelete }: TaskCardProps) {
  const [reasonModalOpen, setReasonModalOpen] = useState(false)
  const [reasons, setReasons] = useState<TaskReason[]>([])
  const [loadingReasons, setLoadingReasons] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  async function openReasons() {
    setLoadingReasons(true)
    const { data } = await supabase
      .from('task_reasons')
      .select('*')
      .eq('task_id', task.id)
      .order('order_index')
    setReasons(data || [])
    setLoadingReasons(false)
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
        className="bg-red-600 rounded-2xl p-4 flex items-center gap-3 select-none cursor-pointer active:scale-95 transition-transform"
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
      >
        <GripVertical className="w-5 h-5 text-red-400 flex-shrink-0" />
        <p className="text-white text-sm font-medium flex-1 text-center">{task.title}</p>
        <button
          onClick={e => { e.stopPropagation(); handleDelete() }}
          onMouseDown={e => e.stopPropagation()}
          className="text-red-300 hover:text-white"
        >
          <Trash2 className="w-4 h-4" />
        </button>
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
