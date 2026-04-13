'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Milestone, MilestoneReason } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import ReasonsModal from './ReasonsModal'
import { CheckCircle2 } from 'lucide-react'
import { deadlineBadge } from '@/lib/taskUtils'
import Link from 'next/link'

interface MilestoneRoadmapProps {
  milestones: Milestone[]
  goalId: string
  visionImageUrl?: string | null
  onMilestoneUpdate: (id: string, updates: Partial<Milestone>) => void
}

export default function MilestoneRoadmap({ milestones, goalId, visionImageUrl, onMilestoneUpdate }: MilestoneRoadmapProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  const [reasons, setReasons] = useState<MilestoneReason[]>([])
  const [reasonsOpen, setReasonsOpen] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const supabase = createClient()

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
    updateActiveIndex()
    return () => container.removeEventListener('scroll', updateActiveIndex)
  }, [milestones, updateActiveIndex])

  async function openReasons(milestone: Milestone) {
    setSelectedMilestone(milestone)
    const { data } = await supabase
      .from('milestone_reasons')
      .select('*')
      .eq('milestone_id', milestone.id)
      .order('order_index')
    setReasons(data || [])
    setReasonsOpen(true)
  }

  function startLongPress(milestone: Milestone) {
    const timer = setTimeout(() => openReasons(milestone), 600)
    setLongPressTimer(timer)
  }

  function cancelLongPress() {
    if (longPressTimer) clearTimeout(longPressTimer)
    setLongPressTimer(null)
  }

  async function toggleAchieved(milestone: Milestone) {
    const newVal = !milestone.is_achieved
    await supabase
      .from('milestones')
      .update({ is_achieved: newVal, achieved_at: newVal ? new Date().toISOString() : null })
      .eq('id', milestone.id)
    onMilestoneUpdate(milestone.id, { is_achieved: newVal, achieved_at: newVal ? new Date().toISOString() : null })
  }

  if (milestones.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center pb-20">
        <p className="text-gray-400 text-sm">マイルストーンを追加してください</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll"
        style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}
      >
        {/* Top spacer */}
        <div style={{ height: 'calc(50vh - 220px)', flexShrink: 0 }} />

        {milestones.map((milestone, index) => {
          const isActive = index === activeIndex
          const badge = deadlineBadge(milestone.deadline)

          return (
            <div
              key={milestone.id}
              ref={el => { cardRefs.current[index] = el }}
              className="px-5 mb-5"
              style={{ scrollSnapAlign: 'center' }}
              onMouseDown={() => startLongPress(milestone)}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={() => startLongPress(milestone)}
              onTouchEnd={cancelLongPress}
              onTouchCancel={cancelLongPress}
            >
              <div
                style={{
                  transform: isActive ? 'scale(1.0)' : 'scale(0.88)',
                  opacity: isActive ? 1 : 0.55,
                  transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease, box-shadow 0.4s ease',
                  boxShadow: isActive
                    ? milestone.is_achieved
                      ? '0 32px 64px rgba(22,163,74,0.28), 0 12px 32px rgba(0,0,0,0.15)'
                      : '0 32px 64px rgba(185,28,28,0.30), 0 12px 32px rgba(0,0,0,0.15)'
                    : '0 4px 16px rgba(0,0,0,0.06)',
                  borderRadius: '28px',
                  overflow: 'hidden',
                }}
              >
                {/* Card body */}
                <Link href={`/tasks?goalId=${goalId}&milestoneId=${milestone.id}`} onClick={cancelLongPress}>
                  <div
                    className="relative flex flex-col justify-between p-8"
                    style={{
                      minHeight: '340px',
                      background: milestone.is_achieved
                        ? 'linear-gradient(145deg, #22c55e 0%, #16a34a 40%, #15803d 100%)'
                        : visionImageUrl
                          ? undefined
                          : 'linear-gradient(145deg, #ef4444 0%, #dc2626 40%, #991b1b 100%)',
                    }}
                  >
                    {/* Vision image background */}
                    {visionImageUrl && !milestone.is_achieved && (
                      <>
                        <img
                          src={visionImageUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/55" />
                      </>
                    )}

                    {/* Decorative circles (shown when no image) */}
                    {(!visionImageUrl || milestone.is_achieved) && (
                      <>
                        <div
                          className="absolute rounded-full bg-white/8"
                          style={{ width: 240, height: 240, top: -60, right: -60 }}
                        />
                        <div
                          className="absolute rounded-full bg-white/5"
                          style={{ width: 160, height: 160, bottom: -40, left: -40 }}
                        />
                      </>
                    )}

                    {/* Top: label + badges */}
                    <div className="relative flex items-start justify-between">
                      <span className="text-white/70 text-xs font-bold uppercase tracking-widest">
                        マイルストーン {index + 1}/{milestones.length}
                      </span>
                      <div className="flex flex-col items-end gap-1">
                        {badge && (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            badge.urgent ? 'bg-yellow-400 text-yellow-900' : 'bg-white/20 text-white'
                          }`}>
                            {badge.text}
                          </span>
                        )}
                        {milestone.is_achieved && (
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        )}
                      </div>
                    </div>

                    {/* Main title */}
                    <div className="relative flex-1 flex items-center py-4">
                      <h2
                        className="text-white font-bold leading-tight"
                        style={{ fontSize: 'clamp(24px, 7vw, 36px)' }}
                      >
                        {milestone.title}
                      </h2>
                    </div>

                    {/* Bottom hint */}
                    <div className="relative">
                      <p className="text-white/50 text-xs">
                        長押しで「やる理由」を記録 · タップでタスクを管理
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Achieve button */}
                <button
                  onClick={() => toggleAchieved(milestone)}
                  className={`w-full py-3.5 text-sm font-bold transition-colors ${
                    milestone.is_achieved
                      ? 'bg-green-50 text-green-600 hover:bg-green-100'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {milestone.is_achieved ? '達成済み ✓' : '達成する'}
                </button>
              </div>
            </div>
          )
        })}

        {/* Bottom spacer */}
        <div style={{ height: 'calc(50vh - 220px)', flexShrink: 0 }} />
      </div>

      {/* Dot indicators */}
      {milestones.length > 1 && (
        <div className="flex justify-center gap-2 py-3 flex-shrink-0">
          {milestones.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeIndex ? 22 : 6,
                height: 6,
                background: i === activeIndex
                  ? (milestones[i]?.is_achieved ? '#16a34a' : '#dc2626')
                  : '#d1d5db',
              }}
            />
          ))}
        </div>
      )}

      {selectedMilestone && (
        <ReasonsModal
          isOpen={reasonsOpen}
          onClose={() => setReasonsOpen(false)}
          milestone={selectedMilestone}
          reasons={reasons}
          onReasonsChange={setReasons}
        />
      )}
    </div>
  )
}
