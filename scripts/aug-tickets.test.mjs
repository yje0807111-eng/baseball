/* 증강 권 — 상점에서 산 넷(리롤 · 지명 · 즐겨찾기 우대 · 강화권 묶음)이 선택지에 닿는지.
   리롤은 화면에서 같은 함수를 다시 부르는 것이라, 여기서는 뽑기 규칙만 본다. */
import { test, expect } from 'vitest';
import { AUGMENTS, rollAugmentOptions } from '../src/KboAugmentDraft.jsx';
import { SHOP_ITEMS, AUG_SHOP_TICKETS, AUG_TICKET_KO, withAugTickets, addAugTicket } from '../src/myteam/shop.js';

const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const byId = (id) => AUGMENTS.find((a) => a.id === id);

test('상점에 증강 권 넷이 있다 — 리롤 · 지명 · 우대 · 강화권 묶음', () => {
  const shop = SHOP_ITEMS.filter((i) => i.cat === 'aug');
  expect(new Set(shop.filter((i) => i.augShop).map((i) => i.augShop))).toEqual(new Set(AUG_SHOP_TICKETS));
  AUG_SHOP_TICKETS.forEach((k) => expect(AUG_TICKET_KO[k]).toBeTruthy());
  const bulk = shop.find((i) => i.bulk);
  expect(bulk.augTicket).toBe('upgradeTickets');
  expect(bulk.bulk).toBe(3);
  expect(bulk.price).toBeLessThan(shop.find((i) => i.id === 'au-upgrade').price * 3); // 낱장 셋보다 싸다
});

test('보관: 사면 쌓인다', () => {
  let t = withAugTickets();
  expect(t.reroll).toBe(0);
  t = addAugTicket(addAugTicket(t, 'reroll'), 'reroll');
  expect(t.reroll).toBe(2);
});

test('지명권: 찍어 둔 증강이 선택지에 반드시 낀다 (그 등급으로 열린다)', () => {
  const want = byId('cleanupUp'); // 골드
  for (let i = 0; i < 6; i++) {
    const out = rollAugmentOptions([], seeded(i * 13 + 1), { pledge: want.id });
    expect(out.some((a) => a.id === want.id)).toBe(true);
    expect(out.every((a) => a.tier === want.tier)).toBe(true);
    expect(out.length).toBe(3);
    expect(new Set(out.map((a) => a.id)).size).toBe(3);   // 같은 증강이 두 번 나오지 않는다
  }
});

test('지명한 증강을 이미 가졌으면 그냥 보통 판으로 돈다', () => {
  const want = byId('cleanupUp');
  const out = rollAugmentOptions([want], seeded(5), { pledge: want.id });
  expect(out.some((a) => a.id === want.id)).toBe(false);
  expect(out.length).toBe(3);
});

test('즐겨찾기 우대권: 즐겨찾기가 먼저 들어가되 셋을 다 채우지는 않는다', () => {
  const favs = new Set(AUGMENTS.filter((a) => a.tier === 'silver').slice(0, 6).map((a) => a.id));
  let hit = 0;
  for (let i = 0; i < 8; i++) {
    const out = rollAugmentOptions([], seeded(i * 7 + 3), { favor: true, favs });
    const mine = out.filter((a) => favs.has(a.id)).length;
    expect(mine).toBeLessThanOrEqual(2);                  // 남은 한 자리는 늘 새 증강 몫
    if (out[0] && favs.has(out[0].id)) hit += 1;
  }
  expect(hit).toBeGreaterThan(0);
});

test('권을 안 쓰면 예전처럼 한 등급에서 셋', () => {
  const out = rollAugmentOptions([], seeded(9));
  expect(out.length).toBe(3);
  expect(new Set(out.map((a) => a.tier)).size).toBe(1);
});
