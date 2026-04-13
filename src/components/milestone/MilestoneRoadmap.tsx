'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Milestone } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Lock, Crown, CheckCircle2, Key } from 'lucide-react'
import { deadlineBadge } from '@/lib/taskUtils'
import { getMilestoneRank, isMilestoneLocked, RANK_META, RANK_BG } from '@/lib/progressUtils'
import { useRouter } from 'next/navigation'

interface MilestoneRoadmapProps {
  milestones: Milestone[]
  goalId: string
  goalTitle: string
  visionImageUrl?: string | null
  onMilestoneUpdate: (id: string, updates: Partial<Milestone>) => void
  onActiveIndexChange?: (visualIndex: number) => void
}

function RoadDots({ green }: { green: boolean }) {
  return (
    <div className="flex flex-col items-center" style={{ gap: 5, padding: '4px 0' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: green ? '#22c55e' : '#ef4444', opacity: green ? 0.9 : 0.5 }} />
      ))}
    </div>
  )
}

export default function MilestoneRoadmap({
  milestones, goalId, goalTitle, visionImageUrl, onMilestoneUpdate, onActiveIndexChange,
}: MilestoneRoadmapProps) {
  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState(0)
  const [unlockingId, setUnlockingId] = useState<string | null>(null)
  const [firstReasonMap, setFirstReasonMap] = useState<Record<string, string>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const supabase = createClient()

  const total = milestones.length

  // Key gauge: all milestones are keys (gold card = goal, not a milestone)
  const keys = milestones.filter(m => m.is_achieved).length
  const maxKeys = total
  const hasCrown = maxKeys > 0 && keys >= maxKeys

  /*
   * Visual order (top → bottom on screen):
   *   vi=0            : goal card (gold, synthetic — not a milestone)
   *   vi=1            : milestones[total-1]  (silver — closest to goal)
   *   vi=2            : milestones[total-2]
   *   ...
   *   vi=total        : milestones[0]        (first milestone, farthest from goal)
   *
   * Milestone rank uses getMilestoneRank(originalIndex, total + 1)
   * so that none of them ever reach rank 5 (gold is reserved for the goal card).
   */
  const totalVisual = total + 1  // goal card + milestones

  // ── Fetch first reasons ───────────────────────────────────────────────
  useEffect(() => {
    if (total === 0) return
    const ids = milestones.map(m => m.id)
    supabase
      .from('milestone_reasons')
      .select('milestone_id, reason, order_index')
      .in('milestone_id', ids)
      .order('order_index')
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, string> = {}
        for (const row of data) {
          if (!(row.milestone_id in map)) map[row.milestone_id] = row.reason
        }
        setFirstReasonMap(map)
      })
  }, [milestones.map(m => m.id).join(',')])

  // ── Scroll to current milestone on mount ─────────────────────────────
  useEffect(() => {
    const firstNonAchievedOrig = milestones.findIndex(m => !m.is_achieved)
    // visual index: goal=0, milestones[total-1]=1, milestones[0]=total
    const targetVI = firstNonAchievedOrig === -1
      ? 0  // all achieved → show goal card
      : total - firstNonAchievedOrig  // milestones[i] → vi = total - i

    setActiveIndex(targetVI)
    onActiveIndexChange?.(targetVI)

    setTimeout(() => {
      const card = cardRefs.current[targetVI]
      const c = containerRef.current
      if (card && c) {
        c.scrollTop = card.offsetTop + card.offsetHeight / 2 - c.clientHeight / 2
      }
    }, 60)
  }, [])

  // ── Track centred card ────────────────────────────────────────────────
  const updateActiveIndex = useCallback(() => {
    const c = containerRef.current
    if (!c) return
    const center = c.scrollTop + c.clientHeight / 2
    let closest = 0, minDist = Infinity
    cardRefs.current.forEach((card, i) => {
      if (!card) return
      const dist = Math.abs(card.offsetTop + card.offsetHeight / 2 - center)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    setActiveIndex(prev => {
      if (prev !== closest) setTimeout(() => onActiveIndexChange?.(closest), 0)
      return closest
    })
  }, [onActiveIndexChange])

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    c.addEventListener('scroll', updateActiveIndex, { passive: true })
    return () => c.removeEventListener('scroll', updateActiveIndex)
  }, [milestones, updateActiveIndex])

  function handleCardTap(milestone: Milestone, locked: boolean) {
    if (locked) return
    router.push(`/tasks?goalId=${goalId}&milestoneId=${milestone.id}`)
  }

  async function toggleAchieved(milestone: Milestone, originalIndex: number) {
    const newVal = !milestone.is_achieved
    await supabase.from('milestones')
      .update({ is_achieved: newVal, achieved_at: newVal ? new Date().toISOString() : null })
      .eq('id', milestone.id)
    onMilestoneUpdate(milestone.id, { is_achieved: newVal, achieved_at: newVal ? new Date().toISOString() : null })
    if (newVal && originalIndex + 1 < total) {
      setUnlockingId(milestones[originalIndex + 1].id)
      setTimeout(() => setUnlockingId(null), 900)
    }
  }

  if (total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center pb-20">
        <p className="text-gray-400 text-sm">マイルストーンを追加してください</p>
      </div>
    )
  }

  const goldMeta = RANK_META[5]

  return (
    <>
      <style>{`
        @keyframes lockBreak {
          0%   { transform: scale(1)   rotate(0deg);   opacity: 1; }
          25%  { transform: scale(1.5) rotate(-25deg); opacity: 0.9; }
          60%  { transform: scale(0.5) rotate(35deg);  opacity: 0.3; }
          100% { transform: scale(0)   rotate(55deg);  opacity: 0; }
        }
        @keyframes overlayVanish {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── Key gauge ──────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 py-2.5 bg-white border-b border-gray-100 flex items-center justify-between">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: '#fefce8', border: '1.5px solid #fde047' }}
          >
            <Key className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-black text-yellow-700">{keys}/{maxKeys}</span>
          </div>
          <div className="flex items-center gap-1.5 transition-all duration-500" style={{ opacity: hasCrown ? 1 : 0.25 }}>
            <Crown className="w-5 h-5" style={{ color: hasCrown ? '#eab308' : '#9ca3af' }} />
            {hasCrown && <span className="text-xs font-bold text-yellow-600">王冠獲得！</span>}
          </div>
        </div>

        {/* ── Scroll area ──────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-scroll"
          style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}
        >
          <div style={{ height: 'calc(50vh - 230px)', flexShrink: 0 }} />

          {/* ── vi=0: Gold card (goal, not a milestone) ── */}
          <div>
            <div
              ref={el => { cardRefs.current[0] = el }}
              className="px-5"
              style={{ scrollSnapAlign: 'center' }}
            >
              <div
                style={{
                  transform: activeIndex === 0 ? 'scale(1.0)' : 'scale(0.84)',
                  opacity: activeIndex === 0 ? 1 : 0.45,
                  transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease, box-shadow 0.4s ease',
                  boxShadow: activeIndex === 0
                    ? `0 32px 64px ${goldMeta.glow}, 0 12px 32px rgba(0,0,0,0.14)`
                    : '0 4px 16px rgba(0,0,0,0.06)',
                  borderRadius: 28,
                  border: goldMeta.border,
                  overflow: 'hidden',
                }}
              >
                <div
                  className="relative flex flex-col justify-between p-8 select-none"
                  style={{ minHeight: 280 }}
                >
                  <div className="absolute inset-0" style={{ background: RANK_BG[5] }} />
                  {visionImageUrl && (
                    <>
                      <img src={visionImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50" />
                    </>
                  )}
                  <div className="absolute rounded-full bg-white/5" style={{ width: 200, height: 200, top: -50, right: -50 }} />
                  <div className="absolute rounded-full bg-white/5" style={{ width: 130, height: 130, bottom: -30, left: -30 }} />

                  <div className="relative flex items-start justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.65)' }}>
                      最終目標
                    </span>
                    <Crown className="w-6 h-6 text-yellow-400" />
                  </div>

                  <div className="relative flex-1 flex flex-col justify-center py-4">
                    <h2 className="font-bold leading-tight text-white" style={{ fontSize: 'clamp(22px, 6.5vw, 34px)' }}>
                      {goalTitle}
                    </h2>
                  </div>

                  <div className="relative">
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      すべてのマイルストーンを達成してここに到達しよう
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dots between goal card and first milestone card (milestones[total-1]) */}
            <div className="flex justify-center py-1">
              <RoadDots green={milestones[total - 1]?.is_achieved ?? false} />
            </div>
          </div>

          {/* ── vi=1..total: Milestone cards (reversed: last milestone first) ── */}
          {[...milestones].reverse().map((milestone, revIdx) => {
            const originalIndex = total - 1 - revIdx
            const visualIndex = revIdx + 1  // vi=1 is milestones[total-1], vi=total is milestones[0]

            // Rank: pass total+1 so milestones never reach rank 5 (gold)
            const rank = getMilestoneRank(originalIndex, total + 1)
            const locked = isMilestoneLocked(originalIndex, milestones)
            const isActive = visualIndex === activeIndex
            const isUnlocking = unlockingId === milestone.id
            const meta = RANK_META[rank]
            const bgColor = milestone.is_achieved ? '#15803d' : locked ? '#1f2937' : RANK_BG[rank]
            const reason = firstReasonMap[milestone.id]

            // Dots between this card and the next (lower) visual card
            const hasNextCard = visualIndex < total  // milestones[0] is the last, no dots below it
            const nextMilestone = hasNextCard ? milestones[originalIndex - 1] : null
            const lineGreen = nextMilestone ? milestone.is_achieved && nextMilestone.is_achieved : false

            return (
              <div key={milestone.id}>
                <div
                  ref={el => { cardRefs.current[visualIndex] = el }}
                  className="px-5"
                  style={{ scrollSnapAlign: 'center' }}
                >
                  <div
                    style={{
                      transform: isActive ? 'scale(1.0)' : 'scale(0.84)',
                      opacity: isActive ? 1 : 0.45,
                      transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease, box-shadow 0.4s ease',
                      boxShadow: isActive
                        ? milestone.is_achieved
                          ? '0 32px 64px rgba(22,163,74,0.28), 0 12px 32px rgba(0,0,0,0.14)'
                          : `0 32px 64px ${meta.glow}, 0 12px 32px rgba(0,0,0,0.14)`
                        : '0 4px 16px rgba(0,0,0,0.06)',
                      borderRadius: 28,
                      border: milestone.is_achieved ? '3px solid #22c55e' : meta.border,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="relative flex flex-col justify-between p-8 select-none"
                      style={{ minHeight: 280, cursor: locked ? 'default' : 'pointer' }}
                      onClick={() => handleCardTap(milestone, locked)}
                    >
                      <div className="absolute inset-0" style={{ background: bgColor }} />
                      {visionImageUrl && !locked && !milestone.is_achieved && (
                        <>
                          <img src={visionImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/55" />
                        </>
                      )}
                      <div className="absolute rounded-full bg-white/5" style={{ width: 200, height: 200, top: -50, right: -50 }} />
                      <div className="absolute rounded-full bg-white/5" style={{ width: 130, height: 130, bottom: -30, left: -30 }} />

                      <div className="relative flex items-start justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: locked ? '#6b7280' : 'rgba(255,255,255,0.65)' }}>
                          {meta.label || `ステップ ${originalIndex + 1}/${total}`}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          {!locked && (() => {
                            const badge = deadlineBadge(milestone.deadline)
                            if (!badge) return null
                            return (
                              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge.urgent ? 'bg-yellow-400 text-yellow-900' : 'bg-white/20 text-white'}`}>
                                {badge.text}
                              </span>
                            )
                          })()}
                          {milestone.is_achieved && <CheckCircle2 className="w-6 h-6 text-white" />}
                        </div>
                      </div>

                      <div className="relative flex-1 flex flex-col justify-center py-4 gap-2">
                        <h2 className="font-bold leading-tight" style={{ fontSize: 'clamp(22px, 6.5vw, 34px)', color: locked ? '#4b5563' : 'white' }}>
                          {milestone.title}
                        </h2>
                        {!locked && (
                          <p style={{ fontSize: 12, color: reason ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.38)', fontStyle: reason ? 'normal' : 'italic', lineHeight: 1.4 }}>
                            {reason || 'タスク管理画面でやる理由を設定'}
                          </p>
                        )}
                      </div>

                      <div className="relative">
                        <p className="text-xs" style={{ color: locked ? '#4b5563' : 'rgba(255,255,255,0.4)' }}>
                          {locked ? 'ひとつ前のマイルストーンを達成すると解放されます' : 'タップでタスクを管理'}
                        </p>
                      </div>

                      {locked && (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.70)', borderRadius: 28, animation: isUnlocking ? 'overlayVanish 0.85s ease-out forwards' : 'none' }}
                        >
                          <Lock className="w-12 h-12" style={{ color: 'rgba(255,255,255,0.55)', animation: isUnlocking ? 'lockBreak 0.75s ease-out forwards' : 'none' }} />
                        </div>
                      )}
                    </div>

                    {!locked && (
                      <button
                        onClick={() => toggleAchieved(milestone, originalIndex)}
                        className={`w-full py-3.5 text-sm font-bold transition-colors ${milestone.is_achieved ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                      >
                        {milestone.is_achieved ? '達成済み ✓' : '達成する'}
                      </button>
                    )}
                  </div>
                </div>

                {hasNextCard && (
                  <div className="flex justify-center py-1">
                    <RoadDots green={lineGreen} />
                  </div>
                )}
              </div>
            )
          })}

          <div style={{ height: 'calc(50vh - 230px)', flexShrink: 0 }} />
        </div>

        {/* ── Progress dots (goal + milestones) ──────────────────────── */}
        {totalVisual > 1 && (
          <div className="flex justify-center gap-2 py-3 flex-shrink-0">
            {/* dot for goal card */}
            <div
              className="rounded-full transition-all duration-300"
              style={{ width: activeIndex === 0 ? 22 : 6, height: 6, background: activeIndex === 0 ? goldMeta.color : (hasCrown ? '#22c55e' : '#d1d5db') }}
            />
            {/* dots for milestones (logical order: ms[0] left → ms[total-1] right) */}
            {milestones.map((m, origI) => {
              const rank = getMilestoneRank(origI, total + 1)
              const vi = total - origI  // milestones[0]=vi=total, milestones[total-1]=vi=1
              const isActiveDot = vi === activeIndex
              const dotColor = m.is_achieved ? '#22c55e' : RANK_META[rank].color
              return (
                <div
                  key={m.id}
                  className="rounded-full transition-all duration-300"
                  style={{ width: isActiveDot ? 22 : 6, height: 6, background: isActiveDot ? dotColor : (m.is_achieved ? '#22c55e' : '#d1d5db') }}
                />
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
