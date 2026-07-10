import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_DICTATION_SECONDS } from '../constants'

// 口述錄音格式依平台:iOS Safari 支援 audio/mp4(AAC),
// Android Chrome 支援 audio/webm(Opus);Whisper 兩種都吃。
const AUDIO_MIME_CANDIDATES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']

function pickAudioMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return AUDIO_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t))
}

/** 麥克風權限被拒等錯誤的中文引導 */
export function audioErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return (
      '麥克風權限遭拒。iPhone:設定 → App → Safari → 麥克風 改為「允許」' +
      '(或網址列「大小」圖示 → 網站設定);Android:網址列鎖頭 → 權限 → 開啟麥克風。' +
      '已加入主畫面的 App 請到手機設定中開啟其麥克風權限。'
    )
  }
  if (name === 'NotFoundError') return '找不到麥克風,請確認裝置有收音功能。'
  if (typeof MediaRecorder === 'undefined') return '此瀏覽器不支援錄音(iPhone 需 iOS 14.3 以上)。'
  return '無法啟動錄音,請重新整理頁面再試。'
}

/**
 * 口述錄音 hook:start() 開始(此時才要求麥克風權限)、
 * stop() 回傳音檔 Blob;達上限自動停止並一樣回傳。
 * 錄音只在口述期間進行,結束立即釋放麥克風。
 */
export function useAudioRecorder(onAutoStop?: (blob: Blob) => void) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | undefined>(undefined)
  const startedAtRef = useRef(0)
  const resolveRef = useRef<((blob: Blob | null) => void) | null>(null)
  const onAutoStopRef = useRef(onAutoStop)
  onAutoStopRef.current = onAutoStop

  const cleanup = useCallback(() => {
    window.clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
    setRecording(false)
  }, [])

  /** 停止並取得音檔;未在錄音時回傳 null */
  const stop = useCallback((): Promise<Blob | null> => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(null)
    return new Promise((resolve) => {
      resolveRef.current = resolve
      recorder.stop()
    })
  }, [])

  const start = useCallback(async () => {
    if (recording) return
    // 只要音訊;錄完立刻釋放,避免麥克風指示燈常亮造成疑慮
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = pickAudioMime()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || mimeType || 'audio/webm',
      })
      chunksRef.current = []
      cleanup()
      if (resolveRef.current) {
        resolveRef.current(blob.size > 0 ? blob : null)
        resolveRef.current = null
      } else if (blob.size > 0) {
        // 達上限自動停止(沒有等待中的 stop() 呼叫)
        onAutoStopRef.current?.(blob)
      }
    }
    streamRef.current = stream
    recorderRef.current = recorder
    startedAtRef.current = Date.now()
    setSeconds(0)
    setRecording(true)
    recorder.start(1000)
    timerRef.current = window.setInterval(() => {
      const s = (Date.now() - startedAtRef.current) / 1000
      setSeconds(s)
      if (s >= MAX_DICTATION_SECONDS && recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
      }
    }, 200)
  }, [recording, cleanup])

  // 離開頁面時放掉麥克風
  useEffect(() => cleanup, [cleanup])

  return { recording, seconds, start, stop }
}
