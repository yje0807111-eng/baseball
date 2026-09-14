import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — 나중에 Capacitor로 앱 패키징할 때 상대 경로가 필요하다.
export default defineConfig({
  base: './',
  plugins: [react()],
  // 미리보기 도구가 배정한 포트(PORT)를 쓴다. 없으면 Vite 기본값.
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
});
