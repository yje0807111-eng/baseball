/*
 * 전술 눈금 → 공 하나에 실릴 지시.
 *
 * 정비 화면 전략실(myteam/strategy.js)에서 고른 성향은 지금까지 저장만 되고
 * 경기에는 닿지 않았다. 여기서 그 눈금을 매 공 pitchSim 이 알아듣는 orders 로 옮긴다.
 *
 * 성향이니 매 공 똑같이 내지 않는다 — 눈금이 센 쪽일수록 자주 낸다.
 */
import { penCallsLeft, batterOf } from './pitchSim.js';

/** 눈금 세 단계를 -1 · 0 · +1 로 */
const LEVEL = {
  swing: { 신중: -1, 보통: 0, 과감: 1 },
  take: { 안전: -1, 보통: 0, 과감: 1 },
  hook: { 늦게: -1, 보통: 0, 빠르게: 1 },
  duel: { 회피: -1, 보통: 0, 정면: 1 },
  mix: { 안전: -1, 보통: 0, 공격: 1 },
  guard: { 깊게: -1, 정석: 0, 전진: 1 },
  hold: { 느슨: -1, 보통: 0, 바짝: 1 },
};
export const levelOf = (fine = {}, key) => LEVEL[key]?.[fine[key]] ?? 0;

/** 볼 배합 설계가 공에 실리는 비율 — plan-sim(2026-10-03)과 같은 35% */
export const MIX_SHARE = 0.35;

/*
 * 조건 지시 — 정비에서 미리 걸어 두면 그 상황에 경기가 알아서(OOTP 의 '경기 시점 × 점수' 전략처럼). 두 칸까지.
 * plan-sim 6,000경기: 7회 이후 리드면 센 불펜 +3.5%p · 나머지는 상대 · 상황 따라 ±1 안쪽.
 * ctx: { star: 상대 최고 장타자 id }
 */
export const COND_MAX = 2;
export const CONDITIONS = [
  { id: 'close', ko: '7회 이후 1~2점 리드', act: '가장 센 불펜' },
  { id: 'walk', ko: '득점권 · 상대 최고 장타자', act: '거르기' },
  { id: 'swing', ko: '8회 이후 뒤짐', act: '노림수' },
  { id: 'steal', ko: '1루 주자 주력 85+', act: '도루' },
];
const stOf = (p, k, d = 75) => p?.stats?.[k] ?? d;
const armOf = (p) => stOf(p, 'stuff', 80) + stOf(p, 'control', 75);
export function condOrders(g, conds = [], ctx = {}) {
  if (!conds.length) return null;
  const fresh = !g.balls && !g.strikes, mineBat = !g.top;
  for (const c of conds) {
    if (c === 'close' && !mineBat && fresh && g.inning >= 7) {
      const lead = g.home.runs - g.away.runs;
      if (lead < 1 || lead > 2 || penCallsLeft(g.home) <= 0) continue;
      const pen = g.home.team.pitchers.slice(g.home.pitcherIdx + 1);
      const best = pen.reduce((a, b) => (!a || armOf(b) > armOf(a) ? b : a), null);
      if (best && armOf(best) > armOf(g.home.pitcher)) return { changePitcher: best.id, call: true };
    }
    if (c === 'walk' && !mineBat && fresh && !g.bases[0] && (g.bases[1] || g.bases[2]) && batterOf(g)?.id === ctx.star) return { ibb: true };
    if (c === 'swing' && mineBat && g.inning >= 8 && g.home.runs < g.away.runs) return { approach: 'sellout' };
    if (c === 'steal' && mineBat && fresh && g.bases[0] && !g.bases[1] && stOf(g.bases[0], 'speed') >= 85) return { steal: 0 };
  }
  return null;
}
/** 상대 최고 장타자 — 조건 '거르기'의 대상 */
export const starOf = (team) => [...(team?.batters || [])].sort((a, b) => stOf(b, 'power') - stOf(a, 'power'))[0]?.id || null;

/** 투수를 내리는 체력 문턱 — 늦게는 바닥까지, 빠르게는 여유 있을 때 */
export const hookAt = (fine = {}) => [0, 8, 20][levelOf(fine, 'hook') + 1];

/**
 * 이 공에 실을 지시.
 * @param fine   전략실 눈금 { swing, take, hook, duel, mix, guard, hold }
 * @param mineBat 내가 치는 회인가
 * @param rng    0~1
 */
export function tacticOrders(fine = {}, mineBat = true, rng = Math.random) {
  const out = {};
  if (mineBat) {
    /* 공격 — 신중하면 공을 고르고, 과감하면 노리고 들어간다 */
    const swing = levelOf(fine, 'swing');
    if (swing > 0 && rng() < 0.3) out.guess = rng() < 0.55 ? 'fast' : 'slider';
    if (swing < 0) out.patience = 1; // 스윙을 아낀다
    if (fine.appr && rng() < 0.3) out.approach = fine.appr; // 짧게 맞히기(contact) — 삼진 ↓ · 장타 ↓
    const take = levelOf(fine, 'take');
    if (take !== 0) out.dash = take; // 주루를 더 · 덜 본다
  } else {
    /* 마운드 — 승부를 어떻게 걸 것인가 */
    const duel = levelOf(fine, 'duel');
    if (duel > 0 && rng() < 0.15) out.zone = [4, 4, 1, 3, 5, 7][Math.floor(rng() * 6)]; // 정면 · 존 안으로 붙인다(변 · 한가운데 — 볼넷 ↓ 대신 몰린 공도)
    else if (duel < 0 && rng() < 0.05) out.zone = 'chase'; // 유인구로 뺀다 — 장타 ↓ 대신 볼넷 ↑
    const mix = levelOf(fine, 'mix');
    if (mix !== 0 && rng() < 0.3) out.pitchType = mix > 0 ? 'slider' : 'fast';
    /* 수비 — 주자를 얼마나 묶고, 어디에 서나 */
    const hold = levelOf(fine, 'hold');
    if (hold !== 0) out.hold = hold;
    /* 깊게 서면 장타를 막는 대신 앞이 비고, 전진하면 그 반대다. 정석이 기준 */
    const guard = levelOf(fine, 'guard');
    if (guard) out.guard = guard;
    out.hookAt = hookAt(fine); // 내 투수를 언제 내릴지
    if (fine.hookBf) out.hookBf = fine.hookBf; // 선발 두 바퀴 교체
    if (fine.mixFam && rng() < MIX_SHARE) out.mixFam = fine.mixFam; // 볼 배합 — 그 계열 공을 더
  }
  return out;
}
