/** 아티팩트(artifact/kbo-augment-draft.html)의 Tailwind CDN 설정과 같은 값을 유지할 것 */
export default {
  // 목업(mockups/)은 개발 때만 훑는다 — 빌드 결과에는 목업 전용 클래스가 들어가지 않는다
  content: ['./index.html', './src/**/*.{js,jsx}', ...(process.env.NODE_ENV === 'production' ? [] : ['./mockups/**/*.{js,jsx,html}'])],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans KR"', '"Apple SD Gothic Neo"', '"Malgun Gothic"', 'system-ui', 'sans-serif'],
        display: ['"Saira Condensed"', '"IBM Plex Sans KR"', '"Malgun Gothic"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
