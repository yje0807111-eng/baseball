/*
 * 정비 설계 미리보기 — 고른 설계로 이 상대와 n판을 굴려 예상 승률 · 선발이 내려가는 이닝 · 이닝마다 자주 나오는 불펜을 센다.
 * 경기 화면(ChoiceGame)과 같은 운용: 우리 쪽은 설계(성향 + 조건 지시) · 엔진 교체 문턱만, 상대만 AI 투수 교체.
 * 칸마다 붙는 승률 변화(planDeltas)는 plan-sim 6,000경기의 그룹 값 — 판마다 n판을 더 굴리면 정비 화면이 수십 초 멈춘다.
 */
import { createGame, pitch, aiPitchingChange, batterFam, repertoireOf, PITCHES } from '../engine/pitchSim.js';
import { tacticOrders, condOrders, starOf } from '../engine/tactics.js';
import { seeded } from '../engine/rng.js';

const copy = (t) => ({ ...t, batters: [...t.batters], pitchers: [...t.pitchers], bench: [...(t.bench || [])] });
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
export const armOf = (p) => (st(p, 'stuff', 80) + st(p, 'control', 75)) / 2;

/*
 * 고른 설계로 판을 굴려 쌓는다 — from ~ to 번째 판(시드 i+1). 한 판이 바뀌면 그 뒤 난수가 다 갈려 판끼리 견줘도 잡음이 크다
 * (160판이면 승률 ±5%p 안팎) — 정비 화면은 100판씩 나눠 600판까지 쌓으며 숫자를 다듬는다(planSummary)
 */
export function planRun(home, away, plan, from, to, acc = { w: 0, games: 0, exitSum: 0, byInn: { 7: {}, 8: {}, 9: {} } }) {
  const fine = plan?.fine || {}, conds = plan?.conds || [], star = starOf(away);
  for (let i = from; i < to; i += 1) {
    const g = createGame({ home: copy(home), away: copy(away), rng: seeded(i + 1) });
    let guard = 0, out = null;
    while (!g.final && guard++ < 1500) {
      let o = { ...tacticOrders(fine, !g.top, g.rng), ...(condOrders(g, conds, { star }) || {}) };
      if (!g.top) { const ch = aiPitchingChange(g, g.away); if (ch) o = { ...o, changePitcher: ch }; }
      pitch(g, o);
      if (out == null && g.home.pitcherIdx > 0) out = g.inning - (g.top ? 1 : 0.5);
      if (g.top && acc.byInn[g.inning] && g.home.pitcherIdx > 0) { const nm = g.home.pitcher.name; acc.byInn[g.inning][nm] = (acc.byInn[g.inning][nm] || 0) + 1; }
    }
    acc.w += g.winner === 'home' ? 1 : g.winner === 'away' ? 0 : 0.5;
    acc.exitSum += out ?? 9; acc.games += 1;
  }
  return acc;
}
/** 쌓은 판 → { win(%), exitInn(선발이 내려간 평균 이닝), pen: [7 · 8 · 9회에 가장 자주 던진 불펜], games } */
export function planSummary(acc) {
  const top = (m) => Object.entries(m).sort((x, y) => y[1] - x[1])[0]?.[0] || null;
  return { win: Math.round((acc.w / acc.games) * 100), exitInn: acc.exitSum / acc.games, pen: [7, 8, 9].map((k) => top(acc.byInn[k])), games: acc.games };
}
export const planPreview = (home, away, plan, n = 200) => planSummary(planRun(home, away, plan, 0, n));

/** 정비 분석 — 상대 타선 구종 약점 수 · 우리 선발과 가장 센 불펜의 차이 */
export function planAnalysis(home, away) {
  const weak = { F: 0, B: 0, O: 0 };
  away.batters.forEach((b) => { const x = batterFam(b).weak; if (x) weak[x] += 1; });
  const sp = home.pitchers[0], pen = home.pitchers.slice(1).sort((a, b) => armOf(b) - armOf(a));
  const gap = pen[0] ? Math.round(armOf(pen[0]) - armOf(sp)) : 0;
  return { weak, sp, best: pen[0] || null, gap, fams: new Set(repertoireOf(sp).map((t) => PITCHES[t].fam)) };
}

/*
 * 칸마다 승률 변화(%p) — plan-sim(ROADMAP 12) 그룹 값:
 *  선발 운용은 우리 불펜 − 선발(gap, 구위 · 제구 평균) 0 아래 · 0~7.5 · 7.5 위, 볼 배합은 그 계열에 약한 상대 타자가 4명 이상인가 · 우리 선발에게 그 계열 공이 있나
 */
export function planDeltas(an) {
  const gi = an.gap < 0 ? 0 : an.gap < 7.5 ? 1 : 2; // gap 은 구위 · 제구 평균의 차 — plan-sim 은 합의 차(0 · 15)로 나눴다
  const mound = { long: 0, two: [-4.3, 2.8, 2.6][gi], quick: [-2.1, 3.4, 4.7][gi] };
  const many = (f) => an.weak[f] >= 4;
  const mix = { mix: 0, F: !an.fams.has('F') ? 0 : many('F') ? 0.1 : -1.4, B: !an.fams.has('B') ? 0 : many('B') ? 1.7 : -0.9, O: !an.fams.has('O') ? 0 : -1.3 };
  const cond = { close: [1.9, 3.3, 3.9][gi], walk: -0.8, swing: -0.1, steal: 0 };
  return { mound, mix, cond };
}
