/* 경기 전 정비(내 팀): 라커 배치 한 벌(team.order)이 그대로 경기 명단이 된다 — 타순 9 · 오늘 선발 1 · 불펜 8, 나머지는 BN */
import { test, expect } from 'vitest';
import { readyRoster, matchTeamOf, penRole } from '../src/myteam/prep.js';
import { squadOrder } from '../src/myteam/SquadBoard.jsx';
import { buildAiTeam } from '../src/myteam/match.js';
import { engineTeam } from '../src/BroadcastGame.jsx';
import { seeded } from '../src/myteam/tournament.js';

const squad = buildAiTeam(2000, seeded(20260917)).roster;
const team = { name: '정비 팀', squad, staff: {} };
const on = (r) => r.filter((p) => !String(p.slot).startsWith('BN'));

test('라커 배치 그대로: 타순 9 · 선발 1 · 불펜(라커 불펜 수), 엔트리 전원이 명단에', () => {
  const o = squadOrder(squad, [], {});
  const { ready, starter } = readyRoster(team);
  expect(ready).toHaveLength(squad.length);
  expect(ready.filter((p) => p.slot === 'SP')).toHaveLength(1);
  expect(ready.find((p) => p.slot === 'SP').id).toBe(starter.id);
  expect(on(ready).filter((p) => p.type === 'pitcher')).toHaveLength(1 + o.bullpen.length);
  expect(on(ready).filter((p) => p.type === 'batter')).toHaveLength(9);
  expect(ready.find((p) => p.id === o.bullpen[0]).slot).toBe('CL');
  expect([penRole(0), penRole(1), penRole(2), penRole(3)]).toEqual(['CL', 'SU', 'SU', 'MR']);
});

test('라커에서 바꾼 순서가 경기로 — 타순 · 자리 · 마무리', () => {
  const o = squadOrder(squad, [], {});
  const lineup = [...o.lineup].reverse();
  const bullpen = [o.bullpen[1], o.bullpen[0], ...o.bullpen.slice(2)];
  const { ready } = readyRoster({ ...team, order: { ...o, lineup, bullpen } });
  const bats = on(ready).filter((p) => p.type === 'batter').sort((a, b) => a.batOrder - b.batOrder).map((p) => p.id);
  expect(bats).toEqual(lineup.map((x) => x.id));
  expect(ready.find((p) => p.id === o.bullpen[1]).slot).toBe('CL');
  const lf = lineup.find((x) => x.slot === 'LF');
  expect(ready.find((p) => p.id === lf.id).slot).toBe('OF1');
});

test('쉬어야 하는 선발은 건너뛴다 — 로테이션에서 휴식이 끝난 첫 투수', () => {
  const o = squadOrder(squad, [], {});
  const tired = { [o.rotation[0]]: { rest: 2 } };
  const { starter } = readyRoster({ ...team, order: o, pitchFatigue: tired });
  expect(starter.id).toBe(o.rotation[1]);
});

test('경기 팀: 타순 9명, 쉬는 선발 · 벤치는 등판 · 타석에 안 나선다', () => {
  const { ready, rest } = readyRoster(team);
  const t = matchTeamOf(team, ready, rest);
  expect(t.batters).toHaveLength(9);
  expect(t.roster).toHaveLength(squad.length);
  expect(t.batters.every((p) => !String(p.slot).startsWith('BN'))).toBe(true);
  const e = engineTeam(t);
  expect(e.pitchers[0].slot).toBe('SP');
  expect(e.pitchers.every((p) => !String(p.slot).startsWith('BN'))).toBe(true);
  expect(e.pitchers.length).toBe(on(ready).filter((p) => p.type === 'pitcher').length);
});
