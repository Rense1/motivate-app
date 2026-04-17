'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { I18nContext, makeT, type Lang } from '@/lib/i18n'
import { ja } from '@/locales/ja'
import { en } from '@/locales/en'
import type { Translations } from '@/locales/ja'

const STORAGE_KEY = 'app_language'

const dicts: Record<Lang, Translations> = { ja, en }

// ── 言語選択画面 ─────────────────────────────────────────────────────────────
function LanguageSelectScreen({ onSelect }: { onSelect: (l: Lang) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex flex-col items-center justify-center px-8"
      style={{ background: 'linear-gradient(145deg, #ef4444 0%, #991b1b 100%)' }}
    >
      {/* Logo */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
        className="flex flex-col items-center mb-12"
      >
        <img src="/logo.svg" alt="REVIVE" className="w-24 h-24 mb-4" />
        <span className="text-white/80 text-xs font-black tracking-widest uppercase">REVIVE</span>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-10"
      >
        <p className="text-white text-xl font-bold mb-1">言語を選択してください</p>
        <p className="text-white/70 text-sm">Select your language</p>
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="w-full max-w-xs space-y-3"
      >
        <button
          onClick={() => onSelect('ja')}
          className="w-full py-4 rounded-2xl bg-white text-red-600 font-bold text-lg shadow-lg active:scale-95 transition-transform"
        >
          🇯🇵　日本語
        </button>
        <button
          onClick={() => onSelect('en')}
          className="w-full py-4 rounded-2xl bg-white/15 text-white font-bold text-lg border border-white/30 active:scale-95 transition-transform"
        >
          🇺🇸　English
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [selecting, setSelecting] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (saved === 'ja' || saved === 'en') {
      setLangState(saved)
    } else {
      setSelecting(true)
    }
    setLoaded(true)
  }, [])

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l)
    setLangState(l)
    setSelecting(false)
    document.documentElement.lang = l
  }, [])

  // Keep html[lang] in sync
  useEffect(() => {
    if (lang) document.documentElement.lang = lang
  }, [lang])

  if (!loaded) return null

  if (selecting || !lang) {
    return (
      <AnimatePresence>
        <LanguageSelectScreen onSelect={setLang} />
      </AnimatePresence>
    )
  }

  const t = makeT(lang)
  const dict = dicts[lang]

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dict }}>
      {children}
    </I18nContext.Provider>
  )
}
