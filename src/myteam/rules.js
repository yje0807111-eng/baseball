/*
 * 내 팀(본 게임) 규칙 — 검색으로 직접 뽑아 만드는 26인 엔트리
 * 모드(레전드 드래프트)와 달리 랜덤이 없고, CP 상한·외국인 제한·포지션 구성으로 균형을 잡는다.
 * 상점에서 산 확장(team.extraSlots · team.extraForeign)은 limitsOf(team) 한 곳에서만 얹는다 —
 * 엔트리 26 → 최대 28, 외국인 3 → 최대 4. 늘어난 자리는 그대로 자유 자리가 되고 포지션 필수는 그대로다.
 * (레전드 드래프트 판의 20인 · 외국인 3명은 그 판 규칙이라 여기와 무관하다)
 */

import { priceOf, refundOf } from './market.js';

export const SQUAD_SIZE = 26; // 출전 가능 인원
export const FOREIGN_MAX = 3; // 외국인 선수 한도
export const SQUAD_CAP = 2330; // 샐러리 캡(CP) — 26명 × 약 78 + 코치진
/** 보관함 — 엔트리 밖에 두는 보유 선수(CP 에 셈하지 않는다). 드래프트 기념 카드 · 잠시 빼 둔 선수 */
export const CLUB_MAX = 20;

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

/**
 * 필수 + 자유 자리: 포지션마다 min 명은 꼭 채우고(필수 합 21), 그 위로 더 넣는 선수는 어느 포지션이든
 * 자유 자리(26 − 필수 합 = 5)에서 한 칸씩 쓴다. max · GROUP_RULES 는 AI 팀 구성에만 쓴다.
 */
export const REQUIRED = POS_RULES.reduce((s, r) => s + r.min, 0);
export const FREE_SLOTS = SQUAD_SIZE - REQUIRED;
/** 자유 자리를 쓴 인원: 포지션별 (인원 − 필수) 의 합 */
export const freeUsed = (squad) => POS_RULES.reduce((s, r) => s + Math.max(0, countBy(squad, r.key) - r.min), 0);

/** 묶음 최대 인원: 내야(1·2·3루수·유격수) 합계 — AI 팀 구성용 */
export const GROUP_RULES = [{ key: 'IF', label: '내야수', positions: ['1B', '2B', '3B', 'SS'], max: 7 }];

/** 경기에 실제로 나가는 인원 — 나머지는 벤치(영입해도 안 뜀) */
export const PLAY_LIMIT = { SP: 5, RP: 8, batters: 9 };

/**
 * 팀 한도 — 상점에서 산 확장(team.extraSlots · team.extraForeign)을 얹은 값.
 * 늘어난 엔트리 한 자리는 그대로 자유 자리 한 칸이 된다(포지션 필수는 그대로).
 */
export const EXTRA_SLOT_MAX = 2;      // 벤치 확장은 두 번까지
export const EXTRA_FOREIGN_MAX = 1;   // 외국인 쿼터는 한 번까지
export function limitsOf(team = {}) {
  const slots = Math.min(EXTRA_SLOT_MAX, Math.max(0, team.extraSlots || 0));
  const foreign = Math.min(EXTRA_FOREIGN_MAX, Math.max(0, team.extraForeign || 0));
  return { size: SQUAD_SIZE + slots, free: FREE_SLOTS + slots, foreign: FOREIGN_MAX + foreign, extraSlots: slots, extraForeign: foreign };
}
export const BASE_LIMITS = { size: SQUAD_SIZE, free: FREE_SLOTS, foreign: FOREIGN_MAX, extraSlots: 0, extraForeign: 0 };

export const countBy = (squad, key) => squad.filter((p) => p.position === key).length;
export const squadCost = (squad, staff = {}) =>
  squad.reduce((s, p) => s + (p.cost || 0), 0) + Object.values(staff).reduce((s, x) => s + (x?.cost || 0), 0);
export const foreignCount = (squad) => squad.filter((p) => p.isForeign).length;

/** 이 선수를 지금 영입할 수 있나? 안 되면 이유를 돌려준다. gold 를 넘기면 영입가(골드)도 본다 */
export function addBlockReason(player, squad, staff, cap = SQUAD_CAP, lim = BASE_LIMITS, gold = null) {
  if (squad.some((p) => p.id === player.id)) return '이미 영입한 선수';
  if (squad.some((p) => p.personId === player.personId)) return '같은 선수의 다른 시즌은 함께 넣을 수 없음';
  if (squad.length >= lim.size) return `엔트리 ${lim.size}명이 모두 찼음`;
  if (player.isForeign && foreignCount(squad) >= lim.foreign) return `외국인 선수는 최대 ${lim.foreign}명`;
  const rule = POS_RULES.find((r) => r.key === player.position);
  // 필수를 아직 못 채운 포지션이면 들어갈 수 있고, 이미 채웠으면 자유 자리가 남아야 한다
  if (rule && countBy(squad, rule.key) >= rule.min && freeUsed(squad) >= lim.free) return `자유 자리 없음 (${lim.free}/${lim.free})`;
  const left = cap - squadCost(squad, staff);
  if (player.cost > left) return `CP 부족 (남은 ${left})`;
  const price = priceOf(player);
  if (gold != null && price > gold) return `골드 부족 (${(price - gold).toLocaleString()} G 모자람)`;
  return null;
}

/**
 * 교체 영입 — 엔트리가 꽉 찼을 때 한 명을 내보내며 들인다(스타터로 시작하면 늘 꽉 차 있다).
 * 내보낼 후보: 같은 포지션에서 약한 순 → 같은 유형(타자 · 투수)에서 약한 순.
 */
export function swapCandidates(player, squad) {
  const weak = (a, b) => a.overall - b.overall;
  const same = squad.filter((p) => p.position === player.position).sort(weak);
  const kind = squad.filter((p) => p.position !== player.position && p.type === player.type).sort(weak);
  return [...same, ...kind];
}
/** out 을 내보내고 player 를 들일 수 있나 — 안 되면 이유. 내보내는 선수의 환급도 골드에 셈한다 */
export function swapBlockReason(player, out, squad, staff, cap = SQUAD_CAP, lim = BASE_LIMITS, gold = null) {
  if (!out) return '내보낼 선수 없음';
  /* 필수 포지션을 비우는 교체는 먼저 막는다 — 자리 이유보다 이쪽이 진짜 이유 */
  const need = POS_RULES.find((r) => r.key === out.position);
  if (need && player.position !== out.position && countBy(squad, out.position) <= need.min) return `${need.label} 최소 ${need.min}명`;
  const rest = squad.filter((p) => p.id !== out.id);
  const why = addBlockReason(player, rest, staff, cap, lim, gold == null ? null : gold + refundOf(out));
  if (why) return why;
  /* 필수 포지션이 비는 교체는 막는다 — 경기에 못 나가는 엔트리가 된다 */
  const before = new Set(squadIssues(squad, staff, cap, lim));
  return squadIssues([...rest, player], staff, cap, lim).find((x) => !before.has(x)) || null;
}

/** 엔트리가 경기에 나갈 수 있는 상태인지 */
export function squadIssues(squad, staff = {}, cap = SQUAD_CAP, lim = BASE_LIMITS) {
  const out = [];
  if (squad.length !== lim.size) out.push(`엔트리 ${squad.length}/${lim.size}명`);
  for (const r of POS_RULES) {
    const n = countBy(squad, r.key);
    if (n < r.min) out.push(`${r.label} ${n}/${r.min}명`);
  }
  const used = freeUsed(squad);
  if (used > lim.free) out.push(`자유 자리 ${used - lim.free}명 초과 · 방출 필요`);
  if (foreignCount(squad) > lim.foreign) out.push(`외국인 ${foreignCount(squad)}명 (최대 ${lim.foreign})`);
  const cost = squadCost(squad, staff);
  if (cost > cap) out.push(`CP 초과 ${cost}/${cap}`);
  return out;
}

/** 지금 엔트리가 쓰고 있는 캡 — 화면 어디서나 같은 숫자를 쓰도록 한곳에서 센다 */
export function capUse(team = {}) {
  const cap = team.cap || SQUAD_CAP;
  const cost = squadCost(team.squad || [], team.staff);
  return { cost, cap, left: cap - cost, over: Math.max(0, cost - cap), pct: Math.min(1.4, cost / cap) };
}
