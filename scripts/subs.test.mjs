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
