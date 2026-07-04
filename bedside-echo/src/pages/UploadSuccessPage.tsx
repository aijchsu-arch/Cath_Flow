import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useExam } from '../store/ExamContext'

const timeFormat = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** 模擬上傳成功後的檢查摘要頁 */
export default function UploadSuccessPage() {
  const navigate = useNavigate()
  const { examId } = useParams()
  const { getExam } = useExam()
  const exam = examId ? getExam(examId) : undefined

  if (!exam) return <Navigate to="/" replace />

  return (
    <div className="page page-center">
      <div className="success-icon" aria-hidden>
        ✓
      </div>
      <h1 className="success-title">上傳成功</h1>
      <p className="success-note">(目前為模擬上傳,資料僅存於瀏覽器記憶體)</p>

      <div className="summary-card">
        <h2>本次檢查摘要</h2>
        <dl>
          <div>
            <dt>病歷號</dt>
            <dd>{exam.patient.chartNo}</dd>
          </div>
          <div>
            <dt>病人</dt>
            <dd>
              {exam.patient.name}({exam.patient.gender}・{exam.patient.age} 歲)
            </dd>
          </div>
          <div>
            <dt>床號</dt>
            <dd>{exam.patient.bed}</dd>
          </div>
          <div>
            <dt>上傳時間</dt>
            <dd>{timeFormat.format(exam.uploadedAt)}</dd>
          </div>
          <div>
            <dt>照片數</dt>
            <dd>{exam.photos.length} 張</dd>
          </div>
        </dl>
      </div>

      <div className="success-actions">
        <button type="button" className="btn-big btn-primary" onClick={() => navigate('/camera')}>
          繼續拍攝
        </button>
        <button type="button" className="btn-big btn-secondary" onClick={() => navigate('/')}>
          返回首頁
        </button>
      </div>
    </div>
  )
}
