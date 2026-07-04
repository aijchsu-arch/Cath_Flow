import { useState } from 'react'
import type { PhraseRef } from '../types'
import { usePhrases } from '../store/PhraseContext'
import { MY_PHRASES_CATEGORY } from '../data/phraseLibrary'
import { phraseKey } from '../utils/report'

interface PhrasePickerProps {
  /** 已選片語的 key 集合(phraseKey 格式),用於視覺標示 */
  selectedKeys: Set<string>
  /** 點選片語:已選 → 取消;未選 → 加入 */
  onToggle: (ref: PhraseRef) => void
}

/**
 * 片語選擇面板(媒體項目附加與報告頁共用):
 * - 分類列水平捲動(手機單手可滑),點分類切換該類片語
 * - 片語 chips 點選加入、再點取消(已選有 ✓ 與底色標示)
 * - 「＋自訂」新增個人片語(可選歸屬分類);「管理」模式可編輯/刪除自訂片語
 */
export default function PhrasePicker({ selectedKeys, onToggle }: PhrasePickerProps) {
  const { categories, addCustomPhrase, updateCustomPhrase, removeCustomPhrase } = usePhrases()
  const [activeId, setActiveId] = useState(categories[0]?.id ?? MY_PHRASES_CATEGORY.id)
  const [managing, setManaging] = useState(false)
  // 新增/編輯自訂片語的表單;editingId=null 表示新增
  const [form, setForm] = useState<{ editingId: string | null; text: string; categoryId: string } | null>(null)

  const active = categories.find((c) => c.id === activeId) ?? categories[0]

  function submitForm() {
    if (!form || !form.text.trim()) return
    if (form.editingId) {
      updateCustomPhrase(form.editingId, form.text, form.categoryId)
    } else {
      addCustomPhrase(form.text, form.categoryId)
    }
    setForm(null)
  }

  return (
    <div className="phrase-picker">
      <div className="phrase-tabs" role="tablist">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === active.id}
            className={`phrase-tab${c.id === active.id ? ' active' : ''}`}
            onClick={() => setActiveId(c.id)}
          >
            <span className="phrase-tab-en">{c.nameEn}</span>
            <span className="phrase-tab-zh">{c.nameZh}</span>
          </button>
        ))}
      </div>

      <div className="phrase-chips">
        {active.entries.length === 0 && (
          <p className="phrase-empty">此分類尚無片語,點「＋自訂片語」新增</p>
        )}
        {active.entries.map((entry) => {
          const ref: PhraseRef = { text: entry.text, categoryId: active.id }
          const selected = selectedKeys.has(phraseKey(ref))
          return (
            <span key={entry.customId ?? entry.text} className="phrase-chip-wrap">
              <button
                type="button"
                className={`phrase-chip${selected ? ' selected' : ''}${entry.customId ? ' custom' : ''}`}
                aria-pressed={selected}
                onClick={() => onToggle(ref)}
              >
                {selected ? '✓ ' : ''}
                {entry.text}
              </button>
              {managing && entry.customId && (
                <span className="phrase-chip-actions">
                  <button
                    type="button"
                    className="phrase-chip-edit"
                    aria-label={`編輯片語 ${entry.text}`}
                    onClick={() =>
                      setForm({ editingId: entry.customId!, text: entry.text, categoryId: active.id })
                    }
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="phrase-chip-delete"
                    aria-label={`刪除片語 ${entry.text}`}
                    onClick={() => {
                      if (window.confirm(`刪除自訂片語「${entry.text}」?`)) {
                        removeCustomPhrase(entry.customId!)
                      }
                    }}
                  >
                    ✕
                  </button>
                </span>
              )}
            </span>
          )
        })}
      </div>

      <div className="phrase-toolbar">
        <button
          type="button"
          className="btn-phrase-tool"
          onClick={() => setForm({ editingId: null, text: '', categoryId: active.id })}
        >
          ＋ 自訂片語
        </button>
        <button
          type="button"
          className={`btn-phrase-tool${managing ? ' active' : ''}`}
          onClick={() => setManaging((v) => !v)}
        >
          {managing ? '完成管理' : '管理自訂片語'}
        </button>
      </div>

      {form && (
        <div className="phrase-form">
          <input
            type="text"
            className="phrase-form-input"
            placeholder="輸入片語內容(建議英文,臨床慣用)"
            value={form.text}
            maxLength={80}
            autoFocus
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitForm()
            }}
          />
          <div className="phrase-form-row">
            <label>
              歸屬分類
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameZh}({c.nameEn})
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn-phrase-save" onClick={submitForm} disabled={!form.text.trim()}>
              {form.editingId ? '儲存' : '新增'}
            </button>
            <button type="button" className="btn-phrase-cancel" onClick={() => setForm(null)}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
