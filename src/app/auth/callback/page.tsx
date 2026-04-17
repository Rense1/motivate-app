'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useI18n } from '@/lib/i18n'

function CallbackInner() {
  const supabase     = createClient()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function handleCallback() {
      // ── PKCE フロー: URL クエリに ?code= がある場合 ───────────────────
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setErrorMsg(error.message)
        } else {
          router.replace('/home')
          router.refresh()
        }
        return
      }

      // ── エラー返却 ────────────────────────────────────────────────────
      const errorParam = searchParams.get('error_description') ?? searchParams.get('error')
      if (errorParam) {
        setErrorMsg(errorParam)
        return
      }

      // ── implicit フロー / 既存セッション ─────────────────────────────
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/home')
        router.refresh()
        return
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          subscription.unsubscribe()
          router.replace('/home')
          router.refresh()
        }
      })

      const timeout = setTimeout(() => {
        subscription.unsubscribe()
        setErrorMsg(t('callback.timeout'))
      }, 10_000)

      return () => {
        clearTimeout(timeout)
        subscription.unsubscribe()
      }
    }

    handleCallback()
  }, [])

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <p className="text-red-500 text-sm mb-4">{errorMsg}</p>
          <a href="/login" className="text-red-600 font-semibold hover:underline text-sm">
            {t('callback.backToLogin')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">{t('callback.loading')}</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  )
}
