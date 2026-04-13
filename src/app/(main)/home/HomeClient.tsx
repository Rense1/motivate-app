'use client'

import { useState, useEffect } from 'react'
import { Goal, Milestone, Task } from '@/lib/types'
import VisionBoard from '@/components/home/VisionBoard'
import TodayTaskList from '@/components/home/TodayTaskList'
import MilestoneProgress from '@/components/home/MilestoneProgress'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isCompletedToday, shouldShowInToday } from '@/lib/taskUtils'

export default function HomeClient() {
  const [goal, setGoal] = useState<Goal | null>(null)
  const [todayTasks, setTodayTasks] = useState<(Task & { milestone: Milestone })[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: goals }] = await Promise.all([
        supabase
          .from('goals')
          .select('*, milestones(*, tasks(*))')
          .eq('user_id', user.id)
          .order('created_at')
          .limit(1),
      ])

      const g = goals?.[0] || null
      setGoal(g)

      if (g) {
        const tasks = g.milestones
          ?.filter((m: any) => !m.is_achieved)
          .flatMap((m: any) =>
            (m.tasks || [])
              .filter((t: any) => shouldShowInToday(t.frequency ?? (t.is_daily ? 'daily' : 'none')))
              .map((t: any) => ({
                ...t,
                is_completed_today: isCompletedToday(t.last_completed_at),
                milestone: m,
              }))
          )
          .slice(0, 5) || []
        setTodayTasks(tasks)
        setMilestones(g.milestones?.sort((a: any, b: any) => a.order_index - b.order_index) || [])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  function handleGoalUpdate(updates: Partial<Goal>) {
    setGoal(prev => prev ? { ...prev, ...updates } : prev)
  }

  function handleTaskToggle(taskId: string, completed: boolean) {
    setTodayTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed_today: completed } : t))
  }

  if (loading) return null

  if (!goal) {
    return (
      <div className="page-enter min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mb-5">
          <span className="text-white text-2xl font-bold">M</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Motivate</h1>
        <p className="text-gray-500 text-sm mb-8">目標を設定して<br />夢への道を歩み始めましょう</p>
        <Link
          href="/goals/new"
          className="bg-red-600 text-white px-7 py-3.5 rounded-2xl font-bold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          最初の目標を作る
        </Link>
      </div>
    )
  }

  return (
    <div className="page-enter min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h1 className="text-xl font-bold text-gray-900 leading-tight truncate max-w-[70%]">
          {goal.title}
        </h1>
        <Link href="/goals" className="text-sm font-semibold text-red-600 flex-shrink-0">
          目標一覧
        </Link>
      </div>

      <div className="px-5 space-y-4 pb-8">
        {/* Vision board */}
        <VisionBoard goal={goal} onUpdate={handleGoalUpdate} />

        {/* Today tasks */}
        <TodayTaskList tasks={todayTasks} onTaskToggle={handleTaskToggle} />

        {/* Milestone progress */}
        <MilestoneProgress milestones={milestones} goalId={goal.id} />

        {/* CTA */}
        <Link
          href={`/milestones?goalId=${goal.id}`}
          className="block w-full bg-red-600 text-white text-center py-4 rounded-2xl font-bold text-sm"
        >
          マイルストーンを管理する →
        </Link>
      </div>
    </div>
  )
}
