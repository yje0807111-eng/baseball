import { describe, it, expect } from 'vitest';
import { createGame, pitch, staminaOf } from '../src/engine/pitchSim.js';

const P = (i, t) => ({
  id: `${t}${i}`, name: `${t}${i}`, overall: 78, type: t === 'b' ? 'batter' : 'pitcher',
  position: t === 'b' ? 'CF' : (i === 0 ? 'SP' : 'RP'), hand: 'R',
  stats: { contact: 75, power: 76, speed: 72, defense: 74, stuff: 76, control: 75, stamina: 70, stability: 70 },
});
const team = (n, arms = 6) => ({
  name: n, batters: Array.from({ length: 9 }, (_, i) => P(i, 'b')), pitchers: Array.from({ length: arms }, (_, i) => P(i, 'p')),
});
const play = (g, n = 4000) => { let k = 0; while (!g.final && k < n) { k += 1; if (!pitch(g, {})) break; } };

describe('체력이 바닥나면 알아서 내려간다', () => {
  it('체력은 0~100 이고 던질수록 줄어든다', () => {
    const g = createGame({ home: team('H'), away: team('A') });
    expect(staminaOf(g.home)).toBe(100);
    const before = staminaOf(g.away);
    for (let i = 0; i < 20; i += 1) pitch(g, {});
    expect(staminaOf(g.away)).toBeLessThan(before);
    expect(staminaOf(g.away)).toBeGreaterThanOrEqual(0);
  });
  it('양 팀 모두 경기 중에 저절로 바뀐다', () => {
    let swaps = 0; let mine = 0; let theirs = 0;
    for (let s = 0; s < 10; s += 1) {
      const g = createGame({ home: team('H'), away: team('A') });
      let k = 0;
      while (!g.final && k < 4000) {
        k += 1;
        const e = pitch(g, {});
        if (!e) break;
        if (e.swapped) { swaps += 1; if (e.top) mine += 1; else theirs += 1; }
      }
    }
    expect(swaps).toBeGreaterThan(10);
    expect(mine).toBeGreaterThan(0); // 우리 수비(초)
    expect(theirs).toBeGreaterThan(0); // 상대 수비(말)
  });
  it('바뀌면 새 투수가 0 구부터 시작한다', () => {
    const g = createGame({ home: team('H'), away: team('A') });
    let k = 0;
    while (!g.final && k < 4000) {
      k += 1;
      const e = pitch(g, {});
      if (!e) break;
      if (e.swapped) {
        expect(e.swapped.out.id).not.toBe(e.swapped.in.id);
        expect(e.pitcher.id).toBe(e.swapped.in.id); // 그 공은 새 투수가 던진다
        return;
      }
    }
    throw new Error('자동 교체가 한 번도 일어나지 않았다');
  });
  it('타석 한가운데서는 바뀌지 않는다', () => {
    const g = createGame({ home: team('H'), away: team('A') });
    let k = 0;
    while (!g.final && k < 4000) {
      k += 1;
      const e = pitch(g, {});
      if (!e) break;
      if (e.swapped) expect(e.before.balls + e.before.strikes).toBe(0);
    }
  });
  it('뒤에 남은 투수가 없으면 그대로 던진다', () => {
    const g = createGame({ home: team('H', 1), away: team('A', 1) });
    play(g);
    expect(g.final).toBe(true); // 마지막 투수라도 경기는 끝까지 간다
    expect(g.home.pitcherIdx).toBe(0);
    expect(g.away.pitcherIdx).toBe(0);
  });
});
