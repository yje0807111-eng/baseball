/*
 * 정비 2단계(경기 흐름) 가운데 — 이닝마다 짜기(목업 prep-innings2 1안 + 5안 기회 기둥 + 7안 손잡이 말풍선, 2026-10-03)
 *  모든 줄이 '왼쪽 이름 칸 + 1~9회' 같은 눈금 — 왼쪽 상대 흐름(파도)과 같은 회. 상대 마운드가 꺼진 회(평균 −2) = 기회 기둥(옅은 초록)
 *  말풍선은 손잡이 왼쪽(막대 끝 안) — 위로 띄우면 상대 마운드 줄을 가린다
 *  정돈(목업 prep-flow3 7안, 2026-10-04): 선발 카드 걷어냄 → 맨 위 도구 띠 한 줄(끊는 기준 · 값 − +)
 *   볼 배합은 뺌(mix-sim: 섞기보다 나은 게 거의 없음 · 상대 타선 약한 계열로 골라도 ±0 — 늘 섞기)
 *   상대 마운드 줄은 왼쪽 상대 판(OppPanel 2단계 흐름 아래 1~9회 칸)으로. 우리 마운드 칸 안에 투수 수치(선발 구위 · 제구 · 체력, 불펜 구위 · 제구)
 *  끊는 기준(이닝 · 투구 수 · 타자 수) · 값(− +). 선발 막대 끝 손잡이를 끌어도 값이 바뀐다(말풍선에 값 · 어림 이닝)
 *  마운드 한 줄: 선발(손잡이까지) → 계투(기본 1명) → 마무리(9회). 칸을 누르면 아래에 교체 줄 — 왼쪽 '교체' · 불펜 · 오른쪽 추가 · 빼기
 *   추가 = 누른 투수 바로 뒤(마무리를 눌렀으면 마무리 앞)에 안 쓴 투수 중 가장 센 투수, 줄은 새 칸으로 넘어가 바로 고를 수 있게
 *   선발을 당기면 계투 자리가 늘고, 늘리면 넘치는 계투는 숨음(다시 당기면 그대로 나옴)
 *   투수 사이마다 경계 손잡이 — 한 아웃씩 옮김(rel.cuts), 끄는 동안 위에 '8회 1아웃' 칩. 마무리 기본 9회
 *  경계 손잡이(Grip) — 칸 사이 틈에 가는 선 + 작은 알약만(평소 흐리게, 올리면 밝게, 끄는 동안 초록). 잡는 폭은 16px
 *   (간트 · 피그마 분할선처럼 평소엔 안 보이다시피 — 선발 끝 · 투수 사이 · 공격 구간 모두 같은 손잡이, 선발 끝만 값 말풍선)
 *  다듬기(목업 prep-flow4 2 + 5안, 2026-10-04): 우리 마운드 얇게(80 → 52 → 여유 있게 62, 공격 사이 경계선, 얼굴 · 이름 · 수치 한 줄, 마무리 칸은 이름만) · 아낀 높이로 그래프 200 → 272
 *   그래프는 유리 판(잘린 모서리 · 위아래 옅은 빛) 안에 — 기본 스윙 선 기준 채움(위 = 풀스윙 쪽 주황 · 아래 = 신중한 쪽 보라), 선 아래 옅은 빛 한 겹
 *   스타일 단추는 옅은 바탕 · 테두리 단추 + 미니 곡선(고른 것만 초록) — 글자만이면 누르는 단추로 안 보여서 되돌림, 그래프 252 → 236
 *  공격 그래프(목업 prep-attack2 1 + 4안): 높이 = 스윙 크기(위부터 강공 · 보통 · 짧게 · 기다리기), 회 가운데 점 하나 + 부드러운 선
 *   값은 0~3 높이(0.1 단위) — 칸 사이는 두 성향을 타석마다 섞음(엔진 atkAt). 네 칸 가까이(±0.15)는 칸에 붙음 — 순수 값을 쉽게
 *   회 위를 끌며 지나가면 마우스 높이대로 회마다 점이 찍힘(건너뛴 회도 같은 높이로 채움), 끄는 동안 '6회 강공 70 · 보통 30' 칩. 점에서 ↑ ↓ 로 0.1씩
 *   아래 스타일 단추 — 누르면 아홉 회 값이 0.24초 동안 그 모양으로 미끄러져 바뀜(드문 동작 · 0.3초 안, 애니메이션 줄이기면 바로).
 *    창이 가려져 프레임이 멈춰도 끝 값은 타이머로 맞춤. 지금 값이 그 스타일과 같으면 단추 초록
 *   뒤에 상대 마운드 흐름을 점선으로 겹침 — 위로 갈수록 상대가 약한 회(기회), 우리 선을 그 회에 올리는 그림
 *  증강 시점은 이 판에서 뺌(저장된 값 · 기본 7회 그대로)
 *  어림 이닝(손잡이 자리): 투구 수 ÷ 16.5 · 타자 수 ÷ 4.3(미리보기 평균 — 85구 ≈ 5.2회) · 이닝은 그대로
 * 색은 뜻만: 초록 = 기회 · 고름, 성향 색은 점 하나 + 옅은 바탕
 * 마운드 · 공격 같은 넓이(2026-10-15): 끊는 기준 띠(이닝 · 투구 수 · 타자 수 · − +)를 뺌 — 선발 막대 끝 손잡이를 끌어서만(저장된 기준 단위로 붙음).
 *  마운드 줄 아래 불펜 판 — 불펜 투수 전부를 카드로 늘어놓고 끌어서 놓기(드래프트 라인업 · 9이닝스 불펜 교체처럼):
 *   카드 → 마운드 칸 = 그 자리와 바꿈(이미 다른 자리면 서로 바꿈) · 카드 → 칸 사이 틈(끄는 동안만 보이는 초록 홈) = 그 자리에 계투 추가
 *   마운드 칸 → 불펜 판 = 빼기(계투만, 한 명은 남김) · 칸 → 다른 칸 = 서로 바꿈. 끌지 않고 누르면 예전처럼 칸 고르기 → 카드 누르기
 *   선발(내 팀 경기만): 로테이션 칩(파랑 · 덜 쉬면 '휴식 n')을 선발 칸에 — 이 경기만 그 투수, 불펜은 선발 칸에 못 놓음. 줄 이름 '투수 운용'
 *  손잡이는 잡는 폭 24px · 손잡이 알약을 늘 보이게(끌 수 있는 곳이 바로 보이게). 불펜은 칩 줄(공격 스타일 단추 결) — 대신 마운드 줄을 112 로 높게
 */
import React, { useEffect, useRef, useState } from 'react';
import { Portrait } from './ui.jsx';
import { reducedMotion } from '../ui/motion.jsx';
import { pitchCap } from '../engine/pitchSim.js';

const cut = (c) => ({ '--c': `${c}px` });
const st = (p, k, d = 75) => p?.stats?.[k] ?? d;
const armOf = (p) => Math.round((st(p, 'stuff', 80) + st(p, 'control', 75)) / 2);
const US = '#10b981', GOLD = '#fbbf24', W1 = '#e5e7eb', W2 = '#9ca3af', W3 = '#6b7280', SPB = '#60a5fa';
const INN = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const LEAD = '9rem';
// 화면 이름 — 높이(스윙 크기)가 한눈에: 풀스윙 · 기본 스윙 · 짧은 스윙 · 신중한 스윙(공 고르기). 엔진 이름(power · base · contact · patience)은 그대로
export const ATK_KO = { base: '기본 스윙', power: '풀스윙', contact: '짧은 스윙', patience: '신중한 스윙' };
const ATK_C = { base: W3, power: '#f59e0b', contact: '#38bdf8', patience: '#a78bfa' };
export const ATK_LV = ['power', 'base', 'contact', 'patience']; // 그래프 높이 — 위부터
const GH = 190, GPAD = 22; // 마운드 묶음(줄 + 불펜 판)과 같은 높이 — 236 → 190
const gy = (lv) => GPAD + (lv * (GH - GPAD * 2)) / 3;
const gx = (i) => i * 100 + 50; // viewBox 900 기준 회 가운데
/* 왼쪽 상대 흐름과 같은 곡선 — 회 사이 가로 접선 베지어 */
const curveOf = (ys) => { let d = `M0,${ys[0]} L${gx(0)},${ys[0]}`; for (let i = 1; i < 9; i += 1) { const mx = (gx(i - 1) + gx(i)) / 2; d += ` C${mx},${ys[i - 1]} ${mx},${ys[i]} ${gx(i)},${ys[i]}`; } return `${d} L900,${ys[8]}`; };
const dotC = (v) => (v === 'base' ? '#cbd5e1' : ATK_C[v]);
/*
 * 공격 스타일 — 높이 9개(0 강공 · 1 보통 · 2 짧게 · 3 기다리기). 여섯 갈래 × 2~3개, 이름은 '~형'(FC 온라인 전술 이름처럼 한눈에)
 *  기본 · 상대 맞춤 · 초반 탐색 · 후반 공격 · 안타 · 장타 — 갈래 = 단추 한 열(맨 위가 대표)
 *  상대 맞춤 셋은 미리보기 상대 마운드(0 = 가장 약한 회 ~ 1 = 가장 센 회)로 만든다 — 미리보기 값이 없으면 기본형
 *   상대 맞춤형: 약할수록 강공 · 셀수록 짧게 · 기다리기 쪽(0 ~ 2.4) / 약점 집중형: 가장 약한 세 회만 강공 / 강약 조절형: 약한 1/3 강공 · 센 1/3 짧게
 *  득실(style-sim, ROADMAP 13): 안타 쪽 ↔ 상대 구위 셀수록 이득, 장타 쪽 ↔ 구위 약할수록 이득, 초반 탐색(기다리기) ↔ 제구 나쁠수록 이득
 */
const r1 = (v) => Math.round(v * 10) / 10;
const fill = (v) => Array(9).fill(v);
const byOpp = (fn) => (opp) => (opp ? fn(opp) : fill(1));
const weakest = (opp, n) => new Set(opp.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]).slice(0, n).map(([, i]) => i));
/*
 * 열 다섯(2026-10-15) — 플레이어가 고르기 쉽게 '어떤 타격인가'로 묶음: 안타 · 신중 · 기본 · 적극 · 장타. 열 맨 위가 그 열의 대표(아홉 회 같은 높이),
 *  아래는 같은 결의 변형(초반만 · 후반만 · 상대 맞춤 등). 이름 · 값은 그대로 — 자리만 옮김
 */
export const ATK_GROUPS = [
  ['안타', [['안타형', () => fill(2)], ['초반 안타형', () => [2, 2, 2, 1, 1, 1, 1, 1, 1]]]],
  ['신중', [
    ['신중형', () => fill(1.5)], ['출루형', () => fill(2.5)],
    ['초반 탐색형', () => [3, 3, 2.5, 1.5, 1, 1, 1, 1, 1]],
    ['투구 수 공략형', () => [3, 3, 3, 3, 3, 1, 1, 1, 1]],
    ['탐색 후 공격형', () => [3, 3, 3, 0.5, 0.5, 0.5, 1, 1, 1]],
  ]],
  ['기본', [
    ['기본형', () => fill(1)],
    ['상대 맞춤형', byOpp((opp) => opp.map((n) => r1(n * 2.4)))],
    ['강약 조절형', byOpp((opp) => opp.map((n) => (n < 0.34 ? 0 : n > 0.66 ? 2 : 1)))],
  ]],
  ['적극', [
    ['적극형', () => fill(0.5)],
    ['약점 집중형', byOpp((opp) => { const w = weakest(opp, 3); return opp.map((_, i) => (w.has(i) ? 0 : 1)); })],
    ['중반 승부형', () => [1, 1, 1, 0, 0, 0, 1, 1, 1]],
    ['후반 공격형', () => [1, 1, 1, 1, 1, 0.7, 0.3, 0, 0]],
    ['막판 승부형', () => [1, 1, 1, 1, 1, 1, 1, 0, 0]],
  ]],
  ['장타', [['장타형', () => fill(0)], ['선제 공격형', () => [0, 0, 0, 1, 1, 1, 1, 1, 1]]]],
];
export const ATK_STYLES = ATK_GROUPS.flatMap(([, list]) => list);
/* 높이 값 — 예전 이름도 받음 */
export const atkLvOf = (v) => (typeof v === 'number' ? v : Math.max(0, ATK_LV.indexOf(v)));
const lvC = (lv) => dotC(ATK_LV[Math.round(lv)]);
/* '풀스윙' · '풀스윙 70 · 기본 스윙 30' */
export const atkKoOf = (v) => {
  const lv = atkLvOf(v), lo = Math.floor(lv + 1e-9), f = Math.round((lv - lo) * 10) * 10;
  return f ? `${ATK_KO[ATK_LV[lo]]} ${100 - f} · ${ATK_KO[ATK_LV[lo + 1]]} ${f}` : ATK_KO[ATK_LV[lo]];
};
export const LIMIT = {
  inn: { ko: '이닝', min: 1, max: 9, step: 1, unit: '회까지', per: 1 },
  pitch: { ko: '투구 수', min: 40, max: 120, step: 5, unit: '구', per: 16.5 },
  bf: { ko: '타자 수', min: 9, max: 36, step: 1, unit: '타자', per: 4.3 },
};
export const exitOf = (limit) => Math.max(0.5, Math.min(9, limit.value / LIMIT[limit.mode].per));
/*
 * 계투가 n명이면 선발은 8 − n 회까지만 — 계투 · 마무리마다 한 회(3아웃) 칸은 늘 남게(넓히다 숨지 않게, 2026-10-04)
 *  선발 손잡이 · − + · 기준 바꾸기 · 계투 추가 모두 이 문턱으로 눌러 담음(투구 · 타자 수는 단위 아래로 내림)
 *  cap = 선발 체력이 허락하는 공 수(pitchCap) — 넘게 잡으면 엔진이 그 전에 내려 계획과 경기가 어긋났다(2026-10-09)
 */
export const fitLimit = (limit, n, cap = Infinity) => {
  const L = LIMIT[limit.mode], max = Math.max(1, Math.min(8 - n, cap / LIMIT.pitch.per));
  if (exitOf(limit) <= max + 1e-9) return limit;
  const v = limit.mode === 'inn' ? Math.floor(max) : Math.floor((max * L.per) / L.step) * L.step;
  return { ...limit, value: Math.max(L.min, v) };
};
/* 고른 기준(저장)은 그대로 두고 화면 · 경기에서만 오늘 선발 체력에 맞춤 — 다음 경기 선발이 길게 던질 수 있으면 원래 값으로 */
export const effLimit = (limit, n, starter) => fitLimit(limit, n, starter ? pitchCap(starter) : Infinity);
export const limitKo = (limit) => (limit.mode === 'inn' ? `${limit.value}회까지` : `${limit.value}${LIMIT[limit.mode].unit}`);
const pct = (inn) => `${(inn / 9) * 100}%`;
/*
 * 마운드 계획(아웃 단위) — rel = { mid: [계투 id], close: 마무리 id, cuts: [계투마다 끝 아웃] } → 칸(spans) · 엔진 slots([[시작 아웃, id]])
 *  아웃 = (회−1)×3 + 아웃 수, 0 ~ 27. 경계 손잡이는 한 아웃씩(8회 1아웃부터 마무리 · 4아웃 세이브 등)
 *  기본(cuts 없음): 선발 어림 다음 회 F ~ 8회를 계투가 회 단위로 고르게, 마무리 9회
 *  첫 계투는 선발 어림 뒤 한 회(3아웃) 넘게, 나머지는 한 회 이상 — 칸이 손톱만 해지지 않게. 들어갈 자리보다 많은 계투는 숨음
 *  slots 첫 칸은 0부터 — 선발이 계획보다 일찍 내려가도 첫 계투가 받게
 */
export const outKo = (o) => `${Math.floor(o / 3) + 1}회 ${o % 3 ? `${o % 3}아웃` : '시작'}`;
/* 맡는 구간 글자 — a ~ b 아웃. 시작은 '6회'(회 시작) 또는 '6회 1아웃', 끝은 b 가 회 끝이면 '8회', 아니면 '6회 1아웃' */
const startKo = (o) => `${Math.floor(o / 3) + 1}회${o % 3 ? ` ${o % 3}아웃` : ''}`;
const endKo = (o) => (o % 3 ? `${Math.floor(o / 3) + 1}회 ${o % 3}아웃` : `${o / 3}회`);
export const spanKo = (a0, b0) => { const a = Math.round(a0), b = Math.round(b0), s0 = startKo(a), e = endKo(b); if (s0 === e) return e; if (a % 3 && b === (Math.floor(a / 3) + 1) * 3) return `${s0} 뒤`; return `${a % 3 ? s0 : `${Math.floor(a / 3) + 1}`}~${e}`; }; // '8회 1아웃 뒤' — 같은 회 끝까지
export function moundPlan(rel, exit) {
  const F = Math.floor(exit) + 1, E = exit * 3;
  const minFirst = Math.ceil(E - 1e-9) + 3;
  const cap = F > 9 || minFirst > 24 ? 0 : 1 + Math.floor((24 - minFirst) / 3);
  const mid = (rel.mid || []).slice(0, cap);
  const n = mid.length, room = 9 - F, spans = [];
  let even = F - 1;
  mid.forEach((id, k) => {
    even += Math.floor(room / n) + (k < room % n ? 1 : 0);
    const lo = k ? spans[k - 1].b + 3 : minFirst, hi = 24 - 3 * (n - 1 - k);
    spans.push({ slot: k, id, a: k ? spans[k - 1].b : E, b: Math.max(lo, Math.min(hi, rel.cuts?.[k] ?? even * 3)) });
  });
  if (rel.close && F <= 9) spans.push({ slot: 'close', id: rel.close, a: n ? spans[n - 1].b : E, b: 27 });
  const slots = spans.map((x, k) => [k ? x.a : 0, x.id]);
  return { F, cap, minFirst, mid, spans, slots };
}
/* 계투 · 마무리 고르기 — 이미 다른 자리에 있는 투수면 서로 바꿈 */
export function pickRel(rel, slot, id) {
  const mid = [...rel.mid]; let close = rel.close;
  const cur = slot === 'close' ? close : mid[slot];
  const j = mid.indexOf(id);
  if (j >= 0) mid[j] = cur; else if (close === id) close = cur;
  if (slot === 'close') close = id; else mid[slot] = id;
  return { ...rel, mid: mid.filter(Boolean), close };
}
export const segsOf =(atk) => atk.reduce((acc, v, i) => { const last = acc[acc.length - 1]; if (last && last.v === v) last.b = i + 1; else acc.push({ a: i + 1, b: i + 1, v }); return acc; }, []);

function Lane({ label, sub, h, children, glass, low }) {
  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: `${LEAD} minmax(0,1fr)`, height: h }}>
      <span className="flex flex-col items-start justify-center gap-1 pr-3"><b className="text-t3" style={{ color: W1 }}>{label}</b>{sub && (typeof sub === 'string' ? <span className="text-[11px]" style={{ color: W3 }}>{sub}</span> : sub)}</span>
      <span className="relative block rounded-lg" style={glass ? { background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)' } : null}>
        <span className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>
          {INN.map((i) => <i key={i} style={{ borderLeft: i > 1 ? '1px solid rgba(255,255,255,.05)' : 'none', background: low?.[i - 1] ? 'rgba(16,185,129,.07)' : 'transparent' }} />)}
        </span>
        {children}
      </span>
    </div>
  );
}
/* 경계 손잡이 — 틈 가운데 가는 선 + 알약. 끄는 동안 초록 */
function Grip({ x, on, onPointerDown, label, role = 'separator', style, children, ...rest }) {
  return (
    <span onPointerDown={onPointerDown} role={role} aria-label={label} {...rest} className="group absolute z-10 flex w-6 -translate-x-1/2 cursor-ew-resize items-center justify-center outline-none" style={{ left: x, top: 2, bottom: 2, ...style }}>
      {children}
      <i className="absolute inset-y-1 w-px transition-colors" style={{ background: on ? US : 'rgba(255,255,255,.18)' }} />
      <i className={`relative block h-7 w-[6px] rounded-full transition-colors ${on ? '' : 'bg-white/60 group-hover:bg-white'}`} style={on ? { background: US, boxShadow: `0 0 8px ${US}88` } : { boxShadow: '0 0 0 2px rgba(11,15,26,.9)' }} />
    </span>
  );
}
/*
 * 투수 운용 칸 속(mockups/mound-lane B안) — 위: 얼굴 · 이름 · 수치, 오른쪽 위 역할 글자 / 가운데: 맡는 구간 / 바닥: 체력 막대.
 *  선발 막대 = 체력이 허락하는 공 수(pitchCap, 120구 = 끝) · 금빛 눈금 = 끊는 지점. 불펜 막대 = 체력. 좁은 칸(한 회 남짓)은 수치 · 구간을 뺌
 */
function SegBody({ p, role, rc, keys, range, bar, tick = null, small = false }) {
  return (
    <span className="relative flex min-w-0 flex-1 flex-col justify-between px-2.5 pb-2.5 pt-2">
      <b className="absolute right-2 top-1.5 text-[11px] font-extrabold" style={{ color: rc }}>{role}</b>
      <span className={`flex min-w-0 items-center gap-2 ${small ? 'mt-3.5' : 'pr-10'}`}>{/* 좁은 칸은 역할 글자 아래로 — 이름이 안 잘리게 */}
        {p && <Portrait player={p} w={small ? 30 : 38} h={small ? 37 : 47} color="#334155" />}
        <span className="grid min-w-0 gap-0.5">
          <b className="truncate text-t4 font-bold" style={{ color: W1 }}>{p?.name || '-'}</b>
          {!small && p && <PStats p={p} keys={keys} />}
        </span>
      </span>
      {!small && <span className="truncate font-display text-t4 font-bold" style={{ color: '#cbd5e1' }}>{range}</span>}
      <span className="relative block h-[4px] rounded-full bg-white/10">
        <i className="absolute inset-y-0 left-0 block rounded-full" style={{ width: `${bar}%`, background: rc }} />
        {tick != null && <i className="absolute -top-[3px] block h-[10px] w-[2px] rounded" style={{ left: `${tick}%`, background: '#f5d27a', boxShadow: '0 0 6px #f5d27a' }} />}
      </span>
    </span>
  );
}
/* 투수 수치 한 줄 — 선발 구위 · 제구 · 체력, 불펜은 구위 · 제구(한 회 칸에 들어가게) */
const STAT3 = [['구위', 'stuff', 80], ['제구', 'control', 75], ['체력', 'stamina', 90]], STAT2 = STAT3.slice(0, 2);
const PStats = ({ p, keys }) => (
  <span className="truncate whitespace-nowrap text-[12px]" style={{ color: W3 }}>{keys.map(([ko, k, d], i) => <React.Fragment key={k}>{i ? ' · ' : ''}{ko} <b className="font-display" style={{ color: W1 }}>{st(p, k, d)}</b></React.Fragment>)}</span>
);

export default function FlowBoard({ pv, busy, starter, pens, atk, setAtk, limit: want, setLimit, rel, setRel, rotation = null }) {
  const [pick, setPick] = useState(null); // 고르는 자리 — 계투 번호 또는 'close'
  const [drag, setDrag] = useState(null); // { kind: 'sp' | 'mid' | 'draw', ... }
  const laneRef = useRef(null);
  const graphRef = useRef(null);
  const dragRef = useRef(null);
  const mound = pv?.oppMound || [];
  const known = mound.filter((v) => v != null);
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;
  const low = INN.map((i) => mound[i - 1] != null && mound[i - 1] <= avg - 2);
  const cap = starter ? pitchCap(starter) : Infinity;
  const limit = fitLimit(want, rel.mid.length, cap);
  const L = LIMIT[limit.mode];
  const atCap = fitLimit({ ...limit, value: limit.value + L.step }, 0, cap).value <= limit.value;
  const exit = exitOf(limit);
  const mp = moundPlan(rel, exit);
  const byId = new Map(pens.map((p) => [p.id, p]));

  /* ── 끌기: 레인 너비로 회를 잰다 ── */
  const innAt = (clientX) => { const r = laneRef.current?.getBoundingClientRect(); if (!r) return 0; return Math.max(0, Math.min(9, ((clientX - r.left) / r.width) * 9)); };
  const latest = useRef({});
  /* 그리기 — 회는 가로 자리, 높이는 0.1 단위(네 칸 가까이는 칸에 붙음). 지난 회 ~ 지금 회를 같은 높이로(빨리 끌어 건너뛴 회도) */
  const paintAt = (cx, cy, d) => {
    const r = graphRef.current?.getBoundingClientRect(); if (!r) return;
    const i = Math.max(0, Math.min(8, Math.floor(((cx - r.left) / r.width) * 9)));
    const raw = Math.max(0, Math.min(3, (((cy - r.top) / r.height) * GH - GPAD) / ((GH - GPAD * 2) / 3)));
    const lv = Math.abs(raw - Math.round(raw)) < 0.15 ? Math.round(raw) : Math.round(raw * 10) / 10;
    const S = latest.current, base = d.cur || S.atk, next = [...base];
    for (let k = Math.min(d.last ?? i, i); k <= Math.max(d.last ?? i, i); k += 1) next[k] = lv;
    Object.assign(d, { last: i, i, lv, cur: next });
    if (next.some((v, k) => v !== base[k])) S.setAtk(next);
    setDrag({ ...d });
  };
  /*
   * 불펜 끌어서 놓기 — 놓는 곳은 data-drop: 'slot:k' · 'slot:close'(그 자리와 바꿈) · 'ins:i'(계투 i 번째로 추가) · 'pool'(빼기)
   *  4px 넘게 움직여야 끌기 — 그 전에 떼면 누르기(칸 고르기 · 카드로 바꾸기)로 남긴다
   */
  const dropAt = (x, y) => { const el = document.elementsFromPoint(x, y).find((n) => n.dataset?.drop); return el?.dataset.drop || null; };
  const dropPen = (d, target) => {
    if (!target) return;
    const S = latest.current, r = S.rel;
    const [kind, arg] = target.split(':');
    if (d.from === 'rot') { if (kind === 'sp') S.rotation?.onPick(d.id); return; } // 로테이션 칩은 선발 칸에만
    if (kind === 'sp') return; // 불펜은 선발 칸에 못 놓음(선발은 로테이션 투수만)
    if (kind === 'slot') { const slot = arg === 'close' ? 'close' : Number(arg); if (d.from !== 'lane' || d.slot !== slot) S.setRel({ ...pickRel(r, slot, d.id), cuts: [] }); return; }
    if (kind === 'ins') {
      const at = Number(arg);
      if (r.close === d.id) return; // 마무리는 칸 사이로 옮기지 않음 — 칸에 놓아 바꾸기
      const without = r.mid.filter((id) => id !== d.id), k = Math.min(at - (r.mid.indexOf(d.id) >= 0 && r.mid.indexOf(d.id) < at ? 1 : 0), without.length);
      const mid = [...without.slice(0, k), d.id, ...without.slice(k)];
      if (mid.length > 7) return;
      S.setRel({ ...r, mid, cuts: [] });
      S.setLimit(fitLimit(S.limit, mid.length, S.cap)); // 자리가 모자라면 선발을 당겨 새 계투에도 한 회
      return;
    }
    if (kind === 'pool' && d.from === 'lane' && d.slot !== 'close' && r.mid.length > 1) S.setRel({ ...r, mid: r.mid.filter((id) => id !== d.id), cuts: [] });
  };
  latest.current = { cap, limit, L, atk, setAtk, setLimit, rel, setRel, mp, paintAt, dropPen, rotation };
  const penDown = (e, d) => { if (e.button !== 0) return; dragRef.current = { kind: 'pen', ...d, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false }; };
  const drawStart = (e) => { if (e.button !== 0) return; e.preventDefault(); const d = { kind: 'draw', last: null }; dragRef.current = d; paintAt(e.clientX, e.clientY, d); };
  const start = (e, d) => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); dragRef.current = d; setDrag(d); };
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current; if (!d) return;
      const S = latest.current, x = innAt(e.clientX);
      if (d.kind === 'sp') { // 값으로 — 이닝은 회 끝에 딱, 투구 · 타자 수는 단위에 맞춰
        const raw = S.limit.mode === 'inn' ? Math.round(x) : Math.round((x * S.L.per) / S.L.step) * S.L.step;
        const v = Math.max(S.L.min, Math.min(S.L.max, raw));
        const fit = fitLimit({ ...S.limit, value: v }, S.rel.mid.length, S.cap);
        if (fit.value !== S.limit.value) S.setLimit(fit);
      } else if (d.kind === 'draw') {
        S.paintAt(e.clientX, e.clientY, d);
      } else if (d.kind === 'pen') { // 불펜 끌기 — 4px 넘으면 시작, 놓을 곳을 따라 표시
        if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 4) return;
        Object.assign(d, { moved: true, x: e.clientX, y: e.clientY, target: dropAt(e.clientX, e.clientY) });
        setDrag({ ...d });
      } else if (d.kind === 'mid') { // 투수 경계 — 한 아웃씩, 앞뒤 투수가 한 회는 남게
        const b = Math.max(d.min, Math.min(d.max, Math.round(x * 3)));
        const cuts = S.mp.spans.filter((z) => typeof z.slot === 'number').map((z) => z.b);
        if (cuts[d.k] !== b) { cuts[d.k] = b; S.setRel({ ...S.rel, cuts }); }
      }
    };
    const onUp = () => {
      const d = dragRef.current;
      if (d?.kind === 'pen' && d.moved) { latest.current.dropPen(d, d.target); d.clicked = true; }
      dragRef.current = d?.kind === 'pen' && d.moved ? { kind: 'eat' } : null; // 끈 뒤 바로 오는 click 은 먹는다
      setTimeout(() => { if (dragRef.current?.kind === 'eat') dragRef.current = null; }, 0);
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, []);
  const nudge = (i, dir) => { const n = [...atk]; n[i] = Math.max(0, Math.min(3, Math.round((atkLvOf(atk[i]) + dir * 0.1) * 10) / 10)); setAtk(n); };
  /* 상대 마운드 흐름 — 셀수록 아래(약한 회 = 위 = 기회) */
  // 폭은 최소 6 — 상대 마운드가 고르면(77~79 등) 파도 · 상대 맞춤 스타일이 작은 차이를 부풀리지 않게
  const mid0 = known.length ? (Math.min(...known) + Math.max(...known)) / 2 : 0, span = known.length ? Math.max(6, Math.max(...known) - Math.min(...known)) : 1;
  const lo = mid0 - span / 2, hi = mid0 + span / 2;
  const oppYs = INN.map((i) => GPAD + (((mound[i - 1] ?? avg) - lo) / (hi - lo || 1)) * (GH - GPAD * 2));
  const atkYs = atk.map((v) => gy(atkLvOf(v)));
  const oppNorm = known.length ? INN.map((i) => ((mound[i - 1] ?? avg) - lo) / (hi - lo || 1)) : null;
  /* 스타일 적용 — 지금 값에서 목표 값으로 0.24초 미끄럼(ease-out) */
  const tween = useRef({ raf: 0, timer: 0 });
  useEffect(() => () => { cancelAnimationFrame(tween.current.raf); clearTimeout(tween.current.timer); }, []);
  const applyStyle = (target) => {
    cancelAnimationFrame(tween.current.raf); clearTimeout(tween.current.timer);
    if (reducedMotion()) { setAtk(target); return; }
    const from = atk.map(atkLvOf), t0 = performance.now(), D = 240;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / D), e = 1 - (1 - k) ** 3;
      setAtk(k < 1 ? from.map((v, i) => v + (target[i] - v) * e) : target);
      if (k < 1) tween.current.raf = requestAnimationFrame(tick);
    };
    tween.current.raf = requestAnimationFrame(tick);
    tween.current.timer = setTimeout(() => { cancelAnimationFrame(tween.current.raf); setAtk(target); }, D + 80);
  };
  const styleOn = (target) => target.every((v, i) => Math.abs(v - atkLvOf(atk[i])) < 0.05);
  const step = (dir) => setLimit(fitLimit({ ...limit, value: Math.max(L.min, Math.min(L.max, limit.value + dir * L.step)) }, rel.mid.length, cap)); // 손잡이 ← →

  return (
    <div className="flex h-full min-h-0 select-none flex-col gap-3">
      {/* 회 머리 */}
      <div className="grid shrink-0" style={{ gridTemplateColumns: `${LEAD} minmax(0,1fr)` }}>
        <span />
        <span className="grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{INN.map((i) => <span key={i} className="flex flex-col items-center"><b className="font-display text-t3" style={{ color: low[i - 1] ? US : W2 }}>{i}회</b><span className="text-[10px]" style={{ color: US, visibility: low[i - 1] ? 'visible' : 'hidden' }}>기회</span></span>)}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <Lane label="투수 운용" h={112} glass low={low}>
          <span ref={laneRef} className="absolute inset-0" />
          <span data-drop={rotation ? 'sp' : undefined} onClick={() => rotation && setPick(pick === 'sp' ? null : 'sp')} className={`absolute flex overflow-hidden rounded-md ${rotation ? 'cursor-pointer' : ''}`}
            style={{ top: 6, bottom: 6, left: 4, width: `calc(${pct(exit)} - 9px)`, background: `linear-gradient(90deg, ${SPB}66, ${SPB}22)`, transition: drag?.kind === 'sp' ? 'none' : 'width .16s cubic-bezier(.2,.8,.2,1)',
              boxShadow: drag?.target === 'sp' || pick === 'sp' ? `inset 0 0 0 2px ${US}` : 'none' }}>
            <SegBody p={starter} role="선발" rc={SPB} keys={STAT3} range={`${spanKo(0, Math.round(exit * 3))}${limit.mode !== 'inn' ? ` · ${limitKo(limit)}` : ''}`}
              bar={cap < Infinity ? Math.min(100, (cap / 120) * 100) : st(starter, 'stamina', 90)} tick={Math.min(100, ((exit * LIMIT.pitch.per) / 120) * 100)} />
          </span>
          {mp.spans.map((x, k) => {
            const p = byId.get(x.id), on = pick === x.slot, a = x.a / 3, l = 5;
            return (
              <button key={x.slot} type="button" data-drop={`slot:${x.slot}`} onPointerDown={(e) => penDown(e, { id: x.id, from: 'lane', slot: x.slot })}
                onClick={() => { if (dragRef.current?.kind === 'eat') return; setPick(on ? null : x.slot); }} className="absolute flex cursor-grab overflow-hidden rounded-md text-left"
                style={{ top: 6, bottom: 6, left: `calc(${pct(a)} + ${l}px)`, width: `calc(${pct(x.b / 3 - a)} - ${l + 5}px)`, opacity: drag?.kind === 'pen' && drag.from === 'lane' && drag.slot === x.slot ? 0.35 : 1,
                  background: on || drag?.target === `slot:${x.slot}` ? 'rgba(16,185,129,.16)' : 'rgba(255,255,255,.05)', boxShadow: `inset 0 0 0 ${drag?.target === `slot:${x.slot}` ? 2 : 1}px ${on || drag?.target === `slot:${x.slot}` ? US : x.slot === 'close' ? `${GOLD}88` : 'rgba(255,255,255,.1)'}`, transition: drag ? 'none' : 'left .16s cubic-bezier(.2,.8,.2,1), width .16s cubic-bezier(.2,.8,.2,1)' }}>
                {p && <SegBody p={p} role={x.slot === 'close' ? '마무리' : `계투 ${x.slot + 1}`} rc={x.slot === 'close' ? GOLD : '#94a3b8'} keys={STAT2}
                  range={spanKo(x.a, x.b)} bar={Math.min(100, st(p, 'stamina', 60))} small={x.b - x.a < 4} />}
              </button>
            );
          })}
          {mp.spans.slice(0, -1).map((x, k) => (
            <Grip key={`g${k}`} x={pct(x.b / 3)} on={drag?.kind === 'mid' && drag.k === k} label={mp.spans[k + 1].slot === 'close' ? '계투 · 마무리 경계' : `계투 ${k + 1} · ${k + 2} 경계`}
              onPointerDown={(e) => start(e, { kind: 'mid', k, min: k ? x.a + 3 : mp.minFirst, max: mp.spans[k + 1].b - 3 })}>
              {drag?.kind === 'mid' && drag.k === k && <b className="pointer-events-none absolute -top-7 whitespace-nowrap rounded-md px-2 py-0.5 text-t4 font-bold" style={{ background: 'rgba(11,15,26,.85)', color: W1, boxShadow: `inset 0 0 0 1px ${US}` }}>{outKo(x.b)}</b>}
            </Grip>
          ))}
          {drag?.kind === 'pen' && drag.slot !== 'close' && [pct(exit), ...mp.spans.slice(0, -1).map((x) => pct(x.b / 3))].map((left, i) => (
            <span key={`ins${i}`} data-drop={`ins:${i}`} className="absolute z-20 w-7 -translate-x-1/2 rounded-md" aria-hidden="true"
              style={{ left, top: 2, bottom: 2, background: drag.target === `ins:${i}` ? 'rgba(16,185,129,.45)' : 'rgba(16,185,129,.14)', boxShadow: `inset 0 0 0 1.5px ${US}`, transition: 'background .12s' }} />
          ))}
          <Grip x={pct(exit)} on={drag?.kind === 'sp'} role="slider" label="선발 끊는 지점" aria-valuenow={limit.value} tabIndex={0}
            onPointerDown={(e) => start(e, { kind: 'sp' })} onKeyDown={(e) => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); }}
            style={{ transition: drag?.kind === 'sp' ? 'none' : 'left .16s cubic-bezier(.2,.8,.2,1)' }}>
          </Grip>
        </Lane>
        {/* 불펜 판 — 불펜 투수 전부(쓰는 자리 표시). 끌어서 마운드 칸 · 칸 사이에 놓기, 칸을 여기로 끌어 빼기. 칸을 고른 뒤 누르면 그 자리와 바꿈 */}
        <div className="grid shrink-0" style={{ gridTemplateColumns: `${LEAD} minmax(0,1fr)` }}>
          <span className="flex flex-col justify-center gap-1 pr-3"><b className="text-t3" style={{ color: W1 }}>{rotation ? '선발 · 불펜' : '불펜'}</b><span className="text-[11px]" style={{ color: W3 }}>끌어서 교체</span></span>
          <div data-drop="pool" className="flex min-h-[2.75rem] flex-wrap content-center gap-1.5 rounded-lg p-1.5"
            style={{ background: drag?.target === 'pool' ? 'rgba(248,113,113,.08)' : 'rgba(255,255,255,.02)', boxShadow: `inset 0 0 0 1px ${drag?.target === 'pool' ? 'rgba(248,113,113,.5)' : 'rgba(255,255,255,.06)'}` }}>
            {/* 선발 후보 — 로테이션 투수(오늘 선발 빼고). 선발 칸에 끌어 놓거나 선발 칸을 누른 뒤 누르기. 덜 쉰 투수는 '휴식 n' */}
            {rotation && rotation.list.filter((x) => x.p.id !== rotation.pick).map(({ p, rest }) => (
              <button key={`r${p.id}`} type="button" onPointerDown={(e) => penDown(e, { id: p.id, from: 'rot' })}
                onClick={() => { if (dragRef.current?.kind === 'eat' || pick !== 'sp') return; rotation.onPick(p.id); setPick(null); }}
                className="flex cursor-grab items-center gap-1.5 rounded-md py-1 pl-1 pr-2.5 hover:brightness-125"
                style={{ opacity: drag?.kind === 'pen' && drag.id === p.id ? 0.35 : 1, background: `${SPB}1a`, boxShadow: `inset 0 0 0 1px ${SPB}66` }}>
                <Portrait player={p} w={20} h={24} color="#334155" />
                <b className="whitespace-nowrap text-[12px]" style={{ color: W1 }}>{p.name}</b>
                <span className="whitespace-nowrap text-[11px]" style={{ color: rest > 0 ? '#f87171' : SPB }}>{rest > 0 ? `휴식 ${rest}` : '선발 가능'}</span>
              </button>
            ))}
            {rotation && <i className="mx-1 block h-6 w-px self-center bg-white/15" aria-hidden="true" />}
            {/* 칩 — 공격 스타일 단추와 같은 결(얼굴 · 이름 · 자리 또는 구위 · 제구). 쓰는 투수는 흐리게 */}
            {pens.map((p) => {
              const k = rel.mid.indexOf(p.id), role = rel.close === p.id ? '마무리' : k >= 0 ? (k < mp.mid.length ? `계투 ${k + 1}` : '대기') : null;
              const lifted = drag?.kind === 'pen' && drag.id === p.id;
              return (
                <button key={p.id} type="button" onPointerDown={(e) => penDown(e, { id: p.id, from: 'pool' })}
                  onClick={() => { if (dragRef.current?.kind === 'eat' || pick == null) return; setRel(pickRel(rel, pick, p.id)); setPick(null); }}
                  className="flex cursor-grab items-center gap-1.5 rounded-md py-1 pl-1 pr-2.5 hover:brightness-125"
                  style={{ opacity: lifted ? 0.35 : role ? 0.6 : 1, background: role ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)', boxShadow: `inset 0 0 0 1px ${role === '마무리' ? `${GOLD}88` : role ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.14)'}` }}>
                  <Portrait player={p} w={20} h={24} color="#334155" />
                  <b className="whitespace-nowrap text-[12px]" style={{ color: W1 }}>{p.name}</b>
                  <span className="whitespace-nowrap font-display text-[11px]" style={{ color: role === '마무리' ? GOLD : role ? US : W3 }}>{role || armOf(p)}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* 끄는 투수 — 포인터를 따라 다니는 작은 칩 */}
        {drag?.kind === 'pen' && (byId.get(drag.id) || rotation?.list.find((x) => x.p.id === drag.id)) && (
          <span className="pointer-events-none fixed z-50 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-lg px-2 py-1" style={{ left: drag.x, top: drag.y, background: 'rgba(11,15,26,.92)', boxShadow: `inset 0 0 0 1.5px ${US}, 0 10px 24px rgba(0,0,0,.6)` }}>
            {(() => { const dp = byId.get(drag.id) || rotation.list.find((x) => x.p.id === drag.id).p; return <><Portrait player={dp} w={22} h={27} color="#334155" /><b className="text-t4" style={{ color: W1 }}>{dp.name}</b></>; })()}
          </span>
        )}
        {/* 마운드 · 공격 경계 — 두 구역이 붙어 보이지 않게 선 하나 + 여백 */}
        <i className="my-1.5 block h-px shrink-0 bg-white/[0.09]" />
        <div className="grid shrink-0" style={{ gridTemplateColumns: `${LEAD} minmax(0,1fr)`, height: GH }}>
          <span className="relative block pr-3">
            <b className="absolute text-t3" style={{ left: 0, top: 0, color: W1 }}>공격</b>
            {ATK_LV.map((v, lv) => <span key={v} className="absolute flex -translate-y-1/2 items-center gap-1.5" style={{ right: 12, top: gy(lv) }}><span className="text-[11px]" style={{ color: W2 }}>{ATK_KO[v]}</span><i className="block h-1.5 w-1.5 rounded-full" style={{ background: dotC(v) }} /></span>)}
          </span>
          <span ref={graphRef} onPointerDown={drawStart} className="mt-cut relative block cursor-crosshair touch-none" style={{ ...cut(10), background: 'linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.012))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
            <span className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>
              {INN.map((i) => <i key={i} style={{ borderLeft: i > 1 ? '1px solid rgba(255,255,255,.05)' : 'none', background: low[i - 1] ? 'rgba(16,185,129,.07)' : 'transparent' }} />)}
            </span>
            {ATK_LV.map((v, lv) => <i key={v} className="pointer-events-none absolute left-0 right-0 h-px" style={{ top: gy(lv), background: lv === 1 ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.05)' }} />)}
            <svg viewBox={`0 0 900 ${GH}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
              <defs><clipPath id="atkUp"><rect x="0" y="0" width="900" height={gy(1)} /></clipPath><clipPath id="atkDn"><rect x="0" y={gy(1)} width="900" height={GH} /></clipPath></defs>
              {known.length > 0 && <path d={curveOf(oppYs)} fill="none" stroke="#a78bfa" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" style={{ opacity: busy ? 0.4 : 1 }} />}
              <path d={`${curveOf(atkYs)} L900,${gy(1)} L0,${gy(1)} Z`} fill="rgba(245,158,11,.22)" clipPath="url(#atkUp)" />
              <path d={`${curveOf(atkYs)} L900,${gy(1)} L0,${gy(1)} Z`} fill="rgba(167,139,250,.2)" clipPath="url(#atkDn)" />
              <path d={curveOf(atkYs)} fill="none" stroke="#f8fafc" strokeOpacity=".16" strokeWidth="8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={curveOf(atkYs)} fill="none" stroke="#e5e7eb" strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {atk.map((v, i) => (
              <button key={i} type="button" aria-label={`${i + 1}회 공격 ${atkKoOf(v)}`} onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); nudge(i, e.key === 'ArrowUp' ? -1 : 1); } }}
                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                style={{ left: pct(i + 0.5), top: gy(atkLvOf(v)), background: lvC(atkLvOf(v)), boxShadow: '0 0 0 3px rgba(11,15,26,.9)' }} />
            ))}
            {drag?.kind === 'draw' && drag.i != null && (
              <b className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-t4" style={{ left: pct(drag.i + 0.5), top: gy(drag.lv) - 34, background: 'rgba(11,15,26,.88)', color: W1, boxShadow: `inset 0 0 0 1px ${lvC(drag.lv)}` }}>{drag.i + 1}회 {atkKoOf(drag.lv)}</b>
            )}
          </span>
        </div>
        <div className="grid shrink-0" style={{ gridTemplateColumns: `${LEAD} minmax(0,1fr)` }}>
          <span />
          <span className="grid gap-x-2" style={{ gridTemplateColumns: `repeat(${ATK_GROUPS.length}, minmax(0,1fr))` }}>
            {ATK_GROUPS.map(([group, list]) => (
              <span key={group} className="flex min-w-0 flex-col gap-1">
                <small className="px-1 text-[11px] font-bold" style={{ color: W3 }}>{group}</small>
                {list.map(([ko, make], k) => {
                  const target = make(oppNorm), on = styleOn(target);
                  return (
                    <button key={ko} type="button" onClick={() => applyStyle(target)} aria-pressed={on}
                      className="flex min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors hover:bg-white/[0.07]"
                      style={{ background: on ? 'rgba(16,185,129,.14)' : 'rgba(255,255,255,.03)', boxShadow: `inset 0 0 0 1px ${on ? US : 'rgba(255,255,255,.08)'}` }}>
                      <svg viewBox={`0 0 900 ${GH}`} preserveAspectRatio="none" className="h-3.5 w-10 shrink-0" aria-hidden="true">
                        <path d={curveOf(target.map(gy))} fill="none" stroke={on ? US : k ? '#6b7280' : '#9ca3af'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      </svg>
                      <b className="truncate text-[12px]" style={{ color: on ? '#fff' : k ? W3 : W2 }}>{ko}</b>
                    </button>
                  );
                })}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
