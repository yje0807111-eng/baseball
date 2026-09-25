/*
 * 영입 시장 — 선수 영입가(골드) · 방출 환급 · 무상 선수 기준.
 * CP(샐러리 캡)는 "한 팀에 얼마나 담을 수 있나", 골드는 "그 선수를 얻는 값"이다. 둘 다 통과해야 영입된다.
 *
 * 영입가: 종합 75 = 150 G 에서 종합이 5 오를 때마다 두 배.
 *   75 → 150 · 80 → 300 · 85 → 600 · 90 → 1,200 · 95 → 2,400 · 100 → 4,800 · 105 → 9,600
 *   경기 보상(승 300 · 무 180 · 패 120 G)과 견주면 주전 한 자리 올리기 = 1~4승, 스타(90) = 4승, 100 이상 = 16승 남짓.
 *   영입 풀 7,056명의 가운데(종합 79)가 약 260 G — 시작 골드 5,000 이면 첫날 두세 자리는 바로 올릴 수 있다.
 * 레전드 시리즈 선수는 25% 더 비싸다(같은 종합이라도 찾는 사람이 많은 이름).
 * 방출하면 산 값의 절반을 돌려준다. 스타터 · 빈 자리 채우기로 받은 선수(산 값 0)는 돌려받을 것이 없다.
 */
export const PRICE_AT = 75;          // 이 종합에서
export const PRICE_BASE = 150;       // 이 값
export const PRICE_STEP = 5;         // 종합이 이만큼 오르면 두 배
export const PRICE_MIN = 50;
export const LEGEND_MARKUP = 1.25;
export const REFUND_RATE = 0.5;
/** 빈 자리 채우기에 쓰는 무상 선수의 영입가 한도 — 종합 72 안팎까지 */
export const FREE_FILL_MAX = 100;

const round10 = (v) => Math.round(v / 10) * 10;

/** 레전드 시리즈에서 온 선수인가 */
export const isLegend = (p) => String(p?.seriesId || p?.id || '').startsWith('legend');

/** 영입가(골드) */
export function priceOf(p) {
  if (!p) return 0;
  const raw = PRICE_BASE * 2 ** (((p.overall ?? PRICE_AT) - PRICE_AT) / PRICE_STEP) * (isLegend(p) ? LEGEND_MARKUP : 1);
  return Math.max(PRICE_MIN, round10(raw));
}

/** 방출 환급 — 산 값(paid)의 절반, 10 G 단위 버림 */
export const refundOf = (p) => Math.floor(((p?.paid || 0) * REFUND_RATE) / 10) * 10;

/** 무상으로 채워 줄 수 있는 선수인가 (빈 자리 채우기) */
export const isFreeFill = (p) => !p.isForeign && !isLegend(p) && priceOf(p) <= FREE_FILL_MAX;
