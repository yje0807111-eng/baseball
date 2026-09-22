/* 드래프트 권 — 상점에서 산 다섯 장이 판에서 실제로 먹히는지.
   우선 지명권(순번) · 보호 지명서(다른 구단 잠금) · 협상 대리인(영입가 15%) · 시리즈 지정권(다음 보드) · 스카우트 리포트(새로고침은 화면 쪽) */
import { test, expect } from 'vitest';
import { DRAFT_SERIES, ROSTER_SIZE } from '../src/KboAugmentDraft.jsx';
import * as Live from '../src/draft/live.js';
import { DRAFT_TICKETS, DRAFT_TICKET_KO, addDraftTicket, useDraftTicket, withDraftTickets, SHOP_ITEMS } from '../src/myteam/shop.js';

const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const make = (opt = {}, seed = 5) => Live.createLive({ series: DRAFT_SERIES, rng: seeded(seed), ...opt });
/** 내 차례가 올 때까지 AI 를 돌린다 */
const toMyTurn = (s, rng = seeded(9)) => { let x = s; let guard = 0; while (!Live.isMyTurn(x) && !Live.isDone(x) && guard++ < 200) x = Live.stepAi(x, rng); return x; };

test('상점에 드래프트 권 다섯 장이 있고, 값은 저마다 다르다', () => {
  const items = SHOP_ITEMS.filter((i) => i.cat === 'draft');
  expect(items.length).toBe(5);
  expect(new Set(items.map((i) => i.draftTicket))).toEqual(new Set(DRAFT_TICKETS));
  items.forEach((i) => { expect(DRAFT_TICKET_KO[i.draftTicket]).toBeTruthy(); expect(i.price).toBeGreaterThan(0); });
});

test('보관: 사면 쌓이고 쓰면 준다 · 없으면 못 쓴다', () => {
  let t = withDraftTickets();
  expect(t.protect).toBe(0);
  t = addDraftTicket(t, 'protect');
  t = addDraftTicket(t, 'protect');
  expect(t.protect).toBe(2);
  t = useDraftTicket(t, 'protect');
  expect(t.protect).toBe(1);
  expect(useDraftTicket(withDraftTickets(), 'first')).toBe(null);
});

test('우선 지명권: 내 구단이 첫 순번이 된다', () => {
  const plain = make();
  const first = make({ firstPick: true });
  expect(Live.clubAt(0, first.order)).toBe(Live.myIndex(first));
  expect(first.order.length).toBe(plain.order.length);
  expect(new Set(first.order)).toEqual(new Set(plain.order));   // 다른 구단이 사라지지 않는다
  expect(first.used.first).toBe(1);
});

test('보호 지명서: 내 다음 차례까지 다른 구단이 그 선수를 못 뽑는다', () => {
  let s = toMyTurn(make({}, 11));
  const target = Live.pickable(s)[0];
  s = Live.protectPlayer(s, target);
  expect(s.protect.id).toBe(target.id);
  expect(s.protect.until).toBeGreaterThan(s.pick);
  // 내가 다른 선수를 뽑고 한 바퀴 도는 동안 보호가 걸려 있다
  s = Live.pick(s, Live.pickable(s).find((p) => p.id !== target.id));
  const rng = seeded(3);
  let guard = 0;
  while (!Live.isMyTurn(s) && guard++ < 50) {
    expect(Live.lockReason(s, target)).toBe('보호 지명');
    s = Live.stepAi(s, rng);
  }
  expect(Live.takenBy(s, target)).toBe(null);                    // 아무도 못 데려갔다
  expect(Live.lockReason(s, target)).not.toBe('보호 지명');       // 내 차례에는 내가 뽑을 수 있다
});

test('협상 대리인: 다음 영입 한 번만 15% 싸고, 쓰고 나면 꺼진다', () => {
  let s = toMyTurn(make({}, 13));
  const me = Live.myIndex(s);
  const before = s.clubs[me].cp;
  const p1 = Live.pickable(s)[0];
  s = Live.useAgent(s);
  expect(Live.costOf(s, p1)).toBe(Math.max(1, Math.round(p1.cost * 0.85)));
  s = Live.pick(s, p1);
  expect(s.clubs[me].cp).toBe(before - Math.max(1, Math.round(p1.cost * 0.85)));
  expect(s.agent).toBe(false);
  // 다음 영입은 제값
  s = toMyTurn(s, seeded(21));
  const p2 = Live.pickable(s)[0];
  expect(Live.costOf(s, p2)).toBe(p2.cost);
});

test('시리즈 지정권: 아직 열지 않은 보드가 내가 고른 시리즈로 바뀐다', () => {
  const s = make({}, 17);
  const now = Live.boardNo(s);
  const want = DRAFT_SERIES.find((x) => x.players.length >= Live.BOARD_SIZE && x.id !== s.pool[now + 1].id);
  const next = Live.setBoardSeries(s, want, now + 1, seeded(4));
  expect(next.pool[now + 1].id).toBe(want.id);
  expect(next.pool[now].id).toBe(s.pool[now].id);                // 열려 있는 보드는 그대로
  expect(next.used.series).toBe(1);
  // 이미 지나간 보드는 못 바꾼다
  expect(Live.setBoardSeries(s, want, now, seeded(4))).toBe(s);
});

test('권을 안 쓰면 판은 예전과 똑같다', () => {
  const s = make({}, 23);
  expect(s.protect).toBe(null);
  expect(s.agent).toBe(false);
  const p = Live.pickable(s)[0];
  expect(Live.costOf(s, p)).toBe(p.cost);
  expect(s.clubs.length).toBe(Live.CLUB_COUNT);
  expect(ROSTER_SIZE).toBeGreaterThan(0);
});
