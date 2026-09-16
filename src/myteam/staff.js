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

/** 코치진 효과 합계 */
export function staffEffect(staff = {}) {
  const sum = { bat: 0, field: 0, pitch: 0, stamina: 0, steal: 0, clutch: 0 };
  for (const s of Object.values(staff)) {
    if (!s?.effect) continue;
    for (const k of Object.keys(sum)) sum[k] += s.effect[k] || 0;
  }
  return sum;
}
