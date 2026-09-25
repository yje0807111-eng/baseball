/** 아티팩트(artifact/kbo-augment-draft.html)의 Tailwind CDN 설정과 같은 값을 유지할 것 */
export default {
  // 목업(mockups/)은 개발 때만 훑는다 — 빌드 결과에는 목업 전용 클래스가 들어가지 않는다
  content: ['./index.html', './src/**/*.{js,jsx}', ...(process.env.NODE_ENV === 'production' ? [] : ['./mockups/**/*.{js,jsx,html}'])],
  theme: {
    extend: {
      /* 공통 규칙 — 글자 크기 4단계: 제목 · 소제목(큰 숫자) · 본문 · 보조. 36px 넘는 큰 숫자만 따로 */
      fontSize: { t1: '28px', t2: '18px', t3: '14px', t4: '12px' },
      /* 공통 규칙 — 색: 글 3단 · 우리(주 단추) · 주의 · 나쁨. 상대는 그 구단 색 */
      colors: { ink: { 1: '#ffffff', 2: '#9ca3af', 3: '#6b7280' }, us: '#10b981', warn: '#fbbf24', bad: '#f87171' },
      fontFamily: {
        sans: ['"IBM Plex Sans KR"', '"Apple SD Gothic Neo"', '"Malgun Gothic"', 'system-ui', 'sans-serif'],
        display: ['"Saira Condensed"', '"IBM Plex Sans KR"', '"Malgun Gothic"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
