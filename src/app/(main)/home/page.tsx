import { createClient } from '@/lib/supabase/server'
import HomeClient from '../HomeClient'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: goals } = await supabase
    .from('goals')
    .select(`
      *,
      milestones (
        *,
        tasks (*)
      )
    `)
    .eq('user_id', user!.id)
    .order('created_at')
    .limit(1)

  const goal = goals?.[0] || null

  const todayTasks = goal?.milestones
    ?.filter((m: any) => !m.is_achieved)
    .flatMap((m: any) => (m.tasks || []).filter((t: any) => t.is_daily).map((t: any) => ({ ...t, milestone: m })))
    .slice(0, 5) || []

  const milestones = goal?.milestones?.sort((a: any, b: any) => a.order_index - b.order_index) || []

  return <HomeClient goal={goal} todayTasks={todayTasks} milestones={milestones} />
}
