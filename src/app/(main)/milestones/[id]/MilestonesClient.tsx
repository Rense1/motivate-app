'use client'

import { useState, useEffect } from 'react'
import { Goal, Milestone } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import MilestoneRoadmap from '@/components/milestone/MilestoneRoadmap'
import { ChevronLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import { useParams, useRouter } from 'next/navigation'

export default function MilestonesClient() {
  const params = useParams()
  const goalId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [goal, setGoal] = useState<Goal | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!goalId) return
    async function fetchData() {
      const { data: goal } = await supabase
        .from('goals').select('*').eq('id', goalId).single()
      if (!goal) { router.replace('/goals'); return }

      const { data: milestones } = await supabase
        .from('milestones').select('*').eq('goal_id', goalId).order('order_index')

      setGoal(goal)
      setMilestones(milestones || [])
      setLoading(false)
    }
    fetchData()
  }, [goalId])

  function handleMilestoneUpdate(id: string, updates: Partial<Milestone>) {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  async function addMilestone() {
    if (!newTitle.trim()) return
    setAdding(true)
    const { data, error } = await supabase
      .from('milestones')
      .insert({ goal_id: goalId, title: newTitle.trim(), order_index: milestones.length })
      .select().single()

    if (!error && data) {
      setMilestones(prev => [...prev, data])
      setNewTitle('')
      setAddOpen(false)
    }
    setAdding(false)
  }

  if (loading || !goal) return null

  const achieved = milestones.filter(m => m.is_achieved).length

  return (
    <div className="page-enter relative">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-1.5 rounded-xl hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-gray-800 leading-tight">{goal.title}</h1>
            <p className="text-xs text-gray-500">{achieved}/{milestones.length} 達成</p>
          </div>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-red-600 text-white rounded-xl px-3 py-2 flex items-center gap-1 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          追加
        </button>
      </div>

      <MilestoneRoadmap
        milestones={milestones}
        goalId={goalId}
        onMilestoneUpdate={handleMilestoneUpdate}
      />

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="マイルストーンを追加">
        <div className="space-y-4">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMilestone()}
            placeholder="例：英単語を1000個覚える"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={addMilestone}
            disabled={adding || !newTitle.trim()}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {adding ? '追加中...' : '追加する'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
