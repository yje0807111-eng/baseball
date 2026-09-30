/* 투수가 버티는 공 수는 체력 능력치로 — 불펜 데이(체력 +20) · 전력투구(체력 −18)가 경기에 닿게 */
import { test, expect } from 'vitest';
import { staminaOf } from '../src/engine/pitchSim.js';

const side = (stamina, pitches, pitcherIdx = 0) => ({ pitcher: { stats: { stamina, stability: 80 } }, pitches, pitcherIdx, team: { usage: null } });

test('체력이 높을수록 같은 공 수에서 더 남는다', () => {
  expect(staminaOf(side(100, 80))).toBeGreaterThan(staminaOf(side(80, 80)));
});

test('선발 체력 90 = 95구 · 구원으로 나오면 45구 짧다', () => {
  expect(staminaOf(side(90, 95))).toBe(0);
  expect(staminaOf(side(90, 94))).toBeGreaterThan(0);
  expect(staminaOf(side(68, 28, 1))).toBeLessThan(10); // 불펜 가운데(68) → 28구 안팎
});
