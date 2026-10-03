/*
 * 정비 3단계 시뮬(ROADMAP 13) — 상황 대응이 '상대 핵심 인물'에 따라 정답이 갈리나. 같은 시드끼리 견준다(우리 = 홈, 상대 = AI 시리즈 팀).
 *  거르기 · 유인구 — 득점권 · 1루 빔 · 상대 장타 상위 셋 타석 → 고의4구 / 유인구(60%)   ↔ 그 뒤 타자 세기
 *  외야 후진       — 상대 장타 상위 셋 타석이면 깊게(guard −1)                          ↔ 상대 장타자 파워
 *  견제            — 상대 1루 주자 주력 85+ · 2루 빔이면 바짝(hold +1)                 ↔ 상대 빠른 주자 수
 *  노림수 · 대타   — 8회 이후 1~2점 뒤짐 · 우리 공격                                   ↔ 상대 뒷문 투수 구위
 *  도루            — 우리 1루 주자 주력 80+ · 2루 빔                                   ↔ 상대 포수 수비
 * 지금 엔진은 AI 공격이 도루를 안 한다 — 그러면 견제는 늘 손해라, 이 시뮬에선 모든 판에 'AI 도루'(1루 주자 주력 85+ · 2루 빔 · 새 타석 35%)를 켠다.
 * 무거워서 평소엔 건너뛴다: F3=6000 npx vitest run scripts/flow3-sim.test.mjs → _flow3.json
 */
import { test } from 'vitest';
import { writeFileSync } from 'fs';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/play/matchKit.jsx';
import { createGame, pitch, aiPitchingChange, batterOf } from '../src/engine/pitchSim.js';
import { tacticOrders } from '../src/engine/tactics.js';
import { planOfSides, DEFAULT_SIDES } from '../src/myteam/strategy.js';
import { seeded } from '../src/myteam/tournament.js';

const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const arm = (p) => (st(p, 'stuff', 80) + st(p, 'control', 75)) / 2;
const bat = (b) => (st(b, 'contact') + st(b, 'power')) / 2;
const fresh = (g) => !g.balls && !g.strikes;
const lead = (g) => g.home.runs - g.away.runs;
const risp = (g) => !g.bases[0] && (g.bases[1] || g.bases[2]);

const SIT = {
  walk: (g, c) => (g.top && fresh(g) && risp(g) && c.stars.has(batterOf(g)?.id) ? { ibb: true } : null),
  chase: (g, c) => (g.top && risp(g) && c.stars.has(batterOf(g)?.id) && g.rng() < 0.6 ? { zone: 'chase' } : null),
  deep: (g, c) => (g.top && c.stars.has(batterOf(g)?.id) ? { guard: -1 } : null),
  hold: (g) => (g.top && g.bases[0] && !g.bases[1] && st(g.bases[0], 'speed') >= 85 ? { hold: 1 } : null),
  sell: (g) => (!g.top && g.inning >= 8 && lead(g) < 0 && lead(g) >= -2 ? { approach: 'sellout' } : null),
  ph: (g) => {
    if (g.top || !fresh(g) || g.inning < 8 || lead(g) >= 0 || lead(g) < -2) return null;
    const b = batterOf(g), sub = (g.home.team.bench || []).filter((p) => bat(p) > bat(b) + 2).sort((x, y) => bat(y) - bat(x))[0];
    return sub ? { pinchHit: sub.id } : null;
  },
  steal: (g) => (!g.top && fresh(g) && g.bases[0] && !g.bases[1] && st(g.bases[0], 'speed') >= 80 ? { steal: 0 } : null),
};

function play(home, away, seed, sit, ctx) {
  const g = createGame({ home, away, rng: seeded(seed) });
  const fine = planOfSides(DEFAULT_SIDES).fine;
  let guard = 0;
  while (!g.final && guard++ < 1500) {
    let o = tacticOrders(fine, !g.top, g.rng);
    if (!g.top) { const ch = aiPitchingChange(g, g.away); if (ch) o = { ...o, changePitcher: ch }; }
    /* AI 도루 — 상대 공격(우리 수비 회)의 빠른 1루 주자 */
    if (g.top && fresh(g) && g.bases[0] && !g.bases[1] && st(g.bases[0], 'speed') >= 85 && g.rng() < 0.35) o = { ...o, steal: 0 };
    if (sit) { const x = SIT[sit](g, ctx); if (x) o = { ...o, ...x }; }
    pitch(g, o);
  }
  return { w: g.home.runs > g.away.runs ? 1 : g.home.runs < g.away.runs ? 0 : 0.5, rf: g.home.runs, ra: g.away.runs };
}

const N = Number(process.env.F3 || 0);
test.skipIf(!N)('flow3 sim', () => {
  const configs = [['기준', null], ['거르기', 'walk'], ['유인구', 'chase'], ['외야 후진', 'deep'], ['견제', 'hold'], ['노림수', 'sell'], ['대타', 'ph'], ['도루', 'steal']];
  const rows = [];
  for (let i = 0; i < N; i += 1) {
    const r = seeded(i + 6161);
    const myT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r), opT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r);
    const away = engineTeam(opT), mine = engineTeam(myT);
    const top3 = [...away.batters].sort((a, b) => st(b, 'power') - st(a, 'power')).slice(0, 3);
    const ctx = { stars: new Set(top3.map((p) => p.id)) };
    const res = {}, rf = {}, ra = {};
    for (const [name, sit] of configs) { const x = play(engineTeam(myT), engineTeam(opT), i + 62000, sit, ctx); res[name] = x.w; rf[name] = x.rf; ra[name] = x.ra; }
    const next = top3.map((p) => away.batters[(away.batters.indexOf(p) + 1) % 9]);
    const pens = away.pitchers.slice(1).filter((p) => p.position !== 'SP').sort((a, b) => arm(b) - arm(a));
    rows.push({
      nextBat: next.reduce((n, b) => n + bat(b), 0) / 3, starBat: top3.reduce((n, b) => n + bat(b), 0) / 3, topPow: top3.reduce((n, b) => n + st(b, 'power'), 0) / 3,
      fastN: away.batters.filter((b) => st(b, 'speed') >= 85).length, closer: st(pens[0], 'stuff', 80), oppCatDef: st(away.catcher, 'defense', 85),
      myBench: (mine.bench || []).reduce((m, b) => Math.max(m, bat(b)), 0) - mine.batters.reduce((n, b) => n + bat(b), 0) / 9,
      res, rf, ra,
    });
  }
  writeFileSync('_flow3.json', JSON.stringify(rows));
}, 7_200_000);
