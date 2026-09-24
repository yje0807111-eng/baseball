import { describe, it, expect } from 'vitest';
import { playsFor } from '../src/engine/plays.js';

const on = (b) => b.map((x) => (x ? { id: 'r', name: 'r', overall: 78, stats: { speed: 72, defense: 72 } } : null));
/** stealOdds 는 수비 쪽 포수를 본다 — 최소한의 팀을 붙여 둔다 */
const man = (i) => ({ id: `p${i}`, name: `p${i}`, overall: 78, position: 'C', stats: { speed: 72, defense: 72, contact: 74, power: 74 } });
const side = () => ({ team: { catcher: man(0), batters: [man(1)], pitchers: [man(2)] }, pitcher: man(2), pitches: 40, pitcherIdx: 0, runs: 0, mod: {} });
const at = (inning, top, outs, bases, h, a) => {
  const home = { ...side(), runs: h };
  const away = { ...side(), runs: a };
  return { inning, top, outs, bases: on(bases), home, away, final: false };
};

describe('승부처 선택지', () => {
  it('언제나 세 장이고 저마다 다른 지시를 낸다', () => {
    for (const g of [at(7, false, 0, [1, 0, 0], 3, 3), at(9, false, 1, [0, 1, 1], 2, 3),
      at(8, true, 2, [1, 1, 0], 4, 4), at(6, true, 0, [0, 0, 0], 1, 0)]) {
      for (const mine of [true, false]) {
        const cards = playsFor(g, { mine });
        expect(cards).toHaveLength(3);
        expect(new Set(cards.map((c) => c.key)).size).toBe(3);
        for (const c of cards) {
          expect(c.title).toBeTruthy();
          expect(c.note).toBeTruthy();
          expect(Number.isFinite(c.wp)).toBe(true);
          expect(Number.isInteger(c.move)).toBe(true);
        }
      }
    }
  });
  it('자리에 따라 다른 장이 나온다', () => {
    const third = playsFor(at(7, false, 1, [0, 0, 1], 3, 3), { mine: true }).map((c) => c.key);
    const first = playsFor(at(7, false, 0, [1, 0, 0], 3, 3), { mine: true }).map((c) => c.key);
    const none = playsFor(at(7, false, 2, [0, 0, 0], 3, 3), { mine: true }).map((c) => c.key);
    expect(third).toContain('squeeze'); // 3루 주자 — 스퀴즈
    expect(first).toContain('steal'); // 1루 주자 — 도루
    expect(none).toContain('guessF'); // 주자 없음 — 노림
    expect(third).not.toEqual(first);
  });
  it('1루가 비고 득점권이면 고의사구가 걸린다', () => {
    const keys = playsFor(at(8, true, 1, [0, 1, 0], 2, 2), { mine: false }).map((c) => c.key);
    expect(keys).toContain('ibb');
  });
  it('투수가 지치면 교체가 먼저 나온다', () => {
    const keys = playsFor(at(8, true, 0, [1, 0, 0], 3, 2), { mine: false, tired: 0.8 }).map((c) => c.key);
    expect(keys[0]).toBe('swap');
  });
  it('아웃 하나를 더 잡는 쪽은 수비에 이롭다', () => {
    const cards = playsFor(at(8, true, 1, [0, 0, 0], 3, 2), { mine: false });
    expect(cards.some((c) => c.move > 0)).toBe(true); // 삼진으로 끊으면 올라간다
  });
  it('도루는 성공률을 말로 적는다', () => {
    const steal = playsFor(at(7, false, 0, [1, 0, 0], 3, 3), { mine: true }).find((c) => c.key === 'steal');
    expect(steal.note).toMatch(/성공 \d+%/);
  });
});
