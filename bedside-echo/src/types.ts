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

/** 單張檢查照片(含醫師的一行註記) */
export interface ExamPhoto {
  id: string
  /** 影像檔(拍照或相簿選取) */
  blob: Blob
  /** blob 的 Object URL,供 <img> 顯示縮圖用 */
  url: string
  /** 一行簡短文字註記 */
  note: string
  /** 來源:即時拍攝或相簿選取 */
  source: 'camera' | 'album'
  takenAt: Date
}

/** 一次已「上傳」(目前為模擬)的檢查紀錄 */
export interface CompletedExam {
  id: string
  patient: Patient
  photos: ExamPhoto[]
  uploadedAt: Date
}
