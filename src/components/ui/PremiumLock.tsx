'use client'

import { useState } from 'react'
import { Gem, X } from 'lucide-react'

interface PremiumLockProps {
  children: React.ReactNode
  isPremium: boolean
  featureName?: string
}

/**
 * Wraps a UI section with a premium lock overlay when the user is not premium.
 * Usage:
 *   <PremiumLock isPremium={profile.is_premium} featureName="ビジョン画像">
 *     <YourComponent />
 *   </PremiumLock>
 */
export default function PremiumLock({ children, isPremium, featureName = 'この機能' }: PremiumLockProps) {
  const [modalOpen, setModalOpen] = useState(false)

  if (isPremium) return <>{children}</>

  return (
    <>
      <div className="relative">
        {/* Blurred / dimmed content */}
        <div className="pointer-events-none select-none opacity-40 blur-[2px]">
          {children}
        </div>

        {/* Lock overlay */}
        <button
          onClick={() => setModalOpen(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/10 backdrop-blur-[1px]"
          aria-label={`${featureName}はプレミアム限定です`}
        >
          <div className="bg-yellow-400 rounded-full p-2 shadow-md">
            <Gem className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs font-bold text-gray-700 bg-white/80 px-2 py-0.5 rounded-full shadow-sm">
            プレミアム限定
          </span>
        </button>
      </div>

      {/* Coming soon modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8"
          onClick={() => setModalOpen(false)}
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
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-2">
              <span className="font-semibold text-gray-800">{featureName}</span> はプレミアムプランの機能です。
            </p>
            <p className="text-gray-500 text-sm mb-6">
              プレミアムプランでは、複数目標の同時管理やスマホのホーム画面に目標を表示できるウィジェット機能など、目標達成をさらに加速する機能が使えます。
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center mb-4">
              <p className="text-yellow-700 font-bold text-sm">🚀 近日公開予定</p>
              <p className="text-yellow-600 text-xs mt-1">サブスクリプション機能を準備中です</p>
            </div>

            <button
              onClick={() => setModalOpen(false)}
              className="w-full bg-gray-100 text-gray-600 py-3 rounded-2xl font-semibold text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  )
}
