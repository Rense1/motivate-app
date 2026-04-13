'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import { ImagePlus, Edit2, Check, Crown, X } from 'lucide-react'

interface VisionBoardProps {
  goal: Goal
  onUpdate: (updated: Partial<Goal>) => void
  isPremium: boolean
}

export default function VisionBoard({ goal, onUpdate, isPremium }: VisionBoardProps) {
  const [editingText, setEditingText] = useState(false)
  const [text, setText] = useState(goal.vision_text || '')
  const [uploading, setUploading] = useState(false)
  const [premiumModalOpen, setPremiumModalOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split('.').pop()
    const path = `${user.id}/${goal.id}.${ext}`

    const { error } = await supabase.storage.from('vision-images').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('vision-images').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      await supabase.from('goals').update({ vision_image_url: url }).eq('id', goal.id)
      onUpdate({ vision_image_url: url })
    }
    setUploading(false)
  }

  async function saveText() {
    await supabase.from('goals').update({ vision_text: text }).eq('id', goal.id)
    onUpdate({ vision_text: text })
    setEditingText(false)
  }

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden">
      {/* Background image */}
      {goal.vision_image_url ? (
        <img
          src={goal.vision_image_url}
          alt="Vision"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-800">
          <ImagePlus className="w-10 h-10 text-gray-400" />
          <p className="text-gray-400 text-sm">理想の未来の画像を追加</p>
        </div>
      )}

      {/* Overlay for text */}
      {goal.vision_image_url && (
        <div className="absolute inset-0 bg-black/30" />
      )}

      {/* Vision text overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {editingText ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              className="flex-1 bg-white/20 backdrop-blur text-white placeholder-white/60 rounded-xl px-3 py-2 text-sm outline-none border border-white/40"
              placeholder="理想の未来を一言で..."
            />
            <button onClick={saveText} className="bg-white rounded-xl p-2">
              <Check className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ) : (
          <div
            className="flex items-end gap-2 cursor-pointer"
            onClick={() => setEditingText(true)}
          >
            {goal.vision_text ? (
              <p className="text-white font-bold text-lg drop-shadow-lg flex-1">{goal.vision_text}</p>
            ) : (
              <p className="text-white/60 text-sm flex-1">タップしてビジョンを追加...</p>
            )}
            <Edit2 className="w-4 h-4 text-white/70 flex-shrink-0" />
          </div>
        )}
      </div>

      {/* Upload button — premium only */}
      <button
        onClick={() => isPremium ? fileRef.current?.click() : setPremiumModalOpen(true)}
        disabled={uploading}
        className="absolute top-3 right-3 bg-white/80 backdrop-blur rounded-full p-2 shadow"
        aria-label={isPremium ? '画像をアップロード' : 'プレミアム限定機能'}
      >
        {uploading ? (
          <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        ) : isPremium ? (
          <ImagePlus className="w-5 h-5 text-red-600" />
        ) : (
          <Crown className="w-5 h-5 text-yellow-500" />
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Premium upsell modal */}
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
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-bold text-gray-800">プレミアムプラン</h2>
              </div>
              <button onClick={() => setPremiumModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              <span className="font-semibold text-gray-800">ビジョン画像のアップロード</span> はプレミアムプランの機能です。プレミアムでは画像でモチベーションを高め、複数ゴールも管理できます。
            </p>
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
