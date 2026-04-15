'use client'

import { useState, useEffect } from 'react'
import { Milestone, Task, TaskFrequency, IntervalUnit, isPremiumFrequency } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import TaskCard from '@/components/task/TaskCard'
import PremiumModal from '@/components/ui/PremiumModal'
import {
  ChevronLeft, Plus, Calendar, Lock, ChevronDown, ChevronUp,
  Bell, X, Check, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { usePremium } from '@/lib/usePremium'
import {
  scheduleStructuredNotifications,
  cancelTaskNotifications,
  createNotificationChannel,
  type NotifEntry,
} from '@/lib/notifications'
import { syncWidgetTasks, syncWidgetPremium } from '@/lib/widgetPlugin'

// ── 曜日ラベル ────────────────────────────────────────────────────────────
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

// ── 基本頻度 ──────────────────────────────────────────────────────────────
const BASIC_FREQUENCIES: { value: TaskFrequency; label: string }[] = [
  { value: 'daily',  label: '毎日' },
  { value: 'weekly', label: '毎週' },
  { value: 'none',   label: '1回' },
]

// ── フォーム型 ────────────────────────────────────────────────────────────
interface FormState {
  title: string
  frequency: TaskFrequency          // 基本頻度（毎日/毎週/1回）
  // ── Premium: 詳細な頻度・期限設定 ────────────────────────────────────
  showPremiumDetail: boolean
  intervalValue: number             // N（例: 3日に1回 → 3）
  intervalUnit: IntervalUnit        // 日/週/月
  timesPerInterval: number          // M（例: 1週に2回 → 2）
  taskDeadline: string              // YYYY-MM-DD
  // ── Premium: 通知設定 ─────────────────────────────────────────────────
  showNotification: boolean
  notificationOn: boolean
  notifEntries: NotifEntry[]
}

function emptyForm(): FormState {
  return {
    title: '',
    frequency: 'daily',
    showPremiumDetail: false,
    intervalValue: 1,
    intervalUnit: 'week',
    timesPerInterval: 1,
    taskDeadline: '',
    showNotification: false,
    notificationOn: false,
    notifEntries: [],
  }
}

function newNotifId() {
  return Math.random().toString(36).slice(2, 9)
}

export default function TasksClient() {
  const searchParams = useSearchParams()
  const goalId      = searchParams.get('goalId')
  const milestoneId = searchParams.get('milestoneId')
  const router      = useRouter()
  const supabase    = createClient()
  const isPremium   = usePremium()

  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [tasks, setTasks]         = useState<Task[]>([])
  const [loading, setLoading]     = useState(true)

  const [formOpen, setFormOpen]   = useState(false)
  const [form, setForm]           = useState<FormState>(emptyForm())
  const [editId, setEditId]       = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)

  const [deadline, setDeadline]             = useState('')
  const [savingDeadline, setSavingDeadline] = useState(false)
  const [deadlineOpen, setDeadlineOpen]     = useState(false)

  const [reasonText, setReasonText]     = useState('')
  const [reasonId, setReasonId]         = useState<string | null>(null)
  const [savingReason, setSavingReason] = useState(false)

  const [premiumModalOpen, setPremiumModalOpen]     = useState(false)
  const [premiumFeatureName, setPremiumFeatureName] = useState('')

  // ── useEffect（hooks は early return より前に置く） ─────────────────────
  useEffect(() => {
    if (!milestoneId || !goalId) return
    createNotificationChannel()

    async function fetchData() {
      const { data: ms } = await supabase
        .from('milestones').select('*').eq('id', milestoneId).single()

      if (!ms) { router.replace(`/milestones?goalId=${goalId}`); return }

      const [{ data: taskRows }, { data: reasons }] = await Promise.all([
        supabase.from('tasks').select('*').eq('milestone_id', milestoneId).order('order_index'),
        supabase.from('milestone_reasons').select('*').eq('milestone_id', milestoneId).order('order_index').limit(1),
      ])

      setMilestone(ms)
      setDeadline(ms.deadline || '')
      setTasks(taskRows || [])
      syncWidgetTasks((taskRows ?? []).map(t => t.title))
      syncWidgetPremium(isPremium ?? false)

      if (reasons?.[0]) {
        setReasonText(reasons[0].reason)
        setReasonId(reasons[0].id)
      }
      setLoading(false)
    }
    fetchData()
  }, [milestoneId, goalId])

  if (!goalId || !milestoneId) return null

  // ── やる理由 ──────────────────────────────────────────────────────────────
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

  // ── 編集開始 ──────────────────────────────────────────────────────────────
  function startEdit(task: Task) {
    const isPremiumFreq = isPremiumFrequency(task.frequency)
    // 旧 Premium 頻度 → カスタム値に変換
    let intervalValue = 1
    let intervalUnit: IntervalUnit = 'week'
    let timesPerInterval = 1
    if (task.frequency === 'custom') {
      intervalValue = task.interval_value ?? 1
      intervalUnit = (task.interval_unit ?? 'week') as IntervalUnit
      timesPerInterval = task.monthly_count ?? 1
    } else if (task.frequency === 'weekly_2') {
      intervalValue = 1; intervalUnit = 'week'; timesPerInterval = 2
    } else if (task.frequency === 'every_3_days') {
      intervalValue = 3; intervalUnit = 'day'; timesPerInterval = 1
    } else if (task.frequency === 'monthly_n') {
      intervalValue = 1; intervalUnit = 'month'; timesPerInterval = task.monthly_count ?? 1
    }
    const showDetail = isPremiumFreq || !!task.deadline

    setEditId(task.id)
    setForm({
      title: task.title,
      frequency: isPremiumFreq ? 'daily' : (task.frequency ?? 'daily'),
      showPremiumDetail: showDetail,
      intervalValue,
      intervalUnit,
      timesPerInterval,
      taskDeadline: task.deadline ?? '',
      showNotification: task.notification_enabled ?? false,
      notificationOn: task.notification_enabled ?? false,
      notifEntries: task.notification_times
        ? (task.notification_times as unknown as NotifEntry[])
        : [],
    })
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditId(null)
    setForm(emptyForm())
    setFormOpen(false)
  }

  // ── 有効な頻度を取得 ────────────────────────────────────────────────────
  function effectiveFrequency(): TaskFrequency {
    if (form.showPremiumDetail) return 'custom'
    return form.frequency
  }

  // ── タスク追加 / 更新 ─────────────────────────────────────────────────────
  async function submitTask() {
    if (!form.title.trim()) return
    setSaving(true)

    const freq = effectiveFrequency()

    // 最小ペイロード（base schema のカラムのみ）
    const basePayload: Record<string, unknown> = {
      title: form.title.trim(),
      is_daily: freq === 'daily',
    }
    // Premium 系カラム（未実行 SQL があればフォールバックで除外）
    const premiumPayload: Record<string, unknown> = {
      monthly_count:  form.showPremiumDetail ? form.timesPerInterval : null,
      interval_value: form.showPremiumDetail ? form.intervalValue    : null,
      interval_unit:  form.showPremiumDetail ? form.intervalUnit     : null,
      deadline:       form.taskDeadline || null,
    }
    const fullPayload = { ...basePayload, ...premiumPayload }

    // スキーマキャッシュエラー判定
    const isPremiumColErr = (msg: string) =>
      msg.includes('deadline')       || msg.includes('interval_value') ||
      msg.includes('interval_unit')  || msg.includes('monthly_count')  ||
      msg.includes('period_done_count') || msg.includes('period_start')
    const isFreqColErr = (msg: string) => msg.includes('frequency')

    let useFrequencyCol = true

    if (editId) {
      // 試行1: 全カラム + frequency
      let { data, error } = await supabase
        .from('tasks')
        .update({ ...fullPayload, frequency: freq })
        .eq('id', editId).select().single()

      // 試行2: 新カラム未作成 → 新カラムなし + frequency
      if (error && isPremiumColErr(error.message)) {
        ;({ data, error } = await supabase
          .from('tasks')
          .update({ ...basePayload, frequency: freq })
          .eq('id', editId).select().single())
      }

      // 試行3: frequency カラム未作成 → frequency なし
      if (error && isFreqColErr(error.message)) {
        useFrequencyCol = false
        ;({ data, error } = await supabase
          .from('tasks')
          .update(basePayload)
          .eq('id', editId).select().single())
      }

      if (!error && data) {
        const updated: Task = {
          ...data,
          frequency: useFrequencyCol ? data.frequency : freq,
          notification_enabled: form.notificationOn,
          notification_times: form.notifEntries.length > 0
            ? form.notifEntries as unknown as string[]
            : null,
        }
        setTasks(prev => prev.map(t => t.id === editId ? updated : t))
        syncWidgetTasks(tasks.map(t => t.id === editId ? updated.title : t.title))

        if (form.notificationOn && form.notifEntries.length > 0) {
          await scheduleStructuredNotifications(editId, data.title, form.notifEntries)
        } else {
          await cancelTaskNotifications(editId)
        }
      } else if (error) {
        console.error('task update error:', error.message)
      }

      setEditId(null)

    } else {
      // ── 新規追加 ──────────────────────────────────────────────────────
      // 試行1: 全カラム + frequency
      let { data, error } = await supabase
        .from('tasks')
        .insert({ milestone_id: milestoneId, order_index: tasks.length, ...fullPayload, frequency: freq })
        .select().single()

      // 試行2: 新カラム未作成 → 新カラムなし + frequency
      if (error && isPremiumColErr(error.message)) {
        ;({ data, error } = await supabase
          .from('tasks')
          .insert({ milestone_id: milestoneId, order_index: tasks.length, ...basePayload, frequency: freq })
          .select().single())
      }

      // 試行3: frequency カラム未作成 → frequency なし
      if (error && isFreqColErr(error.message)) {
        useFrequencyCol = false
        ;({ data, error } = await supabase
          .from('tasks')
          .insert({ milestone_id: milestoneId, order_index: tasks.length, ...basePayload })
          .select().single())
      }

      if (!error && data) {
        const newTask: Task = {
          ...data,
          frequency: useFrequencyCol ? data.frequency : freq,
          notification_enabled: form.notificationOn,
          notification_times: form.notifEntries.length > 0
            ? form.notifEntries as unknown as string[]
            : null,
        }
        setTasks(prev => [...prev, newTask])
        syncWidgetTasks([...tasks.map(t => t.title), newTask.title])

        if (form.notificationOn && form.notifEntries.length > 0) {
          await scheduleStructuredNotifications(data.id, data.title, form.notifEntries)
        }
      } else if (error) {
        console.error('task insert error:', error.message)
      }
    }

    setForm(emptyForm())
    setFormOpen(false)
    setSaving(false)
  }

  // ── 削除 ──────────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    cancelTaskNotifications(id)
    const next = tasks.filter(t => t.id !== id)
    setTasks(next)
    syncWidgetTasks(next.map(t => t.title))
    if (editId === id) cancelEdit()
  }

  // ── 期限保存 ──────────────────────────────────────────────────────────────
  async function saveDeadline() {
    setSavingDeadline(true)
    await supabase.from('milestones').update({ deadline: deadline || null }).eq('id', milestoneId)
    setSavingDeadline(false)
    setDeadlineOpen(false)
    if (milestone) setMilestone({ ...milestone, deadline: deadline || null })
  }

  // ── 通知エントリ操作 ─────────────────────────────────────────────────────
  function addNotifEntry(type: 'weekly' | 'once') {
    const entry: NotifEntry = type === 'weekly'
      ? { id: newNotifId(), type: 'weekly', day: 1, time: '08:00' }
      : { id: newNotifId(), type: 'once', datetime: '' }
    setForm(prev => ({ ...prev, notifEntries: [...prev.notifEntries, entry] }))
  }

  function removeNotifEntry(id: string) {
    setForm(prev => ({ ...prev, notifEntries: prev.notifEntries.filter(e => e.id !== id) }))
  }

  function updateNotifEntry(id: string, patch: Partial<NotifEntry>) {
    setForm(prev => ({
      ...prev,
      notifEntries: prev.notifEntries.map(e =>
        e.id === id ? { ...e, ...patch } as NotifEntry : e
      ),
    }))
  }

  if (loading || !milestone) return null

  const effFreq = effectiveFrequency()

  return (
    <div className="page-enter min-h-screen bg-gray-50">

      {/* ── ヘッダー ────────────────────────────────────────────────────────── */}
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
          <Calendar className="w-5 h-5 text-red-600" />
        </button>
      </div>

      {/* ── 期限設定（折りたたみ） ──────────────────────────────────────────── */}
      {deadlineOpen && (
        <div className="sticky top-[57px] z-10 bg-white border-b border-gray-100 shadow-sm">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-red-500" />マイルストーン期限
              </p>
              <button onClick={() => setDeadlineOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <ChevronUp className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {milestone.deadline && (
              <p className="text-xs text-gray-500 mb-2">現在: {new Date(milestone.deadline).toLocaleDateString('ja-JP')}</p>
            )}
            <div className="flex gap-2">
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              <button onClick={() => { setDeadline(''); saveDeadline() }}
                className="px-3 py-2.5 border border-gray-300 text-gray-500 text-xs rounded-xl whitespace-nowrap">削除</button>
              <button onClick={saveDeadline} disabled={savingDeadline}
                className="px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 whitespace-nowrap">
                {savingDeadline ? '保存中' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pt-4 pb-8 space-y-4">

        {/* ── タスク追加ボタン（収納時）─────────────────────────────────────── */}
        {!formOpen && (
          <button
            onClick={() => { setEditId(null); setForm(emptyForm()); setFormOpen(true) }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-red-300 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors"
          >
            <Plus className="w-4 h-4" />タスクを追加
          </button>
        )}

        {/* ── タスク追加 / 編集フォーム（展開時）─────────────────────────────── */}
        {formOpen && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* フォームヘッダー */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">
                {editId ? '✏️ タスクを編集' : '＋ タスクを追加'}
              </p>
              <button onClick={cancelEdit} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">

              {/* タイトル入力 */}
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && submitTask()}
                placeholder="例：英語の本を10ページ読む"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50"
              />

              {/* ── 基本頻度 ───────────────────────────────────────────────── */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">頻度</p>
                <div className="flex gap-2">
                  {BASIC_FREQUENCIES.map(f => (
                    <button key={f.value} type="button"
                      onClick={() => setForm(prev => ({ ...prev, frequency: f.value }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                        effFreq === f.value
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Premium: 詳細な頻度・期限設定 ──────────────────────────── */}
              <div>
                <button type="button"
                  onClick={() => {
                    if (!isPremium) { setPremiumFeatureName('詳細な頻度・期限設定'); setPremiumModalOpen(true); return }
                    setForm(prev => ({ ...prev, showPremiumDetail: !prev.showPremiumDetail }))
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition ${
                    (form.showPremiumDetail || form.taskDeadline)
                      ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {!isPremium && <Lock className="w-3 h-3" />}
                    詳細な頻度・期限設定
                    {!isPremium
                      ? <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Premium</span>
                      : form.showPremiumDetail
                        ? <span className="text-yellow-600">
                            — {form.intervalValue}{form.intervalUnit === 'day' ? '日' : form.intervalUnit === 'week' ? '週' : 'ヶ月'}に{form.timesPerInterval}回
                            {form.taskDeadline ? ` / ${new Date(form.taskDeadline + 'T00:00:00').toLocaleDateString('ja-JP')}` : ''}
                          </span>
                        : form.taskDeadline
                          ? <span className="text-yellow-600">— {new Date(form.taskDeadline + 'T00:00:00').toLocaleDateString('ja-JP')}</span>
                          : null
                    }
                  </span>
                  {isPremium && (form.showPremiumDetail
                    ? <ChevronUp className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {form.showPremiumDetail && isPremium && (
                  <div className="mt-2 border border-yellow-200 rounded-xl bg-yellow-50 p-3 space-y-4">

                    {/* 頻度設定 */}
                    <div>
                      <p className="text-xs font-semibold text-yellow-700 mb-2">頻度設定</p>
                      {(() => {
                        const ivMax = form.intervalUnit === 'day' ? 30 : form.intervalUnit === 'week' ? 8 : 12
                        const timesMax = form.intervalUnit === 'day' ? form.intervalValue : form.intervalUnit === 'week' ? 7 : 31
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-gray-600">毎</span>
                            <select
                              value={form.intervalValue}
                              onChange={e => setForm(prev => ({ ...prev, intervalValue: Number(e.target.value) }))}
                              className="border border-yellow-300 rounded-lg px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            >
                              {Array.from({ length: ivMax }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                            <select
                              value={form.intervalUnit}
                              onChange={e => {
                                const u = e.target.value as IntervalUnit
                                const max = u === 'day' ? 30 : u === 'week' ? 8 : 12
                                setForm(prev => ({
                                  ...prev,
                                  intervalUnit: u,
                                  intervalValue: Math.min(prev.intervalValue, max),
                                  timesPerInterval: 1,
                                }))
                              }}
                              className="border border-yellow-300 rounded-lg px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            >
                              <option value="day">日</option>
                              <option value="week">週</option>
                              <option value="month">ヶ月</option>
                            </select>
                            <span className="text-xs text-gray-600">に</span>
                            <select
                              value={form.timesPerInterval}
                              onChange={e => setForm(prev => ({ ...prev, timesPerInterval: Number(e.target.value) }))}
                              className="border border-yellow-300 rounded-lg px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            >
                              {Array.from({ length: timesMax }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                            <span className="text-xs text-gray-600">回</span>
                          </div>
                        )
                      })()}
                    </div>

                    {/* 期日設定 */}
                    <div>
                      <p className="text-xs font-semibold text-yellow-700 mb-2">期日（任意）</p>
                      <div className="flex items-center gap-2">
                        <input type="date"
                          value={form.taskDeadline}
                          onChange={e => setForm(prev => ({ ...prev, taskDeadline: e.target.value }))}
                          className="flex-1 border border-yellow-300 rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                        {form.taskDeadline && (
                          <button type="button"
                            onClick={() => setForm(prev => ({ ...prev, taskDeadline: '' }))}
                            className="text-xs text-yellow-600 hover:text-red-500 whitespace-nowrap"
                          >クリア</button>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* ── Premium: 通知設定 ────────────────────────────────────── */}
              <div>
                <button type="button"
                  onClick={() => {
                    if (!isPremium) { setPremiumFeatureName('通知設定'); setPremiumModalOpen(true); return }
                    setForm(prev => ({ ...prev, showNotification: !prev.showNotification }))
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition ${
                    form.notificationOn
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {!isPremium && <Lock className="w-3 h-3" />}
                    <Bell className="w-3.5 h-3.5" />
                    通知設定
                    {!isPremium
                      ? <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Premium</span>
                      : form.notificationOn
                        ? <span className="text-blue-500">{form.notifEntries.length}件設定中</span>
                        : null
                    }
                  </span>
                  {isPremium && (form.showNotification
                    ? <ChevronUp className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {form.showNotification && isPremium && (
                  <div className="mt-2 border border-blue-100 rounded-xl bg-blue-50 p-3 space-y-3">

                    {/* ON/OFF トグル */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700">通知を有効にする</p>
                      <button type="button"
                        onClick={() => setForm(prev => ({
                          ...prev,
                          notificationOn: !prev.notificationOn,
                          notifEntries: !prev.notificationOn && prev.notifEntries.length === 0
                            ? [{ id: newNotifId(), type: 'weekly', day: 1, time: '08:00' }]
                            : prev.notifEntries,
                        }))}
                        className={`relative w-10 h-5 rounded-full transition-colors ${form.notificationOn ? 'bg-blue-500' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.notificationOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    {form.notificationOn && (
                      <>
                        {/* 通知エントリ一覧 */}
                        {form.notifEntries.map((entry) => (
                          <div key={entry.id} className="bg-white rounded-xl p-3 border border-blue-100 space-y-2">
                            {/* タイプ切替 */}
                            <div className="flex gap-2 items-center">
                              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                                <button type="button"
                                  onClick={() => updateNotifEntry(entry.id, { type: 'weekly', day: 1, time: '08:00' } as Partial<NotifEntry>)}
                                  className={`px-2.5 py-1.5 font-semibold transition ${entry.type === 'weekly' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'}`}
                                >毎週</button>
                                <button type="button"
                                  onClick={() => updateNotifEntry(entry.id, { type: 'once', datetime: '' } as Partial<NotifEntry>)}
                                  className={`px-2.5 py-1.5 font-semibold transition ${entry.type === 'once' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'}`}
                                >日時指定</button>
                              </div>
                              <div className="flex-1" />
                              <button type="button" onClick={() => removeNotifEntry(entry.id)}
                                className="p-1 text-gray-300 hover:text-red-400 transition">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {entry.type === 'weekly' ? (
                              /* 毎週: 曜日 + 時刻 */
                              <div className="space-y-1.5">
                                <div className="flex gap-1 flex-wrap">
                                  {DAY_LABELS.map((label, d) => (
                                    <button key={d} type="button"
                                      onClick={() => updateNotifEntry(entry.id, { day: d } as Partial<NotifEntry>)}
                                      className={`w-8 h-8 rounded-full text-xs font-bold border transition ${
                                        (entry as { day: number }).day === d
                                          ? 'bg-blue-500 text-white border-blue-500'
                                          : 'bg-white text-gray-600 border-gray-200'
                                      }`}
                                    >{label}</button>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">時刻</span>
                                  <input type="time"
                                    value={(entry as { time: string }).time}
                                    onChange={e => updateNotifEntry(entry.id, { time: e.target.value } as Partial<NotifEntry>)}
                                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  />
                                </div>
                              </div>
                            ) : (
                              /* 日時指定 */
                              <div>
                                <p className="text-xs text-gray-500 mb-1">年/月/日 時:分</p>
                                <input type="datetime-local"
                                  value={(entry as { datetime: string }).datetime}
                                  onChange={e => updateNotifEntry(entry.id, { datetime: e.target.value } as Partial<NotifEntry>)}
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                              </div>
                            )}
                          </div>
                        ))}

                        {/* 追加ボタン */}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => addNotifEntry('weekly')}
                            className="flex-1 py-2 rounded-xl border border-dashed border-blue-300 text-blue-500 text-xs font-semibold hover:bg-blue-100 transition">
                            ＋ 毎週
                          </button>
                          <button type="button" onClick={() => addNotifEntry('once')}
                            className="flex-1 py-2 rounded-xl border border-dashed border-blue-300 text-blue-500 text-xs font-semibold hover:bg-blue-100 transition">
                            ＋ 日時指定
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 送信ボタン */}
              <button onClick={submitTask} disabled={saving || !form.title.trim()}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : editId
                    ? <><Check className="w-4 h-4" />更新する</>
                    : <><Plus className="w-4 h-4" />追加する</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── マイルストーンカード ──────────────────────────────────────────── */}
        <div style={{
          borderRadius: 28,
          background: 'linear-gradient(145deg, #ef4444 0%, #dc2626 40%, #991b1b 100%)',
          boxShadow: '0 16px 48px rgba(185,28,28,0.25), 0 4px 16px rgba(0,0,0,0.10)',
          overflow: 'hidden', position: 'relative',
        }}>
          <div className="absolute rounded-full bg-white/8" style={{ width: 200, height: 200, top: -50, right: -50 }} />
          <div className="absolute rounded-full bg-white/5" style={{ width: 130, height: 130, bottom: -30, left: -30 }} />
          <div className="relative px-7 py-6">
            <p className="text-red-200 text-xs font-bold uppercase tracking-widest mb-2">マイルストーン</p>
            <h2 className="text-white font-bold leading-tight mb-4" style={{ fontSize: 'clamp(20px, 6vw, 28px)' }}>
              {milestone.title}
            </h2>
            <div className="mb-3">
              <p className="text-red-200 text-xs font-semibold mb-1.5">やる理由</p>
              <textarea
                value={reasonText} onChange={e => setReasonText(e.target.value)} onBlur={saveReason}
                placeholder="やる理由を入力して、目的意識を忘れずに！" rows={2}
                className="w-full bg-white/15 text-white placeholder-white/40 text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-white/40"
                style={{ fontSize: 13 }}
              />
              {savingReason && <p className="text-white/40 text-xs mt-1">保存中...</p>}
            </div>
            {milestone.deadline && (
              <p className="text-white/60 text-xs">期限: {new Date(milestone.deadline).toLocaleDateString('ja-JP')}</p>
            )}
          </div>
        </div>

        {/* ── タスク一覧（マイルストーンの下） ─────────────────────────────── */}
        {tasks.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-4 bg-red-200" />
            <div className="w-full">
              {tasks.map((task, index) => (
                <div key={task.id} className="flex flex-col items-center">
                  <TaskCard
                    task={task}
                    onDelete={handleDelete}
                    onEdit={startEdit}
                    isEditing={editId === task.id}
                  />
                  {index < tasks.length - 1 && <div className="w-0.5 h-3 bg-red-200" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && !formOpen && (
          <div className="text-center py-6">
            <p className="text-gray-400 text-sm">まだタスクがありません</p>
            <p className="text-gray-300 text-xs mt-1">上の「タスクを追加」から追加してください</p>
          </div>
        )}
      </div>

      <PremiumModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        featureName={premiumFeatureName}
      />
    </div>
  )
}
