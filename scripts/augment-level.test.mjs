/* 증강 강화 — 레벨이 오르면 그 증강의 이득만 커진다.
   레벨 1칸 = +20%, +5 면 두 배. 대가(깎이는 쪽)와 조건 수치는 그대로 둔다. */
import { test, expect } from 'vitest';
import {
  AUGMENTS, DRAFT_MODES, POS_ORDER, SLOT_LIMITS,
  aiDraft, fillRoster, buildTeam, augScale, augDescAt, augChance, augMax, withAugLevels,
} from '../src/KboAugmentDraft.jsx';
import { makeAugmentRuntime } from '../src/KboAugmentDraft.jsx';
import { createGame, addRuns } from '../src/engine/pitchSim.js';

const POOL = DRAFT_MODES.find((m) => m.id === 'mix').players;
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const byId = (id) => AUGMENTS.find((a) => a.id === id);
const roster = () => fillRoster(aiDraft({ players: POOL, cap: 900, rng: mulberry32(7) }));
const statOf = (team, id, key) => team.roster.find((p) => p.id === id)?.stats[key];
const isBat = (p) => p.type === 'batter';

test('레벨 배수는 한 칸에 20%, +5 면 두 배', () => {
  expect(augScale(0)).toBe(1);
  expect(augScale(1)).toBeCloseTo(1.2);
  expect(augScale(5)).toBeCloseTo(2);
});

test('능력치형: 올려 준 폭이 레벨만큼 커진다', () => {
  const r = roster();
  const plain = buildTeam('나', r, 0, [byId('muscle')]);           // 타자 파워 +10
  const lv5 = buildTeam('나', r, 0, withAugLevels([byId('muscle')], { muscle: 5 }));
  const bat = plain.roster.find(isBat);
  const base = r.find((p) => p.id === bat.id).stats.power;
  expect(statOf(plain, bat.id, 'power') - base).toBe(10);
  expect(statOf(lv5, bat.id, 'power') - base).toBe(20);
});

test('대가는 커지지 않는다 — 깎이는 쪽은 레벨과 무관', () => {
  const r = roster();
  const a = byId('toContact');                                     // 타자 컨택 +22 · 파워 −8
  const plain = buildTeam('나', r, 0, [a]);
  const lv5 = buildTeam('나', r, 0, withAugLevels([a], { toContact: 5 }));
  /* 99 에 막히지 않은, 가장 크게 오른 타자로 본다 */
  const gain = (p) => statOf(plain, p.id, 'contact') - r.find((x) => x.id === p.id).stats.contact;
  const hit = plain.roster.filter(isBat).sort((a, b) => gain(b) - gain(a))[0];
  expect(hit).toBeTruthy();
  const was = r.find((p) => p.id === hit.id).stats;
  expect(statOf(plain, hit.id, 'power') - was.power).toBe(statOf(lv5, hit.id, 'power') - was.power);
  expect(statOf(lv5, hit.id, 'contact') - was.contact).toBeGreaterThan(statOf(plain, hit.id, 'contact') - was.contact);
});

test('발동형 눈금: 레벨마다 확률 +5%p, +3 부터 경기당 한도가 는다', () => {
  const a = { id: 'probe', chance: 0.4, max: 2 };                  // 40% · 경기당 2회
  expect(augChance({ ...a, lv: 0 })).toBeCloseTo(0.4);
  expect(augChance({ ...a, lv: 4 })).toBeCloseTo(0.6);
  expect(augChance({ ...a, lv: 5 })).toBeCloseTo(0.65);
  expect(augMax({ ...a, lv: 2 })).toBe(a.max);
  expect(augMax({ ...a, lv: 3 })).toBe(a.max + 1);
  expect(augMax({ ...a, lv: 5 })).toBe(a.max + 2);
});

test('효과 문구도 레벨을 따라간다 — 이득만, 조건 수치는 그대로', () => {
  expect(augDescAt(byId('muscle'), 0)).toBe('타자 파워 +10');
  expect(augDescAt(byId('muscle'), 5)).toBe('타자 파워 +20');
  expect(augDescAt(byId('toContact'), 5)).toBe('타자 컨택 +44 · 파워 −8');
  expect(augDescAt(byId('focusLine'), 5)).toBe('4회부터 우리 공격 안타 확률 +10%');
});

test('강화 레벨을 붙여도 증강 원본은 그대로다', () => {
  const [a] = withAugLevels([byId('muscle')], { muscle: 3 });
  expect(a.lv).toBe(3);
  expect(byId('muscle').lv).toBeUndefined();
});

/* ── 경기 중 훅도 레벨을 탄다 ── */
const engineTeam = (team) => ({
  name: team.name,
  batters: (team.batters.length ? team.batters : team.roster.filter((p) => p.type === 'batter')).slice(0, 9),
  pitchers: team.roster.filter((p) => p.type === 'pitcher'),
  catcher: team.roster.find((p) => p.position === 'C'),
});
const teams = () => ({
  my: buildTeam('나', fillRoster(aiDraft({ players: POOL, rng: mulberry32(7) }))),
  opp: buildTeam('상대', fillRoster(aiDraft({ players: POOL, rng: mulberry32(8) }))),
});
const halfAug = (lv) => ({ id: 'x', name: '시험', tier: 'gold', passive: true, lv, half: (c) => (c.isTop ? null : { add: 0.5 }) });

test('반 이닝형: 기대 득점 보정이 레벨만큼 커진다', () => {
  const { my, opp } = teams();
  const hit = (lv) => {
    const g = createGame({ home: engineTeam(my), away: engineTeam(opp), rng: mulberry32(9) });
    g.top = false;
    makeAugmentRuntime({ augments: [halfAug(lv)], my, opp, record: { w: 0, l: 0, d: 0 } }).beforeHalf(g);
    return g.home.mod.hit;
  };
  expect(hit(5)).toBeCloseTo(hit(0) * 2, 5);
});

test('이닝 점수형: 바꾼 점수 폭이 레벨만큼 커진다', () => {
  const { my, opp } = teams();
  const runs = (lv) => {
    const g = createGame({ home: engineTeam(my), away: engineTeam(opp), rng: mulberry32(9) });
    g.top = false;
    addRuns(g, 2, 1, 'home');
    const aug = makeAugmentRuntime({
      augments: [{ id: 'y', name: '한 점 더', tier: 'gold', passive: true, lv, runs: (c, n) => n + 1 }],
      my, opp, record: { w: 0, l: 0, d: 0 },
    });
    return aug.afterHalf(g, 2, 1, false).runs;
  };
  expect(runs(0)).toBe(3);   // 2 → 3
  expect(runs(5)).toBe(4);   // 늘어난 1점이 두 배
});
