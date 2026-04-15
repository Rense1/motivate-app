'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePremiumStore } from './premiumStore'

/**
 * 現在のユーザーの Premium ステータスを返す。
 * null = ロード中, true/false = 結果
 *
 * - コンポーネントのマウント毎に Supabase から再取得する（キャッシュしない）
 * - Zustand ストアで全コンポーネントに即時共有される
 */
export function usePremium(): boolean | null {
  const { isPremium, setPremium } = usePremiumStore()

  useEffect(() => {
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
  }, [])  // マウント毎に実行（ページ遷移で常に最新値を取得）

  return isPremium
}
