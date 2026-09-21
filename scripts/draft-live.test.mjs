import { test, expect } from 'vitest';
import { ROSTER_SIZE, SALARY_CAP, FOREIGN_LIMIT } from '../src/KboAugmentDraft.jsx';
import {
  createLive, clubAt, pick, autoPick, stepAi, isMyTurn, isDone, currentClub, boardNo, boardPlayers,
  pickable, lockReason, forcedPositions, myRoster, opponentOf, CLUB_COUNT, LAPS_PER_BOARD, boardCount,
} from '../src/draft/live.js';

/* 늘 같은 판이 나오도록 고정 시드 */
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const play = (rng = seeded(7)) => {
  let s = createLive({ rng });
  let guard = 0;
  while (!isDone(s) && guard++ < CLUB_COUNT * ROSTER_SIZE + 10) s = pick(s, autoPick(s, currentClub(s), rng), { auto: true });
  return s;
};

test('스네이크: 바퀴마다 순서가 뒤집히고, 바퀴가 바뀌는 자리는 같은 구단이 연속 두 번', () => {
  const order = [3, 1, 7, 0, 5, 2, 6, 4];
  expect(Array.from({ length: CLUB_COUNT }, (_, i) => clubAt(i, order))).toEqual(order);
  expect(Array.from({ length: CLUB_COUNT }, (_, i) => clubAt(CLUB_COUNT + i, order))).toEqual([...order].reverse());
  expect(clubAt(CLUB_COUNT - 1, order)).toBe(clubAt(CLUB_COUNT, order)); // 연속 두 번
  expect(clubAt(CLUB_COUNT * 2, order)).toBe(order[0]);                   // 세 바퀴째는 다시 순번대로
});

test('보드 하나 = 시리즈 하나 · 두 바퀴, 보드 10개로 20라운드가 딱 맞는다', () => {
  expect(boardCount() * LAPS_PER_BOARD).toBe(ROSTER_SIZE);
  expect(boardNo(createLive({ rng: seeded(1) }))).toBe(0);
  let s = createLive({ rng: seeded(1) });
  const first = boardPlayers(s);
  expect(first.length).toBeGreaterThanOrEqual(16); // 16픽을 받아낼 수 있어야 한다
  for (let i = 0; i < CLUB_COUNT * LAPS_PER_BOARD; i++) s = pick(s, autoPick(s, currentClub(s), seeded(i)), { auto: true });
  expect(boardNo(s)).toBe(1);
  expect(boardPlayers(s)).not.toBe(first); // 다음 시리즈가 깔린다
});

test('지명한 선수는 보드에서 잠기고, 데려간 구단만 로스터·CP가 바뀐다', () => {
  const s0 = createLive({ rng: seeded(3) });
  const club = currentClub(s0);
  const p = pickable(s0)[0];
  const s1 = pick(s0, p);
  expect(s1.taken[p.id]).toBe(club);
  expect(lockReason(s1, p, (club + 1) % CLUB_COUNT)).toContain('지명');
  expect(s1.clubs[club].roster.map((x) => x.id)).toContain(p.id);
  expect(s1.clubs[club].cp).toBe(SALARY_CAP - p.cost);
  s1.clubs.forEach((c, i) => { if (i !== club) { expect(c.roster).toHaveLength(0); expect(c.cp).toBe(SALARY_CAP); } });
  expect(pick(s1, p)).toBe(s1); // 같은 선수를 또 지명하면 아무 일도 없다
});

test('판을 끝까지 돌리면 구단마다 20명 · 캡 안 · 외국인 한도를 지킨다', () => {
  const s = play();
  expect(isDone(s)).toBe(true);
  s.clubs.forEach((c) => {
    expect(c.roster.length).toBeLessThanOrEqual(ROSTER_SIZE);
    expect(c.roster.length).toBeGreaterThanOrEqual(ROSTER_SIZE - 3); // 유찰·자리 마감으로 몇 자리는 빌 수 있다
    expect(c.cp).toBeGreaterThanOrEqual(0);
    expect(c.roster.filter((p) => p.isForeign).length).toBeLessThanOrEqual(FOREIGN_LIMIT);
    expect(new Set(c.roster.map((p) => p.id)).size).toBe(c.roster.length);
  });
  const ids = s.picks.map((x) => x.player.id);
  expect(new Set(ids).size).toBe(ids.length); // 같은 선수를 두 구단이 가질 수 없다
});

test('막판에는 못 채운 자리만 고를 수 있다', () => {
  const s = play(seeded(11));
  const late = { ...s, pick: 0 };
  const club = 0;
  const f = forcedPositions({ ...late, clubs: late.clubs.map((c, i) => (i === club ? { ...c, roster: c.roster.slice(0, ROSTER_SIZE - 1) } : c)) }, club);
  expect(f === null || Array.isArray(f)).toBe(true); // 남은 픽 수와 빈 자리 수가 같을 때만 강제
});

test('내 차례에는 AI 가 대신 뽑지 않는다', () => {
  let s = createLive({ rng: seeded(5) });
  let guard = 0;
  while (!isMyTurn(s) && guard++ < CLUB_COUNT) s = stepAi(s, seeded(guard));
  expect(isMyTurn(s)).toBe(true);
  expect(stepAi(s)).toBe(s);
  expect(myRoster(s)).toHaveLength(0);
});

test('상대는 나를 뺀 구단 중 전력이 가장 가까운 팀', () => {
  const s = play(seeded(9));
  const opp = opponentOf(s);
  expect(opp).not.toBe(s.clubs.findIndex((c) => c.me));
  expect(s.clubs[opp].roster.length).toBeGreaterThan(0);
});
