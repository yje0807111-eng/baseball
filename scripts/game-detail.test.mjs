import { describe, it, expect } from 'vitest';
import { createGame, pitch } from '../src/engine/pitchSim.js';
import { buildResult } from '../src/BroadcastGame.jsx';
import { gameDetail, thinFlow, flowMarks } from '../src/myteam/gameDetail.js';

const P = (i, t, n) => ({
  id: `${n}${t}${i}`, name: `${n}${t}${i}`, overall: 78, type: t === 'b' ? 'batter' : 'pitcher',
  position: t === 'b' ? 'CF' : (i === 0 ? 'SP' : 'RP'), hand: 'R', form: i === 0 ? 'hot' : 'flat',
  stats: { contact: 75, power: 76, speed: 78, defense: 74, stuff: 76, control: 75, stamina: 70, stability: 75 },
});
const team = (n) => {
  const batters = Array.from({ length: 9 }, (_, i) => P(i, 'b', n));
  const pitchers = Array.from({ length: 6 }, (_, i) => P(i, 'p', n));
  return { name: n, batters, pitchers, roster: [...batters, ...pitchers] };
};

describe('기록실 경기 상세', () => {
  const my = { ...team('H'), synergies: [{ id: 'cleanup', name: '클린업 트리오', level: 1, tiers: [{}], active: true }, { id: 'x', name: 'x', level: 0, tiers: [{}], active: false }] };
  const opp = team('A');
  const g = createGame({ home: my, away: opp });
  let k = 0;
  while (!g.final && k < 20000) { k += 1; if (!pitch(g, {})) break; }
  const res = buildResult(g, my, { flow: Array.from({ length: 150 }, (_, i) => 0.5 + Math.sin(i / 9) / 3), calls: [], gain: 0.04, sides: { off: 'big', mound: 'long', def: 'std' } });
  const d = gameDetail(res, my, opp, [{ itemId: 'nope', playerName: '갑', gamesLeft: 2 }, { itemId: 'nope', playerName: '을', gamesLeft: 1 }, { itemId: 'gone', playerName: '병', gamesLeft: 0 }]);

  it('라인 스코어 합이 점수와 같다', () => {
    const sum = (a) => a.reduce((s, v) => s + (v || 0), 0);
    expect(sum(d.board.my)).toBe(res.score.my);
    expect(sum(d.board.opp)).toBe(res.score.opp);
  });
  it('타순 아홉 명과 타격 기록', () => {
    expect(d.lineup).toHaveLength(9);
    expect(d.lineup[0].form).toBe('hot');
    const h = d.lineup.reduce((s, b) => s + b.h, 0);
    expect(h).toBe(d.hits.my);
    for (const b of d.lineup) expect(b.h).toBeLessThanOrEqual(b.ab);
  });
  it('등판 투수는 선발부터, 실점 합은 상대 점수', () => {
    expect(d.arms[0].sp).toBe(true);
    expect(d.arms.reduce((s, p) => s + p.r, 0)).toBe(res.score.opp);
  });
  it('켜진 시너지 · 작전 · 부스트만 짧게', () => {
    expect(d.synergies).toEqual([{ id: 'cleanup', name: '클린업 트리오', level: 1, tiers: 1 }]);
    expect(d.sides).toEqual({ off: 'big', mound: 'long', def: 'std' });
    expect(d.boosts).toEqual([{ id: 'nope', name: 'nope', who: '2명' }]);
    expect(d.flow.length).toBeLessThanOrEqual(100);
    expect(JSON.stringify(d).length).toBeLessThan(6000);
  });
  it('흐름을 줄여도 처음과 끝은 남는다', () => {
    const f = Array.from({ length: 200 }, (_, i) => i / 199);
    const t = thinFlow(f);
    expect(t[0]).toBe(0);
    expect(t.at(-1)).toBe(1);
    expect(thinFlow(null)).toBeNull();
  });
  it('회차 눈금은 각 회가 시작하는 자리, 점은 득점한 타석', () => {
    const at = [{ i: 1, t: true, r: 0 }, { i: 1, t: true, r: 0 }, { i: 1, t: false, r: 2 }, { i: 2, t: true, r: 0 }, { i: 2, t: false, r: 0 }];
    const { ticks, dots } = flowMarks([0.5, 0.45, 0.62, 0.6, 0.66], at);
    expect(ticks).toEqual([0, 0.5]);
    expect(dots).toEqual([{ x: 0.5, v: 0.62, top: false }]);
    expect(flowMarks([0.5], null)).toEqual({ ticks: null, dots: null });
  });
});
