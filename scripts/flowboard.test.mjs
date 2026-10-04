import { describe, it, expect } from 'vitest';
import { moundPlan, fitLimit, outKo, pickRel, segsOf, exitOf } from '../src/myteam/FlowBoard.jsx';

describe('정비 2단계 이닝 판', () => {
  it('마운드(아웃 단위) — 선발 다음 회 ~ 8회를 계투가 나누고 9회 마무리, 첫 칸은 0아웃부터', () => {
    const ends = (r) => r.spans.map((x) => `${x.id}:${x.b}`).join(' ');
    const r = moundPlan({ mid: ['a', 'b'], close: 'c' }, 5.8); // 6 · 7 · 8회 → a 6~7 · b 8 · c 9
    expect(ends(r)).toBe('a:21 b:24 c:27');
    expect(r.slots).toEqual([[0, 'a'], [21, 'b'], [24, 'c']]);
    expect(moundPlan({ mid: ['a', 'b'], close: 'c' }, 7).mid).toEqual(['a']); // 자리 1 — 넘치는 계투는 숨음
    expect(moundPlan({ mid: ['a'], close: 'c' }, 8.4).slots).toEqual([[0, 'c']]); // 계투 자리 없음 — 마무리만
    expect(moundPlan({ mid: ['a'], close: 'c' }, 9).spans).toEqual([]);
    expect(ends(moundPlan({ mid: ['a', 'b', 'c', 'd'], close: 'e' }, 4.7))).toBe('a:18 b:21 c:24 e:27'); // 첫 계투 5~6회, 자리 3
    // 끈 경계(아웃) — 한 회는 남김, 마무리 8회 1아웃부터
    expect(ends(moundPlan({ mid: ['a', 'b'], close: 'c', cuts: [19] }, 5.2))).toBe('a:19 b:24 c:27');
    expect(ends(moundPlan({ mid: ['a', 'b'], close: 'c', cuts: [24] }, 5.2))).toBe('a:21 b:24 c:27');
    expect(moundPlan({ mid: ['a', 'b'], close: 'c', cuts: [19, 22] }, 5.2).slots).toEqual([[0, 'a'], [19, 'b'], [22, 'c']]);
    expect(outKo(22)).toBe('8회 1아웃');
  });
  it('계투 n명이면 선발은 8 − n 회까지 — 계투가 숨지 않게', () => {
    expect(fitLimit({ mode: 'inn', value: 8 }, 2)).toEqual({ mode: 'inn', value: 6 });
    const p = fitLimit({ mode: 'pitch', value: 120 }, 2);
    expect(p.value).toBe(95);
    for (const n of [1, 2, 3, 5]) {
      const lim = fitLimit({ mode: 'bf', value: 36 }, n), mid = Array.from({ length: n }, (_, i) => 'm' + i);
      expect(moundPlan({ mid, close: 'c' }, exitOf(lim)).mid.length).toBe(n);
    }
    expect(fitLimit({ mode: 'inn', value: 5 }, 1)).toEqual({ mode: 'inn', value: 5 }); // 자리 있으면 그대로
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
