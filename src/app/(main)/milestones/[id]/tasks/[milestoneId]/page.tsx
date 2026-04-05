import { createClient } from '@/lib/supabase/server'
import TasksClient from './TasksClient'
import { notFound } from 'next/navigation'

export default async function TasksPage({ params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  const { id, milestoneId } = await params
  const supabase = await createClient()

  const { data: milestone } = await supabase
    .from('milestones')
    .select('*')
    .eq('id', milestoneId)
    .single()

  if (!milestone) notFound()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('milestone_id', milestoneId)
    .order('order_index')

  return <TasksClient goalId={id} milestone={milestone} tasks={tasks || []} />
}
