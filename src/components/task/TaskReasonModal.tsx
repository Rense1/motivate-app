'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Task, TaskReason } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2 } from 'lucide-react'

interface TaskReasonModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task
  reasons: TaskReason[]
  onReasonsChange: (reasons: TaskReason[]) => void
}

export default function TaskReasonModal({ isOpen, onClose, task, reasons, onReasonsChange }: TaskReasonModalProps) {
  const [newReason, setNewReason] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function addReason() {
    if (!newReason.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .from('task_reasons')
      .insert({ task_id: task.id, reason: newReason.trim(), order_index: reasons.length })
      .select()
      .single()

    if (!error && data) {
      onReasonsChange([...reasons, data])
      setNewReason('')
    }
    setLoading(false)
  }

  async function deleteReason(id: string) {
    await supabase.from('task_reasons').delete().eq('id', id)
    onReasonsChange(reasons.filter(r => r.id !== id))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task.title}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">なぜこの行動をしなければいけないのか</p>

        <div className="space-y-2">
          {reasons.map(r => (
            <div key={r.id} className="flex items-start gap-2 bg-red-50 rounded-xl p-3">
              <span className="text-red-600 text-sm flex-1">・{r.reason}</span>
              <button onClick={() => deleteReason(r.id)} className="text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {reasons.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">理由を追加してください</p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={newReason}
            onChange={e => setNewReason(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addReason()}
            placeholder="理由を入力..."
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={addReason}
            disabled={loading || !newReason.trim()}
            className="bg-red-600 text-white rounded-xl px-4 py-2 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Modal>
  )
}
