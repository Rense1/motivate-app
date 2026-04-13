import TasksClient from './TasksClient'

// generateStaticParams is required by output: 'export'.
// Placeholder covers both segments; real IDs are resolved client-side.
export function generateStaticParams() {
  return [{ id: '_', milestoneId: '_' }]
}

export default function TasksPage() {
  return <TasksClient />
}
