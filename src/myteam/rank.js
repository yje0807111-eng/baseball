/*
 * 랭크 — 일반 모드 경기 결과로 승점(RP)을 쌓아 등급을 올린다.
 *  등급 6개 × 단계 III·II·I (단계마다 100 RP). 승 +20 · 무 +5 · 패 −12, 0 아래로는 내려가지 않는다.
 */
export const TIERS = [
  { key: 'rookie', ko: '루키', en: 'ROOKIE', c: '#94a3b8', min: 0 },
  { key: 'futures', ko: '퓨처스', en: 'FUTURES', c: '#a3e635', min: 300 },
  { key: 'first', ko: '1군', en: 'FIRST TEAM', c: '#38bdf8', min: 600 },
  { key: 'allstar', ko: '올스타', en: 'ALL-STAR', c: '#fbbf24', min: 900 },
  { key: 'mvp', ko: 'MVP', en: 'MVP', c: '#f472b6', min: 1200 },
  { key: 'hof', ko: '명예의 전당', en: 'HALL OF FAME', c: '#e879f9', min: 1500 },
];
const DIV = ['III', 'II', 'I'];
export const RP_DELTA = { my: 20, draw: 5, opp: -12 };

export function rankOf(rp = 0) {
  const i = TIERS.reduce((k, t, n) => (rp >= t.min ? n : k), 0);
  const tier = TIERS[i];
  const next = TIERS[i + 1] || null;
  const top = !next;
  const into = rp - tier.min;
  return {
    tier, next, index: i,
    div: top ? '' : DIV[Math.min(2, Math.floor(into / 100))],
    inDiv: top ? 100 : Math.min(100, into - Math.min(2, Math.floor(into / 100)) * 100),
    toNext: next ? next.min - rp : 0,
  };
}

/** 메인 랭크 판 요약: 최근 10경기 · 시즌 MVP(가장 많이 뽑힌 선수) · 자주 쓴 증강 */
export function rankSummary(history = []) {
  const recent = history.slice(0, 10);
  const form = recent.map((h) => (h.winner === 'my' ? 'W' : h.winner === 'opp' ? 'L' : 'D'));
  const winRate = recent.length ? Math.round((form.filter((r) => r === 'W').length / recent.length) * 100) : null;
  const count = (list) => {
    const m = new Map();
    list.filter(Boolean).forEach((x) => { const c = m.get(x.id) || { ...x, n: 0 }; c.n += 1; m.set(x.id, c); });
    return [...m.values()].sort((a, b) => b.n - a.n);
  };
  let streak = 0;
  for (const r of form) { if (r === form[0] && r !== 'D') streak += 1; else break; }
  return {
    form, winRate, streak: form[0] === 'W' ? streak : 0,
    mvp: count(history.map((h) => h.mvp))[0] || null,
    augs: count(history.flatMap((h) => h.augs || [])).slice(0, 3),
    lastDelta: history[0]?.rp ?? null,
  };
}
