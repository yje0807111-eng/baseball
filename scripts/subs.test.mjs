/* 대타 · 대주자 — 벤치 선수가 그 타순 자리를 넘겨받고, 벤치에서 빠진다 */
import { test, expect } from 'vitest';
import { createGame, pitch, batterOf } from '../src/engine/pitchSim.js';
import { seeded } from '../src/engine/rng.js';

const man = (id, s) => ({ id, name: id, position: 'CF', stats: { contact: 75, power: 75, speed: 70, defense: 75, stuff: 80, control: 78, ...s } });
const team = (tag) => ({ name: tag, batters: Array.from({ length: 9 }, (_, i) => man(`${tag}${i}`)), bench: [man(`${tag}PH`, { power: 95 }), man(`${tag}PR`, { speed: 99 })], pitchers: [man(`${tag}P`), man(`${tag}R`)] });

test('대타는 새 타석에서 그 자리를 넘겨받는다', () => {
  const g = createGame({ home: team('H'), away: team('A'), rng: seeded(1) });
  const ev = pitch(g, { pinchHit: 'APH' });
  expect(ev.batter.id).toBe('APH');
  expect(g.away.team.batters[0].id).toBe('APH');
  expect(g.away.team.bench.map((p) => p.id)).toEqual(['APR']);
});

test('대주자는 그 루 주자와 타순 자리를 넘겨받는다', () => {
  const g = createGame({ home: team('H'), away: team('A'), rng: seeded(2) });
  g.bases[0] = g.away.team.batters[8]; g.away.idx = 0;
  pitch(g, { pinchRun: { base: 0, id: 'APR' } });
  expect(g.away.team.batters[8].id).toBe('APR');
  expect(g.away.team.bench.find((p) => p.id === 'APR')).toBeUndefined();
});

test('볼카운트 중간의 대타는 받지 않는다', () => {
  const g = createGame({ home: team('H'), away: team('A'), rng: seeded(3) });
  g.balls = 1;
  pitch(g, { pinchHit: 'APH' });
  expect(g.away.team.bench.length).toBe(2);
  expect(batterOf(g).id).not.toBe('APH');
});

test('감독이 부르는 불펜은 한 경기 PEN_CALLS 번까지 — 자동 교체는 안 센다', async () => {
  const { PEN_CALLS, penCallsLeft } = await import('../src/engine/pitchSim.js');
  const t = () => ({ ...team('H'), pitchers: Array.from({ length: 6 }, (_, i) => man(`HP${i}`)) });
  const g = createGame({ home: t(), away: team('A'), rng: seeded(4) });
  for (let i = 0; i < PEN_CALLS + 1; i += 1) { g.balls = 0; g.strikes = 0; pitch(g, { changePitcher: true, call: true }); }
  expect(g.home.pitcherIdx).toBe(PEN_CALLS);
  expect(penCallsLeft(g.home)).toBe(0);
  g.balls = 0; g.strikes = 0; pitch(g, { changePitcher: true });
  expect(g.home.pitcherIdx).toBe(PEN_CALLS + 1);
});

test('불펜 대가 — 한 이닝이면 다음 경기 85, 연투면 70', async () => {
  const { penCostOf } = await import('../src/myteam/fatigue.js');
  expect(penCostOf('x')).toBe(85);
  expect(penCostOf('x', { x: { rest: 0, streak: 1 } })).toBe(70);
  expect(penCostOf('x', {}, 5)).toBe(100);
});

test('경기 중 팀 바꾸기(증강) — 불러 둔 불펜 · 대타는 그대로, 능력치만 새것', async () => {
  const { replaceTeam } = await import('../src/engine/pitchSim.js');
  const t = () => ({ ...team('H'), pitchers: Array.from({ length: 5 }, (_, i) => man(`HP${i}`)) });
  const g = createGame({ home: t(), away: team('A'), rng: seeded(5) });
  pitch(g, { changePitcher: 'HP3', call: true });
  expect(g.home.pitcher.id).toBe('HP3');
  const buffed = t(); buffed.pitchers = buffed.pitchers.map((p) => ({ ...p, stats: { ...p.stats, stuff: 99 } }));
  replaceTeam(g.home, buffed);
  expect(g.home.pitcher.id).toBe('HP3');
  expect(g.home.pitcher.stats.stuff).toBe(99);
  expect(g.home.team.pitchers.slice(g.home.pitcherIdx + 1).map((p) => p.id)).not.toContain('HP3');
});
