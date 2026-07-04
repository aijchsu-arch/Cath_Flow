import type { ExamMedia, Patient } from '../types'

/** 上傳進度(bytes) */
export interface UploadProgress {
  loaded: number
  total: number
}

/**
 * 檢查上傳服務介面 —— 第五階段接院內 Node.js 後端時,
 * 只要提供一個新的實作替換 `examUploadService`,頁面程式不用改。
 *
 * TODO(上傳): 影片檔案大、VPN 連線品質不穩,真實實作需要:
 *   - 分段上傳(chunked upload,例如每段 5MB,POST /exams/{id}/media/{id}/chunks/{n})
 *   - 斷點續傳(查詢已收到的 chunk index,從缺的地方續傳)
 *   - 失敗重試與上傳佇列(離線時暫存,恢復連線後補傳)
 *   - 影像依規定保存 7 年(由後端與院方資訊室的儲存機制處理)
 */
export interface ExamUploadService {
  uploadExam(
    patient: Patient,
    media: ExamMedia[],
    /** 文字報告全文(與媒體同屬一筆檢查紀錄) */
    report: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<{ examId: string }>
}

let mockIdCounter = 0

/** 模擬實作:不真的送出,只依總檔案大小模擬進度與延遲。 */
export const mockUploadService: ExamUploadService = {
  async uploadExam(_patient, media, _report, onProgress) {
    const total = media.reduce((sum, m) => sum + m.blob.size, 0)
    const steps = 5
    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 150))
      onProgress?.({ loaded: Math.round((total * i) / steps), total })
    }
    mockIdCounter += 1
    return { examId: `exam-${Date.now()}-${mockIdCounter}` }
  },
}

/** 目前使用的上傳服務(之後換成真實後端實作) */
export const examUploadService: ExamUploadService = mockUploadService
