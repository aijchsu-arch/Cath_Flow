import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PatientCard from '../components/PatientCard'
import { MOCK_CHART_NOS, fetchPatientByChartNo } from '../data/mockPatients'
import { useExam } from '../store/ExamContext'

type LookupState = 'idle' | 'loading' | 'found' | 'notFound'

export default function HomePage() {
  const navigate = useNavigate()
  const { patient, setPatient } = useExam()
  const [chartNo, setChartNo] = useState(patient?.chartNo ?? '')
  const [lookup, setLookup] = useState<LookupState>(patient ? 'found' : 'idle')
  // 避免快速連續查詢時,較慢的舊查詢結果覆蓋新查詢
  const querySeq = useRef(0)

  async function handleLookup(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    const seq = ++querySeq.current
    setLookup('loading')
    const result = await fetchPatientByChartNo(trimmed)
    if (seq !== querySeq.current) return
    setPatient(result)
    setLookup(result ? 'found' : 'notFound')
  }

  function handleChange(value: string) {
    // 只留數字,避免掃描槍或誤觸輸入雜訊
    const digits = value.replace(/\D/g, '')
    setChartNo(digits)
    setPatient(null)
    setLookup('idle')
    // 假資料病歷號皆為 8 碼,輸滿自動查詢,床邊少按一次按鈕
    if (digits.length === 8) void handleLookup(digits)
  }

  return (
    <div className="page">
      <header className="app-header">
        <h1>床邊心超</h1>
        <p className="app-subtitle">床邊心臟超音波簡易報告</p>
      </header>

      <section className="chartno-section">
        <label className="chartno-label" htmlFor="chartno">
          病歷號
        </label>
        <div className="chartno-row">
          <input
            id="chartno"
            className="chartno-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="輸入病歷號"
            value={chartNo}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleLookup(chartNo)
            }}
          />
          <button
            type="button"
            className="btn-lookup"
            onClick={() => void handleLookup(chartNo)}
            disabled={!chartNo || lookup === 'loading'}
          >
            {lookup === 'loading' ? '查詢中…' : '查詢'}
          </button>
        </div>

        {lookup === 'found' && patient && <PatientCard patient={patient} />}
        {lookup === 'notFound' && (
          <div className="lookup-hint error" role="alert">
            查無此病歷號,請確認後重新輸入。
          </div>
        )}
        {lookup !== 'found' && (
          <div className="lookup-hint">
            測試用病歷號(虛構資料):{MOCK_CHART_NOS.join('、')}
          </div>
        )}
      </section>

      <section className="action-section">
        <button
          type="button"
          className="btn-action btn-primary-action"
          onClick={() => navigate('/camera')}
          disabled={!patient}
        >
          <span className="btn-action-icon" aria-hidden>
            📷
          </span>
          拍照
        </button>
        <button type="button" className="btn-action" onClick={() => navigate('/video')}>
          <span className="btn-action-icon" aria-hidden>
            🎬
          </span>
          錄影
        </button>
        <button type="button" className="btn-action" onClick={() => navigate('/reports')}>
          <span className="btn-action-icon" aria-hidden>
            📋
          </span>
          查詢報告
        </button>
        {!patient && <p className="action-note">請先輸入病歷號帶出病人資料,再開始拍照</p>}
      </section>
    </div>
  )
}
