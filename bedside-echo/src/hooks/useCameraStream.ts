import { useCallback, useRef, useState } from 'react'
import type { RefObject } from 'react'

export type CameraErrorReason = 'denied' | 'noCamera' | 'insecure' | 'unknown'

export type CameraState =
  | { status: 'starting' }
  | { status: 'ready' }
  | { status: 'error'; reason: CameraErrorReason; detail?: string }

/** 相機權限被拒或無法使用時的中文說明(拍照頁與錄影頁共用) */
export const CAMERA_ERROR_GUIDE: Record<CameraErrorReason, { title: string; steps: string[] }> = {
  denied: {
    title: '相機權限遭拒',
    steps: [
      'iPhone(Safari):點網址列左側「大小」圖示 →「網站設定」→ 允許「相機」;或到「設定 → App → Safari → 相機」改為「允許」。',
      'Android(Chrome):點網址列的鎖頭圖示 →「權限」→ 開啟「相機」,再重新整理頁面。',
      '若已加入主畫面,請到手機「設定」中該 App 的權限開啟相機。',
      '暫時無法開啟權限時,仍可用下方「從相簿選取」加入。',
    ],
  },
  noCamera: {
    title: '找不到相機',
    steps: [
      '請確認裝置有相機,且沒有被其他 App(如相機、視訊會議)佔用。',
      '關閉其他使用相機的 App 後,點「重試開啟相機」。',
      '仍無法使用時,可改用「從相簿選取」。',
    ],
  },
  insecure: {
    title: '需要 HTTPS 安全連線',
    steps: [
      '瀏覽器規定:相機只能在 HTTPS(或 localhost)網頁使用。',
      '請改用 https:// 開頭的網址開啟本頁。',
      '開發環境設定方式請見專案 README。',
    ],
  },
  unknown: {
    title: '相機啟動失敗',
    steps: ['請重新整理頁面後再試一次。', '或改用「從相簿選取」加入。'],
  },
}

/**
 * 開啟手機後鏡頭即時取景(拍照頁與錄影頁共用)。
 * 只要求相機、不要求麥克風 —— 錄影規格為無聲(減少儲存容量),
 * 因此整個 App 都不需要麥克風權限。
 */
export function useCameraStream(videoRef: RefObject<HTMLVideoElement | null>) {
  const streamRef = useRef<MediaStream | null>(null)
  const [camera, setCamera] = useState<CameraState>({ status: 'starting' })

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    stopStream()
    if (!window.isSecureContext) {
      setCamera({ status: 'error', reason: 'insecure' })
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera({ status: 'error', reason: 'unknown', detail: '此瀏覽器不支援相機取景' })
      return
    }
    setCamera({ status: 'starting' })
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // 優先使用後鏡頭(拍攝超音波機螢幕)
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {
          /* iOS 偶發 play() 中斷,不影響取景 */
        })
      }
      setCamera({ status: 'ready' })
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setCamera({ status: 'error', reason: 'denied' })
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setCamera({ status: 'error', reason: 'noCamera' })
      } else if (name === 'NotReadableError') {
        setCamera({ status: 'error', reason: 'noCamera', detail: '相機可能被其他 App 佔用' })
      } else {
        setCamera({
          status: 'error',
          reason: 'unknown',
          detail: err instanceof Error ? err.message : undefined,
        })
      }
    }
  }, [stopStream, videoRef])

  return { camera, startCamera, stopStream, streamRef }
}
