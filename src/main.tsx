import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './lib/analytics'

// GA4(gtag.js) 초기화 — 프로덕션 빌드에 측정 ID가 있을 때만 실제로 로드된다.
initAnalytics()

// 모바일 롱프레스/우클릭으로 뜨는 이미지 저장 메뉴(컨텍스트 메뉴) 차단.
// 이미지에 대해서만 막으므로 확대·스와이프 등 기존 기능은 그대로 동작한다.
document.addEventListener('contextmenu', (e) => {
  if (e.target instanceof HTMLImageElement) e.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
