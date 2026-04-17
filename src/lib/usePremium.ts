'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePremiumStore } from './premiumStore'

/**
 * 現在のユーザーの Premium ステータスを返す。
 * null = ロード中, true/false = 結果
 *
 * - Zustand ストアにキャッシュ済みの場合は Supabase を叩かない
 * - SettingsClient など任意の場所から setPremium() で更新するとアプリ全体に即時反映される
 */
export function usePremium(): boolean | null {
  const { isPremium, loaded, setPremium } = usePremiumStore()

  useEffect(() => {
    // 既にロード済みならフェッチしない（ページ遷移ごとの無駄なネットワーク往復を防ぐ）
    if (loaded) return

    let cancelled = false

    async function fetchPremium() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) { setPremium(false); return }

      let { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single()

      // プロファイル行が存在しない場合は自動作成する
      if (!profile) {
        const { data: upserted } = await supabase
          .from('profiles')
          .upsert({ id: user.id }, { onConflict: 'id' })
          .select('is_premium')
          .single()
        profile = upserted
      }

      if (!cancelled) {
        setPremium(profile?.is_premium ?? false)
      }
    }

    fetchPremium()
    return () => { cancelled = true }
  }, [loaded, setPremium])

  return isPremium
}
