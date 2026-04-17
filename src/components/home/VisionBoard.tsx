'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal } from '@/lib/types'
import { ImagePlus, Edit2, Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface VisionBoardProps {
  goal: Goal
  onUpdate: (updated: Partial<Goal>) => void
}

export default function VisionBoard({ goal, onUpdate }: VisionBoardProps) {
  const { t } = useI18n()
  const [editingText, setEditingText] = useState(false)
  const [text, setText] = useState(goal.vision_text || '')
  const [uploading, setUploading] = useState(false)
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
          <p className="text-gray-400 text-sm">{t('home.visionPlaceholder')}</p>
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
              placeholder={t('home.visionTextPlaceholder')}
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
              <p className="text-white/60 text-sm flex-1">{t('home.visionTextHint')}</p>
            )}
            <Edit2 className="w-4 h-4 text-white/70 flex-shrink-0" />
          </div>
        )}
      </div>

      {/* Upload button */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute top-3 right-3 bg-white/80 backdrop-blur rounded-full p-2 shadow"
        aria-label={t('home.uploadImage')}
      >
        {uploading ? (
          <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <ImagePlus className="w-5 h-5 text-red-600" />
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  )
}
