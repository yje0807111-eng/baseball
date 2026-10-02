/* 한 번 하고 끝나는 작전은 첫 공에만 — 번트 · 히트앤런이 타석 내내 다시 걸리지 않게 */
import { test, expect } from 'vitest';
import { callCards } from '../src/BroadcastGame.jsx';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/BroadcastGame.jsx';
import { createGame, pitch } from '../src/engine/pitchSim.js';
import { seeded } from '../src/myteam/tournament.js';

const game = (seed) => {
  const g = createGame({ home: engineTeam(seriesTeam(AI_SERIES[3], seeded(1))), away: engineTeam(seriesTeam(AI_SERIES[9], seeded(2))), rng: seeded(seed) });
  g.top = false; g.bases = [{ id: 'r1' }, null, null]; g.outs = 0;
  return g;
};

test('번트 · 히트앤런 · 도루는 첫 공에만', () => {
  const g = game(1);
  const cards = Object.fromEntries(callCards(g).map((c) => [c.k, c]));
  expect(cards.hnr.order(g)).toEqual({ hitAndRun: true });
  expect(cards.sac.order(g)).toEqual({ bunt: true });
  g.balls = 1;
  expect(cards.hnr.order(g)).toEqual({});
  expect(cards.sac.order(g)).toEqual({});
  expect(cards.steal.order(g)).toEqual({});
});

test('히트앤런 타석에도 볼넷 · 병살이 남는다 — 공마다 걸면 둘 다 0 이었다', () => {
  const card = callCards(game(1)).find((c) => c.k === 'hnr');
  const rate = (order) => {
    const c = { BB: 0, DP: 0 };
    for (let i = 0; i < 1500; i += 1) {
      const g = game(i + 10);
      let ev; do { ev = pitch(g, order(g)); } while (ev && !ev.result);
      if (ev?.result in c) c[ev.result] += 1;
    }
    return c;
  };
  const every = rate(() => ({ hitAndRun: true })), once = rate(card.order);
  expect(every.BB + every.DP).toBe(0);
  expect(once.BB).toBeGreaterThan(40);
  expect(once.DP).toBeGreaterThan(10);
});
