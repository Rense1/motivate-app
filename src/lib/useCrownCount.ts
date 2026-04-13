'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useCrownCount() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    async function fetchCrowns() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: goals } = await supabase
        .from('goals')
        .select('id, milestones(is_achieved)')
        .eq('user_id', user.id)

      if (!goals) return

      let crowns = 0
      for (const goal of goals) {
        const ms: { is_achieved: boolean }[] = (goal as any).milestones || []
        if (ms.length < 2) continue
        const nonGold = ms.slice(0, -1)
        if (nonGold.length > 0 && nonGold.every(m => m.is_achieved)) crowns++
      }
      setCount(crowns)
    }
    fetchCrowns()
  }, [])

  return count
}
