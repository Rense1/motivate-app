'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Goal, Milestone } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Trash2, ChevronRight, Crown } from 'lucide-react'
import { useCrownCount } from '@/lib/useCrownCount'
import { usePremium } from '@/lib/usePremium'
import PremiumModal from '@/components/ui/PremiumModal'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

type GoalWithMilestones = Goal & { milestones: Milestone[] }

function deadlineBadge(deadline: string | null, lang: Lang, t: (k: string) => string): { text: string; urgent: boolean } | null {
  if (!deadline) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dl = new Date(deadline)
  dl.setHours(0, 0, 0, 0)
  const diff = Math.round((dl.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return { text: t('goals.deadlineToday'), urgent: true }
  if (diff > 0) {
    return {
      text: lang === 'ja' ? `残り${diff}${t('goals.daysLeft')}` : `${diff}${t('goals.daysLeft')}`,
      urgent: diff <= 7,
    }
  }
  return {
    text: lang === 'ja' ? `${-diff}${t('goals.daysOver')}` : `${-diff}${t('goals.daysOver')}`,
    urgent: true,
  }
}

const FREE_GOAL_LIMIT = 2

export default function GoalsClient() {
  const { t, lang } = useI18n()
  const [goals, setGoals] = useState<GoalWithMilestones[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [premiumModalOpen, setPremiumModalOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const supabase = createClient()
  const crownCount = useCrownCount()
  const isPremium = usePremium()
  const router = useRouter()

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: goals } = await supabase
        .from('goals').select('*, milestones(*)').eq('user_id', user.id).order('created_at')
      setGoals(goals || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const updateActiveIndex = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const containerCenter = container.scrollTop + container.clientHeight / 2
    let closestIndex = 0
    let closestDistance = Infinity
    cardRefs.current.forEach((card, index) => {
      if (!card) return
      const cardCenter = card.offsetTop + card.offsetHeight / 2
      const dist = Math.abs(cardCenter - containerCenter)
      if (dist < closestDistance) { closestDistance = dist; closestIndex = index }
    })
    setActiveIndex(closestIndex)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('scroll', updateActiveIndex, { passive: true })
    updateActiveIndex()
    return () => container.removeEventListener('scroll', updateActiveIndex)
  }, [goals, updateActiveIndex])

  function handleAddGoal() {
    if (isPremium === false && goals.length >= FREE_GOAL_LIMIT) {
      setPremiumModalOpen(true)
      return
    }
    router.push('/goals/new')
  }

  async function deleteGoal(id: string) {
    if (!confirm(t('goals.deleteConfirm'))) return
    await supabase.from('goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  if (loading) return null

  return (
    <div className="page-enter flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          {crownCount !== null && crownCount > 0 && (
            <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-1">
              <Crown className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-xs font-black text-yellow-600">{crownCount}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{t('goals.title')}</h1>
        </div>
        <button
          onClick={handleAddGoal}
          className="bg-red-600 text-white rounded-2xl px-4 py-2 flex items-center gap-1.5 text-sm font-bold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('goals.add')}
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-20">
          <p className="text-gray-400 mb-6">{t('goals.empty')}</p>
          <button
            onClick={handleAddGoal}
            className="bg-red-600 text-white px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('goals.addFirst')}
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-scroll"
          style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}
        >
          <div style={{ height: 'calc(50vh - 200px)', flexShrink: 0 }} />

          {goals.map((goal, index) => {
            const total = goal.milestones?.length || 0
            const achieved = goal.milestones?.filter(m => m.is_achieved).length || 0
            const progress = total > 0 ? Math.round((achieved / total) * 100) : 0
            const isActive = index === activeIndex
            const dlBadge = deadlineBadge(goal.deadline ?? null, lang, t)

            return (
              <div
                key={goal.id}
                ref={el => { cardRefs.current[index] = el }}
                className="px-5 mb-5"
                style={{ scrollSnapAlign: 'center' }}
              >
                <div
                  style={{
                    transform: isActive ? 'scale(1.0)' : 'scale(0.88)',
                    opacity: isActive ? 1 : 0.55,
                    transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease, box-shadow 0.4s ease',
                    boxShadow: isActive
                      ? '0 32px 64px rgba(185,28,28,0.30), 0 12px 32px rgba(0,0,0,0.15)'
                      : '0 4px 16px rgba(0,0,0,0.06)',
                    borderRadius: '28px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Card body */}
                  <Link href={`/milestones?goalId=${goal.id}`} className="block">
                    <div
                      className="relative flex flex-col justify-between p-8"
                      style={{
                        minHeight: '340px',
                        background: 'linear-gradient(145deg, #ef4444 0%, #dc2626 40%, #991b1b 100%)',
                      }}
                    >
                      <div className="absolute rounded-full bg-white/8" style={{ width: 240, height: 240, top: -60, right: -60 }} />
                      <div className="absolute rounded-full bg-white/5" style={{ width: 160, height: 160, bottom: -40, left: -40 }} />

                      <div className="relative flex items-start justify-between">
                        <span className="text-red-200 text-xs font-bold uppercase tracking-widest">{t('goals.goal')}</span>
                        {dlBadge && (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            dlBadge.urgent
                              ? 'bg-white/25 text-white'
                              : 'bg-white/15 text-white/80'
                          }`}>
                            {dlBadge.text}
                          </span>
                        )}
                      </div>

                      <div className="relative flex-1 flex items-center py-4">
                        <h2 className="text-white font-bold leading-tight" style={{ fontSize: 'clamp(24px, 7vw, 36px)' }}>
                          {goal.title}
                        </h2>
                      </div>

                      <div className="relative">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white/70 text-xs font-medium">{t('goals.progress')}</span>
                          <span className="text-white text-sm font-bold">{achieved}/{total} {t('goals.achieved')}</span>
                        </div>
                        <div className="bg-white/20 rounded-full h-2">
                          <div className="bg-white h-2 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-white/50 text-xs mt-1.5 text-right">{progress}%</p>
                      </div>
                    </div>
                  </Link>

                  {/* Footer */}
                  <div className="bg-white px-6 py-3.5 flex items-center justify-between">
                    <Link
                      href={`/milestones?goalId=${goal.id}`}
                      className="flex items-center gap-1.5 text-sm font-bold text-red-600"
                    >
                      {t('goals.milestonesLink')}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          <div style={{ height: 'calc(50vh - 200px)', flexShrink: 0 }} />
        </div>
      )}

      {goals.length > 1 && (
        <div className="flex justify-center gap-2 pb-24 pt-2 flex-shrink-0">
          {goals.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{ width: i === activeIndex ? 22 : 6, height: 6, background: i === activeIndex ? '#dc2626' : '#d1d5db' }}
            />
          ))}
        </div>
      )}

      <PremiumModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        featureName={t('goals.moreGoals')}
      />
    </div>
  )
}
