import MilestonesClient from './MilestonesClient'

// Static export requires dynamicParams = false.
// Actual routing is handled client-side via useParams() in MilestonesClient.
export const dynamicParams = false

export function generateStaticParams() {
  // Placeholder so the build succeeds. Real IDs are resolved client-side.
  return [{ id: '_' }]
}

export default function MilestonesPage() {
  return <MilestonesClient />
}
