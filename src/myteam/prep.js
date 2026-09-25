/*
 * 경기 전 정비 — 드래프트의 정비 화면(ReadyScreen)을 내 팀 26인에도 쓴다.
 * 정비 화면은 20자리(선발 1 · 불펜 4 · 야수 9 · 예비 6)라, 26인 중 20명을 자리에 앉히고 나머지는 경기 벤치로 둔다.
 * 자리·타순은 team.prep { slots: { 선수id: 자리 }, order: [선수id] } 로 기억해 다음 경기에도 이어 쓴다.
 * 경기 팀은 드래프트와 같은 buildTeam 으로 만든다 — 선 자리 감소 · 시너지까지 정비 화면 수치 그대로 경기에 들어간다.
 */
import { withBoosts } from './shop.js';
import { applyStaff } from './match.js';
import { applyFatigue, pickStarter } from './fatigue.js';
import { applyForm } from './form.js';
import { SLOTS, buildTeam } from '../KboAugmentDraft.jsx';

const FIELD = ['C', '1B', '2B', '3B', 'SS', 'OF1', 'OF2', 'OF3', 'DH'];
const posOfSlot = (id) => (id.startsWith('OF') ? 'OF' : id);

/** 자리 자동 배정: 최고 선발 · 불펜 상위 넷(마무리가 가장 강하게) · 포지션별 최고 야수 · 남은 선수 중 종합 상위 여섯이 예비 */
export function autoSlots(squad) {
  const used = new Set();
  const slots = {};
  const take = (p, slot) => { if (p) { used.add(p.id); slots[p.id] = slot; } };
  const best = (f) => squad.filter((p) => !used.has(p.id) && f(p)).sort((a, b) => b.overall - a.overall)[0];
  take(best((p) => p.position === 'SP'), 'SP');
  for (const slot of ['CL', 'SU', 'MR', 'LR']) take(best((p) => p.position === 'RP') || best((p) => p.type === 'pitcher'), slot);
  for (const slot of FIELD) take(best((p) => p.position === posOfSlot(slot)) || best((p) => p.type === 'batter'), slot);
  squad.filter((p) => !used.has(p.id)).sort((a, b) => b.overall - a.overall).slice(0, 6).forEach((p, i) => take(p, `BN${i + 1}`));
  return slots;
}

/** 저장된 배치가 지금 엔트리와 맞는지 (자리 중복 · 없는 선수 · 빈 필드 자리가 없어야) */
function validSlots(saved, squad) {
  if (!saved) return false;
  const ids = new Set(squad.map((p) => p.id));
  const taken = new Set();
  for (const [id, slot] of Object.entries(saved)) {
    if (!ids.has(id) || !SLOTS.some((s) => s.id === slot) || taken.has(slot)) return false;
    taken.add(slot);
  }
  return ['SP', 'LR', 'MR', 'SU', 'CL', ...FIELD].every((s) => taken.has(s));
}

/** 정비 화면에 넘길 20명과 경기 벤치로 남는 선수 */
export function readyRoster(team, formSeed = 0) {
  const fatigue = team.pitchFatigue || {};
  /* 오늘 몸 상태는 맨 마지막에 얹는다 — 보정 · 코치 · 피로를 다 거친 수치 위에서 흔들린다 */
  const squad = applyForm(applyFatigue(applyStaff(withBoosts(team), team.staff), fatigue), formSeed);
  const slots = { ...(validSlots(team.prep?.slots, squad) ? team.prep.slots : autoSlots(squad)) };
  // 선발 자리: 지금 선발이 쉬어야 하면 로테이션(선발 포지션 종합순)에서 휴식이 끝난 첫 투수로. 원래 선발은 그 투수 자리로 맞바꾼다
  const spId = Object.keys(slots).find((id) => slots[id] === 'SP');
  if (spId && (fatigue[spId]?.rest || 0) > 0) {
    const rotation = squad.filter((p) => p.position === 'SP').sort((a, b) => b.overall - a.overall);
    const next = pickStarter(rotation, fatigue);
    if (next && next.id !== spId) {
      if (slots[next.id]) slots[spId] = slots[next.id]; else delete slots[spId];
      slots[next.id] = 'SP';
    }
  }
  const order = team.prep?.order || [];
  const ready = squad.filter((p) => slots[p.id]).map((p) => {
    const k = order.indexOf(p.id);
    return { ...p, slot: slots[p.id], ...(k >= 0 ? { batOrder: k } : {}) };
  });
  return { ready, rest: squad.filter((p) => !slots[p.id]) };
}

/** 정비 결과를 team.prep 로 */
export function prepOf(ready) {
  const order = ready.filter((p) => p.batOrder != null).sort((a, b) => a.batOrder - b.batOrder).map((p) => p.id);
  return { slots: Object.fromEntries(ready.map((p) => [p.id, p.slot])), order };
}

/** 경기용 팀: 정비 20명은 드래프트 규칙(buildTeam)으로, 나머지는 벤치 */
export function matchTeamOf(team, ready, rest, augs = [], env = {}) {
  const t = buildTeam(team.name || '나의 드림팀', ready, 0, augs, env); // 증강은 그 경기에서만 (matchAug.js)
  return { name: team.name || '나의 드림팀', roster: [...t.roster, ...rest.map((p) => ({ ...p, slot: 'BN' }))], batters: t.batters, synergies: t.synergies };
}
