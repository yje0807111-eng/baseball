/*
 * 공격 스타일 시뮬(정비 2단계 그래프 아래 단추) — 스타일마다 '보통'과 견준 승률 · 득점, 상대 선발 제구 · 구위에 따라 갈리나
 *  같은 대진 · 같은 시드끼리 견준다(우리 = 홈). 선발 95구 · 위기 교체 늦게 · 상황 대응 센 불펜 — 정비 판 기본과 같게
 *  '상대 흐름 따라'는 그 대진 미리보기(30판) 상대 마운드로 만든다 — 정비 판과 같은 셈
 * 무거워서 평소엔 건너뛴다: ST=120 npx vitest run scripts/style-sim.test.mjs → _style.json
 */
import { test } from 'vitest';
import { writeFileSync } from 'fs';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/play/matchKit.jsx';
import { createGame, pitch, aiPitchingChange, aiRunOrders } from '../src/engine/pitchSim.js';
import { planOrders, starsOf } from '../src/engine/tactics.js';
import { planOfSides, DEFAULT_SIDES } from '../src/myteam/strategy.js';
import { planRun, planSummary } from '../src/myteam/planSim.js';
import { seeded } from '../src/myteam/tournament.js';
import { ATK_STYLES } from '../src/myteam/FlowBoard.jsx';

const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const planOf = (atk) => {
  const p = planOfSides({ ...DEFAULT_SIDES, mound: 'long' }, ['close'], { inn: { atk, limit: { mode: 'pitch', value: 95 } } });
  Object.assign(p.fine, { swing: '보통', take: '보통' }); delete p.fine.appr;
  return p;
};
function play(home, away, seed, plan) {
  const g = createGame({ home, away, rng: seeded(seed) });
  const stars = starsOf(away);
  let guard = 0;
  while (!g.final && guard++ < 1500) {
    let o = planOrders(g, plan, { stars });
    if (!g.top) { const ch = aiPitchingChange(g, g.away); if (ch) o = { ...o, changePitcher: ch }; }
    else { const run = aiRunOrders(g); if (run) o = { ...o, ...run }; }
    pitch(g, o);
  }
  return { w: g.home.runs > g.away.runs ? 1 : g.home.runs < g.away.runs ? 0 : 0.5, r: g.home.runs };
}

const N = Number(process.env.ST || 0), G = Number(process.env.STG || 30);
test.skipIf(!N)('style sim', () => {
  const rows = [];
  for (let i = 0; i < N; i += 1) {
    const r = seeded(i + 7171);
    const myT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r), opT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r);
    const mine = engineTeam(myT), away = engineTeam(opT);
    const pv = planSummary(planRun(mine, away, planOf(Array(9).fill(1)), 0, 30));
    const known = pv.oppMound.filter((v) => v != null), avg = known.reduce((a, b) => a + b, 0) / known.length;
    const lo = Math.min(...known), hi = Math.max(...known);
    const opp = pv.oppMound.map((v) => ((v ?? avg) - lo) / (hi - lo || 1));
    const res = {};
    for (const [ko, make] of [...ATK_STYLES, ['모두 기다리기', () => Array(9).fill(3)]]) { // 모두 기다리기 — 기다리기만 따로 재려고(단추엔 없음)
      let w = 0, runs = 0;
      for (let k = 0; k < G; k += 1) { const x = play(engineTeam(myT), engineTeam(opT), i * 1000 + k + 90000, planOf(make(opp))); w += x.w; runs += x.r; }
      res[ko] = { w: w / G, r: runs / G };
    }
    rows.push({ ctl: st(away.pitchers[0], 'control', 75), stuff: st(away.pitchers[0], 'stuff', 80), res });
  }
  writeFileSync('_style.json', JSON.stringify(rows));
}, 7_200_000);
