'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Minus, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewGoalPage() {
  const [title, setTitle] = useState('')
  const [milestones, setMilestones] = useState(['', '', ''])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function addMilestone() {
    setMilestones(prev => [...prev, ''])
  }

  function removeMilestone(index: number) {
    setMilestones(prev => prev.filter((_, i) => i !== index))
  }

  function updateMilestone(index: number, value: string) {
    setMilestones(prev => prev.map((m, i) => i === index ? value : m))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Safeguard: re-check goal count limit before inserting
    const { data: profile } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single()
    if (!profile?.is_premium) {
      const { count } = await supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      if ((count ?? 0) >= 2) {
        router.push('/goals')
        return
      }
    }

    // Create goal
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({ user_id: user.id, title: title.trim() })
      .select()
      .single()

    if (goalError || !goal) {
      setLoading(false)
      return
    }

    // Create milestones one by one (sequential) to avoid order_index conflicts
    const validTitles = milestones.map(m => m.trim()).filter(Boolean)
    for (let i = 0; i < validTitles.length; i++) {
      await supabase.from('milestones').insert({
        goal_id: goal.id,
        title: validTitles[i],
        order_index: i,
      })
    }

    router.push(`/milestones?goalId=${goal.id}`)
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/goals" className="p-2 rounded-xl hover:bg-gray-200">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">新しい目標</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Goal title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">最終目標</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="例：英語を話せる様になる"
            className="w-full border border-gray-300 rounded-2xl px-4 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 text-base"
          />
        </div>

        {/* Milestones */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">マイルストーン（段階的な目標）</label>
            <button type="button" onClick={addMilestone} className="text-red-600 text-sm font-medium flex items-center gap-1">
              <Plus className="w-4 h-4" /> 追加
            </button>
          </div>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{i + 1}</span>
                </div>
                <input
                  value={m}
                  onChange={e => updateMilestone(i, e.target.value)}
                  placeholder={`マイルストーン ${i + 1}`}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
                {milestones.length > 1 && (
                  <button type="button" onClick={() => removeMilestone(i)} className="text-gray-400 hover:text-red-500">
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">上から順に達成していきます。後から追加・編集もできます。</p>
        </div>

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-red-700 transition disabled:opacity-50"
        >
          {loading ? '作成中...' : '目標を作成する'}
        </button>
      </form>
    </div>
  )
}
