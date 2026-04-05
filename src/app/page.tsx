import { redirect } from 'next/navigation'

// Root path is handled by (main)/page.tsx via route group
// Middleware ensures auth before reaching here
export default function RootPage() {
  redirect('/home')
}
