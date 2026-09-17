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

test('드래프트 모드: 참가 팀을 직접 넘긴 토너먼트도 진행된다', async () => {
  const { aiDraft, fillRoster, buildTeam } = await import('../src/KboAugmentDraft.jsx');
  const others = Array.from({ length: 15 }, (_, i) => {
    const roster = aiDraft();
    return { id: `dr-${i}`, name: `드래프트 ${i}`, roster, team: buildTeam(`드래프트 ${i}`, fillRoster(roster)) };
  });
  const mine = buildTeam('나의 드림팀', fillRoster(aiDraft()));
  let t = makeTournament({ size: 16, others });
  expect(t.entrants).toHaveLength(16);
  expect(teamOf(myOpponent(t), mine).name).toMatch(/^드래프트/);
  t = advance(t, { my: 3, opp: 1 }, mine);
  expect(t.round).toBe(1);
  expect(t.winners[0]).toHaveLength(8);
  t = advance(t, { my: 0, opp: 1 }, mine);
  expect(t.done).toBe(true);
  expect(t.place).toBe(1);
}, 30000);

test('비슷한 전력끼리 첫 판: 흔들림 없이 줄 세우면 짝끼리 종합 차이가 작다', async () => {
  const { seedByStrength } = await import('../src/myteam/tournament.js');
  const list = Array.from({ length: 16 }, (_, i) => ({ id: i, r: 60 + i * 2 }));
  const order = seedByStrength(list, (x) => x.r, Math.random, 0);
  expect(new Set(order.map((x) => x.id)).size).toBe(16);
  for (let i = 0; i < 16; i += 2) expect(Math.abs(order[i].r - order[i + 1].r)).toBe(2);
});

test('구단 멤버 안에서 드래프트한 팀도 캡을 넘지 않는다', async () => {
  const { aiDraft, DRAFT_MODES } = await import('../src/KboAugmentDraft.jsx');
  const mode = DRAFT_MODES.find((m) => m.id === 'recent');
  for (const s of mode.series.slice(0, 10)) {
    const roster = aiDraft({ players: s.players, cap: 1330 });
    expect(roster.every((p) => s.players.includes(p))).toBe(true);
    expect(roster.reduce((n, p) => n + p.cost, 0)).toBeLessThanOrEqual(1330);
  }
});
