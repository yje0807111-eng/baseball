/*
 * 코치진: 감독 1 · 수석 1 · 타격 1 · 수비(투수) 1  (규칙: src/data/STAFF_SPEC.md)
 *
 * 효과는 규칙 한 줄씩 — { who, stat, v } (누구의 · 어떤 능력치를 · 얼마나) 또는 { team, v } (팀 전체 운영).
 *   감독: 야구 색깔(STYLES) 하나 × 급(grade 1~3). 색깔마다 대가(− 규칙)가 있을 수 있다.
 *         감독과 같은 구단(clubs) 선수가 엔트리에 CLUB_NEED 명 이상이면 + 규칙이 ×1.5 (구단 궁합)
 *   코치: 사람마다 rules 를 직접 — 조건(좌타 · 장타자 · 선발 · 내야 …)이 붙는 전문 효과
 *   강화: 레벨마다 + 규칙 ×(1 + 0.2 × (Lv − 1)) — 어떤 효과든 똑같이 커진다(대가는 그대로)
 * CP 는 효과가 올리는 승률로 매긴다(staffValue) — 1%p ≈ 4 CP, 선수에 CP 를 쓰는 것과 같은 값어치
 */
import managers from '../data/staff/managers.json';
import coaches from '../data/staff/coaches.json';

/* 조건 — share 는 그 조건에 드는 몫(가치 계산용). 타자 손 · 장타 · 교타 몫은 전체 선수 데이터에서 셈(좌타 32% · 파워 90↑ 23% · 컨택 90↑ 23%) */
const IF = ['1B', '2B', '3B', 'SS'];
export const WHO = {
  batter: { ko: '타자', f: (p) => p.type === 'batter', share: 1 },
  pitcher: { ko: '투수', f: (p) => p.type === 'pitcher', share: 1 },
  SP: { ko: '선발', f: (p) => p.position === 'SP', share: 0.6 }, // 선발이 맡는 이닝 몫
  RP: { ko: '불펜', f: (p) => p.position === 'RP', share: 0.4 },
  C: { ko: '포수', f: (p) => p.position === 'C', share: 1 / 9 },
  IF: { ko: '내야수', f: (p) => IF.includes(p.position), share: 4 / 9 },
  OF: { ko: '외야수', f: (p) => p.position === 'OF', share: 3 / 9 },
  L: { ko: '좌타자', f: (p) => p.type === 'batter' && p.hand === 'L', share: 0.32 },
  R: { ko: '우타자', f: (p) => p.type === 'batter' && p.hand === 'R', share: 0.67 },
  slugger: { ko: '장타자', f: (p) => p.type === 'batter' && (p.stats?.power ?? 0) >= 90, share: 0.3 },
  hitter: { ko: '교타자', f: (p) => p.type === 'batter' && (p.stats?.contact ?? 0) >= 90, share: 0.3 },
  foreign: { ko: '외국인', f: (p) => !!p.isForeign, share: 0.12 },
  cheap: { ko: '싼 선수', f: (p) => (p.cost || 0) <= 80, share: 0.35 },
};
export const STAT_KO = { contact: '컨택', power: '파워', speed: '주루', defense: '수비', stuff: '구위', control: '제구', stamina: '체력' };
export const TEAM_KO = { steal: '도루 성공', rest: '투수 휴식', calm: '나쁜 날 흔들림' };

/*
 * 1칸이 올리는 승률(%p) — 같은 전력 두 팀 12,000경기씩 시뮬(2026-09-30), 흔히 쓰는 크기에서 잰 값:
 *   컨택 +8 → +17.1 · 파워 +6 → +7.3 · 수비 +12 → +9.8 · 제구 +6 → +3.2 · 구위·제구 +8 → +13.8 · 주루 +6 → +1.9
 *   체력 +10 → +0.3 · 도루 +5%p → +0.1 · 선수 전원 +1 → +6.5(≈ 26 CP → 1 CP ≈ 0.25%p)
 *   맞춰 보기: 공격 야구(컨택 +7 · 파워 +5 · 제구 −3) 예측 +19.1 → 시뮬 +18.9
 * ponytail: rest · calm 은 한 경기 시뮬로 못 재서 어림값 — 연속 경기(시즌) 시뮬이 생기면 다시 잰다
 */
const STAT_W = { contact: 2.1, power: 1.2, speed: 0.32, defense: 0.85, stuff: 1.2, control: 0.55, stamina: 0.02 };
const TEAM_W = { steal: 5, rest: 2, calm: 5 }; // steal 1.00 = +100%p 이니 0.01 당 0.05 · rest 1경기 · calm 0.5 ≈ 전원 +0.37
export const CP_PER_PCT = 4;

/* 감독 야구 색깔 — 급 1 기준. 급 2 ×1.15 · 급 3 ×1.3 (+ 규칙만) */
const r = (who, stat, v) => ({ who, stat, v });
export const STYLES = {
  attack: { ko: '공격 야구', rules: [r('batter', 'contact', 6), r('batter', 'power', 4), r('pitcher', 'control', -3)] },
  defense: { ko: '지키는 야구', rules: [r('batter', 'defense', 9), r('pitcher', 'control', 3), r('batter', 'power', -3)] },
  starter: { ko: '선발 야구', rules: [r('SP', 'stuff', 8), r('SP', 'control', 8), r('RP', 'control', -2)] },
  bullpen: { ko: '벌떼 불펜', rules: [r('RP', 'stuff', 10), r('RP', 'control', 10), r('SP', 'stamina', -10)] },
  care: { ko: '투수 관리', rules: [{ team: 'rest', v: 1 }, r('pitcher', 'stamina', 8), r('pitcher', 'control', 2)] },
  trust: { ko: '믿음의 야구', rules: [{ team: 'calm', v: 0.5 }, r('batter', 'contact', 2)] }, // 나쁜 날 흔들림 절반 · 대신 좋은 날도 ¾ (form.js)
  develop: { ko: '육성', rules: [r('cheap', 'contact', 7), r('cheap', 'power', 4), r('cheap', 'stuff', 6), r('cheap', 'control', 6), r('foreign', 'contact', -3), r('foreign', 'stuff', -3)] },
  foreign: { ko: '외국인 활용', rules: [r('foreign', 'contact', 12), r('foreign', 'power', 12), r('foreign', 'stuff', 12), r('foreign', 'control', 12)] },
  run: { ko: '뛰는 야구', rules: [r('batter', 'speed', 16), r('batter', 'contact', 3), { team: 'steal', v: 0.08 }, r('batter', 'power', -3)] },
};
const GRADE = [1, 1, 1.15, 1.3];

/* 구단 — 선수 데이터의 옛 이름까지(해태 → KIA 등). 감독 clubs 는 이 키 */
const CLUB_RE = { kia: /해태|KIA/, samsung: /삼성/, lotte: /^롯데/, lg: /MBC|LG/, doosan: /OB|두산/, hanwha: /빙그레|한화/,
  sk: /^SK|SSG/, hyundai: /^(삼미|청보|태평양|현대)$/, kiwoom: /히어로즈|넥센|키움/, nc: /^NC/, kt: /^KT/ };
export const CLUB_KO = { kia: 'KIA', samsung: '삼성', lotte: '롯데', lg: 'LG', doosan: '두산', hanwha: '한화', sk: 'SSG', hyundai: '현대', kiwoom: '키움', nc: 'NC', kt: 'KT' };
export const clubOf = (p) => Object.keys(CLUB_RE).find((k) => CLUB_RE[k].test(p?.team || '')) || null;
export const CLUB_NEED = 6;
export const CLUB_MUL = 1.5;

/* 휴식 · 흔들림은 급 · 강화 · 궁합으로 커지지 않는다(휴식은 경기 수 · 흔들림은 비율) */
const FIXED = new Set(['rest', 'calm']);

/** 한 사람의 규칙(급 · 강화 · 구단 궁합 반영 전 = 급만) */
function baseRules(s) {
  if (s.role === 'manager') {
    const st = STYLES[s.style];
    const g = GRADE[s.grade || 1];
    return (st?.rules || []).map((x) => (x.v > 0 && !FIXED.has(x.team) ? { ...x, v: x.v * g } : x));
  }
  return s.rules || [];
}

/** 규칙 한 줄이 올리는 승률(%p) */
export const ruleValue = (x) => (x.team ? (TEAM_W[x.team] || 0) * x.v : (STAT_W[x.stat] || 0) * x.v * (WHO[x.who]?.share ?? 0));
/** 화면 갈래 — 타격 · 수비 · 투수 · 주루 · 운영 */
const STAT_CAT = { contact: 'bat', power: 'bat', defense: 'field', stuff: 'pitch', control: 'pitch', stamina: 'pitch', speed: 'run' };
export const ruleCat = (x) => (x.team ? (x.team === 'steal' ? 'run' : 'ops') : STAT_CAT[x.stat]);
/** 효과가 올리는 승률(%p) — CP 를 매기는 값. 강화 · 궁합은 넣지 않는다(산 값은 그대로) */
export const staffValue = (s) => baseRules(s).reduce((t, x) => t + ruleValue(x), 0);
const costOf = (s) => Math.max(15, Math.round(staffValue(s) * CP_PER_PCT));

/* 후보 데이터: src/data/staff/*.json. id 는 사용자 저장 데이터가 기억하므로 바꾸지 않는다 */
export const STAFF = [...managers, ...coaches].map(({ source, ...s }) => ({ ...s, cost: costOf(s), isStaff: true }));
export const staffByRole = (role) => STAFF.filter((s) => s.role === role);
export const styleOf = (s) => (s?.role === 'manager' ? STYLES[s.style] || null : null);

/**
 * 아직 비어 있는 코치 자리를 채우는 데 드는 CP — 가장 비싼 후보 기준.
 * 선수로 캡을 다 써 버리면 감독·코치를 못 앉히니 자동 채우기가 이만큼 남겨 둔다.
 */
export function staffReserve(staff = {}) {
  return ['manager', 'head', 'batting', 'pitching'].reduce((total, slot) => {
    if (staff[slot]) return total;
    const cands = staffByRole(slot);
    return total + (cands.length ? Math.max(...cands.map((s) => s.cost || 0)) : 0);
  }, 0);
}

export const STAFF_LEVEL_MAX = 5;
export const levelMul = (s) => 1 + 0.2 * (Math.max(1, Math.min(STAFF_LEVEL_MAX, s?.level || 1)) - 1);
/** 감독 구단 궁합 — 엔트리에서 감독 구단 선수 수 · 켜졌나 */
export function clubBond(s, squad = []) {
  if (s?.role !== 'manager' || !s.clubs?.length) return { n: 0, on: false };
  const n = squad.filter((p) => s.clubs.includes(clubOf(p))).length;
  return { n, on: n >= CLUB_NEED };
}

/** 이 사람의 지금 규칙 — 급 · 강화 · 궁합까지 곱한 값. 능력치는 정수, 팀 규칙은 소수 둘째 자리 */
export function staffRules(s, squad = []) {
  if (!s) return [];
  const mul = levelMul(s) * (clubBond(s, squad).on ? CLUB_MUL : 1);
  return baseRules(s).map((x) => {
    const v = x.v > 0 && !FIXED.has(x.team) ? x.v * mul : x.v;
    return { ...x, v: x.team ? Math.round(v * 100) / 100 : Math.round(v) };
  }).filter((x) => x.v);
}

/** 코치진 팀 운영 합계 { steal, rest, calm } — 경기 준비(prep) · 경기 뒤 피로(fatigue)가 읽는다 */
export function staffTeam(staff = {}, squad = []) {
  const sum = { steal: 0, rest: 0, calm: 0 };
  for (const s of Object.values(staff)) for (const x of staffRules(s, squad)) if (x.team) sum[x.team] += x.v;
  sum.rest = Math.floor(sum.rest);
  sum.calm = Math.min(0.8, sum.calm);
  return sum;
}

/** 선수 한 명에게 닿는 능력치 보정 { stat: n } */
export function staffBoostFor(p, staff = {}, squad = []) {
  const out = {};
  for (const s of Object.values(staff)) {
    for (const x of staffRules(s, squad)) if (!x.team && WHO[x.who]?.f(p)) out[x.stat] = (out[x.stat] || 0) + x.v;
  }
  return out;
}

/** 화면용 한 줄 — '타자 컨택 +6' · '투수 휴식 −1경기' · '도루 성공 +8%p' */
export function ruleText(x) {
  if (x.team === 'steal') return { label: TEAM_KO.steal, n: `${x.v > 0 ? '+' : '−'}${Math.round(Math.abs(x.v) * 100)}%p` };
  if (x.team === 'rest') return { label: TEAM_KO.rest, n: `−${x.v}경기` };
  if (x.team === 'calm') return { label: TEAM_KO.calm, n: `−${Math.round(x.v * 100)}%` };
  return { label: `${WHO[x.who]?.ko || ''} ${STAT_KO[x.stat] || x.stat}`, n: `${x.v > 0 ? '+' : '−'}${Math.abs(x.v)}` };
}
