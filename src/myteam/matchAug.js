/*
 * 내 팀 경기(일반 대결 · 토너먼트 · 랭크전)의 증강 — 드래프트 판과 같은 증강 · 같은 풀을 쓴다.
 *   정비를 마치며 1장(그 경기 내내) + 7회 시작에 1장. 둘 다 그 경기에서만 — 경기가 끝나면 사라진다.
 *   내 증강 풀의 제외 · 강화 레벨 · 즐겨찾기(두 배)는 rollAugmentOptions 가 챙긴다.
 *   AI 상대는 증강을 쓰지 않는다(드래프트 판과 같다).
 */
import { rollAugmentOptions } from '../KboAugmentDraft.jsx';

/** 경기 중에 한 장 더 고르는 이닝 */
export const MATCH_AUG_INNINGS = [7];

/**
 * 효과형 증강이 상대를 보고 정하는 값 — 드래프트의 teamEnv 와 같은 뜻.
 * 상대는 시리즈 팀 그대로(buildTeam 을 거치지 않은 로스터)라 여기서 바로 센다.
 */
export function envOf(opp, record = { w: 0, l: 0, d: 0 }) {
  const avg = (xs) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);
  const roster = (opp?.roster || []).filter((p) => !p.isReplacement);
  const batters = opp?.batters?.length ? opp.batters : roster.filter((p) => p.type === 'batter');
  const arms = roster.filter((p) => p.type === 'pitcher');
  return {
    oppAvg: avg(roster.map((p) => p.overall)),
    oppOffense: avg(batters.map((p) => p.stats.contact * 0.4 + p.stats.power * 0.4 + p.stats.speed * 0.2)),
    oppPitch: avg(arms.map((p) => p.stats.stuff * 0.4 + p.stats.control * 0.3 + p.stats.stability * 0.3)),
    record,
  };
}

/** 증강 후보 3장 */
export const augOptions = (owned = []) => rollAugmentOptions(owned);

/** 기록실에 남길 증강 — 이름만 짧게 */
export const augsForHistory = (owned = []) => owned.map((a) => ({ id: a.id, name: a.name, tier: a.tier }));
