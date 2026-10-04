/*
 * 3단계 세분화 시뮬(2026-10-04) — 효과가 확인된 셋(득점권 타격 · 도루 · 맞혀 잡기)을 '언제 · 누구에게'로 나눴을 때 칸마다 정답이 갈리나
 *  타자: 득점권을 아웃(무사·1사 / 2사) · 점수(앞섬 / 동점·뒤짐)로 나눠 그 칸에만 홈런 · 안타 · 출루 우선
 *  주자: 도루 문턱 80 · 85 · 90 / 7회 이후 2점 차 안이면 안 뜀
 *  투수: 맞혀 잡기를 상대 타자 유형(파워 80+ / 아래) · 회 구간(1~3 · 4~6 · 7~9)으로 나눠
 *  기준 = 정비 판 기본(상황 대응 없음 · 지친 선발 교체만). 같은 대진 · 같은 시드끼리
 * 무거워서 평소엔 건너뛴다: S2=1500 S2G=12 npx vitest run scripts/sit2-sim.test.mjs → _sit2.json
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
const fresh2 = fresh;
const diff = (g) => g.home.runs - g.away.runs;
const rispAny = (g) => g.bases[1] || g.bases[2];
const APPR = { pow: { approach: 'power' }, con: { approach: 'contact' }, pat: { patience: 1 } };
const SLICE = { o01: (g) => g.outs < 2, o2: (g) => g.outs === 2, lead: (g) => diff(g) > 0, tieb: (g) => diff(g) <= 0 };
const EXTRA = {};
for (const [sk, sf] of Object.entries(SLICE)) for (const [ak, ao] of Object.entries(APPR)) EXTRA['bat_' + sk + '_' + ak] = (g) => (!g.top && rispAny(g) && sf(g) ? ao : null);
for (const t of [80, 85, 90]) EXTRA['steal' + t] = (g) => (!g.top && fresh2(g) && g.bases[0] && !g.bases[1] && st(g.bases[0], 'speed') >= t ? { steal: 0 } : null);
EXTRA.stealSafe = (g) => (!g.top && fresh2(g) && g.bases[0] && !g.bases[1] && st(g.bases[0], 'speed') >= 80 && !(g.inning >= 7 && Math.abs(diff(g)) <= 2) ? { steal: 0 } : null);
const zoneIn = (g) => (g.rng() < 0.35 ? { zone: [4, 1, 3, 5, 7][Math.floor(g.rng() * 5)] } : null);
EXTRA.zonePow = (g) => (g.top && st(batterOf(g), 'power') >= 80 ? zoneIn(g) : null);
EXTRA.zoneCon = (g) => (g.top && st(batterOf(g), 'power') < 80 ? zoneIn(g) : null);
EXTRA.zoneE = (g) => (g.top && g.inning <= 3 ? zoneIn(g) : null);
EXTRA.zoneM = (g) => (g.top && g.inning >= 4 && g.inning <= 6 ? zoneIn(g) : null);
EXTRA.zoneL = (g) => (g.top && g.inning >= 7 ? zoneIn(g) : null);
EXTRA.zoneAll = (g) => (g.top ? zoneIn(g) : null);
const planOf = (home, conds = ['tired']) => {
  const pens = home.pitchers.slice(1), top3 = [...pens].sort((a, b) => arm(b) - arm(a)).slice(0, 3);
  const rel = { mid: [top3[1]?.id].filter(Boolean), close: top3[0]?.id };
  const p = planOfSides({ ...DEFAULT_SIDES, mound: 'long', mix: 'mix' }, conds, { inn: { atk: Array(9).fill(1), limit: LIMIT, slots: moundPlan(rel, exitOf(LIMIT)).slots, rel } });
  Object.assign(p.fine, { swing: '보통', take: '보통' }); delete p.fine.appr;
  return p;
};
function play(home, away, seed, cfg, ctx) {
  const g = createGame({ home, away, rng: seeded(seed) });
  const plan = planOf(home, [...(cfg.conds || []), 'tired']);
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

const N = Number(process.env.S2 || 0), G = Number(process.env.S2G || 4);
test.skipIf(!N)('sit2 sim', () => {
  const configs = [['기준', {}], ...Object.keys(EXTRA).map((k) => [k, { extra: k }])];
  const only = process.env.S2C?.split(',');
  if (only) configs.splice(1, configs.length, ...configs.slice(1).filter(([k]) => only.includes(k)));
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
      oppPow: away.batters.reduce((n, b) => n + st(b, 'power'), 0) / 9, oppSpeed: away.batters.reduce((n, b) => n + st(b, 'speed'), 0) / 9,
      mySpCtl: st(mine.pitchers[0], 'control', 75), mySpStuff: st(mine.pitchers[0], 'stuff', 80),
      oppSpStuff: st(away.pitchers[0], 'stuff', 80), oppSpCtl: st(away.pitchers[0], 'control', 75),
      myPow: mine.batters.reduce((n, b) => n + st(b, 'power'), 0) / 9, mySpeedAvg: mine.batters.reduce((n, b) => n + st(b, 'speed'), 0) / 9,
      oppDef: away.batters.reduce((n, b) => n + st(b, 'defense'), 0) / 9, oppContact: away.batters.reduce((n, b) => n + st(b, 'contact'), 0) / 9,
      starContact: top3.reduce((n, b) => n + st(b, 'contact'), 0) / 3,
      myGap: (myPens[0] ?? 0) - arm(mine.pitchers[0]), mySpStam: st(mine.pitchers[0], 'stamina', 90),
      res,
    });
  }
  writeFileSync('_sit2.json', JSON.stringify(rows));
}, 7_200_000);
