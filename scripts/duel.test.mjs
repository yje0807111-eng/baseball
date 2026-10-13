/* 일반 대결 단판 상대 — 내 전력 ±5 안에서, 모자라면 가까운 12팀 */
import { test, expect } from 'vitest';
import { duelPool, pickDuel, duelPower, DUEL_RANGE, DUEL_MIN } from '../src/myteam/duel.js';
import { AI_SERIES, duelSeriesTeam } from '../src/myteam/aiTeam.js';
import { playStrength } from '../src/myteam/tournament.js';
import { buildAiTeam } from '../src/myteam/match.js';

const powerOf = (s) => playStrength(duelSeriesTeam(s));

test('범위 안 팀만 나온다', () => {
  for (const mine of [74, 78, 82, 86]) {
    const pool = duelPool(mine);
    expect(pool.length).toBeGreaterThanOrEqual(DUEL_MIN);
    for (const s of pool) expect(Math.abs(powerOf(s) - mine)).toBeLessThanOrEqual(DUEL_RANGE);
    expect(pool).toContain(pickDuel(mine, () => 0.999));
  }
});

test('스타터 전력은 레전드를 만나지 않는다', () => {
  expect(duelPool(78).some((s) => /^legend/.test(s.id))).toBe(false);
});

test('범위 안이 모자라면 가까운 12팀', () => {
  const pool = duelPool(130), top = AI_SERIES.map(powerOf).sort((a, b) => b - a).slice(0, DUEL_MIN);
  expect(pool).toHaveLength(DUEL_MIN);
  expect(pool.map(powerOf).sort((a, b) => b - a)).toEqual(top);
});

test('전력을 모르면 전부에서', () => {
  expect(duelPool(null)).toHaveLength(AI_SERIES.length);
});

test('내 팀 전력을 잰다', () => {
  const v = duelPower({ name: '테스트 팀', squad: buildAiTeam(2000, () => 0.42).roster, staff: {} });
  expect(v).toBeGreaterThan(60);
  expect(v).toBeLessThan(110);
});
