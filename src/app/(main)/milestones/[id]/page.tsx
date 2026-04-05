import { createClient } from '@/lib/supabase/server'
import MilestonesClient from './MilestonesClient'
import { notFound } from 'next/navigation'

export default async function MilestonesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .single()

  if (!goal) notFound()

  const { data: milestones } = await supabase
    .from('milestones')
    .select('*')
    .eq('goal_id', id)
    .order('order_index')

  return <MilestonesClient goal={goal} milestones={milestones || []} />
}
