/* 준비 카드 — 상점에서 사면 쌓이고(team.cards), 경기 전 정비에서 한 장 골라 그 경기 로스터에만 얹는다.
   재활 트레이너는 운영 쪽(바로 쓴다). 옛 부스트(team.boosts)는 남은 경기 수만큼 계속 먹는다. */
import { test, expect } from 'vitest';
import { SHOP_ITEMS, CARD_ITEMS, addCard, cardCount, spendCard, applyCard, teamBoostTargets, clearFatigue, tiredCount, withBoosts, tickBoosts, TEAM_BOOST_KO } from '../src/myteam/shop.js';

const P = (id, type, position, stats) => ({ id, name: id, type, position, stats, overall: 75 });
const team = () => ({
  squad: [
    P('sp1', 'pitcher', 'SP', { stuff: 80, control: 70, stamina: 80, stability: 70 }),
    P('rp1', 'pitcher', 'RP', { stuff: 78, control: 72, stamina: 60, stability: 70 }),
    P('rp2', 'pitcher', 'RP', { stuff: 74, control: 70, stamina: 58, stability: 72 }),
    P('b1', 'batter', 'OF', { power: 70, contact: 72, speed: 70, defense: 70 }),
    P('b2', 'batter', '1B', { power: 78, contact: 68, speed: 60, defense: 70 }),
  ],
  boosts: [],
  pitchFatigue: { sp1: { rest: 3, streak: 1 }, rp1: { rest: 1, streak: 1 }, rp2: { rest: 0, streak: 0 } },
});
const byId = (id) => SHOP_ITEMS.find((i) => i.id === id);
const statOf = (roster, id, k) => roster.find((p) => p.id === id).stats[k];

test('준비 카드는 셋 — 타선 미팅 · 마운드 미팅 · 불펜 데이, 재활 트레이너는 운영', () => {
  expect(CARD_ITEMS.map((i) => i.id)).toEqual(['bo-meeting', 'bo-mound', 'bo-bullpen']);
  CARD_ITEMS.forEach((i) => expect(TEAM_BOOST_KO[i.teamBoost]).toBeTruthy());
  expect(byId('bo-medic').cat).toBe('ops');
  ['bo-stamina', 'bo-focus', 'bo-power'].forEach((id) => expect(byId(id)).toBeUndefined());
});

test('사면 쌓이고, 쓰면 한 장 준다 · 없으면 못 쓴다', () => {
  let t = addCard(addCard(team(), byId('bo-meeting')), byId('bo-meeting'));
  expect(cardCount(t, 'bo-meeting')).toBe(2);
  t = spendCard(t, 'bo-meeting');
  expect(cardCount(t, 'bo-meeting')).toBe(1);
  expect(spendCard(team(), 'bo-mound')).toBeNull();
});

test('불펜 데이: 불펜만 체력이 오르고, 선발과 타자는 그대로', () => {
  const r = applyCard(team().squad, byId('bo-bullpen'));
  expect(statOf(r, 'rp1', 'stamina')).toBe(80);             // 60 + 20
  expect(statOf(r, 'rp2', 'stamina')).toBe(78);
  expect(statOf(r, 'sp1', 'stamina')).toBe(80);             // 선발은 그대로
  expect(statOf(r, 'b1', 'contact')).toBe(72);
});

test('타선 · 마운드 미팅: 닿는 무리가 다르다', () => {
  expect(teamBoostTargets(team().squad, 'batter').length).toBe(2);
  expect(teamBoostTargets(team().squad, 'pitcher').length).toBe(3);
  const r = applyCard(team().squad, byId('bo-meeting'));
  expect(statOf(r, 'b1', 'contact')).toBe(75);
  expect(statOf(r, 'sp1', 'control')).toBe(70);
  const m = applyCard(team().squad, byId('bo-mound'));
  expect(statOf(m, 'sp1', 'control')).toBe(73);
  expect(statOf(m, 'rp1', 'control')).toBe(75);
});

test('카드는 그 경기 로스터에만 — 저장된 선수는 그대로', () => {
  const t = team();
  applyCard(t.squad, byId('bo-meeting'));
  expect(statOf(t.squad, 'b1', 'contact')).toBe(72);
});

test('옛 부스트는 남은 경기 수만큼 먹고 사라진다', () => {
  const t = { ...team(), boosts: [{ key: 'k', itemId: 'bo-focus', playerId: 'b1', playerName: 'b1', stat: 'contact', amount: 5, gamesLeft: 1 }] };
  expect(statOf(withBoosts(t), 'b1', 'contact')).toBe(77);
  const after = tickBoosts(t);
  expect(after.boosts.length).toBe(0);
  expect(statOf(withBoosts(after), 'b1', 'contact')).toBe(72);
});

test('재활 트레이너: 쌓인 피로를 모두 지운다', () => {
  const t = team();
  expect(tiredCount(t)).toBe(2);                            // sp1 · rp1
  const healed = clearFatigue(t);
  expect(tiredCount(healed)).toBe(0);
  expect(healed.squad).toBe(t.squad);                       // 선수는 건드리지 않는다
});
