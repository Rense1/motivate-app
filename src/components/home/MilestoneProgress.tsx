'use client'

import { Milestone } from '@/lib/types'
import Link from 'next/link'
import { ChevronRight, Crown } from 'lucide-react'
import { getMilestoneRank, RANK_META, RANK_BG } from '@/lib/progressUtils'

interface MilestoneProgressProps {
  milestones: Milestone[]
  goalId: string
  goalTitle: string
}

export default function MilestoneProgress({ milestones, goalId, goalTitle }: MilestoneProgressProps) {
  const total = milestones.length
  const achieved = milestones.filter(m => m.is_achieved).length
  const current = milestones.find(m => !m.is_achieved) ?? null
  const currentIndex = current ? milestones.indexOf(current) : -1
  const rank = current ? getMilestoneRank(currentIndex, total) : 5
  const meta = RANK_META[rank]
  const allDone = achieved === total && total > 0

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-800">マイルストーン</h2>
        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
          {achieved}/{total}
        </span>
      </div>

      {total === 0 ? (
        <p className="text-gray-400 text-xs">マイルストーンがありません</p>
      ) : allDone ? (
        <div className="text-center py-4">
          <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-yellow-600">🏆 全て達成！</p>
        </div>
      ) : (
        <Link href={`/milestones?goalId=${goalId}`} className="block space-y-2">

          {/* ── Final goal: gold rounded rectangle ── */}
          <div
            className="w-full px-4 py-3 flex items-center gap-2"
            style={{
              background: '#78350f',
              border: '2.5px solid #eab308',
              borderRadius: 14,
            }}
          >
            <Crown className="w-4 h-4 flex-shrink-0 text-yellow-400" />
            <p
              className="text-white font-bold text-xs leading-snug truncate"
            >
              {goalTitle}
            </p>
          </div>

          {/* ── Connecting dots ── */}
          <div className="flex flex-col items-center" style={{ gap: 3, padding: '1px 0' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{ width: 4, height: 4, borderRadius: '50%', background: '#d1d5db' }}
              />
            ))}
          </div>

          {/* ── Current milestone card ── */}
          <div
            className="w-full px-4 py-3"
            style={{
              background: RANK_BG[rank],
              border: meta.border,
              borderRadius: 14,
            }}
          >
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>
              現在のマイルストーン
            </p>
            <p className="text-white font-bold text-sm leading-snug">
              {current!.title}
            </p>
          </div>

        </Link>
      )}

      {total > 0 && !allDone && (
        <Link
          href={`/milestones?goalId=${goalId}`}
          className="flex items-center justify-end gap-0.5 mt-3 text-xs font-semibold text-red-600"
        >
          詳細を見る <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  )
}
