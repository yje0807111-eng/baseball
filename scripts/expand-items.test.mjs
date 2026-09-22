/* 팀 틀 확장 — 벤치 확장(엔트리 +1, 두 번까지) · 외국인 쿼터(+1, 한 번만).
   상점에서 산 값은 team 에 남고, 엔트리 규칙이 그 값을 본다. */
import { test, expect } from 'vitest';
import {
  SQUAD_SIZE, FOREIGN_MAX, FREE_SLOTS, POS_RULES,
  limitsOf, BASE_LIMITS, addBlockReason, squadIssues, EXTRA_SLOT_MAX, EXTRA_FOREIGN_MAX,
} from '../src/myteam/rules.js';
import { SHOP_ITEMS, expandTeam, expandLeft } from '../src/myteam/shop.js';

const P = (id, position, opt = {}) => ({
  id, personId: id, name: id, position, cost: 10,
  type: ['SP', 'RP'].includes(position) ? 'pitcher' : 'batter',
  overall: 70, stats: {}, ...opt,
});
/** 필수 자리를 딱 채운 엔트리(21명) + 자유 자리에 n 명 */
const squadOf = (free = 0) => {
  const out = [];
  POS_RULES.forEach((r) => { for (let i = 0; i < r.min; i++) out.push(P(`${r.key}${i}`, r.key)); });
  for (let i = 0; i < free; i++) out.push(P(`x${i}`, 'OF'));
  return out;
};

test('상점에 확장 둘이 있다 — 벤치 · 외국인 쿼터', () => {
  const bench = SHOP_ITEMS.find((i) => i.id === 'op-bench');
  const foreign = SHOP_ITEMS.find((i) => i.id === 'op-foreign');
  expect(bench.expand).toBe('slot');
  expect(foreign.expand).toBe('foreign');
  expect(bench.cat).toBe('ops');
});

test('한도: 안 샀으면 예전 값, 사면 그만큼 는다', () => {
  expect(limitsOf({})).toMatchObject({ size: SQUAD_SIZE, free: FREE_SLOTS, foreign: FOREIGN_MAX });
  expect(limitsOf({ extraSlots: 1 })).toMatchObject({ size: SQUAD_SIZE + 1, free: FREE_SLOTS + 1, foreign: FOREIGN_MAX });
  expect(limitsOf({ extraForeign: 1 }).foreign).toBe(FOREIGN_MAX + 1);
  expect(BASE_LIMITS.size).toBe(SQUAD_SIZE);
});

test('더 살 수 없는 횟수를 넘기지 않는다', () => {
  let t = {};
  for (let i = 0; i < 5; i++) t = expandTeam(t, 'slot');
  expect(t.extraSlots).toBe(EXTRA_SLOT_MAX);
  expect(expandLeft(t, 'slot')).toBe(0);
  let f = {};
  for (let i = 0; i < 3; i++) f = expandTeam(f, 'foreign');
  expect(f.extraForeign).toBe(EXTRA_FOREIGN_MAX);
  expect(limitsOf(t).size).toBe(SQUAD_SIZE + EXTRA_SLOT_MAX);
});

test('벤치 확장: 자유 자리가 다 찬 엔트리에 한 명 더 들어간다', () => {
  const squad = squadOf(FREE_SLOTS);                       // 26명 · 자유 자리 소진
  const extra = P('new', 'OF');
  expect(addBlockReason(extra, squad, {}, 9999, BASE_LIMITS)).toBeTruthy();
  expect(addBlockReason(extra, squad, {}, 9999, limitsOf({ extraSlots: 1 }))).toBe(null);
});

test('외국인 쿼터: 넷째 외국인이 막히지 않는다', () => {
  const squad = squadOf(2).map((p, i) => (i < 3 ? { ...p, isForeign: true } : p));
  const more = P('foreigner', 'OF', { isForeign: true });
  expect(addBlockReason(more, squad, {}, 9999, BASE_LIMITS)).toBe('외국인 선수는 최대 3명');
  expect(addBlockReason(more, squad, {}, 9999, limitsOf({ extraForeign: 1 }))).toBe(null);
});

test('경기 나갈 수 있는지도 늘어난 한도로 본다', () => {
  const squad = squadOf(FREE_SLOTS + 1);                   // 27명
  expect(squadIssues(squad, {}, 9999, BASE_LIMITS).length).toBeGreaterThan(0);
  expect(squadIssues(squad, {}, 9999, limitsOf({ extraSlots: 1 }))).toEqual([]);
});
