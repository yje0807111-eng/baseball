/*
 * 적 AI 팀 — 선수를 섞지 않고, 시리즈 하나(구단 시즌 · 국가대표 · 레전드)를 골라 그 멤버 그대로 내보낸다.
 * 투수 교체 성향은 시리즈별 조사값(src/data/pitching-usage.json)을 따른다.
 */
import { SERIES } from '../data/seriesPlayers.js';
import { lineupOf } from './match.js';

const usageFiles = import.meta.glob('../data/pitching-usage.json', { eager: true, import: 'default' });
const USAGE = Object.values(usageFiles)[0] || {};

/** 적으로 나올 수 있는 시리즈: 투수가 선발 1 · 불펜 1 이상, 타자 9명 이상인 것 */
export const AI_SERIES = SERIES.filter((s) => {
  const pit = s.players.filter((p) => p.type === 'pitcher');
  return pit.length >= 3 && s.players.length - pit.length >= 9;
});

export const seriesName = (s) => (s.kind === 'team' ? `${s.year} ${s.title}` : s.title);

/** 시리즈 한 팀을 경기용으로: 선발은 로테이션 상위 셋 중 하나, 불펜은 약한 투수부터 · 남은 선발은 롱릴리프로 · 마무리는 마지막 */
export function seriesTeam(series, rng = Math.random) {
  const roster = series.players;
  const sps = roster.filter((p) => p.position === 'SP').sort((a, b) => b.overall - a.overall);
  const rps = roster.filter((p) => p.position === 'RP').sort((a, b) => b.overall - a.overall);
  const starter = sps.length ? sps[Math.floor(rng() * Math.min(3, sps.length))] : rps[rps.length - 1];
  const closer = rps.find((p) => p !== starter) || null;
  const middle = rps.filter((p) => p !== starter && p !== closer).sort((a, b) => a.overall - b.overall);
  const long = sps.filter((p) => p !== starter);
  const pitchOrder = [starter, ...middle, ...long, closer].filter(Boolean).map((p) => p.id);
  return {
    name: seriesName(series),
    seriesId: series.id,
    roster,
    batters: lineupOf(roster),
    pitchOrder,
    closerId: closer?.id || null,
    usage: USAGE[series.id] || null,
  };
}

/** 무작위 시리즈 팀 (일반 대결 상대) */
export function randomSeriesTeam(rng = Math.random) {
  return seriesTeam(AI_SERIES[Math.floor(rng() * AI_SERIES.length)], rng);
}
