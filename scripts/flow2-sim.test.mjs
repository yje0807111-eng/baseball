/*
 * 정비 2단계 시뮬(ROADMAP 13) — 2단계에서 고를 것이 '상대에 따라' 정답이 바뀌나. 같은 시드끼리 견준다(우리 = 홈, 상대 = AI 시리즈 팀).
 *  공격 힘 초반 · 중반 · 후반 — 그 세 이닝 우리 타석은 강공(approach 'power': 파워 − 상대 구위만큼 이득이 갈림)
 *  교체 두 바퀴 · 빠른 계투       — 우리 선발 18타자 / 위기면 바로(hook 빠르게)
 *  도루 적극                      — 1루 주자 주력 80+ · 2루 빔 · 새 타석이면 도루(성공률에 상대 포수 수비)
 *  기다리기 · 짧게 치기           — 공격 성향(off: onbase · contact) — 상대 투수 제구 · 구위에 따라 갈리나
 * 무거워서 평소엔 건너뛴다: F2=5000 npx vitest run scripts/flow2-sim.test.mjs → _flow2.json
 */
import { test } from 'vitest';
import { writeFileSync } from 'fs';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/play/matchKit.jsx';
import { createGame, pitch, aiPitchingChange } from '../src/engine/pitchSim.js';
import { tacticOrders } from '../src/engine/tactics.js';
import { planOfSides, DEFAULT_SIDES } from '../src/myteam/strategy.js';
import { seeded } from '../src/myteam/tournament.js';

const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const PHASE = { 초반: [1, 3], 중반: [4, 6], 후반: [7, 9] };
const fresh = (g) => !g.balls && !g.strikes;

function play(home, away, seed, cfg) {
  const g = createGame({ home, away, rng: seeded(seed) });
  const ph = [0, 0, 0]; // 우리 득점 — 초반 · 중반 · 후반(그 묶음에 힘을 주면 그 묶음 득점으로 잡음 적게 잰다)
  const fine = planOfSides({ ...DEFAULT_SIDES, ...(cfg.sides || {}) }).fine;
  let guard = 0;
  while (!g.final && guard++ < 1500) {
    let o = tacticOrders(fine, !g.top, g.rng);
    if (!g.top) { const ch = aiPitchingChange(g, g.away); if (ch) o = { ...o, changePitcher: ch }; }
    if (cfg.phase && !g.top) { const [a, b] = PHASE[cfg.phase]; if (g.inning >= a && Math.min(g.inning, 9) <= b) o = { ...o, approach: 'power' }; }
    if (cfg.steal && !g.top && fresh(g) && g.bases[0] && !g.bases[1] && st(g.bases[0], 'speed') >= 80) o = { ...o, steal: 0 };
    const before = g.home.runs, inn = g.inning, bot = !g.top;
    pitch(g, o);
    if (bot) ph[inn <= 3 ? 0 : inn <= 6 ? 1 : 2] += g.home.runs - before;
  }
  return { w: g.home.runs > g.away.runs ? 1 : g.home.runs < g.away.runs ? 0 : 0.5, ph };
}

const N = Number(process.env.F2 || 0);
test.skipIf(!N)('flow2 sim', () => {
  const configs = [['기준', {}], ['공격 힘:초반', { phase: '초반' }], ['공격 힘:중반', { phase: '중반' }], ['공격 힘:후반', { phase: '후반' }],
    ['교체:두 바퀴', { sides: { mound: 'two' } }], ['교체:빠른 계투', { sides: { mound: 'quick' } }], ['도루 적극', { steal: true }],
    ['타격:기다리기', { sides: { off: 'onbase' } }], ['타격:짧게 치기', { sides: { off: 'contact' } }]];
  const only = process.env.F2C?.split(','); // 고를 묶음만(빠른 되풀이용) — 기준은 늘
  if (only) configs.splice(1, configs.length, ...configs.slice(1).filter(([k]) => only.some((o) => k.includes(o))));
  const rows = [];
  for (let i = 0; i < N; i += 1) {
    const r = seeded(i + 5151);
    const myT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r), opT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r);
    const away = engineTeam(opT), mine = engineTeam(myT);
    const res = {};
    const runs = {};
    for (const [name, cfg] of configs) { const x = play(engineTeam(myT), engineTeam(opT), i + 52000, cfg); res[name] = x.w; runs[name] = x.ph; }
    const armOf = (p) => (st(p, 'stuff', 80) + st(p, 'control', 75)) / 2;
    const pen = away.pitchers.slice(1);
    const bats = (t) => t.batters.map((b) => (st(b, 'contact') + st(b, 'power')) / 2);
    const myPen = mine.pitchers.slice(1).map(armOf).sort((a, b) => b - a);
    rows.push({
      oppSpStuff: st(away.pitchers[0], 'stuff', 80), oppSpCtl: st(away.pitchers[0], 'control', 75), oppSpStam: st(away.pitchers[0], 'stamina', 90),
      oppPenStuff: pen.reduce((n, p) => n + st(p, 'stuff', 80), 0) / Math.max(1, pen.length),
      oppCatDef: st(away.catcher, 'defense', 75), oppBat: bats(away).reduce((a, b) => a + b, 0) / 9, oppTop: bats(away).slice(0, 4).reduce((a, b) => a + b, 0) / 4,
      myPow: mine.batters.reduce((n, b) => n + st(b, 'power'), 0) / 9, mySpeed: mine.batters.reduce((n, b) => n + st(b, 'speed'), 0) / 9,
      myGap: (myPen[0] ?? 0) - armOf(mine.pitchers[0]), res, runs,
    });
  }
  writeFileSync('_flow2.json', JSON.stringify(rows));
}, 7_200_000);
