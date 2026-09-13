import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — 나중에 Capacitor로 앱 패키징할 때 상대 경로가 필요하다.
export default defineConfig({
  base: './',
  plugins: [react()],
});
