import { describe, it, expect } from 'vitest';
import { winProb, winPct, runExp } from '../src/engine/winProb.js';
import { createGame, pitch } from '../src/engine/pitchSim.js';

const P = (i, t) => ({
  id: `${t}${i}`, name: `${t}${i}`, overall: 78, type: t === 'b' ? 'batter' : 'pitcher',
  position: t === 'b' ? 'CF' : (i === 0 ? 'SP' : 'RP'), hand: 'R',
  stats: { contact: 75, power: 76, speed: 72, defense: 74, stuff: 76, control: 75, stamina: 70 },
});
const team = (n) => ({ name: n, batters: Array.from({ length: 9 }, (_, i) => P(i, 'b')), pitchers: Array.from({ length: 6 }, (_, i) => P(i, 'p')) });
const on = (b) => b.map((x) => (x ? { id: 'r' } : null));
const at = (inning, top, outs, bases, h, a) => ({ inning, top, outs, bases: on(bases), home: { runs: h }, away: { runs: a }, final: false });
/** 그 자리에서 끝까지 돌려 실제로 이긴 비율 */
const played = (c, n) => {
  let win = 0; let draw = 0;
  for (let i = 0; i < n; i += 1) {
    const g = createGame({ home: team('H'), away: team('A') });
    Object.assign(g, { inning: c.inning, top: c.top, outs: c.outs, balls: 0, strikes: 0, bases: [...c.bases] });
    g.home.runs = c.home.runs; g.away.runs = c.away.runs;
    let guard2 = 0;
    while (!g.final && guard2 < 3000) { guard2 += 1; if (!pitch(g, {})) break; }
    if (g.home.runs > g.away.runs) win += 1; else if (g.home.runs === g.away.runs) draw += 1;
  }
  return (win + draw * 0.5) / n;
};

describe('승률', () => {
  it('경기가 끝나면 이긴 쪽이 1 진 쪽이 0', () => {
    expect(winProb({ ...at(9, false, 0, [0, 0, 0], 5, 3), final: true })).toBe(1);
    expect(winProb({ ...at(9, false, 0, [0, 0, 0], 3, 5), final: true })).toBe(0);
  });
  it('시작은 반반, 앞설수록 오르고 뒤질수록 내린다', () => {
    const start = winProb(at(1, true, 0, [0, 0, 0], 0, 0));
    expect(start).toBeGreaterThan(0.42);
    expect(start).toBeLessThan(0.58);
    const up = [-3, -1, 0, 1, 3].map((d) => winProb(at(5, true, 0, [0, 0, 0], 4 + d, 4)));
    for (let i = 1; i < up.length; i += 1) expect(up[i]).toBeGreaterThan(up[i - 1]);
  });
  it('같은 점수차라도 경기가 끝나 갈수록 굳어진다', () => {
    const early = winProb(at(2, true, 0, [0, 0, 0], 4, 2));
    const late = winProb(at(8, true, 0, [0, 0, 0], 4, 2));
    expect(late).toBeGreaterThan(early);
  });
  it('주자가 쌓일수록 공격 쪽으로 기운다', () => {
    const empty = winProb(at(7, false, 1, [0, 0, 0], 3, 3)); // 우리 공격
    const full = winProb(at(7, false, 1, [1, 1, 1], 3, 3));
    expect(full).toBeGreaterThan(empty);
    expect(runExp([1, 1, 1], 0)).toBeGreaterThan(runExp([0, 0, 0], 0));
  });
  it('9회말 뒤진 자리는 따라붙기와 끝내기를 함께 센다', () => {
    const tie = winProb(at(9, false, 0, [1, 1, 1], 3, 4)); // 1점 뒤 · 만루 무사
    expect(tie).toBeGreaterThan(0.5); // 동점이면 연장, 넘어서면 끝
    const dead = winProb(at(9, false, 2, [0, 0, 0], 2, 5)); // 2사 무주자 3점 뒤
    expect(dead).toBeLessThan(0.05);
  });
  it('실제로 돌려 본 결과와 크게 어긋나지 않는다', () => {
    for (const c of [at(1, true, 0, [0, 0, 0], 0, 0), at(7, true, 2, [1, 1, 1], 2, 4), at(9, false, 1, [0, 1, 1], 4, 4)]) {
      expect(Math.abs(winProb(c) - played(c, 150))).toBeLessThan(0.13);
    }
  });
  it('백분율은 0~100 정수', () => {
    const v = winPct(at(4, true, 1, [1, 0, 0], 2, 2));
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  });
});
