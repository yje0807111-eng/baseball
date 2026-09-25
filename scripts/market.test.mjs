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
