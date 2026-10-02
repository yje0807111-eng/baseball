/*
 * 코치진: 감독 1 · 수석 1 · 타격 1 · 수비(투수) 1  (규칙: src/data/STAFF_SPEC.md)
 *
 * 한 사람 = 효과 한 줄 — { who, stat, v } (누구의 · 어떤 능력치를 · 얼마나) 또는 { team, v } (팀 운영).
 *   감독: 야구 색깔(STYLES) 하나 — 색깔이 효과 한 줄을 정하고, 급(grade 1~3)이 크기를 정한다
 *   코치: 사람마다 rules 에 한 줄 — 조건(좌타 · 장타자 · 선발 · 내야 …)이 붙는 전문 효과
 *   강화: 레벨마다 ×(1 + 0.2 × (Lv − 1))
 * 대가(−) · 구단 궁합 · 한 사람이 여러 능력을 올리는 것은 두지 않는다 — 한 눈에 읽히게
 * CP 는 효과가 올리는 승률로 매긴다(staffValue) — 1%p ≈ CP_PER_PCT CP
 */
import managers from '../data/staff/managers.json';
import coaches from '../data/staff/coaches.json';

/* 조건 — share 는 그 조건에 드는 몫(가치 계산용). 타자 손 · 장타 · 교타 몫은 전체 선수 데이터에서 셈(좌타 32% · 파워 90↑ 23% · 컨택 90↑ 23%) */
const IF = ['1B', '2B', '3B', 'SS'];
export const WHO = {
  all: { ko: '선수', f: () => true, share: 1 },
  batter: { ko: '타자', f: (p) => p.type === 'batter', share: 1 },
  pitcher: { ko: '투수', f: (p) => p.type === 'pitcher', share: 1 },
  SP: { ko: '선발', f: (p) => p.position === 'SP', share: 0.5 }, // 선발 · 불펜 몫은 실제 경기 흐름 시뮬로 맞춤(scripts/staff-balance.mjs)
  RP: { ko: '불펜', f: (p) => p.position === 'RP', share: 0.65 },
  C: { ko: '포수', f: (p) => p.position === 'C', share: 1 / 9 },
  IF: { ko: '내야수', f: (p) => IF.includes(p.position), share: 4 / 9 },
  OF: { ko: '외야수', f: (p) => p.position === 'OF', share: 3 / 9 },
  L: { ko: '좌타자', f: (p) => p.type === 'batter' && p.hand === 'L', share: 0.42 },
  R: { ko: '우타자', f: (p) => p.type === 'batter' && p.hand === 'R', share: 0.67 },
  slugger: { ko: '장타자', f: (p) => p.type === 'batter' && (p.stats?.power ?? 0) >= 90, share: 0.45 },
  hitter: { ko: '교타자', f: (p) => p.type === 'batter' && (p.stats?.contact ?? 0) >= 90, share: 0.45 },
  foreign: { ko: '외국인', f: (p) => !!p.isForeign, share: 0.06 },
  cheap: { ko: 'CP 낮은 10명', f: (p) => !!p.cheap10, share: 0.3 }, // 엔트리에서 CP 가 가장 낮은 10명(match.js applyStaff 가 표시) — 처음 받은 엔트리든 다 키운 팀이든 늘 10명
};
/* ability = 그 선수의 주 능력 전부(타자 컨택 · 파워 / 투수 구위 · 제구) — 화면엔 '능력' 한 칸 */
export const STAT_KO = { contact: '컨택', power: '파워', speed: '주루', defense: '수비', stuff: '구위', control: '제구', stamina: '체력', ability: '능력' };
export const TEAM_KO = { steal: '도루 성공', rest: '투수 휴식', calm: '나쁜 날 흔들림' };
const ABILITY = { batter: ['contact', 'power'], pitcher: ['stuff', 'control'] };

/*
 * 1칸이 올리는 승률(%p) — 같은 전력 두 팀 12,000경기씩 시뮬(2026-09-30), 흔히 쓰는 크기에서 잰 값:
 *   컨택 +8 → +17.1 · 파워 +6 → +7.3 · 수비 +12 → +9.8 · 제구 +6 → +3.2 · 구위·제구 +8 → +13.8 · 주루 +6 → +1.9
 *   체력 +10 → +0.3 · 도루 +5%p → +0.1 · 선수 전원 +1 → +6.5
 * ponytail: rest · calm 은 한 경기 시뮬로 못 재서 어림값 — 연속 경기(시즌) 시뮬이 생기면 다시 잰다
 */
const STAT_W = { contact: 2.1, power: 1.2, speed: 0.25, defense: 1.0, stuff: 1.2, control: 0.55, stamina: 0.02 };
const BAT_WHO = new Set(['batter', 'C', 'IF', 'OF', 'L', 'R', 'slugger', 'hitter']);
const ARM_WHO = new Set(['pitcher', 'SP', 'RP']);
const abilityW = (who) => (BAT_WHO.has(who) ? STAT_W.contact + STAT_W.power : ARM_WHO.has(who) ? STAT_W.stuff + STAT_W.control
  : STAT_W.contact + STAT_W.power + STAT_W.stuff + STAT_W.control);
const TEAM_W = { steal: 5, rest: 2, calm: 9 }; // steal 0.01 당 0.05 · rest 1경기 · calm 0.5(나쁜 날 절반) ≈ 전원 +0.7
/*
 * 1%p = 몇 CP — 실제 경기 흐름(readyRoster → matchTeamOf)으로 CP 대비 종합을 알뜰히 채운 팀끼리 2,000경기(2026-09-30):
 * 선수 CP −50 → −8.9%p · −100 → −14.5%p  ⇒ 1 CP ≈ 0.15%p
 */
export const CP_PER_PCT = 6.5;

/* 감독 야구 색깔 — 급 1 기준 한 줄. 급 2 ×1.15 · 급 3 ×1.3 */
const r = (who, stat, v) => ({ who, stat, v });
export const STYLES = {
  attack: { ko: '공격 강화', rule: r('batter', 'ability', 4) }, // 컨택 · 파워 둘 다
  defense: { ko: '수비 강화', rule: r('batter', 'defense', 12) },
  starter: { ko: '선발 강화', rule: r('SP', 'ability', 8) },
  bullpen: { ko: '불펜 강화', rule: r('RP', 'ability', 12) },
  care: { ko: '체력 관리', rule: { team: 'rest', v: 1 } },
  trust: { ko: '컨디션 관리', rule: { team: 'calm', v: 0.5 } },
  develop: { ko: '유망주 육성', rule: r('cheap', 'ability', 6) },
  foreign: { ko: '외국인 강화', rule: r('foreign', 'ability', 14) },
  data: { ko: '전체 강화', rule: r('all', 'ability', 2) },
  run: { ko: '주루 강화', rule: r('batter', 'speed', 16) },
};
const GRADE = [1, 1, 1.15, 1.3];

/* 휴식 · 흔들림은 급 · 강화로 커지지 않는다(휴식은 경기 수 · 흔들림은 비율) */
const FIXED = new Set(['rest', 'calm']);

/** 한 사람의 효과(급 반영 · 강화 전) */
function baseRules(s) {
  if (s.role === 'manager') {
    const x = STYLES[s.style]?.rule;
    return x ? [FIXED.has(x.team) ? x : { ...x, v: x.v * GRADE[s.grade || 1] }] : [];
  }
  return s.rules || [];
}

/** 효과 한 줄이 올리는 승률(%p) */
export const ruleValue = (x) => (x.team ? (TEAM_W[x.team] || 0) * x.v
  : (x.stat === 'ability' ? abilityW(x.who) : STAT_W[x.stat] || 0) * x.v * (WHO[x.who]?.share ?? 0));
/** 화면 갈래 — 타격 · 수비 · 투수 · 주루 · 운영 */
const STAT_CAT = { contact: 'bat', power: 'bat', defense: 'field', stuff: 'pitch', control: 'pitch', stamina: 'pitch', speed: 'run' };
export const ruleCat = (x) => (x.team ? (x.team === 'steal' ? 'run' : 'ops')
  : x.stat === 'ability' ? (ARM_WHO.has(x.who) ? 'pitch' : BAT_WHO.has(x.who) ? 'bat' : 'all') : STAT_CAT[x.stat]);
/** 효과가 올리는 승률(%p) — CP 를 매기는 값. 강화는 넣지 않는다(산 값은 그대로) */
export const staffValue = (s) => baseRules(s).reduce((t, x) => t + ruleValue(x), 0);
const costOf = (s) => Math.max(15, Math.round(staffValue(s) * CP_PER_PCT));

/* 후보 데이터: src/data/staff/*.json. id 는 사용자 저장 데이터가 기억하므로 바꾸지 않는다 */
export const STAFF = [...managers, ...coaches].map(({ source, ...s }) => ({ ...s, cost: costOf(s), isStaff: true }));
export const staffByRole = (role) => STAFF.filter((s) => s.role === role);
export const styleOf = (s) => (s?.role === 'manager' ? STYLES[s.style] || null : null);

export const CHEAP_N = 10;

/**
 * 아직 비어 있는 코치 자리를 채우는 데 드는 CP — 가운데 값 후보 기준.
 * 선수로 캡을 다 써 버리면 감독·코치를 못 앉히니 자동 채우기가 이만큼 남겨 둔다.
 * 가장 비싼 후보(명장 100 CP 넘음)로 잡으면 코치진을 안 쓰는 사람도 선수 자리가 300 CP 가까이 줄어 가운데 값으로.
 */
export function staffReserve(staff = {}) {
  return ['manager', 'head', 'batting', 'pitching'].reduce((total, slot) => {
    if (staff[slot]) return total;
    const costs = staffByRole(slot).map((s) => s.cost || 0).sort((a, b) => a - b);
    return total + (costs.length ? costs[Math.floor(costs.length / 2)] : 0);
  }, 0);
}

export const STAFF_LEVEL_MAX = 5;
export const levelMul = (s) => 1 + 0.2 * (Math.max(1, Math.min(STAFF_LEVEL_MAX, s?.level || 1)) - 1);

/** 이 사람의 지금 효과 — 급 · 강화까지 곱한 값. 능력치는 정수, 팀 운영은 소수 둘째 자리 */
export function staffRules(s) {
  if (!s) return [];
  const mul = levelMul(s);
  return baseRules(s).map((x) => {
    const v = FIXED.has(x.team) ? x.v : x.v * mul;
    return { ...x, v: x.team ? Math.round(v * 100) / 100 : Math.round(v) };
  }).filter((x) => x.v);
}

/** 코치진 팀 운영 합계 { steal, rest, calm } — 경기 준비(prep) · 경기 뒤 피로(fatigue)가 읽는다 */
export function staffTeam(staff = {}) {
  const sum = { steal: 0, rest: 0, calm: 0 };
  for (const s of Object.values(staff)) for (const x of staffRules(s)) if (x.team) sum[x.team] += x.v;
  sum.rest = Math.floor(sum.rest);
  sum.calm = Math.min(0.8, sum.calm);
  return sum;
}

/** 선수 한 명에게 닿는 능력치 보정 { stat: n } — '능력'은 그 선수의 주 능력 둘에 */
export function staffBoostFor(p, staff = {}) {
  const out = {};
  for (const s of Object.values(staff)) {
    for (const x of staffRules(s)) {
      if (x.team || !WHO[x.who]?.f(p)) continue;
      for (const k of x.stat === 'ability' ? ABILITY[p.type] || [] : [x.stat]) out[k] = (out[k] || 0) + x.v;
    }
  }
  return out;
}

/** 이 사람 효과가 닿는 내 엔트리 선수 수 — 휴식은 투수 · 흔들림은 엔트리 전원 · 도루는 타자 */
export function staffTargets(s, squad = []) {
  const x = staffRules(s)[0];
  if (!x) return 0;
  if (x.team) return squad.filter((p) => (x.team === 'rest' ? p.type === 'pitcher' : x.team === 'steal' ? p.type === 'batter' : true)).length;
  if (x.who === 'cheap') return Math.min(CHEAP_N, squad.length);
  return squad.filter((p) => WHO[x.who]?.f(p)).length;
}

/* 효과 설명 한 줄 — 어떤 능력이 오르는지(화면에서 효과 이름 오른쪽) */
const STAT_DESC = { contact: '안타 확률', power: '장타 · 홈런', speed: '주루 · 도루', defense: '타구 처리', stuff: '헛스윙 · 피안타 억제', control: '볼넷 억제', stamina: '던질 수 있는 공 수' };
const WHO_DESC = { slugger: '파워 90↑ 타자', hitter: '컨택 90↑ 타자' }; // 이름만으로 기준을 모르는 조건만 — 좌타자 · 외국인 · CP 낮은 10명은 이름이 곧 기준
const TEAM_DESC = { steal: '도루 성공 확률', rest: '등판 뒤 쉬는 경기 수', calm: '컨디션 나쁜 날 하락 폭' };
export function ruleDesc(x) {
  if (x.team) return TEAM_DESC[x.team] || '';
  const what = x.stat !== 'ability' ? STAT_DESC[x.stat]
    : BAT_WHO.has(x.who) ? '컨택 · 파워' : ARM_WHO.has(x.who) ? '구위 · 제구' : '컨택 · 파워 · 구위 · 제구';
  return [WHO_DESC[x.who], what].filter(Boolean).join(' · ');
}

/** 화면용 한 줄 — '타자 컨택 +6' · '투수 휴식 −1경기' · '도루 성공 +8%p' */
export function ruleText(x) {
  if (x.team === 'steal') return { label: TEAM_KO.steal, n: `+${Math.round(x.v * 100)}%p` };
  if (x.team === 'rest') return { label: TEAM_KO.rest, n: `−${x.v}경기` };
  if (x.team === 'calm') return { label: TEAM_KO.calm, n: `−${Math.round(x.v * 100)}%` };
  return { label: `${WHO[x.who]?.ko || ''} ${STAT_KO[x.stat] || x.stat}`, n: `${x.v > 0 ? '+' : '−'}${Math.abs(x.v)}` };
}
