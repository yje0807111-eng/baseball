/*
 * 방어 팀 사진 — 다른 감독이 랭크전에서 상대하게 될 내 팀.
 *
 * 수치가 아니라 선수 id 로 올리고(payload), 받는 쪽이 원본 데이터에서 다시 찾아 영구 훈련만 다시 얹는다.
 * 그래서 능력치를 부풀려 올릴 수 없고, 크기도 작다. 엔트리 규칙 · 캡을 어기거나 모르는 id 가 있으면 쓰지 않는다.
 * 부스트(소모품) · 투수 피로 · 증강 · 준비 카드는 담지 않는다 — AI 상대와 같은 조건.
 */
import { SERIES } from '../data/seriesPlayers.js';
import { overallOf } from '../data/ratings.js';
import { STAFF, STAFF_LEVEL_MAX } from './staff.js';
import { SHOP_ITEMS } from './shop.js';
import { squadIssues, limitsOf, SQUAD_CAP } from './rules.js';
import { readyRoster, matchTeamOf } from './prep.js';
import { teamRating } from './match.js';

export const GHOST_V = 1;
/** 캡 확장을 아무리 사도 이 위는 조작으로 본다 */
export const GHOST_CAP_MAX = SQUAD_CAP + 1500;

const PLAYER = new Map(SERIES.flatMap((s) => s.players).map((p) => [p.id, p]));
const STAFF_BY_ID = new Map(STAFF.map((s) => [s.id, s]));
/** 영구 훈련으로 올릴 수 있는 능력치 · 한 번에 오르는 양 */
const TRAIN = new Set(SHOP_ITEMS.filter((it) => it.cat === 'training').map((it) => `${it.stat}:${it.amount}`));

/** 내 팀 → 올릴 사진 */
export function snapshotOf(team = {}) {
  const squad = team.squad || [];
  const staff = Object.fromEntries(Object.entries(team.staff || {}).filter(([, s]) => s?.id)
    .map(([slot, s]) => [slot, { id: s.id, ...(s.level > 1 ? { level: s.level } : {}), ...(s.contracted ? { contracted: true } : {}) }]));
  return {
    v: GHOST_V,
    name: team.name || '감독 팀',
    cap: team.cap || SQUAD_CAP,
    ...(team.extraSlots ? { extraSlots: team.extraSlots } : {}),
    ...(team.extraForeign ? { extraForeign: team.extraForeign } : {}),
    players: squad.map((p) => ({ id: p.id, ...(p.trained?.length ? { trained: p.trained.map(({ stat, amount }) => ({ stat, amount })) } : {}) })),
    staff,
    // 라커 배치 한 벌(타순 · 로테이션 · 불펜) · 벤치 — 받는 쪽이 같은 배치로 경기 명단을 만든다
    ...(team.order ? { order: team.order } : {}),
    ...(team.bench?.length ? { bench: team.bench } : {}),
    ...(team.plan ? { plan: team.plan } : {}),
    ovr: teamRating(squad),
  };
}

/** 선수 하나 되살리기 — 원본 + 영구 훈련. 모르는 id · 상점에 없는 훈련이면 null */
function revive({ id, trained = [] }) {
  const base = PLAYER.get(id);
  if (!base || !Array.isArray(trained)) return null;
  if (!trained.length) return base;
  const stats = { ...base.stats };
  for (const t of trained) {
    if (!TRAIN.has(`${t?.stat}:${t?.amount}`) || stats[t.stat] == null) return null;
    stats[t.stat] = Math.min(110, stats[t.stat] + t.amount);
  }
  return { ...base, stats, trained, overall: overallOf(base.position, stats) };
}

/** 사진 → 내 팀과 같은 모양의 팀(검사를 통과할 때만). 못 쓰면 null */
export function reviveTeam(snap) {
  if (!snap || snap.v !== GHOST_V || !Array.isArray(snap.players)) return null;
  const squad = snap.players.map(revive);
  if (squad.some((p) => !p) || new Set(squad.map((p) => p.id)).size !== squad.length) return null;
  const staff = {};
  for (const [slot, s] of Object.entries(snap.staff || {})) {
    const base = STAFF_BY_ID.get(s?.id);
    if (!base) return null;
    const level = Math.max(1, Math.min(STAFF_LEVEL_MAX, Math.round(s.level || 1)));
    staff[slot] = { ...base, ...(level > 1 ? { level } : {}), ...(s.contracted ? { contracted: true, cost: 0 } : {}) };
  }
  const cap = Number(snap.cap) || SQUAD_CAP;
  if (cap < SQUAD_CAP || cap > GHOST_CAP_MAX) return null;
  const team = {
    name: String(snap.name || '감독 팀').slice(0, 24), squad, staff, cap,
    extraSlots: snap.extraSlots || 0, extraForeign: snap.extraForeign || 0,
    ...(snap.order ? { order: snap.order } : {}), ...(Array.isArray(snap.bench) ? { bench: snap.bench } : {}), ...(snap.plan ? { plan: snap.plan } : {}),
  };
  if (squadIssues(squad, staff, cap, limitsOf(team)).length) return null;
  return team;
}

/** 사진 → 경기 팀. 라커 배치 · 시너지까지 올린 사람이 짠 그대로, 컨디션은 보통(경기 때 AI 상대처럼 따로 얹는다) */
export function ghostMatchTeam(snap) {
  const team = reviveTeam(snap);
  if (!team) return null;
  const { ready, rest } = readyRoster({ ...team, boosts: [], pitchFatigue: {} }, 0);
  return { ...matchTeamOf(team, ready, rest, [], {}), ghost: true };
}
