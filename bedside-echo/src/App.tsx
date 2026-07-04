import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import CameraPage from './pages/CameraPage'
import PlaceholderPage from './pages/PlaceholderPage'
import UploadSuccessPage from './pages/UploadSuccessPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/camera" element={<CameraPage />} />
      <Route path="/video" element={<PlaceholderPage title="錄影" />} />
      <Route path="/reports" element={<PlaceholderPage title="查詢報告" />} />
      <Route path="/uploaded/:examId" element={<UploadSuccessPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
