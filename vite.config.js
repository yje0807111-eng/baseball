import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — 나중에 Capacitor로 앱 패키징할 때 상대 경로가 필요하다.
export default defineConfig({
  base: './',
  plugins: [react()],
  // 미리보기 도구가 배정한 포트(PORT)를 쓴다. 없으면 Vite 기본값.
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
  build: {
    rollupOptions: {
      output: {
        /*
         * 파일을 셋으로 나눠 싣는다 — 한 덩어리면 첫 화면이 뜨기까지 전부 받아야 한다.
         *  series  시즌 로스터 412개. 가장 무겁지만 좀처럼 바뀌지 않아 캐시가 오래 간다
         *  vendor  react 등 라이브러리. 거의 바뀌지 않는다
         *  나머지  게임 코드. 자주 바뀌므로 따로 두어야 앞의 둘을 다시 받지 않는다
         */
        manualChunks(id) {
          if (id.includes('/src/data/series/')) return 'series';
          if (id.includes('/node_modules/')) return 'vendor';
          return null;
        },
      },
    },
  },
});
