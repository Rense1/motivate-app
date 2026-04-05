'use client'

import { Milestone } from '@/lib/types'
import Link from 'next/link'

interface MilestoneProgressProps {
  milestones: Milestone[]
  goalId: string
}

export default function MilestoneProgress({ milestones, goalId }: MilestoneProgressProps) {
  const total = milestones.length
  const achieved = milestones.filter(m => m.is_achieved).length
  const progress = total > 0 ? achieved / total : 0

  // Find current active milestone
  const current = milestones.find(m => !m.is_achieved) || milestones[milestones.length - 1]

  return (
    <Link href={`/milestones/${goalId}`} className="block">
      <div className="bg-red-600 rounded-2xl p-4 h-full relative overflow-hidden flex flex-col items-center">
        {/* Dots above */}
        <div className="flex flex-col items-center gap-1.5 mb-2">
          {milestones.slice(0, 3).map((m, i) => (
            <div
              key={m.id}
              className={`w-3 h-3 rounded-full ${m.is_achieved ? 'bg-green-400' : 'bg-red-400'}`}
            />
          ))}
        </div>

        {/* Current milestone circle */}
        {current && (
          <div className="w-20 h-20 rounded-full bg-red-700 flex items-center justify-center text-center px-2 my-1">
            <span className="text-white text-xs font-bold leading-tight">{current.title}</span>
          </div>
        )}

        {/* Dots below */}
        <div className="flex flex-col items-center gap-1.5 mt-2 flex-1">
          {milestones.slice(3, 6).map((m) => (
            <div
              key={m.id}
              className={`w-3 h-3 rounded-full ${m.is_achieved ? 'bg-green-400' : 'bg-red-400'}`}
            />
          ))}
        </div>

        {/* Progress fill at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-green-500 rounded-b-2xl flex items-center justify-center"
          style={{ height: `${Math.max(8, progress * 100)}%`, minHeight: '12px' }}>
        </div>
      </div>
    </Link>
  )
}
