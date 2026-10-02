/* 선택 경기 — 멈추는 자리 수(한 경기 약 10번 · 7회 이후 몫) · 카드 · 타석 계획 */
import { test, expect } from 'vitest';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/play/matchKit.jsx';
import { createGame, pitch, aiPitchingChange, defenseOf, weatherOf } from '../src/engine/pitchSim.js';
import { seeded } from '../src/myteam/tournament.js';
import { winProb } from '../src/engine/winProb.js';
import { wantsChoice, choiceCards, planOrder, CHOICES, CHOICE_LATE } from '../src/play/choice.js';

const games = (n, fn) => {
  for (let i = 0; i < n; i += 1) {
    const r = seeded(i + 31);
    const g = createGame({ home: engineTeam(seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r)), away: engineTeam(seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r)), rng: seeded(i + 700), weather: weatherOf(r) });
    fn(g, i);
  }
};

test('한 경기 결정 — 팽팽한 경기는 9~10번 · 넘지 않음 · 7회 이후 몫 · 기운 경기는 줄고 기운 뒤엔 안 묻는다', () => {
  const counts = [], late = [], close = [], decidedAsk = [];
  games(80, (g) => {
    const asked = [];
    let guard = 0;
    while (!g.final && guard++ < 1500) {
      if (wantsChoice(g, asked)) { asked.push({ inning: g.inning, top: g.top }); const wp = winProb(g); if (wp < 0.06 || wp > 0.94) decidedAsk.push(wp); }
      const ch = aiPitchingChange(g, defenseOf(g));
      pitch(g, ch ? { changePitcher: ch } : {});
    }
    counts.push(asked.length); late.push(asked.filter((a) => a.inning >= 7).length);
    if (Math.abs(g.home.runs - g.away.runs) <= 2) close.push(asked.length);
  });
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const closeMean = close.reduce((a, b) => a + b, 0) / close.length;
  console.log('결정 수', { mean, closeMean, min: Math.min(...counts), max: Math.max(...counts), late: late.reduce((a, b) => a + b, 0) / late.length });
  expect(closeMean).toBeGreaterThan(8.5);
  expect(mean).toBeLessThan(closeMean);
  expect(decidedAsk).toEqual([]);
  expect(Math.max(...counts)).toBeLessThanOrEqual(CHOICES);
  expect(late.reduce((a, b) => a + b, 0) / late.length).toBeGreaterThanOrEqual(CHOICE_LATE - 1.5);
});

test('카드 — 정비 작전이 맨 앞 · 넷까지 · 숫자 · 대가', () => {
  let ms = 0, calls = 0;
  games(4, (g) => {
    let guard = 0;
    while (!g.final && guard++ < 400) {
      if (!g.balls && !g.strikes && g.bases.some(Boolean) && guard % 3 === 0) {
        const t0 = performance.now(); choiceCards(g, {}); ms += performance.now() - t0; calls += 1;
        const cards = choiceCards(g, {});
        expect(cards[0].plan).toBe(true);
        expect(cards.length).toBeGreaterThanOrEqual(3);
        expect(cards.length).toBeLessThanOrEqual(4);
        for (const c of cards) { expect(c.odds?.[1]).toBeTruthy(); if (!c.plan) expect(c.cost).toBeTruthy(); }
        expect(new Set(cards.map((c) => c.k)).size).toBe(cards.length);
      }
      pitch(g, {});
    }
  });
  console.log('카드 만들기', (ms / calls).toFixed(1), 'ms');
  expect(ms / calls).toBeLessThan(120);
}, 60000);

test('타석 계획 — 공격 노림은 유리한 카운트에만 · 2S 는 맞히기 / 수비 결정구는 2S 에 반드시', () => {
  const bat = planOrder({ detail: 'bat', order: () => ({}) }, { t: 'fork', zone: 7 });
  expect(bat({ balls: 1, strikes: 0 })).toEqual({ guess: 'fork', aim: 7 });
  expect(bat({ balls: 0, strikes: 1 })).toEqual({});
  expect(bat({ balls: 1, strikes: 2 })).toEqual({ approach: 'contact' });
  const arm = planOrder({ detail: 'arm', order: () => ({}) }, { t: 'slider', zone: 8 });
  expect(arm({ balls: 0, strikes: 2, rng: () => 0.9 })).toEqual({ pitchType: 'slider', zone: 8, exact: true });
  expect(arm({ balls: 0, strikes: 0, rng: () => 0.9 })).toEqual({});
  expect(arm({ balls: 0, strikes: 0, rng: () => 0.1 })).toEqual({ pitchType: 'slider' });
});

test('불펜 카드의 대가 — 어제 던진 투수(연투)는 내일 컨디션 70', () => {
  let seen = 0;
  games(30, (g) => {
    let guard = 0;
    while (!g.final && guard++ < 400 && !seen) {
      if (g.top && !g.balls && !g.strikes && g.inning >= 6) {
        const pen = g.home.team.pitchers.slice(g.home.pitcherIdx + 1);
        const fatigue = Object.fromEntries(pen.map((p) => [p.id, { rest: 0, streak: 1 }]));
        const cards = choiceCards(g, { fatigue }).filter((c) => c.k.startsWith('pen-'));
        if (cards.length) { seen += 1; for (const c of cards) expect(c.cost).toContain('내일 컨디션 70'); expect(choiceCards(g, {}).find((c) => c.k.startsWith('pen-')).cost).toContain('내일 컨디션 85'); }
      }
      pitch(g, {});
    }
  });
  expect(seen).toBeGreaterThan(0);
}, 60000);
