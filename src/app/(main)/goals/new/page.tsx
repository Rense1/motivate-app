'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Minus, ChevronLeft, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useTutorial } from '@/hooks/useTutorial'
import { useI18n } from '@/lib/i18n'

const DEFAULT_MS_COUNT = 4

export default function NewGoalPage() {
  const { t, dict } = useI18n()
  const { startMsTutorial, isDone } = useTutorial()
  const [title, setTitle] = useState('')
  const [goalDeadline, setGoalDeadline] = useState('')
  const [milestones, setMilestones] = useState<string[]>(
    Array.from({ length: DEFAULT_MS_COUNT }, () => '')
  )
  const [msDeadlines, setMsDeadlines] = useState<string[]>(
    Array.from({ length: DEFAULT_MS_COUNT }, () => '')
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    if (!title.trim()) return
    setLoading(true)
    setError(null)

    try {
      // getSession() はローカル Cookie を読むだけなのでネットワーク不要・失敗しない
      const { data: { session } } = await supabase.auth.getSession()
      let user = session?.user ?? null

      if (!user) {
        const { data } = await supabase.auth.signInAnonymously()
        user = data.user

        // 🔥 追加：匿名ユーザーの profiles 行を必ず作成
        if (data?.user) {
          await supabase.from('profiles').upsert({ id: data.user.id })
        }
      }

      if (!user) { 
        setError(t('goals.sessionError')) 
        return 
      }

      // フリープランの目標数上限チェック
      const { data: profile } = await supabase
        .from('profiles').select('is_premium').eq('id', user.id).single()
      const { count: goalCount } = await supabase
        .from('goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id)

      if (!profile?.is_premium && (goalCount ?? 0) >= 2) {
        router.push('/goals')
        return
      }

      // 目標作成
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: title.trim(),
          deadline: goalDeadline || null,
        })
        .select()
        .single()

      if (goalError || !goal) {
        setError('目標の作成に失敗しました。もう一度お試しください。')
        return
      }

      // マイルストーン一括作成（order_index: 0 が最初に達成する）
      const validMilestones = milestones
        .map((m, i) => ({ title: m.trim(), deadline: msDeadlines[i] || null }))
        .filter(m => m.title)

      if (validMilestones.length > 0) {
        await supabase.from('milestones').insert(
          validMilestones.map((ms, i) => ({
            goal_id: goal.id,
            title: ms.title,
            order_index: i,
            deadline: ms.deadline,
          }))
        )
      }

      // スキップ済みでなければ毎回チュートリアルを予約
      if (!isDone()) startMsTutorial()

      router.push(`/milestones?goalId=${goal.id}`)
    } catch (err) {
      console.error('goal creation error:', err)
      setError('エラーが発生しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  // Display milestones in reversed order: highest index (hardest) at top, index 0 at bottom
  const reversedIndices = [...Array(milestones.length).keys()].reverse()

  return (
    <div className="p-4 space-y-6 pb-8">
      {/* 以下は元の UI コードそのまま */}
      ...
    </div>
  )
}
