/*
 * 시즌 기록 → 능력치. 규격은 src/data/SERIES_SPEC.md 의 '능력치 기준'을 그대로 코드로 옮긴 것이다.
 * 시리즈 JSON 을 손으로 쓰지 않고 기록 파일(KBO 기록실 내보내기)에서 만들 때 쓴다.
 *
 *   import { batRating, pitRating } from './stat-to-rating.mjs';
 *   batRating({ avg: .314, hr: 50, sb: 1, pos: '1B', norms })
 *   pitRating({ ip: 197.1, era: 2.60, so: 142, bb: 40, whip: 1.10, role: 'SP', norms })
 *
 * 돌려주는 값은 50~110 정수, 리그 평균이 78 이다.
 * 기록을 그대로 재지 않고 그 시즌 리그 평균과 견준다 — 1982년은 K/9 이 4.1, 2024년은 8.1 이라
 * 같은 탈삼진이라도 시대에 따라 값이 다르기 때문이다. norms 는 data/kbo/league.json 의 그 해 항목이다.
 */

export const FLOOR = 50;
export const CEIL = 110;
export const MID = 78;
const clamp = (v) => Math.max(FLOOR, Math.min(CEIL, Math.round(v)));

/** 구간표 사이를 곧은 선으로 잇는다 — [입력, 값] 이 커지는 순서 */
function curve(points, x) {
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    if (x <= x2) return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
  }
  return last[1];
}

/** 리그 평균이 없을 때 쓰는 값 — 2020년대 평균쯤 */
export const DEFAULT_NORMS = { avg: 0.2790, hr: 14.5, sb: 9.5, k9: 7.8, bb9: 3.3, era: 4.5, ip: 132 };
const normsOf = (n) => ({ ...DEFAULT_NORMS, ...(n || {}) });
/** 리그 대비 몇 배인가 — 0으로 나누지 않게 */
const ratio = (v, base) => (base > 0 ? v / base : 1);

/* ───── 타자 ───── 리그 평균이 1.0 = 78 */
const CONTACT = [[0.62, 50], [0.78, 62], [0.90, 70], [1.00, 78], [1.08, 85], [1.16, 92], [1.25, 100], [1.40, 110]];
const POWER = [[0, 52], [0.25, 61], [0.5, 69], [0.8, 76], [1.0, 80], [1.4, 88], [2.0, 97], [2.8, 105], [3.6, 110]];
const SPEED = [[0, 55], [0.2, 64], [0.5, 72], [1.0, 81], [1.8, 92], [2.8, 101], [4.0, 110]];
/** 자리별 기본 수비 — 골든글러브급은 fielding 으로 따로 올린다 */
const DEF_BASE = { C: 88, SS: 90, '2B': 85, '3B': 79, OF: 82, '1B': 59, DH: 55, SP: 55, RP: 55 };
const DEF_BUMP = { gg: 16, good: 8, ok: 0, poor: -11 };

/**
 * @param avg 타율 · hr 홈런 · sb 도루 · pos 주 포지션 · pa 타석(적으면 홈런·도루를 풀시즌으로 환산)
 * @param fielding 수비 평판: 'gg'(골든글러브급) · 'good' · 'ok'(기본) · 'poor'
 * @param norms 그 시즌 리그 평균 (data/kbo/league.json)
 */
export function batRating({ avg, hr = 0, sb = 0, pos = 'OF', pa = 550, fielding = 'ok', norms = null }) {
  const n = normsOf(norms);
  const scale = pa > 0 && pa < 500 ? 550 / Math.max(120, pa) : 1;   // 부분 시즌은 550타석 기준으로
  return {
    contact: clamp(curve(CONTACT, ratio(avg, n.avg))),
    power: clamp(curve(POWER, ratio(hr * scale, n.hr))),
    speed: clamp(curve(SPEED, ratio(sb * scale, n.sb))),
    defense: clamp((DEF_BASE[pos] ?? 72) + (DEF_BUMP[fielding] ?? 0)),
  };
}

/* ───── 투수 ───── 탈삼진·이닝은 많을수록, 볼넷·평균자책은 적을수록 좋다 */
const STUFF = [[0.45, 50], [0.65, 62], [0.82, 70], [1.0, 78], [1.18, 87], [1.35, 95], [1.6, 104], [1.9, 110]];
const CONTROL = [[0.45, 50], [0.65, 62], [0.82, 70], [1.0, 78], [1.25, 88], [1.6, 98], [2.1, 106], [2.8, 110]];
const STABILITY = [[0.5, 50], [0.7, 62], [0.85, 70], [1.0, 78], [1.2, 88], [1.45, 97], [1.8, 105], [2.3, 110]];
const STAMINA = [[0.25, 50], [0.45, 60], [0.7, 70], [1.0, 80], [1.25, 90], [1.45, 98], [1.7, 106], [2.0, 110]];

/** 이닝을 소수로 — KBO 기록실 표기 '197 1/3' 과 '197.1'(197과 3분의 1) 을 모두 받는다 */
export const ipOf = (ip) => {
  const t = String(ip).trim();
  if (t.includes('/')) {
    const m = t.match(/^(\d+)?\s*(?:(\d)\/(\d))?$/);
    if (m) return Number(m[1] || 0) + (m[2] ? Number(m[2]) / Number(m[3]) : 0);
  }
  const n = Number(t);
  if (!Number.isFinite(n)) return 0;
  const whole = Math.trunc(n);
  const frac = Math.round((n - whole) * 10);
  return whole + (frac === 1 ? 1 / 3 : frac === 2 ? 2 / 3 : 0);
};

/**
 * @param ip 이닝(197.1 표기 그대로) · era 평균자책 · so 탈삼진 · bb 볼넷 · whip · role 'SP'|'RP'
 * @param norms 그 시즌 리그 평균
 */
export function pitRating({ ip, era, so = 0, bb = 0, whip = null, role = 'SP', norms = null }) {
  const n = normsOf(norms);
  const innings = ipOf(ip);
  const k9 = innings > 0 ? (so * 9) / innings : 0;
  const bb9 = innings > 0 ? (bb * 9) / innings : n.bb9 * 1.3;

  let stuff = curve(STUFF, ratio(k9, n.k9));
  if (era > 0 && era < n.era * 0.6) stuff += 5;          // 맞혀 잡는 압도적인 해
  if (era > n.era * 1.3) stuff -= 5;
  let stability = curve(STABILITY, era > 0 ? ratio(n.era, era) : 1);
  if (whip != null) { if (whip < 1.05) stability += 4; if (whip > 1.45) stability -= 4; }
  /* 불펜은 이닝이 애초에 적다 — 선발과 같은 잣대로 재지 않고 따로 낮게 둔다 */
  const stamina = role === 'RP'
    ? clamp(55 + Math.min(18, innings / 4))
    : curve(STAMINA, ratio(innings, n.ip));
  return {
    stuff: clamp(stuff),
    control: clamp(curve(CONTROL, ratio(n.bb9, bb9))),
    stamina: clamp(stamina),
    stability: clamp(stability),
  };
}

/** 기록 한 줄 → source 문구 (규격: 근거 기록 한 줄 + 출처) */
export const batSource = (r, from = 'statiz') =>
  `${r.avg.toFixed(3).replace(/^0/, '')}${r.obp ? `/${r.obp.toFixed(3).replace(/^0/, '')}` : ''} ${r.hr}HR ${r.sb}SB ${r.pa}PA — ${from}`;
export const pitSource = (r, from = 'statiz') =>
  `${r.ip}IP ERA${Number(r.era).toFixed(2)} ${r.so}K ${r.bb}BB${r.whip ? ` WHIP${Number(r.whip).toFixed(2)}` : ''}${r.w ? ` ${r.w}승` : ''}${r.sv ? ` ${r.sv}SV` : ''}${r.hld ? ` ${r.hld}HLD` : ''} — ${from}`;
