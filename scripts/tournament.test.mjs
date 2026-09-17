/* 오늘의 토너먼트: 날짜별 대진 고정 · 라운드 진행 · 탈락/우승 처리 */
import { test, expect } from 'vitest';
import { makeTournament, pairsOf, myOpponent, meIndex, advance, ROUNDS, teamOf } from '../src/myteam/tournament.js';
import { buildAiTeam } from '../src/myteam/match.js';

// 내 팀: 26인 규칙을 따르는 AI 팀을 내 엔트리처럼 쓴다
const mySquad = buildAiTeam(2000, () => 0.42).roster;
const myTeam = { name: '테스트 팀', squad: mySquad, staff: {} };

test('같은 날짜면 같은 대진, 다른 날짜면 다른 대진', () => {
  const a = makeTournament('2026-09-17'), b = makeTournament('2026-09-17'), c = makeTournament('2026-09-18');
  expect(a.entrants.map((e) => e.name)).toEqual(b.entrants.map((e) => e.name));
  expect(a.entrants.map((e) => e.name)).not.toEqual(c.entrants.map((e) => e.name));
  expect(a.entrants).toHaveLength(32);
  expect(a.entrants.filter((e) => e.me)).toHaveLength(1);
  expect(pairsOf(a)).toHaveLength(16);
  expect(new Set(a.entrants.map((e) => e.name)).size).toBe(32); // 팀 이름 겹침 없음
});

test('AI 팀 로스터는 seed 로 다시 만들어도 같다', () => {
  const t = makeTournament('2026-09-17');
  const e = t.entrants.find((x) => !x.me);
  const ids = teamOf(e, myTeam).roster.map((p) => p.id);
  expect(ids.length).toBeGreaterThanOrEqual(10); // 시리즈 멤버 그대로
  expect(teamOf({ ...e }, myTeam).roster.map((p) => p.id)).toEqual(ids);
});

test('이기면 다음 라운드, 지면 탈락 처리', () => {
  let t = makeTournament('2026-09-17', '테스트 팀');
  t = advance(t, { my: 5, opp: 1 }, myTeam);
  expect(t.round).toBe(1);
  expect(t.done).toBe(false);
  expect(t.winners[0]).toHaveLength(16);
  expect(t.winners[0]).toContain(meIndex(t));
  expect(myOpponent(t)).toBeTruthy();

  const lost = advance(t, { my: 0, opp: 3 }, myTeam);
  expect(lost.done).toBe(true);
  expect(lost.place).toBe(1); // 16강 탈락
  expect(myOpponent(lost)).toBeNull();
});

test('다섯 번 모두 이기면 우승', () => {
  let t = makeTournament('2026-09-20', '테스트 팀');
  for (let r = 0; r < ROUNDS.length; r++) t = advance(t, { my: 4, opp: 2 }, myTeam);
  expect(t.done).toBe(true);
  expect(t.place).toBe(ROUNDS.length);
  expect(t.winners[ROUNDS.length - 1]).toEqual([meIndex(t)]);
}, 20000);
