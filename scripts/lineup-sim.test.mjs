/*
 * 라인업 시뮬(ROADMAP 13 · 정비 1단계 왼쪽 판을 정하려고) — 상대 선발과의 상성(좌우 · 구종)으로 라인업을 고치면 승률이 얼마나 바뀌나.
 * 같은 시드끼리 견준다(우리 = 홈, 상대 = AI 시리즈 팀, 성향 = 기본).
 *  기준        — 정비 자동 라인업 그대로
 *  상성 교체   — 벤치가 상대 선발과 더 맞으면(같은 포지션이거나 지명타자 자리) 바꿈
 *  좌우 상한   — 9명이 모두 상대 선발과 손이 맞는다고 치면(현실에선 못 함 — 좌우가 낼 수 있는 끝)
 *  비교: 포지션 이탈 — 4번 타자 한 명이 다른 계열 자리(능력치 −6, offPositionPenalty)
 *  비교: 타순 거꾸로 — 9번부터 1번으로
 * 무거워서 평소엔 건너뛴다: LG=3000 npx vitest run scripts/lineup-sim.test.mjs → _lineup.json
 */
import { test } from 'vitest';
import { writeFileSync } from 'fs';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/play/matchKit.jsx';
import { createGame, pitch, aiPitchingChange, platoonOf, famAdjOf, pitchMix, repertoireOf } from '../src/engine/pitchSim.js';
import { tacticOrders } from '../src/engine/tactics.js';
import { DEFAULT_SIDES, planOfSides } from '../src/myteam/strategy.js';
import { seeded } from '../src/myteam/tournament.js';

const fine = planOfSides(DEFAULT_SIDES).fine;
function play(home, away, seed) {
  const g = createGame({ home, away, rng: seeded(seed) });
  let guard = 0;
  while (!g.final && guard++ < 1500) {
    let o = tacticOrders(fine, !g.top, g.rng);
    if (!g.top) { const ch = aiPitchingChange(g, g.away); if (ch) o = { ...o, changePitcher: ch }; }
    pitch(g, o);
  }
  return g.home.runs > g.away.runs ? 1 : g.home.runs < g.away.runs ? 0 : 0.5;
}
/* 상대 선발과의 상성 — 좌우(±1.5 · ±0.8) / 1.5 + 구종(비율 가중 −1~1) × 2 (mockups/scout-lineup 과 같은 셈) */
const fitOf = (b, sp) => { const mix = pitchMix(sp); return platoonOf(b, sp) / 1.5 + repertoireOf(sp).reduce((n, t) => n + (mix[t] || 0) * famAdjOf(b, t), 0) * 2; };
const down = (p, n) => ({ ...p, stats: Object.fromEntries(Object.entries(p.stats).map(([k, v]) => [k, Math.max(50, v - n)])) });

const N = Number(process.env.LG || 0);
test.skipIf(!N)('lineup sim', () => {
  const rows = [];
  for (let i = 0; i < N; i += 1) {
    const r = seeded(i + 7171);
    const myT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r), opT = seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r);
    const base = engineTeam(myT), away = engineTeam(opT), sp = away.pitchers[0];
    /* 상성 교체 — 낮은 상성부터, 벤치 한 명은 한 자리에만 */
    const used = new Set(); let swaps = 0;
    const order = base.batters.map((b, k) => ({ b, k, f: fitOf(b, sp) })).sort((a, b) => a.f - b.f);
    const swapped = [...base.batters];
    for (const { b, k, f } of order) {
      const alt = base.bench.filter((y) => !used.has(y.id) && (y.position === b.position || b.position === 'DH') && fitOf(y, sp) > f + 0.3).sort((a, c) => fitOf(c, sp) - fitOf(a, sp))[0];
      if (alt) { used.add(alt.id); swapped[k] = alt; swaps += 1; }
    }
    const good = sp.hand === 'L' ? 'R' : 'L';
    const T = (batters) => ({ ...engineTeam(myT), batters });
    const res = {
      기준: play(engineTeam(myT), engineTeam(opT), i + 9100),
      '상성 교체': play(T(swapped), engineTeam(opT), i + 9100),
      '좌우 상한': play(T(base.batters.map((b) => ({ ...b, hand: good }))), engineTeam(opT), i + 9100),
      '포지션 이탈': play(T(base.batters.map((b, k) => (k === 3 ? down(b, 6) : b))), engineTeam(opT), i + 9100),
      '타순 거꾸로': play(T([...base.batters].reverse()), engineTeam(opT), i + 9100),
    };
    const fits = base.batters.map((b) => fitOf(b, sp));
    rows.push({ swaps, fitSum: fits.reduce((a, b) => a + b, 0), lefties: base.batters.filter((b) => b.hand === 'L').length, spL: sp.hand === 'L', res });
  }
  writeFileSync('_lineup.json', JSON.stringify(rows));
}, 3_600_000);
