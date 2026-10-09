import { describe, it, expect } from 'vitest';
import { tacticOrders, levelOf, hookAt, lateOrders } from '../src/engine/tactics.js';
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

  it('선발 두 바퀴는 18타자에서 내리고, 볼 배합은 그 계열 공을 35% 안팎', () => {
    expect(tacticOrders(fineOf({ mound: 'two' }), false).hookBf).toBe(18);
    expect(tacticOrders(fineOf({ mound: 'long' }), false).hookBf).toBeUndefined();
    const b = many(fineOf({ mix: 'B' }), false);
    expect(rate(b, (o) => o.mixFam === 'B')).toBeGreaterThan(0.28);
    expect(rate(b, (o) => o.mixFam === 'B')).toBeLessThan(0.42);
    expect(rate(many(fineOf({ mix: 'mix' }), false), (o) => o.mixFam)).toBe(0);
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
      /* 씨앗을 고정해 두 눈금이 같은 경기들을 치르게 한다 — Math.random 이면 표본 6경기에서 가끔 뒤집혀 테스트가 흔들렸다 */
      for (let s = 0; s < 12; s += 1) {
        let seed = s + 1;
        const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
        const g = createGame({ home: team('H'), away: team('A'), rng });
        let k = 0;
        while (!g.final && k < 4000) {
          k += 1;
          const e = pitch(g, tacticOrders(fine, !g.top, rng));
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

describe('정비 계획이 경기로', () => {
  it('세부 눈금 없이 갈래가 정한 값 그대로', () => {
    const p = planOfSides({ ...DEFAULT_SIDES, off: 'speed' });
    expect(p.fine.take).toBe('과감');
    expect(p.sides.off).toBe('speed');
  });
});

describe('필승조', () => {
  it('7 · 8 · 9회 초 첫 타석에 고른 투수로 바꾸고, 이미 쓴 투수는 다시 부르지 않는다', () => {
    const g = createGame({ home: team('H'), away: team('A'), rng: () => 0.5 });
    const late = ['p3', 'p4', 'p5'];
    expect(lateOrders(g, late)).toBe(null); // 1회
    Object.assign(g, { inning: 7, top: true, balls: 0, strikes: 0 });
    expect(lateOrders(g, late)).toEqual({ changePitcher: 'p3' });
    g.top = false;
    expect(lateOrders(g, late)).toBe(null); // 우리 공격
    Object.assign(g, { inning: 9, top: true });
    g.home.pitcherIdx = 5; g.home.pitcher = g.home.team.pitchers[5];
    expect(lateOrders(g, late)).toBe(null); // 이미 마운드
    g.home.pitcherIdx = 4; g.home.pitcher = g.home.team.pitchers[4];
    expect(lateOrders(g, ['p3', 'p4', 'p3'])).toBe(null); // 앞서 쓴 투수
  });
});

describe('이닝별 계획', () => {
  it('공격은 회마다 성향, 선발은 끊는 기준에서 교체, 그 뒤 회마다 정한 불펜', async () => {
    const { innOrders } = await import('../src/engine/tactics.js');
    const g = createGame({ home: team('H'), away: team('A'), rng: () => 0.5 });
    const inn = { atk: ['base', 'base', 'base', 'base', 'power', 'power', 'contact', 'patience', 'base'], limit: { mode: 'inn', value: 5 }, pens: { 6: 'p4', 7: 'p3' } };
    Object.assign(g, { inning: 5, top: false });
    expect(innOrders(g, inn)).toEqual({ approach: 'power' });
    Object.assign(g, { inning: 8 });
    expect(innOrders(g, inn)).toEqual({ patience: 1 });
    Object.assign(g, { inning: 5, top: true, balls: 0, strikes: 0 });
    expect(innOrders(g, inn)).toEqual({}); // 5회까지는 선발
    g.inning = 6;
    expect(innOrders(g, inn)).toEqual({ changePitcher: 'p4' }); // 6회 첫 타석 — 정해 둔 불펜
    g.home.pitcherIdx = 4; g.home.pitcher = g.home.team.pitchers[4];
    expect(innOrders(g, inn)).toEqual({}); // 이미 마운드
    g.inning = 7;
    expect(innOrders(g, inn)).toEqual({}); // p3 은 앞서 지나간 투수 — 다시 못 부름
    g.home.pitcherIdx = 0; g.home.pitcher = g.home.team.pitchers[0]; g.inning = 3; g.home.pitches = 90;
    expect(innOrders(g, { limit: { mode: 'pitch', value: 85 } })).toEqual({ changePitcher: true }); // 투구 수
    g.home.pitches = 40; g.home.bf = 18;
    expect(innOrders(g, { limit: { mode: 'bf', value: 18 } })).toEqual({ changePitcher: true }); // 타자 수
  });
  it('공격 높이 사이 값 — 타석마다 비율대로 섞음', async () => {
    const { atkAt } = await import('../src/engine/tactics.js');
    expect(atkAt(0, 0.9)).toBe('power');
    expect(atkAt('contact', 0.5)).toBe('contact'); // 예전 이름
    const n = Array.from({ length: 100 }, (_, i) => atkAt(2.3, (i * 0.6180339887) % 1)).filter((x) => x === 'patience').length;
    expect(n).toBeGreaterThanOrEqual(28); expect(n).toBeLessThanOrEqual(32); // 기다리기 30%
  });
  it('3단계 세분화 — 도루 문턱 · 맞혀 잡기 교타자만 · 초반만', async () => {
    const { condOrders } = await import('../src/engine/tactics.js');
    const g = createGame({ home: team('H'), away: team('A'), rng: () => 0.1 });
    const runner = { id: 'r', stats: { speed: 86 } };
    Object.assign(g, { top: false, balls: 0, strikes: 0, bases: [runner, null, null] });
    expect(condOrders(g, ['steal85'])).toEqual({ steal: 0 });
    expect(condOrders(g, ['steal90'])).toBeNull(); // 주력 86 — 90 문턱 아래
    Object.assign(g, { top: true, inning: 2, bases: [null, null, null] });
    expect(condOrders(g, ['pitchZoneE'])?.zone).toBeTypeOf('number');
    g.inning = 5;
    expect(condOrders(g, ['pitchZoneE'])).toBeNull(); // 초반만 — 4회부터 안 씀
  });
  it('아웃 단위 교체 지점 — 8회 1아웃부터 마무리', async () => {
    const { innOrders } = await import('../src/engine/tactics.js');
    const g = createGame({ home: team('H'), away: team('A'), rng: () => 0.5 });
    const inn = { limit: { mode: 'inn', value: 6 }, slots: [[0, 'p2'], [22, 'p5']] };
    g.home.pitcherIdx = 2; g.home.pitcher = g.home.team.pitchers[2];
    Object.assign(g, { inning: 8, top: true, balls: 0, strikes: 0, outs: 0 });
    expect(innOrders(g, inn)).toEqual({}); // 8회 무사 — 계투 그대로
    g.outs = 1;
    expect(innOrders(g, inn)).toEqual({ changePitcher: 'p5' }); // 1아웃 뒤 첫 타석
    g.home.pitcherIdx = 0; g.home.pitcher = g.home.team.pitchers[0]; Object.assign(g, { inning: 7, outs: 0 });
    expect(innOrders(g, inn)).toEqual({ changePitcher: 'p2' }); // 선발 6회까지 — 7회 첫 타석에 첫 계투
  });
  it('체력이 바닥나면 계획표 투수로 — 팀 순서상 다음(마무리일 수도)이 아니라', async () => {
    const { innOrders } = await import('../src/engine/tactics.js');
    const g = createGame({ home: team('H'), away: team('A'), rng: () => 0.5 });
    const inn = { limit: { mode: 'pitch', value: 95 }, slots: [[0, 'p2'], [22, 'p5']] };
    Object.assign(g, { inning: 5, top: true, balls: 0, strikes: 0, outs: 1 });
    g.home.pitches = 80; // 체력 70 선발 = 75구
    expect(innOrders(g, inn)).toEqual({ changePitcher: 'p2' });
    g.home.pitcherIdx = 2; g.home.pitcher = g.home.team.pitchers[2]; g.home.pitches = 31; g.inning = 7; // 구원 75 − 45 = 30구
    expect(innOrders(g, inn)).toEqual({ changePitcher: 'p3' }); // 계획에 없는 투수 먼저 — 마무리(p5)는 아낌
  });
  it('감독이 직접 부른 불펜은 계획표가 도로 바꾸지 않음 — 칸이 바뀔 때만', async () => {
    const { innOrders } = await import('../src/engine/tactics.js');
    const g = createGame({ home: team('H'), away: team('A'), rng: () => 0.5 });
    const inn = { limit: { mode: 'pitch', value: 95 }, slots: [[0, 'p2'], [22, 'p5']] };
    g.home.pitcherIdx = 1; g.home.pitcher = g.home.team.pitchers[1]; g.home.pitches = 3; // 3회에 감독이 p1 을 부름(계획표 첫 칸 p2 는 아직 남음 — 예전엔 여기서 p2 로 도로 바꿈)
    Object.assign(g, { inning: 3, top: true, balls: 0, strikes: 0, outs: 1 });
    expect(innOrders(g, inn)).toEqual({});
    Object.assign(g, { inning: 8, outs: 1 }); // 8회 1아웃 — 마무리 칸
    expect(innOrders(g, inn)).toEqual({ changePitcher: 'p5' });
  });
  it('상황 대응 지친 선발 교체도 계획표 투수로', async () => {
    const { planOrders } = await import('../src/engine/tactics.js');
    const g = createGame({ home: team('H'), away: team('A'), rng: () => 0.5 });
    const inn = { limit: { mode: 'pitch', value: 95 }, slots: [[0, 'p2'], [22, 'p5']] };
    Object.assign(g, { inning: 5, top: true, balls: 0, strikes: 0, outs: 1, bases: [{ id: 'x' }, null, null] });
    g.home.pitches = 55; // 75구 중 55 — 남은 체력 27%
    expect(planOrders(g, { inn, conds: ['tired'] }).changePitcher).toBe('p2');
  });
});
