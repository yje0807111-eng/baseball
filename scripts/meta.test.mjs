import { describe, it, expect, beforeEach } from 'vitest';
import { shopDeals, shopDealPrice, shopPriceOf, shopDealsBought, SHOP_DEAL_N, SHOP_ITEMS, itemById, expandTeam, expandLeft } from '../src/myteam/shop.js';
import { clubMax, clubAddReason, CLUB_MAX, CLUB_STEP, EXTRA_CLUB_MAX } from '../src/myteam/rules.js';
import { MISSIONS, WEEK_BONUS, WEEK_BONUS_TICKET, rewardKo, weekKey, missionState } from '../src/myteam/missions.js';

/* 저장소는 localStorage 를 쓴다 — 테스트에서는 메모리 판으로 */
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const store = await import('../src/myteam/store.js');

describe('오늘의 상품', () => {
  it('날마다 셋 · 같은 날 같은 셋 · 첫 칸은 훈련 · 영구 확장 · 캡 · 묶음은 없음', () => {
    const a = shopDeals('2026-09-29');
    expect(a).toHaveLength(SHOP_DEAL_N);
    expect(new Set(a).size).toBe(SHOP_DEAL_N);
    expect(shopDeals('2026-09-29')).toEqual(a);
    expect(itemById(a[0]).cat).toBe('training');
    for (let d = 1; d <= 28; d += 1) {
      for (const id of shopDeals(`2026-02-${String(d).padStart(2, '0')}`)) {
        const it = itemById(id);
        expect(it.expand || it.cap || it.bulk).toBeFalsy();
      }
    }
  });
  it('특가는 하루 한 번 — 산 뒤엔 원래 값, 날이 바뀌면 다시', () => {
    const day = '2026-09-29';
    const it = itemById(shopDeals(day)[0]);
    expect(shopPriceOf(it, null, day)).toBe(shopDealPrice(it));
    expect(shopDealPrice(it)).toBeLessThan(it.price);
    const daily = { day, bought: [it.id] };
    expect(shopPriceOf(it, daily, day)).toBe(it.price);
    expect(shopDealsBought(daily, '2026-09-30')).toEqual([]);
    const other = SHOP_ITEMS.find((x) => !shopDeals(day).includes(x.id));
    expect(shopPriceOf(other, null, day)).toBe(other.price);
  });
});

describe('보관함 확장', () => {
  it('20칸에서 +10씩 두 번 · 한도 넘게는 못 산다', () => {
    let t = {};
    expect(clubMax(t)).toBe(CLUB_MAX);
    for (let i = 0; i < EXTRA_CLUB_MAX; i += 1) t = expandTeam(t, 'club');
    expect(clubMax(t)).toBe(CLUB_MAX + CLUB_STEP * EXTRA_CLUB_MAX);
    expect(expandLeft(t, 'club')).toBe(0);
    expect(expandTeam(t, 'club')).toBe(t);
  });
  it('보관함 영입은 팀 한도로 막는다', () => {
    const club = Array.from({ length: CLUB_MAX }, (_, i) => ({ id: `c${i}`, personId: `c${i}` }));
    const p = { id: 'x', personId: 'x' };
    expect(clubAddReason(p, [], club, null, 0)).toMatch('보관함');
    expect(clubAddReason(p, [], club, null, 0, clubMax({ extraClub: 1 }))).toBeNull();
  });
});

describe('주간 과제 강화권', () => {
  beforeEach(() => { mem.clear(); store.signIn('테스터'); });
  it('보상 글', () => {
    expect(rewardKo({ gold: 400 })).toBe('400 G');
    expect(rewardKo({ ticket: 1 })).toBe('강화권 1장');
    expect(rewardKo({ gold: WEEK_BONUS, ticket: WEEK_BONUS_TICKET })).toBe('500 G · 강화권 1장');
  });
  it('증강 과제는 강화권, 보너스는 골드 + 강화권', () => {
    const key = weekKey();
    const list = missionState(null, key).map((x) => x.m);
    const counts = Object.fromEntries(MISSIONS.map((m) => [m.ev, 99]));
    const a0 = store.loadAccount();
    localStorage.setItem([...mem.keys()][0], JSON.stringify({ ...a0, week: { key, counts, claimed: [], bonus: false } }));
    const t0 = store.loadAccount().aug.upgradeTickets || 0;
    let a;
    for (const m of list) a = store.claimMission(m.id);
    const want = list.reduce((s, m) => s + (m.ticket || 0), 0);
    expect(a.aug.upgradeTickets).toBe(t0 + want);
    const b = store.claimWeekBonus();
    expect(b.aug.upgradeTickets).toBe(t0 + want + WEEK_BONUS_TICKET);
    expect(b.gold).toBe(a.gold + WEEK_BONUS);
  });
});
