import type { Patient } from '../types'

// ⚠️ 以下全部為虛構測試資料,絕非真實病人。
//
// TODO(FHIR): 第五階段改為呼叫院內 HIS 的 FHIR (R4) API,例如:
//   GET {FHIR_BASE_URL}/Patient?identifier={chartNo}
// 再由 Patient resource 的 name / gender / birthDate 與
// Encounter/Location 取得床號,轉換成本 App 的 Patient 型別。
const MOCK_PATIENTS: Record<string, Patient> = {
  '12345678': { chartNo: '12345678', name: '王虛構', gender: '男', age: 68, bed: '7A-12' },
  '23456789': { chartNo: '23456789', name: '林測試', gender: '女', age: 75, bed: 'CCU-03' },
  '34567890': { chartNo: '34567890', name: '陳模擬', gender: '男', age: 54, bed: '9B-05' },
  '45678901': { chartNo: '45678901', name: '張假資', gender: '女', age: 82, bed: 'ICU-08' },
}

/** 可供實測輸入的病歷號清單(顯示在首頁提示中) */
export const MOCK_CHART_NOS = Object.keys(MOCK_PATIENTS)

/**
 * 以病歷號查詢病人基本資料。
 * 模擬網路延遲,回傳 null 表示查無此病歷號。
 *
 * TODO(FHIR): 之後改為真實 FHIR API 呼叫(含錯誤處理與逾時)。
 */
export async function fetchPatientByChartNo(chartNo: string): Promise<Patient | null> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return MOCK_PATIENTS[chartNo] ?? null
}
