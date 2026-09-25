import { describe, it, expect, beforeEach } from 'vitest';
import { priceOf, refundOf, isFreeFill, FREE_FILL_MAX, PRICE_MIN } from '../src/myteam/market.js';
import { addBlockReason, swapCandidates, swapBlockReason, SQUAD_CAP, BASE_LIMITS } from '../src/myteam/rules.js';
import { starterSquad } from '../src/myteam/starter.js';

/* 저장소는 localStorage 를 쓴다 — 테스트에서는 메모리 판으로 */
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
const store = await import('../src/myteam/store.js');

const P = (overall, extra = {}) => ({ id: `p${overall}${extra.id || ''}`, personId: `사람${overall}${extra.id || ''}`, name: 'x', overall, cost: overall, position: 'OF', type: 'batter', ...extra });

describe('영입가', () => {
  it('종합 75 = 150 G, 5 오를 때마다 두 배', () => {
    expect(priceOf(P(75))).toBe(150);
    expect(priceOf(P(80))).toBe(300);
    expect(priceOf(P(90))).toBe(1200);
    expect(priceOf(P(100))).toBe(4800);
  });
  it('종합이 높을수록 비싸고, 아무리 낮아도 최소값', () => {
    for (let o = 50; o < 110; o += 1) expect(priceOf(P(o + 1))).toBeGreaterThanOrEqual(priceOf(P(o)));
    expect(priceOf(P(52))).toBe(PRICE_MIN);
  });
  it('레전드는 25% 더', () => {
    expect(priceOf(P(90, { seriesId: 'legend-kia' }))).toBe(1500);
  });
  it('방출은 산 값의 절반, 받은 선수는 0', () => {
    expect(refundOf({ paid: 1200 })).toBe(600);
    expect(refundOf({ paid: 150 })).toBe(70);
    expect(refundOf({ paid: 0 })).toBe(0);
    expect(refundOf({})).toBe(0);
  });
  it('무상 채우기는 싼 국내 선수만', () => {
    expect(isFreeFill(P(70))).toBe(true);
    expect(priceOf(P(73))).toBeGreaterThan(FREE_FILL_MAX);
    expect(isFreeFill(P(73))).toBe(false);
    expect(isFreeFill(P(65, { isForeign: true }))).toBe(false);
  });
  it('골드가 모자라면 영입을 막고 모자란 만큼 알린다', () => {
    expect(addBlockReason(P(90), [], {}, SQUAD_CAP, BASE_LIMITS, 1000)).toBe('골드 부족 (200 G 모자람)');
    expect(addBlockReason(P(90), [], {}, SQUAD_CAP, BASE_LIMITS, 1200)).toBeNull();
    expect(addBlockReason(P(90), [], {})).toBeNull(); // 골드를 안 넘기면 CP 규칙만
  });
});

describe('골드와 엔트리를 함께 저장', () => {
  beforeEach(() => { mem.clear(); store.signIn('테스터'); });

  it('영입하면 골드가 줄고 산 값이 선수에 남는다', () => {
    const a = store.loadAccount();
    const next = store.recruitPlayer(a.team, P(90), 1200);
    expect(next.gold).toBe(store.START_GOLD - 1200);
    expect(next.team.squad[0].paid).toBe(1200);
    expect(store.loadAccount().gold).toBe(store.START_GOLD - 1200);
  });
  it('골드가 모자라면 아무것도 바뀌지 않는다', () => {
    const a = store.loadAccount();
    expect(store.recruitPlayer(a.team, P(105), store.START_GOLD + 1)).toBeNull();
    expect(store.loadAccount().team.squad).toHaveLength(0);
  });
  it('방출하면 절반을 돌려받고 벤치에서도 빠진다', () => {
    const a = store.loadAccount();
    const b = store.recruitPlayer(a.team, P(90), 1200);
    const team = { ...b.team, bench: [b.team.squad[0].id] };
    const c = store.releasePlayer(team, team.squad[0].id);
    expect(c.gold).toBe(store.START_GOLD - 600);
    expect(c.team.squad).toHaveLength(0);
    expect(c.team.bench).toEqual([]);
  });
  it('스타터는 빈 라커에 한 번만, 안내는 닫으면 사라진다', () => {
    expect(store.needsStarter(store.loadAccount())).toBe(true);
    const squad = [P(75, { paid: 0 })];
    expect(store.grantStarter(squad).notice).toBe('starter');
    expect(store.needsStarter(store.loadAccount())).toBe(false);
    expect(store.grantStarter(squad)).toBeNull();
    /* 다 방출해도 다시 주지 않는다 */
    const a = store.loadAccount();
    store.releasePlayer(a.team, a.team.squad[0].id);
    expect(store.needsStarter(store.loadAccount())).toBe(false);
    store.dismissNotice();
    expect(store.loadAccount().notice).toBeUndefined();
  });
});

describe('교체 영입 (꽉 찬 엔트리)', () => {
  const squad = starterSquad('교체');
  const star = (position, type = 'batter') => ({ id: 'star', personId: '스타', name: '스타', overall: 90, cost: 90, position, type });
  beforeEach(() => { mem.clear(); store.signIn('테스터'); });

  it('꽉 차면 그냥 영입은 막히고, 교체는 된다', () => {
    expect(addBlockReason(star('OF'), squad, {}, SQUAD_CAP, BASE_LIMITS, 5000)).toMatch('모두 찼음');
    const out = swapCandidates(star('OF'), squad)[0];
    expect(out.position).toBe('OF');
    expect(swapBlockReason(star('OF'), out, squad, {}, SQUAD_CAP, BASE_LIMITS, 5000)).toBeNull();
  });
  it('후보는 같은 포지션 약한 순이 먼저', () => {
    const c = swapCandidates(star('SP', 'pitcher'), squad);
    const sps = c.filter((p) => p.position === 'SP');
    expect(c.slice(0, sps.length)).toEqual(sps);
    for (let i = 1; i < sps.length; i += 1) expect(sps[i].overall).toBeGreaterThanOrEqual(sps[i - 1].overall);
  });
  it('필수 포지션이 비는 교체는 막는다', () => {
    const only1B = squad.find((p) => p.position === '1B'); // 스타터 1루수는 한 명
    expect(swapBlockReason(star('OF'), only1B, squad, {}, SQUAD_CAP, BASE_LIMITS, 5000)).toMatch('1루수');
  });
  it('골드는 내보내는 선수의 환급까지 셈한다', () => {
    const out = { ...squad.find((p) => p.position === 'OF'), paid: 600 };
    const sq = squad.map((p) => (p.id === out.id ? out : p));
    expect(swapBlockReason(star('OF'), out, sq, {}, SQUAD_CAP, BASE_LIMITS, 900)).toBeNull(); // 900 + 300 = 1200
    expect(swapBlockReason(star('OF'), out, sq, {}, SQUAD_CAP, BASE_LIMITS, 890)).toMatch('골드 부족');
  });
  it('교체 영입을 한 번에 저장한다', () => {
    const a = store.loadAccount();
    const team = { ...a.team, squad };
    const out = swapCandidates(star('OF'), squad)[0];
    const next = store.swapPlayer(team, star('OF'), 1200, out.id);
    expect(next.gold).toBe(store.START_GOLD - 1200);
    expect(next.team.squad).toHaveLength(26);
    expect(next.team.squad.some((p) => p.id === out.id)).toBe(false);
    expect(next.team.squad.find((p) => p.id === 'star').paid).toBe(1200);
  });
});

describe('상점 정리 환급 (옛 저장본)', () => {
  beforeEach(() => { mem.clear(); });
  it('없어진 권 · 부스트를 산 값만큼 한 번 돌려준다', () => {
    const old = {
      nick: '옛감독', gold: 1000, draft: { reroll: 2, first: 1, protect: 2, agent: 0, series: 1 },
      augShop: { reroll: 1, pledge: 1, favor: 2 }, pledgeId: 'x',
      aug: { bans: {}, slots: { silver: 5 }, levels: {}, favs: [], removeTickets: 3, upgradeTickets: 4 },
      team: { name: 't', squad: [], items: [{ key: 'a', itemId: 'bo-focus' }, { key: 'b', itemId: 'bo-focus' }, { key: 'c', itemId: 'tr-power' }] },
    };
    const next = store.withShopCleanup(old);
    // 900 + 500×2 + 700 + 540×2 + 400×3 + 90×2 = 5060
    expect(next.gold).toBe(1000 + 5060);
    expect(next.refund.gold).toBe(5060);
    expect(next.notice).toBe('refund');
    expect(next.draft).toEqual({ reroll: 2, series: 1 });
    expect(next.augShop).toEqual({ reroll: 1 });
    expect(next.aug.removeTickets).toBeUndefined();
    expect(next.aug.upgradeTickets).toBe(4);
    expect(next.team.items.map((x) => x.itemId)).toEqual(['tr-power']);
    expect(next.pledgeId).toBeUndefined();
    expect(store.withShopCleanup(next)).toBe(next); // 두 번은 안 한다
  });
  it('새 계정은 정리할 것이 없다', () => {
    const a = store.signIn('새감독');
    expect(a.shopV).toBe(store.SHOP_VERSION);
    expect(store.loadAccount().notice).toBeUndefined();
    expect(store.loadAccount().aug.slots.silver).toBe(8);
  });
});

describe('보관함', () => {
  beforeEach(() => { mem.clear(); store.signIn('보관감독'); });
  const star = { id: 'star', personId: '스타', name: '스타', overall: 90, cost: 90, position: 'OF', type: 'batter' };
  it('엔트리 ↔ 보관함은 공짜로 오간다', () => {
    const a = store.loadAccount();
    const squad = starterSquad('보관');
    const team = { ...a.team, squad };
    const out = squad.find((p) => p.position === 'OF');
    const b = store.storePlayer(team, out.id);
    expect(b.team.squad).toHaveLength(25);
    expect(b.team.club.map((p) => p.id)).toEqual([out.id]);
    expect(b.gold).toBe(store.START_GOLD);
    const c = store.enterFromClub(b.team, out.id);
    expect(c.team.squad).toHaveLength(26);
    expect(c.team.club).toEqual([]);
  });
  it('꽉 찬 엔트리로 들이면 나가는 선수는 보관함으로', () => {
    const a = store.loadAccount();
    const squad = starterSquad('보관');
    const team = { ...a.team, squad, club: [star] };
    const out = swapCandidates(star, squad)[0];
    const next = store.enterFromClub(team, 'star', out.id);
    expect(next.team.squad.some((p) => p.id === 'star')).toBe(true);
    expect(next.team.club.map((p) => p.id)).toEqual([out.id]);
  });
  it('기념 카드는 산 값 0 · 같은 사람은 두 번 못 받는다 · 보관함에서 방출하면 환급 없음', () => {
    const first = store.addToClub(star);
    expect(first.team.club[0].paid).toBe(0);
    expect(first.team.club[0].memento).toBe(true);
    expect(store.addToClub({ ...star, id: 'star2' })).toBeNull(); // 같은 personId
    const r = store.releaseFromClub(first.team, 'star');
    expect(r.gold).toBe(store.START_GOLD);
    expect(r.team.club).toEqual([]);
  });
});

describe('오늘의 특가', async () => {
  const { dailyDeals, dealPriceOf, todayKey, DEAL_COUNT } = await import('../src/myteam/market.js');
  const { SERIES } = await import('../src/data/seriesPlayers.js');
  const pool = SERIES.filter((s) => s.kind !== 'national').flatMap((s) => s.players);
  const byId = new Map(pool.map((p) => [p.id, p]));
  it('매일 12명, 같은 날은 같은 명단 · 다른 날은 다른 명단', () => {
    const a = dailyDeals(pool, '2026-09-25');
    expect(a.size).toBe(DEAL_COUNT);
    expect([...dailyDeals(pool, '2026-09-25').keys()]).toEqual([...a.keys()]);
    expect([...dailyDeals(pool, '2026-09-26').keys()]).not.toEqual([...a.keys()]);
  });
  it('포지션을 고르게, 종합 82~100, 같은 사람 없이, 값은 30% 싸게', () => {
    const d = dailyDeals(pool, '2026-10-01');
    const ps = [...d.keys()].map((id) => byId.get(id));
    const count = (pos) => ps.filter((p) => p.position === pos).length;
    expect([count('SP'), count('RP'), count('C'), count('OF')]).toEqual([2, 2, 1, 3]);
    for (const p of ps) {
      expect(p.overall).toBeGreaterThanOrEqual(82);
      expect(p.overall).toBeLessThanOrEqual(100);
      expect(d.get(p.id)).toBe(dealPriceOf(p));
      expect(d.get(p.id)).toBeLessThan(priceOf(p));
    }
    expect(new Set(ps.map((p) => p.personId)).size).toBe(ps.length);
  });
  it('특가 값으로 골드를 따진다', () => {
    const p = { id: 'x', personId: 'x', overall: 90, cost: 90, position: 'OF', type: 'batter' };
    expect(addBlockReason(p, [], {}, SQUAD_CAP, BASE_LIMITS, 900)).toMatch('골드 부족');
    expect(addBlockReason(p, [], {}, SQUAD_CAP, BASE_LIMITS, 900, 840)).toBeNull();
  });
  it('날짜 열쇠는 현지 날짜', () => {
    expect(todayKey(new Date(2026, 8, 5, 23, 59))).toBe('2026-09-05');
  });
});
