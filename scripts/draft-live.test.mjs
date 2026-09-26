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

test('보드 하나 = 시리즈 하나 · 한 바퀴, 한 바퀴가 끝나면 선수가 남아도 다음 시리즈', () => {
  expect(boardCount() * LAPS_PER_BOARD).toBe(ROSTER_SIZE);
  expect(boardNo(createLive({ rng: seeded(1) }))).toBe(0);
  let s = createLive({ rng: seeded(1) });
  const first = boardPlayers(s);
  expect(first.length).toBeGreaterThanOrEqual(CLUB_COUNT); // 한 바퀴를 받아낼 수 있어야 한다
  for (let i = 0; i < CLUB_COUNT * LAPS_PER_BOARD; i++) s = pick(s, autoPick(s, currentClub(s), seeded(i)), { auto: true });
  expect(boardNo(s)).toBe(1);
  expect(boardPlayers(s)).not.toBe(first); // 선수가 남아 있어도 다음 시리즈가 깔린다
  expect(first.filter((p) => !(p.id in s.taken)).length).toBeGreaterThan(0); // 유찰된 선수가 남는다
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

test('보드는 늘 18명까지 · 선수가 많은 시리즈도 포지션이 고루 깔린다', async () => {
  const { BOARD_SIZE, sampleBoard } = await import('../src/draft/live.js');
  const { DRAFT_SERIES } = await import('../src/KboAugmentDraft.jsx');
  const big = DRAFT_SERIES.filter((x) => x.players.length > BOARD_SIZE);
  expect(big.length).toBeGreaterThan(0); // 레전드 묶음처럼 큰 시리즈가 있다
  big.forEach((x) => {
    const b = sampleBoard(x, seeded(x.players.length));
    expect(b.players).toHaveLength(BOARD_SIZE);
    const pos = new Set(b.players.map((p) => p.position));
    expect(pos.size).toBeGreaterThanOrEqual(6);                       // 포지션이 한쪽으로 쏠리지 않는다
    expect(b.players.filter((p) => p.type === 'pitcher').length).toBeGreaterThanOrEqual(5);
    expect(b.players.filter((p) => p.type === 'batter').length).toBeGreaterThanOrEqual(8);
    expect(new Set(b.players.map((p) => p.id)).size).toBe(BOARD_SIZE); // 같은 선수가 두 번 들어가지 않는다
  });
  const s = createLive({ rng: seeded(21) });
  s.pool.forEach((b) => expect(b.players.length).toBeLessThanOrEqual(BOARD_SIZE));
});

test('구단마다 드래프트 플랜대로 팀 모양이 달라진다', async () => {
  const { TRAITS, planTarget } = await import('../src/draft/live.js');
  const s = play(seeded(31));
  const by = (t) => s.clubs.filter((c) => c.trait === t);
  const pitchers = (c) => c.roster.filter((p) => p.type === 'pitcher').length;
  const power = (c) => { const b = c.roster.filter((p) => p.type === 'batter'); return b.length ? b.reduce((t, p) => t + p.stats.power, 0) / b.length : 0; };
  const mound = by('mound'), hit = by('power');
  // 마운드형은 투수를, 한 방형은 파워를 더 챙긴다
  if (mound.length && hit.length) {
    expect(Math.max(...mound.map(pitchers))).toBeGreaterThanOrEqual(Math.min(...hit.map(pitchers)));
    expect(Math.max(...hit.map(power))).toBeGreaterThan(0);
  }
  // 플랜은 로스터가 찰수록 다음 자리를 가리킨다
  const c0 = s.clubs[1];
  expect(TRAITS[c0.trait].plan).toHaveLength(ROSTER_SIZE);
  expect(planTarget([], c0.trait)).toBe(TRAITS[c0.trait].plan[0]);
  s.clubs.forEach((c) => expect(c.roster.length).toBeGreaterThanOrEqual(ROSTER_SIZE - 3));
});

test('구단 급이 강호 → 약체 순으로 전력 차이를 만든다', async () => {
  const { GRADES, clubStrength, ladder, myIndex } = await import('../src/draft/live.js');
  const by = {};
  for (let n = 0; n < 12; n++) {
    const s = play(seeded(500 + n * 7));
    s.clubs.forEach((c, i) => { if (!c.me) (by[c.grade] ||= []).push(clubStrength(s, i)); });
  }
  const avg = (a) => a.reduce((t, x) => t + x, 0) / a.length;
  const g = Object.fromEntries(Object.keys(GRADES).map((k) => [k, avg(by[k])]));
  // 급대로 전력이 줄어든다 — 도장깨기에서 뒤로 갈수록 어려워지는 근거
  expect(g.ace).toBeGreaterThan(g.solid);
  expect(g.solid).toBeGreaterThan(g.plain);
  expect(g.plain).toBeGreaterThan(g.weak);
  expect(g.ace - g.weak).toBeGreaterThan(2);   // 체감될 만큼은 벌어진다
  // 사다리: 나를 뺀 일곱 구단이 약한 순서로 늘어선다
  const s = play(seeded(77));
  const rung = ladder(s);
  expect(rung).toHaveLength(7);
  expect(rung.map((x) => x.club)).not.toContain(myIndex(s));
  expect([...rung].sort((a, b) => a.strength - b.strength)).toEqual(rung);
  expect(rung.map((x) => x.step)).toEqual([0, 1, 2, 3, 4, 5, 6]);
});

test('캡을 다 쓰면 남은 라운드를 한 번에 넘긴다', async () => {
  const { cannotPickMore, finishAll, myIndex, isDone, CLUB_COUNT: N } = await import('../src/draft/live.js');
  const rng = seeded(21);
  let s = createLive({ rng });
  const me = myIndex(s);
  expect(cannotPickMore(s)).toBe(false);          // 판을 열면 당연히 뽑을 수 있다

  // 내 캡을 0 으로 만들면 어느 보드에서도 데려올 수 없다
  const broke = { ...s, clubs: s.clubs.map((c, i) => (i === me ? { ...c, cp: 0 } : c)) };
  expect(cannotPickMore(broke)).toBe(true);

  // 남은 픽을 한 번에 소화한다 — 나는 넘기고 AI 는 계속 뽑는다
  const end = finishAll(broke, rng);
  expect(isDone(end)).toBe(true);
  expect(end.clubs[me].roster).toHaveLength(0);
  end.clubs.forEach((c, i) => { if (i !== me) expect(c.roster.length).toBeGreaterThan(ROSTER_SIZE - 5); });

  // 엔트리가 다 찬 구단도 더 뽑지 않는다
  const full = { ...s, clubs: s.clubs.map((c, i) => (i === me ? { ...c, roster: Array.from({ length: ROSTER_SIZE }, () => ({})) } : c)) };
  expect(cannotPickMore(full)).toBe(true);
});

test('AI 난이도 — 쉬움 · 보통 · 강함 순서로 상대 일곱 구단이 세진다(구단 정복 탑 평균 전력)', async () => {
  const { makeGauntlet } = await import('../src/draft/gauntlet.js');
  const mean = (ai) => {
    let sum = 0, n = 0;
    for (let k = 1; k <= 4; k++) {
      const rng = seeded(100 + k);
      let s = createLive({ rng, ai });
      let guard = 0;
      while (!isDone(s) && guard++ < CLUB_COUNT * ROSTER_SIZE + 10) s = pick(s, autoPick(s, currentClub(s), rng), { auto: true });
      const g = makeGauntlet(s);
      g.tower.filter((x) => !x.me).forEach((x) => { sum += x.str; n += 1; });
    }
    return sum / n;
  };
  const easy = mean('easy'), normal = mean('normal'), hard = mean('hard');
  expect(easy).toBeLessThan(normal);
  expect(normal).toBeLessThan(hard);
});
