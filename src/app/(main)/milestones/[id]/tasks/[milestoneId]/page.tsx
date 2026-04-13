import TasksClient from './TasksClient'

// Static export: dynamicParams must be false.
// A placeholder is generated so the build succeeds; real IDs are resolved
// client-side via useParams() in TasksClient — no actual navigation to '_'.
export const dynamicParams = false

export function generateStaticParams() {
  // Placeholder covering both segments so the build succeeds.
  // Real IDs are resolved client-side via useParams() in TasksClient.
  return [{ id: '_', milestoneId: '_' }]
}

export default function TasksPage() {
  return <TasksClient />
}
