/* 경기 연출 — 위에서 내려다본 구장. 타구는 결과에 맞는 '구역' 안 어딘가로 매번 다르게 떨어진다 */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';

const W = 1400, H = 760;
const OFF = '#34d399';   // 공격
const DEF = '#f87171';   // 수비
/* 배경 그림에서 잰 자리 */
const HOME = [703, 622], MOUND = [703, 398], B1 = [1043, 398], B2 = [703, 262], B3 = [360, 398];
const BOX = { R: [668, 646], L: [739, 646] };   // 우타석(3루 쪽) · 좌타석(1루 쪽)
/* 타자 성향 — 손과 당겨치는 정도 */
const BATTER = {
  '우타 강타자': { hand: 'R', pull: 0.17, power: 1.06 },
  '우타 교타자': { hand: 'R', pull: 0.05, power: 0.94 },
  '좌타 교타자': { hand: 'L', pull: 0.05, power: 0.94 },
  '좌타 강타자': { hand: 'L', pull: 0.17, power: 1.06 },
};
/* 주력 — 한 베이스 도는 시간이 이만큼 달라진다 */
const LEGS = { '발 빠름': 1.13, '보통 발': 1, '발 느림': 0.89 };
/* 수비 자리 — 방향 t(0 좌측 파울선 ~ 1 우측 파울선)와 깊이 u(1 = 담장) */
const SPOT = {                        // [방향, 깊이, 이름, 발, 어깨]
  P: [0.5, 0.151, '투', 0.95, 0.95], C: [0.5, -0.035, '포', 0.88, 1.08],
  '1B': [0.93, 0.25, '1', 0.92, 0.94], '2B': [0.72, 0.37, '2', 1.06, 0.95],
  SS: [0.28, 0.37, '유', 1.1, 1.05], '3B': [0.07, 0.25, '3', 0.96, 1.08],
  LF: [0.2, 0.72, '좌', 1.02, 0.96], CF: [0.5, 0.8, '중', 1.12, 1], RF: [0.8, 0.72, '우', 1.0, 1.1],
};
/* 펜스 — t=0 좌측 폴, 0.5 중앙, 1 우측 폴 */
const FENCE = [[62, 196], [330, 112], [703, 84], [1078, 112], [1348, 196]];
const FENCE_M = [100, 114, 122, 114, 100];          // 그 방향 담장까지의 실제 거리(m)
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (t) => { const i = Math.max(0, Math.min(3, Math.floor(t * 4))); return [i, t * 4 - i]; };
const fenceAt = (t) => {                            // t<0, t>1 이면 파울지역으로 연장
  const [i, u] = seg(t);
  return [lerp(FENCE[i][0], FENCE[i + 1][0], u), lerp(FENCE[i][1], FENCE[i + 1][1], u)];
};
const fenceM = (t) => { const [i, u] = seg(t); return lerp(FENCE_M[i], FENCE_M[i + 1], u); };
/* 실제 거리 비율 u(1 = 담장) → 화면에서의 비율. 마운드 · 2루 자리로 맞춘 눈금 */
const DEPTH = [[0, 0], [0.15, 0.415], [0.32, 0.67], [0.5, 0.8], [0.75, 0.92], [1, 1], [1.25, 1.14]];
const depthPx = (u) => {
  for (let i = 1; i < DEPTH.length; i += 1) {
    if (u <= DEPTH[i][0] || i === DEPTH.length - 1) {
      const [u0, d0] = DEPTH[i - 1], [u1, d1] = DEPTH[i];
      return d0 + ((u - u0) / (u1 - u0)) * (d1 - d0);
    }
  }
  return u;
};
const spotAt = (t, u, keep) => {                     // 홈에서 그 방향으로 u 만큼 (1 = 담장)
  const f = fenceAt(t), d = depthPx(u);
  const x = HOME[0] + (f[0] - HOME[0]) * d, y = HOME[1] + (f[1] - HOME[1]) * d;
  if (keep) return [Math.round(x), Math.round(y)];  // 담장을 넘어가는 공은 화면 밖으로
  return [Math.round(Math.min(Math.max(x, 26), W - 26)), Math.round(Math.min(Math.max(y, 44), H - 40))];
};
const rnd = (a, b) => a + Math.random() * (b - a);
const cl01 = (t) => Math.max(0, Math.min(1, t));
const TH = (t) => (t - 0.5) * (Math.PI / 2);        // 파울선 사이를 90도로 본다
const toM = (t, u) => { const r = fenceM(cl01(t)) * u, a = TH(t); return [r * Math.sin(a), -r * Math.cos(a)]; };
const fromM = (p) => {
  const r = Math.hypot(p[0], p[1]), a = Math.atan2(p[0], -p[1]);
  const t = 0.5 + a / (Math.PI / 2);
  return { t, u: r / fenceM(cl01(t)), m: r };
};
const pxOf = (p) => { const { t, u } = fromM(p); return spotAt(t, u); };
const gap = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);   // 실제 거리(m)
const midM = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
/* 수비 자리를 실제 자리와 화면 자리로 함께 들고 다닌다 */
const FIELD = Object.fromEntries(Object.entries(SPOT).map(([k, [t, u, ko, leg, arm]]) => [k, [spotAt(t, u), ko, toM(t, u), leg, arm]]));
const BASE_M = { B1: toM(1, 0.2248), B2: toM(0.5, 0.318), B3: toM(0, 0.2248), HOME: [0, 0] };
/* 방향 이름 — 중계 화면 한 마디 */
const dirKo = (t) => (t < -0.02 ? '3루 쪽 파울' : t > 1.02 ? '1루 쪽 파울'
  : t < 0.1 ? '좌측 파울선' : t < 0.28 ? '좌익수' : t < 0.42 ? '좌중간'
    : t < 0.58 ? '중견수' : t < 0.72 ? '우중간' : t < 0.9 ? '우익수' : '우측 파울선');

/* 구질 — 속도 · 색 · 도착점은 홈플레이트 언저리로 모으고 휨만 살짝 다르게 */
const PITCH = {
  직구: { ms: 330, velo: [143, 152], color: '#f87171', drift: [0, -4], jitter: 5, bend: -2 },
  슬라이더: { ms: 395, velo: [132, 139], color: '#fbbf24', drift: [6, -1], jitter: 6, bend: -9 },
  커브: { ms: 490, velo: [116, 125], color: '#7dd3fc', drift: [-4, 3], jitter: 6, bend: 11 },
  체인지업: { ms: 445, velo: [124, 132], color: '#a78bfa', drift: [2, 2], jitter: 6, bend: 5 },
  포크: { ms: 415, velo: [129, 137], color: '#34d399', drift: [0, 5], jitter: 5, bend: 8 },
};
/* 결과는 미리 정하지 않는다 — 타구와 사람들의 시간이 정한다. 아래는 이름표일 뿐 */
const RESULT = {
  HR: { ko: '홈런!', color: '#fde047', cut: 'cut-hr', shake: 'big' },
  '3B': { ko: '3루타', color: OFF, cut: 'cut-hit', shake: 'mid' },
  '2B': { ko: '2루타', color: OFF, cut: 'cut-hit', shake: 'mid' },
  H: { ko: '안타', color: OFF, cut: 'cut-hit', shake: 'small' },
  FO: { ko: '뜬공 아웃', color: '#7dd3fc', cut: 'cut-fo', shake: 'small' },
  LO: { ko: '직선타 아웃', color: '#7dd3fc', cut: 'cut-fo', shake: 'small' },
  SF: { ko: '희생플라이', color: '#a7f3d0', cut: 'cut-fo', shake: 'small' },
  GO: { ko: '땅볼 아웃', color: '#94a3b8', cut: null, shake: 'small' },
  FC: { ko: '야수선택', color: '#94a3b8', cut: null, shake: 'small' },
  DP: { ko: '병살', color: DEF, cut: 'cut-dp', shake: 'small' },
  BUNT: { ko: '희생번트', color: '#a7f3d0', cut: null, shake: 'small' },
  FOUL: { ko: '파울', color: '#94a3b8', cut: null, shake: 'small' },
  K: { ko: '삼진', color: DEF, cut: 'cut-k', shake: 'none' },
  BB: { ko: '볼넷', color: '#93c5fd', cut: null, shake: 'none' },
  SB: { ko: '도루 성공', color: '#fbbf24', cut: 'cut-steal', shake: 'none' },
  CS: { ko: '도루 실패', color: DEF, cut: null, shake: 'none' },
};
const CSS = `
@keyframes camIn { from { transform: scale(1); } to { transform: scale(1.05); } }
@keyframes camBig { 0%,100% { transform: translate3d(0,0,0) scale(1.05); } 16% { transform: translate3d(-11px,7px,0) scale(1.08); } 40% { transform: translate3d(9px,-7px,0) scale(1.07); } 66% { transform: translate3d(-5px,-2px,0) scale(1.06); } }
@keyframes camMid { 0%,100% { transform: translate3d(0,0,0) scale(1.04); } 25% { transform: translate3d(-6px,4px,0) scale(1.06); } 60% { transform: translate3d(5px,-3px,0) scale(1.05); } }
@keyframes camSmall { 0%,100% { transform: translate3d(0,0,0) scale(1.03); } 32% { transform: translate3d(-3px,2px,0) scale(1.04); } }
@keyframes flashIn { 0% { opacity: 0; } 10% { opacity: .8; } 100% { opacity: 0; } }
@keyframes cutIn { 0% { opacity: 0; transform: scale(1.14); } 12% { opacity: 1; transform: scale(1.05); } 80% { opacity: 1; transform: scale(1.01); } 100% { opacity: 0; } }
@keyframes cutText { 0% { opacity: 0; transform: translateY(16px) scale(.94); } 16% { opacity: 1; transform: none; } 82% { opacity: 1; } 100% { opacity: 0; } }
@keyframes callOut { 0% { opacity: 0; transform: scale(1.45); } 18% { opacity: 1; transform: scale(1); } 74% { opacity: 1; } 100% { opacity: 0; transform: scale(.97); } }
@keyframes trailFade { from { opacity: .85; } to { opacity: 0; } }
@keyframes pitchFly { from { offset-distance: 0%; } to { offset-distance: 100%; } }
@keyframes runMove { from { offset-distance: 0%; } to { offset-distance: 100%; } }
@keyframes rise { 0% { transform: translateY(0) scale(.85); } 52% { transform: translateY(calc(var(--pk) * -1px)) scale(1.75); } 100% { transform: translateY(0) scale(1); } }
@keyframes shade { 0% { opacity: .5; transform: scale(.7); } 52% { opacity: .18; transform: scale(1.7); } 100% { opacity: .45; transform: scale(.9); } }
@keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes pulseRing { 0% { transform: scale(.5); opacity: .9; } 100% { transform: scale(2.6); opacity: 0; } }
@keyframes landMark { 0% { transform: scale(.3); opacity: 0; } 20% { opacity: .95; } 100% { transform: scale(2.2); opacity: 0; } }
@keyframes dive { 0% { transform: scale(1); } 60% { transform: scale(1) rotate(0deg); } 78% { transform: scaleX(1.75) scaleY(.7) rotate(-16deg); } 100% { transform: scaleX(1.5) scaleY(.75) rotate(-12deg); } }
@keyframes jump { 0% { transform: scale(1); } 70% { transform: scale(1); } 85% { transform: scale(1.5) translateY(-7px); } 100% { transform: scale(1.18) translateY(-2px); } }
@keyframes setUp { 0%,100% { transform: scale(1); } 55% { transform: scale(1.22); } }
@keyframes crowd { 0% { opacity: 0; } 18% { opacity: .95; } 100% { opacity: 0; } }
@keyframes bigNum { 0% { opacity: 0; transform: scale(1.6); } 16% { opacity: 1; transform: scale(1); } 76% { opacity: 1; } 100% { opacity: 0; } }
@keyframes tagIn { 0% { opacity: 0; transform: scale(1.8) rotate(-6deg); } 20% { opacity: 1; transform: scale(1) rotate(-6deg); } 80% { opacity: 1; } 100% { opacity: 0; } }
@keyframes rollOn { from { offset-distance: 0%; } to { offset-distance: 100%; } }
`;
/* 가는 길에 직각으로 밀어 휘게 한다 — 세로로 오가는 공도 좌우로 휜다 */
const curve = (a, b, arc = 0) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const mx = (a[0] + b[0]) / 2 - (dy / len) * arc, my = (a[1] + b[1]) / 2 + (dx / len) * arc;
  return `M ${a[0]} ${a[1]} Q ${Math.round(mx)} ${Math.round(my)}, ${Math.round(b[0])} ${Math.round(b[1])}`;
};
const RUN = [HOME, B1, B2, B3, HOME];
const TIME = 0.28;                      // 실제 1초를 화면에서 몇 초로 보여줄지
const RUN_MS = Math.round(4300 * TIME); // 한 베이스 달리는 데 걸리는 시간(실제 4.3초)
const LEG_MS = Math.round(154 * TIME);  // 1m 달리는 데 걸리는 시간(6.5m/s)
const THROW_MS = Math.round(30 * TIME); // 송구가 1m 날아가는 시간(33m/s)
const ROLL_MS = Math.round(90 * TIME);  // 타구가 1m 굴러가는 시간(구르며 느려진다)
const SET_MS = Math.round(700 * TIME);  // 잡아서 던지는 자세를 잡는 시간
const HOP_MS = Math.round(500 * TIME);  // 중계는 받으면서 돌아 곧바로 던진다
const HOP_DP = Math.round(350 * TIME);  // 병살은 베이스를 밟고 토스하듯 넘긴다
/* 베이스 사이 한 구간씩 잇는 길 — 0 은 타석, 4 는 홈 */
const legPath = (from, to) => {
  let d = `M ${RUN[from][0]} ${RUN[from][1]}`;
  for (let i = from + 1; i <= to; i += 1) d += ` L ${RUN[i][0]} ${RUN[i][1]}`;
  return d;
};
/* 이 타구에 누가 어디로 가는가 — [베이스1,2,3] 을 받아 움직임과 다음 상황을 낸다 */
const BASE_PRESET = { '주자 없음': [0, 0, 0], '1루': [1, 0, 0], '1·2루': [1, 1, 0], '2·3루': [0, 1, 1], '만루': [1, 1, 1] };
const BASE_KO = ['타자', '1루 주자', '2루 주자', '3루 주자'];
const TO_KO = ['', '1루', '2루', '3루', '홈'];
/* 첫 베이스는 출발이 있어 느리고, 그 뒤로는 달리던 속도로 돈다 */
const runMsOf = (n, hr, leg = 1) => {
  let ms = 0;
  for (let i = 0; i < n; i += 1) ms += RUN_MS * (i === 0 ? 1 : 0.77);
  return Math.round((ms * (hr ? 1.06 : 1)) / leg);
};
const runPath = (n) => {
  let d = `M ${HOME[0]} ${HOME[1]}`;
  for (let i = 1; i <= Math.min(n, 4); i += 1) d += ` L ${RUN[i][0]} ${RUN[i][1]}`;
  return d;
};
const OUTER = ['LF', 'CF', 'RF'], INNER = ['P', 'C', '1B', '2B', 'SS', '3B'];
const nearest = (toM_, pool) => pool.reduce((best, k) => {
  const d = gap(FIELD[k][2], toM_);
  return !best || d < best.d ? { k, d } : best;
}, null).k;
/* 타구가 지나는 선에서 야수가 얼마나 옆으로 떨어져 있는가 */
const lineOff = (p, t) => {
  const a = TH(t), dx = Math.sin(a), dy = -Math.cos(a);
  return { along: p[0] * dx + p[1] * dy, perp: Math.abs(p[0] * -dy + p[1] * dx) };
};
/* 야수가 어떻게 잡는가 — 제자리 · 달려가기 · 다이빙 · 점프 */
const reactOf = (by, toM_, u, out) => {
  if (!by) return null;
  const d = gap(FIELD[by][2], toM_);
  if (!out) return 'run';
  if (u > 0.92) return 'jump';
  if (d < 3.5) return 'set';
  if (d > 12) return 'dive';
  return 'run';
};
const CUT_M = 34;                                // 이보다 멀면 중계를 거친다(m)
const POP_MS = Math.round(650 * TIME);           // 포수가 받아서 던지는 자세를 잡기까지

/* ── 1. 스윙 — 타구 속도 · 발사각 · 방향을 만든다 ────────────────────── */
const bell = () => (Math.random() + Math.random() + Math.random()) / 3;   // 가운데가 잦은 분포
const swing = (bat, shot) => {
  /* 타구 속도: 리그 평균 88mph(142km/h), 잘 맞으면 110mph(177km/h)까지 */
  const timing = bell();                          // 0 빗맞음 ~ 1 정타
  const exit = Math.round((88 + timing * 94) * bat.power * rnd(0.96, 1.04));
  /* 발사각: 리그 평균 12도 언저리. 정타일수록 8~30도에 모인다 */
  const la = Math.round(timing > 0.72 ? rnd(8, 30) : 12 + (bell() * 2 - 1) * 54);
  /* 방향: 당김 성향 + 몸쪽 · 바깥쪽 + 구속 */
  const way = bat.hand === 'R' ? -1 : 1;
  const inside = ((bat.hand === 'R' ? HOME[0] - shot.end[0] : shot.end[0] - HOME[0]) / 14) * 0.05;
  const heat = ((shot.velo - 132) / 18) * 0.05;
  const t = 0.5 + way * (bat.pull * 0.55 + inside + heat) + (bell() - 0.5) * 0.92;
  return { exit, la, t, timing };
};
/* ── 2. 타구 물리 — 얼마나 멀리, 얼마나 오래 ─────────────────────────── */
const flight = (exit, la) => {
  const v = exit / 3.6, th = (la * Math.PI) / 180;
  if (la < 8) {                                   // 땅볼 — 튀며 굴러간다
    const dist = Math.max(6, Math.min(105, v * (0.9 + la * 0.09)));
    return { kind: 'ground', dist, hang: Math.round(dist * ROLL_MS * 0.8), peak: 0 };
  }
  const R = ((v * v * Math.sin(2 * th)) / 9.8) * 0.72;          // 공기 저항까지 친 비거리
  const T = ((2 * v * Math.sin(th)) / 9.8) * 0.92;              // 체공 시간(초)
  return {
    kind: la < 22 ? 'line' : 'fly',
    dist: Math.max(8, R),
    hang: Math.max(260, Math.round(T * 1000 * TIME)),
    peak: Math.round(Math.min(190, 30 + la * 3.4)),
  };
};
/* ── 3. 수비 대형 — 아웃카운트와 주자를 보고 고른다 ───────────────────── */
const shapeOf = (on, outs) => {
  if (on[2] && outs < 2) return on[0] ? 'half' : 'in';          // 3루 주자: 전진 · 중간
  if (on[0] && outs < 2) return 'dp';                           // 1루 주자: 병살 대형
  return 'normal';
};
const SHIFT = { normal: 0, dp: -2.2, half: -5, in: -9 };        // 내야가 앞으로 나오는 정도(m)
const spotOf = (k, shape) => {
  const p = FIELD[k][2];
  if (!INNER.includes(k) || k === 'C' || k === 'P') return p;
  const r = Math.hypot(p[0], p[1]), s = Math.max(6, r + SHIFT[shape]);
  return [(p[0] / r) * s, (p[1] / r) * s];
};
/* ── 4. 한 타구를 끝까지 굴려본다 ───────────────────────────────────── */
const simPlay = (bat, shot, on, outs, mode) => {
  const sw = mode === 'BUNT'
    ? { exit: Math.round(rnd(46, 74)), la: rnd(-4, 6), t: Math.random() < 0.5 ? rnd(0.04, 0.2) : rnd(0.8, 0.96), timing: 0.5 }
    : swing(bat, shot);
  const fl = mode === 'BUNT' ? { kind: 'ground', dist: rnd(12, 24), hang: 420, peak: 0 } : flight(sw.exit, sw.la);
  const t = sw.t, foul = t < 0.02 || t > 0.98;
  const wall = fenceM(cl01(t));
  const shape = shapeOf(on, outs);
  const landM = toM(t, Math.min(fl.dist, wall * 1.28) / wall);
  const out = {
    exit: sw.exit, la: sw.la, t, kind: fl.kind, m: Math.round(fl.dist), hang: fl.hang, peak: fl.peak,
    shape, dir: dirKo(t), landM, foul,
  };
  /* 담장을 넘었는가 */
  if (!foul && fl.dist >= wall && fl.kind !== 'ground') return { ...out, key: 'HR', caught: false, by: null, grab: fl.hang + 400, restM: landM, fielded: false };
  if (foul) return { ...out, key: 'FOUL', caught: false, by: null, grab: fl.hang + 300, restM: landM, fielded: false };

  /* 누가 처리하나 — 땅볼은 지나가는 선에서, 뜬공은 떨어지는 자리에서 */
  const pool = fl.kind === 'ground' ? INNER : fl.dist < 46 ? INNER : OUTER;
  const cand = pool.map((k) => {
    const p = spotOf(k, shape);
    const off = lineOff(p, t);
    if (fl.kind !== 'ground') {
      const reach = Math.round((gap(p, landM) * LEG_MS) / FIELD[k][3]) + 150;   // 낙하 지점까지 달린다
      return { k, p, reach, passAt: fl.hang, inRange: true, slack: fl.hang - reach };
    }
    const stopped = off.along > fl.dist - 1;                          // 공이 나보다 앞에서 멈췄다
    const reach = stopped
      ? Math.round((gap(p, landM) * LEG_MS) / FIELD[k][3]) + 90       // 멈춘 공을 주우러 간다
      : Math.round((off.perp * LEG_MS) / FIELD[k][3]) + 90;           // 옆으로 움직여 막는다
    const passAt = stopped ? reach : Math.round(Math.max(0, off.along) * ROLL_MS * 0.8);
    return { k, p, reach, passAt, inRange: off.along > -4 && off.along < 52, slack: passAt - reach };
  }).filter((c) => c.inRange);
  const best = cand.sort((a, b) => b.slack - a.slack)[0];
  const got = best && best.slack >= 0;
  /* 라인드라이브는 잡기 어렵고, 뜬공은 여유가 있으면 잡는다 */
  const caught = got && fl.kind !== 'ground' && (fl.kind === 'fly' || best.slack > 55);
  const by = best ? best.k : nearest(landM, OUTER);
  const grab = caught ? fl.hang + 120
    : fl.kind === 'ground' && got ? Math.max(best.reach, best.passAt) + 120
      : Math.max(fl.hang + Math.round(fl.dist * 0.18 * ROLL_MS), Math.round((gap(spotOf(by, shape), landM) * LEG_MS) / FIELD[by][3])) + 180;
  const restM = caught || (fl.kind === 'ground' && got) ? landM
    : toM(t, Math.min(fl.dist * 1.16, wall * 0.99) / wall);
  return {
    ...out, by, caught, grab, restM, fielded: got,
    key: caught ? (fl.kind === 'fly' ? 'FO' : 'LO') : fl.kind === 'ground' && got ? 'GO' : 'H',
  };
};
/* ── 5. 주루 — 아웃카운트와 타구를 보고 각자 판단한다 ─────────────────── */
const baseRun = (res, on, outs, leg) => {
  const moves = [];
  const put = (from, to, opt) => moves.push({ from, to: Math.min(4, to), out: false, risky: false, tag: false, ...opt });
  if (res.key === 'HR') {
    [3, 2, 1].forEach((b) => { if (on[b - 1]) put(b, 4); });
    put(0, 4);
    return moves;
  }
  if (res.key === 'FOUL') return moves;
  if (res.caught) {                                  // 잡혔다 — 2아웃이면 뛸 이유가 없다
    if (outs < 2) {
      if (on[2] && res.dist >= 62) put(3, 4, { risky: true, tag: true });
      if (on[1] && res.dist >= 84 && !on[2]) put(2, 3, { risky: true, tag: true });
    }
    return moves;
  }
  const deep = res.m, right = res.t > 0.55;
  if (res.fielded && res.kind === 'ground') {        // 내야 땅볼 — 포스는 강제, 3루 주자는 상황을 본다
    if (on[2]) {
      const home = res.shape === 'in' ? Math.random() < 0.25 : outs === 2 || Math.random() < 0.7;
      if (home) put(3, 4, { risky: true }); else put(3, 3);
    }
    if (on[1]) put(2, 3, { risky: !on[0] });
    if (on[0]) put(1, 2, { risky: false });
    put(0, 1, { risky: true });
    return moves;
  }
  /* 안타 — 앞 주자부터, 한 베이스 더 갈지 스스로 정한다 */
  const bold = outs === 2 ? 0.34 : outs === 1 ? 0.14 : 0.06;
  if (on[2]) put(3, 4);
  if (on[1]) {
    const go = Math.random() < 0.55 + bold + (deep > 60 ? 0.2 : 0) + (right ? 0.08 : 0);
    put(2, go ? 4 : 3, { risky: go });
  }
  if (on[0]) {
    const go = Math.random() < 0.2 + bold + (deep > 70 ? 0.22 : 0) + (right ? 0.12 : 0);
    put(1, go ? 3 : 2, { risky: go });
  }
  put(0, 1);
  return moves;
};
/* ── 6. 송구 — 선행 주자를 잡을 수 있으면 그쪽, 아니면 확실한 아웃 ────── */
const BASE_OF = [null, 'B1', 'B2', 'B3', 'HOME'];
const throwPlan = (res, moves, outs, grab) => {
  if (!res.by || res.key === 'HR' || res.key === 'FOUL') return null;
  const from = res.restM;
  const armOf = FIELD[res.by][4];
  const cost = (goal) => {
    const far = gap(from, goal) > CUT_M;
    const cut = far ? midM(goal, from, 0.42) : null;
    const path = cut ? [from, cut, goal] : [from, goal];
    const seg = path.slice(1).map((q, i) => {
      const d = gap(path[i], q);
      const set = i === 0 ? SET_MS * (d < 24 ? 0.66 : 1) : 0;         // 가까우면 급하게 던진다
      return Math.round((d * THROW_MS + set) / armOf);
    });
    const hop = HOP_MS;
    return { path, seg, ms: seg.reduce((a, b) => a + b, 0) + hop * Math.max(0, seg.length - 1), hop, cut };
  };
  const live = moves.filter((mv) => !mv.out && mv.to < 4.5);
  /* 잡을 수 있는 주자를 앞선 쪽부터 본다 */
  const picks = live.map((mv) => {
    const goal = BASE_M[BASE_OF[mv.to]];
    const c = cost(goal);
    return { mv, goal, c, slack: mv.in - (grab + c.ms) };      // 양수면 잡는다
  }).sort((a, b) => b.mv.to - a.mv.to);
  const lead = picks.find((x) => x.slack > 40 && x.mv.from > 0);
  const batter = picks.find((x) => x.mv.from === 0);
  /* 병살 — 1루 포스가 살아 있고 2루에서 잡을 수 있으면 두 개를 노린다 */
  const force2 = picks.find((x) => x.mv.from === 1 && x.mv.to === 2 && x.slack > 40);
  if (res.kind === 'ground' && res.fielded && force2 && batter && outs < 2) {
    const c1 = cost(BASE_M.B2), c2 = cost(BASE_M.B1);
    const two = grab + c1.ms + HOP_DP + Math.round((gap(BASE_M.B2, BASE_M.B1) * THROW_MS) / 1);
    return { kind: 'dp', targets: [force2.mv, batter.mv], arrive: [grab + c1.ms, two],
      path: [from, BASE_M.B2, BASE_M.B1], seg: [c1.seg[c1.seg.length - 1], Math.round(gap(BASE_M.B2, BASE_M.B1) * THROW_MS)], hop: HOP_DP };
  }
  const pick = lead || batter || picks[0];
  if (!pick) return null;
  return { kind: 'one', targets: [pick.mv], arrive: [grab + pick.c.ms], path: pick.c.path, seg: pick.c.seg, hop: pick.c.hop };
};
/* ── 7. 결과 이름표 — 벌어진 일을 보고 뒤에 붙인다 ───────────────────── */
const nameOf = (res, moves, outs) => {
  const bat = moves.find((mv) => mv.from === 0);
  const dead = moves.filter((mv) => mv.out).length;
  if (res.key === 'HR' || res.key === 'FOUL') return res.key;
  if (res.caught) {
    const sf = moves.some((mv) => mv.tag && mv.to === 4 && !mv.out);
    return sf ? 'SF' : res.kind === 'fly' ? 'FO' : 'LO';
  }
  if (!bat) return res.key;
  if (bat.out) {
    if (dead >= 2) return 'DP';
    return res.mode === 'BUNT' ? 'BUNT' : 'GO';
  }
  if (dead > 0) return 'FC';
  return bat.to >= 4 ? 'HR' : bat.to === 3 ? '3B' : bat.to === 2 ? '2B' : 'H';
};
/* 도루 — 포수가 받아 그 베이스로 던진다 */
const makeSteal = (to) => {
  const goal = BASE_M[BASE_OF[to]];
  const from = FIELD.C[2];
  const seg = [Math.round((gap(from, goal) * THROW_MS + POP_MS) / FIELD.C[4])];
  const man = to === 2 ? 'SS' : to === 3 ? '3B' : to === 4 ? 'C' : '1B';
  return {
    steal: true, by: 'C', out: false, kind: 'none', to: pxOf(goal), rest: pxOf(goal),
    relayM: [from, goal], relay: [pxOf(from), pxOf(goal)], seg,
    throwMs: seg[0], hop: HOP_MS, cover: man === 'C' ? {} : { [man]: pxOf(goal) },
    ms: 0, peak: 0, moveMs: 0, rollMs: 0, runTo: 0, leg: 1, far: null,
  };
};
/* 움직임을 정리해 다음 베이스 상황과 득점을 낸다 */
const settle = (moves, on) => {
  const next = [...on];
  let runs = 0;
  moves.forEach((mv) => { if (mv.from > 0) next[mv.from - 1] = 0; });
  moves.forEach((mv) => {
    if (mv.out) return;
    if (mv.to >= 4) runs += 1; else next[mv.to - 1] = 1;
  });
  return { next, runs, outs: moves.filter((mv) => mv.out).length };
};
const Mark = ({ at, color, label, k = 1, on = false, style }) => {
  const per = 0.72 + (at[1] / H) * 0.5;      // 멀수록 작게
  const r = 11 * per * k;
  return (
    <span className="pointer-events-none absolute grid place-items-center rounded-full font-bold"
      style={{
        left: at[0] - r, top: at[1] - r, width: r * 2, height: r * 2, background: color, color: '#05080f',
        fontSize: r * 1.05, lineHeight: 1, transition: 'left .5s cubic-bezier(.3,.7,.4,1), top .5s cubic-bezier(.3,.7,.4,1)',
        boxShadow: on ? `0 0 18px ${color}, 0 2px 6px rgba(0,0,0,.6)` : '0 2px 7px rgba(0,0,0,.65)',
        outline: on ? '2px solid rgba(255,255,255,.85)' : 'none', ...style,
      }}>{label}</span>
  );
};

function Stage() {
  const [pitchKey, setPitchKey] = useState('직구');
  const [batKey, setBatKey] = useState('우타 강타자');
  const [legKey, setLegKey] = useState('보통 발');
  const [on, setOn] = useState([0, 0, 0]);       // 1 · 2 · 3루 주자
  const [runs, setRuns] = useState(0);
  const [plan, setPlan] = useState(null);        // 이번 타구의 주자 움직임
  const [outs, setOuts] = useState(0);
  const [log, setLog] = useState([]);
  const [shot, setShot] = useState(null);
  const [ball, setBall] = useState(null);   // 이번 타구
  const [play, setPlay] = useState(null);
  const [step, setStep] = useState('idle'); // idle pitch hit land throw call
  const [cut, setCut] = useState(null);
  const timers = useRef([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clear(), []);

  /* 한 번의 플레이 — 던지고, 치고, 수비와 주루가 각자 판단하고, 시간이 결과를 정한다 */
  const fire = (mode) => {
    clear(); setCut(null);
    const p = PITCH[pitchKey];
    const end = [
      Math.round(HOME[0] + p.drift[0] + (Math.random() - 0.5) * 2 * p.jitter),
      Math.round(HOME[1] - 18 + p.drift[1] + (Math.random() - 0.5) * 2 * p.jitter),
    ];
    const sh = { ...p, key: pitchKey, velo: Math.round(rnd(p.velo[0], p.velo[1])), end };
    const t = (ms, fn) => timers.current.push(setTimeout(fn, ms));
    const bat = BATTER[batKey], leg = LEGS[legKey];
    let at = p.ms, hit = null, moves = [], key = null, bet = null;

    if (mode === 'SB') {                                  /* ── 도루 ── */
      const to = on[0] && !on[1] ? 2 : on[1] && !on[2] ? 3 : on[2] ? 4 : on[0] ? 2 : 0;
      const from = to === 2 ? 1 : to === 3 ? 2 : 3;
      if (!to) { t(at, () => setStep('call')); at += 700; key = 'CS'; }
      else {
        const mv = { from, to, out: false, risky: true, tag: false };
        const legMs = Math.round(runMsOf(1, false, leg * 1.41));
        mv.start = 0; mv.ms = legMs; mv.in = legMs;
        hit = makeSteal(to);
        const throwAt = p.ms + 60;
        mv.out = throwAt + hit.throwMs < mv.in - 40;
        mv.judged = true; bet = mv; moves = [mv];
        key = mv.out ? 'CS' : 'SB';
        t(throwAt, () => setStep('throw'));
        at = Math.max(throwAt + hit.throwMs, mv.in) + 160;
        t(at, () => setStep('call'));
        at += 1050;
      }
    } else if (mode === 'K' || mode === 'BB') {            /* ── 삼진 · 볼넷 ── */
      key = mode;
      if (mode === 'BB') {
        if (on[0] && on[1] && on[2]) { moves.push({ from: 3, to: 4 }, { from: 2, to: 3 }, { from: 1, to: 2 }); }
        else if (on[0] && on[1]) { moves.push({ from: 2, to: 3 }, { from: 1, to: 2 }); }
        else if (on[0]) { moves.push({ from: 1, to: 2 }); }
        moves.push({ from: 0, to: 1 });
        moves.forEach((mv) => { mv.out = false; mv.risky = false; mv.tag = false; });
      }
      t(at, () => setStep('call'));
      at += 700;
    } else {                                               /* ── 인플레이 ── */
      const res = simPlay(bat, sh, on, outs, mode);
      res.mode = mode;
      moves = baseRun(res, on, outs, leg);
      /* 주자마다 언제 베이스를 밟는지 */
      moves.forEach((mv) => {
        const dash = mv.tag ? 1.26 : mv.from ? 1.28 : 1;
        const solo = mv.from ? rnd(0.93, 1.08) : 1;
        const legMs = runMsOf(mv.to - mv.from, res.key === 'HR', leg * dash * solo);
        mv.start = mv.tag ? p.ms + res.grab : p.ms;
        mv.ms = legMs;
        mv.in = mv.start + legMs;
      });
      const grab = p.ms + (res.grab || res.hang);
      const plan2 = res.caught || res.key === 'HR' || res.key === 'FOUL' ? null : throwPlan(res, moves, outs, grab);
      /* 송구가 닿는 순서로 세이프 · 아웃이 갈린다 */
      if (plan2) {
        plan2.targets.forEach((mv, i) => {
          mv.out = plan2.arrive[i] < mv.in - 40;
          mv.judged = true;
          if (!bet || mv.to > bet.to) bet = mv;
        });
        if (plan2.kind === 'dp' && !plan2.targets[0].out) plan2.targets[1].out = false;
      }
      /* 태그업 승부 — 잡은 자리에서 그 베이스로 */
      const tagBet = moves.find((mv) => mv.tag && !mv.judged);
      if (res.caught && tagBet) {
        const goal = BASE_M[BASE_OF[tagBet.to]];
        const armM = FIELD[res.by][4];
        const far = gap(res.landM, goal) > CUT_M;
        const cutM = far ? midM(goal, res.landM, 0.42) : null;
        const path = cutM ? [res.landM, cutM, goal] : [res.landM, goal];
        const seg = path.slice(1).map((q, i) => Math.round((gap(path[i], q) * THROW_MS + (i === 0 ? SET_MS : 0)) / armM));
        const total = seg.reduce((a, b) => a + b, 0) + HOP_MS * Math.max(0, seg.length - 1);
        tagBet.out = grab + total < tagBet.in - 150;
        tagBet.judged = true; bet = tagBet;
        res.throw = { path, seg, hop: HOP_MS, arrive: grab + total };
      }
      key = nameOf(res, moves, outs);
      /* 화면이 쓰는 모양으로 옮긴다 */
      const thr = plan2 || res.throw;
      hit = {
        to: spotAt(res.t, Math.min(res.m, fenceM(cl01(res.t)) * 1.28) / fenceM(cl01(res.t))),
        landM: res.landM, restM: res.restM || res.landM, rest: pxOf(res.restM || res.landM),
        kind: res.kind === 'ground' ? 'ground' : res.kind, ms: res.hang, peak: res.peak,
        exit: res.exit, m: res.m, la: res.la, dir: res.dir, d: res.m / fenceM(cl01(res.t)),
        by: res.by, out: res.caught || (res.fielded && res.kind === 'ground'),
        react: reactOf(res.by, res.landM, res.m / fenceM(cl01(res.t)), res.caught),
        name: `${res.exit}km/h · ${res.la}° · ${res.m}m`,
        relayM: thr ? thr.path : null, relay: thr ? thr.path.map(pxOf) : null,
        seg: thr ? thr.seg : [], throwMs: thr ? thr.seg.reduce((a, b) => a + b, 0) + (thr.hop || 0) * Math.max(0, thr.seg.length - 1) : 0,
        hop: thr ? thr.hop || HOP_MS : HOP_MS, cover: {},
        runTo: (moves.find((mv) => mv.from === 0) || {}).to || 0,
        far: res.key === 'HR' ? spotAt(res.t, (res.m / fenceM(cl01(res.t))) * 1.7, true) : null,
        leg, steal: false, moveMs: 0, rollMs: 0, shape: res.shape,
      };
      /* 받을 사람이 그 자리에 선다 */
      if (thr) {
        const last = thr.path[thr.path.length - 1];
        const near = INNER.concat(['C']).find((k) => gap(FIELD[k][2], last) < 2.5);
        const man = near || nearest(last, INNER.concat(['C']));
        if (man !== res.by) hit.cover[man] = pxOf(last);
        if (thr.path.length === 3) {
          let cm = res.t < 0.5 ? 'SS' : '2B';
          if (cm === man || cm === res.by) cm = cm === 'SS' ? '2B' : 'SS';
          if (cm !== res.by && cm !== man) hit.cover[cm] = pxOf(thr.path[1]);
        }
      }
      /* 시간표 */
      t(at, () => setStep('hit'));
      at += res.hang;
      t(at, () => setStep('land'));
      const throwAt = p.ms + res.grab;
      if (thr) { t(throwAt, () => setStep('throw')); at = Math.max(at, throwAt + hit.throwMs); }
      else at = Math.max(at, throwAt);
      const lastIn = moves.reduce((m2, mv) => Math.max(m2, mv.in), 0);
      at = Math.max(at, lastIn) + 160;
      t(at, () => setStep('call'));
      at += 1050;
    }

    if (typeof window !== 'undefined') window.__t = { at, key };
    if (typeof window !== 'undefined') window.__sim = { key, moves: moves.map((m) => ({ from: m.from, to: m.to, out: !!m.out })), hit: hit && { m: hit.m, la: hit.la, exit: hit.exit, kind: hit.kind, by: hit.by, out: hit.out, shape: hit.shape } };
    moves = moves.filter((mv) => mv.to > mv.from || mv.out);
    const done = settle(moves, on);
    const adv = { moves, ...done, bet };
    setShot(sh); setBall(hit); setPlay(key); setStep('pitch'); setPlan(adv);
    t(at, () => setCut(key));
    t(at + 1900, () => { setCut(null); setStep('idle'); setPlay(null); setShot(null); setBall(null); setPlan(null); });
    t(at, () => {
      setOn(adv.next); setRuns((v) => v + adv.runs);
      setOuts((v) => { const n = v + done.outs; if (n >= 3) { setOn([0, 0, 0]); return 0; } return n; });
      setLog((v) => [`${RESULT[key]?.ko || key}${adv.runs ? ` (+${adv.runs})` : ''}`, ...v].slice(0, 6));
    });
  };
  const r = play ? RESULT[play] : null;
  const flying = step === 'pitch';
  const after = step === 'land' || step === 'throw' || step === 'call';
  const moved = ball && (ball.out ? step === 'hit' || after : after);
  const cam = step === 'pitch' ? `camIn ${shot?.ms || 400}ms ease-in forwards`
    : step === 'land' && r && r.shake !== 'none'
      ? `cam${r.shake === 'big' ? 'Big' : r.shake === 'mid' ? 'Mid' : 'Small'} .62s ease-out both` : 'none';
  const pitchD = shot ? curve(MOUND, shot.end, shot.bend) : null;
  const flyTo = ball && !ball.steal ? ball.far || ball.to : null;
  const hitD = ball && !ball.steal ? `M ${HOME[0]} ${HOME[1]} L ${ball.to[0]} ${ball.to[1]}` : null;
  /* 맞는 순간 가장 빠르고 멀리 갈수록 느려진다 */
  const ease = ball ? (ball.kind === 'fly' ? 'cubic-bezier(.09,.66,.36,1)'
    : ball.kind === 'line' ? 'cubic-bezier(.07,.74,.42,1)' : 'cubic-bezier(.05,.78,.34,1)') : 'linear';
  const flyD = flyTo ? `M ${HOME[0]} ${HOME[1]} L ${flyTo[0]} ${flyTo[1]}` : null;
  const rollD = ball && !ball.steal && ball.rest !== ball.to ? `M ${ball.to[0]} ${ball.to[1]} L ${ball.rest[0]} ${ball.rest[1]}` : null;
  const sub = ball?.steal ? `${TO_KO[plan?.bet?.to || 2]} 도루` : ball ? `${ball.dir} 쪽 · ${ball.name} · ${ball.m}m` : r?.sub;
  /* 아웃이 되더라도 타자는 1루까지 달린다 */
  const runTo = ball ? ball.runTo : r ? (r.bases > 0 ? r.bases : 0) : 0;
  const running = !!plan && (step === 'hit' || after || (play === 'SB' && step === 'pitch'));
  const batRun = !!plan && plan.moves.some((mv) => mv.from === 0);
  const tag = r && (play === 'HR' || play === 'FOUL' || play === 'SB' || play === 'BUNT' ? null : ball && !ball.steal ? (ball.out ? 'OUT' : 'SAFE') : play === 'BB' ? 'BALL FOUR' : 'OUT');
  /* 리플레이 — 떨어진 자리를 크게 잡는다 */

  return (
    <div className="relative overflow-hidden" style={{ width: W, height: H, background: '#05080f' }}>
      <style>{CSS}</style>
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ animation: cam, transformOrigin: '50% 58%' }}>
          <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/act/field-top.webp)' }} />
          <span className="absolute inset-0" style={{ background: 'radial-gradient(72% 62% at 50% 52%, transparent, rgba(3,5,10,.6) 88%)' }} />

          <svg className="absolute inset-0" width={W} height={H} style={{ pointerEvents: 'none' }}>
            {pitchD && step !== 'idle' && (
              <path d={pitchD} fill="none" stroke={shot.color} strokeWidth="2.5" strokeLinecap="round"
                pathLength="1" strokeDasharray="1" strokeDashoffset={step === 'pitch' ? 1 : 0}
                style={{ opacity: 0.85, filter: `drop-shadow(0 0 7px ${shot.color})`,
                  animation: step === 'pitch' ? `draw ${shot.ms}ms cubic-bezier(.45,.05,.75,1) both` : 'trailFade .5s ease-out both' }} />
            )}
            {hitD && (step === 'hit' || after) && (
              <path d={hitD} fill="none" stroke="#fff" strokeWidth={ball.kind === 'ground' ? 2 : 2.5} strokeLinecap="round"
                pathLength="1" strokeDasharray="1"
                style={{ opacity: 0.55, filter: 'drop-shadow(0 0 8px rgba(255,255,255,.5))',
                  animation: `draw ${ball.ms}ms ${ease} both` }} />
            )}
            {rollD && after && (
              <path d={rollD} fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="6 7"
                style={{ opacity: 0.4 }} />
            )}
            {step === 'throw' && ball?.relay && ball.relay.slice(1).map((to, i) => (
              <path key={i} d={curve(ball.relay[i], to, 16)} fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round"
                pathLength="1" strokeDasharray="1"
                style={{ opacity: 0.9, filter: 'drop-shadow(0 0 6px rgba(252,165,165,.7))',
                  animation: `draw ${ball.seg[i]}ms linear ${ball.seg.slice(0, i).reduce((a, b) => a + b, 0) + ball.hop * i}ms both` }} />
            ))}
          </svg>

          {/* 수비 아홉 — 공이 뜨는 순간부터 쫓아가고, 받을 베이스에는 미리 붙는다 */}
          {Object.entries(FIELD).map(([k, [at, ko]]) => {
            const live = ball && (step === 'hit' || after);
            const on = ball?.by === k;
            const cv = live ? ball.cover?.[k] : null;
            const goal = on ? (ball.out ? ball.to : ball.rest) : null;
            /* 잡는 타구는 낙하점까지, 놓치는 타구는 쫓아가되 닿지 못한다 */
            const reach = !on ? 0 : ball.out ? { set: 0, run: 0.86, dive: 0.78, jump: 0.9 }[ball.react]
              : step === 'hit' ? 0.58 : step === 'land' ? 0.74 : 0.95;
            const pos = on && live ? [at[0] + (goal[0] - at[0]) * reach, at[1] + (goal[1] - at[1]) * reach]
              : cv || at;
            const act = on && live && ball.out && ball.react !== 'run'
              ? `${ball.react === 'dive' ? 'dive' : ball.react === 'jump' ? 'jump' : 'setUp'} ${ball.ms}ms ease-out both` : undefined;
            /* 공이 날아가는 내내 달린다 — 뚝뚝 끊기지 않게 */
            const move = on && step === 'hit' ? `left ${ball.moveMs}ms linear, top ${ball.moveMs}ms linear`
              : on && live ? 'left .42s ease-out, top .42s ease-out'
              : cv ? `left ${Math.round(ball.ms * 0.8)}ms ease-out, top ${Math.round(ball.ms * 0.8)}ms ease-out`
                : 'left .5s cubic-bezier(.3,.7,.4,1), top .5s cubic-bezier(.3,.7,.4,1)';
            return <Mark key={k} at={pos} color={on ? '#fecaca' : DEF} label={ko} on={on}
              k={k === 'P' || k === 'C' ? 1.05 : 1} style={{ animation: act, transition: move }} />;
          })}

          {/* 서 있는 주자 — 플레이가 시작되면 달리는 쪽으로 넘긴다 */}
          {!running && on.map((v, i) => (v ? (
            <Mark key={`on${i}`} at={RUN[i + 1]} color={OFF} label="주" k={0.95} on />
          ) : null))}
          {/* 타석의 타자 */}
          {!(running && batRun) && <Mark at={BOX[BATTER[batKey].hand]} color={OFF} label="타" k={1.08} on />}
          {/* 달리는 주자들 — 앞 주자는 이미 리드를 잡고 있어 조금 빠르다 */}
          {running && plan.moves.map((mv, i) => {
            const delay = Math.max(0, mv.start - PITCH[pitchKey].ms);   // 태그업은 공을 잡고서 출발
            const dead = mv.out;
            return (
              <React.Fragment key={`mv${i}`}>
                <i className="absolute block rounded-full" style={{
                  left: 0, top: 0, width: mv.from ? 19 : 22, height: mv.from ? 19 : 22,
                  marginLeft: mv.from ? -9.5 : -11, marginTop: mv.from ? -9.5 : -11,
                  background: dead ? '#cbd5e1' : OFF, boxShadow: `0 0 16px ${dead ? '#cbd5e1' : OFF}`,
                  offsetPath: `path("${legPath(mv.from, mv.to)}")`, offsetRotate: '0deg',
                  animation: `runMove ${mv.ms}ms linear ${delay}ms both`,
                }} />
                {!dead && mv.to < 4 && (
                  <span className="pointer-events-none absolute rounded-full" style={{
                    left: RUN[mv.to][0] - 12, top: RUN[mv.to][1] - 12, width: 24, height: 24,
                    border: `2px solid ${OFF}`, animation: `pulseRing .7s ease-out ${delay + mv.ms}ms both`,
                  }} />
                )}
              </React.Fragment>
            );
          })}
          {/* 주루선 */}
          {running && plan.moves.map((mv, i) => (
            <svg key={`ln${i}`} className="absolute inset-0" width={W} height={H} style={{ pointerEvents: 'none' }}>
              <path d={legPath(mv.from, mv.to)} fill="none" stroke={mv.out ? '#cbd5e1' : mv.risky ? '#fbbf24' : OFF} strokeWidth="2.5"
                pathLength="1" strokeDasharray="1" style={{ opacity: 0.55,
                  animation: `draw ${mv.ms}ms linear ${Math.max(0, mv.start - PITCH[pitchKey].ms)}ms both` }} />
            </svg>
          ))}

          {/* 공 */}
          {flying && shot && (
            <i key={`p-${shot.end.join()}`} className="absolute block rounded-full bg-white" style={{
              left: 0, top: 0, width: 11, height: 11, marginLeft: -5.5, marginTop: -5.5, boxShadow: `0 0 13px ${shot.color}`,
              offsetPath: `path("${pitchD}")`, offsetRotate: '0deg', animation: `pitchFly ${shot.ms}ms cubic-bezier(.45,.05,.75,1) both`,
            }} />
          )}
          {step === 'hit' && flyD && (
            <span key={`h-${ball.to.join()}`} className="pointer-events-none absolute block" style={{
              left: 0, top: 0, width: 0, height: 0, offsetPath: `path("${flyD}")`, offsetRotate: '0deg',
              animation: `runMove ${Math.round(ball.ms * (ball.far ? 1.35 : 1))}ms ${ease} both`,
            }}>
              <i className="absolute block rounded-[50%]" style={{
                left: -9, top: -3, width: 18, height: 7, background: 'rgba(0,0,0,.6)', filter: 'blur(2px)',
                animation: `shade ${ball.ms}ms ease-out both`,
              }} />
              <i className="absolute block rounded-full bg-white" style={{
                left: -6.5, top: -6.5, width: 13, height: 13, boxShadow: '0 0 20px rgba(255,255,255,.95)',
                '--pk': ball.peak, animation: `rise ${ball.ms}ms ease-out both`,
              }} />
            </span>
          )}
          {/* 떨어진 뒤 굴러가는 공 */}
          {step === 'land' && rollD && (
            <i className="absolute block rounded-full bg-white" style={{
              left: 0, top: 0, width: 12, height: 12, marginLeft: -6, marginTop: -6, boxShadow: '0 0 14px rgba(255,255,255,.8)',
              offsetPath: `path("${rollD}")`, offsetRotate: '0deg', animation: 'rollOn 420ms ease-out both',
            }} />
          )}
          {/* 송구되는 공 */}
          {step === 'throw' && ball?.relay && ball.relay.slice(1).map((to, i) => (
            <i key={i} className="absolute block rounded-full bg-white" style={{
              left: 0, top: 0, width: 11, height: 11, marginLeft: -5.5, marginTop: -5.5, boxShadow: '0 0 14px rgba(252,165,165,.9)',
              offsetPath: `path("${curve(ball.relay[i], to, 16)}")`, offsetRotate: '0deg',
              animation: `rollOn ${ball.seg[i]}ms linear ${ball.seg.slice(0, i).reduce((a, b) => a + b, 0) + ball.hop * i}ms both`,
            }} />
          ))}
          {/* 떨어진 자리 */}
          {after && ball && !ball.far && !ball.steal && (
            <span className="pointer-events-none absolute rounded-full" style={{
              left: ball.to[0] - 14, top: ball.to[1] - 14, width: 28, height: 28,
              border: `2px solid ${r.color}`, animation: 'landMark .9s ease-out both',
            }} />
          )}
          {step === 'hit' && (
            <span className="absolute inset-0" style={{
              background: `radial-gradient(16% 16% at ${(HOME[0] / W) * 100}% ${(HOME[1] / H) * 100}%, rgba(255,255,255,.85), transparent 70%)`,
              animation: 'flashIn .42s ease-out both',
            }} />
          )}
          {/* 홈런 — 넘어가는 순간 관중석이 번쩍인다 */}
          {ball?.far && (step === 'land' || step === 'call') && (
            <span className="pointer-events-none absolute inset-0" style={{
              background: 'radial-gradient(60% 34% at 50% 8%, rgba(255,245,200,.85), rgba(255,220,120,.18) 55%, transparent 78%)',
              animation: 'crowd 1.4s ease-out both',
            }} />
          )}
        </div>
      </div>

      {/* 오른쪽 위 — 투구는 구속, 치고 나면 타구 속도 · 비거리 */}
      {flying && shot && (
        <div className="absolute" style={{ right: 42, top: 116 }}>
          <b className="block text-right font-display text-[42px] font-extrabold leading-none" style={{ color: shot.color, textShadow: '0 2px 14px rgba(0,0,0,.9)' }}>
            {shot.velo}<small className="ml-1 text-[16px]">km/h</small>
          </b>
          <span className="mt-1 block text-right text-[18px] font-bold text-white/85">{shot.key}</span>
        </div>
      )}
      {(step === 'hit' || after) && ball && !ball.steal && (
        <div className="absolute" style={{ right: 42, top: 116 }}>
          <b className="block text-right font-display text-[42px] font-extrabold leading-none text-white" style={{ textShadow: '0 2px 14px rgba(0,0,0,.9)' }}>
            {ball.exit}<small className="ml-1 text-[16px]">km/h</small>
          </b>
          <span className="mt-1 block text-right text-[18px] font-bold text-white/85">타구 속도</span>
          <span className="mt-2 block text-right font-display text-[26px] font-extrabold" style={{ color: r.color }}>{ball.m}m</span>
          <span className="mt-1 block text-right text-[14px] text-white/70">{ball.name}</span>
        </div>
      )}
      {/* 홈런 — 비거리를 크게 */}
      {ball?.far && step === 'call' && (
        <b className="absolute font-display font-black leading-none" style={{
          right: 60, top: 236, fontSize: 118, color: '#fde047', textShadow: '0 6px 30px rgba(0,0,0,.95)',
          animation: 'bigNum 1.6s ease-out both',
        }}>{ball.m}<small className="ml-2 text-[42px]">m</small></b>
      )}
      <div className="absolute flex items-center gap-3" style={{ right: 42, top: 34 }}>
        <div className="relative" style={{ width: 46, height: 46 }}>
          {[[23, 2], [42, 21], [23, 40]].map((p, i) => (      // 2루 · 1루 · 3루 자리
            <span key={i} className="absolute" style={{
              left: i === 2 ? 4 : p[0] - 7, top: p[1] - 7, width: 13, height: 13, transform: 'rotate(45deg)',
              background: on[[1, 0, 2][i]] ? OFF : 'transparent',
              boxShadow: on[[1, 0, 2][i]] ? `0 0 10px ${OFF}` : 'inset 0 0 0 1.5px rgba(255,255,255,.4)',
            }} />
          ))}
        </div>
        <div className="flex flex-col items-end gap-1">
          <b className="font-display text-[30px] font-extrabold leading-none text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,.9)' }}>
            {runs}<small className="ml-1 text-[13px] font-bold text-white/60">점</small>
          </b>
          <span className="flex items-center gap-1">
            {[0, 1].map((i) => (
              <i key={i} className="block rounded-full" style={{ width: 9, height: 9, background: outs > i ? DEF : 'transparent', boxShadow: outs > i ? `0 0 8px ${DEF}` : 'inset 0 0 0 1.5px rgba(255,255,255,.4)' }} />
            ))}
            <small className="ml-1 text-[11px] font-bold text-white/55">아웃</small>
          </span>
        </div>
      </div>
      {ball?.shape && (
        <span className="absolute font-display text-[12px] font-bold tracking-[0.2em] text-white/45" style={{ right: 44, top: 96 }}>
          {{ normal: '기본 수비', dp: '병살 대형', half: '중간 깊이', in: '전진 수비' }[ball.shape]}
        </span>
      )}
      {log.length > 0 && (
        <div className="absolute flex flex-col gap-0.5" style={{ right: 42, bottom: 28 }}>
          {log.map((v, i) => (
            <span key={i} className="text-right text-[13px] font-bold" style={{ color: i ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.8)' }}>{v}</span>
          ))}
        </div>
      )}
      {plan && plan.runs > 0 && (step === 'call' || cut) && (
        <b className="absolute font-display text-[34px] font-black" style={{ right: 44, top: 88, color: OFF, textShadow: '0 2px 14px rgba(0,0,0,.9)', animation: 'callOut 1.2s ease-out both' }}>+{plan.runs}</b>
      )}
      {step === 'call' && r && (
        <div className="absolute" style={{ left: 74, top: 232, animation: 'callOut 1.05s ease-out both' }}>
          <b className="block text-[64px] font-black leading-none" style={{ color: r.color, textShadow: '0 4px 22px rgba(0,0,0,.92)' }}>{r.ko}</b>
          {sub && <span className="mt-2 block text-[19px] font-bold text-white/85" style={{ textShadow: '0 2px 10px rgba(0,0,0,.9)' }}>{sub}</span>}
        </div>
      )}
      {/* 세이프 · 아웃 판정 */}
      {step === 'call' && plan?.bet?.judged && (
        <b className="absolute font-display text-[26px] font-black" style={{
          left: 78, top: 452, padding: '3px 16px', transform: 'rotate(-4deg)',
          color: plan.bet.out ? '#fff' : '#05080f',
          background: plan.bet.out ? 'rgba(180,30,30,.92)' : OFF,
          boxShadow: '0 6px 20px rgba(0,0,0,.6)', animation: 'tagIn 1.05s ease-out both',
        }}>{BASE_KO[plan.bet.from]} {TO_KO[plan.bet.to]} {plan.bet.out ? 'OUT' : 'SAFE'}</b>
      )}
      {step === 'call' && tag && (
        <b className="absolute font-display text-[46px] font-black" style={{
          left: 78, top: 372, padding: '4px 22px', transform: 'rotate(-6deg)',
          color: tag === 'SAFE' ? '#05080f' : '#fff',
          background: tag === 'SAFE' ? OFF : 'rgba(180,30,30,.92)',
          boxShadow: '0 8px 26px rgba(0,0,0,.6)', animation: 'tagIn 1.05s ease-out both',
        }}>{tag}</b>
      )}
      {cut && RESULT[cut].cut && (
        <>
          <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(ui/act/${RESULT[cut].cut}.webp)`, animation: 'cutIn 1.9s ease-out both' }} />
          <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(3,5,10,.86),rgba(3,5,10,.12) 46%,rgba(3,5,10,.7))', animation: 'cutIn 1.9s ease-out both' }} />
          <div className="absolute" style={{ left: 60, bottom: 112, animation: 'cutText 1.9s ease-out both' }}>
            <p className="m-0 font-display text-[13px] font-bold tracking-[0.34em]" style={{ color: RESULT[cut].color }}>
              {shot?.key} {shot?.velo}km/h{ball ? ` · 타구 ${ball.exit}km/h` : ''}
            </p>
            <b className="mt-1 block text-[70px] font-black leading-none text-white" style={{ textShadow: '0 4px 24px rgba(0,0,0,.9)' }}>{RESULT[cut].ko}</b>
            <span className="mt-2 block text-[17px] text-white/80">{sub}</span>
          </div>
        </>
      )}

      <div className="absolute" style={{ left: 22, top: 16 }}>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PITCH).map(([k, v]) => (
            <button key={k} type="button" onClick={() => setPitchKey(k)}
              className="ui-cut px-3 py-1.5 text-[12.5px] font-bold"
              style={{ '--c': '5px', background: pitchKey === k ? v.color : 'rgba(7,12,20,.86)', color: pitchKey === k ? '#05080f' : '#d1d5db', boxShadow: `inset 0 0 0 1px ${v.color}59` }}>
              {k} <small className="opacity-70">{v.velo[0]}~{v.velo[1]}</small>
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {Object.keys(BATTER).map((k) => (
            <button key={k} type="button" onClick={() => setBatKey(k)}
              className="ui-cut px-3 py-1.5 text-[12.5px] font-bold"
              style={{ '--c': '5px', background: batKey === k ? OFF : 'rgba(7,12,20,.86)', color: batKey === k ? '#05080f' : '#d1d5db', boxShadow: `inset 0 0 0 1px ${OFF}59` }}>{k}</button>
          ))}
          <span className="mx-1 self-center text-[12px] text-white/35">|</span>
          {Object.keys(BASE_PRESET).map((k) => (
            <button key={k} type="button" onClick={() => setOn(BASE_PRESET[k])}
              className="ui-cut px-2.5 py-1.5 text-[12.5px] font-bold"
              style={{ '--c': '5px', background: on.join() === BASE_PRESET[k].join() ? '#7dd3fc' : 'rgba(7,12,20,.86)', color: on.join() === BASE_PRESET[k].join() ? '#05080f' : '#d1d5db', boxShadow: 'inset 0 0 0 1px #7dd3fc59' }}>{k}</button>
          ))}
          <span className="mx-1 self-center text-[12px] text-white/35">|</span>
          {Object.keys(LEGS).map((k) => (
            <button key={k} type="button" onClick={() => setLegKey(k)}
              className="ui-cut px-3 py-1.5 text-[12.5px] font-bold"
              style={{ '--c': '5px', background: legKey === k ? '#fbbf24' : 'rgba(7,12,20,.86)', color: legKey === k ? '#05080f' : '#d1d5db', boxShadow: 'inset 0 0 0 1px #fbbf2459' }}>{k}</button>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {[['SWING', '치기', OFF], ['BUNT', '번트', '#a7f3d0'], ['SB', '도루', '#fbbf24'], ['K', '삼진', DEF], ['BB', '볼넷', '#93c5fd']].map(([k, ko, c]) => (
            <button key={k} type="button" onClick={() => fire(k)} disabled={step !== 'idle'}
              className="ui-cut px-4 py-2 text-[13.5px] font-bold"
              style={{ '--c': '6px', background: step === 'idle' ? c : 'rgba(7,12,20,.86)', color: step === 'idle' ? '#05080f' : '#64748b', boxShadow: `inset 0 0 0 1px ${c}59` }}>{ko}</button>
          ))}
          <button type="button" onClick={() => { setOuts(0); setRuns(0); setOn([0, 0, 0]); setLog([]); }}
            className="ui-cut px-3 py-2 text-[12.5px] font-bold text-white/70"
            style={{ '--c': '6px', background: 'rgba(7,12,20,.86)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)' }}>초기화</button>
        </div>
      </div>
    </div>
  );
}

function Gallery() {
  return (
    <div style={{ width: 1920, background: '#020409', minHeight: '100vh', padding: 20 }}>
      <style>{KEYFRAMES}</style>
      <UiStyle />
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[13px] text-gray-400">
        <b className="text-[15px] text-white">자동 플레이</b>
        <span>결과를 고르지 않습니다 — 타구가 만들어지고, 수비와 주자가 각자 판단하고, 도착 시간이 결과를 정합니다</span>
      </div>
      <Stage />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
