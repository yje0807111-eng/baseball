/** 아티팩트(artifact/kbo-augment-draft.html)의 Tailwind CDN 설정과 같은 값을 유지할 것 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
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
