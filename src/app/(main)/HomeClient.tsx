'use client'

import { useState } from 'react'
import { Goal, Milestone, Task, Profile } from '@/lib/types'
import VisionBoard from '@/components/home/VisionBoard'
import TodayTaskList from '@/components/home/TodayTaskList'
import MilestoneProgress from '@/components/home/MilestoneProgress'
import Link from 'next/link'
import { Plus } from 'lucide-react'

interface HomeClientProps {
  goal: Goal | null
  todayTasks: (Task & { milestone: Milestone })[]
  milestones: Milestone[]
  isPremium: boolean
}

export default function HomeClient({ goal: initialGoal, todayTasks: initialTasks, milestones: initialMilestones, isPremium }: HomeClientProps) {
  const [goal, setGoal] = useState(initialGoal)
  const [todayTasks, setTodayTasks] = useState(initialTasks)
  const [milestones, setMilestones] = useState(initialMilestones)

  function handleGoalUpdate(updates: Partial<Goal>) {
    setGoal(prev => prev ? { ...prev, ...updates } : prev)
  }

  function handleTaskToggle(taskId: string, completed: boolean) {
    setTodayTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed_today: completed } : t))
  }

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
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-800">{goal.title}</h1>
        <Link href="/goals" className="text-red-600 text-sm font-medium">目標一覧</Link>

      </div>

      {/* Vision Board */}
      <VisionBoard goal={goal} onUpdate={handleGoalUpdate} isPremium={isPremium} />

      {/* Tasks + Milestone Progress */}
      <div className="grid grid-cols-2 gap-3" style={{ height: '280px' }}>
        <TodayTaskList tasks={todayTasks} onTaskToggle={handleTaskToggle} />
        <MilestoneProgress milestones={milestones} goalId={goal.id} />
      </div>

      {/* Quick link to milestones */}
      <Link
        href={`/milestones/${goal.id}`}
        className="block bg-red-600 text-white text-center py-4 rounded-2xl font-semibold"
      >
        マイルストーンを管理する →
      </Link>
    </div>
  )
}
