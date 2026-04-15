/**
 * Premium ステータスのグローバルストア
 * - usePremium() で読む
 * - 設定画面など任意の場所から setPremium() で更新するとアプリ全体に即時反映される
 */
import { create } from 'zustand'

interface PremiumStore {
  isPremium: boolean | null   // null = ロード前
  loaded: boolean
  setPremium: (v: boolean) => void
  setLoaded: (v: boolean) => void
}

export const usePremiumStore = create<PremiumStore>((set) => ({
  isPremium: null,
  loaded: false,
  setPremium: (v) => set({ isPremium: v, loaded: true }),
  setLoaded: (v) => set({ loaded: v }),
}))
