/*
 * 내 팀(본 게임) 규칙 — 검색으로 직접 뽑아 만드는 26인 엔트리
 * 모드(레전드 드래프트)와 달리 랜덤이 없고, CP 상한·외국인 제한·포지션 구성으로 균형을 잡는다.
 */

export const SQUAD_SIZE = 26; // 출전 가능 인원
export const FOREIGN_MAX = 3; // 외국인 선수 한도
export const SQUAD_CAP = 2000; // 샐러리 캡(CP)

/** 포지션 구성: 최소~최대. 합이 26이 되도록 뽑는다 */
export const POS_RULES = [
  { key: 'SP', label: '선발', min: 5, max: 6 },
  { key: 'RP', label: '불펜', min: 6, max: 8 },
  { key: 'C', label: '포수', min: 2, max: 3 },
  { key: '1B', label: '1루수', min: 1, max: 3 },
  { key: '2B', label: '2루수', min: 1, max: 3 },
  { key: '3B', label: '3루수', min: 1, max: 3 },
  { key: 'SS', label: '유격수', min: 1, max: 3 },
  { key: 'OF', label: '외야수', min: 4, max: 6 },
  { key: 'DH', label: '지명타자', min: 0, max: 2 },
];

/** 코치진: 감독 1 · 수석 1 · 타격 1 · 수비 1 */
export const STAFF_SLOTS = [
  { key: 'manager', label: '감독', role: 'manager' },
  { key: 'head', label: '수석코치', role: 'head' },
  { key: 'batting', label: '타격코치', role: 'batting' },
  { key: 'pitching', label: '수비·투수코치', role: 'pitching' },
];

/** 묶음 최대 인원: 내야(1·2·3루수·유격수) 합계 */
export const GROUP_RULES = [{ key: 'IF', label: '내야수', positions: ['1B', '2B', '3B', 'SS'], max: 7 }];

/** 경기에 실제로 나가는 인원 — 나머지는 벤치(영입해도 안 뜀) */
export const PLAY_LIMIT = { SP: 5, RP: 8, batters: 9 };

export const countBy = (squad, key) => squad.filter((p) => p.position === key).length;
export const squadCost = (squad, staff = {}) =>
  squad.reduce((s, p) => s + (p.cost || 0), 0) + Object.values(staff).reduce((s, x) => s + (x?.cost || 0), 0);
export const foreignCount = (squad) => squad.filter((p) => p.isForeign).length;

/** 이 선수를 지금 영입할 수 있나? 안 되면 이유를 돌려준다 */
export function addBlockReason(player, squad, staff, cap = SQUAD_CAP) {
  if (squad.some((p) => p.id === player.id)) return '이미 영입한 선수';
  if (squad.some((p) => p.personId === player.personId)) return '같은 선수의 다른 시즌은 함께 넣을 수 없음';
  if (squad.length >= SQUAD_SIZE) return `엔트리 ${SQUAD_SIZE}명이 모두 찼음`;
  if (player.isForeign && foreignCount(squad) >= FOREIGN_MAX) return `외국인 선수는 최대 ${FOREIGN_MAX}명`;
  const rule = POS_RULES.find((r) => r.key === player.position);
  if (rule && countBy(squad, rule.key) >= rule.max) return `${rule.label} 자리 가득 (최대 ${rule.max}명)`;
  const group = GROUP_RULES.find((g) => g.positions.includes(player.position));
  if (group && squad.filter((p) => group.positions.includes(p.position)).length >= group.max) return `${group.label} 자리 가득 (최대 ${group.max}명)`;
  const left = cap - squadCost(squad, staff);
  if (player.cost > left) return `CP 부족 (남은 ${left})`;
  return null;
}

/** 엔트리가 경기에 나갈 수 있는 상태인지 */
export function squadIssues(squad, staff = {}, cap = SQUAD_CAP) {
  const out = [];
  if (squad.length !== SQUAD_SIZE) out.push(`엔트리 ${squad.length}/${SQUAD_SIZE}명`);
  for (const r of POS_RULES) {
    const n = countBy(squad, r.key);
    if (n < r.min) out.push(`${r.label} ${n}/${r.min}명`);
    if (n > r.max) out.push(`${r.label} ${n - r.max}명 초과 · 방출 필요`);
  }
  for (const g of GROUP_RULES) {
    const n = squad.filter((p) => g.positions.includes(p.position)).length;
    if (n > g.max) out.push(`${g.label} ${n - g.max}명 초과 · 방출 필요`);
  }
  if (foreignCount(squad) > FOREIGN_MAX) out.push(`외국인 ${foreignCount(squad)}명 (최대 ${FOREIGN_MAX})`);
  const cost = squadCost(squad, staff);
  if (cost > cap) out.push(`CP 초과 ${cost}/${cap}`);
  return out;
}
