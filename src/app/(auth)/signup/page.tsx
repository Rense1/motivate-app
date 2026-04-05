'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上で設定してください')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">確認メールを送信しました</h2>
          <p className="text-gray-500 text-sm mb-6">
            {email} に確認メールを送りました。メール内のリンクをクリックして登録を完了してください。
          </p>
          <Link href="/login" className="text-red-600 font-semibold hover:underline">
            ログインページへ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">新規登録</h1>
        <p className="text-center text-gray-500 text-sm mb-6">アカウントを作成して目標管理を始めよう</p>

        <form onSubmit={handleSignup} className="space-y-4">
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
              placeholder="6文字以上"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード（確認）</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? '登録中...' : 'アカウントを作成'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-red-600 font-semibold hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  )
}
