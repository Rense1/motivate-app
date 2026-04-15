'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Camera, Check, Gem, LogOut, X, Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import PremiumModal from '@/components/ui/PremiumModal'
import { usePremiumStore } from '@/lib/premiumStore'

export default function SettingsClient() {
  const supabase = createClient()
  const router   = useRouter()
  const { setPremium: setGlobalPremium } = usePremiumStore()

  const [profile, setProfile]             = useState<Profile | null>(null)
  const [email, setEmail]                 = useState('')
  const [displayName, setDisplayName]     = useState('')
  const [editingName, setEditingName]     = useState(false)
  const [savingName, setSavingName]       = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [loading, setLoading]             = useState(true)
  const [premiumModalOpen, setPremiumModalOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      setProfile(prof)
      setEmail(user.email || '')
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
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return null

  const isPremium = profile?.is_premium ?? false

  return (
    <div className="page-enter min-h-screen bg-gray-100">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur px-4 py-3 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-800">設定</h1>
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
                <span className="text-white text-2xl font-bold">
                  {(profile?.display_name || email)[0]?.toUpperCase() || 'R'}
                </span>
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow border border-gray-200">
              {uploadingAvatar
                ? <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                : <Camera className="w-4 h-4 text-gray-600" />}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <p className="text-sm text-gray-500">プロフィール写真を変更</p>
        </div>

        {/* プロフィール情報 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-0.5">ユーザー名</p>
              {editingName ? (
                <input autoFocus value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
                  className="text-gray-800 font-medium text-sm w-full outline-none border-b border-red-300"
                  placeholder="名前を入力" />
              ) : (
                <p className="text-gray-800 font-medium text-sm">{profile?.display_name || '未設定'}</p>
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
              <button onClick={() => setEditingName(true)} className="text-xs text-red-600 font-medium">編集</button>
            )}
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 mb-0.5">メールアドレス</p>
            <p className="text-gray-800 font-medium text-sm">{email}</p>
          </div>
        </div>

        {/* プレミアムプラン（表示のみ・変更不可） */}
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
              <p className="text-sm font-bold text-gray-800">プレミアムプラン</p>
              <p className={`text-xs font-medium ${isPremium ? 'text-yellow-600' : 'text-gray-400'}`}>
                {isPremium ? '✅ 利用中' : 'フリープラン — タップして詳細を見る'}
              </p>
            </div>
            {!isPremium && (
              <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200">
                ¥300
              </span>
            )}
          </div>
        </button>

        {/* ログアウト */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <button onClick={signOut} className="w-full px-4 py-4 flex items-center gap-3 text-red-600">
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">ログアウト</span>
          </button>
        </div>
      </div>

      <PremiumModal isOpen={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
    </div>
  )
}
