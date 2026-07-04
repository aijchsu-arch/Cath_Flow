import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExam } from '../store/ExamContext'
import { useCameraStream, CAMERA_ERROR_GUIDE } from '../hooks/useCameraStream'
import { MAX_RECORDING_SECONDS, VIDEO_BITS_PER_SECOND } from '../constants'
import { formatDuration } from '../utils/format'
import MediaList from '../components/MediaList'

// MediaRecorder 輸出格式依平台而異:
// - iOS Safari(14.3+)只支援 video/mp4(H.264)
// - Android Chrome 只支援 video/webm(VP8/VP9)
// 依序嘗試,選第一個此裝置支援的格式;回放用 blob 的實際 MIME type,兩者皆可播。
const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
]

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t))
}

/** 裝置是否支援 MediaRecorder 錄影;不支援時自動改用「從相簿選取影片」 */
const RECORDER_SUPPORTED = typeof MediaRecorder !== 'undefined' && !!pickMimeType()

export default function VideoPage() {
  const navigate = useNavigate()
  const { patient, media, addVideo, submitExam } = useExam()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { camera, startCamera, stopStream, streamRef } = useCameraStream(videoRef)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | undefined>(undefined)
  const startedAtRef = useRef(0)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const stopRecording = useCallback((reason?: string) => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    window.clearInterval(timerRef.current)
    setRecording(false)
    if (reason) {
      setHint(reason)
      window.setTimeout(() => setHint(null), 4000)
    }
  }, [])

  useEffect(() => {
    // 未選病人不能錄影(檢查紀錄必須以病歷號連結)
    if (!patient) {
      navigate('/', { replace: true })
      return
    }
    if (RECORDER_SUPPORTED) void startCamera()
    return () => {
      // 離開頁面時若仍在錄影,先收尾再關閉相機
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
      window.clearInterval(timerRef.current)
      stopStream()
    }
  }, [patient, navigate, startCamera, stopStream])

  function startRecording() {
    const stream = streamRef.current
    if (!stream || recording) return
    const mimeType = pickMimeType()
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
      })
    } catch {
      setHint('此裝置無法啟動錄影,請改用「從相簿選取影片」')
      return
    }
    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || 'video/mp4'
      const blob = new Blob(chunksRef.current, { type })
      chunksRef.current = []
      const seconds = (Date.now() - startedAtRef.current) / 1000
      if (blob.size > 0) void addVideo(blob, 'camera', Math.round(seconds * 10) / 10)
    }
    recorderRef.current = recorder
    startedAtRef.current = Date.now()
    setElapsed(0)
    setRecording(true)
    // timeslice 1 秒:邊錄邊收 chunk,避免長片段只在 stop 時一次吐出
    recorder.start(1000)
    timerRef.current = window.setInterval(() => {
      const seconds = (Date.now() - startedAtRef.current) / 1000
      setElapsed(seconds)
      if (seconds >= MAX_RECORDING_SECONDS) {
        stopRecording(`已達單段上限 ${MAX_RECORDING_SECONDS} 秒,自動停止並存檔`)
      }
    }, 200)
  }

  /** 相簿選取影片備援(不支援 MediaRecorder 的裝置為主要方式) */
  function handleFiles(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      if (file.type.startsWith('video/')) void addVideo(file, 'album')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit() {
    if (media.length === 0 || uploading) return
    setUploading(true)
    try {
      if (recording) stopRecording()
      const examId = await submitExam()
      navigate(`/uploaded/${examId}`, { replace: true })
    } finally {
      setUploading(false)
    }
  }

  if (!patient) return null

  return (
    <div className="page camera-page">
      <header className="camera-header">
        <button type="button" className="btn-back" onClick={() => navigate('/')}>
          ‹ 返回
        </button>
        <div className="camera-patient">
          {patient.name}|{patient.chartNo}|{patient.bed}
        </div>
      </header>

      {RECORDER_SUPPORTED ? (
        <div className="viewfinder">
          {/* playsInline:iOS 必須,否則影片會全螢幕播放 */}
          <video ref={videoRef} playsInline muted autoPlay />
          {recording && (
            <div className="rec-indicator" aria-live="polite">
              <span className="rec-dot" aria-hidden />
              {formatDuration(elapsed)} / {formatDuration(MAX_RECORDING_SECONDS)}
            </div>
          )}
          {camera.status === 'starting' && (
            <div className="viewfinder-overlay">相機啟動中…</div>
          )}
          {camera.status === 'error' && (
            <div className="viewfinder-overlay camera-error" role="alert">
              <h2>{CAMERA_ERROR_GUIDE[camera.reason].title}</h2>
              {camera.detail && <p className="camera-error-detail">{camera.detail}</p>}
              <ul>
                {CAMERA_ERROR_GUIDE[camera.reason].steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <button
                type="button"
                className="btn-big btn-secondary"
                onClick={() => void startCamera()}
              >
                重試開啟相機
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="recorder-unsupported" role="alert">
          <h2>此瀏覽器不支援網頁錄影</h2>
          <p>
            請用下方「從相簿選取影片」:先用手機內建相機 App 錄影,
            再回到本頁選取剛錄好的影片。
            (iPhone 需 iOS 14.3 以上的 Safari 才支援網頁直接錄影)
          </p>
        </div>
      )}

      {hint && (
        <div className="record-hint" role="status">
          {hint}
        </div>
      )}

      <div className="camera-controls">
        <button
          type="button"
          className="btn-album"
          onClick={() => fileInputRef.current?.click()}
        >
          從相簿選取影片
        </button>
        {RECORDER_SUPPORTED ? (
          recording ? (
            <button
              type="button"
              className="btn-record recording"
              onClick={() => stopRecording()}
              aria-label="停止錄影"
            >
              <span className="stop-square" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              className="btn-record"
              onClick={startRecording}
              disabled={camera.status !== 'ready'}
              aria-label="開始錄影"
            />
          )
        ) : (
          <span />
        )}
        <div className="photo-count" aria-live="polite">
          {media.length > 0 ? `${media.length} 項` : ''}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <MediaList />

      <div className="submit-bar">
        <button
          type="button"
          className="btn-big btn-primary"
          onClick={() => void handleSubmit()}
          disabled={media.length === 0 || uploading || recording}
        >
          {uploading
            ? '上傳中…'
            : recording
              ? '錄影中,請先停止'
              : media.length > 0
                ? `確認上傳(${media.length} 項)`
                : '尚未錄製影片'}
        </button>
      </div>
    </div>
  )
}
