'use client'

import { useState } from 'react'
import { Milestone, Task } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import TaskCard from '@/components/task/TaskCard'
import { ChevronLeft, Plus, Calendar } from 'lucide-react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'

interface TasksClientProps {
  goalId: string
  milestone: Milestone
  tasks: Task[]
}

export default function TasksClient({ goalId, milestone, tasks: initialTasks }: TasksClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [deadline, setDeadline] = useState(milestone.deadline || '')
  const [savingDeadline, setSavingDeadline] = useState(false)
  const [deadlineOpen, setDeadlineOpen] = useState(false)
  const supabase = createClient()

  async function addTask() {
    if (!newTitle.trim()) return
    setAdding(true)
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        milestone_id: milestone.id,
        title: newTitle.trim(),
        is_daily: true,
        order_index: tasks.length,
      })
      .select()
      .single()

    if (!error && data) {
      setTasks(prev => [...prev, data])
      setNewTitle('')
      setAddOpen(false)
    }
    setAdding(false)
  }

  function handleDelete(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function saveDeadline() {
    setSavingDeadline(true)
    await supabase.from('milestones').update({ deadline: deadline || null }).eq('id', milestone.id)
    setSavingDeadline(false)
    setDeadlineOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Link href={`/milestones/${goalId}`} className="p-1.5 rounded-xl hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <p className="text-sm text-gray-500">タスク管理</p>
        </div>
        <button onClick={() => setDeadlineOpen(true)} className="p-2 rounded-xl hover:bg-gray-100">
          <Calendar className="w-5 h-5 text-red-600" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Milestone circle */}
        <div className="flex flex-col items-center py-4">
          <div className="w-28 h-28 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
            <span className="text-white text-sm font-bold text-center px-3 leading-tight">{milestone.title}</span>
          </div>
          {milestone.deadline && (
            <p className="text-gray-500 text-sm mt-2">
              期限: {new Date(milestone.deadline).toLocaleDateString('ja-JP')}
            </p>
          )}
        </div>

        {/* Connector */}
        {tasks.length > 0 && (
          <div className="flex justify-center">
            <div className="w-0.5 h-6 bg-red-300" />
          </div>
        )}

        {/* Tasks */}
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div key={task.id} className="flex flex-col items-center">
              <TaskCard task={task} onDelete={handleDelete} />
              {index < tasks.length - 1 && (
                <div className="flex flex-col items-center py-1">
                  <span className="text-red-500 text-lg font-bold">+</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add task button */}
        <div className="flex flex-col items-center gap-2 pt-2">
          {tasks.length > 0 && <div className="w-0.5 h-4 bg-red-300" />}
          <button
            onClick={() => setAddOpen(true)}
            className="w-12 h-12 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center hover:bg-red-50"
          >
            <Plus className="w-6 h-6" />
          </button>
          <p className="text-xs text-gray-400">タスクを追加</p>
        </div>

        {tasks.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-4">
            長押しで「なぜやるのか」を記録できます
          </p>
        )}
      </div>

      {/* Add task modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="タスクを追加">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">日常的にやらなければいけないことを追加しましょう</p>
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="例：英語の本を10ページ読む"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={addTask}
            disabled={adding || !newTitle.trim()}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {adding ? '追加中...' : '追加する'}
          </button>
        </div>
      </Modal>

      {/* Deadline modal */}
      <Modal isOpen={deadlineOpen} onClose={() => setDeadlineOpen(false)} title="期限を設定">
        <div className="space-y-4">
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setDeadline(''); saveDeadline() }}
              className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl"
            >
              期限を削除
            </button>
            <button
              onClick={saveDeadline}
              disabled={savingDeadline}
              className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
