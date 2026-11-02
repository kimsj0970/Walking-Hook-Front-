import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { prerender } from './scripts/prerender'

// https://vite.dev/config/
export default defineConfig({
  // prerender: 빌드가 끝난 뒤 공개 콘텐츠 페이지의 HTML을 미리 만들어 둔다.
  // 크롤러가 자바스크립트 없이도 본문을 읽을 수 있게 하는 것이 목적이다.
  // 자세한 이유와 대상은 scripts/prerender.ts 주석에 있다.
  plugins: [react(), prerender()],
  server: {
    allowedHosts: true,   // TODO ngrok 도메인 허용
    cors: true,
  },
})
