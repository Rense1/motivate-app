import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/ui/BottomNav'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-100 max-w-md mx-auto relative">
      <main className="pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
