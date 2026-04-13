'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Camera, Check, Gem, LogOut, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsClient() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [premiumModalOpen, setPremiumModalOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(prof)
      setEmail(user.email || '')
      setDisplayName(prof?.display_name || '')
      setLoading(false)
    }
    fetchData()
  }, [])

  async function saveDisplayName() {
    if (!profile) return
    setSavingName(true)
    await supabase.from('profiles').update({ display_name: displayName.trim() || null }).eq('id', profile.id)
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
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return null

  return (
    <div className="page-enter min-h-screen bg-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur px-4 py-3 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-800">設定</h1>
      </div>

      <div className="p-4 space-y-4">

        {/* Avatar + name section */}
        <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-red-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center ring-2 ring-red-100">
                <span className="text-white text-2xl font-bold">
                  {(profile?.display_name || email)[0]?.toUpperCase() || 'M'}
                </span>
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow border border-gray-200"
            >
              {uploadingAvatar ? (
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <p className="text-sm text-gray-500">プロフィール写真を変更</p>
        </div>

        {/* Profile info */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-0.5">ユーザー名</p>
              {editingName ? (
                <input
                  autoFocus
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
                  className="text-gray-800 font-medium text-sm w-full outline-none border-b border-red-300"
                  placeholder="名前を入力"
                />
              ) : (
                <p className="text-gray-800 font-medium text-sm">
                  {profile?.display_name || '未設定'}
                </p>
              )}
            </div>
            {editingName ? (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingName(false); setDisplayName(profile?.display_name || '') }}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={saveDisplayName}
                  disabled={savingName}
                  className="p-1.5 text-red-600 hover:text-red-700"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-xs text-red-600 font-medium"
              >
                編集
              </button>
            )}
          </div>

          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 mb-0.5">メールアドレス</p>
            <p className="text-gray-800 font-medium text-sm">{email}</p>
          </div>
        </div>

        {/* Premium plan */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <button
            onClick={() => setPremiumModalOpen(true)}
            className="w-full px-4 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-yellow-400 rounded-full p-2">
                <Gem className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">プレミアムプラン</p>
                <p className="text-xs text-gray-500">
                  {profile?.is_premium ? '利用中' : 'フリープラン'}
                </p>
              </div>
            </div>
            {!profile?.is_premium && (
              <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                アップグレード
              </span>
            )}
          </button>
        </div>

        {/* Logout */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <button
            onClick={signOut}
            className="w-full px-4 py-4 flex items-center gap-3 text-red-600"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">ログアウト</span>
          </button>
        </div>
      </div>

      {/* Premium modal */}
      {premiumModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8"
          onClick={() => setPremiumModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-yellow-400 rounded-full p-1.5">
                  <Gem className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-bold text-gray-800">プレミアムプラン</h2>
              </div>
              <button onClick={() => setPremiumModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { icon: '🎯', label: '複数目標の同時管理' },
                { icon: '📱', label: 'ホーム画面ウィジェットで目標を常に表示' },
                { icon: '📊', label: '詳細な進捗分析レポート' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <p className="text-sm text-gray-700">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center mb-4">
              <p className="text-yellow-700 font-bold text-sm">🚀 近日公開予定</p>
              <p className="text-yellow-600 text-xs mt-1">サブスクリプション機能を準備中です</p>
            </div>
            <button
              onClick={() => setPremiumModalOpen(false)}
              className="w-full bg-gray-100 text-gray-600 py-3 rounded-2xl font-semibold text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
