import { describe, it, expect } from 'vitest';
import { tacticOrders, levelOf, hookAt } from '../src/engine/tactics.js';
import { planOfSides, DEFAULT_SIDES } from '../src/myteam/strategy.js';
import { createGame, pitch, staminaOf } from '../src/engine/pitchSim.js';

const fineOf = (sides) => planOfSides({ ...DEFAULT_SIDES, ...sides }).fine;
/** 같은 눈금으로 여러 번 굴려 나온 지시를 모은다 — 성향이라 매번 같지 않다 */
const many = (fine, mine, n = 400) => {
  const out = [];
  let seed = 1;
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let i = 0; i < n; i += 1) out.push(tacticOrders(fine, mine, rng));
  return out;
};
const rate = (list, f) => list.filter(f).length / list.length;

const P = (i, t) => ({
  id: `${t}${i}`, name: `${t}${i}`, overall: 78, type: t === 'b' ? 'batter' : 'pitcher',
  position: t === 'b' ? 'CF' : (i === 0 ? 'SP' : 'RP'), hand: 'R',
  stats: { contact: 75, power: 76, speed: 78, defense: 74, stuff: 76, control: 75, stamina: 70, stability: 75 },
});
const team = (n) => ({ name: n, batters: Array.from({ length: 9 }, (_, i) => P(i, 'b')), pitchers: Array.from({ length: 6 }, (_, i) => P(i, 'p')) });

describe('전술 눈금', () => {
  it('세 단계가 -1 · 0 · 1 로 읽힌다', () => {
    expect(levelOf({ swing: '신중' }, 'swing')).toBe(-1);
    expect(levelOf({ swing: '보통' }, 'swing')).toBe(0);
    expect(levelOf({ swing: '과감' }, 'swing')).toBe(1);
    expect(levelOf({}, 'swing')).toBe(0); // 없는 값은 보통
  });
  it('투수를 내리는 문턱이 성향을 따른다', () => {
    expect(hookAt({ hook: '늦게' })).toBe(0);
    expect(hookAt({ hook: '보통' })).toBe(8);
    expect(hookAt({ hook: '빠르게' })).toBe(20);
  });

  it('출루를 고르면 공을 고르고, 빅볼이면 노리고 들어간다', () => {
    const calm = many(fineOf({ off: 'onbase' }), true);
    const big = many(fineOf({ off: 'big' }), true);
    expect(rate(calm, (o) => o.patience === 1)).toBe(1);
    expect(rate(big, (o) => o.patience === 1)).toBe(0);
    expect(rate(big, (o) => !!o.guess)).toBeGreaterThan(0.15); // 더러 노린다
  });
  it('발야구는 주루를 더 보고, 출루는 안전하게 간다', () => {
    expect(tacticOrders(fineOf({ off: 'speed' }), true).dash).toBe(1);
    expect(tacticOrders(fineOf({ off: 'onbase' }), true).dash).toBe(-1);
  });
  it('공격 지시는 마운드를 건드리지 않는다', () => {
    for (const o of many(fineOf({ off: 'big' }), true)) {
      expect(o.zone).toBeUndefined();
      expect(o.hold).toBeUndefined();
      expect(o.hookAt).toBeUndefined();
    }
  });

  it('총력전은 정면으로 붙고, 아끼기는 피한다', () => {
    const allin = many(fineOf({ mound: 'allin' }), false);
    const save = many(fineOf({ mound: 'save' }), false);
    expect(rate(allin, (o) => o.zone === 0)).toBeGreaterThan(0.2);
    expect(rate(allin, (o) => o.zone === 'chase')).toBe(0);
    expect(rate(save, (o) => o.zone === 'chase')).toBeGreaterThan(0.2);
    expect(rate(save, (o) => o.zone === 0)).toBe(0);
  });
  it('주자 묶기와 수비 위치가 실린다', () => {
    expect(tacticOrders(fineOf({ def: 'tight' }), false).hold).toBe(1);
    expect(tacticOrders(fineOf({ def: 'deep' }), false).hold).toBe(-1);
    expect(tacticOrders(fineOf({ def: 'in' }), false).guard).toBe(1);   // 전진
    expect(tacticOrders(fineOf({ def: 'deep' }), false).guard).toBe(-1); // 깊게
    expect(tacticOrders(fineOf({ def: 'std' }), false).guard).toBeUndefined(); // 정석이 기준이라 싣지 않는다
  });

  it('빠른 교체를 고르면 투수가 더 일찍 내려간다', () => {
    const swaps = (sides) => {
      let n = 0;
      const fine = fineOf(sides);
      for (let s = 0; s < 6; s += 1) {
        const g = createGame({ home: team('H'), away: team('A') });
        let k = 0;
        while (!g.final && k < 4000) {
          k += 1;
          const e = pitch(g, tacticOrders(fine, !g.top));
          if (!e) break;
          if (e.swapped && e.top) n += 1; // 내 수비(초)에서 바뀐 것만
        }
      }
      return n;
    };
    expect(swaps({ mound: 'quick' })).toBeGreaterThan(swaps({ mound: 'long' }));
  });
  it('체력이 문턱보다 높으면 그대로 던진다', () => {
    const g = createGame({ home: team('H'), away: team('A') });
    expect(staminaOf(g.home)).toBe(100);
    const e = pitch(g, { hookAt: 20 });
    expect(e.swapped).toBeUndefined();
    expect(g.home.pitcherIdx).toBe(0);
  });
});
