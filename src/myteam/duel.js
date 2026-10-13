/*
 * 일반 대결 단판 상대 고르기 — 내 전력(playStrength) ±5 안의 시리즈 팀에서 무작위.
 *
 * 왜 ±5 인가(2026-10-13 시뮬: 내 팀 4단계 × 감독 6 × 상대 411팀 × 10판, 정비 계획 · 홈):
 *  전체 무작위일 때 스타터(전력 78)는 승률 25% 아래인 판이 14%(레전드 0% · 국가대표 10%),
 *  15,000 G 를 쓴 팀(87)은 75% 넘는 판이 67%, 40,000 G(94)는 95%.
 *  ±5 면 둘 다 0%, 승률은 44 → 55 → 72 → 68%로 키울수록 오른다(국가대표 · 레전드도 그때 올라온다).
 *  ±8 은 쉬운 판이 다시 40%, ±3 은 중반 후보가 47팀까지 준다. 범위 안이 12팀이 안 되면(아주 센 팀) 가까운 12팀에서.
 * 내 전력은 정비 뒤 경기 팀으로 잰다 — 토너먼트 대진이 쓰는 buildMyTeam 값보다 3쯤 높고, 시뮬도 이 값으로 쟀다.
 */
import { AI_SERIES, duelSeriesTeam } from './aiTeam.js';
import { playStrength } from './tournament.js';
import { readyRoster, matchTeamOf } from './prep.js';

export const DUEL_RANGE = 5;
export const DUEL_MIN = 12;

let power = null;
/** 시리즈 팀 전력 — 단판에 나오는 모양(duelSeriesTeam) 그대로, 처음 한 번만 잰다 */
const powerList = () => (power ||= AI_SERIES.map((s) => ({ s, v: playStrength(duelSeriesTeam(s)) })));

/** 내 팀의 단판 전력 — 라커 배치 그대로(오늘 몸 상태는 빼고). 잴 수 없으면 null */
export function duelPower(team) {
  try {
    const { ready, rest } = readyRoster(team, 0);
    const v = playStrength(matchTeamOf(team, ready, rest));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch { return null; }
}

/** 그 전력이 만날 수 있는 시리즈들. 전력을 모르면 전부 */
export function duelPool(myPower) {
  const all = powerList();
  if (myPower == null) return all.map((x) => x.s);
  const near = all.filter((x) => Math.abs(x.v - myPower) <= DUEL_RANGE);
  const list = near.length >= DUEL_MIN ? near : [...all].sort((a, b) => Math.abs(a.v - myPower) - Math.abs(b.v - myPower)).slice(0, DUEL_MIN);
  return list.map((x) => x.s);
}

/** 단판 상대 시리즈 하나 */
export function pickDuel(myPower, rng = Math.random) {
  const pool = duelPool(myPower);
  return pool[Math.floor(rng() * pool.length)];
}
