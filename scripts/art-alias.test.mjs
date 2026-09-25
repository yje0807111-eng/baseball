import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { ART_ALIAS, artId } from '../src/data/artAlias.js';

const club = (id) => /^\d{4}-(.+?)_/.exec(id)?.[1];
const person = (id) => id.slice(id.indexOf('_') + 1);
const year = (id) => +id.slice(0, 4);
const drawn = (id) => existsSync(`public/cards/${id}.webp`) && existsSync(`public/profiles/${id}.webp`);

describe('빌려 쓰는 선수 그림', () => {
  const pairs = Object.entries(ART_ALIAS);
  it('빌려 주는 쪽은 그림이 있고, 빌리는 쪽은 없다', () => {
    expect(pairs.length).toBeGreaterThan(1000);
    for (const [from, to] of pairs) {
      expect(drawn(to)).toBe(true);
      expect(drawn(from)).toBe(false);
    }
  });
  it('같은 선수 · 같은 구단 이름끼리만 빌린다', () => {
    for (const [from, to] of pairs) {
      expect(person(to)).toBe(person(from));
      expect(club(to)).toBe(club(from));
      expect(year(to)).not.toBe(year(from));
    }
  });
  it('국가대표 · 레전드 시리즈는 빌리지 않는다', () => {
    for (const [from] of pairs) expect(club(from)).not.toMatch(/^legend|wbc|premier12|tokyo|sydney|asia|busan|doha|guangzhou|incheon|jakarta|hangzhou|bangkok|apbc/);
  });
  it('그림이 있는 선수는 제 그림 그대로', () => {
    expect(artId('2002-doosan_김동주')).toBe('2002-doosan_김동주');
    const [from, to] = pairs[0];
    expect(artId(from)).toBe(to);
  });
});
