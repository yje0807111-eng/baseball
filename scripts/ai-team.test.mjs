/* 적 AI: 시리즈 멤버 그대로 팀 구성 · 조사값(usage)에 따른 투수 교체 */
import { test, expect } from 'vitest';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/BroadcastGame.jsx';
import { createGame, simulateGame, aiPitchingChange } from '../src/engine/pitchSim.js';
import { seeded } from '../src/myteam/tournament.js';

test('시리즈 팀: 멤버 그대로 · 선발 먼저 · 마무리 마지막', () => {
  expect(AI_SERIES.length).toBeGreaterThan(60);
  const s = AI_SERIES.find((x) => x.id === '2008-sk') || AI_SERIES[0];
  const t = seriesTeam(s, seeded(3));
  expect(t.roster).toBe(s.players);
  expect(t.batters).toHaveLength(9);
  const e = engineTeam(t);
  expect(e.pitchers[0].position).toBe('SP');
  expect(e.pitchers[e.pitchers.length - 1].id).toBe(t.closerId);
});

test('선발 투구 수 한도 · 마무리 투입', () => {
  const s = AI_SERIES[5];
  const team = engineTeam({ ...seriesTeam(s, seeded(1)), usage: { starterPitches: 80, relieverPitches: 20, quickHook: 0.5, closerInnings: 1 } });
  const g = createGame({ home: team, away: engineTeam(seriesTeam(AI_SERIES[6], seeded(2))) });
  g.home.pitches = 79;
  expect(aiPitchingChange(g, g.home)).toBeNull();
  g.home.pitches = 80;
  const next = aiPitchingChange(g, g.home);
  expect(next).toBeTruthy();
  expect(next).not.toBe(team.closerId); // 순번 교체 땐 마무리를 아껴 둔다
  g.home.pitches = 10; g.inning = 9; g.home.runs = 3; g.away.runs = 1; g.outs = 0;
  expect(aiPitchingChange(g, g.home)).toBe(team.closerId);
});

test('시뮬레이션에서 투수가 한 명으로 끝까지 던지지 않는다', () => {
  let changed = 0;
  for (let i = 0; i < 20; i++) {
    const home = engineTeam(seriesTeam(AI_SERIES[i % AI_SERIES.length], seeded(i)));
    const away = engineTeam(seriesTeam(AI_SERIES[(i + 7) % AI_SERIES.length], seeded(i + 99)));
    const g = simulateGame({ home, away, rng: seeded(500 + i), maxInnings: 9 });
    if (g.home.pitcherIdx > 0 && g.away.pitcherIdx > 0) changed += 1;
  }
  expect(changed).toBeGreaterThanOrEqual(18);
}, 20000);
