'use client'

import { Gem, X, Check } from 'lucide-react'

interface PremiumModalProps {
  isOpen: boolean
  onClose: () => void
  featureName?: string
}

const FEATURE_LIST = [
  {
    icon: '📅',
    title: '詳細な頻度・日付設定',
    desc: 'N日/週/月にM回などのカスタム頻度と、開始日・終了日をタスクごとに設定',
  },
  {
    icon: '🔔',
    title: '通知設定',
    desc: '毎週◯曜日◯時・指定日時など、複数の通知をタスクごとに自由に設定',
  },
  {
    icon: '📱',
    title: 'ホーム画面ウィジェット（Android）',
    desc: '現在取り組み中のタスクをホーム画面に常時表示',
  },
  {
    icon: '🎯',
    title: '目標数の上限なし',
    desc: '無料プランは目標2つまで。Premiumなら無制限で追加可能',
  },
]

export default function PremiumModal({ isOpen, onClose, featureName = 'この機能' }: PremiumModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-8"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-400 rounded-full p-1.5">
              <Gem className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-gray-800">プレミアムプラン</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* トリガーされた機能名 */}
        <p className="text-sm text-gray-600 mb-4">
          <span className="font-semibold text-gray-800">{featureName}</span>
          はプレミアムプランの機能です。
        </p>

        {/* 機能一覧 */}
        <div className="space-y-3 mb-5">
          {FEATURE_LIST.map(f => (
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

        {/* 価格バッジ */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 text-center mb-3">
          <p className="text-yellow-700 font-black text-2xl">¥300</p>
          <p className="text-yellow-600 text-xs mt-1">買い切り — 一度購入すれば永久に使えます</p>
        </div>

        {/* 準備中バッジ */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center mb-4">
          <p className="text-gray-600 font-bold text-sm">🚀 購入機能は近日公開予定</p>
          <p className="text-gray-500 text-xs mt-0.5">しばらくお待ちください</p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-gray-100 text-gray-600 py-3 rounded-2xl font-semibold text-sm"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}
