'use client'

import { Milestone } from '@/lib/types'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface MilestoneProgressProps {
  milestones: Milestone[]
  goalId: string
}

export default function MilestoneProgress({ milestones, goalId }: MilestoneProgressProps) {
  const total = milestones.length
  const achieved = milestones.filter(m => m.is_achieved).length
  const progress = total > 0 ? Math.round((achieved / total) * 100) : 0
  const current = milestones.find(m => !m.is_achieved) || milestones[milestones.length - 1]

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-800">マイルストーン</h2>
        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
          {achieved}/{total}
        </span>
      </div>

      {total === 0 ? (
        <p className="text-gray-400 text-xs">マイルストーンがありません</p>
      ) : (
        <div className="space-y-3">
          {/* Current milestone */}
          {current && (
            <div className="bg-gray-50 rounded-2xl px-3 py-2.5">
              <p className="text-xs text-gray-400 mb-0.5">次のマイルストーン</p>
              <p className="text-sm font-semibold text-gray-800 leading-snug">{current.title}</p>
            </div>
          )}

          {/* Progress bar */}
          <div>
            <div className="bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-red-500 h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-right text-xs text-gray-400 mt-1">{progress}%</p>
          </div>
        </div>
      )}

      <Link
        href={`/milestones?goalId=${goalId}`}
        className="flex items-center justify-end gap-0.5 mt-3 text-xs font-semibold text-red-600"
      >
        詳細を見る
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}
