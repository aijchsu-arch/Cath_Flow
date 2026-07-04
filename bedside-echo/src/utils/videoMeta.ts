/** 影片中繼資料:長度(秒)與第一幀縮圖 */
export interface VideoMeta {
  duration: number | null
  /** 第一幀縮圖的 Object URL(JPEG);擷取失敗為 null */
  thumbUrl: string | null
}

const META_TIMEOUT_MS = 5000

/**
 * 從影片 Object URL 讀取長度並擷取第一幀當縮圖。
 *
 * 跨平台注意:
 * - Chrome/Android 的 MediaRecorder 錄出的 webm 沒寫入 duration,
 *   loadedmetadata 時 duration 會是 Infinity —— 需先把 currentTime 跳到
 *   極大值觸發 durationchange 才能取得真實長度(見下方 workaround)。
 * - iOS Safari 錄出的 mp4/H.264 中繼資料正常,直接可讀。
 * - 任一步驟逾時或失敗都回傳部分結果,不阻擋主流程。
 */
export async function getVideoMeta(url: string): Promise<VideoMeta> {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url

  const result: VideoMeta = { duration: null, thumbUrl: null }
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, META_TIMEOUT_MS))

  const extract = (async () => {
    await once(video, 'loadedmetadata')
    if (!Number.isFinite(video.duration)) {
      // Chrome webm duration=Infinity workaround
      video.currentTime = Number.MAX_SAFE_INTEGER
      await once(video, 'durationchange')
      video.currentTime = 0
    }
    if (Number.isFinite(video.duration)) result.duration = video.duration

    // 跳到片頭擷取第一幀(0.01 秒避開部分裝置 0 秒黑幀問題)
    video.currentTime = 0.01
    await once(video, 'seeked')
    if (video.videoWidth > 0) {
      const canvas = document.createElement('canvas')
      // 縮圖不需原解析度,等比縮到寬 320 省記憶體
      const scale = Math.min(1, 320 / video.videoWidth)
      canvas.width = Math.round(video.videoWidth * scale)
      canvas.height = Math.round(video.videoHeight * scale)
      canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.8),
      )
      if (blob) result.thumbUrl = URL.createObjectURL(blob)
    }
  })().catch(() => {
    /* 擷取失敗就用部分結果 */
  })

  await Promise.race([extract, timeout])
  video.removeAttribute('src')
  video.load()
  return result
}

function once(el: HTMLVideoElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    el.addEventListener(event, () => resolve(), { once: true })
    el.addEventListener('error', () => reject(new Error(`video ${event} failed`)), { once: true })
  })
}
