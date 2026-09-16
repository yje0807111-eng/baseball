/* 내 팀으로 경기하기 — 엔트리를 경기용 팀으로 바꾸고, 비슷한 전력의 AI 상대를 만든다 */
import { SERIES } from '../data/seriesPlayers.js';
import { POS_RULES, SQUAD_SIZE, FOREIGN_MAX, SQUAD_CAP } from './rules.js';
import { withBoosts } from './shop.js';
import { staffEffect } from './staff.js';

const ALL = SERIES.flatMap((s) => s.players);
const LINEUP_POS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'DH'];

/** 타순: 포지션별 최고 선수 9명 (같은 선수 중복 없이) */
export function lineupOf(roster) {
  const used = new Set();
  const out = [];
  for (const pos of LINEUP_POS) {
    const p = roster.filter((x) => x.position === pos && !used.has(x.id)).sort((a, b) => b.overall - a.overall)[0]
      || roster.filter((x) => x.type === 'batter' && !used.has(x.id)).sort((a, b) => b.overall - a.overall)[0];
    if (!p) continue;
    used.add(p.id);
    out.push(p);
  }
  // 주루·컨택 좋은 선수를 앞에 두는 간단한 타순
  return out.sort((a, b) => (b.stats.speed + b.stats.contact) - (a.stats.speed + a.stats.contact)).slice(0, 9);
}

/** 코치진 효과를 선수 능력치에 얹는다 */
function applyStaff(roster, staff) {
  const e = staffEffect(staff);
  if (!e.bat && !e.field && !e.pitch && !e.stamina) return roster;
  return roster.map((p) => {
    const s = { ...p.stats };
    if (p.type === 'pitcher') {
      s.stuff = (s.stuff ?? 70) + e.pitch;
      s.control = (s.control ?? 70) + e.pitch;
      s.stability = (s.stability ?? 70) + Math.round(e.stamina / 3);
    } else {
      s.contact = (s.contact ?? 70) + e.bat;
      s.power = (s.power ?? 70) + e.bat;
      s.defense = (s.defense ?? 70) + e.field;
    }
    return { ...p, stats: s };
  });
}

export function buildMyTeam(team) {
  const roster = applyStaff(withBoosts(team), team.staff);
  return { name: team.name || '나의 드림팀', roster, batters: lineupOf(roster) };
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
      && count(pos) < (POS_RULES.find((r) => r.key === pos)?.max ?? 3));
    const pick = pool.length ? pool[Math.floor(rng() * pool.length)] : null;
    if (pick) squad.push(pick);
  }
  const roster = squad;
  return { name: 'AI 올스타', roster, batters: lineupOf(roster) };
}

export const teamRating = (roster) => (roster.length ? Math.round(roster.reduce((s, p) => s + p.overall, 0) / roster.length) : 0);
