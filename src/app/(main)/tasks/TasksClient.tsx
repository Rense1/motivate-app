'use client'

import { useState, useEffect } from 'react'
import { Milestone, Task, TaskFrequency } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import TaskCard from '@/components/task/TaskCard'
import { ChevronLeft, Plus, Calendar } from 'lucide-react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import { useSearchParams, useRouter } from 'next/navigation'

export default function TasksClient() {
  const searchParams = useSearchParams()
  const goalId = searchParams.get('goalId')
  const milestoneId = searchParams.get('milestoneId')
  const router = useRouter()
  const supabase = createClient()

  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newFrequency, setNewFrequency] = useState<TaskFrequency>('daily')
  const [adding, setAdding] = useState(false)

  const [deadline, setDeadline] = useState('')
  const [savingDeadline, setSavingDeadline] = useState(false)
  const [deadlineOpen, setDeadlineOpen] = useState(false)

  // 🔥 searchParams が安定するまで何も描画しない（初期 null → 誤リダイレクト防止）
  if (!goalId || !milestoneId) return null

  useEffect(() => {
    async function fetchData() {
      const { data: ms } = await supabase
        .from('milestones').select('*').eq('id', milestoneId).single()

      if (!ms) {
        router.replace(`/milestones?goalId=${goalId}`)
        return
      }

      const { data: tasks } = await supabase
        .from('tasks').select('*').eq('milestone_id', milestoneId).order('order_index')

      setMilestone(ms)
      setDeadline(ms.deadline || '')
      setTasks(tasks || [])
      setLoading(false)
    }

    fetchData()
  }, [milestoneId, goalId]) // ← goalId を追加（重要）

  async function addTask() {
    if (!newTitle.trim()) return
    setAdding(true)
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        milestone_id: milestoneId,
        title: newTitle.trim(),
        is_daily: newFrequency === 'daily',
        frequency: newFrequency,
        order_index: tasks.length,
      })
      .select().single()

    if (!error && data) {
      setTasks(prev => [...prev, data])
      setNewTitle('')
      setNewFrequency('daily')
      setAddOpen(false)
    }
    setAdding(false)
  }

  function handleDelete(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function saveDeadline() {
    setSavingDeadline(true)
    await supabase.from('milestones').update({ deadline: deadline || null }).eq('id', milestoneId)
    setSavingDeadline(false)
    setDeadlineOpen(false)
  }

  if (loading || !milestone) return null

  return (
    <div className="page-enter min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Link href={`/milestones?goalId=${goalId}`} className="p-1.5 rounded-xl hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <p className="text-sm font-semibold text-gray-500">タスク管理</p>
        </div>
        <button onClick={() => setDeadlineOpen(true)} className="p-2 rounded-xl hover:bg-gray-100">
          <Calendar className="w-5 h-5 text-red-600" />
        </button>
      </div>

      <div className="px-5 py-6">
        {/* ── Milestone card ── */}
        <div
          style={{
            borderRadius: 28,
            background: 'linear-gradient(145deg, #ef4444 0%, #dc2626 40%, #991b1b 100%)',
            boxShadow: '0 16px 48px rgba(185,28,28,0.25), 0 4px 16px rgba(0,0,0,0.10)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            className="absolute rounded-full bg-white/8"
            style={{ width: 200, height: 200, top: -50, right: -50 }}
          />
          <div
            className="absolute rounded-full bg-white/5"
            style={{ width: 130, height: 130, bottom: -30, left: -30 }}
          />
          <div className="relative px-7 py-6">
            <p className="text-red-200 text-xs font-bold uppercase tracking-widest mb-2">
              マイルストーン
            </p>
            <h2
              className="text-white font-bold leading-tight mb-3"
              style={{ fontSize: 'clamp(20px, 6vw, 28px)' }}
            >
              {milestone.title}
            </h2>
            {milestone.deadline && (
              <p className="text-white/60 text-xs">
                期限: {new Date(milestone.deadline).toLocaleDateString('ja-JP')}
              </p>
            )}
          </div>
        </div>

        {/* ── Connector + Tasks ── */}
        <div className="flex flex-col items-center mt-1">
          <div className="w-0.5 h-8 bg-red-200" />

          <div className="w-full">
            {tasks.map((task, index) => (
              <div key={task.id} className="flex flex-col items-center">
                <TaskCard task={task} onDelete={handleDelete} />
                {index < tasks.length - 1 && (
                  <div className="w-0.5 h-6 bg-red-200" />
                )}
              </div>
            ))}
          </div>

          {/* Add button */}
          <div className="flex flex-col items-center gap-1 mt-0">
            {tasks.length > 0 && <div className="w-0.5 h-6 bg-red-200" />}
            <button
              onClick={() => setAddOpen(true)}
              className="w-12 h-12 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center hover:bg-red-50 transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
            <p className="text-xs text-gray-400 mt-1">タスクを追加</p>
          </div>
        </div>

        {tasks.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-2">
            長押しで「なぜやるのか」を記録できます
          </p>
        )}
      </div>

      {/* Add task modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="タスクを追加">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">継続してやらなければいけないことを追加しましょう</p>
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="例：英語の本を10ページ読む"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div>
            <p className="text-xs text-gray-500 mb-2">頻度</p>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'none'] as TaskFrequency[]).map(f => {
                const labels = { daily: '毎日', weekly: '毎週', none: '1回' }
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setNewFrequency(f)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${
                      newFrequency === f
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    {labels[f]}
                  </button>
                )
              })}
            </div>
          </div>
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
