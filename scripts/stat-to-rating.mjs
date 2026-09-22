/*
 * 시즌 기록 → 능력치. 규격은 src/data/SERIES_SPEC.md 의 '능력치 기준'을 그대로 코드로 옮긴 것이다.
 * 시리즈 JSON 을 손으로 쓰지 않고 기록 파일(스탯티즈 · KBO 기록실 내보내기)에서 만들 때 쓴다.
 *
 *   import { batRating, pitRating } from './stat-to-rating.mjs';
 *   batRating({ avg: .314, hr: 50, sb: 1, pos: '1B', year: 2025 })
 *   pitRating({ ip: 197.1, era: 2.60, so: 142, bb: 40, whip: 1.10, role: 'SP', year: 2025 })
 *
 * 돌려주는 값은 40~99 정수다. 전설적인 시즌(MVP · 타이틀)은 +2~4 까지 손으로 더 올려도 된다.
 */

const clamp = (v) => Math.max(40, Math.min(99, Math.round(v)));
/** 구간표 사이를 곧은 선으로 잇는다 — [입력, 값] 이 커지는 순서 */
function curve(points, x) {
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    if (x <= x2) return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
  }
  return last[1];
}

/* 시대 보정 — 타고투저 해는 타자를 조금 깎고 투수 안정을 올린다 */
const HIGH_OFFENSE = new Set([1999, 2000, 2014, 2015, 2016, 2017, 2018, 2020]);
const LOW_OFFENSE = (y) => y >= 1980 && y <= 1995;
export const eraAdjust = (year) => (HIGH_OFFENSE.has(year) ? { bat: -2, stability: 3 } : LOW_OFFENSE(year) ? { bat: 2, stability: -3 } : { bat: 0, stability: 0 });

/* ───── 타자 ───── */
const CONTACT = [[0.200, 44], [0.240, 60], [0.270, 70], [0.300, 80], [0.320, 86], [0.340, 92], [0.360, 97], [0.400, 99]];
const POWER = [[0, 40], [5, 50], [10, 60], [20, 72], [25, 78], [30, 84], [40, 92], [50, 98], [60, 99]];
const SPEED = [[0, 42], [5, 55], [10, 64], [20, 76], [30, 84], [40, 90], [50, 95], [70, 99]];
/** 자리별 기본 수비 — 골든글러브급은 fielding 으로 따로 올린다 */
const DEF_BASE = { C: 80, SS: 82, '2B': 78, '3B': 74, OF: 76, '1B': 58, DH: 50, SP: 50, RP: 50 };

/**
 * @param avg 타율 · hr 홈런 · sb 도루 · pos 주 포지션 · pa 타석(적으면 홈런을 풀시즌으로 환산)
 * @param fielding 수비 평판: 'gg'(골든글러브급) · 'good' · 'ok'(기본) · 'poor'
 */
export function batRating({ avg, hr = 0, sb = 0, pos = 'OF', pa = 550, year = 2025, fielding = 'ok' }) {
  const full = pa > 0 && pa < 500 ? hr * (550 / Math.max(120, pa)) : hr;   // 부분 시즌은 550타석 기준으로
  const adj = eraAdjust(year).bat;
  const def = DEF_BASE[pos] ?? 70;
  const bump = { gg: 12, good: 6, ok: 0, poor: -8 }[fielding] ?? 0;
  return {
    contact: clamp(curve(CONTACT, avg) + adj),
    power: clamp(curve(POWER, full) + adj),
    speed: clamp(curve(SPEED, sb) + adj),
    defense: clamp(def + bump),
  };
}

/* ───── 투수 ───── */
const STUFF = [[3, 50], [5, 62], [7, 72], [8, 78], [9, 84], [10, 90], [12, 95], [14, 99]];
const CONTROL = [[6, 44], [5, 52], [4, 60], [3, 72], [2.5, 78], [2, 84], [1.5, 90], [1.2, 94], [0.8, 97]];
const STAMINA = [[40, 45], [80, 58], [100, 66], [130, 74], [160, 82], [180, 88], [200, 93], [250, 97], [300, 99]];
const STABILITY = [[2.0, 94], [2.5, 90], [3.0, 85], [3.5, 80], [4.0, 74], [4.5, 68], [5.0, 62], [6.0, 52], [7.0, 45]];

/** x 가 내림차순인 구간표(제구)는 뒤집어 읽는다 */
const curveDown = (points, x) => curve([...points].reverse(), x);
/** 이닝 표기 '197.1'(197과 1/3) 을 소수로 */
export const ipOf = (ip) => {
  const n = Number(ip);
  if (!Number.isFinite(n)) return 0;
  const whole = Math.trunc(n);
  const frac = Math.round((n - whole) * 10);
  return whole + (frac === 1 ? 1 / 3 : frac === 2 ? 2 / 3 : 0);
};

/**
 * @param ip 이닝(197.1 표기 그대로) · era 평균자책 · so 탈삼진 · bb 볼넷 · whip · role 'SP'|'RP'
 */
export function pitRating({ ip, era, so = 0, bb = 0, whip = null, role = 'SP', year = 2025 }) {
  const innings = ipOf(ip);
  const k9 = innings > 0 ? (so * 9) / innings : 0;
  const bb9 = innings > 0 ? (bb * 9) / innings : 4;
  let stuff = curve(STUFF, k9);
  if (era < 2.5) stuff += 4;
  if (era > 5.0) stuff -= 4;
  let stability = curve(STABILITY, era) + eraAdjust(year).stability;
  if (whip != null) { if (whip < 1.0) stability += 3; if (whip > 1.5) stability -= 3; }
  const stamina = role === 'RP'
    ? clamp(45 + Math.min(15, innings / 5))          // 불펜은 45~60
    : curve(STAMINA, innings);
  return {
    stuff: clamp(stuff),
    control: clamp(curveDown(CONTROL, bb9)),
    stamina: clamp(stamina),
    stability: clamp(stability),
  };
}

/** 기록 한 줄 → source 문구 (규격: 근거 기록 한 줄 + 출처) */
export const batSource = (r, from = 'statiz') =>
  `${r.avg.toFixed(3).replace(/^0/, '')}${r.obp ? `/${r.obp.toFixed(3).replace(/^0/, '')}` : ''} ${r.hr}HR ${r.sb}SB ${r.pa}PA — ${from}`;
export const pitSource = (r, from = 'statiz') =>
  `${r.ip}IP ERA${Number(r.era).toFixed(2)} ${r.so}K ${r.bb}BB${r.whip ? ` WHIP${Number(r.whip).toFixed(2)}` : ''}${r.w ? ` ${r.w}승` : ''}${r.sv ? ` ${r.sv}SV` : ''}${r.hld ? ` ${r.hld}HLD` : ''} — ${from}`;
