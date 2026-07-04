/** 片語分類:中英文名稱 + 內建片語清單 */
export interface PhraseCategory {
  id: string
  nameEn: string
  nameZh: string
  phrases: string[]
}

/**
 * 內建片語庫(預設資料)。
 * 片語內容保持英文(臨床慣用),分類標籤中英並列。
 * 之後增修直接編輯此檔;個人自訂片語另存(見 store/PhraseContext.tsx)。
 */
export const BUILTIN_CATEGORIES: PhraseCategory[] = [
  {
    id: 'lv-function',
    nameEn: 'LV function',
    nameZh: '左心室功能',
    phrases: ['Normal LVEF', 'Impaired LVEF', 'LV RWMA (+)'],
  },
  {
    id: 'vhd',
    nameEn: 'Valvular heart disease',
    nameZh: '瓣膜',
    phrases: [
      'No significant VHD',
      'Severe AS',
      'Moderate AS',
      'Severe MR',
      'Moderate MR',
      'Severe TR',
      'Moderate TR',
    ],
  },
  {
    id: 'pericardium',
    nameEn: 'Pericardium',
    nameZh: '心包膜',
    phrases: ['Pericardial effusion', 'No pericardial effusion'],
  },
]

/** 個人自訂片語的預設歸屬分類(非內建分類,片語由使用者自建) */
export const MY_PHRASES_CATEGORY = {
  id: 'mine',
  nameEn: 'My phrases',
  nameZh: '我的片語',
} as const
