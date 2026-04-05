'use client'

import { useState } from 'react'
import { Goal, Milestone } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Trash2, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface GoalsClientProps {
  goals: (Goal & { milestones: Milestone[] })[]
}

export default function GoalsClient({ goals: initialGoals }: GoalsClientProps) {
  const [goals, setGoals] = useState(initialGoals)
  const router = useRouter()
  const supabase = createClient()

  async function deleteGoal(id: string) {
    if (!confirm('この目標を削除しますか？')) return
    await supabase.from('goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-800">目標一覧</h1>
        <Link
          href="/goals/new"
          className="bg-red-600 text-white rounded-xl px-4 py-2 flex items-center gap-1 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          追加
        </Link>
      </div>

      <div className="space-y-3">
        {goals.map(goal => {
          const total = goal.milestones?.length || 0
          const achieved = goal.milestones?.filter(m => m.is_achieved).length || 0
          return (
            <div key={goal.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
              {goal.vision_image_url ? (
                <img src={goal.vision_image_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 text-xl font-bold">{goal.title[0]}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{goal.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full"
                      style={{ width: total > 0 ? `${(achieved / total) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{achieved}/{total}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link href={`/milestones/${goal.id}`}>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
                <button onClick={() => deleteGoal(goal.id)} className="p-1 text-gray-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}

        {goals.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">まだ目標がありません</p>
            <Link
              href="/goals/new"
              className="bg-red-600 text-white px-6 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              最初の目標を作る
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
