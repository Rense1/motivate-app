'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

// 月ごとの日数（うるう年は別途考慮）
function daysInMonth(year: number, month: number): number {
  if (month === 0) return 31
  return new Date(year || 2000, month, 0).getDate()
}

export default function SignupPage() {
  const { t, dict } = useI18n()
  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [birthYear, setBirthYear]           = useState('')
  const [birthMonth, setBirthMonth]         = useState(0)   // 0 = 未選択, 1-12
  const [birthDay, setBirthDay]             = useState(0)   // 0 = 未選択
  const [occupation, setOccupation]         = useState('')
  const [error, setError]                   = useState('')
  const [loading, setLoading]               = useState(false)
  const [done, setDone]                     = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  const year = parseInt(birthYear) || 0
  const maxDay = daysInMonth(year, birthMonth)

  // 日が月の上限を超えたらリセット
  useEffect(() => {
    if (birthDay > maxDay) setBirthDay(0)
  }, [birthMonth, birthYear, maxDay])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.passwordMin'))
      return
    }

    setLoading(true)

    // 現在匿名ユーザーかどうか確認
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const isAnonymous = currentUser?.is_anonymous === true ||
      (currentUser?.app_metadata as Record<string, unknown>)?.['provider'] === 'anonymous'

    let userId: string | null = null
    let signupError: string | null = null

    if (isAnonymous && currentUser) {
      // 匿名アカウントをメール/パスワードアカウントにアップグレード
      const { data, error } = await supabase.auth.updateUser(
        { email, password },
        { emailRedirectTo: `${window.location.origin}/auth/callback` },
      )
      if (error) {
        signupError = error.message
      } else {
        userId = data.user?.id ?? null
        setDone(true)
      }
    } else {
      // 通常のサインアップ
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        signupError = error.message
      } else {
        userId = data.user?.id ?? null
        setDone(true)
      }
    }

    if (signupError) {
      setError(signupError)
      setLoading(false)
      return
    }

    // プロフィールに生年月日・職業を保存
    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        birth_year:  year || null,
        birth_month: birthMonth || null,
        birth_day:   birthDay || null,
        occupation:  occupation || null,
      }, { onConflict: 'id' })
    }

    setLoading(false)
  }

  // ── 登録完了画面 ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('auth.emailSentTitle')}</h2>
          <p className="text-gray-500 text-sm mb-6">
            {email} {t('auth.emailSentDesc')}
          </p>
          <Link href="/login" className="text-red-600 font-semibold hover:underline">
            {t('auth.toLogin')}
          </Link>
        </div>
      </div>
    )
  }

  const occupations = dict.auth.occupations

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">

        {/* ロゴ */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.svg" alt="REVIVE" className="w-20 h-20 mb-3" />
          <span className="text-xs font-black tracking-widest text-red-600 uppercase">REVIVE</span>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">{t('auth.signupTitle')}</h1>
        <p className="text-center text-gray-500 text-sm mb-6">{t('auth.signupSubtitle')}</p>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* メール */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800"
              placeholder={t('auth.emailPlaceholder')}
            />
          </div>

          {/* パスワード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800"
              placeholder={t('auth.passwordPlaceholder')}
            />
          </div>

          {/* パスワード確認 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.passwordConfirm')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800"
              placeholder="••••••••"
            />
          </div>

          {/* 生年月日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.birthYear')}</label>
            <div className="flex gap-2">
              {/* 年（手動入力） */}
              <input
                type="number"
                value={birthYear}
                onChange={e => setBirthYear(e.target.value)}
                placeholder={t('auth.birthYearPlaceholder')}
                min={1900}
                max={new Date().getFullYear()}
                className="w-28 border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800 text-sm"
              />
              {/* 月 */}
              <select
                value={birthMonth}
                onChange={e => setBirthMonth(Number(e.target.value))}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800 text-sm bg-white"
              >
                <option value={0}>{t('auth.selectMonth')}</option>
                {dict.auth.months.map((label, i) => (
                  <option key={i + 1} value={i + 1}>{label}</option>
                ))}
              </select>
              {/* 日 */}
              <select
                value={birthDay}
                onChange={e => setBirthDay(Number(e.target.value))}
                disabled={birthMonth === 0}
                className="w-20 border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800 text-sm bg-white disabled:opacity-40"
              >
                <option value={0}>{t('auth.selectDay')}</option>
                {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 職業 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.occupation')}</label>
            <select
              value={occupation}
              onChange={e => setOccupation(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800 bg-white"
            >
              <option value="">{t('auth.selectOccupation')}</option>
              {occupations.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? t('auth.signingUp') : t('auth.signupButton')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('auth.hasAccount')}{' '}
          <Link href="/login" className="text-red-600 font-semibold hover:underline">
            {t('auth.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
