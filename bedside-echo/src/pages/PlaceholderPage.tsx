import { useNavigate } from 'react-router-dom'

/** 尚未開發功能的佔位頁(錄影、查詢報告) */
export default function PlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate()
  return (
    <div className="page page-center">
      <div className="placeholder-icon" aria-hidden>
        🚧
      </div>
      <h1 className="placeholder-title">{title}</h1>
      <p className="placeholder-text">功能開發中,敬請期待</p>
      <button type="button" className="btn-big btn-secondary" onClick={() => navigate('/')}>
        返回首頁
      </button>
    </div>
  )
}
