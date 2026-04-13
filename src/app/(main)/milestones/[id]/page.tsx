import MilestonesClient from './MilestonesClient'

// generateStaticParams is required by output: 'export'.
// A single placeholder satisfies the build check; real IDs are resolved
// client-side by useParams() inside MilestonesClient.
export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function MilestonesPage() {
  return <MilestonesClient />
}
