import { test, expect } from 'vitest';
import { createLive, pick, autoPick, currentClub, isDone, myIndex, CLUB_COUNT } from '../src/draft/live.js';
import { ROSTER_SIZE } from '../src/KboAugmentDraft.jsx';
import { makeGauntlet, teamStats, currentRung, isCleared, myPos, record, settle, steps } from '../src/draft/gauntlet.js';

const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const play = (rng = seeded(11)) => {
  let s = createLive({ rng });
  let guard = 0;
  while (!isDone(s) && guard++ < CLUB_COUNT * ROSTER_SIZE + 10) s = pick(s, autoPick(s, currentClub(s), rng), { auto: true });
  return s;
};

test('탑은 여덟 칸 — 맨 아래가 나, 위로 갈수록 센 구단', () => {
  const live = play();
  const g = makeGauntlet(live);
  expect(steps()).toBe(CLUB_COUNT);
  expect(g.tower).toHaveLength(CLUB_COUNT);
  expect(myPos(g)).toBe(0);
  expect(g.tower[0].club).toBe(myIndex(live));
  // 내 위 일곱 칸은 약한 구단부터
  const rivals = g.tower.slice(1);
  rivals.forEach((r, i) => { if (i) expect(r.str).toBeGreaterThanOrEqual(rivals[i - 1].str); });
  g.tower.forEach((r) => {
    expect(r.name).toBeTruthy();
    [r.bat, r.pit, r.def, r.str].forEach((v) => { expect(v).toBeGreaterThan(40); expect(v).toBeLessThan(100); });
  });
  expect(currentRung(g)).toBe(g.tower[1]); // 첫 상대는 바로 윗 칸
});

test('팀 수치: 빈 자리는 퓨처스로 채워 넷 다 나온다', () => {
  const empty = teamStats([]);
  expect(empty.bat).toBeGreaterThan(40);
  expect(empty.str).toBeGreaterThan(40);
  const live = play();
  const full = teamStats(live.clubs[1].roster);
  expect(full.str).toBeGreaterThan(empty.str); // 사람을 채운 팀이 퓨처스뿐인 팀보다 세다
});

test('이기면 그 칸을 빼앗고 진 구단이 내 아래로 내려온다', () => {
  let g = makeGauntlet(play());
  const first = g.tower[1], second = g.tower[2];

  g = settle(g, { win: false, my: 2, opp: 5 });     // 지면 자리는 그대로
  expect(myPos(g)).toBe(0);
  expect(currentRung(g)).toBe(first);
  expect(record(g)).toEqual({ w: 0, l: 1 });

  g = settle(g, { win: true, my: 7, opp: 1 });      // 이기면 한 칸 위로
  expect(myPos(g)).toBe(1);
  expect(g.tower[0]).toBe(first);                   // 진 구단은 내 아래
  expect(currentRung(g)).toBe(second);              // 다음 상대는 다시 바로 윗 칸
  expect(isCleared(g, 0)).toBe(true);
  expect(isCleared(g, 1)).toBe(false);
  expect(record(g)).toEqual({ w: 1, l: 1 });
});

test('꼭대기에 올라서면 끝난다', () => {
  let g = makeGauntlet(play());
  for (let i = 0; i < CLUB_COUNT - 1; i++) g = settle(g, { win: true });
  expect(myPos(g)).toBe(CLUB_COUNT - 1);
  expect(g.done).toBe(true);
  expect(currentRung(g)).toBe(null);
  expect(record(g).w).toBe(CLUB_COUNT - 1);
  expect(settle(g, { win: true })).toBe(g); // 끝난 판은 더 나아가지 않는다
});
