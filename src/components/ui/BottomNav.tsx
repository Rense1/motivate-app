'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Target, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-6 py-3 flex justify-around items-center z-40">
      <Link
        href="/home"
        className={`flex flex-col items-center gap-1 ${pathname === '/home' ? 'text-red-600' : 'text-gray-400'}`}
      >
        <Home className="w-6 h-6" />
        <span className="text-xs">ホーム</span>
      </Link>

      <Link
        href="/goals"
        className={`flex flex-col items-center gap-1 ${pathname.startsWith('/goals') || pathname.startsWith('/milestones') ? 'text-red-600' : 'text-gray-400'}`}
      >
        <Target className="w-6 h-6" />
        <span className="text-xs">目標</span>
      </Link>

      <button
        onClick={signOut}
        className="flex flex-col items-center gap-1 text-gray-400"
      >
        <LogOut className="w-6 h-6" />
        <span className="text-xs">ログアウト</span>
      </button>
    </nav>
  )
}
