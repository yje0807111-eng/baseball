import { describe, it, expect, beforeEach } from 'vitest';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
const store = await import('../src/myteam/store.js');
const { envOf, augOptions, augsForHistory, MATCH_AUG_INNINGS } = await import('../src/myteam/matchAug.js');
const { AUGMENTS, makeAugmentRuntime } = await import('../src/KboAugmentDraft.jsx');
const { starterSquad } = await import('../src/myteam/starter.js');
const { readyRoster, matchTeamOf } = await import('../src/myteam/prep.js');
const { AI_SERIES, seriesTeam } = await import('../src/myteam/aiTeam.js');
const { engineTeam } = await import('../src/BroadcastGame.jsx');
const { createGame, pitch } = await import('../src/engine/pitchSim.js');

describe('내 팀 경기의 증강', () => {
  beforeEach(() => { mem.clear(); store.signIn('증강감독'); });

  it('7회에 한 장 더', () => {
    expect(MATCH_AUG_INNINGS).toEqual([7]);
  });
  it('후보는 3장, 이미 가진 증강 · 제외한 증강은 빼고', () => {
    const owned = [AUGMENTS[0]];
    const banned = AUGMENTS[1];
    const a = store.loadAccount();
    store.saveAug({ ...a.aug, bans: { ...a.aug.bans, silver: [banned.id] } });
    for (let i = 0; i < 30; i += 1) {
      const o = augOptions(owned);
      expect(o).toHaveLength(3);
      expect(o.some((x) => x.id === owned[0].id || x.id === banned.id)).toBe(false);
    }
  });
  it('즐겨찾기한 증강은 권 없이 더 자주', () => {
    const a = store.loadAccount();
    const favs = AUGMENTS.slice(0, 5).map((x) => x.id);
    store.saveAug({ ...a.aug, favs });
    let hit = 0;
    for (let i = 0; i < 400; i += 1) hit += augOptions([]).filter((x) => favs.includes(x.id)).length;
    const base = (5 / AUGMENTS.length) * 3 * 400; // 무게가 없을 때의 기댓값
    expect(hit).toBeGreaterThan(base * 1.4);
  });
  it('기록에는 이름만', () => {
    expect(augsForHistory([AUGMENTS[0]])).toEqual([{ id: AUGMENTS[0].id, name: AUGMENTS[0].name, tier: AUGMENTS[0].tier }]);
  });

  it('증강을 얹은 팀으로 끝까지 경기를 치른다 (모든 증강)', () => {
    const team = { name: '증강감독', squad: starterSquad('증강감독'), staff: {}, cap: 2330, record: { w: 3, l: 2, d: 0 } };
    const { ready, rest } = readyRoster(team, 1);
    const opp = seriesTeam(AI_SERIES[3], () => 0.3);
    const env = envOf(opp, team.record);
    expect(env.oppAvg).toBeGreaterThan(50);
    expect(env.oppOffense).toBeGreaterThan(50);
    expect(env.oppPitch).toBeGreaterThan(50);
    for (const a of AUGMENTS) {
      const owned = [{ ...a, lv: 0 }];
      const my = matchTeamOf(team, ready, rest, owned, env);
      expect(my.batters.length).toBe(9);
      const rt = makeAugmentRuntime({ augments: owned, my, opp, record: team.record });
      const g = createGame({ home: engineTeam(my), away: engineTeam(opp) });
      let half = { inning: g.inning, top: g.top, home: 0, away: 0 };
      rt.beforeHalf(g);
      let k = 0;
      while (!g.final && k < 20000) {
        k += 1;
        if (!pitch(g, {})) break;
        if (g.inning !== half.inning || g.top !== half.top || g.final) {
          const scored = half.top ? g.away.runs - half.away : g.home.runs - half.home;
          rt.afterHalf(g, scored, half.inning, half.top);
          half = { inning: g.inning, top: g.top, home: g.home.runs, away: g.away.runs };
          rt.beforeHalf(g);
        }
      }
      expect(g.final, a.name).toBe(true);
      expect(rt.list).toEqual(owned);
    }
  }, 120000);
});
