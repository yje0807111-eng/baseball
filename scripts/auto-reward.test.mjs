// 끝난 판의 보상은 '보상 받기'를 누르지 않아도 저장하는 순간 한 번만 지급된다
import { beforeEach, expect, test } from 'vitest';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
const { signIn, saveRanked, claimRanked, saveTournament, claimTournament, loadAccount } = await import('../src/myteam/store.js');
const { PLACE_REWARD, finishOf } = await import('../src/myteam/rewards.js');

beforeEach(() => { mem.clear(); signIn('테스트'); });

test('랭크전: 시즌이 끝난 결과를 저장하면 RP · 골드가 바로 들어가고, 다시 저장 · 받기 · 불러오기로 두 번 받지 않는다', () => {
  const gold0 = loadAccount().gold;
  saveRanked({ season: 1, done: false, place: null, claimed: false });
  expect(loadAccount().rank?.rp || 0).toBe(0);
  const a = saveRanked({ season: 1, done: true, place: 2, claimed: false });
  expect(a.rank.rp).toBe(PLACE_REWARD[1].rp);
  expect(a.gold).toBe(gold0 + PLACE_REWARD[1].gold);
  expect(a.ranked).toMatchObject({ claimed: true, reward: { rp: PLACE_REWARD[1].rp, gold: PLACE_REWARD[1].gold } });
  saveRanked(a.ranked);
  claimRanked();
  const b = loadAccount();
  expect(b.rank.rp).toBe(PLACE_REWARD[1].rp);
  expect(b.gold).toBe(gold0 + PLACE_REWARD[1].gold);
  expect(b.rank.seasons).toHaveLength(1);
});

test('랭크전: RP 는 0 아래로 내려가지 않는다', () => {
  const a = saveRanked({ season: 1, done: true, place: 10, claimed: false });
  expect(a.rank.rp).toBe(0);
  expect(a.ranked.reward.rp).toBe(0);
});

test('예전 저장본: 끝났는데 안 받은 판은 불러올 때 지급한다', () => {
  const raw = JSON.parse(mem.get('kbo.myteam.v1'));
  mem.set('kbo.myteam.v1', JSON.stringify({ ...raw, gold: 100, ranked: { season: 3, done: true, place: 1, claimed: false }, tournament: { size: 16, done: true, place: 4, claimed: false } }));
  const a = loadAccount();
  expect(a.rank.rp).toBe(PLACE_REWARD[0].rp);
  expect(a.gold).toBe(100 + PLACE_REWARD[0].gold + finishOf(16)[4].gold);
  expect(loadAccount().gold).toBe(a.gold);
});

test('토너먼트: 끝난 대진을 저장하면 골드가 바로 들어간다', () => {
  const gold0 = loadAccount().gold;
  const a = saveTournament({ size: 32, done: true, place: 5, claimed: false });
  expect(a.gold).toBe(gold0 + finishOf(32)[5].gold);
  claimTournament();
  expect(loadAccount().gold).toBe(a.gold);
});
