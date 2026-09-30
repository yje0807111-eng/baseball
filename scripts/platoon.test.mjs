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

test('스위치 타자는 투수 반대 손으로 선다', async () => {
  const { batSide } = await import('../src/play/DuelPanel.jsx');
  expect(batSide({ hand: 'S' }, { hand: 'R' })).toBe('L');
  expect(batSide({ hand: 'S' }, { hand: 'L' })).toBe('R');
  expect(batSide({ hand: 'L' }, { hand: 'L' })).toBe('L');
  expect(batSide({}, { hand: 'L' })).toBe('R');
});
