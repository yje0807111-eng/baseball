import { describe, it, expect } from 'vitest';
import { audit, parseBat, parsePit } from './audit-ratings.mjs';

describe('능력치 점검', () => {
  it('기록 한 줄을 읽는다', () => {
    expect(parseBat('.215/.261 5HR 39타점 2SB 310PA — KBO 기록실')).toEqual({ avg: 0.215, hr: 5, sb: 2, pa: 310 });
    expect(parsePit('41G 99 1/3IP ERA2.54 95K 37BB WHIP1.08 3승 10SV — KBO 기록실')).toMatchObject({ era: 2.54, ip: '99 1/3', so: 95, bb: 37, whip: 1.08 });
  });
  it('KBO 기록실 기록과 크게 어긋난 카드가 없다 (동명이인 값 · 몇 이닝 극단값)', () => {
    const bad = audit().filter((r) => r.ok).map((r) => `${r.series} ${r.p.name}`);
    expect(bad).toEqual([]);
  });
});
