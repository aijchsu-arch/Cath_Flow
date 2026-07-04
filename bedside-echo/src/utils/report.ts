import type { ExamMedia, Patient, PhraseRef } from '../types'
import { BUILTIN_CATEGORIES, MY_PHRASES_CATEGORY } from '../data/phraseLibrary'

/** 片語的唯一 key(分類+內容),選取狀態比對用 */
export function phraseKey(ref: PhraseRef): string {
  return `${ref.categoryId}|${ref.text}`
}

/** 媒體項目編號:照片依序 Image 1..n、影片依序 Video 1..n(與列表顯示一致) */
export function buildMediaLabels(media: ExamMedia[]): Map<string, string> {
  const labels = new Map<string, string>()
  let img = 0
  let vid = 0
  for (const m of media) {
    if (m.kind === 'photo') labels.set(m.id, `Image ${++img}`)
    else labels.set(m.id, `Video ${++vid}`)
  }
  return labels
}

function formatExamTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * 依選取的片語自動彙整文字報告:
 * - Findings 依分類列出(分類標籤中英並列)
 * - 附加在照片/影片上的片語,後面標注 [Image 1] [Video 2] 等對應編號;
 *   同一片語附在多個媒體上會合併成一行、列出所有編號
 * - 報告層(滑動選單)選的與媒體附加的同一片語也合併為一行
 */
export function generateReport(opts: {
  patient: Patient
  media: ExamMedia[]
  selections: PhraseRef[]
  examTime: Date
}): string {
  const { patient, media, selections, examTime } = opts
  const labels = buildMediaLabels(media)

  // categoryId → (片語文字 → 媒體編號們);Map 保留加入順序
  const byCategory = new Map<string, Map<string, string[]>>()
  const put = (ref: PhraseRef, label?: string) => {
    let phrases = byCategory.get(ref.categoryId)
    if (!phrases) {
      phrases = new Map()
      byCategory.set(ref.categoryId, phrases)
    }
    let tags = phrases.get(ref.text)
    if (!tags) {
      tags = []
      phrases.set(ref.text, tags)
    }
    if (label) tags.push(label)
  }
  for (const sel of selections) put(sel)
  for (const m of media) {
    for (const ref of m.phrases) put(ref, labels.get(m.id))
  }

  const lines: string[] = [
    'Bedside Echo Report',
    `病歷號:${patient.chartNo} / 檢查時間:${formatExamTime(examTime)}`,
    '',
    'Findings:',
  ]
  const categoryOrder = [...BUILTIN_CATEGORIES, MY_PHRASES_CATEGORY]
  const knownIds = new Set(categoryOrder.map((c) => c.id))
  const orderedIds = [
    ...categoryOrder.map((c) => c.id).filter((id) => byCategory.has(id)),
    ...[...byCategory.keys()].filter((id) => !knownIds.has(id)),
  ]
  for (const id of orderedIds) {
    const cat = categoryOrder.find((c) => c.id === id)
    lines.push(cat ? `[${cat.nameEn}(${cat.nameZh})]` : `[${id}]`)
    for (const [text, tags] of byCategory.get(id)!) {
      lines.push(tags.length > 0 ? `- ${text} [${tags.join(', ')}]` : `- ${text}`)
    }
  }
  return lines.join('\n') + '\n'
}
