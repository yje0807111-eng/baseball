/* 대전 — 시드 · 방어 팀 사진(만들기 · 되살리기 · 검사) · 랭크전에 다른 감독 팀 앉히기 */
import { describe, it, expect } from 'vitest';
import { seeded, hashKey } from '../src/engine/rng.js';
import { starterSquad } from '../src/myteam/starter.js';
import { SQUAD_CAP } from '../src/myteam/rules.js';
import { snapshotOf, reviveTeam, ghostMatchTeam, GHOST_CAP_MAX } from '../src/myteam/ghost.js';
import { teamOf, simulate } from '../src/myteam/tournament.js';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { makeSeason, myOpponent, play, meOf, GAMES } from '../src/myteam/ranked.js';
import { autoSlots } from '../src/myteam/prep.js';

const squad = starterSquad('대전 시험');
const team = { name: '시험 팀', squad, staff: {}, cap: SQUAD_CAP, prep: { slots: autoSlots(squad), order: [] } };
const aiTeam = () => seriesTeam(AI_SERIES[3], seeded(7));

describe('시드', () => {
  it('같은 시드면 같은 경기, 다른 시드면 대개 다른 경기', () => {
    const A = aiTeam(), B = seriesTeam(AI_SERIES[9], seeded(9));
    const a = simulate(A, B, seeded(hashKey('x')));
    const b = simulate(A, B, seeded(hashKey('x')));
    expect(a).toEqual(b);
    const scores = new Set(Array.from({ length: 8 }, (_, i) => JSON.stringify(simulate(A, B, seeded(i + 1)))));
    expect(scores.size).toBeGreaterThan(1);
  });
});

describe('방어 팀 사진', () => {
  const snap = snapshotOf(team);
  it('수치 없이 id 로 — 작고, 되살리면 같은 선수 · 같은 능력치', () => {
    expect(JSON.stringify(snap).length).toBeLessThan(20000);
    expect(snap.players[0]).not.toHaveProperty('stats');
    const back = reviveTeam(snap);
    expect(back).not.toBeNull();
    expect(back.squad.map((p) => p.id)).toEqual(squad.map((p) => p.id));
    expect(back.squad.map((p) => p.overall)).toEqual(squad.map((p) => p.overall));
  });
  it('영구 훈련은 다시 얹는다', () => {
    const p0 = squad.find((p) => p.type === 'batter');
    const trained = { ...team, squad: squad.map((p) => (p.id === p0.id ? { ...p, stats: { ...p.stats, power: p.stats.power + 3 }, trained: [{ stat: 'power', amount: 3 }] } : p)) };
    const back = reviveTeam(snapshotOf(trained));
    expect(back.squad.find((p) => p.id === p0.id).stats.power).toBe(Math.min(110, p0.stats.power + 3));
  });
  it('조작 · 규칙 위반은 버린다', () => {
    const bad = (patch) => reviveTeam({ ...snap, ...patch });
    expect(bad({ players: [...snap.players.slice(0, 25), { id: '없는-선수' }] })).toBeNull();
    expect(bad({ players: [...snap.players.slice(0, 25), snap.players[0]] })).toBeNull(); // 같은 선수 둘
    expect(bad({ players: snap.players.slice(0, 25) })).toBeNull(); // 25명
    expect(bad({ players: snap.players.map((p, i) => (i ? p : { ...p, trained: [{ stat: 'power', amount: 50 }] })) })).toBeNull();
    expect(bad({ cap: GHOST_CAP_MAX + 20 })).toBeNull();
    expect(bad({ cap: 100 })).toBeNull();
    expect(bad({ v: 99 })).toBeNull();
    expect(reviveTeam(null)).toBeNull();
  });
  it('경기 팀 — 타순 아홉 · 투수진 · 올린 사람 배치 그대로, 부스트 · 피로 없이', () => {
    const t = ghostMatchTeam(snapshotOf({ ...team, boosts: [{ playerId: squad[0].id, stat: 'power', amount: 9, gamesLeft: 3 }], pitchFatigue: { [squad[0].id]: { rest: 3 } } }));
    expect(t.ghost).toBe(true);
    expect(t.batters).toHaveLength(9);
    expect(t.roster.filter((p) => p.type === 'pitcher' && !String(p.slot || '').startsWith('BN')).length).toBeGreaterThanOrEqual(5);
    expect(t.roster.some((p) => p.boosted)).toBe(false);
    const g1 = simulate(t, aiTeam(), seeded(3));
    expect(simulate(t, aiTeam(), seeded(3))).toEqual(g1);
  });
});

describe('랭크전에 다른 감독 팀', () => {
  const snap = snapshotOf(team);
  const ghosts = [
    { uid: 'u1', teamId: 1, nick: '감독1', snap },
    { uid: 'u1', teamId: 1, nick: '감독1', snap }, // 같은 감독은 한 번만
    { uid: 'u2', teamId: 2, nick: '감독2', snap: { ...snap, name: '둘째 팀' } },
  ];
  const s = makeSeason({ key: 'pvp1', ghosts });
  it('사진이 먼저, 남는 자리는 AI — 10팀 그대로', () => {
    expect(s.teams).toHaveLength(10);
    const gh = s.teams.filter((t) => t.ghost);
    expect(gh.map((t) => t.owner).sort()).toEqual(['감독1', '감독2']);
    expect(s.teams.filter((t) => !t.me && !t.ghost)).toHaveLength(GAMES - 2);
    expect(gh.every((t) => t.seriesId)).toBe(true); // 사진을 못 쓰게 되면 대신 나올 AI
  });
  it('사진 팀은 경기 팀으로, 못 쓰는 사진은 AI 로', () => {
    const e = s.teams.find((t) => t.ghost);
    expect(teamOf(e).ghost).toBe(true);
    const broken = { ...e, id: 'gh-x', seed: 12345, snap: { ...snap, players: [] } };
    const t = teamOf(broken);
    expect(t.ghost).toBeUndefined();
    expect(t.roster.length).toBeGreaterThan(9);
  });
  it('시즌을 끝까지 — 사진 팀끼리 · AI 와도 계산된다', () => {
    let cur = s;
    for (let i = 0; i < 20 && !cur.done; i++) {
      expect(myOpponent(cur)).not.toBeNull();
      cur = play(cur, { my: 3, opp: 2 }, team);
    }
    expect(cur.done).toBe(true);
    expect(cur.place).toBeGreaterThanOrEqual(1);
    expect(meOf(cur)).toBeGreaterThanOrEqual(0);
  });
  it('사진이 없으면 지금처럼 AI 9팀', () => {
    const plain = makeSeason({ key: 'pvp2' });
    expect(plain.teams.filter((t) => t.ghost)).toHaveLength(0);
    expect(plain.teams).toHaveLength(10);
  });
});
