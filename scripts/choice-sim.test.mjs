/*
 * 선택 경기 시뮬 — 승부처 10개 × 작전별 승률(경기 끝까지 굴려 이긴 비율, 같은 시드끼리 비교).
 * 대타 · 대주자 · 불펜은 남은 경기 내내 남으니 반 이닝이 아니라 끝까지 굴린다.
 * 무거워서 평소엔 건너뛴다: SG=40 SN=300 npx vitest run scripts/choice-sim.test.mjs → _choice.json
 */
import { test } from 'vitest';
import { writeFileSync } from 'fs';
import { AI_SERIES, seriesTeam } from '../src/myteam/aiTeam.js';
import { engineTeam } from '../src/BroadcastGame.jsx';
import { createGame, pitch, leverage, aiPitchingChange, defenseOf, offenseOf, stealOdds, staminaOf, batterOf, platoonOf } from '../src/engine/pitchSim.js';
import { winProb } from '../src/engine/winProb.js';
import { seeded } from '../src/myteam/tournament.js';

const first = (o) => (g) => (g.balls + g.strikes === 0 ? (typeof o === 'function' ? o(g) : o) : {});
const pickOf = (g, xs) => xs[Math.floor(g.rng() * xs.length)];
const st = (p, k, d = 70) => p?.stats?.[k] ?? d;
const batVal = (b, p) => (st(b, 'contact') + st(b, 'power')) / 2 + platoonOf(b, p);
const armVal = (p, b) => (st(p, 'stuff', 80) + st(p, 'control', 75)) / 2 - platoonOf(b, p);
function options(g) {
  const [b1, b2, b3] = g.bases, o = g.outs;
  const off = offenseOf(g), def = defenseOf(g), bat = batterOf(g);
  if (!g.top) {
    /* 화면에 낼 규칙과 같게 — 대타는 지금 타자보다 나은(좌우 상성 포함) 벤치만, 불펜은 6회부터 · 또는 선발 체력 50 아래 */
    const bench = (off.team.bench || []).map((p) => [p, batVal(p, def.pitcher)]).filter(([, v]) => v > batVal(bat, def.pitcher)).sort((a, b) => b[1] - a[1]).slice(0, 2);
    const lead = b2 && !b3 ? 1 : b1 && !b2 ? 0 : null, runner = lead != null ? g.bases[lead] : null;
    const fast = runner && (off.team.bench || []).filter((p) => st(p, 'speed') >= st(runner, 'speed') + 10).sort((a, b) => st(b, 'speed') - st(a, 'speed'))[0];
    return [
    ...bench.map(([p, v], i) => [`대타${i + 1}`, first({ pinchHit: p.id }), { name: p.name, gap: +(v - batVal(bat, def.pitcher)).toFixed(1) }]),
    fast && ['대주자', first({ pinchRun: { base: lead, id: fast.id } }), { name: fast.name, gap: st(fast, 'speed') - st(runner, 'speed') }],
    ['노림수', () => ({ approach: 'sellout' })],
    ['정비', () => ({})],
    ['강공', () => ({ approach: 'power' })],
    ['밀어치기', () => ({ approach: 'contact' })],
    ['기다리기', () => ({ patience: true })],
    b3 && o < 2 && ['스퀴즈', first({ bunt: true })],
    (b1 || b2) && !b3 && o < 2 && ['희생번트', first({ bunt: true })],
    b1 && o < 2 && ['히트앤런', first({ hitAndRun: true })],
    ((b1 && !b2) || (b2 && !b3)) && ['도루', first((gg) => ({ steal: gg.bases[0] && !gg.bases[1] ? 0 : 1 }))],
  ].filter(Boolean).sort((a, b) => (a[0] === '정비' ? -1 : b[0] === '정비' ? 1 : 0));
  }
  const pen = (g.inning < 6 && staminaOf(def) >= 50) ? [] : def.team.pitchers.slice(def.pitcherIdx + 1).map((p) => [p, armVal(p, bat)]).sort((a, b) => b[1] - a[1]).slice(0, 2);
  return [
    ['정비', () => ({})],
    ...pen.map(([p, v], i) => [`불펜${i + 1}`, first({ changePitcher: p.id }), { name: p.name, gap: +(v - armVal(def.pitcher, bat)).toFixed(1) }]),
    (b2 || b3) && !b1 && ['고의사구', first({ ibb: true })],
    ['유인구', (gg) => (gg.rng() < 0.45 ? { zone: 'chase' } : {})],
    ['정면 승부', (gg) => (gg.rng() < 0.5 ? { zone: pickOf(gg, [4, 1, 3, 5, 7]) } : {})],
    b3 && o < 2 && ['전진 수비', () => ({ guard: 1 })],
  ].filter(Boolean);
}
const side = (s) => ({ ...s, line: [...s.line], mod: { ...s.mod }, team: { ...s.team, batters: [...s.team.batters], pitchers: [...s.team.pitchers], bench: [...(s.team.bench || [])] } });
const clone = (g, rng) => ({ ...g, rng, home: side(g.home), away: side(g.away), bases: [...g.bases], events: [...g.events] });
/* 이 타석은 작전대로, 나머지는 자동 — 경기 끝까지 */
function rollout(g0, order, seed) {
  const g = clone(g0, seeded(seed)), top = g.top, idx = (g.top ? g.away : g.home).idx;
  let inPA = true, guard = 0;
  while (!g.final && guard++ < 1500) {
    const ch = aiPitchingChange(g, defenseOf(g));
    const o = inPA ? order(g) : {};
    const ev = pitch(g, { ...(ch && !(top && inPA) ? { changePitcher: ch } : {}), ...o });
    if (ev?.result) inPA = false;
    if (g.top !== top || (g.top ? g.away : g.home).idx !== idx) inPA = false;
  }
  return winProb(g);
}
const N = Number(process.env.SN || 400), GAMES = Number(process.env.SG || 40);
test.skipIf(!process.env.SG)('choice sim', () => {
  const rows = [];
  for (let gi = 0; gi < GAMES; gi += 1) {
    const r = seeded(gi + 77);
    const g = createGame({ home: engineTeam(seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r)), away: engineTeam(seriesTeam(AI_SERIES[Math.floor(r() * AI_SERIES.length)], r)), rng: seeded(gi + 5000) });
    const spots = [];
    let guard = 0;
    while (!g.final && guard++ < 1500) {
      if (g.balls === 0 && g.strikes === 0) spots.push({ lev: leverage(g), g: clone(g, g.rng), top: g.top });
      const ch = aiPitchingChange(g, defenseOf(g));
      pitch(g, ch ? { changePitcher: ch } : {});
    }
    /* 승부처 10개 — 무게 순, 단 7회 이후 몫 3개 이상 */
    const late = spots.filter((s) => s.g.inning >= 7).sort((a, b) => b.lev - a.lev).slice(0, 3);
    const rest = spots.filter((s) => !late.includes(s)).sort((a, b) => b.lev - a.lev).slice(0, 10 - late.length);
    for (const s of [...late, ...rest]) {
      const opts = options(s.g);
      const wp = opts.map(([, fn]) => { let t = 0; for (let k = 0; k < N; k += 1) t += rollout(s.g, fn, 90000 + k); return t / N; });
      const mine = s.top ? -1 : 1; // 우리 = 홈. 값은 홈 승률
      const vals = wp.map((v) => v * 1); // 홈 승률 그대로 — 수비(초)도 홈 쪽 이득이 큰 쪽이 좋다
      const def = vals[0];
      const best = Math.max(...vals), worst = Math.min(...vals);
      const b = batterOf(s.g), run1 = s.g.bases[0], stl = opts.find(([k]) => k === '도루') ? stealOdds(s.g, s.g.bases[0] && !s.g.bases[1] ? 0 : 1) : null;
      rows.push({ game: gi, inn: s.g.inning, top: s.top, outs: s.g.outs, bases: s.g.bases.map((x) => (x ? 1 : 0)).join(''), diff: s.g.home.runs - s.g.away.runs, lev: +s.lev.toFixed(3),
        batter: `${b.name}(${b.hand}) 컨${b.stats?.contact} 파${b.stats?.power}`, ct: b.stats?.contact, pe: +(((b.stats?.power ?? 70) - (defenseOf(s.g).pitcher.stats?.stuff ?? 80)) / 10).toFixed(2), stam: Math.round(staminaOf(defenseOf(s.g))), stl: stl && +stl.toFixed(2),
        opts: Object.fromEntries(opts.map(([k], i) => [k, +(vals[i] * 100).toFixed(1)])), info: Object.fromEntries(opts.filter((x) => x[2]).map(([k, , m]) => [k, m])), best: opts[vals.indexOf(best)][0], gain: +((best - def) * 100).toFixed(1), spread: +((best - worst) * 100).toFixed(1) });
    }
  }
  writeFileSync('_choice.json', JSON.stringify(rows));
}, 1800000);
