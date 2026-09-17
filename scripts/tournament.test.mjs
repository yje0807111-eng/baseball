/* 토너먼트: 16 · 32 · 64강 대진 · 라운드 진행 · 탈락/우승 처리 */
import { test, expect } from 'vitest';
import { makeTournament, pairsOf, myOpponent, meIndex, advance, roundsOf, finishOf, teamOf } from '../src/myteam/tournament.js';
import { buildAiTeam } from '../src/myteam/match.js';

// 내 팀: 26인 규칙을 따르는 AI 팀을 내 엔트리처럼 쓴다
const mySquad = buildAiTeam(2000, () => 0.42).roster;
const myTeam = { name: '테스트 팀', squad: mySquad, staff: {} };

test('크기별 라운드 · 보상', () => {
  expect(roundsOf(16).map((r) => r.ko)).toEqual(['16강', '8강', '4강', '결승']);
  expect(roundsOf(64).map((r) => r.ko)).toEqual(['64강', '32강', '16강', '8강', '4강', '결승']);
  expect(finishOf(32).map((f) => f.ko)).toEqual(['32강 탈락', '16강 탈락', '8강 탈락', '4강 탈락', '준우승', '우승']);
  expect(finishOf(64)).toHaveLength(7);
  expect(finishOf(64)[6].gold).toBeGreaterThan(finishOf(16)[4].gold);
});

test('같은 key 면 같은 대진, 크기마다 참가 수가 맞고 이름이 겹치지 않는다', () => {
  const a = makeTournament({ key: 'k1' }), b = makeTournament({ key: 'k1' }), c = makeTournament({ key: 'k2' });
  expect(a.entrants.map((e) => e.name)).toEqual(b.entrants.map((e) => e.name));
  expect(a.entrants.map((e) => e.name)).not.toEqual(c.entrants.map((e) => e.name));
  for (const size of [16, 32, 64]) {
    const t = makeTournament({ size, key: `s${size}` });
    expect(t.entrants).toHaveLength(size);
    expect(t.entrants.filter((e) => e.me)).toHaveLength(1);
    expect(pairsOf(t)).toHaveLength(size / 2);
    expect(new Set(t.entrants.map((e) => e.name)).size).toBe(size);
  }
});

test('AI 팀 로스터는 seed 로 다시 만들어도 같다', () => {
  const t = makeTournament({ key: 'k1' });
  const e = t.entrants.find((x) => !x.me);
  const ids = teamOf(e, myTeam).roster.map((p) => p.id);
  expect(ids.length).toBeGreaterThanOrEqual(10); // 시리즈 멤버 그대로
  expect(teamOf({ ...e }, myTeam).roster.map((p) => p.id)).toEqual(ids);
});

test('이기면 다음 라운드, 지면 탈락 처리', () => {
  let t = makeTournament({ key: 'k3', myName: '테스트 팀' });
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

test('16강: 네 번 모두 이기면 우승', () => {
  let t = makeTournament({ size: 16, key: 'k4', myName: '테스트 팀' });
  for (let r = 0; r < 4; r++) t = advance(t, { my: 4, opp: 2 }, myTeam);
  expect(t.done).toBe(true);
  expect(t.place).toBe(4);
  expect(t.winners[3]).toEqual([meIndex(t)]);
}, 20000);
