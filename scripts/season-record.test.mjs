import { describe, it, expect } from 'vitest';
import { seasonRecord } from '../src/myteam/traits.js';
import { SERIES } from '../src/data/seriesPlayers.js';

const pit = (source) => seasonRecord({ type: 'pitcher', source });

describe('시즌 기록 — 이닝', () => {
  it('분수 이닝 "150 2/3IP"', () => {
    expect(pit('24G 150 2/3IP ERA2.39 164K 38BB WHIP1.06 9승').ip).toBeCloseTo(150 + 2 / 3);
  });
  it('소수 이닝 "149.1IP" 는 아웃 수', () => {
    expect(pit('26G 149.1IP ERA2.53 138K').ip).toBeCloseTo(149 + 1 / 3);
  });
  it('딱 떨어지는 이닝', () => {
    expect(pit('30G 180IP ERA3.00').ip).toBe(180);
  });
  it('기록이 있는 투수는 모두 경기 수 이상 · 한 경기 12이닝 이하로 읽힌다', () => {
    const bad = SERIES.flatMap((s) => s.players)
      .filter((p) => p.type === 'pitcher' && /IP/.test(p.source || ''))
      .map((p) => [p, seasonRecord(p)])
      .filter(([, r]) => r.g && r.ip != null && (r.ip < r.g / 3 || r.ip > r.g * 12));
    expect(bad.map(([p]) => `${p.name} ${p.year}: ${p.source}`)).toEqual([]);
  });
});
