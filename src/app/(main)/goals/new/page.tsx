'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Minus, ChevronLeft, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useTutorial } from '@/hooks/useTutorial'
import { useI18n } from '@/lib/i18n'
import { isAnonymousUser } from '@/lib/userUtils'

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

  function addMilestone() {
    setMilestones(prev => [...prev, ''])
    setMsDeadlines(prev => [...prev, ''])
  }

  function removeMilestone(index: number) {
    if (milestones.length <= 1) return
    setMilestones(prev => prev.filter((_, i) => i !== index))
    setMsDeadlines(prev => prev.filter((_, i) => i !== index))
  }

  function updateMilestone(index: number, value: string) {
    setMilestones(prev => prev.map((m, i) => i === index ? value : m))
  }

  function updateMsDeadline(index: number, value: string) {
    setMsDeadlines(prev => prev.map((d, i) => i === index ? value : d))
  }

  function getMsPlaceholder(index: number): string {
    const placeholders = dict.goals.msPlaceholders
    if (index < placeholders.length) return placeholders[index]
    return `${t('goals.milestonePlaceholder')} ${index + 1}`
  }

  async function handleSubmit() {
    if (!title.trim()) return
    setLoading(true)
    setError(null)

    try {
      // getSession() reads from local storage — fast, no network needed
      const { data: { session } } = await supabase.auth.getSession()
      let user = session?.user ?? null

      if (!user) {
        // Session missing: create an anonymous session (layout may not have finished yet)
        const { data, error: signInError } = await supabase.auth.signInAnonymously()
        if (signInError) {
          setError(t('goals.sessionError'))
          return
        }
        user = data.user
        if (user) {
          await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id' })
        }
      }

      if (!user) {
        setError(t('goals.sessionError'))
        return
      }

      // Ensure profile row exists (handles cases where trigger didn't fire)
      if (isAnonymousUser(user)) {
        await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id' })
      }

      // Free plan goal limit check
      const { data: profile } = await supabase
        .from('profiles').select('is_premium').eq('id', user.id).single()
      const { count: goalCount } = await supabase
        .from('goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id)

      if (!profile?.is_premium && (goalCount ?? 0) >= 2) {
        router.push('/goals')
        return
      }

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
        setError(t('goals.createError'))
        return
      }

      // Bulk-create milestones (order_index 0 = first to achieve)
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

      if (!isDone()) startMsTutorial()
      router.push(`/milestones?goalId=${goal.id}`)
    } catch (err) {
      console.error('goal creation error:', err)
      setError(t('goals.createError'))
    } finally {
      setLoading(false)
    }
  }

  // Display highest milestone number at top, index 0 at bottom
  const reversedIndices = [...Array(milestones.length).keys()].reverse()

  return (
    <div className="p-4 space-y-6 pb-8">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/goals" className="p-2 rounded-xl hover:bg-gray-200">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">{t('goals.newTitle')}</h1>
      </div>

      <form onSubmit={e => { e.preventDefault(); handleSubmit() }} className="space-y-6">
        {/* 最終目標 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t('goals.finalGoal')}</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder={t('goals.finalGoalPlaceholder')}
            className="w-full border border-gray-300 rounded-2xl px-4 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 text-base"
          />
          <div className="mt-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <label className="text-xs text-gray-500 flex-shrink-0">{t('goals.deadline')}</label>
            <input
              type="date"
              value={goalDeadline}
              onChange={e => setGoalDeadline(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50"
            />
            {goalDeadline && (
              <button type="button" onClick={() => setGoalDeadline('')}
                className="text-xs text-gray-400 hover:text-red-500 transition">✕</button>
            )}
          </div>
        </div>

        {/* マイルストーン */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">{t('goals.milestoneSteps')}</label>
            <button type="button" onClick={addMilestone} className="text-red-600 text-sm font-medium flex items-center gap-1">
              <Plus className="w-4 h-4" /> {t('goals.addMilestone')}
            </button>
          </div>

          <div className="space-y-3">
            {reversedIndices.map(actualIdx => (
              <div key={actualIdx}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{actualIdx + 1}</span>
                  </div>
                  <input
                    value={milestones[actualIdx]}
                    onChange={e => updateMilestone(actualIdx, e.target.value)}
                    placeholder={getMsPlaceholder(actualIdx)}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                  {milestones.length > 1 && (
                    <button type="button" onClick={() => removeMilestone(actualIdx)} className="text-gray-400 hover:text-red-500">
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="ml-8 mt-1 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  <input
                    type="date"
                    value={msDeadlines[actualIdx]}
                    onChange={e => updateMsDeadline(actualIdx, e.target.value)}
                    placeholder={t('goals.milestoneDeadline')}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-gray-500 text-xs focus:outline-none focus:ring-1 focus:ring-red-400 bg-gray-50"
                  />
                  {msDeadlines[actualIdx] && (
                    <button type="button" onClick={() => updateMsDeadline(actualIdx, '')}
                      className="text-xs text-gray-300 hover:text-red-400 transition">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-3">{t('goals.milestoneTip')}</p>
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-red-700 transition disabled:opacity-50"
        >
          {loading ? t('goals.creating') : t('goals.create')}
        </button>
      </form>
    </div>
  )
}
