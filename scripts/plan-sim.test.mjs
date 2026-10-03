/*
 * 경기 전 설계 시뮬(ROADMAP 12) — 정비에서 고른 설계(공격 · 마운드 · 수비 갈래 + 조건 지시)가 승률을 얼마나 바꾸나,
 * 상대(스카우팅 약점)에 따라 최선이 바뀌나. 같은 시드끼리 견준다(우리 = 홈, 상대 = AI 시리즈 팀).
 * 무거워서 평소엔 건너뛴다: PG=1500 npx vitest run scripts/plan-sim.test.mjs → _plan.json
 */
import { test } from 'vitest';
import { writeFileSync } from 'fs';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/play/matchKit.jsx';
import { createGame, pitch, aiPitchingChange, defenseOf, offenseOf, batterOf, penCallsLeft } from '../src/engine/pitchSim.js';
import { tacticOrders } from '../src/engine/tactics.js';
import { SIDES, DEFAULT_SIDES, planOfSides, scoutTags } from '../src/myteam/strategy.js';
import { seeded } from '../src/myteam/tournament.js';

const st = (p, k, d = 70) => p?.stats?.[k] ?? d;
/* 조건 지시 — 정비에서 미리 걸어 두면 그 상황에 경기가 알아서 */
const COND = {
  /* 7회 이후 1점 차 리드 · 새 타석 → 가장 센 불펜(감독 호출 한도 안에서) */
  closeOut: (g) => {
    if (!g.top || g.inning < 7 || g.balls || g.strikes) return null;
    const lead = g.home.runs - g.away.runs;
    if (lead < 1 || lead > 2 || penCallsLeft(g.home) <= 0) return null;
    const pen = g.home.team.pitchers.slice(g.home.pitcherIdx + 1);
    if (!pen.length) return null;
    const best = pen.reduce((a, b) => ((st(b, 'stuff', 80) + st(b, 'control', 75)) > (st(a, 'stuff', 80) + st(a, 'control', 75)) ? b : a));
    const cur = g.home.pitcher;
    if ((st(best, 'stuff', 80) + st(best, 'control', 75)) <= (st(cur, 'stuff', 80) + st(cur, 'control', 75))) return null;
    return { changePitcher: best.id, call: true };
  },
  /* 상대 최고 장타자 · 득점권 · 1루 비었으면 거르기 */
  walkStar: (g, ctx) => {
    if (!g.top || g.balls || g.strikes || g.bases[0] || !(g.bases[1] || g.bases[2])) return null;
    return batterOf(g).id === ctx.star ? { ibb: true } : null;
  },
  /* 8회 이후 뒤지면 노림수 */
  swingBig: (g) => (!g.top && g.inning >= 8 && g.home.runs < g.away.runs ? { approach: 'sellout' } : null),
};

function play(home, away, seed, sides, conds, ctx) {
  const g = createGame({ home, away, rng: seeded(seed) });
  const fine = planOfSides(sides).fine;
  let guard = 0;
  while (!g.final && guard++ < 1500) {
    let o = tacticOrders(fine, !g.top, g.rng);
    if (!g.top) { const ch = aiPitchingChange(g, g.away); if (ch) o = { ...o, changePitcher: ch }; }
    for (const c of conds) { const x = COND[c](g, ctx); if (x) o = { ...o, ...x }; }
    pitch(g, o);
  }
  return g.home.runs > g.away.runs ? 1 : g.home.runs < g.away.runs ? 0 : 0.5;
}

const N = Number(process.env.PG || 0);
test.skipIf(!N)('plan sim', () => {
  const configs = [['기준', DEFAULT_SIDES, []]];
  for (const s of SIDES) for (const o of s.opts) if (DEFAULT_SIDES[s.key] !== o.id) configs.push([`${s.ko}:${o.ko}`, { ...DEFAULT_SIDES, [s.key]: o.id }, []]);
  for (const c of Object.keys(COND)) configs.push([`조건:${c}`, DEFAULT_SIDES, [c]]);
  const rows = [];
  for (let i = 0; i < N; i += 1) {
    const r = seeded(i + 4242);
    const myT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r), opT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r);
    const tags = scoutTags(opT).map((t) => t.label);
    const away = engineTeam(opT);
    const star = [...away.batters].sort((a, b) => st(b, 'power') - st(a, 'power'))[0]?.id;
    const res = {};
    for (const [name, sides, conds] of configs) res[name] = play(engineTeam(myT), engineTeam(opT), i + 9000, sides, conds, { star });
    rows.push({ tags, oppHandL: away.pitchers[0]?.hand === 'L', res });
  }
  writeFileSync('_plan.json', JSON.stringify(rows));
}, 3600000);
