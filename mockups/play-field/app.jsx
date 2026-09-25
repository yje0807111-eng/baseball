/* 자동 플레이 — 그라운드를 미터로 다루고, 화면은 그 좌표를 그대로 비춘다.
   결과를 고르지 않는다. 타구가 생기고, 수비와 주자가 각자 판단하고, 도착 시간이 결과를 정한다. */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { UiStyle } from '/src/myteam/ui.jsx';
import { KEYFRAMES } from '/src/KboAugmentDraft.jsx';
import { SERIES } from '/src/data/seriesPlayers.js';
import { teamFlag } from '/src/myteam/teamArt.js';

/* ── 좌표 ─────────────────────────────────────────────────────────────
   홈이 원점. x 는 1루 쪽이 +, y 는 외야 쪽이 +. 단위는 미터.            */
const W = 1400, H = 764;
/* 카메라 — 배경 사진(ui/field/park-night.webp)의 홈 · 마운드 · 2루 · 1·3루에 맞춰 역산한 값 */
const CAM = { back: 25.65, high: 17.65, focal: 961.4 };
const TIL = Math.atan2(CAM.high, CAM.back + 58);
const CT = Math.cos(TIL), ST = Math.sin(TIL);
const CX = 700, CY = 269;
/* 미터 좌표(+높이) → 화면. 멀수록 작아지는 배율도 함께 돌려준다 */
const cam = (p, h = 0) => {
  const y = p[1] + CAM.back, z = CAM.high - h;
  const far = Math.max(9, y * CT + z * ST);            // 시선 방향 깊이
  const up = -y * ST + z * CT;                         // 화면 세로
  const s = CAM.focal / far;
  return { x: CX + p[0] * s, y: CY + up * s, s };
};
const px = (p, h = 0) => { const c = cam(p, h); return [c.x, c.y]; };
const scaleAt = (p) => cam(p, 0).s;
const S = 5.75;                       // 예전 비율(굵기 계산에 쓰던 값)
const TILT = 0.8;
const RAD = Math.PI / 180;
const at = (deg, d) => [Math.sin(deg * RAD) * d, Math.cos(deg * RAD) * d];
const len = (p) => Math.hypot(p[0], p[1]);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const ang = (p) => Math.atan2(p[0], p[1]) / RAD;
const mid = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const rnd = (a, b) => a + Math.random() * (b - a);
const bell = () => (Math.random() + Math.random() + Math.random()) / 3;
/* 담장까지의 거리 — 중앙 122m, 폴 100m */
const fence = (deg) => 100 + 22 * Math.cos(Math.min(45, Math.abs(deg)) * 2 * RAD);

const BASE = { 1: at(45, 27.4), 2: at(0, 38.8), 3: at(-45, 27.4), 4: [0, 0] };
const MOUND = at(0, 18.44);
const OFF = '#34d399', DEF = '#f87171';
/* 수비 자리 — [각도, 거리, 이름, 발, 어깨] */
const SPOT = {
  P: [0, 18.4, '투', 0.95, 0.95], C: [0, -1.6, '포', 0.88, 1.08],
  '1B': [38, 33, '1', 0.92, 0.94], '2B': [20, 43, '2', 1.06, 0.95],
  SS: [-20, 43, '유', 1.1, 1.05], '3B': [-38, 33, '3', 0.96, 1.08],
  LF: [-27, 88, '좌', 1.02, 0.96], CF: [0, 95, '중', 1.12, 1], RF: [27, 88, '우', 1, 1.1],
};
const FIELD = Object.fromEntries(Object.entries(SPOT).map(([k, [d, r, ko, leg, arm]]) => [k, { p: at(d, r), ko, leg, arm }]));
const INNER = ['P', 'C', '1B', '2B', 'SS', '3B'], OUTER = ['LF', 'CF', 'RF'];
/* 구단 색 — 없으면 무난한 회청색 */
const teamColor = (name) => (teamFlag(name || '') || { color: '#94a3b8' }).color;
/* 선수 얼굴 — 프로필 · 카드 · 실루엣 순으로 찾는다 */
const faceOf = (id) => (id
  ? `url(profiles/${encodeURIComponent(id)}.webp), url(cards/${encodeURIComponent(id)}.webp), url(ui/mt/silhouette-player.webp)`
  : 'url(ui/mt/silhouette-player.webp)');
/* ── 실제 선수 수치와 잇는다 ──────────────────────────────────────────
   타자 power·contact·speed·defense, 투수 stuff·control·stamina·stability (0~100).
   50을 리그 평균으로 보고 엔진이 쓰는 배수로 바꾼다. */
/* 리그 평균을 기준점으로 잡는다 — 실제 데이터 평균:
   타자 power 63 · contact 73 · speed 57 · defense 75, 투수 stuff 74 · control 69 · stability 76 */
const AVG = { power: 63, contact: 73, speed: 57, defense: 75, stuff: 74, control: 69, stability: 76 };
const MUL = (v, base, k) => 1 + ((v == null ? base : v) - base) * k;
const toBat = (p) => ({
  id: p.id, name: p.name, pos: p.position, hand: p.hand || 'R', ovr: p.overall,
  raw: p.stats,
  power: MUL(p.stats.power, AVG.power, 0.0045),         // 타구 속도
  contact: MUL(p.stats.contact, AVG.contact, 0.0040),   // 헛스윙 · 정타
  leg: MUL(p.stats.speed, AVG.speed, 0.0042),           // 주루
  def: MUL(p.stats.defense, AVG.defense, 0.0038),       // 수비 범위
  pull: 3 + Math.max(0, p.stats.power - AVG.power) * 0.16,
  eye: MUL(p.stats.contact, AVG.contact, 0.0024),       // 골라내는 눈
});
const toArm = (p) => ({
  id: p.id, name: p.name, ovr: p.overall, raw: p.stats, hand: p.hand || 'R',
  stuff: MUL(p.stats.stuff, AVG.stuff, 0.0045),         // 구위 — 헛스윙
  ctrl: MUL(p.stats.control, AVG.control, 0.0042),      // 제구 — 존에 넣는 비율
  stab: MUL(p.stats.stability, AVG.stability, 0.0018),  // 안정감 — 장타 억제
  stamina: p.stats.stamina || 60,
  pitches: 0,
});
/* 라인업 — 포지션을 채우고 정석대로 타순을 짠다 */
const SPOTS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'DH'];
const buildTeam = (series) => {
  const bats = series.players.filter((p) => p.type === 'batter').map(toBat);
  const arms = series.players.filter((p) => p.type === 'pitcher').map(toArm);
  const used = new Set();
  const take = (pos) => {
    const c = bats.filter((p) => !used.has(p.id) && (pos === 'DH' ? true : p.pos === pos))
      .sort((a, b) => b.ovr - a.ovr)[0]
      || bats.filter((p) => !used.has(p.id)).sort((a, b) => b.ovr - a.ovr)[0];
    if (c) used.add(c.id);
    return c;
  };
  const nine = SPOTS.map(take).filter(Boolean);
  /* 타순 — 1·2번은 발과 정확, 3~5번은 힘, 나머지는 종합 */
  const rest = [...nine];
  const pull1 = (score) => { const i = rest.map(score).reduce((b, v, j, a) => (v > a[b] ? j : b), 0); return rest.splice(i, 1)[0]; };
  const order = [];
  order.push(pull1((p) => p.raw.speed * 1.2 + p.raw.contact));
  order.push(pull1((p) => p.raw.contact * 1.3 + p.raw.speed * 0.4));
  order.push(pull1((p) => p.raw.contact + p.raw.power));
  order.push(pull1((p) => p.raw.power * 1.4));
  order.push(pull1((p) => p.raw.power * 1.1 + p.raw.contact * 0.5));
  while (rest.length) order.push(pull1((p) => p.raw.contact + p.raw.power * 0.6 + p.raw.speed * 0.3));
  return {
    name: series.title || series.franchise || series.id,
    year: series.year,
    order: order.map((p, i) => ({ ...p, no: i + 1 })),
    bench: bats.filter((p) => !used.has(p.id)).sort((a, b) => b.ovr - a.ovr),
    arms: arms.sort((a, b) => b.ovr - a.ovr),
    /* 수비 자리마다 그 선수의 수비 능력을 얹는다 */
    glove: (() => {
      const g = {};
      const at2 = (pos) => order.find((p) => p.pos === pos);
      g.C = at2('C'); g['1B'] = at2('1B'); g['2B'] = at2('2B'); g['3B'] = at2('3B'); g.SS = at2('SS');
      const of = order.filter((p) => p.pos === 'OF');
      g.LF = of[0]; g.CF = of[1] || of[0]; g.RF = of[2] || of[0];
      return g;
    })(),
  };
};
/* 수비 중인 팀의 글러브를 엔진이 참조한다 */
let GLOVE = null;
const fLeg = (k) => FIELD[k].leg * (GLOVE && GLOVE[k] ? GLOVE[k].def : 1);
const fArm = (k) => FIELD[k].arm * (GLOVE && GLOVE[k] ? MUL(GLOVE[k].raw.defense, AVG.defense, 0.003) : 1);
const fErr = (k) => (GLOVE && GLOVE[k] ? Math.max(0.3, 1 - (GLOVE[k].raw.defense - AVG.defense) * 0.014) : 1);

const BUNT_POOL = ['P', 'C', '1B', '3B', '2B', 'SS'];   // 코너와 배터리가 먼저지만 굴러온 쪽이 잡는다

/* ── 시간 ─────────────────────────────────────────────────────────── */
const TIME = 0.3;                                  // 실제 1초를 화면에서 몇 초로
const ms = (sec) => Math.round(sec * 1000 * TIME);
const RUN1 = ms(4.3);                              // 타자가 1루까지
const LEG = ms(1 / 6.5);                           // 사람이 1m 달리는 시간
const ARM = ms(1 / 33);                            // 송구가 1m 가는 시간
const ROLL = ms(1 / 11);                           // 타구가 1m 굴러가는 시간
const SET = ms(0.7);                               // 잡아서 던지는 자세
const HOP = ms(0.5);                               // 중계로 받아 다시 던지기
const POP = ms(0.65);                              // 포수가 받아 던지기까지
const runMs = (n, leg = 1, slow = 1) => Math.round(((RUN1 + RUN1 * 0.77 * Math.max(0, n - 1)) * slow) / leg);
const legMs = (m, who) => Math.round((m * LEG) / who.leg) + ms(0.2);
const legMsK = (m, k) => Math.round((m * LEG) / fLeg(k)) + ms(0.2);
const armMs = (m, who) => Math.round((m * ARM + SET * (m < 24 ? 0.66 : 1)) / who.arm);

/* ── 타자 · 투수 ──────────────────────────────────────────────────── */
const BATTER = {
  '우타 강타자': { hand: 'R', pull: 9, power: 1.06 },
  '우타 교타자': { hand: 'R', pull: 3, power: 0.94 },
  '좌타 교타자': { hand: 'L', pull: 3, power: 0.94 },
  '좌타 강타자': { hand: 'L', pull: 9, power: 1.06 },
};
/* ── 타순 — 아홉 명이 돌아간다 ────────────────────────────────────────
   1·2번은 빠르고 맞히는 쪽, 3~5번은 때리는 쪽, 하위는 약하다. */
const NAMES = [
  ['김도현', '이준서', '박서준', '최민우', '정우진', '강태윤', '윤재호', '임건우', '한지훈'],
  ['오승현', '신동하', '류현서', '조민재', '백승우', '서지환', '남기준', '황태호', '고은성'],
];
const MOLD = [                                    // [파워, 콘택트, 발]
  [0.94, 1.06, 1.12], [0.92, 1.1, 1.04], [1.06, 1.04, 1.0], [1.12, 0.96, 0.9], [1.08, 0.98, 0.94],
  [1.0, 1.0, 0.98], [0.9, 0.96, 1.0], [0.88, 0.94, 1.08], [0.85, 0.92, 0.96],
];
const POS_KO = ['중견수', '2루수', '우익수', '지명타자', '1루수', '좌익수', '3루수', '유격수', '포수'];
const makeLineup = (team) => MOLD.map((m, i) => ({
  no: i + 1, name: NAMES[team][i], pos: POS_KO[i],
  hand: Math.random() < (i < 2 ? 0.5 : 0.3) ? 'L' : 'R',
  pull: 3 + Math.random() * 8,
  power: m[0] * rnd(0.97, 1.03),
  contact: m[1] * rnd(0.97, 1.03),
  leg: m[2] * rnd(0.97, 1.03),
}));
const makeArm = () => ({ name: '선발', stuff: rnd(0.92, 1.08), ctrl: rnd(0.92, 1.08) });
const LEGS = { '발 빠름': 1.13, '보통 발': 1, '발 느림': 0.89 };
const PITCH = {
  직구: { fly: ms(0.42), velo: [143, 152], color: '#f87171', bend: -0.25 },
  슬라이더: { fly: ms(0.5), velo: [132, 139], color: '#fbbf24', bend: -1.1 },
  커브: { fly: ms(0.62), velo: [116, 125], color: '#7dd3fc', bend: 1.3 },
  체인지업: { fly: ms(0.56), velo: [124, 132], color: '#a78bfa', bend: 0.6 },
  포크: { fly: ms(0.52), velo: [129, 137], color: '#34d399', bend: 0.9 },
};
const RESULT = {
  IFF: { ko: '인필드 플라이', color: '#7dd3fc' }, E: { ko: '실책 출루', color: '#fca5a5' },
  FF: { ko: '파울 플라이 아웃', color: '#7dd3fc' }, WP: { ko: '폭투', color: '#93c5fd' },
  PB: { ko: '포일', color: '#93c5fd' }, KWP: { ko: '낫아웃 출루', color: '#93c5fd' },
  PK: { ko: '견제사', color: DEF }, PKS: { ko: '견제 세이프', color: '#94a3b8' },
  HR: { ko: '홈런', color: '#fde047' }, '3B': { ko: '3루타', color: OFF }, '2B': { ko: '2루타', color: OFF },
  H: { ko: '안타', color: OFF }, FO: { ko: '뜬공 아웃', color: '#7dd3fc' }, LO: { ko: '직선타 아웃', color: '#7dd3fc' },
  SF: { ko: '희생플라이', color: '#a7f3d0' }, GO: { ko: '땅볼 아웃', color: '#94a3b8' },
  FC: { ko: '야수선택', color: '#94a3b8' }, DP: { ko: '병살', color: DEF },
  BUNT: { ko: '희생번트', color: '#a7f3d0' }, FOUL: { ko: '파울', color: '#94a3b8' },
  K: { ko: '삼진', color: DEF }, BB: { ko: '볼넷', color: '#93c5fd' },
  SB: { ko: '도루 성공', color: '#fbbf24' }, CS: { ko: '도루 실패', color: DEF },
};

/* ── 1. 스윙 ──────────────────────────────────────────────────────── */
/* 같은 손 맞대결이면 타자가 불리하다 — 공이 등 뒤에서 오는 각 */
const platoon = (bat, arm) => (arm && arm.hand === bat.hand ? 0.955 : 1.03);
const swing = (bat, velo, mode, arm) => {
  if (mode === 'BUNT') return { exit: rnd(38, 68), la: rnd(-6, 5), deg: (Math.random() < 0.5 ? -1 : 1) * rnd(28, 42) };
  const stuff = arm ? arm.stuff : 1;
  const pl = platoon(bat, arm);
  const hitIt = bell() * 0.72 * (bat.contact || 1) * pl / stuff;  // 0 빗맞음 ~ 1 정타
  const exit = (88 + Math.min(1, hitIt) * 94) * bat.power * pl * rnd(0.96, 1.04) / (arm ? arm.stab : 1);
  const la = hitIt > 0.74 ? rnd(10, 33) : 13 + (bell() * 2 - 1) * 66;
  const way = bat.hand === 'R' ? -1 : 1;
  const deg = way * bat.pull + (velo - 132) * way * 0.35 + (bell() * 2 - 1) * 46;
  return { exit, la, deg };
};
/* ── 2. 타구가 어디까지 가고 얼마나 걸리나 ─────────────────────────── */
const flight = (exit, la) => {
  const v = exit / 3.6, th = la * RAD;
  if (la < 8) {                                             // 땅볼
    const d = Math.max(4, Math.min(96, v * (0.72 + Math.max(0, la) * 0.09)));
    return { kind: 'ground', d, hang: Math.round(d * ROLL * 0.85), apex: 0 };
  }
  const d = Math.max(9, ((v * v * Math.sin(2 * th)) / 9.8) * 0.87);
  const t = ((2 * v * Math.sin(th)) / 9.8) * 0.92;
  return { kind: la < 22 ? 'line' : 'fly', d, hang: Math.max(ms(0.9), ms(t)), apex: Math.round(d * Math.tan(th) * 0.26) };
};
/* ── 3. 수비 대형 ─────────────────────────────────────────────────── */
const shapeOf = (on, outs) => (on[2] && outs < 2 ? (on[0] ? 'half' : 'in') : on[0] && outs < 2 ? 'dp' : 'normal');
const SHIFT = { normal: 0, dp: -2.5, half: -5.5, in: -10 };
let SHIFT_DEG = 0;                                  // 당겨치는 타자를 보고 내야가 통째로 돈다
const standAt = (k, shape) => {
  const f = FIELD[k];
  if (k === 'P' || k === 'C') return f.p;
  const turn = SHIFT_DEG * (INNER.includes(k) ? 1 : 0.55);
  const a0 = ang(f.p) + turn, r0 = len(f.p);
  const r = INNER.includes(k) ? Math.max(7, r0 + SHIFT[shape]) : r0;
  return at(a0, r);
};
/* 시프트 각 — 힘 있고 당겨치는 타자일수록 크게 */
const shiftFor = (bat) => {
  if (!bat || !bat.raw) return 0;
  const pull = Math.max(0, bat.raw.power - 78) * 0.22;         // 78 넘는 파워부터
  return (bat.hand === 'R' ? -1 : 1) * Math.min(9, pull);
};
/* ── 4. 한 타구를 굴려본다 ────────────────────────────────────────── */
const hitBall = (bat, velo, on, outs, mode, arm) => {
  let sw = swing(bat, velo, mode, arm);
  /* 파울은 카운트에서 이미 처리했지만, 가끔은 파울 지역 뜬공으로 남는다 */
  for (let i = 0; i < 6 && Math.abs(sw.deg) > 45 && Math.random() < 0.8; i += 1) sw = swing(bat, velo, mode, arm);
  if (Math.abs(sw.deg) > 45) sw.deg = Math.sign(sw.deg) * rnd(30, 44);
  const fl = mode === 'BUNT' ? { kind: 'ground', d: rnd(11, 23), hang: ms(1.2), apex: 0 } : flight(sw.exit, sw.la);
  const deg = sw.deg, shape = shapeOf(on, outs);
  const foul = Math.abs(deg) > 45;
  const wall = fence(deg);
  const land = at(deg, Math.min(fl.d, wall * 1.3));
  const base = { exit: Math.round(sw.exit), la: Math.round(sw.la), deg: Math.round(deg), kind: fl.kind, m: Math.round(fl.d), hang: fl.hang, apex: fl.apex, shape, land, foul, mode };
  if (foul) {
    /* 파울 지역 뜬공 — 가까우면 코너 내야수나 포수가 잡는다 */
    if (fl.kind === 'fly' && fl.d > 6 && fl.d < 42) {
      const who = Math.abs(deg) > 60 ? 'C' : deg < 0 ? '3B' : '1B';
      const p = FIELD[who].p;
      const run = dist(p, land);
      const ok = run < 32 && Math.random() < 0.6 + (GLOVE && GLOVE[who] ? (GLOVE[who].raw.defense - AVG.defense) * 0.006 : 0);
      if (ok) return { ...base, key: 'FF', by: who, caught: true, grab: fl.hang + ms(0.25), stop: land };
    }
    return { ...base, key: 'FOUL', by: null, caught: false, grab: fl.hang + ms(0.8), stop: land };
  }
  if (fl.d >= wall && fl.kind !== 'ground') return { ...base, key: 'HR', by: null, caught: false, grab: fl.hang + ms(1.2), stop: land };

  /* 누가 처리하나 */
  const pool = mode === 'BUNT' ? BUNT_POOL : fl.kind === 'ground' ? INNER : fl.d < 62 ? INNER.concat(OUTER) : OUTER;
  const cand = pool.map((k) => {
    const p = standAt(k, shape), f = FIELD[k];
    if (fl.kind !== 'ground') {
      const run = dist(p, land);
      if (run > 48) return null;                        // 아무리 뛰어도 닿지 않는다
      const reach = legMsK(run, k);
      return { k, reach, ready: fl.hang, slack: fl.hang - reach };
    }
    const along = (p[0] * Math.sin(deg * RAD) + p[1] * Math.cos(deg * RAD));    // 타구 선 위로 얼마나 나가 있나
    const side = Math.abs(p[0] * Math.cos(deg * RAD) - p[1] * Math.sin(deg * RAD));
    if (along < -3 || along > 54) return null;
    const stopped = along > fl.d - 1;                                          // 공이 내 앞에서 멈춘다
    const reach = stopped ? legMsK(dist(p, land), k) : Math.round((side * LEG * 0.56) / fLeg(k)) + ms(0.12);
    const ready = stopped ? reach : Math.round(along * ROLL * 0.85);
    return { k, reach, ready, slack: ready - reach };
  }).filter(Boolean).sort((a, b) => b.slack - a.slack);
  const best = cand[0];
  let got = !!best && best.slack >= 0;
  /* 실책 — 잡을 타구를 놓친다. 강한 타구와 무리한 움직임일수록 */
  let error = false;
  if (got && best.slack < ms(0.95)) {
    const risk = (0.035 + (sw.exit > 150 ? 0.03 : 0) + (fl.kind === 'ground' ? 0.02 : 0)) * fErr(best.k);
    if (Math.random() < risk) { got = false; error = true; }
  }
  const caught = got && fl.kind !== 'ground' && (fl.kind === 'fly' || best.slack > ms(0.2));
  const by = best ? best.k : OUTER.reduce((m2, k) => (!m2 || dist(FIELD[k].p, land) < dist(FIELD[m2].p, land) ? k : m2), null);
  const stop = caught || (fl.kind === 'ground' && got) ? land : at(deg, Math.min(fl.d * 1.18, wall * 0.99));
  const grab = caught ? fl.hang + ms(0.2)
    : fl.kind === 'ground' && got ? Math.max(best.reach, best.ready) + ms(0.25)
      : Math.max(fl.hang + Math.round(dist(land, stop) * ROLL), legMsK(dist(standAt(by, shape), stop), by)) + ms(0.3);
  return { ...base, by, caught, got, grab, stop, error };
};
/* ── 5. 주루 판단 ─────────────────────────────────────────────────── */
const baseRun = (res, on, outs) => {
  const mv = [];
  const go = (from, to, opt) => mv.push({ from, to: Math.min(4, to), out: false, risky: false, tag: false, ...opt });
  if (res.key === 'HR') { [3, 2, 1].forEach((b) => on[b - 1] && go(b, 4)); go(0, 4); return mv; }
  if (res.key === 'FOUL') return mv;
  if (res.caught) {
    if (outs < 2) {
      if (on[2] && res.m >= 62) go(3, 4, { risky: true, tag: true });
      else if (on[1] && res.m >= 86 && !on[2]) go(2, 3, { risky: true, tag: true });
    }
    return mv;
  }
  if (res.got && res.kind === 'ground') {                   // 내야에서 잡혔다 — 포스만 강제로 뛴다
    const force1 = on[0], force2 = on[0] && on[1], force3 = on[0] && on[1] && on[2];
    if (on[2]) {
      /* 3루 주자는 전진 수비면 묶이고, 타구가 옆으로 가면 파고든다 */
      const home = force3 ? true : res.shape === 'in' ? Math.random() < 0.12 : Math.random() < 0.34;
      if (home) go(3, 4, { risky: true });
    }
    if (on[1]) { if (force2) go(2, 3, { risky: false }); else if (res.deg > 12 && Math.random() < 0.5) go(2, 3, { risky: true }); }
    if (on[0]) go(1, 2, { risky: false });
    go(0, 1, { risky: true });
    return mv;
  }
  const bold = outs === 2 ? 0.36 : outs === 1 ? 0.14 : 0.06;    // 2아웃이면 맞는 순간 달린다
  const deep = res.m, right = res.deg > 8;
  if (on[2]) go(3, 4);
  if (on[1]) { const g = Math.random() < 0.34 + bold + (deep > 62 ? 0.16 : 0) + (right ? 0.06 : 0); go(2, g ? 4 : 3, { risky: g }); }
  if (on[0]) { const g = Math.random() < 0.1 + bold * 0.8 + (deep > 72 ? 0.14 : 0) + (right ? 0.08 : 0); go(1, g ? 3 : 2, { risky: g }); }
  /* 타자 — 깊고 구석이면 2루, 아주 깊으면 3루까지 */
  const corner = Math.abs(res.deg) > 26;
  const extra = deep >= 80 && Math.abs(res.deg) > 24 ? 3 : deep >= 62 ? 2 : 1;
  go(0, extra, { risky: extra > 1 });
  return mv;
};
/* ── 6. 송구 판단 — 선행 주자를 잡을 수 있으면 그쪽, 아니면 확실한 아웃 ─ */
const throwPath = (from, goal, who) => {
  const far = dist(from, goal) > 34;
  const cut = far ? mid(goal, from, 0.42) : null;
  const path = cut ? [from, cut, goal] : [from, goal];
  const seg = path.slice(1).map((q, i) => armMs(dist(path[i], q), i === 0 ? who : { arm: 1 }));
  return { path, seg, total: seg.reduce((a, b) => a + b, 0) + HOP * (seg.length - 1) };
};
const decideThrow = (res, mv, outs, grab) => {
  if (!res.by || res.key === 'HR' || res.key === 'FOUL' || res.caught) return null;
  const who = { arm: fArm(res.by) };
  const live = mv.filter((m) => !m.out);
  const rate = live.map((m) => {
    const t = throwPath(res.stop, BASE[m.to], who);
    return { m, t, slack: m.in - (grab + t.total) };       // 양수면 잡는다
  });
  const batter = rate.find((x) => x.m.from === 0);
  const force2 = rate.find((x) => x.m.from === 1 && x.m.to === 2);
  /* 병살 — 2루를 밟고 1루로. 실제 중계 시간(피벗 0.35초)까지 본다 */
  if (res.kind === 'ground' && res.got && force2 && batter && outs < 2) {
    const a = throwPath(res.stop, BASE[2], who);
    const b = Math.round((dist(BASE[2], BASE[1]) * ARM) / fArm('2B')) + ms(0.25);   // 피벗은 자세를 다시 잡지 않는다
    const arrive2 = grab + a.total, arrive1 = arrive2 + ms(0.35) + b;
    if (arrive2 < force2.m.in - ms(0.1) && arrive1 < batter.m.in) {
      return { kind: 'dp', path: [res.stop, BASE[2], BASE[1]], seg: [...a.seg, b], hop: ms(0.35), calls: [{ m: force2.m, at: arrive2 }, { m: batter.m, at: arrive1 }] };
    }
  }
  /* 3루 주자의 홈 승부 — 전진 수비일 때만 홈으로 던진다 */
  const home = rate.find((x) => x.m.from === 3 && x.m.to === 4);
  if (res.kind === 'ground' && res.got && home && res.shape === 'in' && home.slack > 0) {
    return { kind: 'one', path: home.t.path, seg: home.t.seg, hop: HOP, calls: [{ m: home.m, at: grab + home.t.total }] };
  }
  /* 확실한 아웃이 기본 — 타자를 못 잡을 때만 앞 주자를 노린다 */
  if (batter && batter.slack > 0) {
    return { kind: 'one', path: batter.t.path, seg: batter.t.seg, hop: HOP, calls: [{ m: batter.m, at: grab + batter.t.total }] };
  }
  const lead = rate.filter((x) => x.m.from > 0 && x.slack > ms(0.13)).sort((a, b) => b.m.to - a.m.to)[0];
  const pick = lead || batter || rate[0];
  if (!pick) return null;
  return { kind: 'one', path: pick.t.path, seg: pick.t.seg, hop: HOP, calls: [{ m: pick.m, at: grab + pick.t.total }] };
};
/* ── 6-2. 베이스 커버 — 번트는 정해진 약속대로 움직인다 ──────────────── */
const coverOf = (res, thr, on) => {
  const c = {};                                    // 포지션 → 서 있을 자리(미터)
  if (!thr) return c;
  const goal = thr.path[thr.path.length - 1];
  const no = [1, 2, 3, 4].find((b) => dist(BASE[b], goal) < 2.5);
  if (res && res.mode === 'BUNT') {
    /* 1루수가 나왔으면 2루수가 1루를 받고, 아니면 1루수가 제자리에서 받는다 */
    if (res.by === '1B') c['2B'] = BASE[1]; else c['1B'] = BASE[1];
    /* 1·2루면 휠 플레이 — 유격수가 3루, 2루수가 2루 */
    if (on[0] && on[1]) { c.SS = BASE[3]; c['2B'] = c['2B'] || BASE[2]; }
    else c.SS = BASE[2];
    /* 3루수가 나왔으면 투수가 3루를 메운다 */
    if (res.by === '3B') c.P = BASE[3];
    delete c[res.by];
    return c;
  }
  if (no === 1) c['1B'] = BASE[1];
  else if (no === 2) c[res && res.deg < 0 ? '2B' : 'SS'] = BASE[2];
  else if (no === 3) c['3B'] = BASE[3];
  else if (no === 4) c.C = BASE[4];
  if (thr.path.length === 3) {                     // 중계는 타구 쪽 미들 인필더
    let man = res && res.deg < 0 ? 'SS' : '2B';
    if (c[man] || man === (res && res.by)) man = man === 'SS' ? '2B' : 'SS';
    if (!c[man] && man !== (res && res.by)) c[man] = thr.path[1];
  }
  if (res) delete c[res.by];
  return c;
};
/* 인필드 플라이 — 1·2루(또는 만루), 2아웃 미만, 내야에 뜬 평범한 뜬공이면 타자는 그대로 아웃 */
const infieldFly = (res, on, outs) => res.kind === 'fly' && outs < 2 && on[0] && on[1]
  && res.m < 48 && res.mode !== 'BUNT';
/* 베이스 뒤로 물러나 받치는 자리 */
const beyond = (p, k) => { const d = len(p) || 1; return [p[0] + (p[0] / d) * k, p[1] + (p[1] / d) * k]; };
const backOf = (res, thr, cover) => {
  const b = {};
  if (!thr || !res) return b;
  const goal = thr.path[thr.path.length - 1];
  const no = [1, 2, 3, 4].find((n) => dist(BASE[n], goal) < 2.5);
  /* 투수는 3루와 홈을 받친다 */
  if (no === 3) b.P = beyond(BASE[3], 11);
  else if (no === 4) b.P = [0, -9];
  /* 외야수는 송구가 가는 베이스 뒤로 */
  if (no === 1) b.RF = beyond(BASE[1], 15);
  if (no === 2) b[res.deg < 0 ? 'LF' : 'RF'] = beyond(BASE[2], 15);
  if (no === 3) b.LF = beyond(BASE[3], 15);
  /* 내야 땅볼이면 그 방향 외야수가 야수 뒤를 받친다 */
  if (res.kind === 'ground' && res.got) {
    const of = res.deg < -12 ? 'LF' : res.deg > 12 ? 'RF' : 'CF';
    if (!b[of]) b[of] = beyond(res.stop, 13);
  }
  delete b[res.by];
  Object.keys(cover || {}).forEach((k) => delete b[k]);
  return b;
};
/* ── 7. 결과 이름표 ───────────────────────────────────────────────── */
const nameOf = (res, mv, on, outs) => {
  if (res.key === 'FF') return 'FF';
  if (res.key !== 'HR' && res.key !== 'FOUL' && infieldFly(res, on, outs)) return 'IFF';
  if (res.error) return 'E';
  if (res.key === 'HR' || res.key === 'FOUL') return res.key;
  const bat = mv.find((m) => m.from === 0);
  const dead = mv.filter((m) => m.out).length;
  if (res.caught) return mv.some((m) => m.tag && m.to === 4 && !m.out) ? 'SF' : res.kind === 'fly' ? 'FO' : 'LO';
  if (!bat) return 'GO';
  /* 내야에서 처리된 땅볼만 땅볼 아웃 — 안타성 타구에서 욕심내다 죽으면 기록은 안타다 */
  if (bat.out) return dead >= 2 ? 'DP' : res.mode === 'BUNT' ? 'BUNT' : res.got && res.kind === 'ground' ? 'GO' : 'H';
  if (dead > 0) return 'FC';
  return bat.to >= 4 ? 'HR' : bat.to === 3 ? '3B' : bat.to === 2 ? '2B' : 'H';
};
const settle = (mv, on, caught) => {
  const next = [...on];
  let runs = 0;
  mv.forEach((m) => { if (m.from > 0) next[m.from - 1] = 0; });
  mv.forEach((m) => { if (m.out) return; if (m.to >= 4) runs += 1; else next[m.to - 1] = 1; });
  return { next, runs, outs: mv.filter((m) => m.out).length + (caught ? 1 : 0) };
};
const DIR_KO = (deg) => (deg < -38 ? '좌측 파울선' : deg < -20 ? '좌익수' : deg < -7 ? '좌중간'
  : deg < 7 ? '중견수' : deg < 20 ? '우중간' : deg < 38 ? '우익수' : '우측 파울선');

/* ── 8. 타석 — 볼카운트를 굴린다 ──────────────────────────────────────
   투수는 유리하면 유인구, 불리하면 스트라이크를 넣는다.
   타자는 유리한 카운트에서 크게, 몰리면 좁혀 친다. */
const atBat = (bat, arm) => {
  let b = 0, s = 0, pitches = 0;
  const ctrl = arm ? arm.ctrl : 1, stuff = arm ? arm.stuff : 1, con = (bat.contact || 1) * platoon(bat, arm);
  for (;;) {
    pitches += 1;
    const edge = s - b;                                   // 양수면 투수가 앞선다
    const base = edge >= 2 ? 0.31 : edge === 1 ? 0.44 : edge <= -2 ? 0.68 : edge === -1 ? 0.58 : 0.5;
    const zone = Math.min(0.85, base * ctrl);
    const inZone = Math.random() < zone;
    /* 타자의 스윙 판단 — 몰리면 나쁜 공도 건드리고, 유리하면 고른다 */
    const swingAt = inZone
      ? (b === 3 && s < 2 ? 0.52 : s === 2 ? 0.82 : edge < 0 ? 0.74 : 0.62)
      : ((s === 2 ? 0.28 : edge < 0 ? 0.1 : 0.17) / (bat.eye || 1));
    if (Math.random() < swingAt) {
      const miss = ((inZone ? 0.215 : 0.52) + (s === 2 ? 0.07 : 0)) * stuff / con;   // 구위가 좋으면 헛친다
      if (Math.random() < miss) { s += 1; if (s >= 3) return { end: 'K', b, s, pitches }; continue; }
      const foul = inZone ? 0.3 : 0.44;
      if (Math.random() < foul) { if (s < 2) s += 1; continue; }
      return { end: 'BIP', b, s, pitches, good: inZone && edge <= 0 };   // 유리한 카운트에 존 안 = 잘 맞는다
    }
    if (inZone) { s += 1; if (s >= 3) return { end: 'K', b, s, pitches }; }
    else { b += 1; if (b >= 4) return { end: 'BB', b, s, pitches }; }
  }
};
/* 폭투와 포일 — 제구가 나쁜 투수와 포구가 나쁜 포수일수록 잦다 */
const loosePitch = (arm, catcher) => {
  const wp = 0.017 * (2 - (arm ? arm.ctrl : 1));
  const pb = 0.006 * (catcher ? Math.max(0.4, 1 - (catcher.raw.defense - AVG.defense) * 0.012) : 1);
  const r = Math.random();
  if (r < wp) return 'WP';
  if (r < wp + pb) return 'PB';
  return null;
};
/* 낫아웃 — 1루가 비었거나 2아웃일 때만 뛸 수 있다 */
const dropped = (catcher, on, outs) => {
  if (on[0] && outs < 2) return false;
  const miss = 0.035 * (catcher ? Math.max(0.35, 1 - (catcher.raw.defense - AVG.defense) * 0.013) : 1);
  return Math.random() < miss;
};
/* 견제 — 발 느린 주자를 제구 좋은 투수가 잡는다 */
const pickoff = (arm, runner) => {
  const edge = (arm ? arm.ctrl : 1) - (runner ? runner.leg : 1);
  return Math.random() < Math.max(0.04, 0.12 + edge * 0.6);
};
/* ── 9. 작전 — 정석을 따르되 가끔 허를 찌른다 ─────────────────────────
   번트는 후반 접전에서 한 점을 노릴 때만(득점 기대값은 오히려 내려간다).
   도루는 발과 카운트, 히트앤런은 1루 주자와 병살 회피. */
const tactic = (g, bat, leg) => {
  const { on, outs, inning, half, score } = g;
  const lead = half === 0 ? score[0] - score[1] : score[1] - score[0];
  const late = inning >= 7;
  const close = Math.abs(lead) <= 1;
  const roll = Math.random();
  /* 한 점을 반드시 만들어야 하는 자리 — 희생번트 */
  if (outs === 0 && on[0] && !on[2] && late && close && lead <= 0 && bat.power < 1 && roll < 0.55) return 'BUNT';
  /* 기습번트 — 3루수가 깊고 발이 빠르면 아주 가끔 */
  if (outs < 2 && !on[0] && leg >= 1.1 && roll < 0.05) return 'BUNT';
  /* 도루 — 2루가 비었고 발이 있으면 */
  if (on[0] && !on[1] && leg >= 1.0 && outs < 2 && roll < (leg >= 1.1 ? 0.3 : 0.12)) return 'SB';
  /* 3루 도루 — 아주 가끔, 2아웃 아닐 때 허를 찌른다 */
  if (on[1] && !on[2] && outs === 1 && leg >= 1.1 && roll < 0.05) return 'SB';
  /* 견제 — 발 빠른 주자가 1루에 있으면 묶어 둔다 */
  if (on[0] && leg >= 1.04 && roll < 0.06) return 'PK';
  return 'SWING';
};
/* 고의4구 — 1루가 비고 2아웃, 강타자를 거른다 */
const walkHim = (g, bat) => {
  const { on, outs, inning, score, half } = g;
  const lead = half === 0 ? score[1] - score[0] : score[0] - score[1];
  return outs === 2 && !on[0] && (on[1] || on[2]) && inning >= 7 && lead >= 0 && lead <= 2
    && bat.power > 1 && Math.random() < 0.35;
};

/* 빠른 점검용 — 연출 없이 아홉 이닝을 돌려 본다 */
if (typeof window !== 'undefined') {
  window.__sim9 = (pick) => {
    const pool = SERIES.filter((x) => x.players.filter((p) => p.type === 'batter').length >= 9
      && x.players.some((p) => p.type === 'pitcher'));
    const ta = buildTeam(pool[pick ? pick[0] : Math.floor(Math.random() * pool.length)]);
    const tb = buildTeam(pool[pick ? pick[1] : Math.floor(Math.random() * pool.length)]);
    const teams = [ta, tb];
    const arms = [ta.arms[0], tb.arms[0]];
    const line = [ta.order, tb.order];
    const idx = [0, 0];
    const g = { on: [0, 0, 0], outs: 0, inning: 1, half: 0, score: [0, 0] };
    const out = [];
    let guard = 0;
    while (g.inning <= 12 && guard++ < 1200) {
      const side = g.half, dside = side ? 0 : 1;
      const team = teams[side], opp = teams[dside];
      let bat = line[side][idx[side]];
      const leg = bat.leg;
      GLOVE = opp.glove;
      /* 투수 교체 */
      if (tiredOut(arms[dside]) && opp.arms.length > 1) {
        const next = opp.arms.find((a2) => a2 !== arms[dside] && !a2.used);
        if (next) { next.used = true; arms[dside] = next; out.push(g.inning + (side ? '말' : '초') + ' 투수 교체 → ' + next.name); }
      }
      const arm = arms[dside];
      /* 대타 */
      const pinch = pinchFor(team, bat, g);
      if (pinch) { pinch.used = true; line[side][idx[side]] = { ...pinch, no: bat.no }; bat = line[side][idx[side]];
        out.push(g.inning + (side ? '말' : '초') + ' 대타 ' + pinch.name); }
      SHIFT_DEG = shiftFor(bat);
      const act = walkHim(g, bat) ? 'BB' : tactic(g, bat, leg);
      const pa = runPA(g, bat, arm, team, opp, act);
      arm.pitches += pa.pitches || 1;
      let mode = pa.key === 'BIP' ? (act === 'BUNT' ? 'BUNT' : 'SWING') : pa.key;
      let note = pa.note;
      let key = mode, mv = [], res = null, done = { next: [...g.on], runs: 0, outs: 0 };
      if (pa.mv) {                                  // 폭투 · 포일 · 낫아웃 · 견제
        mv = pa.mv.map((m) => ({ ...m, in: 1, ms: 1, start: 0 }));
        done = settle(mv, g.on);
        key = pa.key;
      } else if (mode === 'K') { done.outs = 1; }
      else if (mode === 'BB') {
        const push = [];
        if (g.on[0] && g.on[1] && g.on[2]) push.push(3, 2, 1); else if (g.on[0] && g.on[1]) push.push(2, 1); else if (g.on[0]) push.push(1);
        mv = push.map((b2) => ({ from: b2, to: b2 + 1, out: false }));
        mv.push({ from: 0, to: 1, out: false });
        mv.forEach((m) => { m.in = 1; m.ms = 1; m.start = 0; });
        done = settle(mv, g.on);
      } else if (mode === 'SB') {
        const to = g.on[0] && !g.on[1] ? 2 : g.on[1] && !g.on[2] ? 3 : g.on[2] ? 4 : g.on[0] ? 2 : 0;
        if (to) {
          const runner = { leg: bat.leg };
          const inAt = Math.round(runMs(1, bat.leg * 1.41));
          const tp = throwPath(FIELD.C.p, BASE[to], { arm: fArm('C') });
          const m = { from: to - 1 || 3, to, out: tp.seg.reduce((x, y) => x + y, 0) + POP < inAt - ms(0.13), in: inAt, ms: inAt, start: 0 };
          key = m.out ? 'CS' : 'SB'; mv = [m]; done = settle(mv, g.on);
        } else { key = 'CS'; done.outs = 0; }
      } else {
        res = hitBall(bat, 148, g.on, g.outs, mode === 'BUNT' ? 'BUNT' : null, arm);
        if (res.key === 'FF') { mv = []; done = settle([], g.on, true); key = 'FF'; }
        else {
        mv = baseRun(res, g.on, g.outs);
        mv.forEach((m) => { m.start = m.tag ? res.grab : 0; m.ms = runMs(m.to - m.from, leg * (m.tag ? 1.26 : m.from ? 1.28 : 1)); m.in = m.start + m.ms; });
        const thr = decideThrow(res, mv, g.outs, res.grab);
        if (thr) thr.calls.forEach((c) => { c.m.out = c.at < c.m.in - ms(0.13); c.m.judged = true; });
        const tag = mv.find((m) => m.tag && !m.judged);
        if (res.caught && tag) { const tp = throwPath(res.land, BASE[tag.to], FIELD[res.by]); tag.out = res.grab + tp.total < tag.in - ms(0.5); tag.judged = true; }
        key = nameOf(res, mv, g.on, g.outs);
        if (key === 'IFF') { mv = mv.filter((m) => m.from > 0); done = settle(mv, g.on); done.outs = 1; }
        else done = settle(mv, g.on, res.caught);
        }
      }
      const half = g.half;
      out.push(g.inning + (half ? '말' : '초') + ' ' + g.outs + 'out ' + JSON.stringify(g.on) + ' → ' + (RESULT[key] ? RESULT[key].ko : key)
        + (done.runs ? ' +' + done.runs : '') + ' [' + note + ']' + (res ? ' ' + Math.round(res.la) + 'd ' + Math.round(res.m) + 'm ' + (res.by || '-') : ''));
      idx[half] = (idx[half] + 1) % 9;
      g.score[half] += done.runs;
      const nOut = g.outs + done.outs;
      if (g.inning >= 9 && half === 1 && g.score[1] > g.score[0]) break;        // 끝내기
      if (nOut >= 3) {
        if (g.inning >= 9 && half === 1 && g.score[0] !== g.score[1]) { g.inning += 1; break; }
        g.outs = 0; g.on = [0, 0, 0]; if (half) g.inning += 1; g.half = half ? 0 : 1;
      }
      else { g.outs = nOut; g.on = done.next; }
    }
    return { score: g.score, lines: out, teams: [ta.name, tb.name] };
  };
}

/* ── 10. 한 타석 전체 — 투구 사이 사건까지 포함한다 ─────────────────── */
const runPA = (g, bat, arm, team, opp, act) => {
  const on = g.on, outs = g.outs;
  const catcher = opp.glove.C;
  /* 투구 사이 사건 — 주자가 있을 때만 의미가 있다 */
  if (act === 'SWING' && (on[0] || on[1] || on[2])) {
    const loose = loosePitch(arm, catcher);
    if (loose) {
      const mv = [];
      [3, 2, 1].forEach((b) => { if (on[b - 1]) mv.push({ from: b, to: b + 1, out: false, risky: false, tag: false }); });
      return { key: loose, mv, note: loose === 'WP' ? '폭투' : '포일', pitches: 1 };
    }
  }
  if (act === 'PK') {
    const runner = null;
    const out = pickoff(arm, { leg: 1 });
    return { key: out ? 'PK' : 'PKS', mv: out ? [{ from: 1, to: 1, out: true, risky: false, tag: false }] : [], note: '견제', pitches: 1 };
  }
  if (act === 'SB' || act === 'BUNT') return { key: act, mv: null, note: act === 'SB' ? '도루' : '번트', pitches: 1 };
  const ab = atBat(bat, arm);
  if (ab.end === 'K') {
    if (dropped(catcher, on, outs)) {
      return { key: 'KWP', mv: [{ from: 0, to: 1, out: false, risky: false, tag: false }], note: '낫아웃', pitches: ab.pitches };
    }
    return { key: 'K', mv: [], note: ab.b + '-' + ab.s, pitches: ab.pitches, outs: 1 };
  }
  if (ab.end === 'BB') return { key: 'BB', mv: null, note: ab.b + '-' + ab.s, pitches: ab.pitches };
  return { key: 'BIP', mv: null, note: ab.b + '-' + ab.s, pitches: ab.pitches };
};
/* 투수 교체 — 투구 수가 체력을 넘으면 불펜 */
const tiredOut = (arm) => arm.pitches > 40 + arm.stamina * 1.15;
/* 대타 — 후반 접전에 하위 타순이면 벤치에서 더 나은 타자를 낸다 */
const pinchFor = (team, bat, g) => {
  if (g.inning < 7 || Math.abs(g.score[0] - g.score[1]) > 2) return null;
  if (bat.no < 7) return null;
  const best = team.bench.filter((p) => !p.used)[0];
  if (!best || best.ovr < bat.ovr + 6) return null;
  return best;
};

/* ── 화면 ─────────────────────────────────────────────────────────── */
const CSS = `
@keyframes drawIn { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes moveOn { from { offset-distance: 0%; } to { offset-distance: 100%; } }
@keyframes fadeOut { from { opacity: .85; } to { opacity: 0; } }
@keyframes popIn { 0% { opacity: 0; transform: scale(1.5); } 18% { opacity: 1; transform: scale(1); } 76% { opacity: 1; } 100% { opacity: 0; } }
@keyframes ringOut { 0% { transform: scale(.4); opacity: .9; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes camShake { 0%,100% { transform: none; } 22% { transform: translate3d(-7px,5px,0); } 55% { transform: translate3d(6px,-4px,0); } }
`;
/* 필드 그림 — 좌표가 곧 그림이다 */
function Field() {
  const arc2 = (r, a, b, step = 3) => { const o = []; for (let d = a; d <= b; d += step) o.push(at(d, typeof r === 'function' ? r(d) : r)); return o; };
  const px2 = (p) => px(p).join(',');
  return (
    <div className="absolute inset-0">
      <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/field/park-night.webp)' }} />
      <span className="absolute inset-0" style={{ background: 'radial-gradient(78% 62% at 50% 62%, transparent, rgba(4,8,14,.5) 92%)' }} />
      <svg className="absolute inset-0" width={W} height={H} style={{ pointerEvents: 'none' }}>
        {/* 사진 속 베이스를 잇는 주루선 */}
        <polygon points={[BASE[4], BASE[1], BASE[2], BASE[3]].map(px2).join(' ')} fill="none" stroke="#eaf6ff" strokeWidth="1.3" opacity="0.42" strokeDasharray="6 6" />
      </svg>
    </div>
  );
}
function FieldDrawn() {
  const poly = (pts) => pts.map((p) => px(p).join(',')).join(' ');
  const arc = (r, from, to, step = 3) => { const out = []; for (let d = from; d <= to; d += step) out.push(at(d, typeof r === 'function' ? r(d) : r)); return out; };
  const ring = (c, r) => { const out = []; for (let d = 0; d < 360; d += 12) out.push([c[0] + Math.sin(d * RAD) * r, c[1] + Math.cos(d * RAD) * r]); return out; };
  const grass = [[0, 0], ...arc((d) => fence(d), -45, 45), [0, 0]];
  const dirt = [[0, 0], ...arc(29, -47, 47), [0, 0]];
  const infield = [BASE[4], BASE[1], BASE[2], BASE[3]];
  return (
    <svg className="absolute inset-0" width={W} height={H}>
      <defs>
        <radialGradient id="lawn" cx="50%" cy="86%" r="86%">
          <stop offset="0%" stopColor="#2f7a3f" /><stop offset="62%" stopColor="#256434" /><stop offset="100%" stopColor="#174524" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="#080d10" />
      <polygon points={poly([[0, -6], ...arc((d) => fence(d) + 7, -58, 58, 3), [0, -6]])} fill="#6d4226" opacity="0.95" />
      <polygon points={poly(grass)} fill="url(#lawn)" />
      {[...Array(11)].map((_, i) => (
        <polygon key={i} points={poly([[0, 0], ...arc((d) => fence(d), -45 + i * 9, -45 + i * 9 + 4.5, 1.5), [0, 0]])}
          fill="#ffffff" opacity={i % 2 ? 0.045 : 0} />
      ))}
      <polygon points={poly(dirt)} fill="#8a5330" opacity="0.96" />
      <polygon points={poly(infield.map((p) => [p[0] * 0.82, p[1] * 0.82 + 3.4]))} fill="#2f7a3f" opacity="0.96" />
      {[[4, 1], [1, 2], [2, 3], [3, 4]].map(([a, b], i) => {
        const w = 2.9 * ((scaleAt(BASE[a]) + scaleAt(BASE[b])) / 2);
        return <line key={i} x1={px(BASE[a])[0]} y1={px(BASE[a])[1]} x2={px(BASE[b])[0]} y2={px(BASE[b])[1]}
          stroke="#8a5330" strokeWidth={w} strokeLinecap="round" opacity="0.96" />;
      })}
      {[-45, 45].map((d) => (
        <line key={d} x1={px([0, 0])[0]} y1={px([0, 0])[1]} x2={px(at(d, fence(d) + 5))[0]} y2={px(at(d, fence(d) + 5))[1]}
          stroke="#f4efe6" strokeWidth="2.5" opacity="0.8" />
      ))}
      <polyline points={poly(arc((d) => fence(d), -45, 45, 2))} fill="none" stroke="#1d2a33" strokeWidth="7" opacity="0.9" />
      <polyline points={poly(arc((d) => fence(d), -45, 45, 2))} fill="none" stroke="#8fd3ff" strokeWidth="1.4" opacity="0.28" />
      <polygon points={poly(ring(MOUND, 5.5))} fill="#8a5330" opacity="0.98" />
      <polygon points={poly(ring(MOUND, 1))} fill="#f4efe6" opacity="0.85" />
      <polygon points={poly(ring([0, 0], 4.6))} fill="#8a5330" opacity="0.96" />
      {[-1, 1].map((v) => (
        <polygon key={v} points={poly([[v * 1 - 0.9 * v, -0.7], [v * 2.8, -0.7], [v * 2.8, 1.5], [v * 1 - 0.9 * v, 1.5]])}
          fill="none" stroke="#f4efe6" strokeWidth="1.6" opacity="0.55" />
      ))}
      {[1, 2, 3].map((b) => {
        const c = px(BASE[b]), w = Math.max(5, 0.9 * scaleAt(BASE[b]));
        return <rect key={b} x={c[0] - w} y={c[1] - w} width={w * 2} height={w * 2} fill="#f8f5ef" transform={`rotate(45 ${c[0]} ${c[1]})`} opacity="0.95" />;
      })}
      <polygon points={poly([[-0.72, 0.5], [0.72, 0.5], [0.72, -0.2], [0, -0.85], [-0.72, -0.2]])} fill="#f8f5ef" />
    </svg>
  );
}
/* 선수 한 명 — 얼굴 동그라미와 이름, 테두리는 그 팀 색 */
const Mark = ({ p, who, tint, label, big = 0, on = false, style }) => {
  const c = px(p), r = Math.max(11, Math.min(big ? 24 : 21, (big ? 2.7 : 2.45) * scaleAt(p)));
  const name = who ? who.name : label;
  const move = { transition: 'left .45s ease-out, top .45s ease-out' };
  return (
    <>
      <i className="pointer-events-none absolute rounded-[50%]" style={{
        ...move, left: c[0] - r * 1.05, top: c[1] + r * 0.5, width: r * 2.1, height: r * 0.68,
        background: 'rgba(0,0,0,.55)', filter: 'blur(2.5px)',
      }} />
      <span className="pointer-events-none absolute rounded-full bg-cover" style={{
        ...move, left: c[0] - r, top: c[1] - r * 1.1, width: r * 2, height: r * 2,
        backgroundImage: faceOf(who && who.id), backgroundPosition: '50% 24%',
        border: `2px solid ${on ? '#fff' : tint}`,
        boxShadow: on ? `0 0 16px ${tint}, 0 2px 7px rgba(0,0,0,.6)` : '0 2px 7px rgba(0,0,0,.6)',
        filter: on ? 'saturate(1.15) brightness(1.12)' : 'brightness(1.05)', ...style,
      }} />
      {name && (
        <span className="pointer-events-none absolute text-center font-bold" style={{
          ...move, left: c[0] - r * 2.4, top: c[1] + r * 1.05, width: r * 4.8,
          fontSize: Math.max(10, r * 0.66), lineHeight: 1.1, letterSpacing: '-.02em',
          color: on ? '#fff' : tint, textShadow: '0 1px 4px rgba(0,0,0,.95), 0 0 2px rgba(0,0,0,.9)',
        }}>{name}</span>
      )}
    </>
  );
};
const path2 = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'} ${px(p)[0]} ${px(p)[1]}`).join(' ');
/* 타구 곡선 — 실제 포물선을 그대로 그린다 */
const arcPath = (from, to, apex) => {
  const n = 18, out = [];
  for (let i = 0; i <= n; i += 1) {
    const u = i / n, p = mid(from, to, u), h = apex * 4 * u * (1 - u);
    out.push(px(p, h));
  }
  return out.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');
};

function Stage() {
  const [pitchKey, setPitchKey] = useState('직구');
  const [batKey, setBatKey] = useState('우타 강타자');
  const [legKey, setLegKey] = useState('보통 발');
  const [on, setOn] = useState([0, 0, 0]);
  const [outs, setOuts] = useState(0);
  const [inning, setInning] = useState(1);
  const [half, setHalf] = useState(0);            // 0 초 · 1 말
  const [score, setScore] = useState([0, 0]);
  const [count, setCount] = useState([0, 0]);     // 볼 · 스트라이크
  const [auto, setAuto] = useState(false);
  const [fast, setFast] = useState(false);
  const [over, setOver] = useState(null);   // 끝난 경기의 최종 점수
  const [log, setLog] = useState([]);
  const pickTwo = () => {
    const pool = SERIES.filter((x) => x.players.filter((p) => p.type === 'batter').length >= 9
      && x.players.some((p) => p.type === 'pitcher'));
    const a = Math.floor(Math.random() * pool.length);
    let b = Math.floor(Math.random() * pool.length);
    if (b === a) b = (b + 1) % pool.length;
    return [buildTeam(pool[a]), buildTeam(pool[b])];
  };
  const teamRef = useRef(pickTwo());
  const armRef = useRef([teamRef.current[0].arms[0], teamRef.current[1].arms[0]]);
  const lineRef = useRef([teamRef.current[0].order, teamRef.current[1].order]);
  const [idx, setIdx] = useState([0, 0]);
  const liveBat = () => lineRef.current[gameRef.current.half][idx[gameRef.current.half]];
  const gameRef = useRef({ on: [0, 0, 0], outs: 0, inning: 1, half: 0, score: [0, 0] });
  gameRef.current = { on, outs, inning, half, score };
  const [step, setStep] = useState('idle');       // idle pitch fly field throw call
  const [play, setPlay] = useState(null);         // 이번 플레이 전체
  const timers = useRef([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clear(), []);

  /* 한 타석을 굴려 어떤 플레이가 될지 정한다 */
  const nextPlay = () => {
    const g = gameRef.current;
    const side = g.half, dside = side ? 0 : 1;
    const team = teamRef.current[side], opp = teamRef.current[dside];
    GLOVE = opp.glove;
    /* 투수가 지쳤으면 불펜으로 */
    if (tiredOut(armRef.current[dside]) && opp.arms.length > 1) {
      const next = opp.arms.find((a) => a !== armRef.current[dside] && !a.used);
      if (next) { next.used = true; armRef.current[dside] = next; setLog((v) => ['투수 교체 → ' + next.name, ...v].slice(0, 9)); }
    }
    let bat = liveBat();
    /* 후반 접전이면 대타 */
    const pinch = pinchFor(team, bat, g);
    if (pinch) {
      pinch.used = true;
      lineRef.current[side][idx[side]] = { ...pinch, no: bat.no };
      bat = lineRef.current[side][idx[side]];
      setLog((v) => ['대타 ' + pinch.name, ...v].slice(0, 9));
    }
    SHIFT_DEG = shiftFor(bat);
    const arm = armRef.current[dside];
    const act = walkHim(g, bat) ? 'BB' : tactic(g, bat, bat.leg);
    const pa = runPA(g, bat, arm, team, opp, act);
    arm.pitches += pa.pitches || 1;
    const m = pa.note.match(/^(\d)-(\d)$/);
    setCount(m ? [+m[1], +m[2]] : [0, 0]);
    if (pa.key === 'BIP') return { mode: act === 'BUNT' ? 'BUNT' : 'SWING', note: pa.note };
    return { mode: pa.key, note: pa.note, mv: pa.mv };
  };
  const fire = (mode, note, pre) => {
    clear();
    const p = PITCH[pitchKey], bat = liveBat(), leg = bat.leg;
    GLOVE = teamRef.current[gameRef.current.half ? 0 : 1].glove;   // 지금 수비하는 팀
    const velo = Math.round(rnd(p.velo[0], p.velo[1]));
    const t = (delay, fn) => timers.current.push(setTimeout(fn, delay));
    let end = p.fly, key = null, res = null, mv = [], thr = null;

    if (mode === 'SB') {                                        /* 도루 */
      const to = on[0] && !on[1] ? 2 : on[1] && !on[2] ? 3 : on[2] ? 4 : on[0] ? 2 : 0;
      if (to) {
        const m = { from: to - 1 || 3, to, out: false, risky: true, tag: false, start: 0, ms: Math.round(runMs(1, leg * 1.41)), };
        m.in = m.ms;
        const tp = throwPath(FIELD.C.p, BASE[to], { arm: FIELD.C.arm });
        const total = tp.seg.reduce((a, b) => a + b, 0) + POP;
        m.out = p.fly + total < m.in - ms(0.13);
        m.judged = true; mv = [m];
        thr = { kind: 'one', path: tp.path, seg: [total], hop: HOP, calls: [{ m, at: p.fly + total }], startAt: p.fly };
        key = m.out ? 'CS' : 'SB';
        end = Math.max(p.fly + total, m.in) + ms(0.5);
      } else { key = 'CS'; end = p.fly + ms(0.6); }
      t(p.fly, () => setStep('throw'));
    } else if (['WP', 'PB', 'KWP', 'PK', 'PKS'].includes(mode)) {   /* 투구 사이 사건 */
      key = mode;
      mv = (pre || []).map((m) => ({ ...m }));
      mv.forEach((m) => { m.start = 0; m.ms = runMs(1, leg, 1.4); m.in = m.ms; if (m.out) m.judged = true; });
      end = p.fly + ms(1.1);
      t(p.fly, () => setStep('field'));
    } else if (mode === 'K' || mode === 'BB') {                 /* 삼진 · 볼넷 */
      key = mode;
      if (mode === 'BB') {
        const push = [];
        if (on[0] && on[1] && on[2]) push.push(3, 2, 1); else if (on[0] && on[1]) push.push(2, 1); else if (on[0]) push.push(1);
        push.forEach((b) => mv.push({ from: b, to: b + 1, out: false, risky: false, tag: false }));
        mv.push({ from: 0, to: 1, out: false, risky: false, tag: false });
        mv.forEach((m) => { m.start = 0; m.ms = runMs(1, leg, 1.9); m.in = m.ms; });
      }
      end = p.fly + ms(0.7);
    } else {                                                     /* 인플레이 */
      res = hitBall(bat, velo, on, outs, mode, armRef.current[half ? 0 : 1]);
      mv = baseRun(res, on, outs);
      mv.forEach((m) => {
        const dash = m.tag ? 1.26 : m.from ? 1.28 : 1;
        m.start = m.tag ? p.fly + res.grab : p.fly;
        m.ms = runMs(m.to - m.from, leg * dash * (m.from ? rnd(0.93, 1.08) : 1), res.key === 'HR' ? 1.06 : 1);
        m.in = m.start + m.ms;
      });
      const grab = p.fly + res.grab;
      thr = decideThrow(res, mv, outs, grab);
      if (thr) { thr.startAt = grab; thr.calls.forEach((c) => { c.m.out = c.at < c.m.in - ms(0.13); c.m.judged = true; }); }
      /* 태그업 승부 */
      const tag = mv.find((m) => m.tag && !m.judged);
      if (res.caught && tag) {
        const tp = throwPath(res.land, BASE[tag.to], FIELD[res.by]);
        const arrive = grab + tp.total;
        tag.out = arrive < tag.in - ms(0.5);
        tag.judged = true;
        thr = { kind: 'one', path: tp.path, seg: tp.seg, hop: HOP, calls: [{ m: tag, at: arrive }], startAt: grab };
      }
      key = nameOf(res, mv, on, outs);
      t(p.fly, () => setStep('fly'));
      t(p.fly + res.hang, () => setStep('field'));
      if (thr) t(thr.startAt, () => setStep('throw'));
      end = Math.max(p.fly + res.hang, thr ? thr.startAt + thr.seg.reduce((a, b) => a + b, 0) + thr.hop * (thr.seg.length - 1) : grab,
        mv.reduce((m2, m) => Math.max(m2, m.in), 0)) + ms(0.5);
    }
    const done = settle(mv, on, key === 'IFF' ? false : !!(res && res.caught));
    if (key === 'IFF') done.outs = 1;
    if (mode === 'K') done.outs = 1;
    if (key === 'FF') done.outs = 1;
    const shot = { velo, color: p.color, key: pitchKey };
    const cov = coverOf(res, thr, on);
    setPlay({ key, res, mv, thr, shot, done, cover: cov, back: backOf(res, thr, cov) });
    setStep('pitch');
    t(end, () => setStep('call'));
    t(end + (fast ? ms(0.8) : ms(3.6)), () => { setStep('idle'); setPlay(null); });
    t(end, () => {
      const g = gameRef.current;
      const nOut = g.outs + done.outs;
      setScore((v) => { const n = [...v]; n[g.half] += done.runs; return n; });
      setLog((v) => [g.inning + '회' + (g.half ? '말 ' : '초 ') + (RESULT[key] ? RESULT[key].ko : key)
        + (done.runs ? ' +' + done.runs : '') + (note ? ' (' + note + ')' : ''), ...v].slice(0, 9));
      setCount([0, 0]);
      setIdx((v) => { const n = [...v]; n[g.half] = (n[g.half] + 1) % 9; return n; });
      const sc = [...g.score]; sc[g.half] += done.runs;
      /* 끝내기 — 9회 이후 말 공격에서 홈팀이 앞서면 그 자리에서 끝난다 */
      if (g.inning >= 9 && g.half === 1 && sc[1] > sc[0]) { setOver(sc); setAuto(false); setOuts(nOut); setOn(done.next); return; }
      if (nOut >= 3) {                                   // 공수 교대
        if (g.inning >= 9 && g.half === 1 && sc[0] !== sc[1]) { setOver(sc); setAuto(false); setOuts(0); setOn([0, 0, 0]); return; }
        if (g.inning >= 12 && g.half === 1) { setOver(sc); setAuto(false); setOuts(0); setOn([0, 0, 0]); return; }
        setOuts(0); setOn([0, 0, 0]);
        setHalf((h) => (h ? 0 : 1));
        setInning((i) => (g.half ? i + 1 : i));
      } else { setOuts(nOut); setOn(done.next); }
    });
  };

  /* 자동 진행 — 한 플레이가 끝나면 다음 타석으로 */
  useEffect(() => {
    if (!auto || step !== 'idle' || over) return undefined;
    const id = setTimeout(() => { const p = nextPlay(); fire(p.mode, p.note, p.mv); }, fast ? 90 : 420);
    return () => clearTimeout(id);
  }, [auto, step, inning, half, outs, on.join(), over, fast]);

  const r = play ? RESULT[play.key] : null;
  const res = play?.res;
  const live = step !== 'idle' && !!play;
  const shown = step === 'fly' || step === 'field' || step === 'throw' || step === 'call';
  const offTeam = teamRef.current[half], defTeam = teamRef.current[half ? 0 : 1];
  const offTint = teamColor(offTeam.name), defTint = teamColor(defTeam.name);
  const batBox = (liveBat().hand === 'R' ? at(-32, 2.6) : at(32, 2.6));
  /* 베이스에 서 있는 주자가 누구인지 — 타순에서 앞선 타자들로 채운다 */
  const onWho = [0, 1, 2].map((i) => {
    if (!on[i]) return null;
    const back = [1, 2, 3][i];
    return offTeam.order[(idx[half] - back + 9) % 9];
  });
  const shake = step === 'field' && res && res.m > 80 ? 'camShake .5s ease-out both' : 'none';

  return (
    <div className="relative overflow-hidden" style={{ width: W, height: H, background: '#05080f' }}>
      <style>{CSS}</style>
      <div className="absolute inset-0" style={{ animation: shake }}>
        <Field />
        <svg className="absolute inset-0" width={W} height={H} style={{ pointerEvents: 'none' }}>
          {/* 투구 */}
          {live && step === 'pitch' && (
            <path d={path2([MOUND, [0, 1.2]])} fill="none" stroke={play.shot.color} strokeWidth="2.5" pathLength="1" strokeDasharray="1"
              style={{ animation: `drawIn ${PITCH[pitchKey].fly}ms ease-in both`, filter: `drop-shadow(0 0 6px ${play.shot.color})` }} />
          )}
          {/* 타구 */}
          {res && shown && res.key !== 'FOUL' && (
            <path d={arcPath([0, 0], res.land, res.apex)} fill="none" stroke="#fff" strokeWidth={res.kind === 'ground' ? 2 : 2.6}
              strokeDasharray={res.kind === 'ground' ? '7 7' : undefined} pathLength={res.kind === 'ground' ? undefined : 1}
              style={{ opacity: 0.6, animation: res.kind === 'ground' ? undefined : `drawIn ${res.hang}ms cubic-bezier(.09,.66,.36,1) both` }} />
          )}
          {/* 굴러간 자리 */}
          {res && shown && res.stop !== res.land && (
            <path d={path2([res.land, res.stop])} fill="none" stroke="#fff" strokeWidth="1.8" strokeDasharray="5 6" style={{ opacity: 0.35 }} />
          )}
          {/* 송구 */}
          {play?.thr && (step === 'throw' || step === 'call') && play.thr.path.slice(1).map((q, i) => (
            <path key={i} d={path2([play.thr.path[i], q])} fill="none" stroke="#fca5a5" strokeWidth="2.4" pathLength="1" strokeDasharray="1"
              style={{ animation: `drawIn ${play.thr.seg[i]}ms linear ${play.thr.seg.slice(0, i).reduce((a, b) => a + b, 0) + play.thr.hop * i}ms both`, filter: 'drop-shadow(0 0 5px rgba(252,165,165,.7))' }} />
          ))}
          {/* 주루 */}
          {live && play.mv.map((m, i) => (
            <path key={i} d={path2([BASE[m.from] || [0, 0], ...[...Array(m.to - m.from)].map((_, j) => BASE[m.from + j + 1])])}
              fill="none" stroke={m.out ? '#cbd5e1' : m.risky ? '#fbbf24' : offTint} strokeWidth="2.2" pathLength="1" strokeDasharray="1"
              style={{ opacity: 0.5, animation: `drawIn ${m.ms}ms linear ${m.start}ms both` }} />
          ))}
        </svg>

        {/* 수비 */}
        {Object.keys(FIELD).map((k) => {
          const chase = res && res.by === k && shown;
          const home2 = standAt(k, res ? res.shape : shapeOf(on, outs));
          const mine = live ? (play.cover && play.cover[k]) || (play.back && play.back[k]) || null : null;
          const goal = chase ? (res.caught ? res.land : res.stop) : mine || home2;
          return <Mark key={k} p={goal} who={defTeam.glove[k]} tint={defTint} label={FIELD[k].ko} on={chase}
            style={{ transition: chase ? `left ${res.grab}ms linear, top ${res.grab}ms linear` : 'left .5s ease-out, top .5s ease-out' }} />;
        })}
        {/* 타자 · 주자 */}
        {!(live && play.mv.some((m) => m.from === 0)) && <Mark p={batBox} who={liveBat()} tint={offTint} big on />}
        {(!live ? on.map((v, i) => (v ? { from: i + 1, to: i + 1, still: true } : null)).filter(Boolean) : play.mv).map((m, i) => (
          m.still
            ? <Mark key={`s${i}`} p={BASE[m.from]} who={onWho[m.from - 1]} tint={offTint} />
            : (
              <span key={`m${i}`} className="absolute block rounded-full bg-cover" style={{
                left: 0, top: 0, width: m.from ? 22 : 25, height: m.from ? 22 : 25, marginLeft: m.from ? -11 : -12.5, marginTop: m.from ? -11 : -12.5,
                backgroundImage: faceOf((m.from ? onWho[m.from - 1] : liveBat()) && (m.from ? onWho[m.from - 1] : liveBat()).id),
                backgroundPosition: '50% 24%',
                border: `2px solid ${m.out ? '#cbd5e1' : offTint}`,
                boxShadow: `0 0 12px ${m.out ? 'rgba(203,213,225,.8)' : offTint}`, filter: m.out ? 'grayscale(1)' : 'none',
                offsetPath: `path("${path2([BASE[m.from] || [0, 0], ...[...Array(m.to - m.from)].map((_, j) => BASE[m.from + j + 1])])}")`,
                offsetRotate: '0deg', animation: `moveOn ${m.ms}ms linear ${m.start}ms both`,
              }} />
            )
        ))}
        {/* 공 */}
        {res && step === 'fly' && res.key !== 'FOUL' && (
          <i className="absolute block rounded-full bg-white" style={{
            left: 0, top: 0, width: 11, height: 11, marginLeft: -5.5, marginTop: -5.5, boxShadow: '0 0 16px rgba(255,255,255,.9)',
            offsetPath: `path("${arcPath([0, 0], res.land, res.apex)}")`, offsetRotate: '0deg',
            animation: `moveOn ${res.hang}ms cubic-bezier(.09,.66,.36,1) both`,
          }} />
        )}
        {play?.thr && step === 'throw' && play.thr.path.slice(1).map((q, i) => (
          <i key={i} className="absolute block rounded-full bg-white" style={{
            left: 0, top: 0, width: 10, height: 10, marginLeft: -5, marginTop: -5, boxShadow: '0 0 14px rgba(252,165,165,.9)',
            offsetPath: `path("${path2([play.thr.path[i], q])}")`, offsetRotate: '0deg',
            animation: `moveOn ${play.thr.seg[i]}ms linear ${play.thr.seg.slice(0, i).reduce((a, b) => a + b, 0) + play.thr.hop * i}ms both`,
          }} />
        ))}
        {/* 떨어진 자리 */}
        {res && (step === 'field' || step === 'throw') && (
          <span className="pointer-events-none absolute rounded-full" style={{
            left: px(res.land)[0] - 13, top: px(res.land)[1] - 13, width: 26, height: 26,
            border: `2px solid ${r?.color || '#fff'}`, animation: 'ringOut .9s ease-out both',
          }} />
        )}
      </div>

      {/* 위 — 상황판 */}
      <div className="absolute flex items-center gap-3" style={{ right: 40, top: 30 }}>
        <div className="relative" style={{ width: 46, height: 46 }}>
          {[[23, 3], [42, 22], [4, 22]].map((c, i) => (
            <span key={i} className="absolute" style={{
              left: c[0] - 6, top: c[1] - 6, width: 13, height: 13, transform: 'rotate(45deg)',
              background: on[[1, 0, 2][i]] ? OFF : 'transparent',
              boxShadow: on[[1, 0, 2][i]] ? `0 0 10px ${OFF}` : 'inset 0 0 0 1.5px rgba(255,255,255,.4)',
            }} />
          ))}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-2 font-display text-[15px] font-bold text-white/80">
            <span className="text-[12px] text-white/45">{teamRef.current[0].name}</span>
            {over ? <b className="text-[15px]" style={{ color: '#fbbf24' }}>경기 종료</b>
              : <><b className="text-[19px] text-white">{inning}</b>{half ? '말' : '초'}</>}
            <span className="text-[12px] text-white/45">{teamRef.current[1].name}</span>
            <b className="ml-1 text-[19px]" style={{ color: half ? 'rgba(255,255,255,.55)' : '#fff' }}>{score[0]}</b>
            <span className="text-white/35">:</span>
            <b className="text-[19px]" style={{ color: half ? '#fff' : 'rgba(255,255,255,.55)' }}>{score[1]}</b>
          </span>
          <span className="font-display text-[13px] font-bold text-white/55">B {count[0]} · S {count[1]}</span>
          <span className="flex items-center gap-1">
            {[0, 1].map((i) => <i key={i} className="block rounded-full" style={{ width: 9, height: 9, background: outs > i ? DEF : 'transparent', boxShadow: outs > i ? `0 0 8px ${DEF}` : 'inset 0 0 0 1.5px rgba(255,255,255,.4)' }} />)}
            <small className="ml-1 text-[11px] font-bold text-white/55">아웃</small>
          </span>
        </div>
      </div>
      {res && (
        <div className="absolute text-right" style={{ right: 42, top: 96 }}>
          <b className="block font-display text-[34px] font-extrabold leading-none text-white">{res.exit}<small className="ml-1 text-[14px]">km/h</small></b>
          <span className="mt-1 block text-[14px] text-white/70">{res.la}° · {res.m}m · {DIR_KO(res.deg)}</span>
          <span className="mt-1 block font-display text-[12px] tracking-[0.18em] text-white/40">
            {{ normal: '기본 수비', dp: '병살 대형', half: '중간 깊이', in: '전진 수비' }[res.shape]}
          </span>
        </div>
      )}
      {step === 'pitch' && play && (
        <div className="absolute" style={{ left: 40, top: 96 }}>
          <b className="font-display text-[30px] font-extrabold" style={{ color: play.shot.color }}>{play.shot.velo}<small className="ml-1 text-[13px]">km/h</small></b>
          <span className="ml-2 text-[15px] font-bold text-white/80">{play.shot.key}</span>
        </div>
      )}
      {step === 'call' && r && (
        <div className="absolute" style={{ left: 56, top: 190, animation: 'popIn 1.4s ease-out both' }}>
          <b className="block text-[62px] font-black leading-none" style={{ color: r.color, textShadow: '0 4px 20px rgba(0,0,0,.9)' }}>{r.ko}</b>
          {play.done.runs > 0 && <span className="mt-1 block text-[24px] font-black" style={{ color: OFF }}>+{play.done.runs}점</span>}
        </div>
      )}
      {step === 'call' && play?.mv.filter((m) => m.judged).map((m, i) => (
        <b key={i} className="absolute font-display text-[22px] font-black" style={{
          left: 58, top: 300 + i * 40, padding: '3px 14px', transform: 'rotate(-4deg)',
          color: m.out ? '#fff' : '#06100a', background: m.out ? 'rgba(180,30,30,.92)' : OFF,
          animation: 'popIn 1.4s ease-out both',
        }}>{['타자', '1루 주자', '2루 주자', '3루 주자'][m.from]} {['', '1루', '2루', '3루', '홈'][m.to]} {m.out ? 'OUT' : 'SAFE'}</b>
      ))}
      {log.length > 0 && (
        <div className="absolute flex flex-col gap-0.5" style={{ right: 42, bottom: 24 }}>
          {log.map((v, i) => <span key={i} className="text-right text-[13px] font-bold" style={{ color: i ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.8)' }}>{v}</span>)}
        </div>
      )}

      {/* 조작 */}
      <div className="absolute" style={{ left: 22, top: 16 }}>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PITCH).map(([k, v]) => (
            <button key={k} type="button" onClick={() => setPitchKey(k)} className="ui-cut px-3 py-1.5 text-[12.5px] font-bold"
              style={{ '--c': '5px', background: pitchKey === k ? v.color : 'rgba(7,12,20,.86)', color: pitchKey === k ? '#05080f' : '#d1d5db', boxShadow: `inset 0 0 0 1px ${v.color}59` }}>
              {k} <small className="opacity-70">{v.velo[0]}~{v.velo[1]}</small>
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(() => {
            const b = lineRef.current[half][idx[half]];
            const bar = (v) => Math.round(Math.max(0, Math.min(1, (v - 0.82) / 0.36)) * 5);
            return (
              <span className="ui-cut flex items-center gap-2.5 px-3 py-1.5 text-[12.5px]"
                style={{ '--c': '5px', background: 'rgba(7,12,20,.86)', boxShadow: `inset 0 0 0 1px ${OFF}45` }}>
                <b className="font-display text-[15px]" style={{ color: OFF }}>{b.no}</b>
                <b className="text-[13.5px] text-white">{b.name}</b>
                <span className="text-white/45">{b.pos} · {b.hand === 'R' ? '우타' : '좌타'}</span>
                {[['힘', b.power], ['정확', b.contact], ['발', b.leg]].map(([ko, v]) => (
                  <span key={ko} className="flex items-center gap-1 text-white/55">
                    {ko}
                    <span className="flex gap-[2px]">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <i key={i} className="block" style={{ width: 4, height: 9, background: i < bar(v) ? OFF : 'rgba(255,255,255,.16)' }} />
                      ))}
                    </span>
                  </span>
                ))}
              </span>
            );
          })()}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {[['SWING', '치기', OFF], ['BUNT', '번트', '#a7f3d0'], ['SB', '도루', '#fbbf24'], ['K', '삼진', DEF], ['BB', '볼넷', '#93c5fd']].map(([k, ko, c]) => (
            <button key={k} type="button" onClick={() => { if (k === 'SWING') { const p = nextPlay(); fire(p.mode, p.note, p.mv); } else fire(k); }} disabled={step !== 'idle'} className="ui-cut px-4 py-2 text-[13.5px] font-bold"
              style={{ '--c': '6px', background: step === 'idle' ? c : 'rgba(7,12,20,.86)', color: step === 'idle' ? '#05080f' : '#64748b', boxShadow: `inset 0 0 0 1px ${c}59` }}>{ko}</button>
          ))}
          {[['주자 없음', [0, 0, 0]], ['1루', [1, 0, 0]], ['1·2루', [1, 1, 0]], ['만루', [1, 1, 1]]].map(([ko, v]) => (
            <button key={ko} type="button" onClick={() => setOn(v)} className="ui-cut px-2.5 py-2 text-[12.5px] font-bold"
              style={{ '--c': '6px', background: on.join() === v.join() ? '#7dd3fc' : 'rgba(7,12,20,.86)', color: on.join() === v.join() ? '#05080f' : '#d1d5db', boxShadow: 'inset 0 0 0 1px #7dd3fc59' }}>{ko}</button>
          ))}
          <button type="button" onClick={() => setFast((v) => !v)}
            className="ui-cut px-3 py-2 text-[12.5px] font-bold"
            style={{ '--c': '6px', background: fast ? '#a78bfa' : 'rgba(7,12,20,.86)', color: fast ? '#05080f' : '#c4b5fd', boxShadow: 'inset 0 0 0 1px #a78bfa59' }}>
            {fast ? '빠르게 ON' : '빠르게'}
          </button>
          <button type="button" onClick={() => setAuto((v) => !v)}
            className="ui-cut px-4 py-2 text-[13.5px] font-bold"
            style={{ '--c': '6px', background: auto ? '#f87171' : 'rgba(7,12,20,.86)', color: auto ? '#05080f' : '#fca5a5', boxShadow: 'inset 0 0 0 1px #f8717159' }}>
            {auto ? '자동 멈춤' : '자동 진행'}
          </button>
          <button type="button" onClick={() => { setAuto(false); setOver(null); setOuts(0); setOn([0, 0, 0]); setLog([]); setInning(1); setHalf(0); setScore([0, 0]); setCount([0, 0]); setIdx([0, 0]); teamRef.current = pickTwo(); armRef.current = [teamRef.current[0].arms[0], teamRef.current[1].arms[0]]; lineRef.current = [teamRef.current[0].order, teamRef.current[1].order]; }}
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
        <b className="text-[15px] text-white">자동 플레이 · 새 좌표계</b>
        <span>그라운드를 미터로 계산하고 화면은 그대로 비춥니다 — 공이 떨어진 자리와 야수 자리가 어긋나지 않습니다</span>
      </div>
      <Stage />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Gallery />);
