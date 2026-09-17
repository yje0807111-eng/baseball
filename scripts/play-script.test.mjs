import { describe, it, expect } from 'vitest';
import { buildPlay, runnerMoves, runPath, along, spot, fenceAt } from '../src/play/playScript.js';
import { hitLocation, fielderAt, dirName, simulateGame } from '../src/engine/pitchSim.js';
import { randomSeriesTeam } from '../src/myteam/aiTeam.js';

const P = (id) => ({ id, name: id, overall: 80, type: 'batter', stats: { contact: 78, power: 80, speed: 72, defense: 74 } });
const ev = (over) => ({
  inning: 5, top: false, batter: P('bat'), pitcher: P('pit'),
  pitch: { type: 'fast', zone: 4, inZone: true, velo: 148 },
  before: { outs: 1, balls: 0, strikes: 0, bases: [null, null, null] },
  after: { outs: 1, balls: 0, strikes: 0, bases: [null, null, null] },
  runs: 0, ...over,
});
const seeded = (n) => { let x = n || 1; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; };
const finite = (xs) => xs.every((v) => Number.isFinite(v));

describe('타구 자리', () => {
  it('결과마다 방향·발사각·비거리가 말이 된다', () => {
    for (const r of ['HR', '3B', '2B', '1B', 'GO', 'FO', 'LO', 'DP', 'E', 'SF', 'SAC', 'BH']) {
      for (let i = 1; i < 60; i += 1) {
        const h = hitLocation(seeded(i), r, { power: 60 + (i % 40), speed: 55 + (i % 40) });
        expect(finite([h.dir, h.loft, h.dist])).toBe(true);
        expect(Math.abs(h.dir)).toBeLessThanOrEqual(1);
        expect(h.dist).toBeGreaterThan(0);
        if (r === 'HR') expect(h.dist).toBeGreaterThan(fenceAt(h.dir)); // 홈런은 담장을 넘는다
        else expect(h.dist).toBeLessThan(fenceAt(h.dir));
        if (r !== 'HR') expect(h.by).toBeTruthy(); // 담장 안이면 처리할 야수가 있다
      }
    }
  });
  it('내야 땅볼은 내야수가, 외야 타구는 외야수가 처리한다', () => {
    expect(fielderAt(-0.8, 0.25)).toBe('3B');
    expect(fielderAt(0.8, 0.25)).toBe('1B');
    expect(fielderAt(-0.3, 0.3)).toBe('SS');
    expect(fielderAt(0, 0.7)).toBe('CF');
    expect(fielderAt(-0.6, 0.8)).toBe('LF');
    expect(fielderAt(0, 1.2)).toBe(null);
  });
  it('방향 이름은 좌에서 우로 간다', () => {
    expect(dirName(-0.9)).toBe('좌익선상');
    expect(dirName(0)).toBe('중앙');
    expect(dirName(0.9)).toBe('우익선상');
  });
});

describe('주자 대본', () => {
  it('홈런이면 앞선 주자부터 모두 홈에 들어온다', () => {
    const r1 = P('r1'); const r3 = P('r3');
    const e = ev({ call: 'inplay', result: 'HR', runs: 3, hit: hitLocation(seeded(2), 'HR', {}),
      before: { outs: 1, balls: 0, strikes: 0, bases: [r1, null, r3] },
      after: { outs: 1, balls: 0, strikes: 0, bases: [null, null, null] } });
    const runs = buildPlay(e).beats.filter((b) => b.kind === 'run');
    expect(runs).toHaveLength(3);
    expect(runs.every((b) => b.scored)).toBe(true);
    expect(runs[0].player.id).toBe('r3'); // 3루 주자가 먼저 출발한다
    expect(runs[0].t1).toBeLessThan(runs[2].t1); // 먼저 들어온다
  });
  it('제자리 주자도 대본에 남는다', () => {
    const r3 = P('r3');
    const e = ev({ call: 'inplay', result: 'GO', runs: 0,
      before: { outs: 0, balls: 0, strikes: 0, bases: [null, null, r3] },
      after: { outs: 1, balls: 0, strikes: 0, bases: [null, null, r3] }, hit: hitLocation(seeded(5), 'GO', {}) });
    const runs = buildPlay(e).beats.filter((b) => b.kind === 'run');
    expect(runs.some((b) => b.player.id === 'r3' && b.still)).toBe(true);
  });
  it('달리는 길은 사이의 루를 모두 밟는다', () => {
    expect(runPath(0, 2)).toHaveLength(3); // 1루 → 2루 → 3루
    expect(runPath(-1, 0)).toHaveLength(2); // 타석 → 1루
    expect(runPath(0, 3)).toHaveLength(5); // 1루 → 2 → 3 → 홈 → 비켜서기
    expect(finite(runPath(2, 3).flat())).toBe(true);
  });
  it('길 위 어느 지점이든 좌표가 나온다', () => {
    for (const u of [0, 0.3, 0.5, 1, 1.4, -0.2]) expect(finite(along(runPath(0, 3), u))).toBe(true);
  });
});

describe('공 하나짜리 대본', () => {
  it('볼·스트라이크는 존 뷰에서 끝나고, 인플레이는 필드로 넘어간다', () => {
    expect(buildPlay(ev({ call: 'ball' })).cut).toBe(null);
    expect(buildPlay(ev({ call: 'swinging' })).cut).toBe(null);
    const inplay = buildPlay(ev({ call: 'inplay', result: '1B', hit: hitLocation(seeded(9), '1B', {}) }));
    expect(inplay.cut).toBeGreaterThan(0);
    expect(inplay.beats.some((b) => b.kind === 'ball')).toBe(true);
  });
  it('한 경기를 통째로 돌려도 모든 공이 대본이 된다', () => {
    const g = simulateGame({ home: engine(1), away: engine(2) });
    expect(g.events.length).toBeGreaterThan(100);
    for (const e of g.events) {
      const play = buildPlay(e);
      for (const b of play.beats) {
        expect(b.t0 == null || (b.t0 >= 0 && b.t0 <= 1)).toBe(true);
        expect(b.t1 == null || (b.t1 >= 0 && b.t1 <= 1)).toBe(true);
        if (b.path) expect(finite(b.path.flat())).toBe(true);
        if (b.from) expect(finite(b.from)).toBe(true);
        if (b.to) expect(finite(b.to)).toBe(true);
      }
    }
  });
});

/** 테스트용 엔진 팀 */
function engine(seed) {
  const t = randomSeriesTeam(seeded(seed));
  const roster = t.roster || [];
  return {
    name: t.name,
    batters: roster.filter((p) => p.type === 'batter').slice(0, 9),
    pitchers: roster.filter((p) => p.type === 'pitcher').slice(0, 6),
  };
}
