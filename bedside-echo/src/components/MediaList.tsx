import { useState } from 'react'
import type { ExamMedia } from '../types'
import { TOTAL_SIZE_WARN_BYTES } from '../constants'
import { formatBytes, formatDuration } from '../utils/format'
import { buildMediaLabels, phraseKey } from '../utils/report'
import { useExam } from '../store/ExamContext'
import PhrasePicker from './PhrasePicker'

/**
 * 本次檢查的媒體列表(照片+影片共用,拍照頁與錄影頁都顯示同一份):
 * 縮圖、媒體編號(Image/Video N,與報告標注一致)、影片長度/大小、
 * 一行註記、片語附加、單項刪除、影片點縮圖全螢幕回放、
 * 總大小統計與過大警告。
 */
export default function MediaList() {
  const { media, removeMedia, updateNote, toggleMediaPhrase, totalBytes } = useExam()
  const [playing, setPlaying] = useState<ExamMedia | null>(null)
  /** 正在挑片語的媒體項目 id(開啟底部面板) */
  const [phraseTargetId, setPhraseTargetId] = useState<string | null>(null)

  if (media.length === 0) return null

  const labels = buildMediaLabels(media)
  const photoCount = media.filter((m) => m.kind === 'photo').length
  const videoCount = media.length - photoCount
  const phraseTarget = media.find((m) => m.id === phraseTargetId) ?? null

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
        {media.map((item) => (
          <div className="photo-item" key={item.id}>
            {item.kind === 'photo' ? (
              <div className="media-thumb-wrap">
                <img src={item.url} alt={`${labels.get(item.id)}:照片`} />
                <span className="media-label">{labels.get(item.id)}</span>
              </div>
            ) : (
              <button
                type="button"
                className="video-thumb"
                onClick={() => setPlaying(item)}
                aria-label={`回放 ${labels.get(item.id)}`}
              >
                {item.thumbUrl ? (
                  <img src={item.thumbUrl} alt="" />
                ) : (
                  <span className="video-thumb-fallback" aria-hidden>
                    🎬
                  </span>
                )}
                <span className="media-label">{labels.get(item.id)}</span>
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
              {item.phrases.length > 0 && (
                <div className="media-phrase-chips">
                  {item.phrases.map((p) => (
                    <button
                      key={phraseKey(p)}
                      type="button"
                      className="media-phrase-chip"
                      onClick={() => toggleMediaPhrase(item.id, p)}
                      aria-label={`移除片語 ${p.text}`}
                    >
                      {p.text} ✕
                    </button>
                  ))}
                </div>
              )}
              <div className="photo-item-actions">
                <button
                  type="button"
                  className="btn-phrase"
                  onClick={() => setPhraseTargetId(item.id)}
                >
                  片語
                </button>
                <button
                  type="button"
                  className="btn-delete"
                  onClick={() => removeMedia(item.id)}
                  aria-label={`刪除 ${labels.get(item.id)}`}
                >
                  刪除
                </button>
              </div>
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
          <button type="button" className="btn-close-player" onClick={() => setPlaying(null)}>
            ✕ 關閉
          </button>
        </div>
      )}

      {phraseTarget && (
        <div
          className="phrase-sheet-overlay"
          role="dialog"
          aria-label={`為 ${labels.get(phraseTarget.id)} 附加片語`}
          onClick={() => setPhraseTargetId(null)}
        >
          <div className="phrase-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="phrase-sheet-header">
              <span>
                附加片語到 <strong>{labels.get(phraseTarget.id)}</strong>
              </span>
              <button
                type="button"
                className="btn-sheet-done"
                onClick={() => setPhraseTargetId(null)}
              >
                完成
              </button>
            </div>
            <PhrasePicker
              selectedKeys={new Set(phraseTarget.phrases.map(phraseKey))}
              onToggle={(ref) => toggleMediaPhrase(phraseTarget.id, ref)}
            />
          </div>
        </div>
      )}
    </section>
  )
}
