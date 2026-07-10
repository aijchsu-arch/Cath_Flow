/** 單段錄影上限(秒)。超音波動態影像通常一段幾秒到十幾秒,達上限自動停止。 */
export const MAX_RECORDING_SECONDS = 60

/** 本次檢查總檔案大小警告門檻(bytes)。超過時提示「檔案過大,建議分次上傳」。 */
export const TOTAL_SIZE_WARN_BYTES = 200 * 1024 * 1024

/** 錄影目標位元率(bps)。1080p 超音波畫面 2.5Mbps 已足夠清晰,控制檔案大小。 */
export const VIDEO_BITS_PER_SECOND = 2_500_000

/**
 * 語音辨識(Whisper)服務的路徑前綴。
 * 開發環境由 vite.config.ts 的 proxy 轉發到 Whisper 伺服器
 * (預設 http://127.0.0.1:8000,可用環境變數 WHISPER_URL 覆寫);
 * 院內正式部署時由反向代理(nginx 等)把同一路徑指到院內 Whisper 服務。
 * 架設步驟見 docs/whisper-setup.md。
 */
export const STT_PROXY_PATH = '/api/stt'

/** Whisper 模型(speaches 的 model 參數)。中英夾雜不夠準可換 medium 或 large-v3-turbo。 */
export const STT_MODEL = 'Systran/faster-whisper-small'

/** 單次口述錄音上限(秒) */
export const MAX_DICTATION_SECONDS = 120
