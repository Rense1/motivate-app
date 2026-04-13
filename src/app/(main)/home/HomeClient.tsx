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
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: goals }, { data: profile }] = await Promise.all([
        supabase
          .from('goals')
          .select('*, milestones(*, tasks(*))')
          .eq('user_id', user.id)
          .order('created_at')
          .limit(1),
        supabase.from('profiles').select('is_premium').eq('id', user.id).single(),
      ])

      const g = goals?.[0] || null
      setGoal(g)
      setIsPremium(profile?.is_premium ?? false)

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

  // loading.tsx skeleton is shown by Suspense until this returns non-null
  if (loading) return null

  if (!goal) {
    return (
      <div className="page-enter min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mb-4">
          <span className="text-white text-3xl font-bold">M</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Motivate</h1>
        <p className="text-gray-500 mb-8">あなたの目標を設定して<br />夢への道を歩み始めましょう</p>
        <Link
          href="/goals/new"
          className="bg-red-600 text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-6 h-6" />
          最初の目標を作る
        </Link>
      </div>
    )
  }

  return (
    <div className="page-enter p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-800">{goal.title}</h1>
        <Link href="/goals" className="text-red-600 text-sm font-medium">目標一覧</Link>
      </div>

      <VisionBoard goal={goal} onUpdate={handleGoalUpdate} />

      <div className="grid grid-cols-2 gap-3" style={{ height: '280px' }}>
        <TodayTaskList tasks={todayTasks} onTaskToggle={handleTaskToggle} />
        <MilestoneProgress milestones={milestones} goalId={goal.id} />
      </div>

      <Link
        href={`/milestones/${goal.id}`}
        className="block bg-red-600 text-white text-center py-4 rounded-2xl font-semibold"
      >
        マイルストーンを管理する →
      </Link>
    </div>
  )
}
