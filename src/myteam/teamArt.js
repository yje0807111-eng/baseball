/*
 * 팀 칸 배경 — 대진표 팀 칸에 구단 색 비단 깃발이 은은하게 깔린다 (public/ui/teams/flag-{key}.webp).
 * 팀 이름으로 구단을 찾는다: 구단 시즌 · 국가대표 · 구단 레전드 · 테마 레전드. 드래프트 AI 팀(○○ 드림팀)은 없음.
 * 내 팀 칸은 프로필에서 고른 배너(store profile.banner)를 쓴다.
 * 실제 구단 로고는 쓰지 않는다 — 구단 색과 상징 실루엣만.
 */
const FLAGS = [
  [/국가대표|대한민국/, 'korea', '#60a5fa', '대한민국'],
  [/넥센|키움|히어로즈/, 'kiwoom', '#be185d', '키움 히어로즈'],
  [/MBC|LG/, 'lg', '#e11d48', 'LG 트윈스'],
  [/OB|두산/, 'doosan', '#6366f1', '두산 베어스'],
  [/삼성/, 'samsung', '#3b82f6', '삼성 라이온즈'],
  [/해태|KIA/, 'kia', '#ef4444', 'KIA 타이거즈'],
  [/롯데/, 'lotte', '#60a5fa', '롯데 자이언츠'],
  [/빙그레|한화/, 'hanwha', '#f97316', '한화 이글스'],
  [/SK|SSG/, 'sk', '#fb7185', 'SSG 랜더스'],
  [/현대/, 'hyundai', '#818cf8', '현대 유니콘스'],
  [/NC/, 'nc', '#d4a72c', 'NC 다이노스'],
  [/KT/, 'kt', '#f43f5e', 'KT 위즈'],
  [/레전드/, 'legend', '#fbbf24', '레전드'],
];
const flagOf = ([, key, color, label]) => ({ key, label, color, src: `ui/teams/flag-${key}.webp` });

/** 프로필에서 고를 수 있는 배너 전부 */
export const BANNERS = FLAGS.map(flagOf);
/** 배너 key → { key, label, color, src } (없으면 null) */
export const flagByKey = (key) => BANNERS.find((b) => b.key === key) || null;

/** 팀 이름 → { src, color } (못 찾으면 null) */
export function teamFlag(name = '') {
  const hit = FLAGS.find(([re]) => re.test(name));
  return hit ? flagOf(hit) : null;
}
