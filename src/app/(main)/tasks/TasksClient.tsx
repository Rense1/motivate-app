'use client'

import { useState, useEffect } from 'react'
import { Milestone, Task, TaskFrequency, isPremiumFrequency } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import TaskCard from '@/components/task/TaskCard'
import PremiumModal from '@/components/ui/PremiumModal'
import { ChevronLeft, Plus, Calendar, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import { useSearchParams, useRouter } from 'next/navigation'
import { usePremium } from '@/lib/usePremium'
import { frequencyLabel } from '@/lib/taskUtils'

// ── 基本頻度 ────────────────────────────────────────────────────────────────
const BASIC_FREQUENCIES: { value: TaskFrequency; label: string }[] = [
  { value: 'daily',  label: '毎日' },
  { value: 'weekly', label: '毎週' },
  { value: 'none',   label: '1回' },
]

// ── Premium 詳細頻度 ─────────────────────────────────────────────────────────
const PREMIUM_FREQUENCIES: { value: TaskFrequency; label: string }[] = [
  { value: 'weekly_2',     label: '毎週2回' },
  { value: 'every_3_days', label: '3日に1回' },
  { value: 'monthly_n',    label: '毎月◯回' },
]

export default function TasksClient() {
  const searchParams = useSearchParams()
  const goalId = searchParams.get('goalId')
  const milestoneId = searchParams.get('milestoneId')
  const router = useRouter()
  const supabase = createClient()
  const isPremium = usePremium()

  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // ── タスク追加 Modal ────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newFrequency, setNewFrequency] = useState<TaskFrequency>('daily')
  const [newMonthlyCount, setNewMonthlyCount] = useState(1)
  const [showPremiumFreq, setShowPremiumFreq] = useState(false)
  const [adding, setAdding] = useState(false)

  // ── 期限設定スティッキーカード ──────────────────────────────────────────
  const [deadline, setDeadline] = useState('')
  const [savingDeadline, setSavingDeadline] = useState(false)
  const [deadlineOpen, setDeadlineOpen] = useState(false)

  // ── やる理由 ────────────────────────────────────────────────────────────
  const [reasonText, setReasonText] = useState('')
  const [reasonId, setReasonId] = useState<string | null>(null)
  const [savingReason, setSavingReason] = useState(false)

  // ── Premium モーダル ────────────────────────────────────────────────────
  const [premiumModalOpen, setPremiumModalOpen] = useState(false)
  const [premiumFeatureName, setPremiumFeatureName] = useState('')

  if (!goalId || !milestoneId) return null

  useEffect(() => {
    async function fetchData() {
      const { data: ms } = await supabase
        .from('milestones').select('*').eq('id', milestoneId).single()

      if (!ms) {
        router.replace(`/milestones?goalId=${goalId}`)
        return
      }

      const [{ data: tasks }, { data: reasons }] = await Promise.all([
        supabase.from('tasks').select('*').eq('milestone_id', milestoneId).order('order_index'),
        supabase.from('milestone_reasons').select('*').eq('milestone_id', milestoneId).order('order_index').limit(1),
      ])

      setMilestone(ms)
      setDeadline(ms.deadline || '')
      setTasks(tasks || [])

      if (reasons && reasons.length > 0) {
        setReasonText(reasons[0].reason)
        setReasonId(reasons[0].id)
      }

      setLoading(false)
    }
    fetchData()
  }, [milestoneId, goalId])

  async function saveReason() {
    if (!milestoneId) return
    setSavingReason(true)
    const trimmed = reasonText.trim()
    if (reasonId) {
      await supabase.from('milestone_reasons').update({ reason: trimmed }).eq('id', reasonId)
    } else if (trimmed) {
      const { data } = await supabase
        .from('milestone_reasons')
        .insert({ milestone_id: milestoneId, reason: trimmed, order_index: 0 })
        .select().single()
      if (data) setReasonId(data.id)
    }
    setSavingReason(false)
  }

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
        monthly_count: newFrequency === 'monthly_n' ? newMonthlyCount : null,
        order_index: tasks.length,
      })
      .select().single()

    if (!error && data) {
      setTasks(prev => [...prev, data])
      setNewTitle('')
      setNewFrequency('daily')
      setNewMonthlyCount(1)
      setShowPremiumFreq(false)
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
    if (milestone) setMilestone({ ...milestone, deadline: deadline || null })
  }

  function handleFrequencySelect(f: TaskFrequency) {
    if (isPremiumFrequency(f) && !isPremium) {
      setPremiumFeatureName('詳細な頻度設定')
      setPremiumModalOpen(true)
      return
    }
    setNewFrequency(f)
  }

  if (loading || !milestone) return null

  return (
    <div className="page-enter min-h-screen bg-gray-50">
      {/* ── ヘッダー ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Link href={`/milestones?goalId=${goalId}`} className="p-1.5 rounded-xl hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <p className="text-sm font-semibold text-gray-500">タスク管理</p>
        </div>
        <button
          onClick={() => setDeadlineOpen(prev => !prev)}
          className={`p-2 rounded-xl transition-colors ${deadlineOpen ? 'bg-red-50' : 'hover:bg-gray-100'}`}
        >
          <Calendar className={`w-5 h-5 ${deadlineOpen ? 'text-red-600' : 'text-red-600'}`} />
        </button>
      </div>

      {/* ── 期限設定スティッキーカード（固定表示）────────────────────── */}
      {deadlineOpen && (
        <div
          className="sticky top-[57px] z-10 bg-white border-b border-gray-100 shadow-sm"
          style={{ transition: 'all 0.2s ease' }}
        >
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-red-500" />
                期限設定
              </p>
              <button
                onClick={() => setDeadlineOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <ChevronUp className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {milestone.deadline && (
              <p className="text-xs text-gray-500 mb-2">
                現在: {new Date(milestone.deadline).toLocaleDateString('ja-JP')}
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                onClick={() => { setDeadline(''); saveDeadline() }}
                className="px-3 py-2.5 border border-gray-300 text-gray-500 text-xs rounded-xl whitespace-nowrap"
              >
                削除
              </button>
              <button
                onClick={saveDeadline}
                disabled={savingDeadline}
                className="px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 whitespace-nowrap"
              >
                {savingDeadline ? '保存中' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 py-6">
        {/* ── マイルストーンカード ────────────────────────────────────── */}
        <div
          style={{
            borderRadius: 28,
            background: 'linear-gradient(145deg, #ef4444 0%, #dc2626 40%, #991b1b 100%)',
            boxShadow: '0 16px 48px rgba(185,28,28,0.25), 0 4px 16px rgba(0,0,0,0.10)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div className="absolute rounded-full bg-white/8" style={{ width: 200, height: 200, top: -50, right: -50 }} />
          <div className="absolute rounded-full bg-white/5" style={{ width: 130, height: 130, bottom: -30, left: -30 }} />

          <div className="relative px-7 py-6">
            <p className="text-red-200 text-xs font-bold uppercase tracking-widest mb-2">
              マイルストーン
            </p>
            <h2
              className="text-white font-bold leading-tight mb-4"
              style={{ fontSize: 'clamp(20px, 6vw, 28px)' }}
            >
              {milestone.title}
            </h2>

            {/* やる理由 */}
            <div className="mb-3">
              <p className="text-red-200 text-xs font-semibold mb-1.5">やる理由</p>
              <textarea
                value={reasonText}
                onChange={e => setReasonText(e.target.value)}
                onBlur={saveReason}
                placeholder="やる理由を入力..."
                rows={2}
                className="w-full bg-white/15 text-white placeholder-white/40 text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-white/40"
                style={{ fontSize: 13 }}
              />
              {savingReason && <p className="text-white/40 text-xs mt-1">保存中...</p>}
            </div>

            {milestone.deadline && (
              <p className="text-white/60 text-xs">
                期限: {new Date(milestone.deadline).toLocaleDateString('ja-JP')}
              </p>
            )}
          </div>
        </div>

        {/* ── コネクタ + タスク一覧 ────────────────────────────────────── */}
        <div className="flex flex-col items-center mt-1">
          <div className="w-0.5 h-8 bg-red-200" />

          <div className="w-full">
            {tasks.map((task, index) => (
              <div key={task.id} className="flex flex-col items-center">
                <TaskCard task={task} onDelete={handleDelete} />
                {index < tasks.length - 1 && <div className="w-0.5 h-6 bg-red-200" />}
              </div>
            ))}
          </div>

          {/* 追加ボタン */}
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
      </div>

      {/* ── タスク追加 Modal ─────────────────────────────────────────── */}
      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setShowPremiumFreq(false) }} title="タスクを追加">
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

          {/* ── 頻度選択 ──────────────────────────────────────────────── */}
          <div>
            <p className="text-xs text-gray-500 mb-2">頻度</p>

            {/* 基本頻度 */}
            <div className="flex gap-2 mb-2">
              {BASIC_FREQUENCIES.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => { setNewFrequency(f.value); setShowPremiumFreq(false) }}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${
                    newFrequency === f.value && !isPremiumFrequency(newFrequency)
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* 詳細な頻度設定（Premium）トグル */}
            <button
              type="button"
              onClick={() => {
                if (!isPremium) {
                  setPremiumFeatureName('詳細な頻度設定')
                  setPremiumModalOpen(true)
                  return
                }
                setShowPremiumFreq(prev => !prev)
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${
                isPremiumFrequency(newFrequency)
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {!isPremium && <Lock className="w-3.5 h-3.5" />}
                詳細な頻度設定
                {!isPremium && (
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">
                    Premium
                  </span>
                )}
                {isPremiumFrequency(newFrequency) && (
                  <span className="text-xs text-yellow-600">
                    — {frequencyLabel(newFrequency, newMonthlyCount)}
                  </span>
                )}
              </span>
              {isPremium && (
                showPremiumFreq
                  ? <ChevronUp className="w-4 h-4" />
                  : <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Premium 詳細頻度パネル */}
            {showPremiumFreq && isPremium && (
              <div className="mt-2 border border-yellow-200 rounded-xl p-3 bg-yellow-50 space-y-2">
                <div className="flex gap-2">
                  {PREMIUM_FREQUENCIES.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => handleFrequencySelect(f.value)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                        newFrequency === f.value
                          ? 'bg-yellow-400 text-white border-yellow-400'
                          : 'bg-white text-gray-600 border-gray-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* 毎月◯回の n 入力 */}
                {newFrequency === 'monthly_n' && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-600">月</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={newMonthlyCount}
                      onChange={e => setNewMonthlyCount(Math.max(1, Math.min(31, Number(e.target.value))))}
                      className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <span className="text-xs text-gray-600">回</span>
                  </div>
                )}
              </div>
            )}
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

      {/* Premium モーダル */}
      <PremiumModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        featureName={premiumFeatureName}
      />
    </div>
  )
}
