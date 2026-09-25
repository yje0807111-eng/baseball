import { describe, it, expect } from 'vitest';
import { capUse, squadIssues, addBlockReason, SQUAD_CAP, BASE_LIMITS } from '../src/myteam/rules.js';

const man = (i, cost, over = {}) => ({ id: `p${i}`, personId: `n${i}`, name: `p${i}`, position: 'OF', type: 'batter', overall: 78, cost, ...over });
const squadOf = (n, cost) => Array.from({ length: n }, (_, i) => man(i, cost));

describe('샐러리 캡', () => {
  it('엔트리와 코치진의 값을 함께 센다', () => {
    const team = { squad: squadOf(10, 80), staff: { manager: { cost: 120 }, hit: { cost: 60 } } };
    const u = capUse(team);
    expect(u.cost).toBe(10 * 80 + 120 + 60);
    expect(u.cap).toBe(SQUAD_CAP);
    expect(u.left).toBe(SQUAD_CAP - u.cost);
    expect(u.over).toBe(0);
  });
  it('캡을 늘리면 남는 자리도 늘어난다', () => {
    const squad = squadOf(26, 90);
    expect(capUse({ squad }).left).toBeLessThan(capUse({ squad, cap: SQUAD_CAP + 100 }).left);
  });
  it('넘기면 넘긴 만큼을 알려 준다', () => {
    const u = capUse({ squad: squadOf(26, 100) }); // 2600 CP
    expect(u.over).toBe(2600 - SQUAD_CAP);
    expect(u.left).toBeLessThan(0);
  });
  it('넘긴 엔트리는 경기에 나갈 수 없다', () => {
    const squad = squadOf(26, 100);
    const issues = squadIssues(squad, {}, SQUAD_CAP, { ...BASE_LIMITS, size: 26 });
    expect(issues.some((x) => x.startsWith('CP 초과'))).toBe(true);
  });
  it('남은 캡보다 비싼 선수는 영입이 막힌다', () => {
    const squad = squadOf(25, 90); // 2250 CP · 남은 80
    const lim = { ...BASE_LIMITS, size: 26, free: 99 };
    expect(addBlockReason(man(99, 200), squad, {}, SQUAD_CAP, lim)).toMatch(/CP 부족/);
    expect(addBlockReason(man(98, 60), squad, {}, SQUAD_CAP, lim)).toBe(null);
  });
});
