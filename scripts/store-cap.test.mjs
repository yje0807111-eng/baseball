/* 한때 라커를 열 때마다 불어나던 샐러리 캡을 되돌리는 자리 */
import { test, expect } from 'vitest';
import { fixInflatedCap } from '../src/myteam/store.js';
import { SQUAD_CAP } from '../src/myteam/rules.js';

const BASE = SQUAD_CAP;      // 2330
const STEP = BASE - 2000;    // 한 번에 불어나던 폭 330

test('불어난 만큼만 덜어 낸다', () => {
  expect(fixInflatedCap(BASE + STEP)).toBe(BASE);          // 한 번 불어남
  expect(fixInflatedCap(BASE + STEP * 2)).toBe(BASE);      // 두 번
  expect(fixInflatedCap(BASE + STEP * 5)).toBe(BASE);      // 다섯 번
});

test('상점에서 늘린 캡은 그대로 둔다', () => {
  for (const bought of [40, 80, 100, 140, 200, 400]) {
    expect(fixInflatedCap(BASE + bought)).toBe(BASE + bought);
  }
});

test('불어난 것과 산 것이 섞여 있어도 산 만큼은 남긴다', () => {
  expect(fixInflatedCap(BASE + STEP + 400)).toBe(BASE + 400);
  expect(fixInflatedCap(BASE + STEP * 2 + 40)).toBe(BASE + 40);
  expect(fixInflatedCap(BASE + STEP * 3 + 100)).toBe(BASE + 100);
});

test('바른 값은 몇 번을 거쳐도 그대로', () => {
  for (const cap of [BASE, BASE + 40, BASE + 400]) {
    expect(fixInflatedCap(fixInflatedCap(fixInflatedCap(cap)))).toBe(cap);
  }
  expect(fixInflatedCap(fixInflatedCap(BASE + STEP))).toBe(BASE);
});

test('기본 캡보다 낮거나 값이 없으면 손대지 않는다', () => {
  expect(fixInflatedCap(BASE - 100)).toBe(BASE - 100);
  expect(fixInflatedCap(undefined)).toBe(BASE);
});
