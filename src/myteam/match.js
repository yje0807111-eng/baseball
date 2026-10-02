/* 내 팀으로 경기하기 — 엔트리를 경기용 팀으로 바꾸고, 비슷한 전력의 AI 상대를 만든다 */
import { SERIES } from '../data/seriesPlayers.js';
import { POS_RULES, GROUP_RULES, SQUAD_SIZE, FOREIGN_MAX, SQUAD_CAP, PLAY_LIMIT } from './rules.js';
import { withBoosts } from './shop.js';
import { staffBoostFor, staffTeam, CHEAP_N } from './staff.js';
import { applyFatigue, pickStarter } from './fatigue.js';

const ALL = SERIES.flatMap((s) => s.players);
const LINEUP_POS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'DH'];

/** 타순: 포지션별 최고 선수 9명 (같은 선수 중복 없이). bench 에 넣은 선수는 다른 선수가 없을 때만 쓴다 */
export function lineupOf(roster, bench = []) {
  const used = new Set();
  const out = [];
  const benched = new Set(bench);
  const best = (f) => roster.filter((x) => f(x) && !used.has(x.id)).sort((a, b) => (benched.has(a.id) - benched.has(b.id)) || b.overall - a.overall)[0];
  for (const pos of LINEUP_POS) {
    const p = best((x) => x.position === pos && !benched.has(x.id)) || best((x) => x.type === 'batter' && !benched.has(x.id))
      || best((x) => x.position === pos) || best((x) => x.type === 'batter');
    if (!p) continue;
    used.add(p.id);
    out.push(p);
  }
  // 주루·컨택 좋은 선수를 앞에 두는 간단한 타순
  return out.sort((a, b) => (b.stats.speed + b.stats.contact) - (a.stats.speed + a.stats.contact)).slice(0, 9);
}

/**
 * 코치진 효과를 선수 능력치에 얹는다 — 조건(좌타 · 선발 · 싼 선수 …)이 맞는 선수에게만(staff.js staffBoostFor).
 * 팀 운영(도루 · 휴식 · 흔들림)은 여기서 얹지 않는다 — prep.js · fatigue.js
 */
export function applyStaff(roster, staff) {
  if (!staff || !Object.values(staff).some(Boolean)) return roster;
  const cheap = new Set([...roster].sort((a, b) => (a.cost || 0) - (b.cost || 0)).slice(0, CHEAP_N).map((p) => p.id)); // 'CP 낮은 10명'
  return roster.map((p) => {
    const add = staffBoostFor(cheap.has(p.id) ? { ...p, cheap10: true } : p, staff);
    const keys = Object.keys(add);
    if (!keys.length) return p;
    const s = { ...p.stats };
    for (const k of keys) if (s[k] != null) s[k] = Math.max(40, Math.min(120, s[k] + add[k]));
    return { ...p, stats: s };
  });
}

/** 불펜 순서 → 역할: 0 마무리 · 1~2 셋업 · 나머지 중계 (라커 불펜 칸과 같은 뜻) */
export const penRole = (i) => (i === 0 ? 'CL' : i <= 2 ? 'SU' : 'MR');

/** 출전 선수 id: 선발 5 · 불펜 8 · 타순 9명. 감독이 벤치로 뺀 선수(bench)는 자리가 남을 때만 채운다 */
export function playingIds(roster, bench = []) {
  const benched = new Set(bench);
  const top = (pos, n) => roster.filter((p) => p.position === pos)
    .sort((a, b) => (benched.has(a.id) - benched.has(b.id)) || b.overall - a.overall).slice(0, n);
  return new Set([...top('SP', PLAY_LIMIT.SP), ...top('RP', PLAY_LIMIT.RP), ...lineupOf(roster, bench)].map((p) => p.id));
}

/**
 * 정비 화면을 거치지 않는 경기 팀(봇 · 랭크전 자동 진행 · 토너먼트 다른 경기의 내 팀) — 실제 경기 흐름(prep.js readyRoster)과 같은 자리로:
 * 오늘 선발 1(휴식 끝난 첫 투수) · 불펜 8(마무리 · 셋업 둘 · 중계, 종합 높은 순) · 쉬는 선발은 BN.
 * 전엔 선발 다섯이 다 나서 선발이 지치면 쉬는 선발이 불펜보다 먼저 올라왔다(봇 투구 중 불펜 몫 1%)
 */
export function buildMyTeam(team) {
  // 피로가 남은 투수는 구위·제구가 깎이고 종합도 내려가 선발 순서에서 밀린다
  const boosted = applyFatigue(applyStaff(withBoosts(team), team.staff), team.pitchFatigue);
  const play = playingIds(boosted, team.bench || []);
  const byOvr = (pos) => boosted.filter((p) => p.position === pos && play.has(p.id)).sort((a, b) => b.overall - a.overall);
  const starter = pickStarter(byOvr('SP'), team.pitchFatigue || {});
  const pen = new Map(byOvr('RP').map((p, i) => [p.id, penRole(i)]));
  // 벤치 · 쉬는 선발은 slot 'BN' — 경기 엔진이 투수진에서 뺀다
  const roster = boosted.map((p) => (p.id === starter?.id ? { ...p, slot: 'SP' } : pen.has(p.id) ? { ...p, slot: pen.get(p.id) }
    : play.has(p.id) && p.type === 'batter' ? p : { ...p, slot: 'BN' }));
  return { name: team.name || '내 팀', roster, batters: lineupOf(roster, team.bench || []), edge: { steal: staffTeam(team.staff, team.squad).steal } };
}

/** 내 팀과 비슷한 CP로 AI 팀을 만든다 */
export function buildAiTeam(cap = SQUAD_CAP, rng = Math.random) {
  const squad = [];
  const cost = () => squad.reduce((s, p) => s + p.cost, 0);
  const foreign = () => squad.filter((p) => p.isForeign).length;
  const count = (k) => squad.filter((p) => p.position === k).length;
  // 포지션 최소 인원부터 채우고, 남는 자리는 아무 포지션이나
  const plan = POS_RULES.flatMap((r) => Array.from({ length: r.min }, () => r.key));
  while (plan.length < SQUAD_SIZE) plan.push(POS_RULES[Math.floor(rng() * POS_RULES.length)].key);
  for (const pos of plan) {
    const left = cap - cost();
    const slots = SQUAD_SIZE - squad.length;
    const budget = Math.max(40, Math.floor(left / Math.max(1, slots)) + Math.floor(rng() * 24) - 8);
    const pool = ALL.filter((p) => p.position === pos && p.cost <= budget
      && !squad.some((x) => x.personId === p.personId)
      && (!p.isForeign || foreign() < FOREIGN_MAX)
      && count(pos) < (POS_RULES.find((r) => r.key === pos)?.max ?? 3)
      && GROUP_RULES.every((g) => !g.positions.includes(pos) || squad.filter((x) => g.positions.includes(x.position)).length < g.max));
    const pick = pool.length ? pool[Math.floor(rng() * pool.length)] : null;
    if (pick) squad.push(pick);
  }
  const roster = squad;
  return { name: 'AI 올스타', roster, batters: lineupOf(roster) };
}

export const teamRating = (roster) => (roster.length ? Math.round(roster.reduce((s, p) => s + p.overall, 0) / roster.length) : 0);
