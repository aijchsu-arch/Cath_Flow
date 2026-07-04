/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CompletedExam, ExamMedia, Patient, PhraseRef } from '../types'
import { examUploadService } from '../services/uploadService'
import { getVideoMeta } from '../utils/videoMeta'

// 目前這次檢查的狀態(選定的病人、已拍攝的照片與影片)與「已上傳」紀錄,
// 全部存在瀏覽器記憶體中 —— 重新整理即消失。
//
// TODO(後端): 第五階段改為上傳到院內 Node.js 後端(見 services/uploadService.ts
// 的 ExamUploadService 介面與分段上傳 TODO),影像依規定保存 7 年。

interface ExamContextValue {
  patient: Patient | null
  setPatient: (p: Patient | null) => void
  /** 本次檢查的媒體項目(照片+影片,依加入順序) */
  media: ExamMedia[]
  addPhoto: (blob: Blob, source: ExamMedia['source']) => void
  /** 加入影片;會非同步擷取第一幀縮圖與長度。recordedDuration:錄影計時器量到的秒數(webm 中繼資料缺 duration 時的備援) */
  addVideo: (blob: Blob, source: ExamMedia['source'], recordedDuration?: number) => Promise<void>
  removeMedia: (id: string) => void
  updateNote: (id: string, note: string) => void
  /** 附加/移除單一媒體項目上的片語(同分類同內容視為同一片語) */
  toggleMediaPhrase: (mediaId: string, phrase: PhraseRef) => void
  /** 本次檢查所有媒體的總大小(bytes) */
  totalBytes: number
  /** 報告草稿:內文全文(醫師可自由編輯) */
  reportText: string
  setReportText: (text: string) => void
  /** 報告是否被手動編輯過(true 後不再自動重新產生,片語改為插入) */
  reportDirty: boolean
  setReportDirty: (dirty: boolean) => void
  /** 報告層(滑動選單)已選取的片語 */
  reportSelections: PhraseRef[]
  setReportSelections: (selections: PhraseRef[]) => void
  /** 模擬上傳:把目前的媒體與報告打包成一筆檢查紀錄,回傳紀錄 id */
  submitExam: () => Promise<string>
  completedExams: CompletedExam[]
  getExam: (id: string) => CompletedExam | undefined
}

const ExamContext = createContext<ExamContextValue | null>(null)

let idCounter = 0
function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now()}-${idCounter}`
}

export function ExamProvider({ children }: { children: ReactNode }) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [media, setMedia] = useState<ExamMedia[]>([])
  const [completedExams, setCompletedExams] = useState<CompletedExam[]>([])
  // 報告草稿放在 Context:醫師從報告頁返回補拍再回來,編輯內容不會消失
  const [reportText, setReportText] = useState('')
  const [reportDirty, setReportDirty] = useState(false)
  const [reportSelections, setReportSelections] = useState<PhraseRef[]>([])

  const addPhoto = useCallback((blob: Blob, source: ExamMedia['source']) => {
    const item: ExamMedia = {
      id: nextId('photo'),
      kind: 'photo',
      blob,
      mimeType: blob.type || 'image/jpeg',
      url: URL.createObjectURL(blob),
      note: '',
      source,
      takenAt: new Date(),
      phrases: [],
    }
    setMedia((prev) => [...prev, item])
  }, [])

  const addVideo = useCallback(
    async (blob: Blob, source: ExamMedia['source'], recordedDuration?: number) => {
      const url = URL.createObjectURL(blob)
      const meta = await getVideoMeta(url)
      const item: ExamMedia = {
        id: nextId('video'),
        kind: 'video',
        blob,
        mimeType: blob.type || 'video/mp4',
        url,
        note: '',
        source,
        takenAt: new Date(),
        duration: meta.duration ?? recordedDuration,
        thumbUrl: meta.thumbUrl ?? undefined,
        phrases: [],
      }
      setMedia((prev) => [...prev, item])
    },
    [],
  )

  const removeMedia = useCallback((id: string) => {
    setMedia((prev) => {
      const target = prev.find((m) => m.id === id)
      if (target) {
        URL.revokeObjectURL(target.url)
        if (target.thumbUrl) URL.revokeObjectURL(target.thumbUrl)
      }
      return prev.filter((m) => m.id !== id)
    })
  }, [])

  const updateNote = useCallback((id: string, note: string) => {
    setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, note } : m)))
  }, [])

  const toggleMediaPhrase = useCallback((mediaId: string, phrase: PhraseRef) => {
    setMedia((prev) =>
      prev.map((m) => {
        if (m.id !== mediaId) return m
        const exists = m.phrases.some(
          (p) => p.text === phrase.text && p.categoryId === phrase.categoryId,
        )
        return {
          ...m,
          phrases: exists
            ? m.phrases.filter(
                (p) => !(p.text === phrase.text && p.categoryId === phrase.categoryId),
              )
            : [...m.phrases, phrase],
        }
      }),
    )
  }, [])

  const totalBytes = useMemo(() => media.reduce((sum, m) => sum + m.blob.size, 0), [media])

  const submitExam = useCallback(async () => {
    if (!patient) throw new Error('尚未選擇病人')
    const { examId } = await examUploadService.uploadExam(patient, media, reportText)
    const exam: CompletedExam = {
      id: examId,
      patient,
      media,
      report: reportText,
      uploadedAt: new Date(),
    }
    setCompletedExams((prev) => [exam, ...prev])
    // 媒體與報告已歸入檢查紀錄,清空目前工作區(Object URL 留給紀錄頁使用)
    setMedia([])
    setReportText('')
    setReportDirty(false)
    setReportSelections([])
    return exam.id
  }, [patient, media, reportText])

  const getExam = useCallback(
    (id: string) => completedExams.find((e) => e.id === id),
    [completedExams],
  )

  const value = useMemo(
    () => ({
      patient,
      setPatient,
      media,
      addPhoto,
      addVideo,
      removeMedia,
      updateNote,
      toggleMediaPhrase,
      totalBytes,
      reportText,
      setReportText,
      reportDirty,
      setReportDirty,
      reportSelections,
      setReportSelections,
      submitExam,
      completedExams,
      getExam,
    }),
    [
      patient,
      media,
      addPhoto,
      addVideo,
      removeMedia,
      updateNote,
      toggleMediaPhrase,
      totalBytes,
      reportText,
      reportDirty,
      reportSelections,
      submitExam,
      completedExams,
      getExam,
    ],
  )

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>
}

export function useExam(): ExamContextValue {
  const ctx = useContext(ExamContext)
  if (!ctx) throw new Error('useExam 必須在 <ExamProvider> 內使用')
  return ctx
}
