/*
 * 선수 도감 — 한 번이라도 가진 선수(영입 · 교체 영입 · 기념 카드 · 스타터)를 모은다(account.dex = 선수 id 목록).
 * 방출해도 도감에서는 지워지지 않는다. 시리즈(구단 시즌 · 레전드, 18명)마다 모은 수로 보상.
 *
 * 보상: 6명 100 G · 12명 300 G · 18명 전부 800 G (합 1,200 G).
 *   되팔기로 이득이 나지 않게 잡은 값 — 가장 싼 시리즈 18명을 사서(약 2,700 G) 모두 되팔아도(절반 환급) 1,350 G 가 들어,
 *   보상 1,200 G 로는 남지 않는다. 도감은 돈벌이가 아니라 '모으는 목표'다.
 */
export const DEX_STEPS = [
  { n: 6, gold: 100 },
  { n: 12, gold: 300 },
  { n: 18, gold: 800 },
];

/** 시리즈 하나의 진행 — owned: 도감에 있는 id 집합 */
export function seriesProgress(series, owned) {
  const have = series.players.filter((p) => owned.has(p.id)).length;
  return { have, total: series.players.length, steps: DEX_STEPS.map((s, i) => ({ ...s, i, reached: have >= Math.min(s.n, series.players.length) })) };
}

/** 받을 수 있는 보상 — claimed: { [seriesId]: 받은 단계 수 } */
export function claimableSteps(series, owned, claimed = {}) {
  const done = claimed[series.id] || 0;
  return seriesProgress(series, owned).steps.filter((s) => s.reached && s.i >= done);
}
