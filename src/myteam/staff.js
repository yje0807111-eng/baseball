/*
 * 코치진: 감독 1 · 수석 1 · 타격 1 · 수비(투수) 1
 * effect 는 경기 엔진에 그대로 얹히는 작은 보정값이다.
 *   bat: 타자 컨택·파워 +   field: 야수 수비 +   pitch: 투수 구위·제구 +
 *   stamina: 투수 체력 +    steal: 도루 성공률 +  clutch: 승부처 지시 횟수 +
 */
import managers from '../data/staff/managers.json';
import coaches from '../data/staff/coaches.json';

/* 후보 데이터: src/data/staff/*.json (규칙은 src/data/STAFF_SPEC.md). id 는 사용자 저장 데이터가 기억하므로 바꾸지 않는다 */
export const STAFF = [...managers, ...coaches].map(({ source, ...s }) => ({ ...s, isStaff: true }));

export const staffByRole = (role) => STAFF.filter((s) => s.role === role);

/**
 * 아직 비어 있는 코치 자리를 채우는 데 드는 CP — 가장 비싼 후보 기준.
 * 선수로 캡을 다 써 버리면 감독·코치를 못 앉히니 자동 채우기가 이만큼 남겨 둔다.
 * 최소가 아니라 최대로 잡는 건, 누구를 앉히든 네 자리가 다 차게 하기 위해서다
 * (선수 한 명당 1 CP 남짓 손해 보는 대신 코치진에서 막히지 않는다).
 */
export function staffReserve(staff = {}) {
  return ['manager', 'head', 'batting', 'pitching'].reduce((total, slot) => {
    if (staff[slot]) return total;
    const cands = staffByRole(slot);
    return total + (cands.length ? Math.max(...cands.map((s) => s.cost || 0)) : 0);
  }, 0);
}

export const STAFF_LEVEL_MAX = 5;
/** 강화 레벨을 반영한 코치 한 명의 효과: Lv.1 은 기본, 레벨마다 가진 항목 +1 (도루는 +1%p) */
export function staffEffectOf(s) {
  if (!s?.effect) return {};
  const up = Math.max(0, Math.min(STAFF_LEVEL_MAX, s.level || 1) - 1);
  return Object.fromEntries(Object.entries(s.effect).map(([k, v]) => [k, k === 'steal' ? Math.round((v + up * 0.01) * 100) / 100 : v + up]));
}

/** 코치진 효과 합계 */
export function staffEffect(staff = {}) {
  const sum = { bat: 0, field: 0, pitch: 0, stamina: 0, steal: 0, clutch: 0 };
  for (const s of Object.values(staff)) {
    const e = staffEffectOf(s);
    for (const k of Object.keys(sum)) sum[k] += e[k] || 0;
  }
  return sum;
}
