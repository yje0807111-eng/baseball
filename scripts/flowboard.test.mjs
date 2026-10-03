import { describe, it, expect } from 'vitest';
import { pickPen, segsOf, exitOf } from '../src/myteam/FlowBoard.jsx';

describe('정비 2단계 이닝 판', () => {
  it('불펜 — 떨어진 회의 같은 투수는 서로 바꾸고, 옆 회는 이어 던지기', () => {
    expect(pickPen({ 6: 'a', 7: 'b', 9: 'c' }, 9, 'a')).toEqual({ 6: 'c', 7: 'b', 9: 'a' });
    expect(pickPen({ 7: 'b', 9: 'c' }, 8, 'c')).toEqual({ 7: 'b', 8: 'c', 9: 'c' });
    expect(pickPen({ 6: 'a' }, 9, 'a')).toEqual({ 9: 'a' });
  });
  it('공격 구간 · 어림 이닝', () => {
    expect(segsOf(['base', 'base', 'power', 'power', 'base', 'base', 'base', 'base', 'contact']).map((s) => `${s.v}${s.a}-${s.b}`)).toEqual(['base1-2', 'power3-4', 'base5-8', 'contact9-9']);
    expect(exitOf({ mode: 'inn', value: 6 })).toBe(6);
    expect(exitOf({ mode: 'pitch', value: 99 })).toBeCloseTo(6, 5);
  });
});
