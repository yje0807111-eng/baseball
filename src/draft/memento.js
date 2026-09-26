/*
 * 드래프트 기념 카드 — 드래프트 한 판이 끝날 때 그 판에서 뽑은 선수 한 명을 내 팀 보관함으로 데려온다.
 * 드래프트 모드가 본 게임(내 팀)의 선수 공급원이 되게 한다 (MLB 더 쇼의 Battle Royale 처럼).
 *
 * 한 판에 한 번.
 *   단판: 판의 첫 승리 때 3장 중 하나 — 그 판에서 가장 좋은 셋은 빼고
 *   토너먼트: 끝났을 때 — 우승 5장(빼는 사람 없음) · 준우승 4장 · 4강 3장 · 그 밖 2장(가장 좋은 셋 빼고)
 *   탑 오르기: 완주 때 5장(빼는 사람 없음)
 * 이미 가진 사람(엔트리 · 보관함)과 퓨처스 유망주(isReplacement)는 나오지 않는다. 받은 카드는 산 값 0 — 방출해도 환급 없음.
 */
export const MEMENTO_TOP_CUT = 3;

/** 토너먼트 끝 순위(place: 탈락한 라운드 번호, 라운드 수와 같으면 우승) → 장 수 · 가장 좋은 선수를 빼나 */
export function tourneyMemento(place, rounds) {
  if (place == null) return null;
  if (place >= rounds) return { n: 5, cut: 0, why: '우승' };
  if (place === rounds - 1) return { n: 4, cut: MEMENTO_TOP_CUT, why: '준우승' };
  if (place === rounds - 2) return { n: 3, cut: MEMENTO_TOP_CUT, why: '4강' };
  return { n: 2, cut: MEMENTO_TOP_CUT, why: '토너먼트' };
}
export const SINGLE_MEMENTO = { n: 3, cut: MEMENTO_TOP_CUT, why: '첫 승리' };
export const GAUNTLET_MEMENTO = { n: 5, cut: 0, why: '구단 정복' };
/** 구단 정복 중간 보상 — 이만큼 넘으면 한 번(끝까지 못 가도 빈손이 아니게). 간판 선수는 빼고 3장 중 1장 */
export const GAUNTLET_MID_AT = 4;
export const GAUNTLET_MID_MEMENTO = { n: 3, cut: MEMENTO_TOP_CUT, why: `${GAUNTLET_MID_AT}구단 통과` };

/** 기념 카드 후보 n장 — roster 는 드래프트 판의 내 선수들 */
export function mementoOptions(roster = [], { n = 3, cut = 0 } = {}, owns = () => false, rng = Math.random) {
  const real = roster.filter((p) => !p.isReplacement);
  const top = new Set([...real].sort((a, b) => b.overall - a.overall).slice(0, cut).map((p) => p.id));
  const pool = real.filter((p) => !top.has(p.id) && !owns(p));
  const out = [];
  const left = [...pool];
  while (out.length < n && left.length) out.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  return out;
}

/** 드래프트 판의 선수를 내 팀 선수로 — 판 전용 자리 · 타순은 떼고, 사람 구분(personId)은 꼭 둔다 */
export const asClubPlayer = (p) => {
  const { slot, batOrder, ...rest } = p;
  return { ...rest, personId: p.personId || p.name };
};
