'use client'

import { useState, useEffect } from 'react'
import { Milestone, Task, TaskFrequency, IntervalUnit, isPremiumFrequency } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import TaskCard from '@/components/task/TaskCard'
import PremiumModal from '@/components/ui/PremiumModal'
import {
  ChevronLeft, Plus, Calendar, Lock, ChevronDown, ChevronUp,
  Bell, X, Check, Trash2, Pencil,
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
import { useTutorial } from '@/hooks/useTutorial'
import { TutorialTooltip, TutorialBlockingOverlay } from '@/components/tutorial/TutorialOverlay'
import { useI18n } from '@/lib/i18n'

// DAY_LABELS is computed from i18n dict inside the component

// datetime-local 文字列 (YYYY-MM-DDTHH:mm) に変換
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── フォーム型 ────────────────────────────────────────────────────────────
interface FormState {
  title: string
  frequency: TaskFrequency          // 基本頻度（毎日/毎週/1回）
  // ── Premium: 詳細な頻度・日付設定 ────────────────────────────────────
  showPremiumDetail: boolean
  intervalValue: number             // N（例: 3日に1回 → 3）
  intervalUnit: IntervalUnit        // 日/週/月
  timesPerInterval: number          // M（例: 1週に2回 → 2）
  taskStartAt: string               // YYYY-MM-DDTHH:mm（必須）
  taskEndAt: string                 // YYYY-MM-DDTHH:mm（必須）
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
    taskStartAt: '',
    taskEndAt: '',
    showNotification: false,
    notificationOn: false,
    notifEntries: [],
  }
}

function newNotifId() {
  return Math.random().toString(36).slice(2, 9)
}

export default function TasksClient() {
  const { t, dict, lang } = useI18n()
  const DAY_LABELS = dict.tasks.dayLabels
  const searchParams = useSearchParams()
  const goalId      = searchParams.get('goalId')
  const milestoneId = searchParams.get('milestoneId')
  const router      = useRouter()
  const supabase    = createClient()
  const isPremium   = usePremium()

  const { isTaskPending, completeTutorial, skipTutorial } = useTutorial()

  // チュートリアルステップ
  type TutStep = 'add_btn' | 'input' | 'frequency' | null
  const [tutStep, setTutStep] = useState<TutStep>(null)

  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [tasks, setTasks]         = useState<Task[]>([])
  const [loading, setLoading]     = useState(true)

  const [formOpen, setFormOpen]   = useState(false)
  const [form, setForm]           = useState<FormState>(emptyForm())
  const [editId, setEditId]       = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)

  const [deadline, setDeadline]             = useState('')
  const [savingDeadline, setSavingDeadline] = useState(false)
  const [deadlineEditing, setDeadlineEditing] = useState(false)

  const [editingMsTitle, setEditingMsTitle] = useState(false)
  const [msTitleInput, setMsTitleInput]     = useState('')
  const [savingMsTitle, setSavingMsTitle]   = useState(false)

  const [premiumModalOpen, setPremiumModalOpen]     = useState(false)
  const [premiumFeatureName, setPremiumFeatureName] = useState('')

  // i18n で頻度ラベルを組む
  const BASIC_FREQUENCIES = [
    { value: 'daily'  as TaskFrequency, label: t('tasks.daily')  },
    { value: 'weekly' as TaskFrequency, label: t('tasks.weekly') },
    { value: 'none'   as TaskFrequency, label: t('tasks.once')   },
  ]

  // ── useEffect（hooks は early return より前に置く） ─────────────────────
  useEffect(() => {
    if (!milestoneId || !goalId) return
    createNotificationChannel()

    async function fetchData() {
      const { data: ms } = await supabase
        .from('milestones').select('*').eq('id', milestoneId).single()

      if (!ms) { router.replace(`/milestones?goalId=${goalId}`); return }

      const { data: taskRows } = await supabase
        .from('tasks').select('*').eq('milestone_id', milestoneId).order('order_index')

      setMilestone(ms)
      setDeadline(ms.deadline || '')
      setTasks(taskRows || [])
      syncWidgetTasks((taskRows ?? []).map(t => t.title))
      syncWidgetPremium(isPremium ?? false)
      setLoading(false)

      // チュートリアル: タスク追加ボタンをハイライト
      if (isTaskPending()) setTutStep('add_btn')
    }
    fetchData()
  }, [milestoneId, goalId])

  if (!goalId || !milestoneId) return null

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
    const showDetail = isPremiumFreq || !!task.task_start_at

    setEditId(task.id)
    setForm({
      title: task.title,
      frequency: isPremiumFreq ? 'daily' : (task.frequency ?? 'daily'),
      showPremiumDetail: showDetail,
      intervalValue,
      intervalUnit,
      timesPerInterval,
      taskStartAt: task.task_start_at ? toDatetimeLocal(task.task_start_at) : '',
      taskEndAt:   task.task_end_at   ? toDatetimeLocal(task.task_end_at)   : '',
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
      task_start_at:  form.showPremiumDetail && form.taskStartAt ? new Date(form.taskStartAt).toISOString() : null,
      task_end_at:    form.showPremiumDetail && form.taskEndAt   ? new Date(form.taskEndAt).toISOString()   : null,
    }
    const fullPayload = { ...basePayload, ...premiumPayload }

    // スキーマキャッシュエラー判定
    const isPremiumColErr = (msg: string) =>
      msg.includes('task_start_at') || msg.includes('task_end_at')  ||
      msg.includes('interval_value') || msg.includes('interval_unit') ||
      msg.includes('monthly_count') || msg.includes('period_done_count') ||
      msg.includes('period_start')
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

    // 新規追加完了でチュートリアル終了
    if (!editId) {
      completeTutorial()
      setTutStep(null)
    }
  }

  // ── 削除 ──────────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    cancelTaskNotifications(id)
    const next = tasks.filter(t => t.id !== id)
    setTasks(next)
    syncWidgetTasks(next.map(t => t.title))
    if (editId === id) cancelEdit()
  }

  // ── マイルストーンタイトル保存 ────────────────────────────────────────────
  async function saveMilestoneTitle() {
    if (!milestone || !msTitleInput.trim()) return
    setSavingMsTitle(true)
    await supabase.from('milestones').update({ title: msTitleInput.trim() }).eq('id', milestoneId)
    setMilestone({ ...milestone, title: msTitleInput.trim() })
    setEditingMsTitle(false)
    setSavingMsTitle(false)
  }

  // ── 期限保存 ──────────────────────────────────────────────────────────────
  async function saveDeadline(value?: string) {
    const dl = value !== undefined ? value : deadline
    setSavingDeadline(true)
    await supabase.from('milestones').update({ deadline: dl || null }).eq('id', milestoneId)
    if (value !== undefined) setDeadline(value)
    setSavingDeadline(false)
    setDeadlineEditing(false)
    if (milestone) setMilestone({ ...milestone, deadline: dl || null })
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

      {/* ── チュートリアル: ブロッキングオーバーレイ + スキップ ─────────────── */}
      <TutorialBlockingOverlay
        visible={tutStep !== null}
        onSkip={() => { setTutStep(null); skipTutorial() }}
        skipLabel={t('tutorial.skip')}
      />

      {/* ── ヘッダー ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur px-4 py-3 flex items-center border-b border-gray-100">
        <Link href={`/milestones?goalId=${goalId}`} className="p-1.5 rounded-xl hover:bg-gray-100 mr-2">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <p className="text-sm font-semibold text-gray-500">{t('tasks.management')}</p>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-4">

        {/* ── タスク追加ボタン（収納時）─────────────────────────────────────── */}
        {!formOpen && (
          <div
            className="relative"
            style={tutStep === 'add_btn' ? { position: 'relative', zIndex: 55 } : undefined}
          >
            <TutorialTooltip
              visible={tutStep === 'add_btn'}
              message={`1/3  ${t('tutorial.addTask')}`}
              arrowDir="down"
              className="absolute -top-12 left-1/2 -translate-x-1/2"
            />
            <button
              onClick={() => {
                setEditId(null); setForm(emptyForm()); setFormOpen(true)
                if (tutStep === 'add_btn') setTutStep('input')
              }}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors ${
                tutStep === 'add_btn' ? 'border-red-500 bg-red-50 animate-pulse' : 'border-red-300'
              }`}
            >
              <Plus className="w-4 h-4" />{t('tasks.addButton')}
            </button>
          </div>
        )}

        {/* ── タスク追加 / 編集フォーム（展開時）─────────────────────────────── */}
        {formOpen && (
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            style={(tutStep === 'input' || tutStep === 'frequency') ? { position: 'relative', zIndex: 55 } : undefined}
          >

            {/* フォームヘッダー */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">
                {editId ? t('tasks.editForm') : t('tasks.addForm')}
              </p>
              <button onClick={cancelEdit} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">

              {/* タイトル入力 */}
              <div className="relative">
                <TutorialTooltip
                  visible={tutStep === 'input'}
                  message={`2/3  ${t('tutorial.writeTask')}`}
                  arrowDir="down"
                  className="absolute -top-12 left-1/2 -translate-x-1/2"
                />
                <input
                  autoFocus
                  value={form.title}
                  onChange={e => {
                    setForm(prev => ({ ...prev, title: e.target.value }))
                    if (tutStep === 'input' && e.target.value.trim()) setTutStep('frequency')
                  }}
                  onKeyDown={e => e.key === 'Enter' && submitTask()}
                  placeholder={t('tasks.titlePlaceholder')}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50"
                />
              </div>

              {/* ── 基本頻度 ───────────────────────────────────────────────── */}
              <div className="relative">
                <TutorialTooltip
                  visible={tutStep === 'frequency'}
                  message={`3/3  ${t('tutorial.setFrequency')}`}
                  arrowDir="down"
                  className="absolute -top-12 left-1/2 -translate-x-1/2"
                />
                <p className="text-xs text-gray-500 mb-1.5 font-medium">{t('tasks.frequency')}</p>
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

              {/* ── Premium: 詳細な頻度・日付設定 ──────────────────────────── */}
              <div>
                <button type="button"
                  onClick={() => {
                    if (!isPremium) { setPremiumFeatureName(t('tasks.detailFreq')); setPremiumModalOpen(true); return }
                    setForm(prev => ({ ...prev, showPremiumDetail: !prev.showPremiumDetail }))
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition ${
                    form.showPremiumDetail
                      ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {!isPremium && <Lock className="w-3 h-3" />}
                    {t('tasks.detailFreq')}
                    {!isPremium
                      ? <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">{t('tasks.premium')}</span>
                      : form.showPremiumDetail && form.taskStartAt
                        ? <span className="text-yellow-600">
                            — {form.intervalValue}{form.intervalUnit === 'day' ? t('tasks.day') : form.intervalUnit === 'week' ? t('tasks.week') : t('tasks.month')}{t('tasks.per')}{form.timesPerInterval}{t('tasks.times')}
                          </span>
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
                      <p className="text-xs font-semibold text-yellow-700 mb-2">{t('tasks.freqSettings')}</p>
                      {(() => {
                        const ivMax = form.intervalUnit === 'day' ? 30 : form.intervalUnit === 'week' ? 8 : 12
                        const timesMax = form.intervalUnit === 'day' ? form.intervalValue : form.intervalUnit === 'week' ? 7 : 31
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-gray-600">{t('tasks.every')}</span>
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
                              <option value="day">{t('tasks.day')}</option>
                              <option value="week">{t('tasks.week')}</option>
                              <option value="month">{t('tasks.month')}</option>
                            </select>
                            <span className="text-xs text-gray-600">{t('tasks.per')}</span>
                            <select
                              value={form.timesPerInterval}
                              onChange={e => setForm(prev => ({ ...prev, timesPerInterval: Number(e.target.value) }))}
                              className="border border-yellow-300 rounded-lg px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            >
                              {Array.from({ length: timesMax }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                            <span className="text-xs text-gray-600">{t('tasks.times')}</span>
                          </div>
                        )
                      })()}
                    </div>

                    {/* 開始日（必須） */}
                    <div>
                      <p className="text-xs font-semibold text-yellow-700 mb-1.5">
                        {t('tasks.startDate')} <span className="text-red-500">*</span>
                      </p>
                      <input type="datetime-local"
                        lang={lang}
                        value={form.taskStartAt}
                        onChange={e => setForm(prev => ({ ...prev, taskStartAt: e.target.value }))}
                        className={`w-full border rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                          !form.taskStartAt ? 'border-red-300' : 'border-yellow-300'
                        }`}
                      />
                    </div>

                    {/* 終了日（必須） */}
                    <div>
                      <p className="text-xs font-semibold text-yellow-700 mb-1.5">
                        {t('tasks.endDate')} <span className="text-red-500">*</span>
                      </p>
                      <input type="datetime-local"
                        lang={lang}
                        value={form.taskEndAt}
                        min={form.taskStartAt}
                        onChange={e => setForm(prev => ({ ...prev, taskEndAt: e.target.value }))}
                        className={`w-full border rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                          !form.taskEndAt ? 'border-red-300' : 'border-yellow-300'
                        }`}
                      />
                      {form.showPremiumDetail && (!form.taskStartAt || !form.taskEndAt) && (
                        <p className="text-[10px] text-red-500 mt-1">{t('tasks.requiredDates')}</p>
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* ── Premium: 通知設定 ────────────────────────────────────── */}
              <div>
                <button type="button"
                  onClick={() => {
                    if (!isPremium) { setPremiumFeatureName(t('tasks.notification')); setPremiumModalOpen(true); return }
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
                    {t('tasks.notification')}
                    {!isPremium
                      ? <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">{t('tasks.premium')}</span>
                      : form.notificationOn
                        ? <span className="text-blue-500">{form.notifEntries.length}{t('tasks.notifCount')}</span>
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
                      <p className="text-xs font-semibold text-gray-700">{t('tasks.notifEnable')}</p>
                      <button type="button"
                        onClick={() => setForm(prev => ({
                          ...prev,
                          notificationOn: !prev.notificationOn,
                          notifEntries: !prev.notificationOn && prev.notifEntries.length === 0
                            ? [{ id: newNotifId(), type: 'weekly', day: 1, time: '08:00' }]
                            : prev.notifEntries,
                        }))}
                        className={`relative w-11 h-6 rounded-full transition-colors overflow-hidden ${form.notificationOn ? 'bg-blue-500' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.notificationOn ? 'translate-x-5' : 'translate-x-0'}`} />
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
                                >{t('tasks.everyWeek')}</button>
                                <button type="button"
                                  onClick={() => updateNotifEntry(entry.id, { type: 'once', datetime: '' } as Partial<NotifEntry>)}
                                  className={`px-2.5 py-1.5 font-semibold transition ${entry.type === 'once' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'}`}
                                >{t('tasks.datetime')}</button>
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
                                  <span className="text-xs text-gray-500">{t('tasks.time')}</span>
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
                                <p className="text-xs text-gray-500 mb-1">{t('tasks.datetimeLabel')}</p>
                                <input type="datetime-local"
                                  lang={lang}
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
                            {t('tasks.addWeekly')}
                          </button>
                          <button type="button" onClick={() => addNotifEntry('once')}
                            className="flex-1 py-2 rounded-xl border border-dashed border-blue-300 text-blue-500 text-xs font-semibold hover:bg-blue-100 transition">
                            {t('tasks.addDatetime')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 送信ボタン */}
              <button onClick={submitTask} disabled={saving || !form.title.trim() || (form.showPremiumDetail && (!form.taskStartAt || !form.taskEndAt))}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : editId
                    ? <><Check className="w-4 h-4" />{t('tasks.update')}</>
                    : <><Plus className="w-4 h-4" />{t('tasks.submit')}</>
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
            <p className="text-red-200 text-xs font-bold uppercase tracking-widest mb-2">{t('tasks.msLabel')}</p>
            {editingMsTitle ? (
              <div className="flex items-center gap-2 mb-4">
                <input
                  autoFocus
                  value={msTitleInput}
                  onChange={e => setMsTitleInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveMilestoneTitle(); if (e.key === 'Escape') setEditingMsTitle(false) }}
                  className="flex-1 bg-white/20 border border-white/40 rounded-xl px-3 py-2 text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-white/50 placeholder-white/50"
                />
                <button onClick={saveMilestoneTitle} disabled={savingMsTitle} className="p-1.5 bg-white/20 rounded-lg text-white hover:bg-white/30 transition flex-shrink-0">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingMsTitle(false)} className="p-1.5 bg-white/20 rounded-lg text-white/70 hover:bg-white/30 transition flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setMsTitleInput(milestone.title); setEditingMsTitle(true) }}
                className="flex items-start gap-2 group mb-4 text-left"
              >
                <h2 className="text-white font-bold leading-tight" style={{ fontSize: 'clamp(20px, 6vw, 28px)' }}>
                  {milestone.title}
                </h2>
                <Pencil className="w-4 h-4 text-white/30 group-hover:text-white/60 transition mt-1 flex-shrink-0" />
              </button>
            )}

            {/* ── インライン期限設定 ─────────────────────────────────────── */}
            <div className="border-t border-white/20 pt-3">
              {!deadlineEditing ? (
                <button
                  onClick={() => setDeadlineEditing(true)}
                  className="flex items-center gap-2 text-white/70 hover:text-white transition text-xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {milestone.deadline
                    ? `${t('tasks.deadlineLabel')} ${new Date(milestone.deadline).toLocaleDateString()}`
                    : t('tasks.deadlineTitle')}
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-white/70 text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />{t('tasks.deadlineTitle')}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      className="flex-1 bg-white/20 border border-white/30 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50 [color-scheme:dark]"
                    />
                    <button
                      onClick={() => saveDeadline('')}
                      className="px-3 py-2 bg-white/20 text-white text-xs rounded-xl whitespace-nowrap hover:bg-white/30 transition"
                    >
                      {t('tasks.deleteDeadline')}
                    </button>
                    <button
                      onClick={() => saveDeadline()}
                      disabled={savingDeadline}
                      className="px-3 py-2 bg-white text-red-600 text-xs font-semibold rounded-xl disabled:opacity-50 whitespace-nowrap"
                    >
                      {savingDeadline ? t('tasks.savingDeadline') : t('tasks.saveDeadline')}
                    </button>
                  </div>
                </div>
              )}
            </div>
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
            <p className="text-gray-400 text-sm">{t('tasks.empty')}</p>
            <p className="text-gray-300 text-xs mt-1">{t('tasks.emptyHint')}</p>
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
