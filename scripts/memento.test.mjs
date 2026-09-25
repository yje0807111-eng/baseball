import { describe, it, expect } from 'vitest';
import { mementoOptions, tourneyMemento, SINGLE_MEMENTO, GAUNTLET_MEMENTO, asClubPlayer, MEMENTO_TOP_CUT } from '../src/draft/memento.js';

const roster = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, name: `선수${i}`, personId: `사람${i}`, overall: 60 + i, slot: 'C', batOrder: i }));
let s = 7;
const rng = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };

describe('드래프트 기념 카드', () => {
  it('토너먼트 끝 순위별 장 수', () => {
    expect(tourneyMemento(4, 4)).toMatchObject({ n: 5, cut: 0, why: '우승' });
    expect(tourneyMemento(3, 4)).toMatchObject({ n: 4, why: '준우승' });
    expect(tourneyMemento(2, 4)).toMatchObject({ n: 3, why: '4강' });
    expect(tourneyMemento(0, 4)).toMatchObject({ n: 2 });
    expect(tourneyMemento(null, 4)).toBeNull();
    expect(GAUNTLET_MEMENTO).toMatchObject({ n: 5, cut: 0 });
  });
  it('단판 · 준우승 이하는 판에서 가장 좋은 셋을 빼고 고른다', () => {
    const top = new Set(['p19', 'p18', 'p17']);
    for (let i = 0; i < 50; i += 1) {
      const o = mementoOptions(roster, SINGLE_MEMENTO, () => false, rng);
      expect(o).toHaveLength(3);
      expect(new Set(o.map((p) => p.id)).size).toBe(3);
      expect(o.some((p) => top.has(p.id))).toBe(false);
    }
    expect(MEMENTO_TOP_CUT).toBe(3);
  });
  it('우승 · 탑 완주는 누구나, 이미 가진 사람 · 유망주는 빼고', () => {
    const r = [...roster, { id: 'rep', name: '유망주', overall: 50, isReplacement: true }];
    const own = new Set(['사람19']);
    for (let i = 0; i < 50; i += 1) {
      const o = mementoOptions(r, GAUNTLET_MEMENTO, (p) => own.has(p.personId), rng);
      expect(o).toHaveLength(5);
      expect(o.some((p) => p.id === 'rep' || p.id === 'p19')).toBe(false);
    }
  });
  it('후보가 모자라면 있는 만큼', () => {
    expect(mementoOptions(roster.slice(0, 4), SINGLE_MEMENTO, () => false, rng)).toHaveLength(1);
  });
  it('내 팀 선수로 옮길 때 판 전용 자리 · 타순은 떼고 사람 구분은 남긴다', () => {
    const p = asClubPlayer({ id: 'x', name: '이름', slot: 'SS', batOrder: 3, overall: 80 });
    expect(p.slot).toBeUndefined();
    expect(p.batOrder).toBeUndefined();
    expect(p.personId).toBe('이름');
  });
});
