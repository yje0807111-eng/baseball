/*
 * 전술 눈금 → 공 하나에 실릴 지시.
 *
 * 정비 화면 전략실(myteam/strategy.js)에서 고른 성향은 지금까지 저장만 되고
 * 경기에는 닿지 않았다. 여기서 그 눈금을 매 공 pitchSim 이 알아듣는 orders 로 옮긴다.
 *
 * 성향이니 매 공 똑같이 내지 않는다 — 눈금이 센 쪽일수록 자주 낸다.
 */

/** 눈금 세 단계를 -1 · 0 · +1 로 */
const LEVEL = {
  swing: { 신중: -1, 보통: 0, 과감: 1 },
  take: { 안전: -1, 보통: 0, 과감: 1 },
  hook: { 늦게: -1, 보통: 0, 빠르게: 1 },
  duel: { 회피: -1, 보통: 0, 정면: 1 },
  mix: { 안전: -1, 보통: 0, 공격: 1 },
  guard: { 정석: -1, 보통: 0, 과감: 1 },
  hold: { 느슨: -1, 보통: 0, 바짝: 1 },
};
export const levelOf = (fine = {}, key) => LEVEL[key]?.[fine[key]] ?? 0;

/** 투수를 내리는 문턱 — 늦게 고르면 더 버티고, 빠르게면 일찍 내린다 */
export const hookAt = (fine = {}) => 1 - levelOf(fine, 'hook') * 0.18;

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
    const take = levelOf(fine, 'take');
    if (take !== 0) out.dash = take; // 주루를 더 · 덜 본다
  } else {
    /* 마운드 — 승부를 어떻게 걸 것인가 */
    const duel = levelOf(fine, 'duel');
    if (duel > 0 && rng() < 0.34) out.zone = 0;            // 정면 · 몸쪽으로 붙인다
    else if (duel < 0 && rng() < 0.34) out.zone = 'chase'; // 회피 · 유인구로 뺀다
    const mix = levelOf(fine, 'mix');
    if (mix !== 0 && rng() < 0.3) out.pitchType = mix > 0 ? 'slider' : 'fast';
    /* 수비 — 주자를 얼마나 묶나 */
    const hold = levelOf(fine, 'hold');
    if (hold !== 0) out.hold = hold;
  }
  return out;
}
