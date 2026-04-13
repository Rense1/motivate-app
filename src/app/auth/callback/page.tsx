'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

/**
 * OAuth callback page — handles both web and Capacitor deep-link flows.
 * Supabase SSR detects the session from the URL hash/fragment automatically.
 */
export default function AuthCallbackPage() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Already logged in? Go home immediately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/home')
        return
      }
    })

    // Listen for the SIGNED_IN event fired by Supabase after exchanging the code.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/home')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">認証中...</p>
      </div>
    </div>
  )
}
