/* 효과형 증강이 공 단위 중계 엔진까지 실제로 닿는지 확인한다 */
import { test, expect } from 'vitest';
import { createGame, pitch, offenseOf, setMods, addRuns, noMod } from '../src/engine/pitchSim.js';
import { DRAFT_MODES, aiDraft, fillRoster, buildTeam, makeAugmentRuntime, AUGMENTS } from '../src/KboAugmentDraft.jsx';

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

/** 보정을 건 채로 N경기 치러 홈 팀 평균 득점 */
function meanRuns(mod, n = 40) {
  let total = 0;
  for (let i = 0; i < n; i++) {
    const rng = mulberry32(900 + i);
    const home = engineTeam(buildTeam('홈', fillRoster(aiDraft({ players: POOL, rng: mulberry32(900 + i) }))));
    const away = engineTeam(buildTeam('원정', fillRoster(aiDraft({ players: POOL, rng: mulberry32(5000 + i) }))));
    const g = createGame({ home, away, rng });
    let guard = 0;
    while (!g.final && guard++ < 1500) {
      setMods(g, { home: mod, away: noMod() });
      pitch(g);
    }
    total += g.home.runs;
  }
  return total / n;
}

test('엔진 보정 입구: 공격 보정을 걸면 득점이 오른다', () => {
  const base = meanRuns(noMod());
  const boosted = meanRuns({ ...noMod(), hit: 0.08, hr: 0.04 });
  expect(boosted).toBeGreaterThan(base);
});

test('증강 런타임: half 훅이 그 반 이닝 보정으로 옮겨진다', () => {
  const my = buildTeam('나', fillRoster(aiDraft({ players: POOL, rng: mulberry32(7) })));
  const opp = buildTeam('상대', fillRoster(aiDraft({ players: POOL, rng: mulberry32(8) })));
  const g = createGame({ home: engineTeam(my), away: engineTeam(opp), rng: mulberry32(9) });
  const aug = makeAugmentRuntime({
    augments: [{ id: 'x', name: '시험', tier: 'gold', passive: true, half: (c) => (c.isTop ? null : { add: 1 }) }],
    my, opp, record: { w: 0, l: 0, d: 0 },
  });
  g.top = false; // 우리(홈) 공격
  aug.beforeHalf(g);
  expect(g.home.mod.hit).toBeGreaterThan(0);
  expect(g.away.mod.hit).toBe(0);
});

test('증강 런타임: runs 훅이 그 이닝 점수를 바꾸고 자막을 남긴다', () => {
  const my = buildTeam('나', fillRoster(aiDraft({ players: POOL, rng: mulberry32(7) })));
  const opp = buildTeam('상대', fillRoster(aiDraft({ players: POOL, rng: mulberry32(8) })));
  const g = createGame({ home: engineTeam(my), away: engineTeam(opp), rng: mulberry32(9) });
  g.top = false;
  addRuns(g, 2, 1, 'home');
  expect(g.home.runs).toBe(2);
  const aug = makeAugmentRuntime({
    augments: [{ id: 'y', name: '한 점 더', tier: 'gold', passive: true, runs: (c, runs) => ({ runs: runs + 1, text: '한 점 추가' }) }],
    my, opp, record: { w: 0, l: 0, d: 0 },
  });
  const res = aug.afterHalf(g, 2, 1, false);
  expect(res.runs).toBe(3);
  expect(g.home.runs).toBe(3);
  expect(res.texts[0].text).toBe('한 점 추가');
});

test('증강 90종 모두 엔진 훅에서 터지지 않는다', () => {
  const my = buildTeam('나', fillRoster(aiDraft({ players: POOL, rng: mulberry32(11) })));
  const opp = buildTeam('상대', fillRoster(aiDraft({ players: POOL, rng: mulberry32(12) })));
  for (const a of AUGMENTS.filter((x) => x.passive)) {
    const g = createGame({ home: engineTeam(my), away: engineTeam(opp), rng: mulberry32(13) });
    const aug = makeAugmentRuntime({ augments: [a], my, opp, record: { w: 1, l: 1, d: 0 } });
    for (const inning of [1, 5, 9]) {
      for (const top of [true, false]) {
        g.inning = inning; g.top = top;
        aug.beforeHalf(g);
        aug.afterHalf(g, 2, inning, top);
      }
    }
  }
});

test('팀 보너스형 증강: bonus · 가중치 · 수비 계수가 엔진 edge 로 넘어가고 난이도 buff 는 빼고 센다', async () => {
  const { engineTeam } = await import('../src/BroadcastGame.jsx');
  const roster = fillRoster(aiDraft({ players: POOL, rng: mulberry32(21) }));
  const plain = buildTeam('AI', roster, 3);
  expect(plain.edge).toEqual({ bat: 0, pit: 0 });
  expect(engineTeam(plain).buff).toBe(3);
  const probe = { id: 'p', passive: true, team: (t) => { t.bonus.bat += 5; t.bonus.pit += 2; } };
  expect(buildTeam('나', roster, 3, [probe]).edge).toEqual({ bat: 5, pit: 2 });
});

test('엔진 edge: 타격 보너스를 주면 득점이 오른다', async () => {
  const { engineTeam } = await import('../src/BroadcastGame.jsx');
  const { simulateGame } = await import('../src/engine/pitchSim.js');
  const runs = (bat) => {
    let total = 0;
    for (let i = 0; i < 60; i++) {
      const home = { ...engineTeam(buildTeam('홈', fillRoster(aiDraft({ players: POOL, rng: mulberry32(300 + i) })))), edge: { bat, pit: 0 } };
      const away = engineTeam(buildTeam('원정', fillRoster(aiDraft({ players: POOL, rng: mulberry32(700 + i) }))));
      total += simulateGame({ home, away, rng: mulberry32(i), maxInnings: 9 }).home.runs;
    }
    return total;
  };
  expect(runs(8)).toBeGreaterThan(runs(0));
});

test('투수 운용 증강이 엔진 AI 감독 usage 로 옮겨진다', async () => {
  const { engineUsage } = await import('../src/BroadcastGame.jsx');
  expect(engineUsage({ aceMax: 4 }).starterPitches).toBe(60);
  expect(engineUsage({ completeGame: true }).starterPitches).toBeGreaterThanOrEqual(135);
  expect(engineUsage({ extraInnings: 1 }).starterPitches).toBe(110);
  expect(engineUsage({ noTired: true }).fatigueGrace).toBeGreaterThan(0);
  expect(engineUsage({ starterPitches: 80, relieverPitches: 18 })).toEqual({ starterPitches: 80, relieverPitches: 18 });
});
