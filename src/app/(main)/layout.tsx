'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/ui/BottomNav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setReady(true)
        return
      }

      // 非ログインユーザーは匿名セッションを自動作成
      // (Supabase ダッシュボード > Authentication > Providers で Anonymous を有効化すること)
      try {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) {
          // Supabase Dashboard > Authentication > Providers > Anonymous Sign-ins を有効化してください
          console.error('[Anonymous Sign-in] failed:', error.message)
        }
      } catch (e) {
        console.error('[Anonymous Sign-in] unexpected error:', e)
      }
      setReady(true)
    })
  }, [])

  if (!ready) return null

  return (
    <div className="min-h-screen bg-gray-100 max-w-md mx-auto relative">
      <main className="pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
