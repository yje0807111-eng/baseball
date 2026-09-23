/* 기록 → 능력치 변환이 규격(SERIES_SPEC '능력치 기준')대로인지, 그리고 이미 손으로 쓴 시리즈와 얼마나 맞는지 */
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { batRating, pitRating, ipOf, DEFAULT_NORMS, FLOOR, CEIL, MID } from './stat-to-rating.mjs';

const N = DEFAULT_NORMS;

test('리그 평균만큼 하면 한가운데', () => {
  const b = batRating({ avg: N.avg, hr: N.hr, sb: N.sb, pos: 'OF' });
  expect(b.contact).toBe(MID);
  expect(Math.abs(b.power - MID)).toBeLessThanOrEqual(3);
  expect(Math.abs(b.speed - MID)).toBeLessThanOrEqual(4);
  const p = pitRating({ ip: N.ip, era: N.era, so: Math.round((N.ip * N.k9) / 9), bb: Math.round((N.ip * N.bb9) / 9), role: 'SP' });
  for (const k of ['stuff', 'control', 'stability']) expect(Math.abs(p[k] - MID)).toBeLessThanOrEqual(2);
});

test('리그보다 잘하면 올라가고 못하면 내려간다', () => {
  const good = batRating({ avg: N.avg * 1.2, hr: N.hr * 2, sb: N.sb * 2, pos: 'OF' });
  const bad = batRating({ avg: N.avg * 0.8, hr: 0, sb: 0, pos: 'OF' });
  expect(good.contact).toBeGreaterThan(90);
  expect(good.power).toBeGreaterThan(90);
  expect(bad.contact).toBeLessThan(MID);
  expect(bad.power).toBeLessThan(MID);
  expect(bad.power).toBeGreaterThanOrEqual(FLOOR);
});

test('같은 기록이라도 그 시즌 리그와 견준다 — 1982년 K/9 4.1 · 2024년 8.1', () => {
  const old = { ...N, k9: 4.06, era: 3.97, ip: 140 };
  const now = { ...N, k9: 8.1, era: 4.71, ip: 131 };
  const rec = { ip: 150, era: 3.2, so: 110, bb: 45, role: 'SP' };
  const a = pitRating({ ...rec, norms: old });
  const b = pitRating({ ...rec, norms: now });
  expect(a.stuff).toBeGreaterThan(b.stuff);      // 탈삼진이 귀하던 시절이라 같은 삼진이 더 값지다
  expect(a.stability).toBeLessThan(b.stability); // 반대로 그 시절 평균자책 3.2 는 특별하지 않다
});

test('값은 50~110 을 벗어나지 않는다', () => {
  const top = pitRating({ ip: 300, era: 0.8, so: 400, bb: 5, whip: 0.7, role: 'SP' });
  const bottom = pitRating({ ip: 30, era: 12, so: 5, bb: 40, whip: 2.4, role: 'SP' });
  for (const v of [...Object.values(top), ...Object.values(bottom)]) {
    expect(v).toBeGreaterThanOrEqual(FLOOR);
    expect(v).toBeLessThanOrEqual(CEIL);
  }
  expect(top.stability).toBe(CEIL);
});

test('자리와 수비 평판이 defense 를 정한다', () => {
  expect(batRating({ avg: 0.27, pos: 'SS', fielding: 'gg' }).defense).toBe(106);
  expect(batRating({ avg: 0.27, pos: 'SS' }).defense).toBe(90);
  expect(batRating({ avg: 0.27, pos: '1B' }).defense).toBe(59);
  expect(batRating({ avg: 0.27, pos: 'DH' }).defense).toBe(55);
});

test('불펜은 체력이 선발만큼 오르지 않는다', () => {
  const rp = pitRating({ ip: 70, era: 2.5, so: 80, bb: 20, role: 'RP' });
  const sp = pitRating({ ip: 180, era: 2.5, so: 160, bb: 45, role: 'SP' });
  expect(rp.stamina).toBeLessThan(75);
  expect(sp.stamina).toBeGreaterThan(90);
});

test('이닝 표기 197.1 은 197과 3분의 1', () => {
  expect(ipOf('197.1')).toBeCloseTo(197.333, 2);
  expect(ipOf('123 2/3')).toBeCloseTo(123.667, 2);
  expect(ipOf(180)).toBe(180);
});

test('이미 있는 시리즈와 같은 눈금 위에 있다', () => {
  const league = JSON.parse(readFileSync('data/kbo/league.json', 'utf8'));
  const lg = JSON.parse(readFileSync('src/data/series/2023-lg.json', 'utf8'));
  const 켈리 = lg.players.find((p) => p.name === '켈리');
  const mine = pitRating({ ip: '178.2', era: 3.83, so: 129, bb: 39, whip: 1.24, role: 'SP', norms: league[2023] });
  for (const k of ['stuff', 'control', 'stamina', 'stability']) {
    expect(Math.abs(mine[k] - 켈리.stats[k])).toBeLessThanOrEqual(12);
  }
  const 홍창기 = lg.players.find((p) => p.name === '홍창기');
  const bat = batRating({ avg: 0.332, hr: 1, sb: 23, pa: 643, pos: 'OF', fielding: 'good', norms: league[2023] });
  expect(Math.abs(bat.contact - 홍창기.stats.contact)).toBeLessThanOrEqual(12);
});
