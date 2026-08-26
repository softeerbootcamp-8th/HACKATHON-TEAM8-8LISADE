import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import App from './App'
import './index.css'

// 웹(브라우저)에서 Capacitor Camera가 실제 카메라 라이브 뷰(<pwa-camera-modal>)를 쓰도록 등록한다.
// 등록하지 않으면 컴포넌트가 없어 아무 제약 없는 일반 파일 선택창으로 조용히 폴백된다.
void defineCustomElements(window)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
