import { test, expect } from 'vitest';
import {
  CLUB_MODES, DRAFT_MODES, DRAFT_SERIES, FRANCHISE_KO, ROSTER_SIZE,
  offSynergiesOf, setOffSynergies, checkSynergies, SYNERGIES, personKey,
} from '../src/KboAugmentDraft.jsx';
import {
  createLive, autoPick, pick, isDone, currentClub, clubsFor, CLUB_COUNT, boardCount,
} from '../src/draft/live.js';

/* 늘 같은 판이 나오도록 고정 시드 (draft-live.test.mjs 와 같은 것) */
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

test('구단 모드는 보드 20개를 중복 없이 깔 수 있는 구단만', () => {
  expect(CLUB_MODES.length).toBe(9);
  expect(CLUB_MODES.map((m) => m.franchise)).toEqual(
    ['DOOSAN', 'KIA', 'LG', 'LOTTE', 'SAMSUNG', 'HANWHA', 'SSG', 'HYUNDAI', 'KIWOOM'].sort((a, b) => {
      const n = (fr) => DRAFT_SERIES.filter((s) => s.franchise === fr).length;
      return n(b) - n(a) || a.localeCompare(b);
    }),
  );
  CLUB_MODES.forEach((m) => {
    expect(m.series.length).toBeGreaterThanOrEqual(boardCount());
    expect(m.name).toBe(FRANCHISE_KO[m.franchise]);
    // 그 구단 시리즈만 (옛 이름 시즌과 구단 레전드까지)
    expect(m.series.every((s) => s.franchise === m.franchise)).toBe(true);
    expect(m.series.some((s) => s.kind === 'legend')).toBe(true);
  });
  // NC · KT · 쌍방울은 시리즈가 모자라 열지 않는다
  ['NC', 'KT', 'SSANGBANGWOOL'].forEach((fr) => expect(CLUB_MODES.some((m) => m.franchise === fr)).toBe(false));
});

test('두산 모드는 OB 시절까지 한 묶음', () => {
  const doosan = CLUB_MODES.find((m) => m.franchise === 'DOOSAN');
  expect(doosan.series.length).toBe(46);
  expect(doosan.series.some((s) => s.title === 'OB 베어스')).toBe(true);
  expect(new Set(doosan.players.map(personKey)).size).toBe(229);
});

test('구단 모드는 프랜차이즈의 기억과 다른 구단 이야기를 뺀다', () => {
  const off = offSynergiesOf(CLUB_MODES.find((m) => m.franchise === 'DOOSAN'));
  expect(off).toContain('franchise'); // 한 구단만 뽑으니 늘 최고 단계
  expect(off).toContain('lotte10'); // 다른 구단 이야기
  expect(off).toContain('kia24');
  expect(off).toContain('cleanup'); // 이승엽 · 이대호가 없어 채울 수 없다
  expect(off).not.toContain('doosanBattery'); // 그 구단 이야기는 남는다
  expect(off).not.toContain('doosanMound');
  expect(off).not.toContain('power'); // 팀 구성 시너지는 그대로
  // 모드가 아니면 아무것도 빼지 않는다
  expect(offSynergiesOf(DRAFT_MODES.find((m) => m.id === 'mix'))).toEqual([]);
  expect(offSynergiesOf(null)).toEqual([]);
});

test('구단마다 남는 이야기는 그 구단 것뿐', () => {
  CLUB_MODES.forEach((m) => {
    const off = new Set(offSynergiesOf(m));
    SYNERGIES.filter((s) => s.kind === 'story' && s.club).forEach((s) => {
      expect(off.has(s.id)).toBe(s.club !== m.franchise);
    });
  });
});

test('뺀 시너지는 현황에서 사라지고, 비우면 돌아온다', () => {
  const all = checkSynergies([]).length;
  setOffSynergies(['franchise', 'lotte10']);
  expect(checkSynergies([]).length).toBe(all - 2);
  expect(checkSynergies([]).some((s) => s.id === 'franchise')).toBe(false);
  setOffSynergies([]);
  expect(checkSynergies([]).length).toBe(all);
});

test('구단 모드로 8구단 판을 끝까지 돌려도 전체 믹스만큼 엔트리가 찬다', () => {
  /* 보드 20개를 한 바퀴 돌면 판이 끝나므로 어느 모드든 몇 자리는 남는다(남은 자리는 퓨처스 유망주로 채운다).
     구단 모드가 그보다 더 빈약하지 않은지만 본다 — 기준은 전체 믹스 */
  const fill = (series) => {
    let n = 0;
    let sum = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const rng = seeded(seed);
      let s = createLive({ series, rng });
      let guard = 0;
      while (!isDone(s) && guard++ < CLUB_COUNT * ROSTER_SIZE + 20) s = pick(s, autoPick(s, currentClub(s), rng), { auto: true });
      expect(isDone(s)).toBe(true);
      s.clubs.forEach((c) => {
        n += 1;
        sum += c.roster.length;
        // 같은 사람의 다른 시즌이 한 엔트리에 겹치지 않는다 (구단 모드는 같은 사람이 여러 해 깔린다)
        expect(new Set(c.roster.map(personKey)).size).toBe(c.roster.length);
        expect(c.roster.length).toBeGreaterThanOrEqual(ROSTER_SIZE - 3);
      });
    }
    return sum / n;
  };
  const mix = fill(DRAFT_MODES.find((m) => m.id === 'mix').series);
  expect(mix).toBeGreaterThan(19);
  CLUB_MODES.forEach((m) => {
    expect(clubsFor(m.series)).toBe(CLUB_COUNT); // 구단 수를 줄이지 않는다
    expect(fill(m.series)).toBeGreaterThan(mix - 0.3);
  });
});
