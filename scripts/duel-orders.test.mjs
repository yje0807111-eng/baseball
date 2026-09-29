/* 수싸움 지시(노림 코스 · 강공 · 밀어치기 · 기습번트 · 유인구 방향 · AI 공) — 엔진이 알아듣는지 못 박아 둔다 */
import { test, expect } from 'vitest';
import { createGame, pitch, inAim } from '../src/engine/pitchSim.js';
import { seeded } from '../src/engine/rng.js';
import { pitchTarget, ZONE } from '../src/play/playScript.js';

const man = (id, s) => ({ id, name: id, position: 'CF', stats: { contact: 78, power: 78, speed: 75, defense: 75, stuff: 80, control: 78, stability: 75, ...s } });
const team = (tag) => ({ name: tag, batters: Array.from({ length: 9 }, (_, i) => man(`${tag}${i}`)), pitchers: [man(`${tag}P`), man(`${tag}R`)] });

/** 한 타석을 같은 지시로 끝까지 — 결과 코드 */
function atBat(orders, seed) {
  const g = createGame({ home: team('H'), away: team('A'), rng: seeded(seed) });
  let ev;
  do { ev = pitch(g, orders); } while (ev && !ev.result);
  return ev.result;
}
const rate = (orders, keys, n = 3000) => {
  let k = 0;
  for (let i = 0; i < n; i += 1) if (keys.includes(atBat(orders, i + 1))) k += 1;
  return k / n;
};

test('노림 코스 네 칸 — 가운데 줄 · 칸은 두 쪽에 걸친다', () => {
  expect(inAim(0, 'ih')).toBe(true);
  expect(inAim(4, 'ih') && inAim(4, 'ol')).toBe(true);
  expect(inAim(2, 'ih')).toBe(false);
  expect(inAim(8, 'ol')).toBe(true);
  expect(inAim(6, 'oh')).toBe(false);
  expect(inAim(null, 'ih')).toBe(false);
});

test('강공은 홈런이 늘고 · 밀어치기는 삼진이 준다', () => {
  expect(rate({ approach: 'power' }, ['HR'])).toBeGreaterThan(rate({}, ['HR']));
  expect(rate({ approach: 'contact' }, ['K'])).toBeLessThan(rate({}, ['K']));
});

test('노림 코스가 맞는 공만 오면 안타가 늘고, 늘 틀리면 준다', () => {
  const HIT = ['1B', '2B', '3B', 'HR'];
  /* 투수가 늘 몸쪽 높게(0) 던질 때 — 몸쪽 높게를 노리면 맞고, 바깥 낮게를 노리면 빗나간다 */
  const right = rate({ zone: 0, aim: 'ih' }, HIT);
  const wrong = rate({ zone: 0, aim: 'ol' }, HIT);
  expect(right).toBeGreaterThan(wrong + 0.03);
});

test('기습번트는 번트 안타가 는다', () => {
  expect(rate({ bunt: true, drag: true }, ['BH'])).toBeGreaterThan(rate({ bunt: true }, ['BH']) + 0.05);
});

test('유인구 방향은 그림에만 — 존 밖이면 그쪽에 찍힌다', () => {
  const g = createGame({ home: team('H'), away: team('A'), rng: seeded(7) });
  let seen = 0;
  for (let i = 0; i < 60; i += 1) {
    const ev = pitch(g, { zone: 'chase', band: 'lo' });
    if (!ev) break;
    if (ev.pitch && !ev.pitch.inZone) {
      expect(ev.pitch.band).toBe('lo');
      expect(pitchTarget(ev)[1]).toBeGreaterThan(ZONE.h);
      seen += 1;
    }
  }
  expect(seen).toBeGreaterThan(10);
});

test('AI 가 미리 뽑은 공(noPick)은 구종을 찍은 힘 보정이 없다', () => {
  const g = createGame({ home: team('H'), away: team('A'), rng: seeded(3) });
  expect(pitch(g, { pitchType: 'change', noPick: true }).pitch.picked).toBe(0);
  expect(pitch(g, { pitchType: 'change' }).pitch.picked).not.toBe(0);
});

test('칸을 직접 찍으면(exact) 존에 더 자주 · AI 가 뽑은 자리(noPick)는 보정 없이 자리만', () => {
  const inRate = (o) => {
    const g = createGame({ home: team('H'), away: team('A'), rng: seeded(11) });
    let n = 0, k = 0;
    for (let i = 0; i < 400; i += 1) { const ev = pitch(g, o); if (!ev) break; if (ev.pitch) { n += 1; if (ev.pitch.inZone) k += 1; } }
    return k / n;
  };
  expect(inRate({ zone: 2, exact: true })).toBeGreaterThan(inRate({ zone: 2 }) + 0.03);
  const g = createGame({ home: team('H'), away: team('A'), rng: seeded(5) });
  const ev = pitch(g, { pitchType: 'fast', zone: 0, noPick: true });
  expect(ev.pitch.corner).toBe(0);
  expect(ev.pitch.inZone ? ev.pitch.zone : 0).toBe(0);
});

test('수싸움 상황 한 줄 — 급한 것부터(끝내기 · 만루 · 득점권 · 아웃)', async () => {
  const { situationOf } = await import('../src/play/DuelPanel.jsx');
  const R = {};
  const at = (o) => ({ inning: 5, outs: 0, bases: [null, null, null], home: { runs: 2 }, away: { runs: 2 }, ...o });
  expect(situationOf(at({ inning: 9, bases: [null, R, null] }), 'off')).toBe('끝내기 찬스');
  expect(situationOf(at({ bases: [R, R, R] }), 'off')).toBe('만루 찬스');
  expect(situationOf(at({ bases: [null, null, R], home: { runs: 1 } }), 'off')).toBe('동점 찬스');
  expect(situationOf(at({ bases: [R, null, null] }), 'off')).toBe('진루 찬스');
  expect(situationOf(at({}), 'off')).toBe('선두 타자 출루');
  expect(situationOf(at({ bases: [R, R, R] }), 'def')).toBe('만루 위기');
  expect(situationOf(at({ bases: [null, R, null], home: { runs: 3 } }), 'def')).toBe('동점 위기');
  expect(situationOf(at({ inning: 9, outs: 1, home: { runs: 4 } }), 'def')).toBe('승리까지 아웃 2개');
  expect(situationOf(at({ bases: [R, null, null], outs: 1 }), 'def')).toBe('병살 찬스');
  expect(situationOf(at({ outs: 2 }), 'def')).toBe('이닝 마무리');
});

test('스카우팅은 두 마디 꼬리표 — 한 칸 8자 안쪽, 네 칸까지', async () => {
  const { scoutOf } = await import('../src/play/DuelPanel.jsx');
  const P = (s) => ({ stats: { stuff: 80, control: 78, stability: 75, ...s } });
  const B = (s) => ({ stats: { contact: 78, power: 78, ...s } });
  const side = (pitcher, batters = [B({})]) => ({ pitcher, pitches: 0, pitcherIdx: 0, idx: 0, team: { usage: {}, batters } });
  const off = scoutOf({ top: false, away: side(P({ control: 92 })), home: side(P({})) }, 'off');
  expect(off).toContain('볼넷 적음');
  const def = scoutOf({ top: true, away: side(P({}), [B({ power: 95, contact: 70 })]), home: side(P({})) }, 'def');
  expect(def).toEqual(expect.arrayContaining(['장타자', '유인구 약함']));
  for (const t of [...off, ...def]) expect(t.length).toBeLessThanOrEqual(8);
  expect(off.length).toBeLessThanOrEqual(4);
});

test('노림 한 칸 — 그 칸 크게 · 옆 칸 조금 · 나머지 손해, 공격 존 퍼센트는 합 100%', async () => {
  const { aimBonusOf } = await import('../src/engine/pitchSim.js');
  expect(aimBonusOf(4, 4)).toBeCloseTo(0.2);
  expect(aimBonusOf(1, 4)).toBeCloseTo(0.05);
  expect(aimBonusOf(0, 8)).toBeCloseTo(-0.06);
  expect(aimBonusOf(null, 4)).toBe(0);
  expect(aimBonusOf(0, 'ih')).toBeCloseTo(0.1);
  const { locOf } = await import('../src/play/DuelPanel.jsx');
  const P = { id: 'p1', stats: { stuff: 80, control: 78 } };
  const L = locOf({ balls: 0, strikes: 0, away: { pitcher: P } });
  expect(L.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  /* 볼카운트가 몰리면 직구(높게)가 늘어 위 줄이 두꺼워진다 */
  const behind = locOf({ balls: 3, strikes: 0, away: { pitcher: P } });
  expect(behind[0] + behind[1] + behind[2]).toBeGreaterThan(L[0] + L[1] + L[2]);
});

test('추천 — 후반 한 점 승부 3루 주자면 스퀴즈 · 2스트라이크면 밀어치기와 예측 안 함 · 몰리면 직구', async () => {
  const { recOf } = await import('../src/play/DuelPanel.jsx');
  const R = { id: 'r', stats: { speed: 60 } };
  const at = (o) => ({ inning: 8, outs: 1, balls: 0, strikes: 0, bases: [null, null, null], home: { runs: 2, pitcher: {} }, away: { runs: 2, pitcher: { stats: { stuff: 80 } }, team: { batters: [] } }, ...o });
  expect(recOf(at({ bases: [null, null, R] })).play).toBe('squeeze');
  expect(recOf(at({ strikes: 2 }))).toEqual({ play: 'contact', guess: null });
  expect(recOf(at({ balls: 3, strikes: 1 })).guess).toBe('fast');
  expect(recOf(at({ inning: 2 })).play).toBe('power');
});
