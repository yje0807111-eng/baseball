import { test, expect } from 'vitest';
import { ROSTER_SIZE, FOREIGN_LIMIT, DRAFT_SERIES, FIELD_SLOTS, personKey } from '../src/KboAugmentDraft.jsx';
import { specialAiRoster, rosterOrigin, filledStarters, NO_CAP, isNoCap } from '../src/draft/special.js';

const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

test('캡 없음은 어떤 영입가도 막지 않는다', () => {
  expect(isNoCap(NO_CAP)).toBe(true);
  expect(isNoCap(1330)).toBe(false);
  expect(NO_CAP > 99999).toBe(true);
});

test('상대 팀은 나와 같은 방식(시리즈 한 번에 한 명)으로 스무 명을 채운다', () => {
  for (let n = 0; n < 6; n++) {
    const r = specialAiRoster({ series: DRAFT_SERIES, rng: seeded(11 + n * 7) });
    expect(r).toHaveLength(ROSTER_SIZE);
    // 같은 선수 · 같은 사람이 두 번 들어가지 않는다
    expect(new Set(r.map((p) => p.id)).size).toBe(ROSTER_SIZE);
    expect(new Set(r.map(personKey)).size).toBe(ROSTER_SIZE);
    // 외국인 제한
    expect(r.filter((p) => p.isForeign).length).toBeLessThanOrEqual(FOREIGN_LIMIT);
    // 주전 자리를 다 채운다 (퓨처스로 메울 자리가 없다)
    expect(filledStarters(r)).toBe(FIELD_SLOTS.length);
  }
});

test('여러 시즌 · 구단에서 섞여 온다', () => {
  const r = specialAiRoster({ series: DRAFT_SERIES, rng: seeded(3) });
  const teams = new Set(r.map((p) => `${p.year} ${p.team}`));
  expect(teams.size).toBeGreaterThan(5);          // 한 팀만으로 채우지 않는다
  expect(rosterOrigin(r)).toMatch(/\S/);          // 이름에 쓸 대표 시즌 · 구단
});

test('판마다 다른 팀이 나온다', () => {
  const a = specialAiRoster({ series: DRAFT_SERIES, rng: seeded(5) }).map((p) => p.id).join();
  const b = specialAiRoster({ series: DRAFT_SERIES, rng: seeded(6) }).map((p) => p.id).join();
  expect(a).not.toBe(b);
});
