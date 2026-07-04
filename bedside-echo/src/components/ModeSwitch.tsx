import { useNavigate } from 'react-router-dom'

/**
 * 拍照/錄影模式切換列:醫師床邊會反覆切換拍照與錄影,
 * 兩頁共用同一份檢查媒體清單,切換不會遺失已拍攝內容。
 * disabled:錄影中禁止切換(先停止錄影)。
 */
export default function ModeSwitch({
  mode,
  disabled = false,
}: {
  mode: 'camera' | 'video'
  disabled?: boolean
}) {
  const navigate = useNavigate()
  return (
    <div className="mode-switch" role="tablist" aria-label="拍照或錄影模式">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'camera'}
        className={`mode-switch-btn${mode === 'camera' ? ' active' : ''}`}
        disabled={disabled || mode === 'camera'}
        onClick={() => navigate('/camera', { replace: true })}
      >
        📷 拍照
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'video'}
        className={`mode-switch-btn${mode === 'video' ? ' active' : ''}`}
        disabled={disabled || mode === 'video'}
        onClick={() => navigate('/video', { replace: true })}
      >
        🎬 錄影
      </button>
    </div>
  )
}
