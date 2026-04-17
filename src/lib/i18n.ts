'use client'

import { createContext, useContext } from 'react'
import { ja } from '@/locales/ja'
import { en } from '@/locales/en'
import type { Translations } from '@/locales/ja'

export type Lang = 'ja' | 'en'

const dicts: Record<Lang, Translations> = { ja, en }

// Resolve a dot-notation path like 'goals.title' into a string value
function resolve(obj: unknown, path: string): string {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return path
    cur = (cur as Record<string, unknown>)[p]
  }
  return typeof cur === 'string' ? cur : path
}

export interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
  /** Raw dictionary for cases where the full object is needed (e.g. arrays) */
  dict: Translations
}

export const I18nContext = createContext<I18nContextValue>({
  lang: 'ja',
  setLang: () => {},
  t: (k) => resolve(ja, k),
  dict: ja,
})

export function useI18n(): I18nContextValue {
  return useContext(I18nContext)
}

export function makeT(lang: Lang) {
  const dict = dicts[lang]
  return (key: string) => resolve(dict, key)
}
