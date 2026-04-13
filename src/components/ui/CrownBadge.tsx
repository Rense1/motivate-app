'use client'

import { useState, useEffect } from 'react'
import { Crown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CrownBadge() {
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
        // Crown = all non-gold (non-last) milestones achieved
        const nonGold = ms.slice(0, -1)
        if (nonGold.length > 0 && nonGold.every(m => m.is_achieved)) crowns++
      }
      setCount(crowns)
    }
    fetchCrowns()
  }, [])

  // Don't render until fetched, and hide if zero
  if (count === null || count === 0) return null

  return (
    <div
      className="fixed z-40 flex items-center gap-1 bg-white/95 backdrop-blur shadow-md border border-yellow-200 rounded-full px-2.5 py-1.5 pointer-events-none"
      style={{ top: 14, right: 16 }}
    >
      <Crown className="w-3.5 h-3.5 text-yellow-500" />
      <span className="text-xs font-black text-yellow-600">{count}</span>
    </div>
  )
}
