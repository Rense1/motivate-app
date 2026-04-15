'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'

// Google アイコン SVG
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  // ── Android: deep link コールバック処理 ─────────────────────────────────
  // Supabase が com.revive.app://login-callback?code=xxx でリダイレクトしてきた
  // App プラグインで URL を受け取り、セッション交換を行う
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cleanup: (() => void) | undefined

    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', async ({ url }) => {
        if (!url.startsWith('com.revive.app://')) return

        // URL から code / access_token / refresh_token を取得
        const urlObj = new URL(url.replace('com.revive.app://', 'https://revive.app/'))

        const code = urlObj.searchParams.get('code')
        if (code) {
          // PKCE フロー: code を session に交換
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) {
            router.replace('/home')
            router.refresh()
          } else {
            setError('Googleログインに失敗しました: ' + error.message)
          }
          return
        }

        // implicit フロー: hash に access_token が含まれる場合
        const hash = urlObj.hash.slice(1)
        if (hash) {
          const params = new URLSearchParams(hash)
          const accessToken  = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (!error) {
              router.replace('/home')
              router.refresh()
            } else {
              setError('Googleログインに失敗しました: ' + error.message)
            }
          }
        }
      }).then(handle => {
        cleanup = () => handle.remove()
      })
    })

    return () => cleanup?.()
  }, [])

  // ── メール/パスワード ログイン ────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/home')
      router.refresh()
    }
  }

  // ── Google OAuth ─────────────────────────────────────────────────────
  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError('')

    if (Capacitor.isNativePlatform()) {
      // Android: 外部ブラウザで Google 認証 → deep link でアプリに戻る
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'com.revive.app://login-callback',
          skipBrowserRedirect: true,
        },
      })
      if (error) { setError(error.message); setGoogleLoading(false); return }
      if (data?.url) {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: data.url })
      }
      setGoogleLoading(false)
    } else {
      // Web: 通常の OAuth リダイレクト
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) { setError(error.message); setGoogleLoading(false) }
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">

        {/* ロゴ */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.svg" alt="REVIVE" className="w-20 h-20 mb-3" />
          <span className="text-xs font-black tracking-widest text-red-600 uppercase">REVIVE</span>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">ログイン</h1>
        <p className="text-center text-gray-500 text-sm mb-6">目標を管理して夢を実現しよう</p>

        {/* Google ログイン */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
        >
          {googleLoading
            ? <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            : <GoogleIcon />
          }
          Googleでログイン
        </button>

        {/* 区切り */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-white px-2">またはメールで</span>
          </div>
        </div>

        {/* メール/パスワード */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800"
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          アカウントをお持ちでない方は{' '}
          <Link href="/signup" className="text-red-600 font-semibold hover:underline">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  )
}
