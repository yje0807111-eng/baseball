/*
 * 팀 칸 배경 — 대진표 팀 칸에 구단 색 비단 깃발이 은은하게 깔린다 (public/ui/teams/flag-{key}.webp).
 * 팀 이름으로 구단을 찾는다: 구단 시즌 · 국가대표 · 구단 레전드 · 테마 레전드. 드래프트 AI 팀(○○ 드림팀)과 내 팀은 없음.
 * 실제 구단 로고는 쓰지 않는다 — 구단 색과 상징 실루엣만.
 */
const FLAGS = [
  [/국가대표|대한민국/, 'korea', '#60a5fa'],
  [/넥센|키움|히어로즈/, 'kiwoom', '#be185d'],
  [/MBC|LG/, 'lg', '#e11d48'],
  [/OB|두산/, 'doosan', '#6366f1'],
  [/삼성/, 'samsung', '#3b82f6'],
  [/해태|KIA/, 'kia', '#ef4444'],
  [/롯데/, 'lotte', '#60a5fa'],
  [/빙그레|한화/, 'hanwha', '#f97316'],
  [/SK|SSG/, 'sk', '#fb7185'],
  [/현대/, 'hyundai', '#818cf8'],
  [/NC/, 'nc', '#d4a72c'],
  [/KT/, 'kt', '#f43f5e'],
  [/레전드/, 'legend', '#fbbf24'],
];

/** 팀 이름 → { src, color } (못 찾으면 null) */
export function teamFlag(name = '') {
  const hit = FLAGS.find(([re]) => re.test(name));
  return hit ? { key: hit[1], src: `ui/teams/flag-${hit[1]}.webp`, color: hit[2] } : null;
}
