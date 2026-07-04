/** 病人基本資料(對應 FHIR R4 Patient 的必要欄位子集) */
export interface Patient {
  /** 病歷號 */
  chartNo: string
  name: string
  gender: '男' | '女'
  age: number
  /** 床號 */
  bed: string
}

export type MediaKind = 'photo' | 'video'

/** 單個檢查媒體項目:照片或影片,各自帶一行註記 */
export interface ExamMedia {
  id: string
  kind: MediaKind
  /** 影像/影片檔(拍攝或相簿選取) */
  blob: Blob
  /** 實際 MIME type(iOS Safari 錄影為 video/mp4,Android Chrome 為 video/webm) */
  mimeType: string
  /** blob 的 Object URL,照片顯示與影片回放用 */
  url: string
  /** 一行簡短文字註記 */
  note: string
  /** 來源:即時拍攝/錄影,或相簿選取 */
  source: 'camera' | 'album'
  takenAt: Date
  /** 影片長度(秒);照片或讀取失敗為 undefined */
  duration?: number
  /** 影片第一幀縮圖的 Object URL;照片直接用 url 當縮圖 */
  thumbUrl?: string
}

/** 一次已「上傳」(目前為模擬)的檢查紀錄 */
export interface CompletedExam {
  id: string
  patient: Patient
  media: ExamMedia[]
  uploadedAt: Date
}
