/*
 * 정비 3단계 다시 짜기 시뮬(2026-10-04) — 2단계 이닝 계획(마운드 줄 · 공격 그래프)을 켠 지금 엔진에서 상황 대응 하나씩 더해 보기
 *  기준 = 정비 판 기본(공격 모두 기본 스윙 · 선발 95구 · 계투 1 + 마무리, 상황 대응 없음). AI 공격 도루는 엔진(aiRunOrders) 그대로
 *  센 불펜(close) · 지친 선발 교체(tired) — 2단계 마운드 줄과 겹치는 둘: 빼도 손해가 없나
 *  외야 후진 · 견제 · 유인구 · 거르기 · 도루 · 히트앤런 · 풀스윙 · 대타 — 상대(또는 우리)에 따라 갈리나
 *  같은 대진 · 같은 시드끼리 견준다(대진마다 G판)
 * 무거워서 평소엔 건너뛴다: SI=1500 SIG=4 npx vitest run scripts/sit-sim.test.mjs → _sit.json
 */
import { test } from 'vitest';
import { writeFileSync } from 'fs';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/play/matchKit.jsx';
import { createGame, pitch, aiPitchingChange, aiRunOrders, batterOf } from '../src/engine/pitchSim.js';
import { planOrders, starsOf } from '../src/engine/tactics.js';
import { planOfSides, DEFAULT_SIDES } from '../src/myteam/strategy.js';
import { seeded } from '../src/myteam/tournament.js';
import { moundPlan, exitOf } from '../src/myteam/FlowBoard.jsx';

const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => (st(p, 'stuff', 80) + st(p, 'control', 75)) / 2;
const bat = (b) => (st(b, 'contact') + st(b, 'power')) / 2;
const fresh = (g) => !g.balls && !g.strikes;
const lead = (g) => g.home.runs - g.away.runs;
const risp = (g) => !g.bases[0] && (g.bases[1] || g.bases[2]);
const LIMIT = { mode: 'pitch', value: 95 };

/* 엔진 조건(close · tired · chase · walk · hnr · swing)은 plan.conds 로, 엔진에 없는 셋은 여기서 */
const EXTRA = {
  deep: (g, c) => (g.top && c.stars.has(batterOf(g)?.id) ? { guard: -1 } : null),
  hold: (g) => (g.top && g.bases[0] && !g.bases[1] && st(g.bases[0], 'speed') >= 85 ? { hold: 1 } : null),
  steal: (g) => (!g.top && fresh(g) && g.bases[0] && !g.bases[1] && st(g.bases[0], 'speed') >= 80 ? { steal: 0 } : null),
  ph: (g) => {
    if (g.top || !fresh(g) || g.inning < 8 || lead(g) >= 0 || lead(g) < -2) return null;
    const b = batterOf(g), sub = (g.home.team.bench || []).filter((p) => bat(p) > bat(b) + 2).sort((x, y) => bat(y) - bat(x))[0];
    return sub ? { pinchHit: sub.id } : null;
  },
};
const planOf = (home, conds) => {
  const pens = home.pitchers.slice(1), top3 = [...pens].sort((a, b) => arm(b) - arm(a)).slice(0, 3);
  const rel = { mid: [top3[1]?.id].filter(Boolean), close: top3[0]?.id };
  const p = planOfSides({ ...DEFAULT_SIDES, mound: 'long', mix: 'mix' }, conds, { inn: { atk: Array(9).fill(1), limit: LIMIT, slots: moundPlan(rel, exitOf(LIMIT)).slots, rel } });
  Object.assign(p.fine, { swing: '보통', take: '보통' }); delete p.fine.appr;
  return p;
};
function play(home, away, seed, cfg, ctx) {
  const g = createGame({ home, away, rng: seeded(seed) });
  const plan = planOf(home, cfg.conds || []);
  let guard = 0;
  while (!g.final && guard++ < 1500) {
    let o = planOrders(g, plan, ctx);
    if (!g.top) { const ch = aiPitchingChange(g, g.away); if (ch) o = { ...o, changePitcher: ch }; }
    else { const run = aiRunOrders(g); if (run) o = { ...o, ...run }; }
    if (cfg.extra) { const x = EXTRA[cfg.extra](g, ctx); if (x) o = { ...o, ...x }; }
    pitch(g, o);
  }
  return { w: g.home.runs > g.away.runs ? 1 : g.home.runs < g.away.runs ? 0 : 0.5, rf: g.home.runs, ra: g.away.runs };
}

const N = Number(process.env.SI || 0), G = Number(process.env.SIG || 4);
test.skipIf(!N)('sit sim', () => {
  const configs = [['기준', {}], ['센 불펜', { conds: ['close'] }], ['지친 선발 교체', { conds: ['tired'] }],
    ['외야 후진', { extra: 'deep' }], ['견제', { extra: 'hold' }], ['유인구', { conds: ['chase'] }], ['거르기', { conds: ['walk'] }],
    ['도루', { extra: 'steal' }], ['히트앤런', { conds: ['hnr'] }], ['풀스윙', { conds: ['swing'] }], ['대타', { extra: 'ph' }]];
  const rows = [];
  for (let i = 0; i < N; i += 1) {
    const r = seeded(i + 9191);
    const myT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r), opT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r);
    const away = engineTeam(opT), mine = engineTeam(myT);
    const ctx = { stars: starsOf(away) };
    const res = {};
    for (const [name, cfg] of configs) {
      let w = 0, rf = 0, ra = 0;
      for (let k = 0; k < G; k += 1) { const x = play(engineTeam(myT), engineTeam(opT), i * 100 + k + 120000, cfg, ctx); w += x.w; rf += x.rf; ra += x.ra; }
      res[name] = { w: w / G, rf: rf / G, ra: ra / G };
    }
    const top3 = [...away.batters].filter((b) => ctx.stars.has(b.id));
    const next = top3.map((p) => away.batters[(away.batters.indexOf(p) + 1) % 9]);
    const opPens = away.pitchers.slice(1).filter((p) => p.position !== 'SP').sort((a, b) => arm(b) - arm(a));
    const myPens = mine.pitchers.slice(1).map(arm).sort((a, b) => b - a);
    rows.push({
      powGap: top3.reduce((n, b) => n + st(b, 'power'), 0) / 3 - st(mine.pitchers[0], 'stuff', 80), // 장타 위험(경보와 같은 셈)
      fastN: away.batters.filter((b) => st(b, 'speed') >= 85).length,
      nextBat: next.reduce((n, b) => n + bat(b), 0) / 3, myOff: mine.batters.reduce((n, b) => n + bat(b), 0) / 9,
      oppCatDef: st(away.catcher, 'defense', 85), mySpeed: Math.max(...mine.batters.map((b) => st(b, 'speed'))),
      myContact: mine.batters.reduce((n, b) => n + st(b, 'contact'), 0) / 9,
      closer: st(opPens[0], 'stuff', 80), myBench: (mine.bench || []).reduce((m, b) => Math.max(m, bat(b)), 0) - mine.batters.reduce((n, b) => n + bat(b), 0) / 9,
      stealRisk: (() => { const fast = [...away.batters].sort((a, b) => st(b, 'speed') - st(a, 'speed'))[0], cat = mine.catcher || mine.batters.find((b) => b.position === 'C'); return 0.52 + (st(fast, 'speed') - 75) * 0.02 - (st(cat, 'defense', 85) - 85) * 0.025 - (st(mine.pitchers[0], 'stability', 81) - 81) * 0.008; })(), // 도루 위험(경보와 같은 셈)
      starContact: top3.reduce((n, b) => n + st(b, 'contact'), 0) / 3,
      myGap: (myPens[0] ?? 0) - arm(mine.pitchers[0]), mySpStam: st(mine.pitchers[0], 'stamina', 90),
      res,
    });
  }
  writeFileSync('_sit.json', JSON.stringify(rows));
}, 7_200_000);
