/*
 * 정비 2 · 3단계 시뮬(ROADMAP 13) — 같은 시드끼리 견준다(우리 = 홈, 상대 = AI 시리즈 팀).
 *  집중 카드: 한 장을 어느 반 이닝에 두나 — 공격 이닝이면 그 반 이닝 타격 +(맞힘 · 안타 +0.04 · 홈런 +0.015), 수비 이닝이면 구위 · 제구 +6
 *  상황 대응표: 상황마다 대응을 바꾸면(그 상황이 올 때마다 그 대응) 승률이 얼마나 · 팀마다 답이 갈리나
 * 무거워서 평소엔 건너뛴다: FG=3000 npx vitest run scripts/flow-sim.test.mjs → _flow.json
 */
import { test } from 'vitest';
import { writeFileSync } from 'fs';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/play/matchKit.jsx';
import { createGame, pitch, aiPitchingChange, batterOf, penCallsLeft, stealOdds, staminaOf, noMod } from '../src/engine/pitchSim.js';
import { tacticOrders } from '../src/engine/tactics.js';
import { planOfSides, DEFAULT_SIDES } from '../src/myteam/strategy.js';
import { seeded } from '../src/myteam/tournament.js';

const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => st(p, 'stuff', 80) + st(p, 'control', 75);
const TOK = { hit: 0.04, hr: 0.015, pitch: 6 };
const fresh = (g) => !g.balls && !g.strikes;
const lead = (g) => g.home.runs - g.away.runs;

/* 상황 → 대응. 상황이 아니면 null(설계대로) */
const SIT = {
  /* 무사 1루 · 우리 공격 */
  n1_bunt: (g) => (!g.top && fresh(g) && g.outs === 0 && g.bases[0] && !g.bases[1] && !g.bases[2] ? { bunt: true } : null),
  n1_steal: (g) => (!g.top && fresh(g) && g.outs === 0 && g.bases[0] && !g.bases[1] ? { steal: 0 } : null),
  n1_hnr: (g) => (!g.top && fresh(g) && g.outs === 0 && g.bases[0] && !g.bases[1] ? { hitAndRun: true } : null),
  /* 3루 주자 · 2아웃 전 · 우리 공격 → 스퀴즈 */
  r3_squeeze: (g) => (!g.top && fresh(g) && g.outs < 2 && g.bases[2] && !g.bases[0] ? { bunt: true } : null),
  /* 득점권 · 1루 빔 · 상대 장타 상위 셋 · 우리 수비 */
  star_walk: (g, c) => (g.top && fresh(g) && !g.bases[0] && (g.bases[1] || g.bases[2]) && c.stars.has(batterOf(g)?.id) ? { ibb: true } : null),
  star_chase: (g, c) => (g.top && !g.bases[0] && (g.bases[1] || g.bases[2]) && c.stars.has(batterOf(g)?.id) && g.rng() < 0.6 ? { zone: 'chase' } : null),
  /* 7회 이후 1~2점 리드 · 우리 수비 → 가장 센 불펜 */
  late_close: (g) => {
    if (!g.top || !fresh(g) || g.inning < 7 || lead(g) < 1 || lead(g) > 2 || penCallsLeft(g.home) <= 0) return null;
    const pen = g.home.team.pitchers.slice(g.home.pitcherIdx + 1); if (!pen.length) return null;
    const best = pen.reduce((a, b) => (arm(b) > arm(a) ? b : a));
    return arm(best) > arm(g.home.pitcher) ? { changePitcher: best.id, call: true } : null;
  },
  /* 8회 이후 1~2점 뒤짐 · 우리 공격 → 노림수 / 대타(벤치에서 지금 타자보다 나은 이) */
  trail_sell: (g) => (!g.top && g.inning >= 8 && lead(g) < 0 && lead(g) >= -2 ? { approach: 'sellout' } : null),
  trail_ph: (g) => {
    if (g.top || !fresh(g) || g.inning < 8 || lead(g) >= 0 || lead(g) < -2) return null;
    const b = batterOf(g), v = (p) => st(p, 'contact') + st(p, 'power');
    const sub = (g.home.team.bench || []).filter((p) => v(p) > v(b) + 4).sort((x, y) => v(y) - v(x))[0];
    return sub ? { pinchHit: sub.id } : null;
  },
  /* 선발 체력 30 아래 · 주자 있음 · 우리 수비 → 교체 */
  tired_pull: (g) => (g.top && fresh(g) && g.home.pitcherIdx === 0 && staminaOf(g.home) < 30 && g.bases.some(Boolean) ? { changePitcher: true } : null),
};

function play(home, away, seed, cfg, ctx) {
  const g = createGame({ home, away, rng: seeded(seed) });
  const fine = planOfSides(DEFAULT_SIDES).fine;
  let guard = 0;
  while (!g.final && guard++ < 1500) {
    /* 집중 카드 — 지금 반 이닝이 그 자리면 우리 쪽 보정 */
    const on = cfg.tok && cfg.tok.inn === Math.min(g.inning, 9) && cfg.tok.off === !g.top;
    g.home.mod = { ...noMod(), ...(on && cfg.tok.off ? { hit: TOK.hit, hr: TOK.hr } : {}), ...(on && !cfg.tok.off ? { pitch: TOK.pitch } : {}) };
    let o = tacticOrders(fine, !g.top, g.rng);
    if (!g.top) { const ch = aiPitchingChange(g, g.away); if (ch) o = { ...o, changePitcher: ch }; }
    if (cfg.sit) { const x = SIT[cfg.sit](g, ctx); if (x) o = { ...o, ...x }; }
    pitch(g, o);
  }
  return g.home.runs > g.away.runs ? 1 : g.home.runs < g.away.runs ? 0 : 0.5;
}

const N = Number(process.env.FG || 0);
test.skipIf(!N)('flow sim', () => {
  const configs = [['기준', {}]];
  for (let inn = 1; inn <= 9; inn += 1) { configs.push([`공${inn}`, { tok: { inn, off: true } }]); configs.push([`수${inn}`, { tok: { inn, off: false } }]); }
  for (const k of Object.keys(SIT)) configs.push([`상황:${k}`, { sit: k }]);
  const rows = [];
  for (let i = 0; i < N; i += 1) {
    const r = seeded(i + 777);
    const myT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r), opT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r);
    const away = engineTeam(opT), mine = engineTeam(myT);
    const stars = new Set([...away.batters].sort((a, b) => st(b, 'power') - st(a, 'power')).slice(0, 3).map((p) => p.id));
    const res = {};
    for (const [name, cfg] of configs) res[name] = play(engineTeam(myT), engineTeam(opT), i + 31000, cfg, { stars });
    const oppPen = away.pitchers.slice(1).reduce((n, p) => n + arm(p), 0) / Math.max(1, away.pitchers.length - 1) / 2;
    const oppSp = arm(away.pitchers[0]) / 2, mySp = arm(mine.pitchers[0]) / 2;
    const myBat = mine.batters.reduce((n, b) => n + st(b, 'contact') + st(b, 'power'), 0) / 18;
    const mySpeed = mine.batters.reduce((n, b) => n + st(b, 'speed'), 0) / 9;
    rows.push({ oppPen, oppSp, mySp, myBat, mySpeed, oppSpStam: st(away.pitchers[0], 'stamina', 90), res });
  }
  writeFileSync('_flow.json', JSON.stringify(rows));
}, 7200000);
