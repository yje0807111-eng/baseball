/*
 * 투수 피로 — 많이 던지면 다음 경기들에 지장이 생긴다. 로테이션 · 불펜을 돌려 가며 쓰게 하는 장치.
 * 저장: team.pitchFatigue = { [선수 id]: { rest: 남은 휴식 경기 수, streak: 연속 등판 경기 수 } }
 *  - 경기가 끝나면 등판한 투수는 투구 수로 휴식 경기 수가 정해지고, 등판하지 않은 투수는 휴식이 1 줄어든다
 *  - 휴식이 남은 채로 나오면 컨디션이 떨어져 구위 · 제구가 깎인다
 */
import { overallOf } from '../data/seriesPlayers.js';

/** 휴식 경기 수: 선발 80구↑ 4 · 60~79 3 · 40~59 2 · 그 미만 1 / 불펜 30구↑ 2 · 15~29 1 · 그 미만 0. 연투면 +1 */
export function restAfter(role, pitches, streak = 0) {
  const base = role === 'starter'
    ? (pitches >= 80 ? 4 : pitches >= 60 ? 3 : pitches >= 40 ? 2 : 1)
    : (pitches >= 30 ? 2 : pitches >= 15 ? 1 : 0);
  return base + (streak > 0 ? 1 : 0);
}

/** 컨디션(%): 휴식 0 → 100 · 1 → 85 · 2 → 70 · 3 이상 → 55 */
export const conditionOf = (rest = 0) => (rest <= 0 ? 100 : rest === 1 ? 85 : rest === 2 ? 70 : 55);

/** 피로를 능력치에 얹는다: 구위 · 제구 −(100 − 컨디션) × 0.2, 종합도 다시 계산 */
export function withFatigue(player, fatigue = {}) {
  if (player.type !== 'pitcher') return player;
  const f = fatigue[player.id];
  const cond = conditionOf(f?.rest);
  if (cond === 100) return { ...player, condition: 100, rest: 0 };
  const cut = Math.round((100 - cond) * 0.2);
  const stats = { ...player.stats, stuff: Math.max(50, (player.stats.stuff ?? 70) - cut), control: Math.max(50, (player.stats.control ?? 70) - cut) };
  return { ...player, stats, overall: overallOf(player.position, stats), condition: cond, rest: f.rest, tired: true };
}
export const applyFatigue = (roster, fatigue) => roster.map((p) => withFatigue(p, fatigue));

/** 선발 고르기: 순서대로 보며 휴식이 끝난 첫 투수, 없으면 휴식이 가장 적게 남은 투수 */
export function pickStarter(candidates, fatigue = {}) {
  const rest = (p) => fatigue[p.id]?.rest || 0;
  return candidates.find((p) => rest(p) <= 0) || [...candidates].sort((a, b) => rest(a) - rest(b))[0] || null;
}

/**
 * 경기 뒤 피로 갱신
 * @param fatigue  지금 상태
 * @param pitcherIds  내 팀 투수 전원 id
 * @param counts  이번 경기 투구 수 { [id]: 투구 수 }
 * @param starterId  이번 경기 선발 id
 */
export function afterGame(fatigue = {}, pitcherIds = [], counts = {}, starterId = null) {
  const next = {};
  for (const id of pitcherIds) {
    const cur = fatigue[id] || { rest: 0, streak: 0 };
    const n = counts[id] || 0;
    if (n > 0) next[id] = { rest: restAfter(id === starterId ? 'starter' : 'reliever', n, cur.streak), streak: cur.streak + 1 };
    else if (cur.rest > 1) next[id] = { rest: cur.rest - 1, streak: 0 };
    // 휴식이 끝나고 연투도 아닌 투수는 기록하지 않는다
  }
  return next;
}
