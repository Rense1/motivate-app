'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/ui/BottomNav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // getSession() はローカルストレージ/Cookie から読むため、ネットワーク不要で高速・安定
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setReady(true)
        return
      }

      // セッションなし → 匿名セッションを自動作成
      try {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) {
          console.error('[Anonymous Sign-in] failed:', error.message)
        }
      } catch (e) {
        console.error('[Anonymous Sign-in] unexpected error:', e)
      }
      setReady(true)
    })

    // トークンリフレッシュ失敗時に匿名セッションを再作成
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED') return
        if (event === 'SIGNED_OUT' && !session) {
          // settings の signOut() は /login にリダイレクトするのでここには届かない
          // ただしトークン期限切れで自動サインアウトした場合は再作成する
          try {
            await supabase.auth.signInAnonymously()
          } catch (e) {
            console.error('[Anonymous Sign-in] re-create failed:', e)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
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
