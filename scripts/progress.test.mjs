import { describe, it, expect, beforeEach } from 'vitest';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
const store = await import('../src/myteam/store.js');
const { DEX_STEPS, seriesProgress, claimableSteps } = await import('../src/myteam/dex.js');
const { MISSIONS, weekKey, weekMissions, missionState, WEEK_BONUS, WEEK_COUNT } = await import('../src/myteam/missions.js');
const { SERIES } = await import('../src/data/seriesPlayers.js');
const { priceOf, refundOf } = await import('../src/myteam/market.js');

const series = SERIES.find((s) => s.kind !== 'national');

describe('도감', () => {
  beforeEach(() => { mem.clear(); store.signIn('도감감독'); });
  it('영입하면 도감에 오르고, 방출해도 남는다', () => {
    const p = series.players[0];
    const a = store.recruitPlayer(store.loadAccount().team, p, 0);
    expect(a.dex).toContain(p.id);
    const b = store.releasePlayer(a.team, p.id);
    expect(store.loadAccount().dex).toContain(p.id);
    expect(b.team.squad).toHaveLength(0);
  });
  it('6 · 12 · 18명에서 보상, 한 번씩만', () => {
    const owned = new Set(series.players.slice(0, 12).map((p) => p.id));
    expect(seriesProgress(series, owned).have).toBe(12);
    expect(claimableSteps(series, owned).map((s) => s.n)).toEqual([6, 12]);
    expect(claimableSteps(series, owned, { [series.id]: 1 }).map((s) => s.n)).toEqual([12]);
    const raw = JSON.parse(localStorage.getItem('kbo.myteam.v1'));
    localStorage.setItem('kbo.myteam.v1', JSON.stringify({ ...raw, dex: [...owned] }));
    const got = store.claimDex(series);
    expect(got.gold).toBe(store.START_GOLD + 100 + 300);
    expect(store.claimDex(series)).toBeNull();
  });
  it('되팔기로는 이득이 나지 않는다 — 가장 싼 시리즈를 사서 되팔아도 보상보다 많이 든다', () => {
    const reward = DEX_STEPS.reduce((n, s) => n + s.gold, 0);
    const cheapest = SERIES.filter((s) => s.kind !== 'national')
      .map((s) => s.players.reduce((n, p) => n + priceOf(p) - refundOf({ paid: priceOf(p) }), 0))
      .sort((a, b) => a - b)[0];
    expect(cheapest).toBeGreaterThan(reward);
  });
  it('옛 저장본은 지금 가진 선수로 도감을 시작한다', () => {
    const raw = JSON.parse(localStorage.getItem('kbo.myteam.v1'));
    delete raw.dex;
    raw.team.squad = [series.players[1]];
    raw.team.club = [series.players[2]];
    localStorage.setItem('kbo.myteam.v1', JSON.stringify(raw));
    expect(store.loadAccount().dex.sort()).toEqual([series.players[1].id, series.players[2].id].sort());
  });
});

describe('주간 과제', () => {
  beforeEach(() => { mem.clear(); store.signIn('과제감독'); });
  it('주 열쇠는 그 주 월요일', () => {
    expect(weekKey(new Date(2026, 8, 25))).toBe('2026-09-21'); // 금요일 → 월요일
    expect(weekKey(new Date(2026, 8, 21))).toBe('2026-09-21');
    expect(weekKey(new Date(2026, 8, 27))).toBe('2026-09-21'); // 일요일도 같은 주
  });
  it('주마다 셋, 겹치지 않고, 첫째는 승리 · 경기 쪽', () => {
    for (const k of ['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']) {
      const w = weekMissions(k);
      expect(w).toHaveLength(WEEK_COUNT);
      expect(new Set(w.map((m) => m.id)).size).toBe(WEEK_COUNT);
      expect(['win', 'game']).toContain(w[0].ev);
    }
    expect(weekMissions('2026-09-21').map((m) => m.id)).toEqual(weekMissions('2026-09-21').map((m) => m.id));
  });
  it('사건을 세고 · 채우면 받고 · 셋 다 받으면 보너스', () => {
    const list = missionState(null);
    for (const { m } of list) store.bumpWeek(m.ev, m.goal);
    let gold = store.START_GOLD;
    for (const { m } of list) { gold += m.gold; expect(store.claimMission(m.id).gold).toBe(gold); }
    expect(store.claimMission(list[0].m.id)).toBeNull(); // 두 번은 없다
    expect(store.claimWeekBonus().gold).toBe(gold + WEEK_BONUS);
    expect(store.claimWeekBonus()).toBeNull();
  });
  it('채우지 않은 과제는 받을 수 없다', () => {
    const [first] = missionState(null);
    expect(store.claimMission(first.m.id)).toBeNull();
    expect(store.claimWeekBonus()).toBeNull();
  });
  it('과제 목록의 사건은 모두 어딘가에서 센다', () => {
    expect(new Set(MISSIONS.map((m) => m.ev))).toEqual(new Set(['win', 'game', 'gain10', 'aug', 'cup', 'tour8', 'memento', 'deal']));
  });
});
