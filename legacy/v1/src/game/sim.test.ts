import { describe, expect, it } from 'vitest';
import { SERIES } from '../data/series';
import { aiDraft, ROUNDS } from './draft';
import { buildTeam, toSetup } from './lineup';
import { mulberry32, simulateGame } from './sim';
import { findSynergies } from './synergy';

describe('data', () => {
  it('모든 시리즈에 포수·선발·불펜이 있다', () => {
    for (const s of SERIES) {
      const has = (f: (c: (typeof s.players)[number]) => boolean) => s.players.some(f);
      expect(has((c) => c.type === 'batter' && c.pos.includes('C')), s.id).toBe(true);
      expect(has((c) => c.type === 'pitcher' && c.role === 'SP'), s.id).toBe(true);
      expect(has((c) => c.type === 'pitcher' && c.role === 'RP'), s.id).toBe(true);
    }
  });
  it('시리즈 안에서 id가 중복되지 않는다', () => {
    for (const s of SERIES) expect(new Set(s.players.map((p) => p.id)).size, s.id).toBe(s.players.length);
  });
});

describe('draft', () => {
  it('AI는 12자리를 모두 채우고 같은 사람을 두 번 뽑지 않는다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const picks = aiDraft(mulberry32(seed));
      expect(picks.length).toBe(ROUNDS);
      expect(new Set(picks.map((p) => p.slot)).size).toBe(ROUNDS);
      expect(new Set(picks.map((p) => p.card.id)).size).toBe(ROUNDS);
    }
  });
});

describe('sim', () => {
  const setups = (seed: number) => {
    const rng = mulberry32(seed);
    return [toSetup(buildTeam('A', aiDraft(rng))), toSetup(buildTeam('H', aiDraft(rng)))] as const;
  };

  it('같은 시드는 같은 결과', () => {
    const [a, h] = setups(7);
    expect(simulateGame(a, h, 123)).toEqual(simulateGame(a, h, 123));
  });

  it('점수와 이닝 기록이 일치한다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const [a, h] = setups(seed);
      const r = simulateGame(a, h, seed * 31);
      const sum = (line: (number | null)[]) => line.reduce<number>((s, v) => s + (v ?? 0), 0);
      expect(sum(r.away.line)).toBe(r.away.runs);
      expect(sum(r.home.line)).toBe(r.home.runs);
      expect(r.away.bat.reduce((s, b) => s + b.r, 0)).toBe(r.away.runs);
      expect(r.home.pitch.reduce((s, p) => s + p.r, 0)).toBe(r.away.runs);
      expect(r.away.line.length).toBeGreaterThanOrEqual(9);
      expect(r.away.line.length).toBeLessThanOrEqual(12);
    }
  });

  it('경기당 평균 득점이 KBO 수준(합계 7~13점)이다', () => {
    let total = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      const [a, h] = setups(i + 100);
      const r = simulateGame(a, h, i);
      total += r.away.runs + r.home.runs;
    }
    const avg = total / n;
    expect(avg).toBeGreaterThan(7);
    expect(avg).toBeLessThan(13);
  });
});

describe('synergy', () => {
  it('같은 시리즈 2명이면 시너지가 생긴다', () => {
    const s = SERIES.find((x) => x.id === '2009-KIA')!;
    const c = s.players.find((p) => p.name === '김상훈')!;
    const p = s.players.find((p) => p.name === '윤석민')!;
    const syn = findSynergies([{ slot: 'C', seriesId: s.id, card: c }, { slot: 'SP', seriesId: s.id, card: p }]);
    expect(syn.map((x) => x.key)).toEqual(expect.arrayContaining(['series:2009-KIA', 'battery']));
  });
});
