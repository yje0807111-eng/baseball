import { test, expect } from 'vitest';
import { createLive, pick, autoPick, currentClub, isDone, myIndex, CLUB_COUNT } from '../src/draft/live.js';
import { ROSTER_SIZE } from '../src/KboAugmentDraft.jsx';
import { makeGauntlet, teamStats, currentRung, isCleared, record, settle, steps } from '../src/draft/gauntlet.js';

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

test('탑은 나를 뺀 일곱 구단이 약한 순서로 쌓인다', () => {
  const live = play();
  const g = makeGauntlet(live);
  expect(steps()).toBe(CLUB_COUNT - 1);
  expect(g.rungs).toHaveLength(CLUB_COUNT - 1);
  expect(g.rungs.map((r) => r.club)).not.toContain(myIndex(live));
  expect(g.rungs.map((r) => r.step)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  // 1단이 가장 약하고 꼭대기가 가장 세다 — 화면에 보이는 전력 그대로 줄 세운다
  g.rungs.forEach((r, i) => { if (i) expect(r.str).toBeGreaterThanOrEqual(g.rungs[i - 1].str); });
  g.rungs.forEach((r) => {
    expect(r.name).toBeTruthy();
    [r.bat, r.pit, r.def, r.str].forEach((v) => { expect(v).toBeGreaterThan(40); expect(v).toBeLessThan(100); });
  });
});

test('팀 수치: 빈 자리는 퓨처스로 채워 넷 다 나온다', () => {
  const empty = teamStats([]);
  expect(empty.bat).toBeGreaterThan(40);
  expect(empty.str).toBeGreaterThan(40);
  const live = play();
  const full = teamStats(live.clubs[1].roster);
  expect(full.str).toBeGreaterThan(empty.str); // 사람을 채운 팀이 퓨처스뿐인 팀보다 세다
});

test('이기면 다음 단, 지면 같은 단을 다시 친다', () => {
  let g = makeGauntlet(play());
  expect(currentRung(g).step).toBe(1);
  g = settle(g, { win: false, my: 2, opp: 5 });
  expect(currentRung(g).step).toBe(1);      // 그대로
  expect(record(g)).toEqual({ w: 0, l: 1 });
  g = settle(g, { win: true, my: 7, opp: 1 });
  expect(currentRung(g).step).toBe(2);      // 한 단 위로
  expect(isCleared(g, 1)).toBe(true);
  expect(isCleared(g, 2)).toBe(false);
  expect(record(g)).toEqual({ w: 1, l: 1 });
});

test('일곱 단을 다 깨면 끝난다', () => {
  let g = makeGauntlet(play());
  for (let i = 0; i < CLUB_COUNT - 1; i++) g = settle(g, { win: true });
  expect(g.done).toBe(true);
  expect(currentRung(g)).toBe(null);
  expect(record(g).w).toBe(CLUB_COUNT - 1);
  expect(settle(g, { win: true })).toBe(g); // 끝난 판은 더 나아가지 않는다
});
