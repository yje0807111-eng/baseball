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

/*
 * 시세 — 영입가(기준) × 인기 × 그날 흐름. 모두에게 같은 날 같은 값(날짜 씨앗).
 *   인기: 카드 메모의 수상 이력 — MVP +15%, 골든글러브 · 타이틀(타격 · 홈런 · 다승 · 구원 · 신인왕 · 최다안타 …) +8%, 합쳐 최대 +20%.
 *   흐름: 선수마다 주 단위로 천천히 오르내리는 ±10% — 이레마다 새 값을 뽑고 그 사이를 매끄럽게 잇는다(하루에 크게 튀지 않게).
 *   '오늘 싸게 샀다'는 순간을 만들되, 방출 환급은 산 값의 절반이라 되팔기로는 이득이 나지 않는다.
 */
export const TREND_AMP = 0.1;
export const TREND_DAYS = 7;
const POP_RULES = [
  [/MVP/, 0.15],
  [/골든글러브|GG|타격왕|홈런왕|다승왕|구원왕|세이브왕|신인왕|최다안타|도루왕|탈삼진왕|관왕|트리플크라운/, 0.08],
];
export const POP_MAX = 0.2;
/** 인기 배수 (1 ~ 1.2) */
export function popularityOf(p) {
  const note = p?.note || '';
  return 1 + Math.min(POP_MAX, POP_RULES.reduce((n, [re, v]) => n + (re.test(note) ? v : 0), 0));
}
/** 날짜 → 날 번호(현지 자정 기준) */
export const dayIndex = (d = new Date()) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
const hash01 = (key) => {
  let h = 2166136261;
  for (const ch of String(key)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
};
/** 흐름 배수 (0.9 ~ 1.1) — 이레마다 뽑은 두 값 사이를 코사인으로 잇는다 */
export function trendOf(p, day = dayIndex()) {
  const k = Math.floor(day / TREND_DAYS);
  const t = (day % TREND_DAYS) / TREND_DAYS;
  const a = hash01(`${p.id}|${k}`) * 2 - 1;
  const b = hash01(`${p.id}|${k + 1}`) * 2 - 1;
  const w = (1 - Math.cos(Math.PI * t)) / 2;
  return 1 + TREND_AMP * (a + (b - a) * w);
}
/** 오늘 시세(골드) */
export function marketPriceOf(p, day = dayIndex()) {
  return Math.max(PRICE_MIN, round10(priceOf(p) * popularityOf(p) * trendOf(p, day)));
}
/** 시세 한 줄 — 기준(영입가 × 인기)과 견준 오늘 흐름 % · 어제와 견준 방향 */
export function quoteOf(p, day = dayIndex()) {
  const tr = trendOf(p, day);
  return { price: marketPriceOf(p, day), pct: Math.round((tr - 1) * 100), up: tr >= trendOf(p, day - 1), pop: Math.round((popularityOf(p) - 1) * 100) };
}

/** 방출 환급 — 산 값(paid)의 절반, 10 G 단위 버림 */
export const refundOf = (p) => Math.floor(((p?.paid || 0) * REFUND_RATE) / 10) * 10;

/*
 * 오늘의 특가 — 날짜(현지 자정 기준)를 씨앗으로 매일 12명을 30% 싸게. 모두에게 같은 날 같은 명단.
 * 포지션을 고르게(선발 2 · 불펜 2 · 포수 · 1 · 2 · 3루 · 유격 · 외야 3), 종합 82~100 — 스타터를 넘어서는 한 자리.
 * 7,056명 전원을 언제든 살 수 있는 시장에 '오늘 들러 볼 이유'를 하나 둔다(막지는 않는다).
 */
export const DEAL_COUNT = 12;
export const DEAL_OFF = 0.3;
export const DEAL_BAND = [82, 100];
const DEAL_PLAN = [['SP', 2], ['RP', 2], ['C', 1], ['1B', 1], ['2B', 1], ['3B', 1], ['SS', 1], ['OF', 3]];
/** 오늘 날짜 열쇠 YYYY-MM-DD (현지 시각) */
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function seeded(key) {
  let h = 2166136261;
  for (const ch of String(key)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  let t = h >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
/** 특가 값 — 그날 시세의 70%, 10 G 단위 */
export const dealPriceOf = (p, day = dayIndex()) => Math.max(PRICE_MIN, round10(marketPriceOf(p, day) * (1 - DEAL_OFF)));
/** 오늘의 특가 명단 → Map(선수 id → 특가). pool 은 영입 풀(구단 시즌 선수) */
export function dailyDeals(pool = [], key = todayKey(), day = dayIndex()) {
  const rng = seeded(`deal-${key}`);
  const band = pool.filter((p) => p.overall >= DEAL_BAND[0] && p.overall <= DEAL_BAND[1]);
  const used = new Set();
  const out = new Map();
  for (const [pos, n] of DEAL_PLAN) {
    const cands = band.filter((p) => p.position === pos);
    for (let i = 0; i < n && cands.length; i += 1) {
      let tries = 0;
      let p = null;
      while (tries++ < 20) { const c = cands[Math.floor(rng() * cands.length)]; if (!used.has(c.personId)) { p = c; break; } }
      if (!p) continue;
      used.add(p.personId);
      out.set(p.id, dealPriceOf(p, day));
    }
  }
  return out;
}

/** 무상으로 채워 줄 수 있는 선수인가 (빈 자리 채우기) */
export const isFreeFill = (p) => !p.isForeign && !isLegend(p) && priceOf(p) <= FREE_FILL_MAX;
