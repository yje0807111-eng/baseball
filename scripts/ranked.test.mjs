/* 랭크전: 10팀 풀리그 9경기 · 상위 5팀 포스트시즌(단판) · 최종 순위 */
import { test, expect } from 'vitest';
import { makeSeason, standings, myOpponent, play, meOf, postMatch, GAMES, STAGES } from '../src/myteam/ranked.js';
import { buildAiTeam } from '../src/myteam/match.js';

const myTeam = { name: '테스트 팀', squad: buildAiTeam(2000, () => 0.42).roster, staff: {} };

test('일정: 모든 팀이 서로 한 번씩, 라운드마다 5경기', () => {
  const s = makeSeason({ key: 'r1' });
  expect(s.teams).toHaveLength(10);
  expect(new Set(s.teams.map((t) => t.name)).size).toBe(10);
  expect(s.schedule).toHaveLength(GAMES);
  const seen = new Set();
  s.schedule.forEach((round) => {
    expect(round).toHaveLength(5);
    expect(new Set(round.flat()).size).toBe(10);
    round.forEach(([a, b]) => seen.add([a, b].sort().join('-')));
  });
  expect(seen.size).toBe(45);
  const opps = new Set();
  let t = s;
  for (let r = 0; r < GAMES; r++) { opps.add(myOpponent({ ...t, round: r }).id); }
  expect(opps.size).toBe(9);
});

test('9경기 전승이면 1위로 포스트시즌, 한국시리즈 이기면 우승', () => {
  let s = makeSeason({ key: 'r2' });
  for (let r = 0; r < GAMES; r++) s = play(s, { my: 6, opp: 1 }, myTeam);
  const table = standings(s);
  expect(table[0].idx).toBe(meOf(s));
  expect(table[0].w).toBe(9);
  expect(table.reduce((n, x) => n + x.g, 0)).toBe(90);
  // 1위는 와일드카드 · 준PO · PO 를 기다린다
  expect(s.post.stage).toBe(3);
  expect(postMatch(s).hi).toBe(meOf(s));
  s = play(s, { my: 3, opp: 2 }, myTeam);
  expect(s.done).toBe(true);
  expect(s.place).toBe(1);
}, 30000);

test('9경기 전패면 포스트시즌 없이 10위로 끝', () => {
  let s = makeSeason({ key: 'r3' });
  for (let r = 0; r < GAMES; r++) s = play(s, { my: 0, opp: 9 }, myTeam);
  expect(s.done).toBe(true);
  expect(s.place).toBe(10);
  expect(s.post.results).toHaveLength(STAGES.length);
}, 30000);
