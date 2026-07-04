/** 單段錄影上限(秒)。超音波動態影像通常一段幾秒到十幾秒,達上限自動停止。 */
export const MAX_RECORDING_SECONDS = 60

/** 本次檢查總檔案大小警告門檻(bytes)。超過時提示「檔案過大,建議分次上傳」。 */
export const TOTAL_SIZE_WARN_BYTES = 200 * 1024 * 1024

/** 錄影目標位元率(bps)。1080p 超音波畫面 2.5Mbps 已足夠清晰,控制檔案大小。 */
export const VIDEO_BITS_PER_SECOND = 2_500_000
