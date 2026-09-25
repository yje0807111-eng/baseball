import { describe, it, expect, beforeEach } from 'vitest';
import { priceOf, refundOf, isFreeFill, FREE_FILL_MAX, PRICE_MIN } from '../src/myteam/market.js';
import { addBlockReason, SQUAD_CAP, BASE_LIMITS } from '../src/myteam/rules.js';

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
