'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Camera, Check, Gem, LogOut, X, Crown, Globe, UserPlus, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PremiumModal from '@/components/ui/PremiumModal'
import { usePremiumStore } from '@/lib/premiumStore'
import { useI18n } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { isAnonymousUser } from '@/lib/userUtils'

export default function SettingsClient() {
  const { t, lang, setLang } = useI18n()
  const supabase = createClient()
  const router   = useRouter()
  const { setPremium: setGlobalPremium } = usePremiumStore()

  const [profile, setProfile]             = useState<Profile | null>(null)
  const [email, setEmail]                 = useState('')
  const [isAnonymous, setIsAnonymous]     = useState(false)
  const [displayName, setDisplayName]     = useState('')
  const [editingName, setEditingName]     = useState(false)
  const [savingName, setSavingName]       = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [loading, setLoading]             = useState(true)
  const [premiumModalOpen, setPremiumModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      setIsAnonymous(isAnonymousUser(user))
      setEmail(user.email || '')

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      setProfile(prof)
      setDisplayName(prof?.display_name || '')
      if (prof) setGlobalPremium(prof.is_premium ?? false)
      setLoading(false)
    }
    fetchData()
  }, [])

  async function saveDisplayName() {
    if (!profile) return
    setSavingName(true)
    await supabase.from('profiles')
      .update({ display_name: displayName.trim() || null })
      .eq('id', profile.id)
    setProfile(prev => prev ? { ...prev, display_name: displayName.trim() || null } : prev)
    setEditingName(false)
    setSavingName(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
      setProfile(prev => prev ? { ...prev, avatar_url: url } : prev)
    }
    setUploadingAvatar(false)
  }

  async function signOut() {
    sessionStorage.setItem('manual_signout', '1')
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function deleteAccount() {
    setDeleting(true)
    setDeleteError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setDeleteError('セッションが見つかりません。再度ログインしてください。')
        setDeleting(false)
        return
      }
      const res = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setDeleteError(body.error || 'エラーが発生しました')
        setDeleting(false)
        return
      }
    } catch {
      setDeleteError('通信エラーが発生しました')
      setDeleting(false)
      return
    }
    sessionStorage.setItem('manual_signout', '1')
    try {
      await supabase.auth.signOut()
    } catch {
      // アカウント削除後はセッションが無効なので無視
    }
    router.push('/login')
    router.refresh()
  }

  function handleLangChange(l: Lang) {
    setLang(l)
  }

  if (loading) return null

  const isPremium = profile?.is_premium ?? false
  const displayInitial = (profile?.display_name || email || 'R')[0]?.toUpperCase() || 'R'

  return (
    <div className="page-enter min-h-screen bg-gray-100">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur px-4 py-3 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-800">{t('settings.title')}</h1>
      </div>

      <div className="p-4 space-y-4">

        {/* アバター */}
        <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3">
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-red-100" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center ring-2 ring-red-100">
                <span className="text-white text-2xl font-bold">{displayInitial}</span>
              </div>
            )}
            {!isAnonymous && (
              <button onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow border border-gray-200">
                {uploadingAvatar
                  ? <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-4 h-4 text-gray-600" />}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          {!isAnonymous && <p className="text-sm text-gray-500">{t('settings.avatar')}</p>}
          {isAnonymous && (
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">{t('settings.guestAccount')}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('settings.guestNote')}</p>
              <Link
                href="/signup"
                className="mt-3 inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm hover:bg-red-700 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {t('settings.createAccount')}
              </Link>
            </div>
          )}
        </div>

        {/* プロフィール情報（匿名以外のみ） */}
        {!isAnonymous && (
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">{t('settings.username')}</p>
                {editingName ? (
                  <input autoFocus value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
                    className="text-gray-800 font-medium text-sm w-full outline-none border-b border-red-300"
                    placeholder={t('settings.unset')} />
                ) : (
                  <p className="text-gray-800 font-medium text-sm">{profile?.display_name || t('settings.unset')}</p>
                )}
              </div>
              {editingName ? (
                <div className="flex gap-2">
                  <button onClick={() => { setEditingName(false); setDisplayName(profile?.display_name || '') }}
                    className="p-1.5 text-gray-400"><X className="w-4 h-4" /></button>
                  <button onClick={saveDisplayName} disabled={savingName}
                    className="p-1.5 text-red-600"><Check className="w-4 h-4" /></button>
                </div>
              ) : (
                <button onClick={() => setEditingName(true)} className="text-xs text-red-600 font-medium">
                  {t('settings.editName')}
                </button>
              )}
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-500 mb-0.5">{t('settings.email')}</p>
              <p className="text-gray-800 font-medium text-sm">{email || t('settings.noEmail')}</p>
            </div>
          </div>
        )}

        {/* プレミアムプラン */}
        <button
          onClick={() => setPremiumModalOpen(true)}
          className={`w-full rounded-2xl overflow-hidden text-left ${
            isPremium
              ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200'
              : 'bg-white border border-gray-100'
          }`}
        >
          <div className="px-4 py-4 flex items-center gap-3">
            <div className={`rounded-full p-2 ${isPremium ? 'bg-yellow-400' : 'bg-gray-200'}`}>
              {isPremium
                ? <Crown className="w-4 h-4 text-white" />
                : <Gem className="w-4 h-4 text-gray-500" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800">{t('settings.premiumPlan')}</p>
              <p className={`text-xs font-medium ${isPremium ? 'text-yellow-600' : 'text-gray-400'}`}>
                {isPremium ? t('settings.usingPremium') : t('settings.freePlan')}
              </p>
            </div>
            {!isPremium && (
              <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200">
                ¥300
              </span>
            )}
          </div>
        </button>

        {/* 言語設定 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="px-4 py-4 flex items-center gap-3">
            <Globe className="w-5 h-5 text-gray-500" />
            <p className="text-sm font-medium text-gray-800 flex-1">{t('settings.language')}</p>
            <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs font-bold">
              <button
                onClick={() => handleLangChange('ja')}
                className={`px-3 py-1.5 transition ${lang === 'ja' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'}`}
              >
                {t('settings.languageJa')}
              </button>
              <button
                onClick={() => handleLangChange('en')}
                className={`px-3 py-1.5 transition ${lang === 'en' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'}`}
              >
                {t('settings.languageEn')}
              </button>
            </div>
          </div>
        </div>

        {/* ログアウト（匿名以外のみ） */}
        {!isAnonymous && (
          <div className="bg-white rounded-2xl overflow-hidden">
            <button onClick={signOut} className="w-full px-4 py-4 flex items-center gap-3 text-red-600">
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">{t('settings.logout')}</span>
            </button>
          </div>
        )}

        {/* アカウント削除（匿名以外のみ） */}
        {!isAnonymous && (
          <div className="bg-white rounded-2xl overflow-hidden">
            <button onClick={() => { setDeleteError(''); setDeleteConfirmOpen(true) }} className="w-full px-4 py-4 flex items-center gap-3 text-gray-400 hover:text-red-500 transition">
              <Trash2 className="w-5 h-5" />
              <span className="text-sm font-medium">{t('settings.deleteAccount')}</span>
            </button>
          </div>
        )}
      </div>

      <PremiumModal isOpen={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />

      {/* アカウント削除確認モーダル */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
        title={t('settings.deleteAccountConfirmTitle')}
      >
        <p className="text-sm text-gray-600 mb-6">{t('settings.deleteAccountConfirmMsg')}</p>
        {deleteError && <p className="text-red-500 text-sm text-center mb-4">{deleteError}</p>}
        <div className="flex flex-col gap-3">
          <button
            onClick={deleteAccount}
            disabled={deleting}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50"
          >
            {deleting ? t('settings.deleting') : t('settings.deleteAccountConfirm')}
          </button>
          <button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={deleting}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition disabled:opacity-50"
          >
            {t('settings.deleteAccountCancel')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
