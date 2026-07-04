import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExam } from '../store/ExamContext'
import { useCameraStream, CAMERA_ERROR_GUIDE } from '../hooks/useCameraStream'
import MediaList from '../components/MediaList'

export default function CameraPage() {
  const navigate = useNavigate()
  const { patient, media, addPhoto, submitExam } = useExam()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { camera, startCamera, stopStream } = useCameraStream(videoRef)
  const [flash, setFlash] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    // 未選病人不能拍照(檢查紀錄必須以病歷號連結)
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
    if (media.length === 0 || uploading) return
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
            <h2>{CAMERA_ERROR_GUIDE[camera.reason].title}</h2>
            {camera.detail && <p className="camera-error-detail">{camera.detail}</p>}
            <ul>
              {CAMERA_ERROR_GUIDE[camera.reason].steps.map((step) => (
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
          {media.length > 0 ? `${media.length} 項` : ''}
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

      <MediaList />

      <div className="submit-bar">
        <button
          type="button"
          className="btn-big btn-primary"
          onClick={() => void handleSubmit()}
          disabled={media.length === 0 || uploading}
        >
          {uploading ? '上傳中…' : media.length > 0 ? `確認上傳(${media.length} 項)` : '尚未拍攝照片'}
        </button>
      </div>
    </div>
  )
}
