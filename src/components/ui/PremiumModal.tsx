'use client'

import { useEffect, useState } from 'react'
import { Gem, X, Check, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'

interface PremiumModalProps {
  isOpen: boolean
  onClose: () => void
  featureName?: string
}

export default function PremiumModal({ isOpen, onClose, featureName }: PremiumModalProps) {
  const { t, dict } = useI18n()
  const [isAnonymous, setIsAnonymous] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAnonymous(user?.is_anonymous ?? false)
    })
  }, [isOpen])

  if (!isOpen) return null

  const features = dict.premium.features

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8"
      onClick={onClose}
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
            <h2 className="text-base font-bold text-gray-800">{t('premium.title')}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {featureName && (
          <p className="text-sm text-gray-600 mb-4">
            <span className="font-semibold text-gray-800">{featureName}</span>
            {' '}{t('premium.featureTriggered')}
          </p>
        )}

        <div className="space-y-3 mb-5">
          {features.map(f => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">{f.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{f.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
              <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 text-center mb-3">
          <p className="text-yellow-700 font-black text-2xl">{t('premium.price')}</p>
          <p className="text-yellow-600 text-xs mt-1">{t('premium.priceSub')}</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center mb-4">
          <p className="text-gray-600 font-bold text-sm">{t('premium.comingSoon')}</p>
          <p className="text-gray-500 text-xs mt-0.5">{t('premium.comingSoonSub')}</p>
        </div>

        {isAnonymous && (
          <Link
            href="/signup"
            onClick={onClose}
            className="w-full bg-red-600 text-white py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 mb-3"
          >
            <UserPlus className="w-4 h-4" />
            {t('premium.createAccountCta')}
          </Link>
        )}

        <button
          onClick={onClose}
          className="w-full bg-gray-100 text-gray-600 py-3 rounded-2xl font-semibold text-sm"
        >
          {t('premium.close')}
        </button>
      </div>
    </div>
  )
}
