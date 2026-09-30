/* 좌우 상성: 손이 다르면 타자 유리 · 같으면 불리 · 좌타 폭이 더 크다 · 스위치는 늘 유리 */
import { test, expect } from 'vitest';
import { platoonOf } from '../src/engine/pitchSim.js';

const B = (hand) => ({ hand }), P = (hand) => ({ hand });
test('좌우 상성', () => {
  expect(platoonOf(B('L'), P('R'))).toBeGreaterThan(0);
  expect(platoonOf(B('L'), P('L'))).toBeLessThan(0);
  expect(platoonOf(B('R'), P('L'))).toBeGreaterThan(0);
  expect(platoonOf(B('R'), P('R'))).toBeLessThan(0);
  expect(platoonOf(B('L'), P('R')) - platoonOf(B('L'), P('L'))).toBeGreaterThan(platoonOf(B('R'), P('L')) - platoonOf(B('R'), P('R')));
  expect(platoonOf(B('S'), P('R'))).toBeGreaterThan(0);
  expect(platoonOf(B('S'), P('L'))).toBeGreaterThan(0);
  expect(platoonOf(B(undefined), P('R'))).toBe(0);
  expect(platoonOf(B('L'), P(undefined))).toBe(0);
});
