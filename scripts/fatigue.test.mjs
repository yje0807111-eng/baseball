/* 투수 피로: 투구 수 → 휴식 경기 · 컨디션 · 능력치 감소 · 선발 고르기 */
import { test, expect } from 'vitest';
import { restAfter, conditionOf, withFatigue, pickStarter, afterGame } from '../src/myteam/fatigue.js';

test('투구 수로 휴식 경기 수', () => {
  expect(restAfter('starter', 95)).toBe(4);
  expect(restAfter('starter', 65)).toBe(3);
  expect(restAfter('starter', 45)).toBe(2);
  expect(restAfter('starter', 20)).toBe(1);
  expect(restAfter('reliever', 32)).toBe(2);
  expect(restAfter('reliever', 18)).toBe(1);
  expect(restAfter('reliever', 8)).toBe(0);
  expect(restAfter('reliever', 8, 1)).toBe(1); // 연투 +1
});

test('컨디션과 능력치 감소', () => {
  expect([0, 1, 2, 3, 5].map(conditionOf)).toEqual([100, 85, 70, 55, 55]);
  const p = { id: 'a', type: 'pitcher', position: 'SP', overall: 80, stats: { stuff: 80, control: 80, stamina: 80, stability: 80 } };
  expect(withFatigue(p, {}).stats.stuff).toBe(80);
  const tired = withFatigue(p, { a: { rest: 2, streak: 1 } }); // 컨디션 70 → −6
  expect(tired.stats.stuff).toBe(74);
  expect(tired.stats.control).toBe(74);
  expect(tired.condition).toBe(70);
  expect(tired.overall).toBeLessThan(80);
});

test('선발은 휴식이 끝난 첫 투수, 없으면 가장 덜 지친 투수', () => {
  const sp = ['s1', 's2', 's3'].map((id) => ({ id }));
  expect(pickStarter(sp, { s1: { rest: 3 } }).id).toBe('s2');
  expect(pickStarter(sp, { s1: { rest: 3 }, s2: { rest: 1 }, s3: { rest: 2 } }).id).toBe('s2');
});

test('경기 뒤 갱신: 등판은 새 휴식, 안 나온 투수는 휴식 −1', () => {
  const before = { s1: { rest: 0, streak: 0 }, s2: { rest: 3, streak: 0 }, r1: { rest: 1, streak: 1 } };
  const after = afterGame(before, ['s1', 's2', 'r1', 'r2'], { s1: 92, r2: 22 }, 's1');
  expect(after.s1).toEqual({ rest: 4, streak: 1 });
  expect(after.s2).toEqual({ rest: 2, streak: 0 });
  expect(after.r1).toBeUndefined(); // 휴식 끝, 연투 끊김
  expect(after.r2).toEqual({ rest: 1, streak: 1 });
});
