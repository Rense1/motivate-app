'use client'

import { Gem, X, Check } from 'lucide-react'

interface PremiumModalProps {
  isOpen: boolean
  onClose: () => void
  /** モーダルに表示する機能名 */
  featureName?: string
}

const FEATURE_LIST = [
  { icon: '📱', text: 'ホーム画面ウィジェット（iOS / Android）' },
  { icon: '🎯', text: '目標数の上限なし（無料は2つまで）' },
  { icon: '📅', text: 'タスク頻度の詳細設定（毎週2回・3日に1回・毎月◯回）' },
  { icon: '🔔', text: '通知の詳細設定（正確な時間・複数通知）' },
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
            <h2 className="text-base font-bold text-gray-800">プレミアム機能</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* 機能説明 */}
        <p className="text-sm text-gray-600 mb-4">
          <span className="font-semibold text-gray-800">{featureName}</span>
          はプレミアムプランの機能です。
        </p>

        {/* 機能一覧 */}
        <div className="space-y-2.5 mb-5">
          {FEATURE_LIST.map(f => (
            <div key={f.text} className="flex items-center gap-2.5">
              <span className="text-base flex-shrink-0">{f.icon}</span>
              <p className="text-sm text-gray-700 flex-1">{f.text}</p>
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* 価格バッジ */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 text-center mb-3">
          <p className="text-yellow-700 font-black text-lg">¥300</p>
          <p className="text-yellow-600 text-xs mt-0.5">買い切り — 一度購入すれば永久に使えます</p>
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
