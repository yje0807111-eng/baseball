/*
 * 엔트리 프리셋 — 엔트리 조합(선수 · 벤치 · 자리 · 타순)을 저장해 두고 바꿔 끼운다.
 * 쓰임: 조건부 대회(국내 선수만 · 2000년 이후 …)에 맞춘 조합, CP 를 넘긴 팀의 대안 조합.
 * 칸: 기본 1 + 상점 '프리셋 칸'으로 2번까지(최대 3). 불러오기는 공짜 — 보유 선수(엔트리 + 보관함) 안에서만 바꾼다.
 * 불러오면 프리셋 선수가 엔트리로, 나머지 보유 선수는 보관함으로 간다. 그사이 방출한 선수가 있으면 불러오지 않는다.
 */
import { CLUB_MAX } from './rules.js';

export const PRESET_BASE = 1;
export const PRESET_EXTRA_MAX = 2;
export const presetCount = (team = {}) => PRESET_BASE + Math.min(PRESET_EXTRA_MAX, Math.max(0, team.presetSlots || 0));

/** 지금 엔트리를 프리셋으로 */
export function snapshot(team, name) {
  return {
    name,
    ids: (team.squad || []).map((p) => p.id),
    bench: [...(team.bench || [])],
    order: team.order ? JSON.parse(JSON.stringify(team.order)) : null,
    prep: team.prep ? JSON.parse(JSON.stringify(team.prep)) : null,
    at: new Date().toISOString(),
  };
}

/** 불러올 수 없는 이유 (되면 null) */
export function presetIssue(team, preset) {
  if (!preset?.ids?.length) return '비어 있음';
  const owned = new Map([...(team.squad || []), ...(team.club || [])].map((p) => [p.id, p]));
  const missing = preset.ids.filter((id) => !owned.has(id)).length;
  if (missing) return `방출한 선수 ${missing}명`;
  if (owned.size - preset.ids.length > CLUB_MAX) return `보관함 자리 부족 (${CLUB_MAX}명)`;
  return null;
}

/** 프리셋을 끼운 팀 — 안 되면 null */
export function applyPreset(team, preset) {
  if (presetIssue(team, preset)) return null;
  const all = [...(team.squad || []), ...(team.club || [])];
  const on = new Set(preset.ids);
  const squad = preset.ids.map((id) => all.find((p) => p.id === id));
  const club = all.filter((p) => !on.has(p.id));
  return { ...team, squad, club, bench: preset.bench.filter((id) => on.has(id)), ...(preset.order ? { order: preset.order } : {}), ...(preset.prep ? { prep: preset.prep } : {}) };
}
