import { describe, it, expect } from 'vitest';
import { moundPlan, pickRel, segsOf, exitOf } from '../src/myteam/FlowBoard.jsx';

describe('정비 2단계 이닝 판', () => {
  it('마운드 — 선발 다음 회 ~ 8회를 계투가 나누고 9회 마무리, 앞 회는 첫 계투로', () => {
    const r = moundPlan({ mid: ['a', 'b'], close: 'c' }, 5.8); // 6 · 7 · 8회 → a 6~7 · b 8
    expect(r.pens).toEqual({ 1: 'a', 2: 'a', 3: 'a', 4: 'a', 5: 'a', 6: 'a', 7: 'a', 8: 'b', 9: 'c' });
    expect(moundPlan({ mid: ['a', 'b'], close: 'c' }, 7).mid).toEqual(['a']); // 자리 1 — 넘치는 계투는 숨음
    expect(moundPlan({ mid: ['a'], close: 'c' }, 8.4).pens[9]).toBe('c');
    expect(moundPlan({ mid: ['a'], close: 'c' }, 9).spans).toEqual([]);
  });
  it('계투 · 마무리 고르기 — 다른 자리에 있으면 서로 바꿈', () => {
    expect(pickRel({ mid: ['a', 'b'], close: 'c' }, 'close', 'a')).toEqual({ mid: ['c', 'b'], close: 'a' });
    expect(pickRel({ mid: ['a', 'b'], close: 'c' }, 1, 'd')).toEqual({ mid: ['a', 'd'], close: 'c' });
  });
  it('공격 구간 · 어림 이닝', () => {
    expect(segsOf(['base', 'base', 'power', 'power', 'base', 'base', 'base', 'base', 'contact']).map((s) => `${s.v}${s.a}-${s.b}`)).toEqual(['base1-2', 'power3-4', 'base5-8', 'contact9-9']);
    expect(exitOf({ mode: 'inn', value: 6 })).toBe(6);
    expect(exitOf({ mode: 'pitch', value: 99 })).toBeCloseTo(6, 5);
  });
});
