'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Goal, Milestone } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Trash2, ChevronRight, Crown, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

type GoalWithMilestones = Goal & { milestones: Milestone[] }

export default function GoalsClient() {
  const [goals, setGoals] = useState<GoalWithMilestones[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [premiumModalOpen, setPremiumModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: goals }, { data: profile }] = await Promise.all([
        supabase.from('goals').select('*, milestones(*)').eq('user_id', user.id).order('created_at'),
        supabase.from('profiles').select('is_premium').eq('id', user.id).single(),
      ])
      setGoals(goals || [])
      setIsPremium(profile?.is_premium ?? false)
      setLoading(false)
    }
    fetchData()
  }, [])

  // Find which card is closest to the center of the scroll container
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
      if (dist < closestDistance) {
        closestDistance = dist
        closestIndex = index
      }
    })
    setActiveIndex(closestIndex)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('scroll', updateActiveIndex, { passive: true })
    // Init on mount
    updateActiveIndex()
    return () => container.removeEventListener('scroll', updateActiveIndex)
  }, [goals, updateActiveIndex])

  async function deleteGoal(id: string) {
    if (!confirm('この目標を削除しますか？')) return
    await supabase.from('goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const canAddGoal = isPremium || goals.length === 0

  if (loading) return null

  return (
    <div className="page-enter flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-800">目標一覧</h1>
        {canAddGoal ? (
          <Link
            href="/goals/new"
            className="bg-red-600 text-white rounded-xl px-4 py-2 flex items-center gap-1 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            追加
          </Link>
        ) : (
          <button
            onClick={() => setPremiumModalOpen(true)}
            className="bg-yellow-400 text-white rounded-xl px-4 py-2 flex items-center gap-1 text-sm font-semibold"
          >
            <Crown className="w-4 h-4" />
            追加
          </button>
        )}
      </div>

      {goals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-20">
          <p className="text-gray-400 mb-6">まだ目標がありません</p>
          <Link
            href="/goals/new"
            className="bg-red-600 text-white px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            最初の目標を作る
          </Link>
        </div>
      ) : (
        /* Scroll container — center-emphasis carousel */
        <div
          ref={containerRef}
          className="flex-1 overflow-y-scroll pb-24"
          style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}
        >
          {/* Top spacer so first card can reach center */}
          <div style={{ height: 'calc(50vh - 160px)', flexShrink: 0 }} />

          {goals.map((goal, index) => {
            const total = goal.milestones?.length || 0
            const achieved = goal.milestones?.filter(m => m.is_achieved).length || 0
            const progress = total > 0 ? Math.round((achieved / total) * 100) : 0
            const isActive = index === activeIndex

            return (
              <div
                key={goal.id}
                ref={el => { cardRefs.current[index] = el }}
                className="px-4 mb-4"
                style={{ scrollSnapAlign: 'center' }}
              >
                <div
                  style={{
                    transform: isActive ? 'scale(1.03)' : 'scale(0.93)',
                    opacity: isActive ? 1 : 0.6,
                    transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease, box-shadow 0.35s ease',
                    boxShadow: isActive
                      ? '0 24px 60px rgba(185,28,28,0.25), 0 8px 24px rgba(0,0,0,0.12)'
                      : '0 4px 16px rgba(0,0,0,0.08)',
                  }}
                  className="rounded-3xl overflow-hidden"
                >
                  <Link href={`/milestones/${goal.id}`} className="block">
                    {/* Card body */}
                    <div className="bg-gradient-to-br from-red-500 via-red-600 to-red-800 p-7 min-h-[220px] flex flex-col justify-between relative">
                      {/* Background decorative circles */}
                      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-12 translate-x-12" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-10 -translate-x-8" />

                      <div className="relative">
                        <p className="text-red-200 text-xs font-semibold uppercase tracking-widest mb-2">目標</p>
                        <h2 className="text-white text-2xl font-bold leading-snug">{goal.title}</h2>
                      </div>

                      <div className="relative">
                        <div className="flex justify-between text-white/80 text-xs mb-2">
                          <span>マイルストーン進捗</span>
                          <span className="font-semibold">{achieved}/{total} 達成</span>
                        </div>
                        <div className="bg-white/20 rounded-full h-2.5">
                          <div
                            className="bg-white h-2.5 rounded-full transition-all duration-700"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-white/60 text-xs mt-2 text-right">{progress}%</p>
                      </div>
                    </div>
                  </Link>

                  {/* Card footer */}
                  <div className="bg-white px-5 py-3 flex items-center justify-between">
                    <Link
                      href={`/milestones/${goal.id}`}
                      className="flex items-center gap-1 text-sm font-semibold text-red-600"
                    >
                      マイルストーンを見る
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

          {/* Bottom spacer so last card can reach center */}
          <div style={{ height: 'calc(50vh - 160px)', flexShrink: 0 }} />
        </div>
      )}

      {/* Dot indicators */}
      {goals.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-24 pt-2 flex-shrink-0 absolute bottom-0 left-0 right-0 pointer-events-none">
          {goals.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeIndex ? 20 : 6,
                height: 6,
                background: i === activeIndex ? '#dc2626' : '#d1d5db',
              }}
            />
          ))}
        </div>
      )}

      {/* Premium upsell modal */}
      {premiumModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8"
          onClick={() => setPremiumModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-yellow-400 rounded-full p-1.5">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-bold text-gray-800">プレミアムプラン</h2>
              </div>
              <button onClick={() => setPremiumModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              フリープランでは<span className="font-semibold text-gray-800">目標は1件まで</span>です。プレミアムプランにアップグレードすると、複数の目標を同時に管理でき、スマホのホーム画面に目標を表示するウィジェット機能も使えます。
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center mb-4">
              <p className="text-yellow-700 font-bold text-sm">🚀 近日公開予定</p>
              <p className="text-yellow-600 text-xs mt-1">サブスクリプション機能を準備中です</p>
            </div>
            <button
              onClick={() => setPremiumModalOpen(false)}
              className="w-full bg-gray-100 text-gray-600 py-3 rounded-2xl font-semibold text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
