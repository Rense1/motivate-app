'use client'

import { useState, useEffect } from 'react'
import { Goal, Milestone } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import MilestoneRoadmap from '@/components/milestone/MilestoneRoadmap'
import { ChevronLeft, Plus, Crown, Pencil, Check, X } from 'lucide-react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCrownCount } from '@/lib/useCrownCount'
import { useTutorial } from '@/hooks/useTutorial'
import { MilestoneTutorialBanner, TutorialBlockingOverlay } from '@/components/tutorial/TutorialOverlay'
import { useI18n } from '@/lib/i18n'

export default function MilestonesClient() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const goalId = searchParams.get('goalId') || ''
  const router = useRouter()
  const supabase = createClient()

  const [goal, setGoal] = useState<Goal | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)

  // goal title inline edit
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalTitleInput, setGoalTitleInput] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)

  // milestone title edit modal
  const [editMsOpen, setEditMsOpen] = useState(false)
  const [editMsId, setEditMsId] = useState('')
  const [editMsTitle, setEditMsTitle] = useState('')
  const [savingMs, setSavingMs] = useState(false)
  const [activeVisualIndex, setActiveVisualIndex] = useState(0)
  const crownCount = useCrownCount()

  const { isMsPending, advanceToTaskTutorial, skipTutorial } = useTutorial()
  const [tutorialVisible, setTutorialVisible] = useState(false)

  useEffect(() => {
    if (!goalId) { router.replace('/goals'); return }
    async function fetchData() {
      const { data: goal } = await supabase
        .from('goals').select('*').eq('id', goalId).single()
      if (!goal) { router.replace('/goals'); return }

      const { data: milestones } = await supabase
        .from('milestones').select('*').eq('goal_id', goalId).order('order_index')

      setGoal(goal)
      setMilestones(milestones || [])
      setLoading(false)

      // チュートリアル予約中なら表示
      if (isMsPending()) {
        setTimeout(() => setTutorialVisible(true), 700)
      }
    }
    fetchData()
  }, [goalId])

  function handleMilestoneUpdate(id: string, updates: Partial<Milestone>) {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  function openEditMilestone(id: string, title: string) {
    setEditMsId(id)
    setEditMsTitle(title)
    setEditMsOpen(true)
  }

  async function saveGoalTitle() {
    if (!goal || !goalTitleInput.trim()) return
    setSavingGoal(true)
    await supabase.from('goals').update({ title: goalTitleInput.trim() }).eq('id', goalId)
    setGoal({ ...goal, title: goalTitleInput.trim() })
    setEditingGoal(false)
    setSavingGoal(false)
  }

  async function saveMilestoneTitle() {
    if (!editMsTitle.trim()) return
    setSavingMs(true)
    await supabase.from('milestones').update({ title: editMsTitle.trim() }).eq('id', editMsId)
    handleMilestoneUpdate(editMsId, { title: editMsTitle.trim() })
    setEditMsOpen(false)
    setSavingMs(false)
  }

  function handleTutorialCardTap() {
    setTutorialVisible(false)
    advanceToTaskTutorial()
  }

  async function addMilestone() {
    if (!newTitle.trim()) return
    setAdding(true)

    const insertAt = milestones.length

    const { data, error } = await supabase
      .from('milestones')
      .insert({ goal_id: goalId, title: newTitle.trim(), order_index: insertAt })
      .select().single()

    if (!error && data) {
      setMilestones(prev => [...prev, data])
      setNewTitle('')
      setAddOpen(false)
    }
    setAdding(false)
  }

  if (loading || !goal) return null

  const achieved = milestones.filter(m => m.is_achieved).length
  const tutorialActive = isMsPending()

  return (
    <div className="page-enter flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white/90 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/goals" className="p-1.5 rounded-xl hover:bg-gray-100 flex-shrink-0">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
          {crownCount !== null && crownCount > 0 && (
            <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-1 flex-shrink-0">
              <Crown className="w-3 h-3 text-yellow-500" />
              <span className="text-xs font-black text-yellow-600">{crownCount}</span>
            </div>
          )}
          <div className="min-w-0">
            {editingGoal ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={goalTitleInput}
                  onChange={e => setGoalTitleInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveGoalTitle(); if (e.key === 'Escape') setEditingGoal(false) }}
                  className="text-sm font-bold text-gray-800 border-b border-red-400 outline-none bg-transparent w-36"
                />
                <button onClick={saveGoalTitle} disabled={savingGoal} className="p-0.5 text-red-600 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditingGoal(false)} className="p-0.5 text-gray-400 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setGoalTitleInput(goal.title); setEditingGoal(true) }}
                className="flex items-center gap-1 group text-left"
              >
                <h1 className="text-base font-bold text-gray-800 leading-tight truncate max-w-[160px]">{goal.title}</h1>
                <Pencil className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition flex-shrink-0" />
              </button>
            )}
            <p className="text-xs text-gray-500">{achieved}/{milestones.length} {t('goals.achieved')}</p>
          </div>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-red-600 text-white rounded-xl px-3 py-2 flex items-center gap-1 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          {t('milestone.add')}
        </button>
      </div>

      <MilestoneRoadmap
        milestones={milestones}
        goalId={goalId}
        goalTitle={goal.title}
        visionImageUrl={goal.vision_image_url}
        onMilestoneUpdate={handleMilestoneUpdate}
        onEditMilestone={openEditMilestone}
        onActiveIndexChange={setActiveVisualIndex}
        tutorialActive={tutorialActive}
        onTutorialCardTap={handleTutorialCardTap}
      />

      {/* チュートリアル: ブロッキングオーバーレイ + スキップ */}
      <TutorialBlockingOverlay
        visible={tutorialVisible}
        onSkip={() => { setTutorialVisible(false); skipTutorial() }}
        skipLabel={t('tutorial.skip')}
      />

      {/* チュートリアルバナー */}
      <MilestoneTutorialBanner
        visible={tutorialVisible}
        message={t('tutorial.tapForTasks')}
        hint={t('tutorial.tapHint')}
        tapAction={t('tutorial.tapAction')}
        onDismiss={() => setTutorialVisible(false)}
      />

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title={t('milestone.addTitle')}>
        <div className="space-y-4">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMilestone()}
            placeholder={t('milestone.addPlaceholder')}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={addMilestone}
            disabled={adding || !newTitle.trim()}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {adding ? t('milestone.adding') : t('milestone.addButton')}
          </button>
        </div>
      </Modal>

      <Modal isOpen={editMsOpen} onClose={() => setEditMsOpen(false)} title={t('milestone.editTitle')}>
        <div className="space-y-4">
          <input
            autoFocus
            value={editMsTitle}
            onChange={e => setEditMsTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveMilestoneTitle(); if (e.key === 'Escape') setEditMsOpen(false) }}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={saveMilestoneTitle}
            disabled={savingMs || !editMsTitle.trim()}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {savingMs ? t('milestone.editing') : t('milestone.editButton')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
