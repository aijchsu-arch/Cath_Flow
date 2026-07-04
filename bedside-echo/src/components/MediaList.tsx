import { useState } from 'react'
import type { ExamMedia } from '../types'
import { TOTAL_SIZE_WARN_BYTES } from '../constants'
import { formatBytes, formatDuration } from '../utils/format'
import { useExam } from '../store/ExamContext'

/**
 * 本次檢查的媒體列表(照片+影片共用,拍照頁與錄影頁都顯示同一份):
 * 縮圖、影片長度/大小、一行註記、單項刪除、影片點縮圖全螢幕回放、
 * 總大小統計與過大警告。
 */
export default function MediaList() {
  const { media, removeMedia, updateNote, totalBytes } = useExam()
  const [playing, setPlaying] = useState<ExamMedia | null>(null)

  if (media.length === 0) return null

  const photoCount = media.filter((m) => m.kind === 'photo').length
  const videoCount = media.length - photoCount

  return (
    <section className="media-section">
      <div className="media-summary">
        <span>
          {photoCount > 0 && `照片 ${photoCount} 張`}
          {photoCount > 0 && videoCount > 0 && '・'}
          {videoCount > 0 && `影片 ${videoCount} 段`}
        </span>
        <strong>{formatBytes(totalBytes)}</strong>
      </div>
      {totalBytes > TOTAL_SIZE_WARN_BYTES && (
        <div className="media-size-warning" role="alert">
          ⚠️ 檔案過大(超過 {formatBytes(TOTAL_SIZE_WARN_BYTES)}),建議分次上傳
        </div>
      )}

      <div className="photo-list">
        {media.map((item, index) => (
          <div className="photo-item" key={item.id}>
            {item.kind === 'photo' ? (
              <img src={item.url} alt={`第 ${index + 1} 項:照片`} />
            ) : (
              <button
                type="button"
                className="video-thumb"
                onClick={() => setPlaying(item)}
                aria-label={`回放第 ${index + 1} 項影片`}
              >
                {item.thumbUrl ? (
                  <img src={item.thumbUrl} alt="" />
                ) : (
                  <span className="video-thumb-fallback" aria-hidden>
                    🎬
                  </span>
                )}
                <span className="video-play-badge" aria-hidden>
                  ▶
                </span>
                <span className="video-meta-badge">
                  {item.duration !== undefined && formatDuration(item.duration)}
                  {item.duration !== undefined && '・'}
                  {formatBytes(item.blob.size)}
                </span>
              </button>
            )}
            <div className="photo-item-body">
              <input
                type="text"
                className="photo-note"
                placeholder="加一行註記(選填)"
                value={item.note}
                maxLength={60}
                onChange={(e) => updateNote(item.id, e.target.value)}
              />
              <button
                type="button"
                className="btn-delete"
                onClick={() => removeMedia(item.id)}
                aria-label={`刪除第 ${index + 1} 項`}
              >
                刪除
              </button>
            </div>
          </div>
        ))}
      </div>

      {playing && (
        <div
          className="video-player-overlay"
          role="dialog"
          aria-label="影片回放"
          onClick={() => setPlaying(null)}
        >
          {/* playsInline + controls:iOS 在覆蓋層內回放,不跳原生全螢幕 */}
          <video
            src={playing.url}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="btn-close-player"
            onClick={() => setPlaying(null)}
          >
            ✕ 關閉
          </button>
        </div>
      )}
    </section>
  )
}
