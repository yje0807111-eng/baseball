/*
 * 구단 네온 색 + 능력치 색 (V4: 푸른 회색 → 구단 색으로 이어지는 막대)
 *  드래프트 카드 테두리(TEAM_NEON)와 같은 계열. 없는 구단은 초록.
 */
export const TEAM_NEON = {
  한화: '#ff8a3d', 빙그레: '#ff8a3d', SK: '#ff5a67', SSG: '#ff5a67', 롯데: '#7cb4ff', KIA: '#ff5a67', 해태: '#ff5a67',
  두산: '#a5a3ff', OB: '#a5a3ff', NC: '#6cc0ff', 삼성: '#5aa2ff', 넥센: '#ff6b9a', 키움: '#ff6b9a', 우리: '#ff6b9a', 히어로즈: '#ff6b9a',
  KT: '#e5e7eb', LG: '#ff5c95', MBC: '#ff5c95', 현대: '#6f97ff', 태평양: '#6f97ff', 청보: '#6f97ff', 삼미: '#6f97ff',
  쌍방울: '#4ade80', 대한민국: '#60a5fa',
};
export const teamNeon = (p) => TEAM_NEON[p?.team] || '#10b981';

/** 포지션 색 (내 라커): 선발 파랑 · 불펜 빨강 · 포수 금 · 내야 초록 · 외야 보라 · 지명 분홍 */
export const POS_COLOR = { SP: '#60a5fa', RP: '#f87171', C: '#fbbf24', '1B': '#34d399', '2B': '#34d399', '3B': '#34d399', SS: '#34d399', OF: '#a78bfa', DH: '#f472b6' };
/** 능력치 구간 색 — 라커 영입 목록과 같은 신호등 (90+ 금 · 80+ 초록 · 70+ 노랑 · 60+ 주황 · 그 아래 빨강) */
export const statBandColor = (v) => (v >= 90 ? '#fbbf24' : v >= 80 ? '#34d399' : v >= 70 ? '#fde047' : v >= 60 ? '#fb923c' : '#f87171');

/** 능력치 막대 · 숫자 꾸밈 — 라커 영입 목록(.st-bar/.st-n)과 완전히 같은 값 */
export const statBarStyle = (v) => (v >= 90 ? { background: 'linear-gradient(90deg, #b45309, #fbbf24)' }
  : v >= 80 ? { background: '#34d399', boxShadow: '0 0 5px rgba(52,211,153,.45)' }
  : { background: statBandColor(v) });
export const statNumStyle = (v) => (v >= 90 ? { color: '#fbbf24', textShadow: '0 0 8px rgba(251,191,36,.45)' } : { color: statBandColor(v) });

export const posColor = (p) => POS_COLOR[p?.position] || '#10b981';

// '#rrggbb' 과 'rgb(r,g,b)' 둘 다 받는다 (mix 결과를 다시 mix 에 넣을 수 있게)
const hex = (c) => (c.startsWith('rgb') ? c.match(/\d+/g).slice(0, 3).map(Number) : [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
const mix = (a, b, t) => { const [x, y] = [hex(a), hex(b)]; return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
const norm = (v) => Math.max(0, Math.min(1, ((v ?? 0) - 40) / 60));

/**
 * 능력치 색 — 네 갈래로 묶어 타자와 투수가 짝을 이룬다.
 *  힘(파워 · 구위) 빨강 · 정확(컨택 · 제구) 초록 · 기동(주루 · 체력) 노랑 · 안정(수비 · 안정) 파랑
 * 어느 화면에서 보든 같은 수치는 같은 색이다.
 */
export const STAT_COLOR = {
  power: '#f87171', stuff: '#f87171',
  contact: '#34d399', control: '#34d399',
  speed: '#fbbf24', stamina: '#fbbf24',
  defense: '#60a5fa', stability: '#60a5fa',
};
/** 한글 이름으로도 찾을 수 있게 (중계 화면처럼 라벨만 들고 있는 곳) */
export const STAT_COLOR_KO = {
  파워: '#f87171', 구위: '#f87171',
  컨택: '#34d399', 제구: '#34d399',
  주루: '#fbbf24', 체력: '#fbbf24',
  수비: '#60a5fa', 안정: '#60a5fa',
};
/** 그 수치의 막대·숫자 색 (값이 높을수록 그 색이 짙어진다) */
export const statOf = (key, v) => statColor(v, STAT_COLOR[key] || STAT_COLOR_KO[key] || '#10b981');

/** 능력치 막대·숫자 색: 낮으면 푸른 회색, 높을수록 그 수치의 색으로 */
export function statColor(v, team = '#10b981') {
  const t = norm(v);
  return {
    bar: `linear-gradient(90deg, #334155, ${mix('#64748b', team, t)})`,
    num: mix('#94a3b8', mix(team, '#ffffff', 0.35), t),
  };
}
