/*
 * 정비 3단계 고르기 득실(목업 prep-fx 2안 '이전 → 이후', 2026-10-09) — 손으로 적던 문구가 엔진과 어긋났다
 *  (홈런 우선 '삼진 증가'는 실측 ±0, 안타 우선 '안타 증가'는 +0.4%) → 오늘 상대로 엔진이 직접 잰다
 *  셈 = 경기 중 결정 카드와 같은 oddsOf: 우리 9명 vs 상대 선발(득점권 2루 · 1아웃) · 상대 9명 vs 우리 선발, 타석마다 N번
 *  보이는 득실 = 안타 · 홈런 · 볼넷 · 삼진 가운데 이득 · 손해에서 가장 크게 움직인 것 하나씩(3% 안쪽은 뺌)
 *  N = 1500 — 400번은 정면 승부가 흔들렸다(안타 −16% 등, 1500번은 세 대진 모두 볼넷 ↓ · 홈런 소폭 ↑로 일정). 한 번 재는 데 약 0.7초라 나눠 잰다(sitOddsLater)
 */
import { createGame, stealOdds } from '../engine/pitchSim.js';
import { oddsOf } from '../play/choice.js';
import { seeded } from '../engine/rng.js';

const N = 1500;
const copy = (t) => ({ ...t, batters: [...t.batters], pitchers: [...t.pitchers], bench: [...(t.bench || [])] });
const zoneIn = (g) => (g.rng() < 0.35 ? { zone: [4, 1, 3, 5, 7][Math.floor(g.rng() * 5)] } : {}); // tactics condOrders pitchZone 과 같음
export const BAT_ORDERS = { rispPow: { approach: 'power' }, rispCon: { approach: 'contact' }, rispPat: { patience: 1 } };

/* 잴 일 54개(타자 9 × 4 · 상대 9 × 2) — 하나 약 13ms */
function jobs(home, away) {
  const one = (top, i, order) => () => {
    const g = createGame({ home: copy(home), away: copy(away), rng: seeded(31 + i) });
    if (top) { Object.assign(g, { top: true, inning: 3, outs: 1, bases: [null, null, null] }); g.away.idx = i; }
    else { Object.assign(g, { top: false, inning: 5, outs: 1, bases: [null, g.home.team.batters[(i + 8) % 9], null] }); g.home.idx = i; }
    return oddsOf(g, order, N);
  };
  const out = { bat: Array.from({ length: 9 }, () => ({})), pit: Array.from({ length: 9 }, () => ({})) }, list = [];
  for (let i = 0; i < 9; i += 1) {
    list.push([out.bat[i], 'base', one(false, i, () => ({}))]);
    for (const [k, o] of Object.entries(BAT_ORDERS)) list.push([out.bat[i], k, one(false, i, () => o)]);
    list.push([out.pit[i], 'base', one(true, i, () => ({}))], [out.pit[i], 'zone', one(true, i, zoneIn)]);
  }
  return { out, list };
}
/** 타자 9명 · 상대 9명마다 잰 확률 — { bat: { base, rispPow, ... }[9], pit: { base, zone }[9] } */
export function sitOdds(home, away) {
  const { out, list } = jobs(home, away);
  for (const [o, k, run] of list) o[k] = run();
  return out;
}
/** 화면용 — 일을 나눠 사이사이 손을 놓음(약 0.7초 동안 화면이 멈추지 않게). 돌려준 함수를 부르면 그만 잼 */
export function sitOddsLater(home, away, done) {
  const { out, list } = jobs(home, away);
  let at = 0, timer = 0, stop = false;
  const step = () => {
    const t0 = performance.now();
    while (at < list.length && performance.now() - t0 < 12) { const [o, k, run] = list[at++]; o[k] = run(); }
    if (stop) return;
    if (at < list.length) timer = setTimeout(step, 0); else done(out);
  };
  timer = setTimeout(step, 0);
  return () => { stop = true; clearTimeout(timer); };
}

const avg = (list) => { const o = {}; for (const x of list) for (const k of Object.keys(x)) o[k] = (o[k] || 0) + x[k] / list.length; return o; };
const KEYS = [['안타', 'hit', 1], ['홈런', 'hr', 1], ['볼넷', 'bb', 1], ['삼진', 'k', -1]];
/** 이득 · 손해에서 가장 크게 움직인 것 하나씩 — [{ ko, base, after, good }] (mine = 우리가 치는 쪽) */
export function topFx(from, to, mine = true) {
  const rel = (e) => (e.base ? (e.after - e.base) / e.base : 0);
  const all = KEYS.map(([ko, k, up]) => ({ ko, base: from[k], after: to[k], good: (to[k] - from[k]) * up * (mine ? 1 : -1) > 0 }))
    .filter((e) => Math.abs(rel(e)) >= 0.03).sort((x, y) => Math.abs(rel(y)) - Math.abs(rel(x)));
  return [all.find((e) => e.good), all.find((e) => !e.good)].filter(Boolean);
}
export const batFx = (odds, id) => topFx(avg(odds.bat.map((x) => x.base)), avg(odds.bat.map((x) => x[id])));
/** 정면 승부 — 교타자만이면 파워 80 아래 타자만 */
export function zoneFx(odds, away, conOnly) {
  const rows = odds.pit.filter((_, i) => !conOnly || (away.batters[i]?.stats?.power ?? 75) < 80);
  return rows.length ? topFx(avg(rows.map((x) => x.base)), avg(rows.map((x) => x.zone)), false) : [];
}
/** 도루 — 문턱 위 주자들의 성공 확률(경기 중 결정 카드와 같은 stealOdds) */
export function stealFx(home, away, thr) {
  const runners = home.batters.filter((p) => (p.stats?.speed ?? 75) >= thr);
  if (!runners.length) return [];
  const p = runners.reduce((a, r) => { const g = createGame({ home: copy(home), away: copy(away), rng: seeded(3) }); Object.assign(g, { top: false, inning: 5, outs: 0, bases: [r, null, null] }); return a + stealOdds(g, 0) / runners.length; }, 0);
  return [{ ko: '도루 성공', abs: p, good: true }, { ko: '실패 아웃', abs: 1 - p, good: false }];
}
