import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ExamProvider } from './store/ExamContext'
import { PhraseProvider } from './store/PhraseContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PhraseProvider>
        <ExamProvider>
          <App />
        </ExamProvider>
      </PhraseProvider>
    </BrowserRouter>
  </StrictMode>,
)
