/* 경기 전 정비: 26인 → 정비 화면 20자리 · 저장한 배치 이어 쓰기 · 경기 팀 만들기 */
import { test, expect } from 'vitest';
import { autoSlots, readyRoster, prepOf, matchTeamOf } from '../src/myteam/prep.js';
import { buildAiTeam } from '../src/myteam/match.js';
import { seeded } from '../src/myteam/tournament.js';

const squad = buildAiTeam(2000, seeded(20260917)).roster;
const team = { name: '정비 팀', squad, staff: {} };

test('자동 배정: 필드 14자리 + 예비 6자리, 나머지는 벤치', () => {
  const slots = autoSlots(squad);
  const vals = Object.values(slots);
  expect(vals).toHaveLength(20);
  expect(new Set(vals).size).toBe(20);
  expect(vals).toEqual(expect.arrayContaining(['SP', 'LR', 'MR', 'SU', 'CL', 'C', '1B', '2B', '3B', 'SS', 'OF1', 'OF2', 'OF3', 'DH', 'BN1', 'BN6']));
  const { ready, rest } = readyRoster(team);
  expect(ready).toHaveLength(20);
  expect(rest).toHaveLength(squad.length - 20);
});

test('바꾼 배치와 타순은 저장해 다음에도 그대로', () => {
  const { ready } = readyRoster(team);
  const sp = ready.find((p) => p.slot === 'SP'), cl = ready.find((p) => p.slot === 'CL');
  const swapped = ready.map((p) => (p === sp ? { ...p, slot: 'CL' } : p === cl ? { ...p, slot: 'SP' } : p));
  const bats = swapped.filter((p) => p.type === 'batter' && !p.slot.startsWith('BN')).reverse();
  const ordered = swapped.map((p) => (bats.includes(p) ? { ...p, batOrder: bats.indexOf(p) } : p));
  const again = readyRoster({ ...team, prep: prepOf(ordered) }).ready;
  expect(again.find((p) => p.slot === 'SP').id).toBe(cl.id);
  expect(again.filter((p) => p.batOrder != null).sort((a, b) => a.batOrder - b.batOrder).map((p) => p.id)).toEqual(bats.map((p) => p.id));
});

test('경기 팀: 타순 9명, 예비·벤치는 경기에 안 나간다', () => {
  const { ready, rest } = readyRoster(team);
  const t = matchTeamOf(team, ready, rest);
  expect(t.batters).toHaveLength(9);
  expect(t.roster).toHaveLength(squad.length);
  expect(t.batters.every((p) => !String(p.slot).startsWith('BN'))).toBe(true);
});
