/* 경기 운영 소모품 — 팀 단위 부스트 셋과 재활 트레이너.
   사면 바로 팀에 붙고, 경기를 한 판 치르면 수명이 하나 줄어든다(기존 부스트와 같은 자리). */
import { test, expect } from 'vitest';
import { SHOP_ITEMS, applyTeamBoost, teamBoostTargets, clearFatigue, tiredCount, withBoosts, tickBoosts, TEAM_BOOST_KO } from '../src/myteam/shop.js';

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

test('상점에 경기 운영 넷이 있다', () => {
  ['bo-bullpen', 'bo-meeting', 'bo-mound', 'bo-medic'].forEach((id) => expect(byId(id)).toBeTruthy());
  expect(TEAM_BOOST_KO[byId('bo-bullpen').teamBoost]).toBe('불펜 투수');
  expect(byId('bo-medic').medic).toBe(true);
});

test('불펜 데이: 불펜만 체력이 오르고, 선발과 타자는 그대로', () => {
  const t = applyTeamBoost(team(), byId('bo-bullpen'));
  expect(t.boosts.length).toBe(2);                          // RP 둘
  const r = withBoosts(t);
  expect(statOf(r, 'rp1', 'stamina')).toBe(80);             // 60 + 20
  expect(statOf(r, 'rp2', 'stamina')).toBe(78);
  expect(statOf(r, 'sp1', 'stamina')).toBe(80);             // 선발은 그대로
  expect(statOf(r, 'b1', 'contact')).toBe(72);
});

test('타선 · 마운드 미팅: 닿는 무리가 다르다', () => {
  expect(teamBoostTargets(team().squad, 'batter').length).toBe(2);
  expect(teamBoostTargets(team().squad, 'pitcher').length).toBe(3);
  const r = withBoosts(applyTeamBoost(team(), byId('bo-meeting')));
  expect(statOf(r, 'b1', 'contact')).toBe(75);
  expect(statOf(r, 'sp1', 'control')).toBe(70);
  const m = withBoosts(applyTeamBoost(team(), byId('bo-mound')));
  expect(statOf(m, 'sp1', 'control')).toBe(73);
  expect(statOf(m, 'rp1', 'control')).toBe(75);
});

test('한 경기 쓰면 사라진다', () => {
  const t = tickBoosts(applyTeamBoost(team(), byId('bo-bullpen')));
  expect(t.boosts.length).toBe(0);
  expect(statOf(withBoosts(t), 'rp1', 'stamina')).toBe(60);
});

test('재활 트레이너: 쌓인 피로를 모두 지운다', () => {
  const t = team();
  expect(tiredCount(t)).toBe(2);                            // sp1 · rp1
  const healed = clearFatigue(t);
  expect(tiredCount(healed)).toBe(0);
  expect(healed.squad).toBe(t.squad);                       // 선수는 건드리지 않는다
});

test('두 장을 겹쳐 사면 둘 다 붙는다', () => {
  const t = applyTeamBoost(applyTeamBoost(team(), byId('bo-meeting')), byId('bo-meeting'));
  expect(statOf(withBoosts(t), 'b1', 'contact')).toBe(78);  // 72 + 3 + 3
  expect(new Set(t.boosts.map((b) => b.key)).size).toBe(t.boosts.length); // 키가 겹치지 않는다
});
