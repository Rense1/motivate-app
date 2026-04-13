'use client'

import { useState } from 'react'
import { Milestone, MilestoneReason } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import ReasonsModal from './ReasonsModal'
import { CheckCircle2 } from 'lucide-react'
import { deadlineBadge } from '@/lib/taskUtils'
import Link from 'next/link'

interface MilestoneRoadmapProps {
  milestones: Milestone[]
  goalId: string
  onMilestoneUpdate: (id: string, updates: Partial<Milestone>) => void
}

export default function MilestoneRoadmap({ milestones, goalId, onMilestoneUpdate }: MilestoneRoadmapProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  const [reasons, setReasons] = useState<MilestoneReason[]>([])
  const [reasonsOpen, setReasonsOpen] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  const total = milestones.length
  const achieved = milestones.filter(m => m.is_achieved).length
  const progressPercent = total > 0 ? (achieved / total) * 100 : 0

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

  return (
    <div className="bg-red-600 min-h-screen relative overflow-hidden">
      {/* Progress fill from bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-500"
        style={{ height: `${progressPercent}%` }}
      />

      <div className="relative z-10 py-8 px-4 flex flex-col items-center gap-0">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="flex flex-col items-center w-full">
            {/* Connector dots above (except first) */}
            {index > 0 && (
              <div className="flex flex-col items-center gap-1.5 py-2">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${milestone.is_achieved ? 'bg-green-400' : 'bg-red-400'}`}
                  />
                ))}
              </div>
            )}

            {/* Milestone card */}
            <div
              className="w-full max-w-xs"
              onMouseDown={() => startLongPress(milestone)}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={() => startLongPress(milestone)}
              onTouchEnd={cancelLongPress}
              onTouchCancel={cancelLongPress}
            >
              <Link href={`/tasks?goalId=${goalId}&milestoneId=${milestone.id}`} onClick={cancelLongPress}>
                <div className={`relative rounded-2xl p-5 text-center shadow-lg transition-transform active:scale-95 ${
                  milestone.is_achieved ? 'bg-green-500' : 'bg-red-700'
                }`}>
                  {/* Deadline countdown + achieved badge */}
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    {(() => {
                      const badge = deadlineBadge(milestone.deadline)
                      if (!badge) return null
                      return (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          badge.urgent ? 'bg-yellow-400 text-yellow-900' : 'bg-white/20 text-white'
                        }`}>
                          {badge.text}
                        </span>
                      )
                    })()}
                    {milestone.is_achieved && (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mx-auto mb-2">
                    <span className="text-white text-xs font-bold text-center leading-tight px-1">
                      {milestone.title}
                    </span>
                  </div>

                </div>
              </Link>

              {/* Achieve button */}
              <button
                onClick={() => toggleAchieved(milestone)}
                className={`mt-2 w-full py-1.5 rounded-xl text-xs font-semibold transition ${
                  milestone.is_achieved
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {milestone.is_achieved ? '達成済み ✓' : '達成する'}
              </button>
            </div>
          </div>
        ))}

        {milestones.length === 0 && (
          <div className="text-center py-20">
            <p className="text-red-200 text-sm">マイルストーンを追加してください</p>
          </div>
        )}
      </div>

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
