/* 승부처가 언제 걸리는지 — 값이 뒤집히지 않게 못 박아 둔다 */
import { test, expect } from 'vitest';
import { createGame, pitch, batterOf, leverage, isClutch, CLUTCH_MARK, CLUTCH_LIMIT } from '../src/engine/pitchSim.js';
import { DRAFT_MODES, aiDraft, fillRoster, buildTeam } from '../src/KboAugmentDraft.jsx';

const g = (o) => ({ inning: 1, top: true, outs: 0, bases: [null, null, null], home: { runs: 0 }, away: { runs: 0 }, ...o });
const R = {}; // 주자 한 명 자리표시

test('늦은 이닝 · 붙은 점수 · 쌓인 주자일수록 무겁다', () => {
  const early = leverage(g({ inning: 2, bases: [R, null, null] }));
  const late = leverage(g({ inning: 8, bases: [R, null, null] }));
  expect(late).toBeGreaterThan(early);

  const close = leverage(g({ inning: 8, bases: [null, R, null], home: { runs: 3 }, away: { runs: 4 } }));
  const blowout = leverage(g({ inning: 8, bases: [null, R, null], home: { runs: 1 }, away: { runs: 9 } }));
  expect(close).toBeGreaterThan(blowout * 3);

  const empty = leverage(g({ inning: 8 }));
  const loaded = leverage(g({ inning: 8, bases: [R, R, R] }));
  expect(loaded).toBeGreaterThan(empty * 2);
});

test('아웃이 늘수록 가벼워진다', () => {
  const none = leverage(g({ inning: 7, outs: 0, bases: [null, R, null] }));
  const two = leverage(g({ inning: 7, outs: 2, bases: [null, R, null] }));
  expect(two).toBeLessThan(none);
});

test('멈출 자리와 지나갈 자리', () => {
  expect(isClutch(g({ inning: 8, outs: 1, bases: [null, R, null], home: { runs: 3 }, away: { runs: 4 } }))).toBe(true);
  expect(isClutch(g({ inning: 9, outs: 2, home: { runs: 1 }, away: { runs: 9 } }))).toBe(false);
  expect(isClutch(g({ inning: 2, outs: 2, bases: [R, null, null] }))).toBe(false);
});

test('문턱과 한도는 재어 둔 값', () => {
  expect(CLUTCH_MARK).toBeCloseTo(0.15, 2);
  expect(CLUTCH_LIMIT).toBe(3);
});

/* ── 실제 경기에서 몇 번이나 걸리는지 ── */
const POOL = DRAFT_MODES.find((m) => m.id === 'mix').players;
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const engineTeam = (team) => ({
  name: team.name,
  batters: (team.batters.length ? team.batters : team.roster.filter((p) => p.type === 'batter')).slice(0, 9),
  pitchers: team.roster.filter((p) => p.type === 'pitcher'),
  catcher: team.roster.find((p) => p.position === 'C'),
});

/** 한 경기에서 멈춘 횟수 — 한 번 멈추면 그 반이닝에는 다시 묻지 않는다 */
function stopsIn(seed) {
  const mk = (s) => {
    const r = fillRoster(aiDraft(POOL, { rng: mulberry32(s), cap: 800 }), POOL, mulberry32(s + 1));
    return engineTeam(buildTeam('팀', r, 0));
  };
  const game = createGame({ home: mk(seed * 7 + 1), away: mk(seed * 7 + 2), rng: mulberry32(seed) });
  let used = 0; let lastHalf = ''; let guard = 0;
  while (!game.final && guard++ < 20000) {
    const half = `${game.inning}${game.top ? 'T' : 'B'}`;
    if (half !== lastHalf && batterOf(game) && used < CLUTCH_LIMIT && isClutch(game)) { used += 1; lastHalf = half; }
    pitch(game);
  }
  return used;
}

test('경기당 멈추는 횟수가 한 줌이다', () => {
  const N = 30;
  const all = Array.from({ length: N }, (_, i) => stopsIn(1000 + i));
  const mean = all.reduce((a, b) => a + b, 0) / N;
  /* 너무 잦으면 피로하고, 너무 드물면 감독이 할 일이 없다 */
  expect(mean).toBeGreaterThan(1.2);
  expect(mean).toBeLessThan(CLUTCH_LIMIT);
  /* 한도를 넘겨 묻는 일은 없다 */
  expect(Math.max(...all)).toBeLessThanOrEqual(CLUTCH_LIMIT);
  /* 한 번도 안 멈추는 경기가 절반을 넘지 않는다 */
  expect(all.filter((s) => s === 0).length).toBeLessThan(N / 2);
});
