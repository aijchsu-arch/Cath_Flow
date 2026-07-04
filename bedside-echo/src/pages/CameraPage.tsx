import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExam } from '../store/ExamContext'

type CameraState =
  | { status: 'starting' }
  | { status: 'ready' }
  | { status: 'error'; reason: 'denied' | 'noCamera' | 'insecure' | 'unknown'; detail?: string }

/** 相機權限被拒或無法使用時的中文說明 */
const ERROR_GUIDE: Record<
  Extract<CameraState, { status: 'error' }>['reason'],
  { title: string; steps: string[] }
> = {
  denied: {
    title: '相機權限遭拒',
    steps: [
      'iPhone(Safari):點網址列左側「大小」圖示 →「網站設定」→ 允許「相機」;或到「設定 → App → Safari → 相機」改為「允許」。',
      'Android(Chrome):點網址列的鎖頭圖示 →「權限」→ 開啟「相機」,再重新整理頁面。',
      '若已加入主畫面,請到手機「設定」中該 App 的權限開啟相機。',
      '暫時無法開啟權限時,仍可用下方「從相簿選取」加入照片。',
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
    steps: [
      '請重新整理頁面後再試一次。',
      '或改用「從相簿選取」加入照片。',
    ],
  },
}

export default function CameraPage() {
  const navigate = useNavigate()
  const { patient, photos, addPhoto, removePhoto, updateNote, submitExam } = useExam()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [camera, setCamera] = useState<CameraState>({ status: 'starting' })
  const [flash, setFlash] = useState(false)
  const [uploading, setUploading] = useState(false)

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
  }, [stopStream])

  useEffect(() => {
    // 未選病人不能拍照(報告必須以病歷號連結)
    if (!patient) {
      navigate('/', { replace: true })
      return
    }
    void startCamera()
    return stopStream
  }, [patient, navigate, startCamera, stopStream])

  /** 從即時取景畫面擷取一張 JPEG */
  function capture() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) addPhoto(blob, 'camera')
      },
      'image/jpeg',
      0.92,
    )
    // 快門閃白回饋
    setFlash(true)
    setTimeout(() => setFlash(false), 150)
  }

  /** 相簿選取備援(可複選) */
  function handleFiles(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) addPhoto(file, 'album')
    }
    // 清空 input,讓同一張照片可重複選取
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit() {
    if (photos.length === 0 || uploading) return
    setUploading(true)
    try {
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

      <div className="viewfinder">
        {/* playsInline:iOS 必須,否則影片會全螢幕播放 */}
        <video ref={videoRef} playsInline muted autoPlay />
        {flash && <div className="shutter-flash" />}
        {camera.status === 'starting' && <div className="viewfinder-overlay">相機啟動中…</div>}
        {camera.status === 'error' && (
          <div className="viewfinder-overlay camera-error" role="alert">
            <h2>{ERROR_GUIDE[camera.reason].title}</h2>
            {camera.detail && <p className="camera-error-detail">{camera.detail}</p>}
            <ul>
              {ERROR_GUIDE[camera.reason].steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <button type="button" className="btn-big btn-secondary" onClick={() => void startCamera()}>
              重試開啟相機
            </button>
          </div>
        )}
      </div>

      <div className="camera-controls">
        <button
          type="button"
          className="btn-album"
          onClick={() => fileInputRef.current?.click()}
        >
          從相簿選取
        </button>
        <button
          type="button"
          className="btn-shutter"
          onClick={capture}
          disabled={camera.status !== 'ready'}
          aria-label="拍照"
        />
        <div className="photo-count" aria-live="polite">
          {photos.length > 0 ? `${photos.length} 張` : ''}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {photos.length > 0 && (
        <section className="photo-list">
          {photos.map((photo, index) => (
            <div className="photo-item" key={photo.id}>
              <img src={photo.url} alt={`第 ${index + 1} 張照片`} />
              <div className="photo-item-body">
                <input
                  type="text"
                  className="photo-note"
                  placeholder="加一行註記(選填)"
                  value={photo.note}
                  maxLength={60}
                  onChange={(e) => updateNote(photo.id, e.target.value)}
                />
                <button
                  type="button"
                  className="btn-delete"
                  onClick={() => removePhoto(photo.id)}
                  aria-label={`刪除第 ${index + 1} 張照片`}
                >
                  刪除
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="submit-bar">
        <button
          type="button"
          className="btn-big btn-primary"
          onClick={() => void handleSubmit()}
          disabled={photos.length === 0 || uploading}
        >
          {uploading ? '上傳中…' : photos.length > 0 ? `確認上傳(${photos.length} 張)` : '尚未拍攝照片'}
        </button>
      </div>
    </div>
  )
}
