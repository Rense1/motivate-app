import { createClient } from '@/lib/supabase/server'
import GoalsClient from './GoalsClient'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: goals }, { data: profile }] = await Promise.all([
    supabase.from('goals').select('*, milestones(*)').eq('user_id', user!.id).order('created_at'),
    supabase.from('profiles').select('is_premium').eq('id', user!.id).single(),
  ])

  return <GoalsClient goals={goals || []} isPremium={profile?.is_premium ?? false} />
}
