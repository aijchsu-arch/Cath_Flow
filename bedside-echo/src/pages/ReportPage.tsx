import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PhraseRef } from '../types'
import { useExam } from '../store/ExamContext'
import { generateReport, phraseKey } from '../utils/report'
import { formatBytes } from '../utils/format'
import PhrasePicker from '../components/PhrasePicker'

/**
 * 產生報告頁(上傳確認前的步驟):
 * - 滑動式片語選單:點選加入報告、再點取消
 * - 報告內文為可完整編輯的多行文字框;手動編輯過(dirty)之後,
 *   不再自動重新產生 —— 新片語改為插入游標位置或文末,取消片語
 *   則嘗試從內文移除該句,絕不覆蓋醫師已編輯的內容
 */
export default function ReportPage() {
  const navigate = useNavigate()
  const {
    patient,
    media,
    totalBytes,
    reportText,
    setReportText,
    reportDirty,
    setReportDirty,
    reportSelections,
    setReportSelections,
    submitExam,
  } = useExam()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // 最後一次游標位置:點片語按鈕時文字框已失焦,插入位置以此為準
  const cursorRef = useRef<number | null>(null)
  const [uploading, setUploading] = useState(false)
  // 檢查時間:進入報告頁時定一次,重新產生時保持穩定
  const examTimeRef = useRef(new Date())

  useEffect(() => {
    if (!patient) navigate('/', { replace: true })
  }, [patient, navigate])

  // 未手動編輯前,報告隨選取的片語/媒體自動重新產生
  useEffect(() => {
    if (!patient || reportDirty) return
    setReportText(
      generateReport({
        patient,
        media,
        selections: reportSelections,
        examTime: examTimeRef.current,
      }),
    )
  }, [patient, media, reportSelections, reportDirty, setReportText])

  if (!patient) return null

  const selectedKeys = new Set(reportSelections.map(phraseKey))

  function handleToggle(ref: PhraseRef) {
    const key = phraseKey(ref)
    if (selectedKeys.has(key)) {
      setReportSelections(reportSelections.filter((s) => phraseKey(s) !== key))
      if (reportDirty) {
        // 已手動編輯:嘗試從內文移除該片語(含可能的「- 」前綴),找不到就只取消標示
        const lineRe = new RegExp(`^- ${escapeRegExp(ref.text)}( \\[[^\\]]*\\])?$\\n?`, 'm')
        if (lineRe.test(reportText)) {
          setReportText(reportText.replace(lineRe, ''))
        } else if (reportText.includes(ref.text)) {
          setReportText(reportText.replace(ref.text, ''))
        }
      }
    } else {
      setReportSelections([...reportSelections, ref])
      if (reportDirty) {
        // 已手動編輯:插入最後游標位置;從未點過文字框則附加到文末
        const pos = cursorRef.current
        if (pos !== null && pos >= 0 && pos <= reportText.length) {
          setReportText(`${reportText.slice(0, pos)}${ref.text}${reportText.slice(pos)}`)
          cursorRef.current = pos + ref.text.length
        } else {
          const sep = reportText.endsWith('\n') || reportText === '' ? '' : '\n'
          setReportText(`${reportText}${sep}- ${ref.text}\n`)
        }
      }
    }
  }

  function handleRegenerate() {
    if (
      reportDirty &&
      !window.confirm('將依目前選取的片語重新產生報告,已手動編輯的內容會被取代,確定?')
    ) {
      return
    }
    cursorRef.current = null
    setReportDirty(false) // effect 會重新產生
  }

  /** 記住游標位置(點選、打字、選取都更新) */
  function rememberCursor() {
    const ta = textareaRef.current
    if (ta) cursorRef.current = ta.selectionStart
  }

  async function handleSubmit() {
    if (uploading) return
    setUploading(true)
    try {
      const examId = await submitExam()
      navigate(`/uploaded/${examId}`, { replace: true })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="page report-page">
      <header className="camera-header">
        <button type="button" className="btn-back" onClick={() => navigate(-1)}>
          ‹ 返回
        </button>
        <div className="camera-patient">
          {patient.name}|{patient.chartNo}|{patient.bed}
        </div>
      </header>

      <div className="report-media-summary">
        媒體 {media.length} 項・{formatBytes(totalBytes)}
        {reportDirty && <span className="report-dirty-badge">已手動編輯</span>}
      </div>

      <PhrasePicker selectedKeys={selectedKeys} onToggle={handleToggle} />

      <div className="report-editor-header">
        <label htmlFor="report-text">報告內文(可自由編輯)</label>
        <button type="button" className="btn-phrase-tool" onClick={handleRegenerate}>
          重新產生
        </button>
      </div>
      <textarea
        id="report-text"
        ref={textareaRef}
        className="report-textarea"
        value={reportText}
        rows={12}
        onChange={(e) => {
          setReportText(e.target.value)
          cursorRef.current = e.target.selectionStart
          if (!reportDirty) setReportDirty(true)
        }}
        onSelect={rememberCursor}
        onBlur={rememberCursor}
      />

      <div className="submit-bar">
        <button
          type="button"
          className="btn-big btn-primary"
          onClick={() => void handleSubmit()}
          disabled={uploading}
        >
          {uploading ? '上傳中…' : `確認上傳(${media.length} 項媒體+報告)`}
        </button>
      </div>
    </div>
  )
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
