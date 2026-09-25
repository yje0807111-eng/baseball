/* 증강 권 — 상점 정리(로드맵 4단계) 뒤: 리롤권과 강화권(낱장 · 묶음)만 판다.
   지명권 · 즐겨찾기 우대권은 없앴고, 즐겨찾기한 증강은 권 없이 두 배 잘 나온다. */
import { test, expect } from 'vitest';
import { AUGMENTS, rollAugmentOptions, FAV_WEIGHT } from '../src/KboAugmentDraft.jsx';
import { SHOP_ITEMS, AUG_SHOP_TICKETS, AUG_TICKET_KO, withAugTickets, addAugTicket } from '../src/myteam/shop.js';

const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

test('상점 증강 칸은 리롤권 · 강화권 낱장 · 강화권 묶음 셋', () => {
  const shop = SHOP_ITEMS.filter((i) => i.cat === 'aug');
  expect(shop.map((i) => i.id).sort()).toEqual(['au-reroll', 'au-upgrade', 'au-upgrade3']);
  expect(AUG_SHOP_TICKETS).toEqual(['reroll']);
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

test('후보는 셋, 겹치지 않고, 가진 증강은 빠진다', () => {
  const owned = [AUGMENTS[0]];
  for (let i = 0; i < 20; i++) {
    const out = rollAugmentOptions(owned, seeded(i * 13 + 1), { favs: new Set() });
    expect(out.length).toBe(3);
    expect(new Set(out.map((a) => a.id)).size).toBe(3);
    expect(out.some((a) => a.id === owned[0].id)).toBe(false);
  }
});

test('즐겨찾기한 증강은 두 배 잘 나온다 — 권 없이', () => {
  expect(FAV_WEIGHT).toBe(2);
  const favs = new Set(AUGMENTS.slice(0, 5).map((a) => a.id));
  const rate = (withFav) => {
    let hit = 0; let n = 0;
    for (let i = 0; i < 3000; i++) {
      const out = rollAugmentOptions([], seeded(i * 7 + 3), { favs: withFav ? favs : new Set() });
      hit += out.filter((a) => favs.has(a.id)).length; n += 3;
    }
    return hit / n;
  };
  const base = rate(false);
  const fav = rate(true);
  expect(fav / base).toBeGreaterThan(1.6);   // 두 배 가까이 (셋을 비복원으로 뽑으니 딱 두 배보다 조금 덜)
  expect(fav / base).toBeLessThan(2.1);
});
