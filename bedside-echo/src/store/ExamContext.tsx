/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CompletedExam, ExamPhoto, Patient } from '../types'

// 目前這次檢查的狀態(選定的病人、已拍照片)與「已上傳」紀錄,
// 全部存在瀏覽器記憶體中 —— 重新整理即消失。
//
// TODO(後端): 第五階段改為上傳到院內 Node.js 後端,
// 影像依規定保存 7 年,並以病歷號連結供事後簽收。

interface ExamContextValue {
  patient: Patient | null
  setPatient: (p: Patient | null) => void
  photos: ExamPhoto[]
  addPhoto: (blob: Blob, source: ExamPhoto['source']) => void
  removePhoto: (id: string) => void
  updateNote: (id: string, note: string) => void
  /** 模擬上傳:把目前的照片打包成一筆檢查紀錄,回傳紀錄 id */
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
  const [photos, setPhotos] = useState<ExamPhoto[]>([])
  const [completedExams, setCompletedExams] = useState<CompletedExam[]>([])

  const addPhoto = useCallback((blob: Blob, source: ExamPhoto['source']) => {
    const photo: ExamPhoto = {
      id: nextId('photo'),
      blob,
      url: URL.createObjectURL(blob),
      note: '',
      source,
      takenAt: new Date(),
    }
    setPhotos((prev) => [...prev, photo])
  }, [])

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const updateNote = useCallback((id: string, note: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, note } : p)))
  }, [])

  const submitExam = useCallback(async () => {
    if (!patient) throw new Error('尚未選擇病人')
    // TODO(後端): 改為實際 POST 影像與註記到院內伺服器
    await new Promise((resolve) => setTimeout(resolve, 800)) // 模擬上傳延遲
    const exam: CompletedExam = {
      id: nextId('exam'),
      patient,
      photos,
      uploadedAt: new Date(),
    }
    setCompletedExams((prev) => [exam, ...prev])
    setPhotos([]) // 照片已歸入檢查紀錄,清空目前工作區(Object URL 留給紀錄頁使用)
    return exam.id
  }, [patient, photos])

  const getExam = useCallback(
    (id: string) => completedExams.find((e) => e.id === id),
    [completedExams],
  )

  const value = useMemo(
    () => ({
      patient,
      setPatient,
      photos,
      addPhoto,
      removePhoto,
      updateNote,
      submitExam,
      completedExams,
      getExam,
    }),
    [patient, photos, addPhoto, removePhoto, updateNote, submitExam, completedExams, getExam],
  )

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>
}

export function useExam(): ExamContextValue {
  const ctx = useContext(ExamContext)
  if (!ctx) throw new Error('useExam 必須在 <ExamProvider> 內使用')
  return ctx
}
