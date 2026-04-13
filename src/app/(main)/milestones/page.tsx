import { Suspense } from 'react'
import MilestonesClient from './MilestonesClient'

export default function MilestonesPage() {
  return (
    <Suspense>
      <MilestonesClient />
    </Suspense>
  )
}
