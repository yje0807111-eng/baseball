import { describe, it, expect } from 'vitest';
import { applyStaff } from '../src/myteam/match.js';
import { createGame, stealOdds } from '../src/engine/pitchSim.js';

/* 코치진 효과가 경기 엔진까지 닿는지 — 체력은 투수 체력 능력치(1 = 1구), 도루는 팀 edge.steal(성공 확률 +) */
const staff = { manager: { effect: { stamina: 8, steal: 0.05 } } };
const team = (edge) => ({
  name: 'T', edge,
  batters: ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'DH'].map((position, i) => ({ id: `b${i}`, name: `b${i}`, position, stats: { contact: 78, power: 78, speed: 80, defense: 75 } })),
  pitchers: [{ id: 'p', name: 'p', stats: { stuff: 80, control: 78, stamina: 90, stability: 78 } }],
});

describe('코치진 효과 → 경기', () => {
  it('체력은 투수 체력에 그대로 더하고 안정은 건드리지 않는다', () => {
    const [p] = applyStaff([{ id: 'p', type: 'pitcher', stats: { stuff: 80, control: 78, stamina: 90, stability: 78 } }], staff);
    expect(p.stats.stamina).toBe(98);
    expect(p.stats.stability).toBe(78);
  });
  it('도루 성공 확률에 edge.steal 이 더해진다', () => {
    const odds = (edge) => {
      const g = createGame({ home: team(null), away: team(edge) }); // 1회 초 = 원정 공격
      g.bases[0] = g.away.team.batters[0];
      return stealOdds(g, 0);
    };
    expect(odds({ steal: 0.05 }) - odds(null)).toBeCloseTo(0.05, 5);
  });
});
