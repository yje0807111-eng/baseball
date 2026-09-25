import { describe, it, expect } from 'vitest';
import { CUPS, cupOf, cupMult, cupIssue } from '../src/myteam/cups.js';
import { finishOf } from '../src/myteam/rewards.js';
import { makeTournament } from '../src/myteam/tournament.js';

const P = (id, o) => ({ id, personId: id, name: id, overall: 80, cost: 80, position: 'OF', type: 'batter', year: 2010, ...o });

describe('조건부 대회', () => {
  it('조건 다섯 — 조건 없음은 배수 1, 나머지는 1보다 크다', () => {
    expect(CUPS.map((c) => c.id)).toEqual(['open', 'domestic', 'nolegend', 'modern', 'lowcp']);
    expect(cupMult('open')).toBe(1);
    for (const c of CUPS.slice(1)) expect(c.mult).toBeGreaterThan(1);
    expect(cupOf('없는 조건').id).toBe('open');
  });
  it('엔트리가 맞지 않으면 이유 한 줄', () => {
    const team = { squad: [P('a', { isForeign: true }), P('b', { seriesId: 'legend-kia' }), P('c', { year: 1995 })], staff: {} };
    expect(cupIssue('open', team)).toBeNull();
    expect(cupIssue('domestic', team)).toBe('국내 선수만 · 외국인 1명');
    expect(cupIssue('nolegend', team)).toBe('레전드 없이 · 레전드 1명');
    expect(cupIssue('modern', team)).toBe('2000년 이후 시즌 · 2000년 전 시즌 1명');
    expect(cupIssue('lowcp', team)).toBeNull(); // 240 CP
    const rich = { squad: Array.from({ length: 21 }, (_, i) => P(`r${i}`, { cost: 100 })), staff: {} };
    expect(cupIssue('lowcp', rich)).toBe('CP 2,000 이하 · CP 2,100');
  });
  it('상금은 순위 상금 × 배수 (10 G 단위)', () => {
    const base = finishOf(16);
    const cup = finishOf(16, 'lowcp');
    base.forEach((b, i) => expect(cup[i].gold).toBe(Math.round((b.gold * 1.5) / 10) * 10));
    expect(finishOf(16, 'open')).toEqual(base);
  });
  it('토너먼트가 조건을 싣는다', () => {
    expect(makeTournament({ size: 16, cup: 'domestic' }).cup).toBe('domestic');
    expect(makeTournament({ size: 16 }).cup).toBe('open');
  });
});
