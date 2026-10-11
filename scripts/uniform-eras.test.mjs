import { describe, it, expect } from 'vitest';
import { eraOf, refYearOf, UNIFORM_BREAKS, ERA_REF } from './uniform-eras.mjs';

describe('유니폼 시기 — 시기마다 한 벌', () => {
  it('같은 시기면 어느 해든 같은 기준 그림', () => {
    expect(refYearOf('lotte', 2010)).toBe(2004);
    expect(refYearOf('lotte', 2017)).toBe(2004);
    expect(refYearOf('lotte', 2018)).not.toBe(2004); // 2018 부터 새 옷
    expect(refYearOf('ob', 1990)).toBe(1987); // 빨간 OB BEARS
    expect(refYearOf('ob', 1995)).toBe(1995); // 금색 Bears(1992~)
    expect(refYearOf('hyundai', 1996)).toBe(refYearOf('hyundai', 2007)); // 조사 못 한 구단 = 통째로 한 시기
  });
  it('정해 둔 대표가 없는 시기 — 기준 그림이 있고 카드가 많은 시즌, 없으면 그 시기 첫 시즌', () => {
    const seasons = [{ year: 2018, cards: 10, hasRef: true }, { year: 2020, cards: 18, hasRef: true }, { year: 2021, cards: 30, hasRef: false }];
    expect(refYearOf('lotte', 2019, seasons)).toBe(2020);
    expect(refYearOf('lotte', 2019, seasons.map((s) => ({ ...s, hasRef: false })))).toBe(2018);
    expect(refYearOf('newclub', 2030, [])).toBe(2030);
  });
  it('대표 시즌은 제 시기 안에 하나씩', () => {
    for (const [club, years] of Object.entries(ERA_REF)) {
      const eras = years.map((y) => eraOf(club, y));
      expect(new Set(eras).size).toBe(eras.length);
    }
    expect(eraOf('lotte', 1992)).toBe(0);
    expect(eraOf('lotte', 1993)).toBe(1);
    expect(Object.keys(UNIFORM_BREAKS).length).toBeGreaterThan(15);
  });
});
