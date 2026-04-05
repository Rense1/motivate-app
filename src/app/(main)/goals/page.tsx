import { createClient } from '@/lib/supabase/server'
import GoalsClient from './GoalsClient'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: goals } = await supabase
    .from('goals')
    .select('*, milestones(*)')
    .eq('user_id', user!.id)
    .order('created_at')

  return <GoalsClient goals={goals || []} />
}
