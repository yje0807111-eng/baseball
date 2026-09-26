/*
 * 경기 전 정비 (내 팀 · 일반 대결 · 토너먼트 · 랭크전) — 라커의 배치 한 벌(team.order)을 그대로 경기에 쓴다.
 *  라커 · 내 선수와 정비가 같은 배치를 읽고 쓴다: 타순 9(수비 자리) · 선발 로테이션 5 · 불펜 8 · 벤치.
 *  경기에는 타순 9 · 오늘 선발 1(로테이션에서 휴식이 끝난 첫 투수) · 불펜 8(마무리 · 셋업 둘 · 중계)이 나선다.
 *  나머지(쉬는 선발 · 벤치)는 BN 자리 — 경기에는 안 나서고 시너지에만 든다.
 * 드래프트 정비(20자리: 선발 1 · 불펜 4 · 야수 9 · 예비 6)는 드래프트 판에서만 쓴다(KboAugmentDraft ReadyScreen).
 * 경기 팀은 드래프트와 같은 buildTeam 으로 만든다 — 선 자리 감소 · 시너지까지 정비 화면 수치 그대로 경기에 들어간다.
 */
import { withBoosts } from './shop.js';
import { applyStaff } from './match.js';
import { applyFatigue, pickStarter } from './fatigue.js';
import { applyForm } from './form.js';
import { squadOrder } from './SquadBoard.jsx';
import { buildTeam } from '../KboAugmentDraft.jsx';

/* 라커 자리(LF · CF · RF) → 경기 팀 자리(buildTeam 이 읽는 OF1~3) */
const GAME_SLOT = { LF: 'OF1', CF: 'OF2', RF: 'OF3' };
/** 불펜 순서 → 역할: 0 마무리 · 1~2 셋업 · 나머지 중계 (라커 불펜 칸과 같은 뜻) */
export const penRole = (i) => (i === 0 ? 'CL' : i <= 2 ? 'SU' : 'MR');

/** 오늘 몸 상태까지 얹은 26명 — 보정 · 코치 · 피로를 다 거친 수치 위에서 흔들린다 */
export function todaySquad(team, formSeed = 0) {
  return applyForm(applyFatigue(applyStaff(withBoosts(team), team.staff), team.pitchFatigue || {}), formSeed);
}

/**
 * 라커 배치 → 경기 명단. ready = 엔트리 전원(나서는 선수는 자리 · 타순, 나머지는 BN*), rest = [] (예전 호출과 맞추려 남긴다)
 * starter = 오늘 선발
 */
export function readyRoster(team, formSeed = 0) {
  const fatigue = team.pitchFatigue || {};
  const squad = todaySquad(team, formSeed);
  const o = squadOrder(squad, team.bench || [], team.order || {});
  const byId = new Map(squad.map((p) => [p.id, p]));
  const starter = pickStarter(o.rotation.map((id) => byId.get(id)).filter(Boolean), fatigue);
  const put = new Map();
  o.lineup.forEach((x, i) => put.set(x.id, { slot: GAME_SLOT[x.slot] || x.slot, batOrder: i }));
  if (starter) put.set(starter.id, { slot: 'SP' });
  o.bullpen.forEach((id, i) => put.set(id, { slot: penRole(i) }));
  let bn = 0;
  const ready = squad.map((p) => {
    const { batOrder, ...clean } = p; // eslint-disable-line no-unused-vars
    const hit = put.get(p.id);
    if (hit) return { ...clean, ...hit };
    bn += 1;
    return { ...clean, slot: `BN${bn}` };
  });
  return { ready, rest: [], starter };
}

/** 경기용 팀: 엔트리 전원을 드래프트 규칙(buildTeam)으로 — BN 자리는 경기에 안 나선다 */
export function matchTeamOf(team, ready, rest = [], augs = [], env = {}) {
  const t = buildTeam(team.name || '나의 드림팀', ready, 0, augs, env); // 증강은 그 경기에서만 (matchAug.js)
  return { name: team.name || '나의 드림팀', roster: [...t.roster, ...rest.map((p) => ({ ...p, slot: 'BN' }))], batters: t.batters, synergies: t.synergies,
    ...(team.plan?.sides ? { plan: { sides: team.plan.sides } } : {}) };
}
