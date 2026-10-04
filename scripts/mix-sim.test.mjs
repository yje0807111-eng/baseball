/*
 * 볼 배합 시뮬(정비 2단계 도구 띠) — 섞기 · 직구 · 휘는 공 · 떨어지는 공이 '상대 타선의 약한 계열'에 따라 갈리나
 *  같은 대진 · 같은 시드끼리 견준다(우리 = 홈, 정비 판 기본 설계). 상대 타선 계열 = 타자마다 약함 −1 · 강함 +1 을 더한 값
 *  '타선 맞춤' = 상대 타선이 가장 약한 계열(약함 − 강함이 가장 큰) — 정보가 보이면 고를 답
 * 무거워서 평소엔 건너뛴다: MX=200 npx vitest run scripts/mix-sim.test.mjs → _mix.json
 */
import { test } from 'vitest';
import { writeFileSync } from 'fs';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/play/matchKit.jsx';
import { createGame, pitch, aiPitchingChange, aiRunOrders, batterFam, pitchMix, PITCHES } from '../src/engine/pitchSim.js';
import { planOrders, starsOf } from '../src/engine/tactics.js';
import { planOfSides, DEFAULT_SIDES } from '../src/myteam/strategy.js';
import { seeded } from '../src/myteam/tournament.js';

const FAMS = ['F', 'B', 'O'];
const planOf = (mix) => {
  const p = planOfSides({ ...DEFAULT_SIDES, mound: 'long', mix }, ['close'], { inn: { atk: Array(9).fill(1), limit: { mode: 'pitch', value: 95 } } });
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
  return { w: g.home.runs > g.away.runs ? 1 : g.home.runs < g.away.runs ? 0 : 0.5, ra: g.away.runs };
}

const N = Number(process.env.MX || 0), G = Number(process.env.MXG || 40);
test.skipIf(!N)('mix sim', () => {
  const rows = [];
  for (let i = 0; i < N; i += 1) {
    const r = seeded(i + 8181);
    const myT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r), opT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r);
    const mine = engineTeam(myT), away = engineTeam(opT);
    /* 상대 타선 계열 — 약한 타자 수 − 강한 타자 수 */
    const weak = Object.fromEntries(FAMS.map((f) => [f, away.batters.reduce((n, b) => { const x = batterFam(b); return n + (x.weak === f ? 1 : 0) - (x.strong === f ? 1 : 0); }, 0)]));
    /* 우리 선발이 그 계열을 평소 얼마나 던지나 */
    const mix = pitchMix(mine.pitchers[0]);
    const share = Object.fromEntries(FAMS.map((f) => [f, Object.entries(mix).reduce((n, [t, v]) => n + (PITCHES[t]?.fam === f ? v : 0), 0)]));
    const res = {};
    for (const m of ['mix', ...FAMS]) {
      let w = 0, ra = 0;
      for (let k = 0; k < G; k += 1) { const x = play(engineTeam(myT), engineTeam(opT), i * 1000 + k + 70000, planOf(m)); w += x.w; ra += x.ra; }
      res[m] = { w: w / G, ra: ra / G };
    }
    rows.push({ weak, share, res });
  }
  writeFileSync('_mix.json', JSON.stringify(rows));
}, 7_200_000);
