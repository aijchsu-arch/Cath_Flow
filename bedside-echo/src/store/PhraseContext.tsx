/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { BUILTIN_CATEGORIES, MY_PHRASES_CATEGORY } from '../data/phraseLibrary'

// 個人自訂片語。
//
// TODO(帳號): 第五階段綁定 HIS 登入帳號後:
//   - MOCK_USER_ID 改為真實使用者 ID
//   - 個人片語改存後端資料庫,跨裝置同步(localStorage 只當離線快取)
//
// 儲存機制選擇:localStorage。
// 理由:片語是少量純文字(幾 KB),同步 API 簡單、重新整理後不消失;
// 專案目前沒有禁用 localStorage 的限制。若日後需存大量資料再換 IndexedDB
// (注意:iOS Safari 對兩者適用同一套清除政策 —— 網站 7 天未使用可能被清,
// 這也是第五階段要改存後端的原因之一)。
const MOCK_USER_ID = 'demo-doctor'
const STORAGE_KEY = `bedside-echo:custom-phrases:${MOCK_USER_ID}`

export interface CustomPhrase {
  id: string
  text: string
  /** 歸屬分類:內建分類 id 或 'mine'(我的片語) */
  categoryId: string
}

/** 顯示用片語項目:內建或自訂 */
export interface PhraseEntry {
  text: string
  /** 自訂片語才有 id(供編輯/刪除);內建為 undefined */
  customId?: string
}

/** 顯示用分類:內建片語 + 歸入此分類的自訂片語 */
export interface DisplayCategory {
  id: string
  nameEn: string
  nameZh: string
  entries: PhraseEntry[]
}

function loadCustomPhrases(): CustomPhrase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCustomPhrases(phrases: CustomPhrase[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(phrases))
  } catch {
    /* 儲存失敗(隱私模式等)不阻擋使用,只是重新整理後消失 */
  }
}

interface PhraseContextValue {
  /** 內建分類(含歸入的自訂片語)+「我的片語」分類 */
  categories: DisplayCategory[]
  customPhrases: CustomPhrase[]
  addCustomPhrase: (text: string, categoryId: string) => void
  updateCustomPhrase: (id: string, text: string, categoryId: string) => void
  removeCustomPhrase: (id: string) => void
}

const PhraseContext = createContext<PhraseContextValue | null>(null)

let idCounter = 0

export function PhraseProvider({ children }: { children: ReactNode }) {
  const [customPhrases, setCustomPhrases] = useState<CustomPhrase[]>(loadCustomPhrases)

  // 以 React state 為單一資料來源,每次變更後同步寫回 localStorage
  const persist = useCallback((updater: (prev: CustomPhrase[]) => CustomPhrase[]) => {
    setCustomPhrases((prev) => {
      const next = updater(prev)
      saveCustomPhrases(next)
      return next
    })
  }, [])

  const addCustomPhrase = useCallback(
    (text: string, categoryId: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      idCounter += 1
      const item = { id: `custom-${Date.now()}-${idCounter}`, text: trimmed, categoryId }
      persist((prev) => [...prev, item])
    },
    [persist],
  )

  const updateCustomPhrase = useCallback(
    (id: string, text: string, categoryId: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      persist((prev) => prev.map((p) => (p.id === id ? { ...p, text: trimmed, categoryId } : p)))
    },
    [persist],
  )

  const removeCustomPhrase = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((p) => p.id !== id))
    },
    [persist],
  )

  const categories = useMemo<DisplayCategory[]>(() => {
    const custom = (categoryId: string): PhraseEntry[] =>
      customPhrases
        .filter((p) => p.categoryId === categoryId)
        .map((p) => ({ text: p.text, customId: p.id }))
    return [
      ...BUILTIN_CATEGORIES.map((c) => ({
        id: c.id,
        nameEn: c.nameEn,
        nameZh: c.nameZh,
        entries: [...c.phrases.map((text) => ({ text })), ...custom(c.id)],
      })),
      { ...MY_PHRASES_CATEGORY, entries: custom(MY_PHRASES_CATEGORY.id) },
    ]
  }, [customPhrases])

  const value = useMemo(
    () => ({ categories, customPhrases, addCustomPhrase, updateCustomPhrase, removeCustomPhrase }),
    [categories, customPhrases, addCustomPhrase, updateCustomPhrase, removeCustomPhrase],
  )

  return <PhraseContext.Provider value={value}>{children}</PhraseContext.Provider>
}

export function usePhrases(): PhraseContextValue {
  const ctx = useContext(PhraseContext)
  if (!ctx) throw new Error('usePhrases 必須在 <PhraseProvider> 內使用')
  return ctx
}
