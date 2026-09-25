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
  '우타 당김': { hand: 'R', pull: 0.17 },
  '우타 중립': { hand: 'R', pull: 0.05 },
  '좌타 중립': { hand: 'L', pull: 0.05 },
  '좌타 당김': { hand: 'L', pull: 0.17 },
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
/* 결과 — 떨어지는 구역(방향 t · 깊이 d)과 타구질. 같은 결과도 갈래가 여럿이라 매번 다르게 뽑는다 */
const RESULT = {
  HR: { ko: '홈런!', cut: 'cut-hr', color: '#fde047', bases: 4, shake: 'big',
    t: [[0.14, 0.86]], vars: [
      { n: '총알 같은 라인드라이브', kind: 'line', d: [1.01, 1.07], exit: [176, 190], w: 2 },
      { n: '높이 뜬 큰 타구', kind: 'fly', d: [1.04, 1.13], exit: [166, 180], w: 3 },
    ] },
  '3B': { ko: '3루타', cut: 'cut-hit', color: OFF, bases: 3, shake: 'mid',
    t: [[0.58, 0.96]], vars: [        // 3루까지 가장 먼 우중간 · 우측 라인에서 나온다
      { n: '코너를 꿰뚫는 라인드라이브', kind: 'line', d: [0.84, 0.95], exit: [162, 178], w: 3 },
      { n: '펜스까지 굴러가는 타구', kind: 'fly', d: [0.88, 0.98], exit: [154, 170], w: 2 },
    ] },
  '2B': { ko: '2루타', cut: 'cut-hit', color: OFF, bases: 2, shake: 'mid',
    t: [[0.1, 0.34], [0.66, 0.9]], vars: [
      { n: '갭을 가르는 라인드라이브', kind: 'line', d: [0.68, 0.84], exit: [156, 174], w: 3 },
      { n: '외야 사이에 떨어지는 뜬공', kind: 'fly', d: [0.74, 0.9], exit: [146, 164], w: 2 },
    ] },
  H: { ko: '안타', cut: 'cut-hit', color: OFF, bases: 1, shake: 'small',
    t: [[0.08, 0.92]], vars: [
      { n: '내야를 뚫는 땅볼', kind: 'ground', d: [0.28, 0.42], exit: [126, 148], w: 3 },
      { n: '깨끗한 라인드라이브', kind: 'line', d: [0.38, 0.58], exit: [142, 164], w: 4 },
      { n: '앞에 떨어지는 빗맞은 뜬공', kind: 'fly', d: [0.3, 0.44], exit: [112, 132], w: 2 },
    ] },
  FO: { ko: '뜬공 아웃', cut: 'cut-fo', color: '#7dd3fc', bases: 0, shake: 'small',
    t: [[0.16, 0.84]], vars: [
      { n: '외야 깊숙한 뜬공', kind: 'fly', d: [0.7, 0.88], exit: [142, 158], w: 3 },
      { n: '평범한 뜬공', kind: 'fly', d: [0.5, 0.68], exit: [126, 146], w: 4 },
      { n: '내야 뒤 짧은 뜬공', kind: 'fly', d: [0.32, 0.46], exit: [108, 126], w: 2 },
    ] },
  GO: { ko: '땅볼 아웃', cut: null, color: '#94a3b8', bases: 0, shake: 'small',
    t: [[0.12, 0.44], [0.56, 0.88]], vars: [
      { n: '강하게 때린 땅볼', kind: 'ground', d: [0.24, 0.32], exit: [126, 146], w: 3 },
      { n: '느리게 구르는 땅볼', kind: 'ground', d: [0.14, 0.22], exit: [96, 118], w: 2 },
    ] },
  DP: { ko: '병살', cut: 'cut-dp', color: DEF, bases: 0, shake: 'small', relay: [B2, B1],
    t: [[0.26, 0.62]], vars: [
      { n: '유격수 정면 땅볼', kind: 'ground', d: [0.22, 0.3], exit: [118, 140], w: 3 },
      { n: '2루수 쪽으로 구른 땅볼', kind: 'ground', d: [0.2, 0.28], exit: [112, 132], w: 2 },
    ] },
  K: { ko: '삼진', cut: 'cut-k', color: DEF, bases: 0, shake: 'none', sub: '헛스윙 삼진' },
  KL: { ko: '루킹 삼진', cut: 'cut-k', color: DEF, bases: 0, shake: 'none', sub: '꼼짝 못 하고 섰습니다' },
  BB: { ko: '볼넷', cut: null, color: '#93c5fd', bases: 1, shake: 'none', sub: '걸어 나갑니다' },
  BUNT: { ko: '번트', cut: null, color: '#a7f3d0', bases: 0, shake: 'small',
    t: [[0.04, 0.22], [0.78, 0.96]], vars: [
      { n: '파울선을 따라 죽인 번트', kind: 'ground', d: [0.14, 0.22], exit: [52, 74], w: 3 },
      { n: '투수 앞으로 굴린 번트', kind: 'ground', d: [0.09, 0.15], exit: [46, 66], w: 2 },
    ] },
  SB: { ko: '도루', cut: 'cut-steal', color: '#fbbf24', bases: 0, shake: 'none', steal: true },
  FOUL: { ko: '파울', cut: null, color: '#94a3b8', bases: 0, shake: 'small',
    t: [[-0.13, -0.04], [1.04, 1.13]], vars: [
      { n: '크게 뜬 파울', kind: 'fly', d: [0.3, 0.55], exit: [124, 150], w: 3 },
      { n: '빗맞은 파울', kind: 'line', d: [0.24, 0.42], exit: [110, 134], w: 2 },
    ] },
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
/* 이 타구에 누가 어디로 뛰는가 — risky 는 승부를 거는 진루(아웃될 수 있다) */
const advance = (key, on, deep) => {
  const moves = [];                              // { from, to, out, risky, tag }
  const go = (from, step, risky, tag) => moves.push({ from, to: Math.min(4, from + step), out: false, risky: !!risky, tag: !!tag });
  const adv = { HR: 4, '3B': 3, '2B': 2, H: 1 }[key];
  if (adv) {
    [3, 2, 1].forEach((b) => {
      if (!on[b - 1]) return;
      /* 한 베이스 더 노려볼 만한 주자 — 홈런이 아니면 가끔 무리해서 뛴다 */
      const extra = key !== 'HR' && b + adv < 4 && Math.random() < 0.42;
      go(b, adv + (extra ? 1 : 0), extra);
    });
    go(0, adv);
  } else if (key === 'BB') {                     // 볼넷 — 밀리는 주자만 나간다
    if (on[0] && on[1] && on[2]) { go(3, 1); go(2, 1); go(1, 1); }
    else if (on[0] && on[1]) { go(2, 1); go(1, 1); }
    else if (on[0]) { go(1, 1); }
    go(0, 1);
  } else if (key === 'DP') {                     // 병살 — 1루 주자와 타자가 죽는다
    if (on[0]) { moves.push({ from: 1, to: 2, out: true, risky: false, tag: false }); }
    if (on[2]) go(3, 1);                         // 3루 주자는 그 사이 홈을 밟는다
    moves.push({ from: 0, to: 1, out: true, risky: false, tag: false });
  } else if (key === 'GO') {                     // 땅볼 — 타자는 죽고 주자는 한 베이스
    [3, 2, 1].forEach((b) => { if (on[b - 1]) go(b, 1); });
    moves.push({ from: 0, to: 1, out: true, risky: false, tag: false });
  } else if (key === 'BUNT') {                   // 번트 — 수비가 누구를 잡을지에 달렸다
    [3, 2, 1].forEach((b) => { if (on[b - 1]) go(b, 1, true); });
    moves.push({ from: 0, to: 1, out: false, risky: true, tag: false });
  } else if (key === 'SB') {                     // 도루 — 앞선 주자 하나가 뛴다
    if (on[0] && !on[1]) go(1, 1, true);
    else if (on[1] && !on[2]) go(2, 1, true);
    else if (on[2]) go(3, 1, true);
    else if (on[0]) go(1, 1, true);
  } else if (key === 'FO') {                     // 뜬공 — 잡은 뒤 태그업으로 뛴다
    if (on[2] && deep >= 0.58) go(3, 1, true, true);          // 희생플라이
    if (on[1] && deep >= 0.76) go(2, 1, true, true);
  }
  return moves;
};
/* 움직임을 정리해 다음 베이스 상황과 득점을 낸다 */
const settle = (moves, on) => {
  const next = [...on], runs = [0];
  moves.forEach((mv) => { if (mv.from > 0) next[mv.from - 1] = 0; });
  moves.forEach((mv) => {
    if (mv.out) return;
    if (mv.to >= 4) runs[0] += 1; else next[mv.to - 1] = 1;
  });
  return { next, runs: runs[0] };
};
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
/* 낙하한 자리에서 가장 가까운 야수가 처리한다 — 외야 타구는 외야수, 내야 땅볼은 내야수 */
const OUTER = ['LF', 'CF', 'RF'], INNER = ['P', 'C', '1B', '2B', 'SS', '3B'];
const nearest = (toM_, pool) => pool.reduce((best, k) => {
  const d = gap(FIELD[k][2], toM_);
  return !best || d < best.d ? { k, d } : best;
}, null).k;
/* 가중치대로 타구질 한 갈래를 뽑는다 */
const pickVar = (vars) => {
  const sum = vars.reduce((a, v) => a + v.w, 0);
  let x = Math.random() * sum;
  for (const v of vars) { x -= v.w; if (x <= 0) return v; }
  return vars[vars.length - 1];
};
/* 야수가 어떻게 잡는가 — 제자리 · 달려가기 · 다이빙 · 점프 */
const reactOf = (by, toM_, u, out) => {
  if (!by) return null;
  const d = gap(FIELD[by][2], toM_);            // 몇 m 를 움직여야 닿는가
  if (!out) return 'run';                       // 안타는 쫓아갈 뿐 잡지 못한다
  if (u > 0.92) return 'jump';
  if (d < 3.5) return 'set';
  if (d > 12) return 'dive';
  return 'run';
};
/* 안타면 공은 야수를 지나 더 굴러간다 — 그래서 잡힌 것처럼 보이지 않는다 */
const restOf = (key, t, u) => {
  if (key === 'FO' || key === 'GO' || key === 'DP' || key === 'BUNT' || key === 'HR' || key === 'FOUL') return toM(t, u);
  return toM(t, Math.min(u + (u > 0.8 ? 0.19 : u > 0.6 ? 0.16 : 0.1), 0.99));   // 담장 쪽으로 더 굴러간다
};
/* 누가 어디에 서고 공이 어디로 가는지를 한 번에 정한다 —
   받을 사람의 자리를 먼저 정하고, 송구는 정확히 그 자리로 간다 */
const CUT_M = 34;                                // 이보다 멀면 중계를 거친다(m)
const CLEAR = { '3B': 24, '2B': 15, H: 7 };      // 그 결과가 되려면 야수에게서 이만큼은 떨어져야 한다(m)
const planOf = (key, pickM, bases, by, toM_) => {
  const cover = {};
  if (key === 'HR' || key === 'FOUL') return { relay: null, cover };
  let target = null, tKey = null;
  if (key === 'GO' || key === 'DP' || key === 'BUNT') { target = BASE_M.B1; tKey = '1B'; }
  else {
    const b = Math.min(bases, 3);                // 1루타는 베이스로 던질 일이 없다
    if (b === 2) { target = BASE_M.B2; tKey = toM_[0] < 0 ? '2B' : 'SS'; }
    else if (b === 3) { target = BASE_M.B3; tKey = '3B'; }
  }
  /* 병살은 2루를 먼저 거친다 — 그 자리에 설 야수부터 정한다 */
  const dpMan = key === 'DP' ? (by === 'SS' ? '2B' : 'SS') : null;
  if (dpMan) cover[dpMan] = BASE_M.B2;
  if (tKey && tKey !== by && !cover[tKey]) cover[tKey] = target;
  /* 멀면 중계 — 줍는 자리와 목표를 잇는 선 위에 컷오프맨이 선다 */
  let cut = null;
  if (key !== 'GO' && key !== 'DP' && key !== 'FO') {
    const T = target || BASE_M.B2;
    if (gap(pickM, T) > (target ? CUT_M : 20)) {
      let man = toM_[0] < 0 ? 'SS' : '2B';
      if (man === tKey || man === dpMan || man === by) man = man === 'SS' ? '2B' : 'SS';
      if (man !== by && man !== tKey && man !== dpMan) {
        cut = midM(T, pickM, 0.42);
        cover[man] = cut;
      }
    }
  }
  const path = [pickM];
  if (cut) path.push(cut);
  if (target) path.push(target);
  if (key === 'DP') path.splice(1, 0, BASE_M.B2);   // 유격수 → 2루 → 1루
  delete cover[by];
  return { relay: path.length > 1 ? path : null, cover };
};
/* 도루 — 포수가 받아 그 베이스로 던진다 */
const POP_MS = Math.round(650 * TIME);          // 받아서 던지는 자세를 잡기까지
const makeSteal = (to) => {
  const goal = [null, BASE_M.B1, BASE_M.B2, BASE_M.B3, BASE_M.HOME][to];
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
/* 한 타석의 타구를 만든다 — 갈래 · 자리 · 방향이 매번 다르다 */
const makeHit = (key, bat, shot, leg) => {
  const r = RESULT[key];
  if (!r.vars) return null;
  const v = pickVar(r.vars);
  const g = r.t[Math.floor(Math.random() * r.t.length)];
  /* 당겨치는 쪽 — 우타자는 왼쪽(t 감소), 좌타자는 오른쪽(t 증가) */
  const way = bat.hand === 'R' ? -1 : 1;
  /* 몸쪽 공일수록 당겨 나가고, 바깥쪽은 밀려 나간다 */
  const inside = ((bat.hand === 'R' ? HOME[0] - shot.end[0] : shot.end[0] - HOME[0]) / 14) * 0.05;
  /* 빠른 공은 당겨지고 느린 변화구는 밀린다 */
  const heat = ((shot.velo - 132) / 18) * 0.05;
  const bias = way * (bat.pull * 0.9 + inside + heat);
  const out = key === 'FO' || key === 'GO' || key === 'DP';
  const clear = CLEAR[key] || 0;                 // 야수에게서 떨어져야 하는 거리
  let t = 0, u = 0, landM = null, by = null;
  for (let i = 0; i < 16; i += 1) {
    /* 가운데가 잦고 끝이 드물게 — 성향이 민 만큼 한쪽으로 쏠린다 */
    const mid = g[0] + ((Math.random() + Math.random()) / 2) * (g[1] - g[0]);
    t = Math.max(g[0], Math.min(g[1], mid + bias));
    u = rnd(v.d[0], v.d[1]);
    landM = toM(t, u);
    /* 내야에 멈추는 타구만 내야수가 잡는다 — 내야를 뚫은 땅볼은 외야수 몫 */
    const pool = key === 'GO' || key === 'DP' || u < 0.26 ? INNER : OUTER;
    by = key === 'HR' || key === 'FOUL' ? null : nearest(landM, pool);
    if (!clear || !by || gap(FIELD[by][2], landM) >= clear) break;
  }
  const to = spotAt(t, u);
  const m = Math.round(fenceM(cl01(t)) * u);
  const fly = v.kind === 'fly';
  const restM = restOf(key, t, u);
  const plan = planOf(key, restM, r.bases, by, landM);
  const arm = by ? FIELD[by][4] * rnd(0.95, 1.05) : 1;   // 그날의 어깨
  /* 송구 한 구간에 걸리는 시간 — 거리(m)로 잰다. 첫 구간엔 잡고 던지는 동작이 붙는다 */
  const seg = plan.relay
    ? plan.relay.slice(1).map((q, i) => Math.round((gap(plan.relay[i], q) * THROW_MS + (i === 0 ? SET_MS : 0)) / arm))
    : [];
  const hop = key === 'DP' ? HOP_DP : HOP_MS;
  const throwMs = seg.reduce((a, b) => a + b, 0) + hop * Math.max(0, seg.length - 1);
  /* 야수가 공 있는 데까지 달려가는 시간, 공이 더 굴러가는 시간 */
  const goalM = out ? landM : restM;
  const moveMs = by ? Math.round(gap(FIELD[by][2], goalM) * LEG_MS / (FIELD[by][3] * rnd(0.96, 1.04))) : 0;
  const rollMs = Math.round(gap(landM, restM) * ROLL_MS);
  return {
    to, t, d: u, kind: v.kind, m, name: v.n, landM, restM, out,
    exit: Math.round(rnd(v.exit[0], v.exit[1])),
    ms: Math.round(fly ? 820 + u * 780 : v.kind === 'line' ? 600 + u * 320 : 520 + u * 300),
    peak: Math.round(fly ? 70 + u * 100 : v.kind === 'line' ? 16 + u * 24 : 0),
    by, react: reactOf(by, landM, u, out), dir: dirKo(t),
    rest: pxOf(restM),
    relay: plan.relay ? plan.relay.map(pxOf) : null,
    relayM: plan.relay,
    cover: Object.fromEntries(Object.entries(plan.cover).map(([k, p]) => [k, pxOf(p)])),
    seg, throwMs, moveMs, rollMs, hop,
    runTo: r.bases > 0 ? r.bases : key === 'GO' || key === 'DP' ? 1 : 0,
    leg: leg * rnd(0.97, 1.03),
    far: key === 'HR' ? spotAt(t, u * 1.9, true) : null,           // 담장을 넘어 화면 밖으로
  };
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
  const [batKey, setBatKey] = useState('우타 당김');
  const [legKey, setLegKey] = useState('보통 발');
  const [on, setOn] = useState([0, 0, 0]);       // 1 · 2 · 3루 주자
  const [runs, setRuns] = useState(0);
  const [plan, setPlan] = useState(null);        // 이번 타구의 주자 움직임
  const [shot, setShot] = useState(null);
  const [ball, setBall] = useState(null);   // 이번 타구
  const [play, setPlay] = useState(null);
  const [step, setStep] = useState('idle'); // idle pitch hit land throw call
  const [cut, setCut] = useState(null);
  const timers = useRef([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clear(), []);

  const run = (key) => {
    clear(); setCut(null);
    const p = PITCH[pitchKey], r = RESULT[key];
    const end = [
      Math.round(HOME[0] + p.drift[0] + (Math.random() - 0.5) * 2 * p.jitter),
      Math.round(HOME[1] - 18 + p.drift[1] + (Math.random() - 0.5) * 2 * p.jitter),
    ];
    const sh = { ...p, key: pitchKey, velo: Math.round(rnd(p.velo[0], p.velo[1])), end };
    let hit = makeHit(key, BATTER[batKey], sh, LEGS[legKey]);
    const moves = advance(key, on, hit ? hit.d : 0);
    const run1 = moves[0];
    if (key === 'SB' && run1) hit = makeSteal(run1.to);
    const t = (ms, fn) => timers.current.push(setTimeout(fn, ms));
    let at = p.ms;
    if (key === 'SB') {
      if (!run1) { t(at, () => setStep('call')); at += 700; }   // 나가 있는 주자가 없다
      else {
        /* 주자는 투구와 함께 뛰고, 포수는 받아서 던진다 */
        const legMs = Math.round(runMsOf(1, false, LEGS[legKey] * 1.41));   // 리드와 스타트만큼 빠르다
        run1.start = 0; run1.ms = legMs; run1.in = legMs;
        const throwAt = p.ms + 60;
        run1.out = throwAt + hit.throwMs < run1.in - 40;
        run1.judged = true;
        t(throwAt, () => setStep('throw'));
        at = Math.max(throwAt + hit.throwMs, run1.in) + 160;
        t(at, () => setStep('call'));
        at += 1050;
      }
    } else if (!hit) {
      t(at, () => setStep('call'));
      at += 700;
    } else {
      t(at, () => setStep('hit'));                        // 친 순간 — 주자도 여기서 출발한다
      const start = at;
      at += hit.ms;
      t(at, () => setStep('land'));                       // 떨어진다
      /* 공이 멈출 때와 야수가 거기 닿을 때 중 늦은 쪽에 잡힌다 */
      const catchAt = Math.max(at + (hit.out ? 130 : hit.rollMs), start + hit.moveMs);
      const me = moves.find((x) => x.from === 0);
      hit.runTo = me ? me.to : 0;
      const runIn = start + runMsOf(Math.min(hit.runTo, 4), key === 'HR', hit.leg);   // 타자가 베이스를 밟는 때
      if (hit.relay) {
        const throwAt = catchAt;                          // 주우면 곧바로 던진다 — 들고 기다리지 않는다
        let land2 = throwAt + hit.throwMs;
        if (hit.out && land2 > runIn - 150) {
          /* 아웃이 될 송구 — 거리가 멀면 그만큼 강하게 던진다 */
          const need = Math.max(220, runIn - 150 - throwAt);   // 송구에 쓸 수 있는 시간
          const k = need / hit.throwMs;
          hit.seg = hit.seg.map((x) => Math.max(90, Math.round(x * k)));
          hit.hop = Math.max(70, Math.round(hit.hop * k));
          hit.throwMs = hit.seg.reduce((a, b) => a + b, 0) + hit.hop * Math.max(0, hit.seg.length - 1);
          land2 = throwAt + hit.throwMs;
        } else if (!hit.out && land2 < runIn + 150) {
          /* 던져봐야 주자가 먼저 들어간다 — 한 베이스 뒤로 돌려놓는다 */
          const back = key === '3B' ? BASE_M.B2 : key === '2B' ? FIELD.P[2] : null;
          if (back) {
            const path = hit.relayM.slice(0, -1).concat([back]);
            hit.relayM = path;
            hit.relay = path.map(pxOf);
            hit.seg = path.slice(1).map((q, i) => Math.round((gap(path[i], q) * THROW_MS + (i === 0 ? SET_MS : 0)) / 1));
            hit.throwMs = hit.seg.reduce((a, b) => a + b, 0) + hit.hop * Math.max(0, hit.seg.length - 1);
            const last = hit.relay[hit.relay.length - 1];
            Object.keys(hit.cover).forEach((k2) => {       // 받을 사람만 그 자리에 선다
              const p2 = hit.cover[k2];
              const keep = hit.relay.some((q) => q[0] === p2[0] && q[1] === p2[1]);
              if (!keep) delete hit.cover[k2];
            });
            if (key === '3B') hit.cover[hit.to[0] < HOME[0] ? '2B' : 'SS'] = last;
            land2 = throwAt + hit.throwMs;
          }
        }
        t(throwAt, () => setStep('throw'));
        at = land2;
      } else at = catchAt;
      at = Math.max(at, hit.runTo ? runIn : at) + 140;
      t(at, () => setStep('call'));
      at += 1050;
    }
    /* 주자마다 언제 베이스를 밟는지 — 태그업은 공을 잡고 나서 출발한다 */
    const catchAt2 = hit && !hit.steal ? Math.max(p.ms + hit.ms + (hit.out ? 130 : hit.rollMs), p.ms + hit.moveMs) : p.ms;
    if (key !== 'SB') moves.forEach((mv) => {
      /* 나가 있던 주자는 리드를 잡고, 태그업은 미리 자세를 잡고 뛴다 */
      const dash = mv.tag ? 1.26 : mv.from ? 1.28 : 1;   // 나가 있던 주자는 리드에서 출발한다
      const solo = mv.from ? rnd(0.93, 1.08) : 1;        // 주자마다 발이 다르다
      const legMs = runMsOf(mv.to - mv.from, key === 'HR', (hit?.leg || 1) * dash * solo);
      mv.start = mv.tag ? catchAt2 : p.ms;
      mv.ms = legMs;
      mv.in = mv.start + legMs;
    });
    /* 번트 — 앞 주자를 잡을 수 있으면 그쪽으로, 아니면 1루로 던진다 */
    let bunt = null;
    if (key === 'BUNT' && hit && hit.by) {
      const from = hit.restM;
      const reach = (mv) => {
        const goal = [null, BASE_M.B1, BASE_M.B2, BASE_M.B3, BASE_M.HOME][mv.to];
        const ms = Math.round((gap(from, goal) * THROW_MS + SET_MS) / (FIELD[hit.by][4] || 1));
        return { mv, goal, ms, arrive: catchAt2 + ms };
      };
      const lead = moves.filter((mv) => mv.from > 0).map(reach).sort((a, b) => b.mv.to - a.mv.to)[0];
      const batter = reach(moves.find((mv) => mv.from === 0));
      bunt = lead && lead.arrive < lead.mv.in - 40 ? lead : batter;   // 잡을 수 있는 쪽을 고른다
      bunt.mv.out = bunt.arrive < bunt.mv.in - 40;
      bunt.mv.judged = true;
      hit.relayM = [from, bunt.goal];
      hit.relay = hit.relayM.map(pxOf);
      hit.seg = [bunt.ms];
      hit.throwMs = bunt.ms;
      const man = bunt.mv.to === 4 ? 'C' : bunt.mv.to === 3 ? '3B' : bunt.mv.to === 2 ? 'SS' : '1B';
      hit.cover = man === hit.by ? {} : { [man]: pxOf(bunt.goal) };
      at = Math.max(at, bunt.arrive + 200);
    }
    /* 승부가 걸린 주자 — 가장 앞선 한 명에게 던진다 */
    const bet = key === 'SB' ? run1 : key === 'BUNT' ? bunt?.mv
      : moves.filter((mv) => mv.risky && !mv.out).sort((a, b) => b.to - a.to)[0];
    if (key !== 'SB' && key !== 'BUNT' && bet && hit && hit.by) {
      const from = hit.relayM ? hit.relayM[0] : hit.restM;
      const goal = [null, BASE_M.B1, BASE_M.B2, BASE_M.B3, BASE_M.HOME][bet.to];
      const far = gap(from, goal) > CUT_M;
      const cutM = far ? midM(goal, from, 0.42) : null;
      const path = cutM ? [from, cutM, goal] : [from, goal];
      const segs = path.slice(1).map((q, i) => Math.round(gap(path[i], q) * THROW_MS + (i === 0 ? SET_MS : 0)));
      const total = segs.reduce((a, b) => a + b, 0) + hit.hop * Math.max(0, segs.length - 1);
      const arrive = catchAt2 + total;
      /* 태그업은 미리 자세를 잡아 유리하고, 달리던 중 한 베이스 더는 아슬아슬하다 */
      bet.out = arrive < bet.in - (bet.tag ? 150 : 40);
      bet.judged = true;
      hit.relayM = path; hit.relay = path.map(pxOf); hit.seg = segs;
      hit.throwMs = total;
      hit.cover = {};
      const man = bet.to === 4 ? 'C' : bet.to === 3 ? '3B' : bet.to === 2 ? (hit.to[0] < HOME[0] ? '2B' : 'SS') : '1B';
      if (man !== hit.by) hit.cover[man] = pxOf(goal);
      if (cutM) {
        let cm = hit.to[0] < HOME[0] ? 'SS' : '2B';
        if (cm === man || cm === hit.by) cm = cm === 'SS' ? '2B' : 'SS';
        if (cm !== hit.by && cm !== man) hit.cover[cm] = pxOf(cutM);
      }
      const late = catchAt2 + total + 200;
      at = Math.max(at, late);
    }
    const done = settle(moves, on);
    const adv = { moves, ...done, bet };
    setShot(sh); setBall(hit); setPlay(key); setStep('pitch'); setPlan(adv);
    t(at, () => setCut(key));
    t(at + 1900, () => { setCut(null); setStep('idle'); setPlay(null); setShot(null); setBall(null); setPlan(null); });
    t(at, () => { setOn(adv.next); setRuns((v) => v + adv.runs); });
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
        <b className="font-display text-[30px] font-extrabold leading-none text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,.9)' }}>
          {runs}<small className="ml-1 text-[13px] font-bold text-white/60">점</small>
        </b>
      </div>
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
          {Object.entries(RESULT).map(([k, v]) => (
            <button key={k} type="button" onClick={() => run(k)}
              className="ui-cut px-3 py-1.5 text-[12.5px] font-bold text-white"
              style={{ '--c': '5px', background: 'rgba(7,12,20,.86)', boxShadow: `inset 0 0 0 1px ${v.color}59` }}>{v.ko}</button>
          ))}
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
        <b className="text-[15px] text-white">부감 뷰 연출</b>
        <span>같은 결과라도 떨어지는 자리 · 방향 · 비거리 · 처리하는 야수가 매번 달라집니다</span>
      </div>
      <Stage />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
