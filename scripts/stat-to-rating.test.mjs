/* 기록 → 능력치 변환이 규격(SERIES_SPEC '능력치 기준')대로인지, 그리고 이미 손으로 쓴 시리즈와 얼마나 맞는지 */
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { batRating, pitRating, ipOf, eraAdjust } from './stat-to-rating.mjs';

test('구간표 그대로 — 타율 · 홈런 · 도루', () => {
  expect(batRating({ avg: 0.270, hr: 10, sb: 10, year: 2023 })).toMatchObject({ contact: 70, power: 60, speed: 64 });
  expect(batRating({ avg: 0.300, hr: 20, sb: 20, year: 2023 })).toMatchObject({ contact: 80, power: 72, speed: 76 });
  expect(batRating({ avg: 0.340, hr: 40, sb: 40, year: 2023 })).toMatchObject({ contact: 92, power: 92, speed: 90 });
});

test('자리와 수비 평판이 defense 를 정한다', () => {
  expect(batRating({ avg: 0.27, pos: 'SS', fielding: 'gg', year: 2023 }).defense).toBe(94);
  expect(batRating({ avg: 0.27, pos: '1B', year: 2023 }).defense).toBe(58);
  expect(batRating({ avg: 0.27, pos: 'DH', year: 2023 }).defense).toBe(50);
});

test('타고투저 해는 타자를 깎고 투수 안정을 올린다', () => {
  expect(eraAdjust(2016)).toEqual({ bat: -2, stability: 3 });
  expect(eraAdjust(1990)).toEqual({ bat: 2, stability: -3 });
  expect(eraAdjust(2023)).toEqual({ bat: 0, stability: 0 });
  expect(batRating({ avg: 0.300, year: 2016 }).contact).toBe(78);
});

test('이닝 표기 197.1 은 197과 3분의 1', () => {
  expect(ipOf('197.1')).toBeCloseTo(197.333, 2);
  expect(ipOf('123.2')).toBeCloseTo(123.667, 2);
  expect(ipOf(180)).toBe(180);
});

test('투수: K/9 · BB/9 · 이닝 · ERA 를 그대로 읽는다', () => {
  const r = pitRating({ ip: '180.0', era: 3.00, so: 180, bb: 40, whip: 1.10, role: 'SP', year: 2023 });
  expect(r.stuff).toBe(84);        // K/9 9.0 → 84 (ERA 3.00 이라 가산 없음)
  expect(r.control).toBe(84);      // BB/9 2.0
  expect(r.stamina).toBe(88);      // 180이닝
  expect(r.stability).toBe(85);    // ERA 3.00
  expect(pitRating({ ip: '60.0', era: 2.00, so: 70, bb: 20, role: 'RP', year: 2023 }).stamina).toBeLessThanOrEqual(60);
});

test('손으로 쓴 2023 LG 시리즈와 크게 어긋나지 않는다', () => {
  const lg = JSON.parse(readFileSync('src/data/series/2023-lg.json', 'utf8'));
  const 켈리 = lg.players.find((p) => p.name === '켈리');
  const mine = pitRating({ ip: '178.2', era: 3.83, so: 129, bb: 39, whip: 1.24, role: 'SP', year: 2023 });
  for (const k of ['stuff', 'control', 'stamina', 'stability']) {
    expect(Math.abs(mine[k] - 켈리.stats[k])).toBeLessThanOrEqual(8);   // 손으로 매긴 값과 8 안쪽
  }
  const 홍창기 = lg.players.find((p) => p.name === '홍창기');
  const bat = batRating({ avg: 0.332, hr: 1, sb: 23, pa: 643, pos: 'OF', year: 2023, fielding: 'ok' });
  expect(Math.abs(bat.contact - 홍창기.stats.contact)).toBeLessThanOrEqual(6);
  expect(Math.abs(bat.power - 홍창기.stats.power)).toBeLessThanOrEqual(6);
});
