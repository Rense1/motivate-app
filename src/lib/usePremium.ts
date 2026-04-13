'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * 現在のユーザーの Premium ステータスを返す。
 * null = ロード中, true/false = 結果
 */
export function usePremium(): boolean | null {
  const [isPremium, setIsPremium] = useState<boolean | null>(null)

  useEffect(() => {
    async function fetchPremium() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsPremium(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single()

      setIsPremium(profile?.is_premium ?? false)
    }
    fetchPremium()
  }, [])

  return isPremium
}
