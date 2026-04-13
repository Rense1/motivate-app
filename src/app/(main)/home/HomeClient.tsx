'use client'

import { useState, useEffect, useRef } from 'react'
import { Goal, Milestone, Task } from '@/lib/types'
import VisionBoard from '@/components/home/VisionBoard'
import TodayTaskList from '@/components/home/TodayTaskList'
import MilestoneProgress from '@/components/home/MilestoneProgress'
import Link from 'next/link'
import { Plus, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isCompletedToday, shouldShowInToday } from '@/lib/taskUtils'
import { useCrownCount } from '@/lib/useCrownCount'
import { Crown } from 'lucide-react'

type GoalWithData = Goal & { milestones: any[] }

function deriveTasks(g: GoalWithData): (Task & { milestone: Milestone })[] {
  return (
    g.milestones
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
      .slice(0, 5) ?? []
  )
}

function deriveMilestones(g: GoalWithData): Milestone[] {
  return [...(g.milestones ?? [])].sort((a, b) => a.order_index - b.order_index)
}

export default function HomeClient() {
  const crownCount = useCrownCount()
  const [allGoals, setAllGoals] = useState<GoalWithData[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [todayTasks, setTodayTasks] = useState<(Task & { milestone: Milestone })[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch all goals once
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: goals } = await supabase
        .from('goals')
        .select('*, milestones(*, tasks(*))')
        .eq('user_id', user.id)
        .order('created_at')

      const list: GoalWithData[] = goals || []
      setAllGoals(list)
      if (list.length > 0) setSelectedId(list[0].id)
      setLoading(false)
    }
    fetchData()
  }, [])

  // Recompute derived state when selection changes
  useEffect(() => {
    const g = allGoals.find(g => g.id === selectedId) ?? null
    if (!g) { setTodayTasks([]); setMilestones([]); return }
    setTodayTasks(deriveTasks(g))
    setMilestones(deriveMilestones(g))
  }, [selectedId, allGoals])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleGoalUpdate(updates: Partial<Goal>) {
    setAllGoals(prev => prev.map(g => g.id === selectedId ? { ...g, ...updates } : g))
  }

  function handleTaskToggle(taskId: string, completed: boolean) {
    setTodayTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed_today: completed } : t))
  }

  if (loading) return null

  const goal = allGoals.find(g => g.id === selectedId) ?? null

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

        {/* Goal selector — dropdown if multiple goals, plain text if one */}
        {allGoals.length > 1 ? (
          <div className="relative flex-1 mr-3" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              className="flex items-center gap-1.5 max-w-full"
            >
              <h1 className="text-xl font-bold text-gray-900 leading-tight truncate max-w-[calc(100%-20px)]">
                {goal.title}
              </h1>
              <ChevronDown
                className="w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200"
                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {dropdownOpen && (
              <div
                className="absolute left-0 top-full mt-1 z-30 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                style={{ minWidth: 220, maxWidth: 300 }}
              >
                {allGoals.map(g => (
                  <button
                    key={g.id}
                    onClick={() => { setSelectedId(g.id); setDropdownOpen(false) }}
                    className="w-full text-left px-4 py-3 flex items-center gap-2 transition-colors hover:bg-gray-50"
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                  >
                    {g.id === selectedId && (
                      <div className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                    )}
                    <span
                      className="text-sm font-semibold truncate"
                      style={{ color: g.id === selectedId ? '#dc2626' : '#374151', paddingLeft: g.id === selectedId ? 0 : 10 }}
                    >
                      {g.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <h1 className="text-xl font-bold text-gray-900 leading-tight truncate max-w-[70%]">
            {goal.title}
          </h1>
        )}

        <Link href="/goals" className="text-sm font-semibold text-red-600 flex-shrink-0">
          目標一覧
        </Link>
      </div>

      <div className="px-5 space-y-4 pb-8">
        {/* Vision board */}
        <VisionBoard goal={goal} onUpdate={handleGoalUpdate} />

        {/* Crown count */}
        {crownCount !== null && crownCount > 0 && (
          <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-bold text-yellow-700">王冠</span>
            </div>
            <span className="text-2xl font-black text-yellow-600">{crownCount}</span>
          </div>
        )}

        {/* Today tasks */}
        <TodayTaskList tasks={todayTasks} onTaskToggle={handleTaskToggle} />

        {/* Milestone progress */}
        <MilestoneProgress milestones={milestones} goalId={goal.id} goalTitle={goal.title} />

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
