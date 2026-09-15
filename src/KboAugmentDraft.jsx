import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SERIES, overallOf, costOf } from './data/seriesPlayers.js';

/* ════════════════════════════════════════════════════════════════════
   KBO 드래프트 & 증강 시뮬레이터 — 단일 파일 (코어 엔진 + 대시보드 UI)
   ════════════════════════════════════════════════════════════════════ */

/* ───────────── 1. 규칙 상수 ───────────── */
export const SALARY_CAP = 800;
export const FOREIGN_LIMIT = 3;
export const SLOT_LIMITS = { SP: 1, RP: 2, C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, DH: 1 };
export const ROSTER_SIZE = Object.values(SLOT_LIMITS).reduce((a, b) => a + b, 0); // 12
export const POS_ORDER = ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'DH'];
export const POS_LABEL = { SP: '선발', RP: '불펜', C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', OF: '외야수', DH: '지명타자' };
const SEASON_AUGMENTS = 2; // 엔트리를 모두 채운 뒤 시즌 개막 때 고르는 증강 수
const SERIES_KIND_LABEL = { team: '구단 시즌', national: '국가대표', legend: '레전드' };
const SERIES_NEON = { team: '#10b981', national: '#60a5fa', legend: '#fbbf24' };
/** 단계별 화면 배경 (public/ui/*.webp, Higgsfield 생성) */
const PHASE_BG = { mode: 'stadium', draft: 'stadium', ready: 'stadium', matchup: 'broadcast', sim: 'broadcast', result: 'stadium' };
const START_REROLLS = 3;

/* ───────────── 2. 선수 시드 데이터 ─────────────
   hand: 타자는 타석(L/R/S), 투수는 투구 손(L/R). 능력치는 40~99. */
// 종합 능력치는 세부 스탯에서 계산한다 (시리즈 선수와 같은 공식). 7번째 인자는 예전 수기 값이라 쓰지 않는다.
const withRatings = (p) => ({ ...p, overall: overallOf(p.position, p.stats), cost: costOf(overallOf(p.position, p.stats)) });
const B = (id, name, year, team, position, hand, _legacyOverall, [power, contact, speed, defense], o = {}) => withRatings({
  id, name, year, team, position, hand, type: 'batter',
  isNational: !!o.nat, isForeign: !!o.fgn, note: o.note || '', face: o.face,
  stats: { power, contact, speed, defense },
});
const P = (id, name, year, team, position, hand, _legacyOverall, [stuff, control, stamina, stability], o = {}) => withRatings({
  id, name, year, team, position, hand, type: 'pitcher',
  isNational: !!o.nat, isForeign: !!o.fgn, note: o.note || '', face: o.face,
  stats: { stuff, control, stamina, stability },
});
const KR = '대한민국';

export const PLAYERS = [
  // 선발
  P('ryu06', '류현진', 2006, '한화', 'SP', 'L', 92, [92, 84, 93, 88], { note: '데뷔 시즌 투수 3관왕·MVP', face: '53% 12%' }),
  P('ryu08', '류현진', 2008, KR, 'SP', 'L', 90, [90, 85, 88, 90], { nat: 1, note: '베이징 올림픽 결승전 선발', face: '52% 16%' }),
  P('kkh08', '김광현', 2008, 'SK', 'SP', 'L', 88, [90, 74, 84, 82], { note: '정규시즌 MVP' }),
  P('kkh08n', '김광현', 2008, KR, 'SP', 'L', 87, [89, 74, 82, 86], { nat: 1, note: '베이징 올림픽 일본전 선발' }),
  P('choi84', '최동원', 1984, '롯데', 'SP', 'R', 95, [93, 86, 99, 92], { note: '한국시리즈 4승' }),
  P('yoon11', '윤석민', 2011, 'KIA', 'SP', 'R', 91, [91, 86, 88, 88], { note: '투수 4관왕·정규시즌 MVP' }),
  P('yang17', '양현종', 2017, 'KIA', 'SP', 'L', 89, [86, 84, 92, 90], { note: '20승·정규시즌 & KS MVP' }),
  P('nip16', '니퍼트', 2016, '두산', 'SP', 'R', 91, [90, 85, 88, 90], { fgn: 1, note: '22승·정규시즌 MVP' }),
  P('lind19', '린드블럼', 2019, '두산', 'SP', 'R', 92, [89, 90, 92, 90], { fgn: 1, note: '20승·정규시즌 MVP' }),
  P('alc20', '알칸타라', 2020, '두산', 'SP', 'R', 89, [92, 84, 90, 84], { fgn: 1, note: '20승 다승왕' }),
  P('ruc20', '루친스키', 2020, 'NC', 'SP', 'R', 88, [88, 84, 92, 86], { fgn: 1, note: '통합우승 에이스' }),
  P('yhk16', '유희관', 2016, '두산', 'SP', 'L', 78, [66, 90, 88, 82], { note: '느림의 미학' }),
  P('jws08', '장원삼', 2008, KR, 'SP', 'L', 80, [78, 82, 80, 80], { nat: 1 }),
  P('ssj08', '송승준', 2008, KR, 'SP', 'R', 79, [80, 76, 82, 78], { nat: 1 }),
  // 마무리
  P('sun93', '선동열', 1993, '해태', 'RP', 'R', 96, [97, 92, 70, 96], { note: '평균자책점 0.78' }),
  P('oh06', '오승환', 2006, '삼성', 'RP', 'R', 93, [96, 90, 55, 94], { note: '47세이브' }),
  P('koo06', '구대성', 2006, '한화', 'RP', 'L', 88, [88, 84, 55, 90], { note: '37세이브' }),
  P('jdh08', '정대현', 2008, KR, 'RP', 'R', 86, [82, 92, 50, 92], { nat: 1, note: '베이징 결승 9회 병살 마무리' }),
  P('jwr08', '정우람', 2008, 'SK', 'RP', 'L', 80, [80, 80, 55, 82], { note: '홀드왕' }),
  // 포수
  B('yej20', '양의지', 2020, 'NC', 'C', 'R', 91, [88, 90, 40, 92], { note: '한국시리즈 MVP' }),
  B('pkw00', '박경완', 2000, '현대', 'C', 'R', 89, [90, 70, 40, 94], { note: '4연타석 홈런·정규시즌 MVP' }),
  B('jgy08', '진갑용', 2008, KR, 'C', 'R', 82, [72, 76, 36, 86], { nat: 1 }),
  B('ktg24', '김태군', 2024, 'KIA', 'C', 'R', 74, [55, 70, 34, 84]),
  // 1루수
  B('lsy03', '이승엽', 2003, '삼성', '1B', 'L', 97, [99, 90, 55, 76], { note: '56홈런' }),
  B('lsy08', '이승엽', 2008, KR, '1B', 'L', 88, [90, 78, 45, 72], { nat: 1, note: '베이징 준결승 일본전 역전 투런' }),
  B('thm15', '테임즈', 2015, 'NC', '1B', 'L', 97, [97, 97, 90, 74], { fgn: 1, note: '40-40·정규시즌 MVP' }),
  B('pbh14', '박병호', 2014, '넥센', '1B', 'R', 94, [99, 82, 48, 78], { note: '52홈런' }),
  B('ojl16', '오재일', 2016, '두산', '1B', 'L', 82, [82, 82, 36, 76]),
  // 2루수
  B('sgc14', '서건창', 2014, '넥센', '2B', 'L', 93, [62, 99, 90, 80], { note: '단일 시즌 201안타·MVP' }),
  B('nav14', '나바로', 2014, '삼성', '2B', 'R', 90, [88, 84, 78, 76], { fgn: 1, note: '통합 4연패 주역' }),
  B('jkw08', '정근우', 2008, KR, '2B', 'R', 85, [58, 88, 90, 80], { nat: 1 }),
  B('kym08', '고영민', 2008, KR, '2B', 'R', 83, [62, 76, 76, 90], { nat: 1 }),
  B('ksb24', '김선빈', 2024, 'KIA', '2B', 'R', 80, [40, 90, 50, 80]),
  // 3루수
  B('ldh10', '이대호', 2010, '롯데', '3B', 'R', 97, [96, 99, 32, 62], { note: '타격 7관왕·9경기 연속 홈런' }),
  B('kdy24', '김도영', 2024, 'KIA', '3B', 'R', 96, [92, 96, 94, 74], { note: '38홈런·40도루 MVP' }),
  B('kdj08', '김동주', 2008, KR, '3B', 'R', 87, [84, 86, 38, 76], { nat: 1 }),
  B('hkm16', '허경민', 2016, '두산', '3B', 'R', 78, [50, 82, 64, 88]),
  // 유격수
  B('ljb94', '이종범', 1994, '해태', 'SS', 'R', 97, [80, 99, 99, 86], { note: '타율 .393·84도루' }),
  B('kjh14', '강정호', 2014, '넥센', 'SS', 'R', 94, [94, 90, 52, 86], { note: '유격수 40홈런' }),
  B('pjm08', '박진만', 2008, KR, 'SS', 'R', 84, [58, 72, 52, 96], { nat: 1, note: '국민 유격수' }),
  B('pch24', '박찬호', 2024, 'KIA', 'SS', 'R', 80, [40, 84, 80, 86]),
  // 외야수
  B('ljh22', '이정후', 2022, '키움', 'OF', 'L', 96, [82, 99, 70, 88], { note: '타격 5관왕·정규시즌 MVP' }),
  B('roh20', '로하스', 2020, 'KT', 'OF', 'S', 95, [97, 92, 50, 74], { fgn: 1, note: '47홈런·정규시즌 MVP' }),
  B('khs08', '김현수', 2008, KR, 'OF', 'L', 88, [66, 96, 56, 70], { nat: 1, note: '베이징 금메달 멤버' }),
  B('ljw08', '이종욱', 2008, KR, 'OF', 'L', 86, [46, 82, 94, 86], { nat: 1, note: '47도루' }),
  B('lyk08', '이용규', 2008, KR, 'OF', 'L', 82, [42, 84, 84, 82], { nat: 1 }),
  B('phm23', '박해민', 2023, 'LG', 'OF', 'L', 78, [40, 76, 86, 94]),
  // 지명타자
  B('chw16', '최형우', 2016, '삼성', 'DH', 'L', 92, [90, 98, 36, 60], { note: '타격 3관왕' }),
  B('woo98', '우즈', 1998, 'OB', 'DH', 'R', 91, [97, 80, 36, 62], { fgn: 1, note: '42홈런·정규시즌 MVP' }),
  B('ldh08', '이대호', 2008, KR, 'DH', 'R', 88, [88, 86, 30, 60], { nat: 1, note: '베이징 금메달 중심타선' }),
  B('hsh10', '홍성흔', 2010, '롯데', 'DH', 'R', 82, [80, 90, 40, 50]),
];

/** 드래프트 시리즈: 올타임 레전드 모음 + 시즌·대회별 실제 로스터 (src/data/series/*.json) */
export const LEGEND_SERIES = {
  id: 'legend-allstar', kind: 'legend', year: null, title: 'KBO 올타임 레전드',
  subtitle: '시대를 대표한 레전드 시즌',
  blurb: '연도와 구단을 넘나드는 KBO 역대 최고의 시즌들이 한 자리에 모였어요.',
  players: PLAYERS.map((p) => ({ ...p, seriesId: 'legend-allstar' })),
};
export const DRAFT_SERIES = [LEGEND_SERIES, ...SERIES];
export const ALL_PLAYERS = DRAFT_SERIES.flatMap((s) => s.players);

/* 드래프트 모드: 첫 화면에서 고르는 시리즈 묶음. 드래프트·상대 AI 모두 그 모드의 시리즈만 쓴다. cap 은 기본 샐러리 캡 */
export const DRAFT_MODES = [
  { id: 'legend', name: '올타임 레전드', en: 'All-Time Legends', neon: '#fbbf24', tag: 'HARD', cap: 950,
    desc: '시대를 대표한 레전드 시즌만으로 드림팀을 짭니다. 전원 스타라 캡 운영이 승부처.', filter: (s) => s.kind === 'legend' },
  { id: 'champ', name: '가을의 왕조', en: 'Champions', neon: '#ff5a67', tag: 'NORMAL', cap: 800,
    desc: '한국시리즈 우승팀만 모았습니다. 왕조의 로스터를 섞어 누가 진짜 최강인지 가립니다.', filter: (s) => s.champion },
  { id: 'recent', name: '최근 시즌', en: '2021 – 2026', neon: '#38e1ff', tag: 'NEW', cap: 800,
    desc: '요즘 야구의 얼굴들. 2021년부터 올해까지 시즌별 로스터로 겨룹니다.', filter: (s) => s.kind === 'team' && s.year >= 2021 },
  { id: 'national', name: '태극마크', en: 'Team Korea', neon: '#60a5fa', tag: 'NORMAL', cap: 760,
    desc: 'WBC·올림픽·프리미어12 국가대표만. 같은 선수의 대회별 버전이 섞여 나옵니다.', filter: (s) => s.kind === 'national' },
  { id: 'mix', name: '전체 믹스', en: 'All Series', neon: '#10b981', tag: 'CLASSIC', cap: 800,
    desc: '레전드·구단 시즌·국가대표가 무작위로 열리는 기본 모드. 어떤 조합이 나올지 모릅니다.', filter: () => true },
].map((m) => {
  const series = DRAFT_SERIES.filter(m.filter);
  return { ...m, series, players: series.flatMap((s) => s.players) };
});
/** 모드 화면의 AI 난이도 → 상대 팀 능력치 보정 */
export const AI_BUFF = { easy: -3, normal: 0, hard: 3 };
const personKey = (p) => p.personId || p.name;

/* 필드 자리: 포지션마다 SLOT_LIMITS 만큼. 선수는 slot 에 서고, position 은 원래 포지션으로 남는다 */
/* 자리 12개: 투수는 역할(선발투수·중간계투·마무리), 외야는 셋. pos 는 제자리로 받는 원래 포지션(불펜 둘은 RP, 외야 셋은 OF) */
export const SLOTS = [
  { id: 'SP', pos: 'SP', label: '선발투수' },
  { id: 'MR', pos: 'RP', label: '중간계투' },
  { id: 'CL', pos: 'RP', label: '마무리' },
  { id: 'C', pos: 'C', label: '포수' },
  { id: '1B', pos: '1B', label: '1루수' },
  { id: '2B', pos: '2B', label: '2루수' },
  { id: '3B', pos: '3B', label: '3루수' },
  { id: 'SS', pos: 'SS', label: '유격수' },
  { id: 'OF1', pos: 'OF', label: '외야수1' },
  { id: 'OF2', pos: 'OF', label: '외야수2' },
  { id: 'OF3', pos: 'OF', label: '외야수3' },
  { id: 'DH', pos: 'DH', label: '지명타자' },
];
export const slotPos = (id) => SLOTS.find((s) => s.id === id)?.pos;

/** slot 이 없는 선수(AI 드래프트 등)는 원래 포지션의 빈 자리에 세운다 */
export function withSlots(roster) {
  const used = new Set(roster.map((p) => p.slot).filter(Boolean));
  return roster.map((p) => {
    if (p.slot) return p;
    const s = SLOTS.find((x) => x.pos === p.position && !used.has(x.id)) || SLOTS.find((x) => !used.has(x.id));
    if (s) used.add(s.id);
    return { ...p, slot: s?.id };
  });
}

/** 해당 포지션의 빈 자리. 없으면 null (= 그 포지션 후보는 잠김) */
export function freeSlot(roster, pos) {
  const used = new Set(withSlots(roster).map((p) => p.slot));
  return SLOTS.find((s) => s.pos === pos && !used.has(s.id)) || null;
}

/* 포지션 이탈 감소폭: 비슷한 자리 3 · 같은 계열 6 · 포수로/포수에서 8 · 투수↔야수 20. 야수의 지명타자는 0 */
const NEAR_POS = [['2B', 'SS'], ['1B', '3B'], ['SP', 'RP'], ['DH', '1B']];
export function offPositionPenalty(p, pos) {
  if (!pos || pos === p.position) return 0;
  const pitchSlot = pos === 'SP' || pos === 'RP';
  if ((p.type === 'pitcher') !== pitchSlot) return 20;
  if (pos === 'DH') return 0;
  if (NEAR_POS.some(([a, b]) => (a === p.position && b === pos) || (b === p.position && a === pos))) return 3;
  if (pos === 'C' || p.position === 'C') return 8;
  return 6;
}

/** 선 자리 기준의 실전 능력치 */
export function playAt(p) {
  const pos = slotPos(p.slot);
  const pen = offPositionPenalty(p, pos);
  if (!pen) return p;
  const overall = Math.max(30, p.overall - pen);
  const pitchSlot = pos === 'SP' || pos === 'RP';
  if ((p.type === 'pitcher') === pitchSlot) {
    const stats = Object.fromEntries(Object.entries(p.stats).map(([k, v]) => [k, Math.max(30, v - pen)]));
    return { ...p, position: pos, naturalPosition: p.position, stats, overall };
  }
  // 투타가 바뀌면 원래 스탯을 쓸 수 없으니, 깎인 종합을 새 역할의 네 능력치에 고르게 둔다
  const keys = pitchSlot ? ['stuff', 'control', 'stamina', 'stability'] : ['power', 'contact', 'speed', 'defense'];
  return { ...p, position: pos, type: pitchSlot ? 'pitcher' : 'batter', naturalPosition: p.position, stats: Object.fromEntries(keys.map((k) => [k, overall])), overall };
}

/** 방출 환불액: 영입가의 절반 */
export const releaseRefund = (p) => Math.floor(p.cost / 2);

/* ───────────── 3. 유틸 ───────────── */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pickOne = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function poisson(lambda, rng) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= rng(); } while (p > L && k < 12);
  return k - 1;
}

/* ───────────── 4. 드래프트 판정 레이어 ─────────────
   반환: null = 영입 가능, 문자열 = 잠금 사유 (우선순위 순) */
export function getLockReason(player, roster, cp, banned = []) {
  if (roster.some((p) => p.id === player.id)) return '영입 완료';
  if (banned.includes(personKey(player))) return '방출한 선수';
  if (roster.some((p) => personKey(p) === personKey(player))) return '동일인 영입됨';
  if (!freeSlot(roster, player.position)) return `${POS_LABEL[player.position]} 마감`;
  if (player.isForeign && roster.filter((p) => p.isForeign).length >= FOREIGN_LIMIT) return `외국인 한도 ${FOREIGN_LIMIT}/${FOREIGN_LIMIT}`;
  if (player.cost > cp) return `CP 부족 (${player.cost - cp} 모자람)`;
  return null;
}

/** 영입 가능한 선수가 한 명 이상 있는 시리즈 중 하나를 무작위로. 직전 시리즈는 가능하면 피한다. */
export function rollSeries(roster, cp, avoidId = null, banned = [], seriesPool = DRAFT_SERIES, seen = [], rng = Math.random) {
  const open = seriesPool.filter((s) => s.players.some((p) => !getLockReason(p, roster, cp, banned)));
  // 이번 드래프트에서 아직 안 나온 시리즈 우선. 모두 나왔으면 다시 섞되 직전 시리즈는 피한다
  const fresh = open.filter((s) => !seen.includes(s.id));
  const base = fresh.length ? fresh : open;
  const pool = base.length > 1 ? base.filter((s) => s.id !== avoidId) : base;
  if (!pool.length) return null;
  return sampleSeries(pickOne(rng, pool), roster, cp, banned, rng);
}

export const SHELF_SIZE = 17; // 드래프트 선반은 늘 한 줄 17칸 (선반 그리드의 lg:grid-cols-[repeat(17,…)] 와 같이 바꿀 것)
/**
 * 선수가 SHELF_SIZE 보다 많은 시리즈는 열릴 때마다 SHELF_SIZE 명만 뽑는다: 포지션마다 1명씩 먼저 넣고 나머지는 무작위.
 * 영입 가능한 선수가 한 명도 없으면 같은 포지션 자리와 바꿔 최소 1명은 들어가게 한다
 */
function sampleSeries(series, roster, cp, banned, rng) {
  if (series.players.length <= SHELF_SIZE) return series;
  const all = shuffle(series.players, rng);
  const core = POS_ORDER.map((pos) => all.find((p) => p.position === pos)).filter(Boolean);
  const rest = all.filter((p) => !core.includes(p)).slice(0, SHELF_SIZE - core.length);
  const picked = [...core, ...rest];
  if (!picked.some((p) => !getLockReason(p, roster, cp, banned))) {
    const open = all.find((p) => !getLockReason(p, roster, cp, banned));
    if (open) picked[rest.length ? picked.length - 1 : picked.findIndex((p) => p.position === open.position)] = open;
  }
  return { ...series, players: picked };
}

/** 빈 자리를 퓨처스 유망주(능력치 55)로 채운다 */
export function fillRoster(roster) {
  const out = withSlots(roster);
  const used = new Set(out.map((p) => p.slot));
  for (const { id: slot, pos } of SLOTS) {
    if (used.has(slot)) continue;
    const id = `rep-${slot}`;
    out.push(pos === 'SP' || pos === 'RP'
      ? { ...P(id, '퓨처스 유망주', 2026, '퓨처스', pos, 'R', 55, [55, 55, 60, 55]), isReplacement: true, slot }
      : { ...B(id, '퓨처스 유망주', 2026, '퓨처스', pos, 'R', 55, [55, 55, 55, 55]), isReplacement: true, slot });
  }
  return out;
}

/** AI: 900 CP 안에서 남은 자리를 채울 여유분을 남기며 상위권 선수를 무작위로 고른다 */
export function aiDraft({ players = ALL_PLAYERS, cap = SALARY_CAP, rng = Math.random } = {}) {
  let roster = [];
  let cp = cap;
  for (const pos of shuffle(POS_ORDER.flatMap((p) => Array(SLOT_LIMITS[p]).fill(p)), rng)) {
    const slotsAfter = ROSTER_SIZE - roster.length - 1;
    const cands = players.filter((p) => p.position === pos && !getLockReason(p, roster, cp) && cp - p.cost >= slotsAfter * 70)
      .sort((a, b) => b.overall - a.overall);
    const fallback = players.filter((p) => p.position === pos && !getLockReason(p, roster, cp)).sort((a, b) => a.cost - b.cost);
    const choice = cands.length ? cands[Math.floor(rng() * Math.min(3, cands.length))] : fallback[0];
    if (choice) { roster = [...roster, choice]; cp -= choice.cost; }
  }
  return roster;
}

/* ───────────── 5. 시너지 체크 엔진 ───────────── */
/* kind: story = 실제 있었던 일·선수 조합 (같은 선수면 카드 시즌과 상관없이 인정) · build = 팀 구성 */
const posOf = (p) => slotPos(p.slot) || p.position;
const realOnly = (r) => r.filter((p) => !p.isReplacement);
const battersOf = (r) => realOnly(r).filter((p) => p.type === 'batter');
/** 이름 목록에 든 선수(동일인은 한 번) */
const personMembers = (r, names) => {
  const seen = new Set();
  return realOnly(r).filter((p) => {
    const k = personKey(p);
    if (!names.includes(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
const FRANCHISE = { 해태: 'KIA', OB: '두산', 넥센: '키움' };
/** 구단별로 묶어 인원이 가장 많은 구단(동률이면 그 구단들 모두)의 크기 · 이름 · 선수. 뽑은 순서와 상관없이 지금 엔트리 기준 */
function topFranchises(roster) {
  const groups = {};
  realOnly(roster).filter((p) => p.team !== KR).forEach((p) => { const k = FRANCHISE[p.team] || p.team; (groups[k] = groups[k] || []).push(p); });
  const size = Math.max(0, ...Object.values(groups).map((g) => g.length));
  const top = Object.entries(groups).filter(([, g]) => size > 0 && g.length === size);
  return { size, names: top.map(([k]) => k), players: top.flatMap(([, g]) => g) };
}
const BEIJING_2008 = DRAFT_SERIES.find((s) => s.id === '2008-beijing')?.players.map(personKey) || [];
const PREMIER12_2015 = DRAFT_SERIES.find((s) => s.id === '2015-premier12')?.players.map(personKey) || [];
const tier = (need, effect, bonus) => ({ need, effect, bonus });
const story = (id, name, cond, names, tiers) => ({ id, kind: 'story', name, cond, names, tiers, members: (r) => personMembers(r, names) });
const build = (id, name, cond, members, tiers) => ({ id, kind: 'build', name, cond, tiers, members });
/* 프랜차이즈의 기억: 인원은 가장 큰 구단 한 곳의 크기로 세고(동률 구단 선수는 모두 혜택), 조건 문구에 그 구단 이름을 보여준다 */
const FRANCHISE_EXTRA = {
  count: (r) => topFranchises(r).size,
  condOf: (r) => { const t = topFranchises(r); return t.size ? `최다 구단: ${t.names.join('·')} ${t.size}명 (해태=KIA)` : '가장 많이 뽑은 구단 (해태=KIA)'; },
};

/* members(r): 조건을 채우는 선수들. 단계(tiers)를 넘으면 그 단계 보너스가 이 선수들에게만 붙는다
   bonus 키 → 타자: bat(파워·컨택) power contact speed defense / 투수: pit(구위·제구·안정) stability
   단계 인원의 상한은 포지션별로 실제로 뽑을 수 있는 카드 수를 보고 정했다 (예: 주루 75+ 는 포수·지명 카드가 없어 4명이 끝) */
export const SYNERGIES = [
  // ── 실화 · 선수 조합 (같은 선수면 카드 시즌과 상관없이 인정)
  story('beijing', '베이징 9전 전승', '베이징 금메달 멤버', BEIJING_2008, [
    tier(3, '능력치 +1', { bat: 1, pit: 1 }), tier(5, '능력치 +2', { bat: 2, pit: 2 }), tier(7, '능력치 +4', { bat: 4, pit: 4 }),
  ]),
  story('cleanup', '클린업 트리오', '이승엽·이대호·김동주 중 2명', ['이승엽', '이대호', '김동주'], [tier(2, '파워 +5', { power: 5 })]),
  story('skMound', 'SK 왕조 마운드', '김광현·정우람·정대현 (2008 선발·셋업·마무리)', ['김광현', '정우람', '정대현'], [
    tier(2, '투수 +3', { pit: 3 }), tier(3, '투수 +5', { pit: 5 }),
  ]),
  story('haitai', '해태 왕조의 원투', '선동열 · 이종범', ['선동열', '이종범'], [tier(2, '능력치 +3', { bat: 3, pit: 3 })]),
  story('tableSetter', '국민 테이블세터', '이용규 · 정근우', ['이용규', '정근우'], [tier(2, '컨택 +4 · 주루 +5', { contact: 4, speed: 5 })]),
  story('nexen14', '2014 넥센 핵타선', '박병호·강정호·서건창 중 2명', ['박병호', '강정호', '서건창'], [tier(2, '파워·컨택 +4', { power: 4, contact: 4 })]),
  story('skBattery', 'SK 왕조 배터리', '김광현 · 박경완', ['김광현', '박경완'], [tier(2, '안정·수비 +4', { stability: 4, defense: 4 })]),
  story('doosanBattery', '22승 배터리', '니퍼트 · 양의지', ['니퍼트', '양의지'], [tier(2, '안정·수비 +4', { stability: 4, defense: 4 })]),
  story('samsungDuo', '삼성 왕조의 투타', '오승환 · 이승엽', ['오승환', '이승엽'], [tier(2, '안정 +3 · 파워 +4', { stability: 3, power: 4 })]),
  story('changeup', '체인지업 전수', '구대성 · 류현진 (2006 한화)', ['구대성', '류현진'], [tier(2, '투수 +4', { pit: 4 })]),
  story('premier12', '프리미어12 초대 우승', '2015 대표팀 멤버', PREMIER12_2015, [
    tier(3, '능력치 +1', { bat: 1, pit: 1 }), tier(5, '능력치 +3', { bat: 3, pit: 3 }),
  ]),
  story('beijingFinal', '베이징 결승전', '류현진 · 정대현 (선발과 병살 마무리)', ['류현진', '정대현'], [tier(2, '투수 +4', { pit: 4 })]),
  story('doosanMound', '2016 두산 마운드', '니퍼트·정재훈·이현승 (선발·셋업·마무리)', ['니퍼트', '정재훈', '이현승'], [
    tier(2, '투수 +3', { pit: 3 }), tier(3, '투수 +5', { pit: 5 }),
  ]),
  story('lotte10', '2010 롯데 폭격', '이대호·홍성흔·강민호·손아섭·전준우', ['이대호', '홍성흔', '강민호', '손아섭', '전준우'], [
    tier(2, '파워 +3', { power: 3 }), tier(3, '파워 +5', { power: 5 }),
  ]),
  story('samsung14', '통합 4연패', '최형우·박석민·나바로·채태인·박해민', ['최형우', '박석민', '나바로', '채태인', '박해민'], [
    tier(2, '파워·컨택 +2', { power: 2, contact: 2 }), tier(3, '파워·컨택 +4', { power: 4, contact: 4 }),
  ]),
  story('nc20', 'NC 창단 첫 우승', '양의지·나성범·박민우·알테어·루친스키', ['양의지', '나성범', '박민우', '알테어', '루친스키'], [
    tier(2, '능력치 +2', { bat: 2, pit: 2 }), tier(3, '능력치 +4', { bat: 4, pit: 4 }),
  ]),
  story('lg23', 'LG 29년의 한', '오지환·김현수·박해민·홍창기·오스틴', ['오지환', '김현수', '박해민', '홍창기', '오스틴'], [
    tier(2, '컨택 +3', { contact: 3 }), tier(3, '컨택 +5 · 수비 +3', { contact: 5, defense: 3 }),
  ]),
  story('kia24', 'KIA V12', '김도영·최형우·양현종·나성범·소크라테스', ['김도영', '최형우', '양현종', '나성범', '소크라테스'], [
    tier(2, '능력치 +2', { bat: 2, pit: 2 }), tier(3, '능력치 +4', { bat: 4, pit: 4 }),
  ]),
  // ── 팀 구성 (인원이 늘면 단계가 오른다)
  build('power', '홈런 군단', '파워 80+ 타자', (r) => battersOf(r).filter((p) => p.stats.power >= 80), [
    tier(3, '파워 +2', { power: 2 }), tier(4, '파워 +4', { power: 4 }), tier(6, '파워 +7', { power: 7 }),
  ]),
  build('mercenary', '용병 트리오', '외국인 선수', (r) => realOnly(r).filter((p) => p.isForeign), [
    tier(2, '능력치 +1', { bat: 1, pit: 1 }), tier(3, '능력치 +3', { bat: 3, pit: 3 }),
  ]),
  // 가장 많이 뽑힌 구단의 인원 수로 단계가 정해지고, 그 구단(동률이면 모두) 선수들이 혜택을 받는다
  build('franchise', '프랜차이즈의 기억', '가장 많이 뽑은 구단', (r) => topFranchises(r).players, [
    tier(3, '능력치 +1', { bat: 1, pit: 1 }),
    tier(5, '능력치 +2 · 수비·안정 +2', { bat: 2, pit: 2, defense: 2, stability: 2 }),
    tier(7, '능력치 +4 · 수비·안정 +3', { bat: 4, pit: 4, defense: 3, stability: 3 }),
  ]),
];

/** 시너지 현황: level(넘은 단계 수) · cur(채운 칸, 최종 단계에서 멈춤) · top(최종 단계 인원) · 지금 단계의 effect/bonus */
export function checkSynergies(roster) {
  return SYNERGIES.map((s) => {
    const extra = s.id === 'franchise' ? FRANCHISE_EXTRA : null;
    const members = s.members(roster);
    const count = extra ? extra.count(roster) : members.length;
    const top = s.tiers[s.tiers.length - 1].need;
    const level = s.tiers.filter((t) => count >= t.need).length;
    const shown = s.tiers[Math.max(0, level - 1)];
    return {
      ...s, members, top, level, active: level > 0, count,
      cond: extra ? extra.condOf(roster) : s.cond,
      cur: Math.min(count, top),
      need: level < s.tiers.length ? s.tiers[level].need : top,
      effect: shown.effect, bonus: level ? shown.bonus : {},
    };
  });
}

export const SYNERGY_STAT_CAP = 8; // 한 선수가 시너지로 받는 보너스는 능력치마다 이만큼까지

const BONUS_STATS = {
  batter: { bat: ['power', 'contact'], power: ['power'], contact: ['contact'], speed: ['speed'], defense: ['defense'] },
  pitcher: { pit: ['stuff', 'control', 'stability'], stability: ['stability'] },
};
/** 완성된 시너지의 보너스를 그 시너지를 만든 선수에게만 더한다. 오른 선수에게는 synergyBoost(시너지 이름 목록)가 붙는다 */
export function applySynergies(roster, synergies = checkSynergies(roster)) {
  const adds = new Map();
  synergies.filter((s) => s.active).forEach((s) => s.members.forEach((m) => {
    const a = adds.get(m.id) || { stats: {}, names: [] };
    Object.entries(s.bonus).forEach(([k, v]) => (BONUS_STATS[m.type][k] || []).forEach((stat) => { a.stats[stat] = (a.stats[stat] || 0) + v; }));
    a.names.push(s.name);
    adds.set(m.id, a);
  }));
  return roster.map((p) => {
    const a = adds.get(p.id);
    if (!a) return p;
    const stats = Object.fromEntries(Object.entries(p.stats).map(([k, v]) => [k, Math.min(99, v + Math.min(SYNERGY_STAT_CAP, a.stats[k] || 0))]));
    const gain = overallOf(p.position, stats) - overallOf(p.position, p.stats);
    return { ...p, stats, overall: Math.min(99, p.overall + Math.max(0, gain)), synergyBoost: a.names };
  });
}

/* ───────────── 6. 팀 전력 산출 ───────────── */
export function buildTeam(name, roster, buff = 0) {
  roster = withSlots(roster).map(playAt); // 선 자리 기준 능력치로 경기를 치른다
  const synergies = checkSynergies(roster);
  roster = applySynergies(roster, synergies); // 시너지 보너스는 그 시너지를 만든 선수에게만
  const bonus = { bat: buff, pit: buff };

  const batters = roster.filter((p) => p.type === 'batter');
  const sps = roster.filter((p) => p.slot === 'SP'); // 선발투수 자리
  const mr = roster.find((p) => p.slot === 'MR'); // 중간계투
  const rp = roster.find((p) => p.slot === 'CL'); // 마무리
  const batValue = (p) => p.stats.contact * 0.4 + p.stats.power * 0.4 + p.stats.speed * 0.2;
  const handShare = (h) => (batters.length ? batters.reduce((s, p) => s + (p.hand === h ? 1 : p.hand === 'S' ? 0.5 : 0), 0) / batters.length : 0);

  return {
    name, roster, synergies, bonus, batters, sps, mr, rp,
    offense: avg(batters.map(batValue)) + bonus.bat,
    defense: avg(batters.map((p) => p.stats.defense)),
    rightRatio: handShare('R'),
    pitchValue: (p) => p.stats.stuff * 0.4 + p.stats.control * 0.3 + p.stats.stability * 0.3 + bonus.pit,
    topBatter: (stat) => [...batters].sort((a, b) => b.stats[stat] - a.stats[stat])[0],
  };
}

/** 이닝별 등판 투수: 선발투수(체력만큼) → 중간계투 → 9회 마무리 */
function pitcherFor(team, inning) {
  const ace = team.sps[0];
  const aceInnings = ace.stats.stamina >= 90 ? 7 : ace.stats.stamina >= 80 ? 6 : 5;
  if (inning === 9 && team.rp) return { pitcher: team.rp, tired: false };
  if (inning <= aceInnings) return { pitcher: ace, tired: inning === aceInnings };
  if (team.mr) return { pitcher: team.mr, tired: false };
  return { pitcher: team.rp || ace, tired: !team.rp };
}

/* ───────────── 7. 증강 & 시즌 이벤트 정의 ─────────────
   side: offense(아군 공격 이닝) / defense(아군 수비 이닝)
   when(ctx): 리스너 조건, chance: 조건 충족 시 발동 확률, max: 경기당 발동 한도 */
export const TIER_RANK = { prismatic: 3, gold: 2, silver: 1 };
export const TIER_LABEL = { prismatic: '프리즘', gold: '골드', silver: '실버' };

export const AUGMENTS = [
  {
    id: 'hell', name: '지옥에 가더라도 데려온다', tier: 'prismatic', side: 'offense', chance: 1, max: 1,
    cond: '7회 이후 · 아군 1~3점 차 열세', desc: '조건 충족 즉시 발동. 점수 차 +1점을 확정해 역전합니다.',
    when: (c) => c.inning >= 7 && c.score.opp - c.score.my >= 1 && c.score.opp - c.score.my <= 3,
    apply: (c) => {
      const d = c.score.opp - c.score.my;
      const hero = c.my.topBatter('speed');
      return { runs: d + 1, hero, text: `${hero.name}, 전력 질주로 홈 쇄도! ${d + 1}점 확정, 경기를 뒤집습니다` };
    },
  },
  {
    id: 'cleanupBomb', name: '클린업 폭격', tier: 'prismatic', side: 'offense', chance: 0.35, max: 1,
    cond: '클린업 트리오 On · 4~6회 공격', desc: '35% 확률로 이닝 3점을 확정합니다.',
    when: (c) => c.inning >= 4 && c.inning <= 6 && c.my.synergies.find((s) => s.id === 'cleanup').active,
    apply: (c) => {
      const hero = c.my.batters.find((p) => p.name === '이대호') || c.my.topBatter('power');
      return { runs: 3, hero, text: '이승엽·이대호·김동주 연속 장타! 이닝 3점 확정' };
    },
  },
  {
    id: 'daesseuyo', name: '대쓰요!', tier: 'gold', side: 'offense', chance: 0.18, max: 2,
    cond: '파워 92+ 타자 보유 · 상대 투수 구위 90 미만', desc: '18% 확률로 투런 홈런, 이닝 2점을 확정합니다. (경기당 2회)',
    when: (c) => c.my.topBatter('power').stats.power >= 92 && c.oppPitcher.stats.stuff < 90,
    apply: (c) => {
      const hero = c.my.topBatter('power');
      return { runs: 2, hero, text: `${hero.name}의 담장을 넘기는 투런 홈런! 이닝 2점 확정` };
    },
  },
  {
    id: 'closer', name: '철벽 마무리', tier: 'gold', side: 'defense', chance: 1, max: 1,
    cond: '9회 수비 · 마무리 안정성 88+', desc: '9회 수비 이닝을 무실점으로 확정합니다.',
    when: (c) => c.inning === 9 && c.myPitcher.position === 'RP' && c.myPitcher.stats.stability >= 88,
    apply: (c) => ({ runs: 0, hero: c.myPitcher, text: `${c.myPitcher.name}, 세 타자를 돌려세우며 문을 걸어 잠급니다` }),
  },
  {
    id: 'ace', name: '에이스의 품격', tier: 'gold', side: 'defense', chance: 0.4, max: 2,
    cond: '1~3회 수비 · 선발 종합 88+', desc: '40% 확률로 수비 이닝 무실점을 확정합니다. (경기당 2회)',
    when: (c) => c.inning <= 3 && c.myPitcher.overall >= 88,
    apply: (c) => ({ runs: 0, hero: c.myPitcher, text: `${c.myPitcher.name}의 삼진 쇼, 이닝 무실점 확정` }),
  },
  {
    id: 'bigGame', name: '빅게임 헌터', tier: 'gold', side: 'offense', chance: 0.4, max: 1,
    cond: '국가대표 3명+ · 동점 상황 공격', desc: '동점일 때 40% 확률로 1점을 확정합니다.',
    when: (c) => c.score.my === c.score.opp && c.my.roster.filter((p) => p.isNational).length >= 3,
    apply: (c) => {
      const natBatters = c.my.batters.filter((p) => p.isNational);
      const hero = natBatters.length ? pickOne(c.rng, natBatters) : c.my.topBatter('contact');
      return { runs: 1, hero, text: `큰 경기에 강한 ${hero.name}, 균형을 깨는 결승타! 1점 확정` };
    },
  },
  {
    id: 'lefty', name: '좌완 킬러', tier: 'silver', side: 'offense', chance: 0.3, max: 2,
    cond: '상대 투수 좌완 · 아군 우타 비중 60%+', desc: '30% 확률로 이닝 1점 이상을 확정합니다. (경기당 2회)',
    when: (c) => c.oppPitcher.hand === 'L' && c.my.rightRatio >= 0.6,
    apply: (c) => {
      const hero = c.my.topBatter('contact');
      return { runs: Math.max(1, c.baseRuns), hero, text: `우타 라인이 좌완 ${c.oppPitcher.name} 공략, ${hero.name} 적시타` };
    },
  },
  {
    id: 'rightLock', name: '우타 봉쇄', tier: 'silver', side: 'defense', chance: 0.3, max: 3,
    cond: '상대 우타 비중 60%+ · 아군 우완 제구 85+', desc: '30% 확률로 수비 이닝 무실점을 확정합니다. (경기당 3회)',
    when: (c) => c.opp.rightRatio >= 0.6 && c.myPitcher.hand === 'R' && c.myPitcher.stats.control >= 85,
    apply: (c) => ({ runs: 0, hero: c.myPitcher, text: `${c.myPitcher.name}의 바깥쪽 제구, 우타자 셋을 연속 범타 처리` }),
  },
  {
    id: 'speedBall', name: '발야구', tier: 'silver', side: 'offense', chance: 0.25, max: 2,
    cond: '주루 85+ 타자 3명 이상', desc: '25% 확률로 이닝 1점 이상을 확정합니다. (경기당 2회)',
    when: (c) => c.my.batters.filter((p) => p.stats.speed >= 85).length >= 3,
    apply: (c) => {
      const hero = c.my.topBatter('speed');
      return { runs: Math.max(1, c.baseRuns), hero, text: `${hero.name} 2루·3루 연속 도루 후 내야 땅볼에 득점` };
    },
  },
];

export const EVENTS = [
  { id: 'fund', name: '긴급 트레이드 자금', tier: 'gold', cond: '구단주 특별 지원', desc: '샐러리 캡 +60 CP', apply: (s) => ({ ...s, cp: s.cp + 60 }) },
  { id: 'scout', name: '스카우트 특명', tier: 'silver', cond: '전국 스카우트망 가동', desc: '상점 새로고침 +3회', apply: (s) => ({ ...s, rerolls: s.rerolls + 3 }) },
  { id: 'camp', name: '전지훈련 대성공', tier: 'gold', cond: '스프링캠프 부상자 0명', desc: '팀 전체 능력치 +2', apply: (s) => ({ ...s, buff: s.buff + 2 }) },
  { id: 'austerity', name: '긴축 경영', tier: 'silver', cond: '모기업 예산 삭감', desc: 'CP −30, 대신 상점 새로고침 +5회', apply: (s) => ({ ...s, cp: s.cp - 30, rerolls: s.rerolls + 5 }) },
  { id: 'rookie', name: '신인 드래프트 대박', tier: 'prismatic', cond: '1라운드 지명 적중', desc: 'CP +100, 대신 팀 전체 능력치 −1', apply: (s) => ({ ...s, cp: s.cp + 100, buff: s.buff - 1 }) },
];

/* ───────────── 8. 경기 시뮬레이터 ───────────── */
export const emptyBoard = () => ({ away: Array(9).fill(null), home: Array(9).fill(null) });

function describeHalf(runs, off, defPitcher, rng) {
  if (runs === 0) {
    const b = pickOne(rng, off.batters);
    return {
      hitter: null,
      text: pickOne(rng, [
        `${defPitcher.name}, 삼자범퇴로 이닝 정리`,
        `${b.name}의 병살타로 찬스 무산`,
        `2사 만루 위기, ${defPitcher.name} 탈삼진으로 탈출`,
        `${b.name}의 잘 맞은 타구가 호수비에 걸림`,
      ]),
    };
  }
  const weights = off.batters.map((p) => p.stats.power + p.stats.contact);
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  const hitter = off.batters.find((_, i) => (roll -= weights[i]) < 0) || off.batters[0];
  const byRuns = {
    1: [`${hitter.name} 적시타로 1점`, `${hitter.name} 희생플라이로 1점`],
    2: [`${hitter.name} 투런 홈런!`, `${hitter.name} 2타점 적시 2루타`],
    3: [`${hitter.name} 쓰리런 홈런!`],
    4: [`${hitter.name} 그랜드슬램!`],
  };
  return { hitter, text: runs >= 5 ? `타자 일순 빅이닝, ${hitter.name} 쐐기 적시타 (${runs}점)` : pickOne(rng, byRuns[runs]) };
}

/**
 * 비동기 경기 루프. 사용자 팀(my)은 홈(말 공격).
 * 매 하프 이닝마다 ① 증강 리스너 판정 → 발동 시 점수 확정·로그 주입·하이라이트 정지
 *                  ② 미발동 시 스탯 보정 포아송 난수 득점
 */
export async function runSimulation({
  my, opp, augments = [], rng = Math.random,
  getSpeed = () => 1, isCancelled = () => false,
  onBoard = () => {}, onLog = () => {}, onHighlight = async () => {},
}) {
  const board = emptyBoard();
  const score = { my: 0, opp: 0 };
  const used = {};
  const credit = new Map();
  const addCredit = (p, pts, key) => {
    if (!p || p.isReplacement || !my.roster.includes(p)) return;
    const c = credit.get(p.id) || { player: p, pts: 0, runs: 0, zero: 0, fires: 0 };
    c.pts += pts;
    if (key) c[key] += 1;
    credit.set(p.id, c);
  };
  const logs = [];
  const log = (entry) => { const e = { id: logs.length, ...entry }; logs.push(e); onLog(e); };
  const halfDelay = () => sleep(900 / getSpeed());

  log({ kind: 'system', inning: 0, text: `플레이볼! ${opp.name} vs ${my.name}` });

  for (let inning = 1; inning <= 9; inning++) {
    for (const isTop of [true, false]) {
      if (isCancelled()) return null;
      if (!isTop && inning === 9 && score.my > score.opp) {
        board.home[8] = 'X';
        onBoard({ board: { away: [...board.away], home: [...board.home] }, score: { ...score }, half: null });
        break;
      }
      const offense = isTop ? opp : my;
      const defense = isTop ? my : opp;
      const { pitcher: defPitcher, tired } = pitcherFor(defense, inning);
      const { pitcher: myPitcher } = pitcherFor(my, inning);
      const { pitcher: oppPitcher } = pitcherFor(opp, inning);

      const pitch = defense.pitchValue(defPitcher) - (tired ? 3 : 0);
      // 실제 드래프트 팀 분포(타선−투수 ≈ −6, 수비 80대) 기준으로 하프 이닝 기대 득점 ≈ 0.55 (경기 합계 약 10점)
      const lambda = Math.min(2.0, Math.max(0.15, 0.82 + ((offense.offense - 78) - (pitch - 86)) * 0.04 - (defense.defense - 78) * 0.01));
      const baseRuns = Math.min(6, poisson(lambda, rng));

      onBoard({ board: { away: [...board.away], home: [...board.home] }, score: { ...score }, half: { inning, isTop } });

      // ① 증강 리스너 (우선순위: 등급 높은 순)
      const side = isTop ? 'defense' : 'offense';
      const ctx = { inning, isTop, my, opp, score: { ...score }, rng, baseRuns, myPitcher, oppPitcher };
      const fired = [...augments]
        .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier])
        .find((a) => a.side === side && (used[a.id] || 0) < a.max && a.when(ctx) && rng() < a.chance);

      let runs;
      if (fired) {
        const res = fired.apply(ctx);
        runs = res.runs;
        used[fired.id] = (used[fired.id] || 0) + 1;
        addCredit(res.hero, 4, 'fires');
        if (!isTop) addCredit(res.hero, runs * 2, null);
        log({ kind: 'augment', tier: fired.tier, inning, isTop, runs, text: `[증강 발동: ${fired.name}!] ${res.text}`, hero: res.hero, pitcher: defPitcher });
        await onHighlight({ augment: fired, text: res.text, hero: res.hero });
        await sleep(500); // 하이라이트 일시정지 (배속 무관)
      } else {
        // ② 일반 난수 판정
        runs = baseRuns;
        const d = describeHalf(runs, offense, defPitcher, rng);
        if (!isTop && d.hitter) addCredit(d.hitter, runs * 3 + (d.text.includes('홈런') ? 2 : 0), 'runs');
        // 중계 자막용: 이 하프 이닝의 타석(득점 타자, 없으면 공격 팀 타순을 도는 타자)과 마운드 투수
        const atBat = d.hitter || offense.batters[(inning * 2 + (isTop ? 0 : 1)) % Math.max(1, offense.batters.length)];
        log({ kind: runs ? 'score' : 'normal', inning, isTop, runs, text: d.text, hero: atBat, pitcher: defPitcher });
      }

      if (isTop) {
        board.away[inning - 1] = runs;
        score.opp += runs;
        if (runs === 0) addCredit(defPitcher, 1.5, 'zero');
        else addCredit(defPitcher, -runs, null);
      } else {
        board.home[inning - 1] = runs;
        score.my += runs;
      }
      onBoard({ board: { away: [...board.away], home: [...board.home] }, score: { ...score }, half: { inning, isTop } });

      if (!isTop && inning === 9 && score.my > score.opp && runs > 0) {
        log({ kind: 'augment', tier: 'gold', inning, isTop, runs: 0, text: '끝내기! 홈 팬들이 그라운드로 쏟아집니다' });
      }
      await halfDelay();
    }
  }

  const winner = score.my > score.opp ? 'my' : score.my < score.opp ? 'opp' : 'draw';
  const ranked = [...credit.values()].map((c) => ({ ...c, pts: c.pts + rng() * 1.5 })).sort((a, b) => b.pts - a.pts);
  const fallback = my.roster.filter((p) => !p.isReplacement).sort((a, b) => b.overall - a.overall)[0] || my.roster[0];
  const mvp = ranked[0] || { player: fallback, pts: 0, runs: 0, zero: 0, fires: 0 };
  log({ kind: 'system', inning: 9, text: `경기 종료 — ${my.name} ${score.my} : ${score.opp} ${opp.name}` });

  // credits: 이번 경기 기여도 순 (결과 화면 선수 평점에 쓴다)
  return { board, score, winner, logs, used, mvpPlayer: mvp.player, mvp, credits: ranked };
}

/* ════════════════════════════════════════════════════════════════════
   UI — 다크 스포츠 대시보드 (Tailwind)
   ════════════════════════════════════════════════════════════════════ */

const KEYFRAMES = `
@keyframes rise { from { opacity: 0; transform: translateY(28px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes toast { 0% { opacity: 0; transform: scale(1.25); } 12% { opacity: 1; transform: scale(1); } 80% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.97) translateY(-12px); } }
@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
@keyframes cellIn { from { background-color: rgba(16,185,129,.35); } to { background-color: transparent; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes prism { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
/* PICK 카드가 빠질 때: 등장(rise)을 거꾸로 — 조용히 가라앉으며 흐려진다. 영입이면 라인업 쪽(오른쪽)으로 살짝 흘러간다 */
@keyframes pickDrop { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(20px) scale(.96); } }
@keyframes pickSign { from { opacity: 1; transform: none; } to { opacity: 0; transform: translate(18px, 14px) scale(.96); } }
.pick-leave { pointer-events: none; }
.pick-leave.drop { animation: pickDrop .3s ease-in both; }
.pick-leave.sign { animation: pickSign .35s ease-in both; }
/* 라인업 합류: 무채색 미리보기 위로 자막 바 → 흉상 순서(아래 → 위)로 색이 한 덩어리로 차오르고,
   맨 위까지 차면 한 번 또렷하게 튀어 올랐다 자리 잡으며(밝기·크기·테두리) 완료를 알린다 */
@keyframes tokFill { from { -webkit-mask-position: 0 0%; mask-position: 0 0%; } to { -webkit-mask-position: 0 100%; mask-position: 0 100%; } }
@keyframes tokDone { 0% { transform: none; filter: brightness(1); } 35% { transform: scale(1.07); filter: brightness(1.4); } 100% { transform: none; filter: brightness(1); } }
@keyframes tokEdge {
  0% { box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }
  30% { box-shadow: inset 0 0 0 2px var(--n), 0 0 22px color-mix(in srgb, var(--n) 70%, transparent); }
  100% { box-shadow: inset 0 0 0 1px rgba(255,255,255,.12), 0 12px 24px -10px color-mix(in srgb, var(--n) 60%, transparent); }
}
/* 라인업 필드 토큰: 유리 판(이름 · 시즌) + 판 위로 솟는 흉상 + 판 위 포지션 칩 + 빛나는 종합 · 아래 팀 색 네온 밑줄.
   빈 자리는 칩 없이 흉상과 같은 크기의 사진 칸(빈 프로필 아이콘) + 옅은 판 */
.lf-field { position: absolute; left: 0; top: 0; width: 900px; height: 580px; transform-origin: 0 0; }
.lf-tok { position: absolute; width: 214px; height: 72px; transform: translate(-50%, -50%); touch-action: none; user-select: none; cursor: grab; outline: none; }
.lf-tok.empty { cursor: pointer; }
.lf-tok.picked, .lf-tok.want { z-index: 5; }
.lf-tok:focus-visible .lf-bar { outline: 2px solid #10b981; outline-offset: 2px; }
/* 흉상+판을 담는 한 덩어리. 합류 마스크에 흉상 머리 · 지정 시 떠오름 · 그림자가 잘리지 않게 토큰보다 사방으로 넉넉하게 잡고, 안쪽 .lf-k 가 토큰 크기 */
.lf-in { position: absolute; left: -24px; right: -24px; top: -14px; bottom: -20px; pointer-events: none; }
.lf-in > * { pointer-events: auto; }
.lf-k { position: absolute; left: 24px; right: 24px; top: 14px; bottom: 20px; transform-origin: 50% 100%; transition: transform .09s ease-in; }
.lf-k::before { content: ""; position: absolute; left: 10%; right: 10%; bottom: -16px; height: 12px; border-radius: 50%; background: radial-gradient(closest-side, rgba(0,0,0,.72), transparent); opacity: 0; transition: opacity .09s; pointer-events: none; }
.lf-chip { position: absolute; left: 58px; top: 0; z-index: 3; padding: 0 7px; font-family: 'Saira Condensed', sans-serif; font-size: 12px; font-weight: 800; letter-spacing: .04em; line-height: 16px; color: var(--n); background: rgba(5,8,15,.85); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--n) 55%, transparent); transition: background .09s, color .09s; }
.lf-bar { position: absolute; left: 0; right: 0; top: 15px; height: 52px; display: flex; align-items: center; gap: 8px; padding: 0 12px 0 60px; border-radius: 4px; background: rgba(15,23,42,.5); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); box-shadow: inset 0 0 0 1px rgba(255,255,255,.12), 0 12px 24px -10px color-mix(in srgb, var(--n) 60%, transparent); transition: background .09s, box-shadow .09s; }
.lf-bar::after { content: ""; position: absolute; left: 6px; right: 6px; bottom: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--n) 30%, var(--n) 70%, transparent); box-shadow: 0 0 10px var(--n); }
.lf-bp { position: absolute; left: 4px; bottom: 5px; width: 50px; height: 68px; z-index: 2; background-repeat: no-repeat; -webkit-mask-image: linear-gradient(#000 82%, transparent); mask-image: linear-gradient(#000 82%, transparent); }
/* 빈 사진 칸: 흉상과 같은 자리 · 크기. 불투명하게 칠해 뒤 판 테두리를 가리고 아래는 판 속으로 흐려져 네모 두 개로 겹쳐 보이지 않게 */
.lf-ph { position: absolute; left: 4px; bottom: 5px; width: 50px; height: 68px; z-index: 2; background: linear-gradient(180deg, #2c3749, #222c3e 70%); box-shadow: inset 0 1px 0 rgba(148,163,184,.3); -webkit-mask-image: linear-gradient(#000 82%, transparent); mask-image: linear-gradient(#000 82%, transparent); transition: background .09s; }
.lf-ph::before { content: ""; position: absolute; left: 50%; top: 44%; width: 30px; height: 33px; transform: translate(-50%, -50%); background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 44'%3E%3Ccircle cx='20' cy='13' r='8.5' fill='%2394a3b8'/%3E%3Cpath d='M4 43C5 31 11.5 25.5 20 25.5S35 31 36 43z' fill='%2394a3b8'/%3E%3C/svg%3E") center / contain no-repeat; opacity: .5; }
.lf-bx { min-width: 0; flex: 1; line-height: 1.25; }
.lf-bx b { display: block; font-size: 15px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lf-bx small { display: block; font-size: 11px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lf-ov { font-size: 29px; font-weight: 700; line-height: 1; color: var(--n); text-shadow: 0 0 12px color-mix(in srgb, var(--n) 60%, transparent); }
.lf-ov.up { color: #34d399; text-shadow: 0 0 12px rgba(52,211,153,.6); }
.lf-tok.empty .lf-bar { background: rgba(10,15,26,.5); box-shadow: inset 0 0 0 1px rgba(148,163,184,.14); }
.lf-tok.empty .lf-bar::after { background: linear-gradient(90deg, transparent, rgba(148,163,184,.3) 30%, rgba(148,163,184,.3) 70%, transparent); box-shadow: none; }
.lf-tok.empty .lf-bx b { color: #9aa4b5; font-weight: 600; }
.lf-tok.empty .lf-bx small { color: #6b7280; }
/* 지정(선수를 누름 · 자리로 선반을 거름): 판이 팀 색(빈 자리는 하늘색)으로 차오르며 떠오르고 살짝 커진다.
   전환 시간은 도착하는 상태의 값이 쓰이므로 지정은 .22s 로 튀어 오르고, 해제는 위 기본값 .09s 로 빨리 돌아가
   다른 자리를 새로 지정할 때 두 개가 동시에 지정된 것처럼 보이지 않는다 */
.lf-tok.picked .lf-k, .lf-tok.want .lf-k { transform: translateY(-7px) scale(1.06); transition: transform .22s cubic-bezier(.3,1.5,.55,1); }
.lf-tok.picked .lf-k::before, .lf-tok.want .lf-k::before { opacity: 1; transition: opacity .22s; }
.lf-tok:is(.picked, .want):not(.empty) .lf-bar { background: linear-gradient(90deg, color-mix(in srgb, var(--n) 55%, #0b1220), color-mix(in srgb, var(--n) 22%, #0b1220)); box-shadow: inset 0 0 0 1px var(--n), 0 18px 30px -10px rgba(0,0,0,.85), 0 8px 26px -8px var(--n); transition: background .22s, box-shadow .22s; }
.lf-tok:is(.picked, .want):not(.empty) .lf-bx small { color: #fff; }
.lf-tok:is(.picked, .want):not(.empty) .lf-ov { color: #fff; text-shadow: 0 0 12px var(--n); }
.lf-tok:is(.picked, .want):not(.empty) .lf-chip { color: #05080f; background: var(--n); transition: background .22s, color .22s; }
.lf-tok.want.empty .lf-bar { background: linear-gradient(90deg, rgba(56,189,248,.38), rgba(56,189,248,.12)); box-shadow: inset 0 0 0 1px #38bdf8, 0 18px 30px -10px rgba(0,0,0,.85), 0 8px 26px -8px #38bdf8; transition: background .22s, box-shadow .22s; }
.lf-tok.want.empty .lf-bar::after { background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
.lf-tok.want.empty .lf-bx b, .lf-tok.want.empty .lf-bx small { color: #e0f2fe; }
.lf-tok.want.empty .lf-ph { background: linear-gradient(180deg, #2b5470, #214259 70%); transition: background .22s; }
.lf-tok.want.empty .lf-ph::before { opacity: .85; }
.lf-tok.ghost .lf-bx small, .lf-row.ghost .nm small { color: #10b981; }
.lf-tok.clash .lf-bx small, .lf-row.clash .nm small, .lf-off { color: #fbbf24 !important; }
.lf-tok.over .lf-bar { background: linear-gradient(90deg, rgba(56,189,248,.38), rgba(56,189,248,.12)); box-shadow: inset 0 0 0 2px #38bdf8, 0 0 18px rgba(56,189,248,.55); } /* 끌어다 놓을 자리: 끌기 카드의 하늘색과 같게 */
.lf-tok.lifted > .lf-in, .lf-row.lifted { opacity: .35; }
/* 끌기 중 맞바꿈 미리보기: 끌고 있는 선수의 원래 자리에 맞바꿀 선수가 들어온 모습(하늘색 = 미리보기). 흐린 원래 모습은 감춘다 */
.lf-tok.swapin > .lf-in { opacity: 0; }
.lf-pv { position: absolute; inset: 0; z-index: 4; pointer-events: none; animation: lfPvIn .24s cubic-bezier(.3,1.4,.55,1) both; }
@keyframes lfPvIn { from { opacity: 0; transform: translateY(-10px) scale(.94); } }
.lf-pv .lf-bp { animation: lfPvFace .3s ease-out both; }
@keyframes lfPvFace { from { transform: translateY(8px); opacity: 0; } }
.lf-pv .lf-chip { color: #05080f; background: var(--n); box-shadow: none; }
.lf-pv .lf-bar { background: linear-gradient(90deg, rgba(56,189,248,.32), rgba(56,189,248,.1)); box-shadow: inset 0 0 0 1px #38bdf8, 0 0 18px -4px #38bdf8; }
.lf-pv .lf-bar::after { background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
.lf-pv .lf-bx small { color: #e0f2fe; }
.lf-pv .lf-ov { color: #fff; text-shadow: 0 0 10px rgba(56,189,248,.8); }
/* 놓기 전 수치 변화: 원래 수치(취소선) → 놓았을 때 수치 · 줄면 노랑, −8 이상 빨강, 오르면 초록 */
.lf-ovx { display: flex; align-items: baseline; gap: 3px; font-family: 'Saira Condensed', sans-serif; font-weight: 700; line-height: 1; white-space: nowrap; }
.lf-ovx s { font-size: 16px; color: #94a3b8; text-decoration-thickness: 2px; }
.lf-ovx i { font-style: normal; font-size: 13px; color: #7dd3fc; }
.lf-ovx em { font-style: normal; font-size: 29px; color: #fff; }
.lf-ovx.up em { color: #34d399; }
.lf-ovx.dn em { color: #fbbf24; }
.lf-ovx.dn2 em { color: #f87171; }
.lf-sil { position: absolute; inset: 0; width: 100%; height: 100%; fill: #26324a; }
.lf-rot { position: absolute; width: 196px; transform: translate(-50%, -50%); background: linear-gradient(180deg, #141d2b, #0b111b); box-shadow: 0 8px 18px rgba(0,0,0,.5), inset 0 2px 0 #cbd5e1; }
.lf-rh { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 12px; font-weight: 700; letter-spacing: .14em; color: #cbd5e1; border-bottom: 1px solid #243044; }
.lf-row { position: relative; display: grid; grid-template-columns: 12px 34px minmax(0,1fr) auto; align-items: end; gap: 8px; height: 46px; padding: 0 10px; border-bottom: 1px solid #1a2333; box-shadow: inset 3px 0 0 var(--n); touch-action: none; user-select: none; cursor: grab; outline: none; }
.lf-row:focus-visible { outline: 2px solid #10b981; outline-offset: -2px; }
.lf-row.empty { cursor: pointer; }
.lf-row .rn { align-self: center; font-size: 13px; color: #8791a3; }
.lf-row .rb { position: relative; display: block; width: 34px; height: 42px; overflow: hidden; background-repeat: no-repeat; }
.lf-row .nm { align-self: center; min-width: 0; font-size: 13px; font-weight: 700; color: #fff; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lf-row .nm small { display: block; font-size: 10px; font-weight: 600; color: #8791a3; }
.lf-row.empty .nm { color: #5b6577; font-weight: 500; }
.lf-row.ghost { background: rgba(16,185,129,.12); }
.lf-row.picked, .lf-row.over { background: rgba(16,185,129,.2); box-shadow: inset 3px 0 0 #10b981, inset 0 0 0 1px #10b981; }
.lf-tok.focus .lf-bar { box-shadow: inset 0 0 0 2px #38bdf8, 0 0 22px rgba(56,189,248,.5); }
.lf-row.focus { background: rgba(56,189,248,.16); box-shadow: inset 3px 0 0 #38bdf8, inset 0 0 0 1px #38bdf8; }
.lf-tok.dim, .lf-row.dim { opacity: .28; }
/* 미리보기(ghost)와 합류 중 밑에 깔린 사본은 무채색 */
.lf-tok.ghost .lf-in, .lf-in.lf-gray { filter: grayscale(1) brightness(.72); opacity: .85; }
.lf-in.lf-color {
  -webkit-mask-image: linear-gradient(to top, #000 44%, transparent 56%); mask-image: linear-gradient(to top, #000 44%, transparent 56%);
  -webkit-mask-size: 100% 300%; mask-size: 100% 300%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  transform-origin: 50% 70%;
  animation: tokFill .8s cubic-bezier(.45,0,.25,1) both, tokDone .42s cubic-bezier(.3,0,.2,1) .8s both;
}
.lf-in.lf-color .lf-bar { animation: tokEdge .5s ease-out .8s both; }
/* 시너지 목록 스크롤: 얇은 캡슐 손잡이, 트랙은 거의 보이지 않게 */
.syn-scroll { overscroll-behavior: contain; }
.syn-scroll::-webkit-scrollbar { width: 6px; }
.syn-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,.035); border-radius: 99px; margin: 4px 0; }
.syn-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(52,211,153,.55), rgba(16,185,129,.35)); border-radius: 99px; border: 1px solid rgba(5,8,15,.6); }
.syn-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, rgba(110,231,183,.85), rgba(52,211,153,.6)); }
@supports not selector(::-webkit-scrollbar) { .syn-scroll { scrollbar-width: thin; scrollbar-color: rgba(52,211,153,.5) transparent; } }
/* 팝업(드래프트 규칙 · 전체 시너지) 스크롤: 더 얇게 · 트랙 없이 · 판의 초록 선과 같은 색 */
.pop-scroll { overscroll-behavior: contain; }
.pop-scroll::-webkit-scrollbar { width: 3px; }
.pop-scroll::-webkit-scrollbar-track { background: transparent; margin: 6px 0; }
.pop-scroll::-webkit-scrollbar-thumb { background: rgba(16,185,129,.45); border-radius: 99px; }
.pop-scroll::-webkit-scrollbar-thumb:hover { background: rgba(52,211,153,.8); }
@supports not selector(::-webkit-scrollbar) { .pop-scroll { scrollbar-width: thin; scrollbar-color: rgba(16,185,129,.45) transparent; } }
/* 드래프트 규칙 팝업: 큰 탭 카드 3×2 · 질문형 구역(제목 아래 한 줄 답) · 열면 초록 마름모와 세로선 */
.rl-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.rl-tabs button { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 9px 10px; font-size: 13px; font-weight: 700; color: #cbd5e1; white-space: nowrap; background: rgba(255,255,255,.04); clip-path: polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px); transition: background .15s, color .15s; }
.rl-tabs button:hover { color: #fff; background: rgba(255,255,255,.08); }
.rl-tabs button:focus-visible { outline: 2px solid #38bdf8; outline-offset: -2px; }
.rl-tabs svg { width: 18px; height: 18px; flex: none; fill: none; stroke: #6b7280; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.rl-tabs button.on { color: #fff; background: linear-gradient(135deg, rgba(16,185,129,.25), rgba(16,185,129,.08)); box-shadow: inset 0 -2px 0 #10b981; }
.rl-tabs button.on svg { stroke: #34d399; }
@media (max-width: 420px) { .rl-tabs { gap: 5px; } .rl-tabs button { gap: 5px; padding: 8px 7px; font-size: 12px; } .rl-tabs svg { width: 16px; height: 16px; } }
.rl-lead { margin: 0 0 12px; padding: 10px 12px; font-size: 13.5px; line-height: 1.65; color: #e5e7eb; background: rgba(16,185,129,.07); box-shadow: inset 2px 0 0 #10b981; }
.rl-lead b, .rl-bd b { color: #fff; font-weight: 700; }
.rl-grp + .rl-grp { border-top: 1px solid rgba(255,255,255,.06); }
.rl-hd { display: flex; align-items: flex-start; gap: 10px; width: 100%; padding: 11px 0; text-align: left; }
.rl-hd::before { content: ""; flex: none; width: 6px; height: 6px; margin-top: 8px; background: #374151; transform: rotate(45deg); transition: background .2s; }
.rl-hd:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }
.rl-grp.open .rl-hd::before { background: #10b981; box-shadow: 0 0 8px #10b981; }
.rl-tx { flex: 1; min-width: 0; }
.rl-t { display: block; font-size: 14px; font-weight: 700; color: #fff; }
.rl-sm { display: block; margin-top: 1px; font-size: 12.5px; color: #9ca3af; }
.rl-grp.open .rl-sm { color: #6ee7b7; }
.rl-chev { flex: none; width: 16px; height: 16px; margin-top: 3px; fill: none; stroke: #6b7280; stroke-width: 1.8; transition: transform .2s; }
.rl-grp.open .rl-chev { transform: rotate(180deg); stroke: #10b981; }
.rl-bd { margin: 0 0 14px 3px; padding: 2px 0 2px 15px; border-left: 1px solid rgba(16,185,129,.3); font-size: 13px; line-height: 1.7; color: #d1d5db; animation: fade .18s ease-out both; }
.rl-bd p { margin: 0 0 8px; }
.rl-bd > :last-child { margin-bottom: 0; }
.rl-bd em { font-style: normal; font-weight: 600; color: #6ee7b7; }
.rl-tag { display: inline-block; padding: 0 6px; font-size: 12px; font-weight: 600; line-height: 1.6; color: #fcd34d; background: rgba(251,191,36,.1); box-shadow: inset 0 0 0 1px rgba(251,191,36,.3); }
.rl-chip { display: inline-block; padding: 1px 8px; font-size: 12px; font-weight: 600; line-height: 1.6; color: #e5e7eb; background: rgba(255,255,255,.06); box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }
.rl-chip.g { color: #bbf7d0; background: rgba(16,185,129,.12); box-shadow: inset 0 0 0 1px rgba(16,185,129,.35); }
.rl-tip { display: flex; gap: 8px; margin: 10px 0 2px; padding: 7px 10px; font-size: 12.5px; line-height: 1.6; color: #bae6fd; background: rgba(56,189,248,.07); }
.rl-tip::before { content: "TIP"; flex: none; padding-top: 1px; font-family: 'Saira Condensed', sans-serif; font-size: 12px; font-weight: 800; letter-spacing: .06em; color: #38bdf8; }
.rl-slots { display: grid; gap: 6px; margin: 4px 0 10px; }
.rl-slots > div { display: grid; grid-template-columns: 58px minmax(0, 1fr); align-items: center; gap: 8px; }
.rl-slots > div > span:first-child { font-size: 12px; font-weight: 700; color: #9ca3af; }
.rl-slots i { margin-left: 3px; font-style: normal; font-family: 'Saira Condensed', sans-serif; color: #10b981; }
.rl-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.rl-steps { display: grid; gap: 6px; margin: 4px 0 8px; counter-reset: rl; }
.rl-steps > div { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 8px; align-items: start; }
.rl-steps > div::before { counter-increment: rl; content: counter(rl); display: grid; place-items: center; width: 22px; height: 22px; margin-top: 1px; font-family: 'Saira Condensed', sans-serif; font-size: 13px; font-weight: 800; color: #04150e; background: #10b981; clip-path: polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px); }
.rl-yn { display: grid; gap: 4px; margin: 4px 0 8px; }
.rl-yn > div { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 6px; }
.rl-yn > div::before { font-weight: 800; text-align: center; }
.rl-yn .y::before { content: "✓"; color: #34d399; }
.rl-yn .n::before { content: "✕"; color: #f87171; }
.rl-tbl { display: grid; grid-template-columns: auto auto minmax(0, 1fr); margin: 4px 0 8px; font-size: 12.5px; background: rgba(255,255,255,.03); }
.rl-tbl > span { padding: 5px 10px; border-top: 1px solid rgba(255,255,255,.05); }
.rl-tbl > span.h { border-top: 0; font-size: 11px; font-weight: 700; color: #6b7280; background: rgba(255,255,255,.03); }
.rl-tbl .n { font-family: 'Saira Condensed', sans-serif; font-size: 15px; font-weight: 700; color: #fff; text-align: right; }
.rl-tbl .up { color: #fca5a5; }
.rl-tbl .dn { color: #6ee7b7; }
.rl-ladder { display: grid; gap: 5px; margin: 4px 0 8px; }
.rl-ladder > div { display: grid; grid-template-columns: 34px 56px minmax(0, 1fr); align-items: center; gap: 8px; font-size: 12.5px; line-height: 1.45; }
.rl-ladder b { font-family: 'Saira Condensed', sans-serif; font-size: 16px; font-weight: 800; text-align: right; }
.rl-ladder i { display: block; height: 6px; background: rgba(255,255,255,.06); }
.rl-ladder i::after { content: ""; display: block; height: 100%; width: var(--w); background: var(--k); }
.rl-tiers { display: flex; gap: 4px; margin: 6px 0 8px; }
.rl-tiers > span { flex: 1; min-width: 0; padding: 5px 4px; text-align: center; font-size: 12px; line-height: 1.35; color: #d1d5db; background: rgba(255,255,255,.04); box-shadow: inset 0 2px 0 rgba(16,185,129,.35); }
.rl-tiers > span b { display: block; font-family: 'Saira Condensed', sans-serif; font-size: 15px; }
.rl-tiers > span:nth-child(2) { box-shadow: inset 0 2px 0 rgba(16,185,129,.65); }
.rl-tiers > span:nth-child(3) { background: rgba(16,185,129,.08); box-shadow: inset 0 2px 0 #10b981; }
.rl-syn { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 6px 0; padding: 7px 10px; background: rgba(255,255,255,.035); }
.rl-syn b { display: block; font-size: 13px; }
.rl-syn small { font-size: 12px; color: #9ca3af; }
.rl-syn em { flex: none; font-size: 12px; }
/* ───── 카드 문법 UI (선수 카드와 같은 언어): 컷 코너 · 네온 HUD 브래킷 · 짙은 네이비 유리 · 스캔라인 ─────
   --a 는 강조색(기본 초록, 구단·등급 색으로 바꿔 쓴다), --c 는 컷 크기 */
.ui-cut { --c: 14px; clip-path: polygon(var(--c) 0,100% 0,100% calc(100% - var(--c)),calc(100% - var(--c)) 100%,0 100%,0 var(--c)); }
.ui-glass { background: rgba(6,10,19,.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
.ui-glass2 { background: rgba(9,14,26,.9); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
/* 프레임: 얇은 외곽선 + 좌상·우하 굵은 브래킷 + 컷 대각선. 자식 위에 얹히는 가상 요소라 내용과 상관없이 붙는다 */
.ui-frame { position: relative; }
.ui-frame::after {
  content: ""; position: absolute; inset: 0; z-index: 7; pointer-events: none;
  background:
    linear-gradient(135deg, transparent calc(50% - 1px), var(--a, #10b981) calc(50% - 1px), var(--a, #10b981) calc(50% + 1px), transparent calc(50% + 1px)) left top / var(--c) var(--c) no-repeat,
    linear-gradient(135deg, transparent calc(50% - 1px), var(--a, #10b981) calc(50% - 1px), var(--a, #10b981) calc(50% + 1px), transparent calc(50% + 1px)) right bottom / var(--c) var(--c) no-repeat,
    linear-gradient(var(--a, #10b981), var(--a, #10b981)) left var(--c) top 0 / 56px 2px no-repeat,
    linear-gradient(var(--a, #10b981), var(--a, #10b981)) left 0 top var(--c) / 2px 30px no-repeat,
    linear-gradient(var(--a, #10b981), var(--a, #10b981)) right var(--c) bottom 0 / 56px 2px no-repeat,
    linear-gradient(var(--a, #10b981), var(--a, #10b981)) right 0 bottom var(--c) / 2px 30px no-repeat;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--a, #10b981) 32%, transparent);
}
.ui-frame.hot::after { box-shadow: inset 0 0 0 2px var(--a, #10b981), inset 0 0 36px color-mix(in srgb, var(--a, #10b981) 30%, transparent); }
.ui-lab { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; letter-spacing: .32em; text-transform: uppercase; color: var(--a, #10b981); }
.ui-lab::before { content: ""; width: 14px; height: 10px; background: currentColor; clip-path: polygon(0 0,60% 0,100% 100%,40% 100%); }
.ui-btn { --c: 9px; position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 44px; padding: 0 20px; font-size: 15px; font-weight: 700; color: #e8ecf2; white-space: nowrap; background: rgba(255,255,255,.06); box-shadow: inset 0 0 0 1px rgba(255,255,255,.22); transition: background .15s, box-shadow .15s, filter .15s; }
.ui-btn:hover:not(:disabled) { background: rgba(255,255,255,.1); box-shadow: inset 0 0 0 1px rgba(255,255,255,.42); }
.ui-btn:focus-visible { outline: none; box-shadow: inset 0 0 0 2px #38bdf8; }
.ui-btn:disabled { opacity: .4; cursor: not-allowed; }
.ui-btn.pri { background: var(--a, #10b981); color: #05080f; box-shadow: none; }
.ui-btn.pri:hover:not(:disabled) { background: var(--a, #10b981); filter: brightness(1.12); box-shadow: none; }
.ui-btn.pri:focus-visible { box-shadow: inset 0 0 0 2px #05080f; }
.ui-btn.sm { --c: 7px; min-height: 32px; padding: 0 12px; font-size: 13px; }
.ui-chip { --c: 6px; display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; font-size: 12px; font-weight: 600; color: #cbd5e1; background: rgba(5,8,15,.6); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--a, #94a3b8) 45%, transparent); }
.ui-seg { display: grid; grid-template-columns: repeat(24, 1fr); gap: 3px; height: 10px; }
.ui-seg i { background: rgba(255,255,255,.07); transform: skewX(-24deg); transition: background .4s, box-shadow .4s; }
.ui-seg i.on { background: var(--a, #10b981); box-shadow: 0 0 8px var(--a, #10b981); }
.ui-scan { background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px); }
/* 화면 배경: 단계마다 Higgsfield 구장 이미지 + 가장자리 암부 + 스캔라인 */
.ui-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; background: #05080f center / cover no-repeat; }
.ui-bg::after { content: ""; position: absolute; inset: 0; background: radial-gradient(120% 90% at 50% 38%, rgba(5,8,15,.4), rgba(5,8,15,.93) 78%), repeating-linear-gradient(0deg, rgba(255,255,255,.022) 0 1px, transparent 1px 3px); }
.ui-bg.soft::after { background: radial-gradient(120% 90% at 50% 40%, rgba(5,8,15,.15), rgba(5,8,15,.8) 80%), repeating-linear-gradient(0deg, rgba(255,255,255,.02) 0 1px, transparent 1px 3px); }
/* 중계 그래픽 묶음 → HUD 판: 컷 코너 유리 판 + 브래킷 프레임 + 왼쪽 위 라벨 */
.bc-grp { --c: 16px; --a: #10b981; position: relative; padding: 30px 10px 10px; background: rgba(6,10,19,.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); clip-path: polygon(var(--c) 0,100% 0,100% calc(100% - var(--c)),calc(100% - var(--c)) 100%,0 100%,0 var(--c)); }
.bc-grp::after {
  content: ""; position: absolute; inset: 0; z-index: 7; pointer-events: none;
  background:
    linear-gradient(135deg, transparent calc(50% - 1px), var(--a) calc(50% - 1px), var(--a) calc(50% + 1px), transparent calc(50% + 1px)) left top / var(--c) var(--c) no-repeat,
    linear-gradient(135deg, transparent calc(50% - 1px), var(--a) calc(50% - 1px), var(--a) calc(50% + 1px), transparent calc(50% + 1px)) right bottom / var(--c) var(--c) no-repeat,
    linear-gradient(var(--a), var(--a)) left var(--c) top 0 / 56px 2px no-repeat,
    linear-gradient(var(--a), var(--a)) left 0 top var(--c) / 2px 30px no-repeat,
    linear-gradient(var(--a), var(--a)) right var(--c) bottom 0 / 56px 2px no-repeat,
    linear-gradient(var(--a), var(--a)) right 0 bottom var(--c) / 2px 30px no-repeat;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--a) 30%, transparent);
}
.bc-label { position: absolute; z-index: 8; left: 20px; top: 8px; display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; letter-spacing: .32em; color: var(--a); }
.bc-label::before { content: ""; width: 14px; height: 10px; background: currentColor; clip-path: polygon(0 0,60% 0,100% 100%,40% 100%); }
/* 시리즈 머리: 뒤에 윤곽선 연도(흐름 안에 두고 오른쪽을 겹쳐 연도 유무·길이에 맞춰 제목이 따라붙음) · 위계 = 팀명 > 설명 태그 > 종류 */
.ser-wm { flex: none; margin: 0 -30px -18px -2px; font-size: 60px; font-weight: 800; line-height: 1; white-space: nowrap; color: transparent; -webkit-text-stroke: 1px color-mix(in srgb, var(--a) 45%, transparent); pointer-events: none; user-select: none; }
.ser-ttl { position: relative; min-width: 0; display: flex; align-items: center; gap: 12px; }
.ser-kind { flex: none; font-size: 11px; font-weight: 700; letter-spacing: .16em; color: var(--a); }
.ser-name { flex: none; margin: 0; padding-bottom: 5px; font-size: 26px; font-weight: 900; line-height: 1; white-space: nowrap; color: #fff; background: linear-gradient(90deg, var(--a), transparent) left bottom / 100% 3px no-repeat; }
.ser-sub { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 2px 14px 2px 9px; font-size: 13px; font-weight: 600; line-height: 1.25; color: #e5e7eb; background: linear-gradient(90deg, color-mix(in srgb, var(--a) 16%, transparent), transparent 92%); box-shadow: inset 2px 0 0 var(--a); clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%); }
/* 선반 보기 스위치: 켜면 영입 가능한 선수만 */
.ser-sw { display: inline-flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 600; color: #cbd5e1; }
.ser-sw .tr { position: relative; width: 34px; height: 18px; border-radius: 9px; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); transition: background-color .2s, box-shadow .2s; }
.ser-sw .tr::after { content: ""; position: absolute; left: 3px; top: 3px; width: 12px; height: 12px; border-radius: 50%; background: #9ca3af; transition: transform .2s, background-color .2s; }
.ser-sw:hover { color: #fff; }
.ser-sw[aria-pressed="true"] { color: #fff; }
.ser-sw[aria-pressed="true"] .tr { background: color-mix(in srgb, var(--a) 35%, transparent); box-shadow: inset 0 0 0 1px var(--a); }
.ser-sw[aria-pressed="true"] .tr::after { transform: translateX(16px); background: var(--a); }
/* 새로고침: 네온 테두리 텍스트 버튼 “새로고침 · N회” */
.ser-refresh { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px; font-size: 13px; font-weight: 700; white-space: nowrap; color: var(--a); background: color-mix(in srgb, var(--a) 8%, transparent); box-shadow: inset 0 0 0 1px var(--a); transition: background-color .15s; }
.ser-refresh em { font-style: normal; font-weight: 600; color: #cbd5e1; }
.ser-refresh svg { width: 16px; height: 16px; transition: transform .45s cubic-bezier(.3,0,.2,1); }
.ser-refresh:hover:not(:disabled) { background: color-mix(in srgb, var(--a) 18%, transparent); }
.ser-refresh:hover:not(:disabled) svg { transform: rotate(200deg); }
.ser-refresh:disabled { opacity: .4; cursor: not-allowed; }
.ser-sw:focus-visible, .ser-refresh:focus-visible { outline: 2px solid var(--a); outline-offset: 2px; }
/* 빈 자리 포지션 거르기 칩 (누르면 해제) */
.ser-pf { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px; font-size: 13px; font-weight: 700; white-space: nowrap; color: #bae6fd; background: rgba(12,34,51,.85); box-shadow: inset 0 0 0 1px #38bdf8; transition: background-color .15s; }
.ser-pf:hover { background: rgba(17,48,74,.95); }
.ser-pf span { font-size: 11px; color: #7dd3fc; }
.ser-pf:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }
/* 선반 카드 (MiniCard) — 단위는 카드 폭 기준 cqw */
.mc-in { position: absolute; inset: 0; }
/* 자리 거르기로 선반에서 빠지는 카드: 살짝 가라앉으며 사라짐 (남는 카드는 선반을 다시 그려 rise 로 차례로 떠오름) */
@keyframes mcLeave { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(10px) scale(.9); } }
.mc.mc-leave { pointer-events: none; animation: mcLeave .18s ease-in both; }
.mc-sh { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,8,15,.62) 0, rgba(5,8,15,0) 26%, rgba(5,8,15,0) 44%, rgba(5,8,15,.88) 70%, #05080f 100%); }
.mc-tb { position: absolute; left: 8cqw; right: 2.5cqw; top: 2.5cqw; height: 2cqw; background: rgba(255,255,255,.55); }
.mc.t75 .mc-tb { background: #34d399; box-shadow: 0 0 4px rgba(52,211,153,.7); }
.mc.t90 .mc-tb { background: linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc) 0 50% / 200% 100%; animation: prism 3s linear infinite; box-shadow: 0 0 5px rgba(125,211,252,.7); }
.mc-ov { position: absolute; left: 7cqw; top: 7.5cqw; font-size: 33cqw; font-weight: 800; line-height: .85; color: #f3f4f6; text-shadow: 0 0 2px #000, 0 2px 8px #000; }
.mc.t75 .mc-ov { color: #34d399; text-shadow: 0 0 2px #000, 0 2px 8px #000, 0 0 12px rgba(52,211,153,.4); }
.mc.t90 .mc-ov { background: linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc) 0 50% / 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: none; filter: drop-shadow(0 0 1px #000) drop-shadow(0 2px 5px #000); animation: prism 3s linear infinite; }
.mc-pos { position: absolute; left: 7cqw; right: 6cqw; bottom: 34cqw; display: flex; align-items: center; gap: 2.5cqw; line-height: 1; white-space: nowrap; overflow: hidden; }
.mc-pos em { flex: none; padding: 1cqw 2.2cqw; font-style: normal; font-size: 9.5cqw; font-weight: 800; color: #05080f; background: var(--n); }
.mc-pos span { min-width: 0; overflow: hidden; font-size: 9.5cqw; font-weight: 500; letter-spacing: .07em; color: #e5e7eb; } /* 가는 획 + 넓은 자간 — 작은 크기에서도 뭉치지 않게 */
.mc-rule { position: absolute; left: 7cqw; right: 8cqw; bottom: 30.5cqw; height: 1px; background: linear-gradient(90deg, var(--n), color-mix(in srgb, var(--n) 20%, transparent)); }
.mc-nm { position: absolute; left: 7cqw; right: 31cqw; bottom: 7cqw; font-size: 20.5cqw; font-weight: 800; line-height: 1.05; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -.02em; text-shadow: 0 1px 4px #000; }
.mc-cp { position: absolute; right: 8cqw; bottom: 8cqw; text-align: right; line-height: .9; }
.mc-cp small { display: block; font-size: 7cqw; font-weight: 700; letter-spacing: .08em; color: #9ca3af; }
.mc-cp b { display: block; font-size: 18cqw; font-weight: 800; letter-spacing: -.02em; color: var(--n); text-shadow: 0 0 8px color-mix(in srgb, var(--n) 55%, transparent); }
.mc.c3 .mc-cp b { font-size: 14.5cqw; } /* 세 자리 코스트는 이름 칸을 침범하지 않게 */
.mc:not(.c3) .mc-nm { right: 27cqw; } /* 두 자리 코스트면 이름 칸을 조금 더 넓게 */
/* 긴 이름(외국인 등)은 글자 수만큼 줄여 한 줄에 다 보이게 */
.mc-nm.l4 { font-size: 16.5cqw; }
.mc-nm.l5 { font-size: 13cqw; }
.mc-nm.l6 { font-size: 11cqw; }
.mc.lock .mc-in { filter: grayscale(1) brightness(.55); }
.mc.lock .mc-ov, .mc.lock .mc-tb { animation: none; }
.mc-lk { position: absolute; z-index: 6; left: 6cqw; right: 6cqw; top: 58cqw; display: flex; align-items: center; justify-content: center; gap: 2cqw; padding: 3.5cqw 1cqw; font-size: 10.5cqw; font-weight: 800; line-height: 1; color: #f9fafb; background: rgba(5,8,15,.9); box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.75), 0 2px 10px rgba(0,0,0,.7); }
.mc-lk svg { width: 10cqw; height: 10cqw; flex: none; }
.mc-lk span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 시너지 칸 (선반 카드 오른쪽 위) */
@keyframes mcPip { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
.mc-syn { position: absolute; z-index: 5; right: 5cqw; top: 7cqw; display: flex; align-items: center; gap: 1.2cqw; padding: 2cqw 2.4cqw; line-height: 1; background: rgba(5,8,15,.8); box-shadow: inset 0 0 0 1px rgba(52,211,153,.55); }
.mc-syn svg { width: 8cqw; height: 8cqw; margin-right: .6cqw; color: #6ee7b7; }
.mc-syn i { width: 3.2cqw; height: 5.5cqw; background: rgba(255,255,255,.25); transform: skewX(-12deg); }
.mc-syn i.on { background: #e5e7eb; }
.mc-syn i.max { background: #10b981; }
.mc-syn i.nx { background: #38bdf8; animation: mcPip 1.2s ease-in-out infinite; }
.mc-syn em { margin-left: .6cqw; font-style: normal; font-size: 7.5cqw; font-weight: 800; color: #7dd3fc; }
/* 상단 샐러리 캡: PICK 선수를 영입하면 깎일 칸 */
@keyframes capBlink { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
.ui-seg i.spend { background: #fbbf24; box-shadow: 0 0 8px #fbbf24; animation: capBlink 1.2s ease-in-out infinite; }
/* PICK 카드 (PlayerCard) — 막대 그래프 판. 단위는 카드 폭 기준 cqw */
.pk { container-type: inline-size; background: #05080f; clip-path: polygon(7% 0,100% 0,100% 95.3%,93% 100%,0 100%,0 4.7%); }
.pk-body, .pk-in { position: absolute; inset: 0; }
.pk-in { overflow: hidden; }
.pk-art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 60% 20%; transition: transform .5s; }
.pk:hover .pk-art { transform: scale(1.04); }
.pk-sh { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,8,15,.55) 0, rgba(5,8,15,0) 24%, rgba(5,8,15,0) 44%, rgba(5,8,15,.9) 70%, #05080f 100%), linear-gradient(90deg, rgba(5,8,15,.5) 0, rgba(5,8,15,0) 50%); }
.pk-fr { position: absolute; inset: 1.6cqw; border: 1px solid color-mix(in srgb, var(--n) 45%, transparent); pointer-events: none; }
.pk-tb { position: absolute; left: 6cqw; right: 1.6cqw; top: 1.6cqw; height: 1.3cqw; background: rgba(255,255,255,.55); }
.pk.t75 .pk-tb { background: #34d399; box-shadow: 0 0 5px rgba(52,211,153,.7); }
.pk.t90 .pk-tb { background: linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc) 0 50% / 200% 100%; animation: prism 3s linear infinite; }
.pk-ov { position: absolute; left: 6cqw; top: 6cqw; font-size: 24cqw; font-weight: 800; line-height: .85; color: #f3f4f6; text-shadow: 0 0 2px #000, 0 2px 10px #000; }
.pk.t75 .pk-ov { color: #34d399; }
.pk.t90 .pk-ov { background: linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc) 0 50% / 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: none; filter: drop-shadow(0 0 1px #000) drop-shadow(0 2px 6px #000); animation: prism 3s linear infinite; }
.pk-ov em { margin-left: 1cqw; font-style: normal; font-size: .32em; vertical-align: top; -webkit-text-fill-color: currentColor; }
.pk-ov em.dn, .pk-st dd em.dn { color: #fbbf24; }
.pk-ov em.up { color: #34d399; }
.pk-meta { position: absolute; left: 6.5cqw; top: 28cqw; font-size: 4.2cqw; font-weight: 600; letter-spacing: .08em; color: rgba(255,255,255,.75); white-space: nowrap; text-shadow: 0 1px 4px #000; }
.pk-stats { position: absolute; left: 5cqw; top: 35cqw; width: 42cqw; margin: 0; padding: 2.4cqw 3cqw 1cqw; background: rgba(5,8,15,.66); backdrop-filter: blur(3px); }
.pk-st { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; padding-bottom: 1.6cqw; }
.pk-st dt { font-size: 4cqw; font-weight: 600; color: #cbd5e1; }
.pk-st dd { margin: 0; font-size: 6cqw; font-weight: 700; line-height: 1; color: #f3f4f6; }
.pk-st dd.hi { color: var(--n); }
.pk-st dd em { margin-left: .8cqw; font-style: normal; font-size: .62em; }
.pk-st dd em.up { color: #34d399; }
.pk-bar { display: block; flex-basis: 100%; height: 1.2cqw; margin-top: .8cqw; background: rgba(255,255,255,.12); }
.pk-bar b { display: block; height: 100%; background: var(--n); box-shadow: 0 0 4px color-mix(in srgb, var(--n) 60%, transparent); }
.pk .mc-syn { right: 4cqw; top: 5cqw; gap: .8cqw; padding: 1.4cqw 1.8cqw; }
.pk .mc-syn svg { width: 5cqw; height: 5cqw; margin-right: .4cqw; }
.pk .mc-syn i { width: 2cqw; height: 3.6cqw; }
.pk .mc-syn em { font-size: 3.6cqw; }
.mc-syn b { margin-left: 1cqw; font-size: 3.6cqw; font-weight: 700; color: #a7f3d0; white-space: nowrap; }
.pk-chips { position: absolute; left: 6cqw; right: 6cqw; bottom: 50cqw; display: flex; flex-wrap: wrap; gap: 1.2cqw; }
.pk-chips span { padding: .8cqw 2cqw; font-size: 3.4cqw; font-weight: 700; line-height: 1.1; background: rgba(5,8,15,.72); }
.pk-chips .sy { color: #a7f3d0; box-shadow: inset 0 0 0 1px rgba(52,211,153,.55); }
.pk-chips .off { color: #fde68a; box-shadow: inset 0 0 0 1px rgba(251,191,36,.55); }
.pk-note { position: absolute; left: 6cqw; right: 6cqw; bottom: 43cqw; font-size: 4cqw; font-weight: 500; color: #d1d5db; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 4px #000; }
.pk-pos { position: absolute; left: 6cqw; right: 6cqw; bottom: 35.5cqw; display: flex; align-items: center; gap: 1.8cqw; line-height: 1; white-space: nowrap; }
.pk-pos em { flex: none; padding: .8cqw 1.6cqw; font-style: normal; font-size: 4.4cqw; font-weight: 800; color: #05080f; background: var(--n); }
.pk-pos > span:not(.tg) { min-width: 0; overflow: hidden; font-size: 4.6cqw; font-weight: 500; letter-spacing: .07em; color: #e5e7eb; }
.pk-pos .tg { margin-left: auto; display: flex; gap: 1cqw; }
.pk-pos .tg b { padding: .7cqw 1.6cqw; font-family: 'IBM Plex Sans KR', system-ui, sans-serif; font-size: 3.6cqw; font-weight: 700; color: #fff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.45); }
.pk-rule { position: absolute; left: 6cqw; right: 6cqw; bottom: 32.5cqw; height: 1px; background: linear-gradient(90deg, var(--n), color-mix(in srgb, var(--n) 15%, transparent)); }
.pk-nm { position: absolute; left: 6cqw; right: 25cqw; bottom: 7cqw; font-size: 14cqw; font-weight: 800; line-height: 1.05; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -.02em; text-shadow: 0 2px 8px #000; }
.pk-nm.l5 { font-size: 11cqw; }
.pk-cp { position: absolute; right: 6cqw; bottom: 7.5cqw; text-align: right; line-height: .9; }
.pk-cp small { display: block; font-size: 3.8cqw; font-weight: 700; letter-spacing: .1em; color: #9ca3af; }
.pk-cp b { display: block; font-size: 12cqw; font-weight: 800; color: var(--n); text-shadow: 0 0 10px color-mix(in srgb, var(--n) 55%, transparent); }
.pk-slot { position: absolute; right: 6cqw; bottom: 9cqw; padding: 1.2cqw 2.6cqw; font-size: 4.4cqw; font-weight: 800; line-height: 1; color: #05080f; background: var(--n); clip-path: polygon(1.6cqw 0,100% 0,100% calc(100% - 1.6cqw),calc(100% - 1.6cqw) 100%,0 100%,0 1.6cqw); }
.pk.lock .pk-in { filter: grayscale(1) brightness(.55); }
.pk.lock .pk-ov, .pk.lock .pk-tb { animation: none; }
.pk-lk { position: absolute; z-index: 6; left: 10cqw; right: 10cqw; top: 64cqw; display: flex; align-items: center; justify-content: center; gap: 2cqw; padding: 3cqw 1cqw; font-size: 5.6cqw; font-weight: 800; line-height: 1; color: #f9fafb; white-space: nowrap; background: rgba(5,8,15,.9); box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.75), 0 4px 16px rgba(0,0,0,.7); }
.pk-lk svg { width: 5.5cqw; height: 5.5cqw; flex: none; }
/* PICK 카드 무대 · 뒤집기 (반쪽 0.22초, 옆면일 때 4% 들어 올림) */
.pk-stage { position: relative; perspective: 1000px; }
.pk-face { position: absolute; inset: 0; backface-visibility: hidden; }
.pk-face > * { width: 100%; }
@keyframes pkFlipIn { 0%, 50% { transform: rotateY(-90deg) scale(1.04); } 100% { transform: rotateY(0) scale(1); } }
@keyframes pkFlipOut { 0% { transform: rotateY(0) scale(1); } 50%, 100% { transform: rotateY(90deg) scale(1.04); } }
/* 빈 칸(뒷면)도 카드끼리 넘어갈 때와 같은 방향으로 돈다: 나갈 때는 +90°까지, 들어올 때는 −90°에서 — 방향이 반대면 반쯤 돌다 되돌아가는 느낌이 난다 */
@keyframes pkBackAway { from { transform: rotateY(0) scale(1); } to { transform: rotateY(90deg) scale(1.04); } }
@keyframes pkBackReturn { from { transform: rotateY(-90deg) scale(1.04); } to { transform: rotateY(0) scale(1); } }
.pkf-in { animation: pkFlipIn .44s ease-in-out both; } /* pk-in 은 PlayerCard 안쪽 층 이름이라 겹치지 않게 pkf- */
.pkf-out { pointer-events: none; }
.pkf-out.flip { animation: pkFlipOut .44s ease-in-out both; }
.pkf-out.sign { animation: pickSign .35s ease-in both; }
.pk-back.away { animation: pkBackAway .22s ease-in-out both; }
.pk-back.hidden { visibility: hidden; transform: rotateY(90deg); }
.pk-back.return { animation: pkBackReturn .22s ease-in-out .22s both; }
/* 빈 PICK 구역: 카드 모양 스켈레톤 + 버튼 자리 빈 틀 */
.pk-empty { --n: #64748b; position: relative; container-type: inline-size; background: conic-gradient(from var(--pkr), transparent 0 75%, rgba(52,211,153,.9) 88%, transparent 100%); clip-path: polygon(7% 0,100% 0,100% 95.3%,93% 100%,0 100%,0 4.7%); animation: pkRing 4.5s linear infinite; }
.pk-empty::before { content: ""; position: absolute; inset: 1.5px; clip-path: polygon(7% 0,100% 0,100% 95.3%,93% 100%,0 100%,0 4.7%); background: linear-gradient(180deg, #0a1120, #070c16); } /* 카드 면: 둘레 1.5px 만 남겨 빛이 잘린 모서리까지 따라 돎 */
.pk-sk { position: absolute; background: rgba(148,163,184,.09); }
.pk-ghostbtn { flex: none; height: 44px; background: rgba(255,255,255,.03); box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); clip-path: polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px); animation: pkBtnBreath 2.4s ease-in-out 1.6s infinite; }
/* 빈 PICK 대기 움직임: 스켈레톤 블록이 위(종합)→아래(이름·CP) 차례로 밝아졌다 가라앉고(끝에 버튼 틀이 초록으로 살짝),
   카드 둘레를 초록 빛 한 점이 4.5초에 한 바퀴 돈다(.pk-empty 배경의 회전 빛 + 1.5px 안쪽 카드 면) — 카드 크기 · 2:3 비율은 그대로 */
@property --pkr { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
.pk-sk { animation: pkSkBreath 2.4s ease-in-out infinite; animation-delay: calc(var(--i) * .09s); }
.pk-back.hidden .pk-empty, .pk-back.hidden .pk-sk { animation-play-state: paused; }
@keyframes pkRing { to { --pkr: 360deg; } }
@keyframes pkSkBreath { 0%, 100% { filter: brightness(1); } 30% { filter: brightness(2.1); } }
@keyframes pkBtnBreath { 0%, 100% { box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); } 30% { box-shadow: inset 0 0 0 1px rgba(110,231,183,.35); } }
/* PICK 영입 버튼: 이름·코스트는 카드에 있으니 “+ 영입하기”만 */
.pk-go { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 44px; padding: 0 12px; font-size: 15px; font-weight: 800; color: #04150e; background: #10b981; clip-path: polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px); transition: filter .15s; }
.pk-go:hover:not(:disabled) { filter: brightness(1.1); }
/* 내 라인업 선수 방출: 같은 버튼 틀을 붉은 테두리로, 한 번 누르면 붉게 채워져 확정 대기 */
.pk-go.out { color: #fecaca; background: rgba(239,68,68,.14); box-shadow: inset 0 0 0 1.5px rgba(248,113,113,.7); }
.pk-go.out.confirm { color: #fff; background: #ef4444; box-shadow: none; }
.pk-go:focus-visible { outline: none; box-shadow: inset 0 0 0 2px #05080f; }
.pk-go:disabled { color: #d1d5db; background: #1f2937; box-shadow: inset 0 0 0 1px rgba(255,255,255,.28); cursor: not-allowed; }
.pk-go.swap { color: #1f1302; background: #fbbf24; }
.pk-go svg { width: 17px; height: 17px; flex: none; }
.pk-go span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 증강 카드: 올리거나 포커스하면 테두리가 차오르고 선택 버튼이 등급 색으로 */
.ui-choice:hover::after, .ui-choice:focus-within::after { box-shadow: inset 0 0 0 2px var(--a), inset 0 0 40px color-mix(in srgb, var(--a) 32%, transparent); }
.ui-choice:hover .ui-btn, .ui-choice:focus-within .ui-btn { background: var(--a); color: #05080f; box-shadow: none; }
/* 구장 위 시너지 도크: 오른쪽 그늘 위에 줄 목록 */
.syn-dock { position: absolute; z-index: 6; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; padding: 12px 14px 10px 52px; background: linear-gradient(90deg, rgba(5,8,15,0) 0, rgba(5,8,15,.82) 24%, rgba(5,8,15,.92) 100%); }
.dock-row { display: block; width: 100%; text-align: left; padding: 8px 6px 8px 12px; border-bottom: 1px solid rgba(255,255,255,.07); background: none; }
.dock-row:hover { background: rgba(255,255,255,.03); }
.dock-row.on { background: linear-gradient(90deg, rgba(16,185,129,.16), transparent); box-shadow: inset 2px 0 0 #10b981; }
.dock-row.open { background: rgba(56,189,248,.07); box-shadow: inset 2px 0 0 #38bdf8; }
.dock-row.on.open { background: linear-gradient(90deg, rgba(16,185,129,.16), rgba(56,189,248,.06)); box-shadow: inset 2px 0 0 #10b981; }
.dock-row:focus-visible { outline: 2px solid #38bdf8; outline-offset: -2px; }
.lf-row .ov { align-self: center; font-size: 20px; font-weight: 700; color: var(--n); }
/* 끌기 카드(body 포털): 토큰과 같은 판을 반투명 + 하늘색 브래킷으로. 커서는 흉상 가슴께, 크기는 필드 배율에 맞춘 뒤 조금 작게(×0.92)
   판 위 칩이 “SS ››› 2B” 로 놓을 자리까지 이어진다 — 셰브론이 차례로 흐르고 놓을 자리 칩이 톡 튀어나옴, 사람이 있으면 양쪽 셰브론(맞바꿈) */
.lf-drag { position: fixed; z-index: 60; left: 0; top: 0; width: 214px; height: 72px; pointer-events: none; transform-origin: 0 0; transform: scale(calc(var(--k, 1) * .92)) translate(-30px, -44px); filter: drop-shadow(0 14px 18px rgba(0,0,0,.7)); }
.lf-drag .lf-bar { background: rgba(15,23,42,.62); box-shadow: inset 0 0 0 1px rgba(56,189,248,.7); }
.lf-drag .lf-bar::after { background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
.lf-drag .lf-ov, .lf-drag .lf-ov.up { color: #fff; text-shadow: 0 0 10px rgba(56,189,248,.8); }
.lf-drag::after { content: ""; position: absolute; left: -7px; right: -7px; top: -5px; bottom: -3px;
  background: linear-gradient(#38bdf8, #38bdf8) 0 0 / 14px 2px no-repeat, linear-gradient(#38bdf8, #38bdf8) 0 0 / 2px 14px no-repeat, linear-gradient(#38bdf8, #38bdf8) 100% 0 / 14px 2px no-repeat, linear-gradient(#38bdf8, #38bdf8) 100% 0 / 2px 14px no-repeat,
    linear-gradient(#38bdf8, #38bdf8) 0 100% / 14px 2px no-repeat, linear-gradient(#38bdf8, #38bdf8) 0 100% / 2px 14px no-repeat, linear-gradient(#38bdf8, #38bdf8) 100% 100% / 14px 2px no-repeat, linear-gradient(#38bdf8, #38bdf8) 100% 100% / 2px 14px no-repeat; }
.lf-route { position: absolute; left: 58px; top: 0; z-index: 3; display: flex; align-items: center; gap: 4px; font-family: 'Saira Condensed', sans-serif; font-size: 12px; font-weight: 800; letter-spacing: .04em; line-height: 16px; white-space: nowrap; }
.lf-route .a, .lf-route .b { padding: 0 7px; }
.lf-route .a { color: var(--n); background: rgba(5,8,15,.88); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--n) 60%, transparent); }
.lf-route .a.on { color: #05080f; background: var(--n); box-shadow: none; }
.lf-route .fl { display: inline-flex; gap: 1px; }
.lf-route .fl i { width: 6px; height: 10px; background: #38bdf8; opacity: .2; animation: dgFlow .9s linear infinite; clip-path: polygon(0 0, 45% 0, 100% 50%, 45% 100%, 0 100%, 55% 50%); }
.lf-route .fl.sw i:first-child { clip-path: polygon(100% 0, 55% 0, 0 50%, 55% 100%, 100% 100%, 45% 50%); }
.lf-route .fl i:nth-child(2) { animation-delay: .15s; }
.lf-route .fl i:nth-child(3) { animation-delay: .3s; }
@keyframes dgFlow { 25% { opacity: 1; filter: drop-shadow(0 0 3px #38bdf8); } 55% { opacity: .2; } }
.lf-route .b { color: #05080f; background: #38bdf8; box-shadow: 0 0 12px rgba(56,189,248,.65); animation: dgPop .24s cubic-bezier(.3,1.6,.55,1) both; }
@keyframes dgPop { from { transform: scale(.5); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
`;

const TIER = {
  silver: { border: 'border-slate-300/70', text: 'text-slate-200', glow: 'shadow-[0_0_28px_-10px_rgba(203,213,225,0.7)]', chip: 'border-slate-300/40 bg-slate-300/10 text-slate-200', bar: 'bg-slate-300' },
  gold: { border: 'border-amber-400', text: 'text-amber-300', glow: 'shadow-[0_0_36px_-8px_rgba(251,191,36,0.6)]', chip: 'border-amber-400/50 bg-amber-400/10 text-amber-300', bar: 'bg-amber-400' },
  prismatic: { border: 'border-transparent', text: 'text-fuchsia-200', glow: 'shadow-[0_0_44px_-8px_rgba(232,121,249,0.6)]', chip: 'border-fuchsia-300/50 bg-fuchsia-400/10 text-fuchsia-200', bar: 'bg-gradient-to-b from-fuchsia-400 via-sky-300 to-emerald-400' },
};

/* 카드 문법 UI의 등급 네온: 실버 · 골드 · 프리즘 */
const TIER_NEON = { silver: '#cbd5e1', gold: '#fbbf24', prismatic: '#e879f9' };
const TIER_EN = { silver: 'SILVER', gold: 'GOLD', prismatic: 'PRISM' };

/** 등급 테두리. 프리즘은 흐르는 그라데이션 2px 링 */
function TierFrame({ tier, className = '', innerClassName = '', style, children }) {
  if (tier === 'prismatic') {
    return (
      <div className={`rounded-xl ${TIER.prismatic.glow} ${className}`} style={style}>
        <div className="h-full rounded-xl p-[2px]"
          style={{ backgroundImage: 'linear-gradient(90deg,#e879f9,#7dd3fc,#34d399,#e879f9)', backgroundSize: '200% 100%', animation: 'prism 4s linear infinite' }}>
          <div className={`h-full rounded-[10px] bg-[#111827] ${innerClassName}`}>{children}</div>
        </div>
      </div>
    );
  }
  return <div style={style} className={`rounded-xl border-2 bg-[#111827] ${TIER[tier].border} ${TIER[tier].glow} ${className} ${innerClassName}`}>{children}</div>;
}

const LockIcon = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
  </svg>
);

/* ───── 선수 일러스트 ─────
   카드 한 장 = public/cards/<선수 id>.webp 한 장 (세로 2:3, 시즌·구단별 유니폼과 포즈).
   같은 그림을 카드 배경(전신)과 얼굴 칩(확대 크롭)에 함께 쓴다.
   얼굴 위치가 그림마다 다르면 선수 데이터에 face: '가로% 세로%' 로 지정. */
const TEAM_COLOR = {
  한화: '#f37321', 대한민국: '#1d4ed8', SK: '#ce0e2d', 롯데: '#1f3a8a', KIA: '#ea0029', 해태: '#ea0029', 두산: '#1e1b4b',
  OB: '#1e1b4b', NC: '#315288', 삼성: '#074ca1', 넥센: '#820024', 키움: '#820024', KT: '#3f3f46', LG: '#c30452', 현대: '#1e40af', 퓨처스: '#374151',
};
const teamColor = (p) => TEAM_COLOR[p.team] || '#374151';

const artCache = new Map();

/** 카드 그림을 미리 불러와 캐시에 채운다 (첫 렌더부터 그림이 보이게) */
export function preloadArt(players) {
  return Promise.all(players.map((p) => new Promise((resolve) => {
    const src = `cards/${encodeURIComponent(p.id)}.webp`;
    if (artCache.has(src)) { resolve(); return; }
    const img = new Image();
    img.onload = () => { artCache.set(src, true); resolve(); };
    img.onerror = () => { artCache.set(src, false); resolve(); };
    img.src = src;
  })));
}
/** 카드 그림(public/cards/<id>.webp) 경로. 없으면 null */
function useArt(player) {
  return useImage(player && !player.isReplacement ? `cards/${encodeURIComponent(player.id)}.webp` : null);
}
/** 정면 상체 프로필(public/profiles/<id>.webp, 3:4) 경로. 없으면 null */
function useProfile(player) {
  return useImage(player && !player.isReplacement ? `profiles/${encodeURIComponent(player.id)}.webp` : null);
}
/** 필드·드래그용 흉상 배경: 프로필이 있으면 위쪽 기준으로 꽉 채우고, 없으면 카드 그림에서 얼굴을 확대해 대신한다 */
function useBust(player, cropSize = '260%') {
  const profile = useProfile(player);
  const art = useArt(player);
  if (profile) return { backgroundImage: `url(${profile})`, backgroundSize: 'cover', backgroundPosition: '50% 0%' };
  return bustStyle(art, player || {}, cropSize);
}
/** 이미지 파일이 있으면 경로, 없으면 null (한 번 확인한 결과는 캐시) */
function useImage(src) {
  const [ok, setOk] = useState(() => (src ? artCache.get(src) ?? false : false));
  useEffect(() => {
    if (!src) { setOk(false); return undefined; }
    if (artCache.has(src)) { setOk(artCache.get(src)); return undefined; }
    let live = true;
    const img = new Image();
    img.onload = () => { artCache.set(src, true); if (live) setOk(true); };
    img.onerror = () => { artCache.set(src, false); if (live) setOk(false); };
    img.src = src;
    return () => { live = false; };
  }, [src]);
  return ok ? src : null;
}

/** 얼굴 칩: 카드 그림의 얼굴 부분을 확대. 그림이 없으면 팀 컬러 + 이니셜 */
function FaceChip({ player, className = 'h-16 w-16' }) {
  const profile = useProfile(player);
  const src = useArt(player);
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-md border border-white/25 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.9)] ${className}`}
      style={{ background: profile ? `url(${profile}) 50% 8% / cover no-repeat, #111827`
        : src ? `url(${src}) ${player.face || '50% 14%'} / 300% auto no-repeat, #111827` : `linear-gradient(150deg, ${teamColor(player)}, #111827 85%)` }}>
      {!src && !profile && <span className="absolute inset-0 grid place-items-center text-xl font-black text-white/75">{player.name[0]}</span>}
    </div>
  );
}

/* 카드 프레임 네온 색: 그림의 림 라이트와 같은 계열로 맞춘다 (구단 컬러를 어두운 배경에서 빛나게 올린 값) */
const TEAM_NEON = {
  한화: '#ff8a3d', 대한민국: '#60a5fa', SK: '#ff5a67', 롯데: '#7cb4ff', KIA: '#ff5a67', 해태: '#ff5a67', 두산: '#a5a3ff', OB: '#a5a3ff',
  NC: '#6cc0ff', 삼성: '#5aa2ff', 넥센: '#ff6b9a', 키움: '#ff6b9a', KT: '#e5e7eb', LG: '#ff5c95', 현대: '#6f97ff',
};
const neonOf = (p) => TEAM_NEON[p.team] || '#10b981';
const cutCorners = (n) => `polygon(${n}px 0,100% 0,100% calc(100% - ${n}px),calc(100% - ${n}px) 100%,0 100%,0 ${n}px)`;
const POS_EN = { SP: 'Starter', RP: 'Closer', C: 'Catcher', '1B': '1st Base', '2B': '2nd Base', '3B': '3rd Base', SS: 'Shortstop', OF: 'Outfield', DH: 'Designated' };
const handLabel = (p) => (p.hand === 'S' ? '양타' : p.type === 'batter' ? `${p.hand === 'L' ? '좌' : '우'}타` : `${p.hand === 'L' ? '좌' : '우'}투`);

const STAT_LABELS = { power: '파워', contact: '컨택', speed: '주루', defense: '수비', stuff: '구위', control: '제구', stamina: '체력', stability: '안정' };

function StatBar({ label, value }) {
  return (
    <div className="grid grid-cols-[2rem_1fr_1.5rem] items-center gap-1.5">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-gray-800">
        <span className={`block h-full rounded-full ${value >= 90 ? 'bg-[#10b981]' : 'bg-gray-400'}`} style={{ width: `${value}%` }} />
      </span>
      <span className={`text-right font-display text-sm font-semibold tabular-nums ${value >= 90 ? 'text-[#10b981]' : 'text-gray-200'}`}>{value}</span>
    </div>
  );
}

function Badge({ children }) {
  return <span className="rounded border border-gray-600 px-1.5 py-px text-[10px] font-semibold text-gray-300">{children}</span>;
}

/* ───── 상단 샐러리 캡 대시보드 ───── */
/** capAfter: PICK 에 올린 선수를 영입하면 남을 캡 — 있으면 “지금 → 영입 후” 숫자와, 깎일 칸이 노랗게 깜빡이는 게이지 */
function CapDashboard({ round, cp, cap = SALARY_CAP, roster, phase, onOpenRules, wide = false, modeName = null, modeNeon = '#10b981', capAfter = null }) {
  const preview = capAfter != null && capAfter !== cp;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const pct = clamp01((preview ? capAfter : cp) / cap);
  const tone = pct > 0.5 ? '#10b981' : pct > 0.2 ? '#fbbf24' : '#f87171';
  const now = Math.round(clamp01(cp / cap) * 24);
  const lit = preview ? Math.min(now, Math.round(pct * 24)) : now;
  const foreign = roster.filter((p) => p.isForeign).length;

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-[#10b981]/25 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.74))] backdrop-blur">
      <span className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-64 bg-gradient-to-r from-[#10b981] to-transparent" aria-hidden="true" />
      <div className={`mx-auto flex flex-wrap items-center gap-x-8 gap-y-3 px-4 ${wide ? 'max-w-[1920px] py-2' : 'max-w-7xl py-3'}`}>
        <div className="leading-none">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">Legend Draft</p>
          <h1 className="mt-1 text-xl font-black leading-none text-white">레전드 드래프트</h1>
        </div>

        {/* 지금 드래프트 모드 (가을의 왕조 · 전체 믹스 …) */}
        {modeName && (
          <div className="border-l border-white/10 pl-6 leading-none">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">Mode</p>
            <p className="mt-1 whitespace-nowrap text-lg font-black leading-none" style={{ color: modeNeon, textShadow: `0 0 14px ${modeNeon}66` }}>{modeName}</p>
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-gray-500">Round</span>
          <span className="font-display text-[2.6rem] font-bold leading-none tabular-nums text-white [text-shadow:0_0_18px_rgba(16,185,129,.35)]">{String(Math.min(round, ROSTER_SIZE)).padStart(2, '0')}</span>
          <span className="font-display text-lg font-semibold text-gray-500">/ {ROSTER_SIZE}</span>
        </div>

        <div className="min-w-[220px] flex-1">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-gray-400">샐러리 캡 잔여</span>
            <span className="font-display tabular-nums">
              {preview ? (
                <>
                  <span className="text-lg font-bold text-gray-400">{cp}</span>
                  <span className="mx-1 text-sm font-bold text-gray-500" aria-hidden="true">→</span>
                  <span className="text-2xl font-bold text-[#34d399]" style={{ textShadow: '0 0 14px rgba(52,211,153,.5)' }} aria-label={`영입하면 ${capAfter}`}>{capAfter}</span>
                </>
              ) : (
                <span className="text-2xl font-bold transition-colors" style={{ color: tone, textShadow: `0 0 14px ${tone}80` }}>{cp}</span>
              )}
              <span className="text-sm text-gray-500"> / {cap} CP</span>
            </span>
          </div>
          <div className="ui-seg" style={{ '--a': tone }} role="meter" aria-label="샐러리 캡 잔여" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={cp}>
            {Array.from({ length: 24 }, (_, i) => <i key={i} className={i < lit ? 'on' : i < now ? 'spend' : ''} />)}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {foreign > 0 && (
            <span title={foreign >= FOREIGN_LIMIT ? '외국인 한도에 도달해 외국인 후보는 잠깁니다' : `외국인 선수는 최대 ${FOREIGN_LIMIT}명`}
              className="ui-chip ui-cut font-display text-base font-bold tabular-nums" style={{ '--a': foreign >= FOREIGN_LIMIT ? '#fbbf24' : '#94a3b8' }}>
              <span className="font-sans text-xs font-semibold text-gray-400">외국인</span>
              <span style={{ color: foreign >= FOREIGN_LIMIT ? '#fbbf24' : '#fff' }}>{foreign}/{FOREIGN_LIMIT}</span>
            </span>
          )}
          <button type="button" onClick={onOpenRules} className="ui-btn ui-cut sm">
            <span className="grid h-5 w-5 place-items-center rounded-full border border-gray-500 font-display text-xs leading-none" aria-hidden="true">?</span>
            드래프트 규칙
          </button>
        </div>
      </div>
    </header>
  );
}

/** PICK 영입 버튼 아이콘 */
const PickIcon = ({ kind }) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'plus' && <path d="M10 4v12M4 10h12" />}
    {kind === 'swap' && <path d="M4 7h11l-3-3M16 13H5l3 3" />}
    {kind === 'lock' && <><rect x="4.5" y="9" width="11" height="8" rx="1.5" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></>}
    {kind === 'out' && <path d="M11 4.5H5v11h6M9 10h8m-3-3 3 3-3 3" />}
  </svg>
);

/** 빈 PICK 구역의 스켈레톤 블록: PICK 카드의 윗줄 · 종합 · 연도줄 · 능력치 판 · 노트 · 포지션 칩 · 구분선 · 이름 · CP 자리 */
const PK_SKELETON = [
  { left: '6cqw', right: '1.6cqw', top: '1.6cqw', height: '1.3cqw', background: 'rgba(148,163,184,.22)' },
  { left: '6cqw', top: '7cqw', width: '26cqw', height: '19cqw' },
  { left: '6.5cqw', top: '29cqw', width: '34cqw', height: '3.4cqw' },
  { left: '5cqw', top: '36cqw', width: '42cqw', height: '44cqw', background: 'rgba(148,163,184,.05)', boxShadow: 'inset 0 0 0 1px rgba(148,163,184,.1)' },
  { left: '9cqw', top: '41cqw', width: '20cqw', height: '3cqw' }, { left: '9cqw', top: '47cqw', width: '30cqw', height: '1.4cqw' },
  { left: '9cqw', top: '52cqw', width: '18cqw', height: '3cqw' }, { left: '9cqw', top: '58cqw', width: '26cqw', height: '1.4cqw' },
  { left: '9cqw', top: '63cqw', width: '22cqw', height: '3cqw' }, { left: '9cqw', top: '69cqw', width: '33cqw', height: '1.4cqw' },
  { left: '9cqw', top: '74cqw', width: '16cqw', height: '3cqw' },
  { left: '6cqw', bottom: '43cqw', width: '44cqw', height: '3cqw' },
  { left: '6cqw', bottom: '35.5cqw', width: '8cqw', height: '5cqw', background: 'rgba(16,185,129,.2)' },
  { left: '16cqw', bottom: '36.2cqw', width: '34cqw', height: '3.4cqw' },
  { left: '6cqw', right: '6cqw', bottom: '32.5cqw', height: '1px', background: 'rgba(16,185,129,.3)' },
  { left: '6cqw', bottom: '8cqw', width: '46cqw', height: '12cqw' },
  { right: '6cqw', bottom: '18cqw', width: '8cqw', height: '3cqw' },
  { right: '6cqw', bottom: '8cqw', width: '14cqw', height: '9cqw', background: 'rgba(16,185,129,.16)' },
];

/* ───── PICK 카드 (막대 그래프 판) ───── */
/** 긴 포지션 영문의 글자 크기(cqw, 기본 4.6) — 칩 옆 한 줄에 맞춘 값 */
const PK_FS = { SP: 4.4, DH: 4.1 };
/**
 * PICK 구역 카드: 위 등급 줄 · 종합(흰/초록/90+ 무지개) · 연도·구단·투타 · 능력치 막대 판 · 시너지 칸(이름) ·
 * 노트 · 포지션 칩+영문(+국대/외인) · 구분선 · 이름 · CP/숫자.
 * owned: 내 라인업 선수로 볼 때 { eff: 선 자리·시너지까지 반영한 능력치, slotLabel } — 수치 옆 변화량, 받은 시너지·원래 포지션 칩, 코스트 대신 자리 이름.
 * hint: 영입하면 채우는 시너지 { s, after }
 */
export function PlayerCard({ player, reason, shaking, onSelect, style, owned = null, hint = null }) {
  const locked = !!reason;
  const art = useArt(player);
  const acc = neonOf(player);
  const eff = owned?.eff || player;
  const statKeys = eff.type === 'batter' ? ['power', 'contact', 'speed', 'defense'] : ['stuff', 'control', 'stamina', 'stability'];
  const overallDiff = owned ? eff.overall - player.overall : 0;
  const tier = eff.overall >= 90 ? 't90' : eff.overall >= 75 ? 't75' : '';
  const pos = eff.position || player.position;
  const diffTag = (d) => (d ? <em className={d > 0 ? 'up' : 'dn'}>{d > 0 ? `+${d}` : `−${-d}`}</em> : null);
  return (
    <button type="button" onClick={() => onSelect(player)} aria-disabled={locked}
      aria-label={`${player.year} ${player.team} ${player.name}, ${POS_LABEL[player.position]}, 영입가 ${player.cost} CP${locked ? `, ${reason}` : ''}`}
      style={{ ...style, '--n': acc }}
      className={`pk ${tier} ${locked ? 'lock' : ''} group relative block aspect-[2/3] w-full text-left animate-[rise_.35s_ease-out_both] transition-transform duration-200 focus:outline-none ${locked ? 'cursor-not-allowed' : 'hover:-translate-y-1'}`}>
      <span className="pk-body" style={shaking ? { animation: 'shake .3s' } : undefined}>
        <span className="pk-in">
          {art
            ? <img src={art} alt="" className="pk-art" />
            : <span className="absolute inset-0" style={{ background: `radial-gradient(90% 60% at 65% 35%, ${acc}40, transparent 70%), linear-gradient(160deg, ${teamColor(player)}66, #05080f 70%)` }} />}
          <span className="pk-sh" />
          <span className="pk-tb" />
          <span className="pk-ov font-display tabular-nums">{eff.overall}{overallDiff ? <em className={overallDiff > 0 ? 'up' : 'dn'}>{overallDiff > 0 ? `+${overallDiff}` : `−${-overallDiff}`}</em> : null}</span>
          <span className="pk-meta font-display">{player.year} · {player.team} · {handLabel(player)}</span>
          <dl className="pk-stats">
            {statKeys.map((k) => {
              const v = eff.stats[k];
              const d = owned && player.stats[k] != null ? v - player.stats[k] : 0; // 원래 능력치 대비 (시너지 +, 제자리 밖 −)
              return (
                <div key={k} className="pk-st">
                  <dt>{STAT_LABELS[k]}</dt>
                  <dd className={`font-display tabular-nums ${v >= 90 ? 'hi' : ''}`}>{v}{diffTag(d)}</dd>
                  <i className="pk-bar"><b style={{ width: `${Math.min(100, v)}%` }} /></i>
                </div>
              );
            })}
          </dl>
          {hint && <SynergyPips {...hint} named />}
          {owned && (eff.synergyBoost?.length > 0 || eff.naturalPosition) && (
            <span className="pk-chips">
              {eff.synergyBoost?.map((n) => <span key={n} className="sy">▲ {n}</span>)}
              {eff.naturalPosition && <span className="off">원래 {POS_LABEL[eff.naturalPosition]}</span>}
            </span>
          )}
          {player.note && <span className="pk-note">{player.note}</span>}
          <span className="pk-pos font-display">
            <em>{pos}</em>
            <span style={PK_FS[pos] ? { fontSize: `${PK_FS[pos]}cqw` } : undefined}>{POS_FULL[pos]}</span>
            {(player.isNational || player.isForeign) && <span className="tg">{player.isNational && <b>국대</b>}{player.isForeign && <b>외인</b>}</span>}
          </span>
          <span className="pk-rule" />
          <span className={`pk-nm ${player.name.length >= 5 ? 'l5' : ''}`}>{player.name}</span>
          {owned
            ? <span className="pk-slot">{owned.slotLabel}</span>
            : <span className="pk-cp font-display tabular-nums"><small>CP</small><b>{player.cost}</b></span>}
        </span>
        <span className="pk-fr" />
        {locked && <span className="pk-lk"><LockIcon />{reason.replace(/\s*\(.*\)$/, '')}</span>}
      </span>
    </button>
  );
}

/* ───── 드래프트 선반 미니 카드 (누르면 살펴보기, 영입은 왼쪽 판에서) ───── */
const POS_FULL = { SP: 'STARTING PITCHER', RP: 'RELIEF PITCHER', C: 'CATCHER', '1B': 'FIRST BASE', '2B': 'SECOND BASE', '3B': 'THIRD BASE', SS: 'SHORTSTOP', OF: 'OUTFIELDER', DH: 'DESIGNATED HITTER' };
/** 칩 옆 한 줄에 다 들어가게 줄이는 긴 포지션의 글자 크기(cqw, 기본 9.5) — Saira Condensed 500 · 자간 .07em 기준으로 잰 값 */
const POS_FS = { SP: 9.3, DH: 8.4 };

/**
 * 선반 카드 오른쪽 위 시너지 칸: 목록(도크)의 단계 칸을 축소한 것.
 * 흰 칸 = 이미 채움(최종 단계면 초록), 하늘 칸 = 이 선수가 들어오면 채울 칸(깜빡), 최종 단계를 넘어 추가 혜택이면 +N
 */
function SynergyPips({ s, after, named = false }) {
  const stage = Math.min(s.level, s.tiers.length - 1);
  const from = stage > 0 ? s.tiers[stage - 1].need : 0;
  const to = s.tiers[stage].need;
  const maxed = s.level === s.tiers.length;
  const next = after ? Math.min(after.cur, to) : s.cur;
  const extraGain = after ? extraOf(after) - extraOf(s) : 0;
  return (
    <span className="mc-syn" title={`${s.name} · 영입하면 ${maxed ? '추가 혜택' : `${stage + 1}단계까지 ${Math.max(0, to - next)}명`}`}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1" /><path d="M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1" />
      </svg>
      {Array.from({ length: to - from }, (_, i) => (
        <i key={i} className={i < s.cur - from ? (maxed ? 'max' : 'on') : i < next - from ? 'nx' : ''} />
      ))}
      {extraGain > 0 && <em className="font-display">+{extraGain}</em>}
      {named && <b>{s.name}</b>}
    </span>
  );
}

/**
 * 선반 카드: 위 가장자리 등급 줄 · 종합(75 미만 흰 · 75~89 초록 · 90+ 무지개) · 포지션 약어 칩+영문 · 팀 색 구분선 · 이름 · 오른쪽 아래 CP/숫자.
 * 살 수 없으면 카드 전체가 무채색이 되고 가운데에 사유 알림.
 */
function MiniCard({ player, reason, selected, hint, focus, onPick, style, leaving = false }) {
  const art = useArt(player);
  const acc = neonOf(player);
  const locked = !!reason;
  const tier = player.overall >= 90 ? 't90' : player.overall >= 75 ? 't75' : '';
  return (
    <button type="button" onClick={() => onPick(player)} aria-pressed={selected}
      aria-label={`${player.year} ${player.team} ${player.name}, ${POS_LABEL[player.position]}, 영입가 ${player.cost} CP${locked ? `, ${reason}` : ''}`}
      style={{ ...style, '--n': acc, clipPath: 'polygon(10% 0,100% 0,100% 93.3%,90% 100%,0 100%,0 6.7%)' }}
      className={`mc ${tier} ${locked ? 'lock' : ''} ${player.cost >= 100 ? 'c3' : ''} ${leaving ? 'mc-leave' : ''} group relative block aspect-[2/3] w-full bg-[#05080f] text-left [container-type:inline-size] animate-[rise_.35s_ease-out_both] transition-transform duration-200 focus:outline-none focus-visible:-translate-y-1 ${selected ? '-translate-y-1' : 'hover:-translate-y-0.5'} ${focus === 'off' ? 'opacity-30' : ''}`}>
      <span className="mc-in">
        {art
          ? <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover object-[62%_18%]" />
          : <span className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${teamColor(player)}66, #05080f 70%)` }} />}
        <span className="mc-sh" />
        <span className="mc-tb" />
        <span className="mc-ov font-display tabular-nums">{player.overall}</span>
        {hint && <SynergyPips {...hint} />}
        <span className="mc-pos font-display"><em>{player.position}</em><span style={POS_FS[player.position] ? { fontSize: `${POS_FS[player.position]}cqw` } : undefined}>{POS_FULL[player.position]}</span></span>
        <span className="mc-rule" />
        <span className={`mc-nm ${player.name.length >= 6 ? 'l6' : player.name.length >= 5 ? 'l5' : player.name.length >= 4 ? 'l4' : ''}`}>{player.name}</span>
        <span className="mc-cp font-display tabular-nums"><small>CP</small><b>{player.cost}</b></span>
      </span>
      {/* 테두리(선택 초록 · 시너지 강조 하늘)는 무채색 필터 밖에 둬서 잠긴 카드도 고른 표시가 보이게 */}
      <span className={`pointer-events-none absolute inset-[2.5cqw] ${selected || focus === 'on' ? 'border-2' : 'border'}`}
        style={{ borderColor: selected ? '#10b981' : focus === 'on' ? '#38bdf8' : `${acc}66` }} />
      {locked && <span className="mc-lk" title={reason}><LockIcon /><span>{reason.replace(/\s*\(.*\)$/, '')}</span></span>}
    </button>
  );
}

/* ───── 라인업 필드: 중계 자막 스타일 토큰 · 끌어서 자리 바꾸기 ─────
   900×580 설계 크기로 그리고 컨테이너 폭에 맞춰 축소한다. 초상은 지금 카드 그림의 얼굴 크롭(정면 상체 초상이 생기면 교체) */
const FIELD_W = 900;
const FIELD_H = 580;
/* 자리별 토큰 중심 (900×580 설계 좌표): 외야 셋은 좌·중·우, 선발은 마운드, 불펜 둘은 1루 쪽 파울 지역 */
const SLOT_XY = {
  OF1: [215, 150], OF2: [450, 70], OF3: [685, 150],
  SS: [300, 245], '2B': [600, 245], '3B': [150, 370], '1B': [730, 352],
  SP: [450, 360], C: [450, 520], DH: [110, 515],
  MR: [790, 448], CL: [790, 536],
};

const Silhouette = () => (
  <svg className="lf-sil" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <circle cx="50" cy="40" r="18" /><path d="M12 104 C14 74 30 64 50 64 C70 64 86 74 88 104 Z" />
  </svg>
);
const bustStyle = (src, p, size = '300%') => (src ? { backgroundImage: `url(${src})`, backgroundSize: `${size} auto`, backgroundPosition: p.face || '50% 14%' } : undefined);

/* 야간 조명 아래 구장: 줄무늬 잔디 · 붉은 흙 내야 · 빛나는 파울 라인과 베이스 (카드 문법 UI와 같은 톤) */
function FieldArt() {
  const hx = 450, hy = 560, s = 180, R = 520, r = R / Math.SQRT2, q = s * 0.3;
  const fair = `M${hx} ${hy} L${hx - r} ${hy - r} A${R} ${R} 0 0 1 ${hx + r} ${hy - r} Z`;
  const base = (x, y) => <rect key={`${x}-${y}`} x={x - 7} y={y - 7} width="14" height="14" transform={`rotate(45 ${x} ${y})`} />;
  return (
    <svg className="absolute inset-0" width={FIELD_W} height={FIELD_H} viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} aria-hidden="true">
      <defs>
        <radialGradient id="lf-grass" cx="50%" cy="78%" r="80%"><stop offset="0" stopColor="#1d6b3c" /><stop offset=".55" stopColor="#135230" /><stop offset="1" stopColor="#0a2e1b" /></radialGradient>
        <radialGradient id="lf-dirt" cx="50%" cy="60%" r="70%"><stop offset="0" stopColor="#8a5a34" /><stop offset="1" stopColor="#5b3a22" /></radialGradient>
        <pattern id="lf-mow" width="64" height="64" patternUnits="userSpaceOnUse"><rect width="32" height="64" fill="#fff" opacity=".045" /></pattern>
        <filter id="lf-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <path d={fair} fill="url(#lf-grass)" /><path d={fair} fill="url(#lf-mow)" />
      <path d={`M${hx - r} ${hy - r} A${R} ${R} 0 0 1 ${hx + r} ${hy - r}`} fill="none" stroke="#6b4a2f" strokeOpacity=".75" strokeWidth="12" />
      <polygon points={`${hx},${hy + q} ${hx + s + q},${hy - s} ${hx},${hy - 2 * s - q} ${hx - s - q},${hy - s}`} fill="url(#lf-dirt)" opacity=".9" />
      <polygon points={`${hx},${hy - q} ${hx + s - q},${hy - s} ${hx},${hy - 2 * s + q} ${hx - s + q},${hy - s}`} fill="url(#lf-grass)" />
      <polygon points={`${hx},${hy - q} ${hx + s - q},${hy - s} ${hx},${hy - 2 * s + q} ${hx - s + q},${hy - s}`} fill="url(#lf-mow)" />
      <g filter="url(#lf-glow)">
        <path d={`M${hx} ${hy} L${hx - r} ${hy - r} M${hx} ${hy} L${hx + r} ${hy - r}`} stroke="#e8f7ff" strokeOpacity=".75" strokeWidth="2.4" />
        <path d={`M${hx - r} ${hy - r} A${R} ${R} 0 0 1 ${hx + r} ${hy - r}`} fill="none" stroke="#5eead4" strokeOpacity=".35" strokeWidth="2" />
      </g>
      <circle cx={hx} cy={hy - s} r={s * 0.11} fill="url(#lf-dirt)" />
      <g fill="#ffffff" filter="url(#lf-glow)">{base(hx + s, hy - s)}{base(hx, hy - 2 * s)}{base(hx - s, hy - s)}<path d={`M${hx - 9} ${hy - 6} h18 v7 l-9 8 l-9 -8 Z`} /></g>
    </svg>
  );
}

/** 토큰 한 칸의 표시값: 색 · 보조 문구 · 실전 종합 */
function tokenView(slot, player, kind, boosted) {
  // 미리보기(ghost)도 영입 뒤와 같은 글·숫자로 보여 준다 — 영입할 때 색만 차오르고 글자가 바뀌며 튀지 않게
  const base = player ? playAt({ ...player, slot: slot.id }) : player;
  const eff = (player && kind !== 'empty' && boosted?.get(player.id)) || base; // 시너지 보너스까지 반영한 종합
  const moved = base?.naturalPosition;
  const color = kind === 'clash' ? '#fbbf24' : player ? neonOf(player) : '#344055';
  const sub = kind === 'clash' ? '마감'
      : moved ? `원래 ${moved} −${player.overall - base.overall}`
        : player ? `${player.year} ${player.team}` : slot.label;
  return { eff, moved, color, sub, boost: eff?.synergyBoost };
}

function SlotToken({ slot, player, kind, flags, bind, boosted, swapIn = null }) {
  const bust = useBust(player, '260%');
  const { eff, moved, color, sub, boost } = tokenView(slot, player, kind, boosted);
  const [x, y] = SLOT_XY[slot.id];
  const joined = /\bjoined\b/.test(flags);
  // 선수 자리: 판 위 포지션 칩 + 솟는 흉상 · 빈 자리: 칩 없이 같은 크기의 빈 사진 칸 (포지션 이름은 판 안 아랫줄)
  const body = (
    <div className="lf-k">
      {player ? (
        <>
          <span className="lf-chip">{slot.id}</span>
          <div className="lf-bp" style={bust}>{!bust && <Silhouette />}</div>
        </>
      ) : <span className="lf-ph" />}
      <div className="lf-bar">
        <div className="lf-bx"><b>{player ? player.name : '빈 자리'}</b><small className={moved && kind === 'mine' ? 'lf-off' : ''}>{sub}</small></div>
        {eff && (
          <em className={`lf-ov font-display not-italic tabular-nums ${boost ? 'up' : ''}`} title={boost ? `시너지: ${boost.join(', ')}` : undefined}>
            {boost && <span className="mr-0.5 text-xs">▲</span>}{eff.overall}
          </em>
        )}
      </div>
    </div>
  );
  return (
    <div {...bind} data-slot={slot.id} role="button" tabIndex={0}
      aria-label={player ? `${slot.label} 자리 ${player.name} ${eff.overall}` : `${slot.label} 빈 자리`}
      className={`lf-tok ${player ? '' : 'empty'} ${kind} ${flags}`} style={{ left: x, top: y, '--n': color }}>
      {/* 합류 중에는 무채색 사본을 깔고, 그 위 컬러 본(흉상+자막 바 한 덩어리)을 아래에서 위로 드러낸다 */}
      {joined && <div key="gray" className="lf-in lf-gray" aria-hidden="true">{body}</div>}
      <div key="main" className={`lf-in ${joined ? 'lf-color' : ''}`}>{body}</div>
      {swapIn && <SwapPreview slot={slot} {...swapIn} />}
    </div>
  );
}

/** 끌기 카드. body 에 포털로 붙인다 — 라인업 판(backdrop-filter)이 fixed 의 기준이 되어 카드가 커서보다 오른쪽 아래로 밀리던 문제. k = 필드 배율 */
/** 놓기 전 수치: 바뀌면 “78 → 75”(줄면 노랑 · −8 이상 빨강 · 오르면 초록), 그대로면 숫자 하나 */
function DeltaOv({ before, after }) {
  const dv = after - before;
  if (!dv) return <em className="lf-ov font-display not-italic tabular-nums">{after}</em>;
  return <span className={`lf-ovx tabular-nums ${dv > 0 ? 'up' : dv > -8 ? 'dn' : 'dn2'}`}><s>{before}</s><i>→</i><em>{after}</em></span>;
}

/** 맞바꿈 미리보기: 끌고 있는 선수의 원래 자리(slot)에 맞바꿀 선수가 들어온 토큰 */
function SwapPreview({ slot, player, before, after }) {
  const bust = useBust(player, '260%');
  return (
    <div className="lf-pv" style={{ '--n': neonOf(player) }} aria-hidden="true">
      <span className="lf-chip">{slot.id}</span>
      <div className="lf-bp" style={bust}>{!bust && <Silhouette />}</div>
      <div className="lf-bar">
        <div className="lf-bx"><b>{player.name}</b><small>{player.year} {player.team}</small></div>
        <DeltaOv before={before} after={after} />
      </div>
    </div>
  );
}

function DragGhost({ player, eff, from, to, delta, x, y, k }) {
  const bust = useBust(player, '260%');
  const boost = eff.synergyBoost;
  return createPortal(
    <div className="lf-drag" style={{ left: x, top: y, '--k': k, '--n': neonOf(player) }} aria-hidden="true">
      <span className="lf-route">
        {to ? (
          <>
            <span className="a">{from}</span>
            <span className={`fl ${to.swap ? 'sw' : 'go'}`}>{(to.swap ? [0, 1] : [0, 1, 2]).map((i) => <i key={i} />)}</span>
            <span key={to.slot} className="b">{to.slot}</span>
          </>
        ) : <span className="a on">{from}</span>}
      </span>
      <div className="lf-bp" style={bust}>{!bust && <Silhouette />}</div>
      <div className="lf-bar">
        <div className="lf-bx"><b>{player.name}</b><small>{player.year} {player.team}</small></div>
        {to && delta
          ? <DeltaOv before={delta.before} after={delta.after} />
          : <em className={`lf-ov font-display not-italic tabular-nums ${boost ? 'up' : ''}`}>{boost && <span className="mr-0.5 text-xs">▲</span>}{eff.overall}</em>}
      </div>
    </div>,
    document.body,
  );
}

/**
 * 내 라인업 필드. 선수를 끌어 다른 자리에 놓거나(빈 자리면 이동, 사람이 있으면 맞교환),
 * 한 명을 누른 뒤 다른 자리를 눌러도 바뀐다. candidate 가 있으면 들어갈 자리를 초록으로 미리 보여준다.
 */
/** 화면에 반영할 시너지: 드래프트 중이면 드래프트 뒤에만 공개하는 시너지를 뺀다 */
function visibleSynergies(roster, draftView) {
  const all = checkSynergies(roster);
  return draftView ? all.filter((s) => !DRAFT_HIDDEN.has(s.id)) : all;
}

function LineupField({ roster, candidate, candidateReason, onMove, onInspect, onSlotFilter, onClearCandidate, wantSlot = null, draftView = false, highlight, focusLabel, onClearFocus, reserve = 0, overlay = null, fill = false, className = '', locked = false }) {
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // 오른쪽 도크(reserve)를 뺀 영역 안에서 구장을 가운데로
  // fill + 넓은 화면: 부모 높이를 채우고 구장을 그 안에 맞춘다. 첫 렌더부터 켜 둬야 고정 높이를 한 번 거치지 않는다
  const [filling, setFilling] = useState(() => fill && typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  const [pick, setPick] = useState(null);
  const [drag, setDrag] = useState(null);
  // 방출 등으로 고른 자리가 비면 선택을 푼다 (빈 자리가 지정된 채 남지 않게)
  useEffect(() => { if (pick && !withSlots(roster).some((p) => p.slot === pick)) setPick(null); }, [roster, pick]);
  // 선반에서 후보를 골라도 라인업 선택은 남겨 둔다 — PICK 은 후보를 먼저 보여 주고, 후보를 해제하면 다시 이 선수로 돌아간다.
  // 후보를 보는 중에 선택한 자리를 다시 누르면 그 자리만 바로 해제된다(아래 tap). 영입이 일어나면 선택을 푼다(합류 효과 쪽)
  // 누른(이동 대기) 선수를 바깥에 알린다 — 드래프트 화면은 PICK 구역에 그 선수 스탯 카드를 띄운다
  useLayoutEffect(() => { onInspect?.(pick ? withSlots(roster).find((p) => p.slot === pick)?.id ?? null : null); }, [pick, roster]); // eslint-disable-line react-hooks/exhaustive-deps
  // 막 영입된 선수의 자리: 이전 엔트리에 없던 id 가 생기면 잠깐 'joined' 효과 (자리 이동·교환은 id 가 그대로라 제외)
  const [joined, setJoined] = useState(() => new Set());
  const prevIdsRef = useRef(null);
  useLayoutEffect(() => { // 레이아웃 단계: 새 선수가 효과 없이 한 프레임 먼저 보이는 깜빡임 방지
    const ids = new Set(roster.map((p) => p.id));
    const prev = prevIdsRef.current;
    prevIdsRef.current = ids;
    if (!prev) return undefined;
    const fresh = new Set(withSlots(roster).filter((p) => !prev.has(p.id)).map((p) => p.slot));
    if (!fresh.size) return undefined;
    setPick(null); // 영입(교체 영입 포함)으로 새 선수가 들어오면 라인업 선택은 푼다
    setJoined(fresh);
    const t = setTimeout(() => setJoined(new Set()), 1400);
    return () => clearTimeout(t);
  }, [roster]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => {
      const room = Math.max(0, e.contentRect.width - reserve);
      // 넓은 화면에서만 높이 채우기 (좁은 화면은 부모 높이가 내용에서 나오므로 폭 기준으로 둔다)
      const fitHeight = fill && window.matchMedia('(min-width: 1024px)').matches;
      const h = e.contentRect.height;
      const k = fitHeight ? Math.max(0.3, Math.min(1.3, room / FIELD_W, h / FIELD_H)) : Math.min(1, room / FIELD_W);
      setFilling(fitHeight);
      setScale(k);
      setOffset({ x: Math.max(0, (room - FIELD_W * k) / 2), y: fitHeight ? Math.max(0, (h - FIELD_H * k) / 2) : 0 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [reserve, fill]);

  const placed = withSlots(roster);
  const at = (id) => placed.find((p) => p.slot === id);
  // 드래프트 중에는 드래프트 뒤에만 공개하는 시너지(프랜차이즈의 기억)의 상승분을 빼고 보여 준다
  const boostOf = (r) => { const on = r.map(playAt); return new Map(applySynergies(on, visibleSynergies(on, draftView)).map((p) => [p.id, p])); };
  const boosted = boostOf(placed);
  // 끌어서 다른 자리 위에 있을 때: 거기 놓으면 바뀌는 실전 종합(제자리 밖 감소 · 시너지 반영). 사람이 있으면 맞바꿈이라 그 선수 몫도 계산
  const dropPlan = (() => {
    const me = drag && drag.over && drag.over !== drag.from ? at(drag.from) : null;
    if (!me) return null;
    const occ = at(drag.over);
    const next = boostOf(placed.map((p) => (p.id === me.id ? { ...p, slot: drag.over } : occ && p.id === occ.id ? { ...p, slot: drag.from } : p)));
    return {
      me: { before: boosted.get(me.id).overall, after: next.get(me.id).overall },
      occ: occ ? { player: occ, before: boosted.get(occ.id).overall, after: next.get(occ.id).overall } : null,
    };
  })();
  const target = candidate && !candidateReason ? freeSlot(roster, candidate.position)?.id : null;
  // 미리보기 선수는 영입된 뒤의 종합(시너지 포함)으로 보여 준다
  const boostedPreview = target ? boostOf([...placed, { ...candidate, slot: target }]) : null;
  const clashPos = candidate && candidateReason?.endsWith('마감') ? candidate.position : null;
  const kindOf = (s) => (at(s.id) ? (clashPos === s.pos ? 'clash' : 'mine') : s.id === target ? 'ghost' : 'empty');
  const playerOf = (s) => at(s.id) || (s.id === target ? candidate : null);
  const flagsOf = (s) => [joined.has(s.id) && at(s.id) && 'joined', wantSlot === s.id && 'want', /* 거르기 중인 자리(선수가 있으면 교체 대상) */ pick === s.id && 'picked', drag && drag.over === s.id && drag.from !== s.id && 'over', drag?.from === s.id && 'lifted', drag?.from === s.id && dropPlan?.occ && 'swapin', highlight && (highlight.has(at(s.id)?.id) ? 'focus' : 'dim')].filter(Boolean).join(' ');
  const slotUnder = (e) => document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot]')?.dataset.slot || null;

  const tap = (id) => {
    if (locked) return;
    // 자리를 누르면(빈 자리든 선수가 있는 자리든) 선반을 그 자리 포지션으로 거른다. 같은 자리를 다시 누르면 해제, 다른 자리로 옮기면 해제
    // 자리 이동은 끌어다 놓기로만. 선수를 고른 채 다른 자리를 누르면 그 자리를 새로 고른다
    if (pick === id) {
      setPick(null);
      onSlotFilter?.(id);
      if (candidate) onClearCandidate?.(); // 이 자리를 골라 둔 채 선반에서 본 후보도 함께 해제 — PICK 은 빈 칸으로
    } else if (pick) {
      setPick(at(id) ? id : null);
      onSlotFilter?.(id, true);
    } else {
      if (at(id)) { setPick(id); onSlotFilter?.(id, true); } // 선수가 있는 자리는 고를 때마다 거르기를 켠다(해제는 다시 눌러 선택을 풀 때)
      else onSlotFilter?.(id);
    }
  };
  const bind = (id) => ({
    onPointerDown: (e) => {
      if (locked || e.button > 0) return;
      dragRef.current = { from: id, sx: e.clientX, sy: e.clientY, moved: false, filled: !!at(id) };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e) => {
      const d = dragRef.current;
      if (!d || !d.filled) return;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
      d.moved = true;
      setDrag({ from: d.from, x: e.clientX, y: e.clientY, over: slotUnder(e) });
    },
    onPointerUp: (e) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) return;
      if (!d.moved) { tap(id); return; }
      const to = slotUnder(e);
      if (to && to !== d.from) { onMove(d.from, to); onSlotFilter?.(null); }
      setDrag(null);
      setPick(null);
    },
    onPointerCancel: () => { dragRef.current = null; setDrag(null); },
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(id); }
      if (e.key === 'Escape') setPick(null);
    },
  });

  return (
    <div ref={wrapRef} className={`relative w-full overflow-hidden bg-[#05080f] ${className}`}
      style={filling ? undefined : { height: FIELD_H * scale }}>
      {/* 구장 둘레: 관중석·조명 야경을 은은하게 깔아 필드가 경기장 안에 있는 느낌을 준다 */}
      <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: 'url(ui/stadium.webp)' }} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_80%_at_45%_62%,transparent_30%,rgba(5,8,15,.85)_100%)]" aria-hidden="true" />
      <div className="lf-field" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
        <FieldArt />
        {SLOTS.map((s) => <SlotToken key={s.id} slot={s} player={playerOf(s)} kind={kindOf(s)} flags={flagsOf(s)} bind={bind(s.id)} boosted={kindOf(s) === 'ghost' ? boostedPreview : boosted}
          swapIn={drag?.from === s.id ? dropPlan?.occ : null} />)}
      </div>
      {overlay && <div className="syn-dock" style={{ width: reserve }}>{overlay}</div>}
      {highlight && (
        <button type="button" onClick={onClearFocus}
          className="absolute left-3 top-2 z-10 flex items-center gap-1.5 bg-sky-500/15 px-2 py-1 text-xs font-semibold text-sky-200 shadow-[inset_0_0_0_1px_rgba(56,189,248,.5)] hover:bg-sky-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
          {focusLabel} · {highlight.size}명 <span aria-hidden="true">✕</span>
        </button>
      )}
      {drag && at(drag.from) && (
        <DragGhost player={at(drag.from)} eff={boosted.get(at(drag.from).id) || playAt(at(drag.from))} from={drag.from} delta={dropPlan?.me} x={drag.x} y={drag.y} k={scale}
          to={drag.over && drag.over !== drag.from ? { slot: drag.over, swap: !!at(drag.over) } : null} />
      )}
    </div>
  );
}

/* ───── 우측 패널: 로스터 · 시너지 · 증강 ───── */
function PanelTitle({ children, aside }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h3 className="text-sm font-bold text-white">{children}</h3>
      {aside && <span className="font-display text-sm tabular-nums text-gray-400">{aside}</span>}
    </div>
  );
}

function RosterPanel({ roster }) {
  const placed = applySynergies(withSlots(roster).map(playAt));
  const rows = SLOTS.map((s) => ({ pos: s.id, key: s.id, player: placed.find((p) => p.slot === s.id) }));
  const spent = roster.reduce((s, p) => s + (p.isReplacement ? 0 : p.cost), 0);
  return (
    <section className="ui-cut ui-frame ui-glass p-3" style={{ '--c': '12px' }}>
      <PanelTitle aside={`${roster.length}/${ROSTER_SIZE} · ${spent} CP`}>나의 엔트리</PanelTitle>
      <ul className="flex flex-col gap-1">
        {rows.map(({ pos, key, player }) => (
          <li key={key} className={`ui-cut flex items-center gap-2.5 px-2 py-1 ${player ? 'bg-white/[0.045]' : 'shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]'}`} style={{ '--c': '6px' }}>
            <span className="w-9 shrink-0 font-display text-sm font-bold text-gray-400">{pos}</span>
            {player ? (
              <>
                <FaceChip player={player} className="h-8 w-8" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{player.name}</span>
                  <span className="block font-display text-xs tabular-nums text-gray-500">{player.year} {player.team}{player.naturalPosition && <span className="text-amber-300"> · 원래 {player.naturalPosition}</span>}</span>
                </span>
                <span className="font-display text-lg font-bold tabular-nums text-gray-100">{player.overall}</span>
              </>
            ) : <span className="py-2 text-xs text-gray-600">빈 자리</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 완성된 시너지가 맨 위, 그다음 진행률 높은 순 */
/**
 * 시너지 정렬: 켜진 시너지가 먼저, 그 안팎 모두 '다음 단계까지 남은 인원'이 적은 순(곧 따낼 수 있는 것부터).
 * 남은 인원이 같으면 채운 비율이 높은 쪽(2/3 > 1/2), 마지막 단계까지 다 채운 것은 남은 인원 0으로 맨 위.
 */
const leftOf = (s) => (s.level < s.tiers.length ? Math.max(0, s.need - s.count) : 0);
const fillOf = (s) => (s.level < s.tiers.length ? s.count / s.need : 1);
const sortSynergies = (list) => [...list].sort((a, b) => b.active - a.active || leftOf(a) - leftOf(b) || fillOf(b) - fillOf(a) || b.level - a.level);

/** 이 선수를 영입했을 때의 시너지 (id → 결과) */
function previewSynergies(roster, player) {
  return new Map(checkSynergies([...roster, { ...player, slot: freeSlot(roster, player.position)?.id }]).map((s) => [s.id, s]));
}
/** 영입하면 칸이 오르거나(미완성), 혜택 받는 선수가 늘어나는(완성) 시너지인가 */
const synergyGrows = (s, after) => !!after && (after.cur > s.cur || after.members.length > s.members.length);
/** 완성 뒤 추가로 혜택을 받는 인원 (프랜차이즈는 최다 구단 인원 기준) */
const extraOf = (s) => Math.max(0, s.count - s.top);

/* 한 줄: 이름 · 단계 · 칸(채움 회색/완성 초록 · 영입 미리보기 파랑 · 완성 뒤 추가 인원 +N)
   아랫줄은 내 라인업에 있는 해당 선수 이름(흰색) + 고른 후보가 들어가면 그 이름(파랑).
   누르면 펼쳐져 그 시너지의 선수 전원: 라인업에 있으면 흰색, 고른 후보는 파랑, 남은 선수는 회색 + 효과 */
function SynergyRow({ s, after, candidate, focused, onFocus }) {
  const next = after ? after.cur : s.cur;
  const extra = extraOf(s);
  const nextExtra = after ? extraOf(after) : extra;
  // 칸은 지금 도전 중인 단계 몫만: 이전 단계 인원(from) → 이번 단계 인원(to). 최종 단계를 넘으면 마지막 구간을 꽉 채워 둔다
  const stage = Math.min(s.level, s.tiers.length - 1);
  const from = stage > 0 ? s.tiers[stage - 1].need : 0;
  const to = s.tiers[stage].need;
  const maxed = s.level === s.tiers.length;
  const mine = new Set(s.members.map(personKey));
  const candKey = candidate && synergyGrows(s, after) ? personKey(candidate) : null;
  const inLineup = [
    ...s.members.map((p) => ({ key: p.id, label: p.name, cls: 'text-gray-100' })),
    ...(candKey ? [{ key: 'candidate', label: candidate.name, cls: 'font-semibold text-sky-300' }] : []),
  ];
  const Box = onFocus ? 'button' : 'div';
  return (
    <li>
      <Box {...(onFocus ? { type: 'button', onClick: () => onFocus(s.id), 'aria-expanded': !!focused } : {})}
        className={`dock-row ${s.active ? 'on' : ''} ${focused ? 'open' : ''}`}>
        <span className="flex items-center gap-2">
          <span className={`whitespace-nowrap text-sm font-bold ${s.active ? 'text-[#10b981]' : 'text-gray-100'}`}>{s.name}</span>
          {s.tiers.length > 1 && s.level > 0 && <span className="shrink-0 font-display text-[11px] font-bold text-[#10b981]">{s.level}단계</span>}
          <span className="ml-auto flex shrink-0 items-center gap-1"
            aria-label={`${maxed ? '최종 단계' : `${stage + 1}단계까지 ${to - s.cur}명`}${next > s.cur ? `, 영입하면 ${Math.min(next, to) - s.cur}칸` : ''}${nextExtra > extra ? ', 영입하면 추가 혜택' : ''}`}>
            <span className="flex gap-0.5">
              {Array.from({ length: to - from }, (_, i) => (
                <i key={`${stage}-${i}`} className={`h-2 w-3 rounded-sm ${i < s.cur - from ? (maxed ? 'bg-[#10b981]' : 'bg-gray-300') : i < Math.min(next, to) - from ? 'bg-sky-400' : 'bg-gray-700'}`} />
              ))}
            </span>
            {nextExtra > 0 && (
              <span className={`rounded-sm px-1 font-display text-[11px] font-bold leading-4 ${nextExtra > extra ? 'bg-sky-400/20 text-sky-300' : 'bg-[#10b981]/20 text-[#10b981]'}`}>+{nextExtra}</span>
            )}
          </span>
        </span>
        {focused ? (
          <span className="mt-1.5 block">
            {s.names ? (
              <span className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                {s.names.map((k) => (
                  <span key={k} className={mine.has(k) ? 'font-semibold text-gray-100' : k === candKey ? 'font-semibold text-sky-300' : 'text-gray-500'}>{k}</span>
                ))}
              </span>
            ) : (
              <span className="block text-xs">
                <span className="text-gray-500">{s.cond}</span>
                {inLineup.length > 0 && (
                  <span className="mt-0.5 flex flex-wrap gap-x-2">{inLineup.map((x) => <span key={x.key} className={x.cls}>{x.label}</span>)}</span>
                )}
              </span>
            )}
            <span className="mt-1 block text-[11px] font-semibold text-[#10b981]">{s.effect}</span>
          </span>
        ) : (
          <span className="mt-0.5 block truncate text-xs">
            {inLineup.length
              ? inLineup.map((x, i) => <span key={x.key} className={x.cls}>{i ? ' · ' : ''}{x.label}</span>)
              : <span className="text-gray-500">{s.cond}</span>}
          </span>
        )}
      </Box>
    </li>
  );
}

/** 정비·경기 화면용: 실제로 적용되는(완성된) 시너지만 */
function SynergyPanel({ roster, focusId, onFocus }) {
  const list = sortSynergies(checkSynergies(roster)).filter((s) => s.active);
  return (
    <section className="ui-cut ui-frame ui-glass p-3" style={{ '--c': '12px' }}>
      <PanelTitle aside={`${list.length} On`}>적용 중인 시너지</PanelTitle>
      {list.length
        ? <ul className="flex flex-col gap-1.5">{list.map((s) => <SynergyRow key={s.id} s={s} focused={focusId === s.id} onFocus={onFocus} />)}</ul>
        : <p className="text-xs text-gray-500">완성된 시너지가 없습니다.</p>}
    </section>
  );
}

/** 드래프트 중에는 숨기고 드래프트가 끝난 뒤(정비·시즌)에만 보여 주는 시너지 — 최종 엔트리로 정해지는 것 */
const DRAFT_HIDDEN = new Set(['franchise']);

/** 드래프트용 (구장 위 도크 안): 한 칸이라도 채운 시너지 + 고른 후보가 올려 줄 시너지 */
function SynergyTracker({ roster, candidate, focusId, onFocus, onOpenAll }) {
  const after = candidate ? previewSynergies(roster, candidate) : null;
  const list = sortSynergies(checkSynergies(roster))
    .filter((s) => !DRAFT_HIDDEN.has(s.id) && (s.cur > 0 || synergyGrows(s, after?.get(s.id))));
  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="mb-1 flex items-center justify-between gap-2 pl-3">
        <h3 className="text-sm font-bold text-white">시너지 <span className="ml-1 font-display text-sm tabular-nums text-gray-400">{list.filter((s) => s.active).length} On</span></h3>
        <button type="button" onClick={onOpenAll}
          className="rounded px-1.5 py-0.5 text-xs font-semibold text-[#10b981] hover:bg-[#10b981]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]">전체 보기</button>
      </div>
      {list.length
        ? (
          <ul className="syn-scroll min-h-0 flex-1 overflow-y-auto pr-1.5">
            {list.map((s) => <SynergyRow key={s.id} s={s} after={after?.get(s.id)} candidate={candidate} focused={focusId === s.id} onFocus={onFocus} />)}
          </ul>
        )
        : <p className="pl-3 text-xs text-gray-400">선수를 영입하면 시너지가 나타납니다.</p>}
    </section>
  );
}

/* ───── 가운데 팝업 카드 (배경 어둡게 · 바깥 클릭/Esc 로 닫기) ───── */
function Modal({ title, eyebrow, onClose, bar, bodyKey, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#03050a]/70 px-4 py-10 backdrop-blur-[5px] animate-[fade_.15s_ease-out_both]" onClick={onClose} role="presentation">
      <section role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="ui-cut ui-frame ui-glass2 w-full max-w-lg animate-[rise_.25s_ease-out_both] shadow-[0_24px_60px_-12px_rgba(0,0,0,.8)]" style={{ '--c': '22px' }}>
        <header className={`flex items-start justify-between gap-4 px-6 pt-5 ${bar ? 'pb-3' : 'border-b border-white/10 pb-4'}`}>
          <div>
            {eyebrow && <p className="ui-lab font-display">{eyebrow}</p>}
            <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" autoFocus
            className="grid h-9 w-9 place-items-center text-gray-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </header>
        {bar}
        {/* bodyKey 가 바뀌면(규칙 탭 전환) 스크롤을 맨 위로 */}
        <div key={bodyKey} className="pop-scroll max-h-[70vh] overflow-y-auto py-4 pl-6 pr-5">{children}</div>
      </section>
    </div>
  );
}

/* 드래프트 규칙 팝업: 위 큰 탭 카드(3×2)로 섹션을 고르고, 섹션 안 구역은 눌러 열고 닫는다 (섹션을 열면 첫 구역만 펼침) */
function RulesModal({ onClose }) {
  const [tab, setTab] = useState(RULE_TABS[0].id);
  const [open, setOpen] = useState(() => new Set([`${RULE_TABS[0].id}:0`]));
  const sec = RULE_TABS.find((s) => s.id === tab);
  const pickTab = (id) => { setTab(id); setOpen(new Set([`${id}:0`])); };
  const toggle = (key) => setOpen((o) => { const n = new Set(o); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const bar = (
    <nav className="rl-tabs border-b border-white/10 px-4 pb-3 sm:px-6" role="tablist" aria-label="규칙 섹션">
      {RULE_TABS.map((s) => (
        <button key={s.id} type="button" role="tab" aria-selected={s.id === tab} className={s.id === tab ? 'on' : ''} onClick={() => pickTab(s.id)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{s.icon}</svg>{s.label}
        </button>
      ))}
    </nav>
  );
  return (
    <Modal eyebrow="How to Draft" title="드래프트 규칙" onClose={onClose} bar={bar} bodyKey={tab}>
      <p className="rl-lead">{sec.lead}</p>
      {sec.groups.map((g, i) => {
        const key = `${tab}:${i}`;
        const on = open.has(key);
        return (
          <div key={key} className={`rl-grp${on ? ' open' : ''}`}>
            <button type="button" className="rl-hd" aria-expanded={on} onClick={() => toggle(key)}>
              <span className="rl-tx"><span className="rl-t">{g.t}</span><span className="rl-sm">{g.s}</span></span>
              <svg className="rl-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
            </button>
            {on && <div className="rl-bd">{g.b}</div>}
          </div>
        );
      })}
    </Modal>
  );
}

function SynergySheet({ roster, candidate, focusId, onFocus, draft = false }) {
  const after = candidate ? previewSynergies(roster, candidate) : null;
  const list = sortSynergies(checkSynergies(roster)).filter((s) => !(draft && DRAFT_HIDDEN.has(s.id)));
  return (
    <>
      <p className="mb-2 text-xs text-gray-400">완성하면 해당 선수만 강해집니다. 누르면 해당 선수를 보여줍니다.</p>
      <ul>
        {list.map((s) => <SynergyRow key={s.id} s={s} after={after?.get(s.id)} candidate={candidate} focused={focusId === s.id} onFocus={onFocus} />)}
      </ul>
    </>
  );
}

function AugmentShelf({ augments, total = SEASON_AUGMENTS }) {
  return (
    <section className="ui-cut ui-frame ui-glass p-3" style={{ '--c': '12px' }}>
      <PanelTitle aside={`${augments.length}/${total}`}>보유 증강</PanelTitle>
      {augments.length === 0 ? (
        <p className="text-xs leading-relaxed text-gray-500">{total ? `엔트리를 채우고 정비를 마친 뒤 시즌을 시작하면 증강 ${total}개를 고릅니다.` : '이번 모드는 증강 없이 경기합니다.'}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {augments.map((a) => (
            <li key={a.id} className="ui-cut bg-white/[0.045] px-2.5 py-2 text-gray-100" style={{ '--c': '7px', boxShadow: `inset 3px 0 0 ${TIER_NEON[a.tier]}` }}>
              <span className="text-sm font-bold">{a.name}</span>
              <p className="mt-0.5 text-xs text-gray-400">[{a.cond}]</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ───── 증강 / 이벤트 선택 오버레이: 선수 카드와 같은 틀에 등급 네온 + 전면 일러스트(public/augments/<id>.webp) ───── */
const TierIcon = ({ tier }) => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="currentColor" aria-hidden="true">
    {tier === 'prismatic' ? <path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z" />
      : tier === 'gold' ? <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5-4.9-4.6 6.6-.8z" />
        : <path d="M13 2 4 14h6l-1 8 9-12h-6z" />}
  </svg>
);

function ChoiceCard({ option: o, index, onChoose }) {
  const art = useImage(`augments/${o.id}.webp`);
  const acc = TIER_NEON[o.tier];
  return (
    <section style={{ '--a': acc, '--c': '22px', animationDelay: `${120 + index * 110}ms` }}
      className="ui-choice ui-cut ui-frame group relative flex h-[30rem] w-[20rem] flex-col overflow-hidden bg-[#05080f] text-left animate-[rise_.45s_ease-out_both] transition-transform duration-200 hover:-translate-y-2 focus-within:-translate-y-2">
      {art
        ? <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_18%] brightness-[.78] saturate-[.8] transition duration-300 group-hover:brightness-100 group-hover:saturate-100 group-focus-within:brightness-100 group-focus-within:saturate-100" />
        : <span className="absolute inset-0" style={{ background: `radial-gradient(80% 50% at 50% 30%, ${acc}40, transparent 70%)` }} />}
      <span className="absolute inset-0" style={{ background: `radial-gradient(80% 45% at 50% 28%, ${acc}33, transparent 70%), linear-gradient(180deg, rgba(5,8,15,.72) 0%, rgba(5,8,15,0) 20%, rgba(5,8,15,0) 36%, rgba(5,8,15,.9) 58%, #05080f 100%)` }} />
      <span className="ui-scan absolute inset-0 opacity-70" />
      <div className="absolute inset-x-5 top-5 z-10 flex items-center justify-between">
        <span className="ui-cut px-3 py-0.5 font-display text-[13px] font-extrabold tracking-[0.34em] text-[#05080f]" style={{ '--c': '6px', background: acc }}>{TIER_EN[o.tier]}</span>
        <span className="grid h-12 w-[42px] place-items-center" style={{ color: acc, background: `color-mix(in srgb, ${acc} 22%, rgba(5,8,15,.75))`, clipPath: 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)' }}><TierIcon tier={o.tier} /></span>
      </div>
      <div className="relative z-10 mt-auto px-6 pb-5">
        <h3 className="text-[1.7rem] font-black leading-tight text-white" style={{ textShadow: `0 0 24px ${acc}88, 0 2px 8px #000`, textWrap: 'balance' }}>{o.name}</h3>
        <p className="mt-2 min-h-[2.75rem] text-sm leading-relaxed text-gray-200 [text-shadow:0_1px_4px_#000]">{o.desc}</p>
        <p className="mt-3 border-t pt-2.5 text-xs font-semibold" style={{ borderColor: `${acc}55`, color: acc }}>조건 · {o.cond}</p>
        <button type="button" onClick={() => onChoose(o)} className="ui-btn ui-cut mt-3 w-full">선택</button>
      </div>
    </section>
  );
}

function ChoiceOverlay({ choice, onChoose, picksLeft = 0, total = SEASON_AUGMENTS }) {
  if (!choice) return null;
  const isAug = choice.kind === 'augment';
  const nth = total - picksLeft + 1;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label={isAug ? '증강 선택' : '시즌 돌발 이벤트'}>
      <div className="ui-bg" style={{ backgroundImage: `url(ui/${isAug ? 'field' : 'tunnel'}.webp)` }} />
      <div className="fixed inset-0 bg-[#03050a]/70 backdrop-blur-[3px]" />
      <div className="relative flex min-h-full flex-col items-center justify-center gap-8 px-4 py-10">
        <div className="text-center animate-[rise_.4s_ease-out_both]">
          <p className="ui-lab font-display" style={{ '--a': '#e879f9' }}>{isAug ? 'Season Augment' : 'Season Event'}</p>
          <h2 className="mt-2 text-4xl font-black text-white">
            {isAug ? '시즌 증강을 고르세요' : '시즌 돌발 이벤트'}
            {isAug && picksLeft > 0 && <span className="ml-3 font-display font-extrabold text-fuchsia-400">{nth} / {total}</span>}
          </h2>
          <p className="mt-2 text-sm text-gray-400">{isAug ? '경기 중 조건이 충족되면 난수 판정을 무시하고 이닝 결과를 확정합니다.' : '구단 운영 방향을 결정하세요. 선택은 되돌릴 수 없습니다.'}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          {choice.options.map((o, i) => <ChoiceCard key={o.id} option={o} index={i} onChoose={onChoose} />)}
        </div>
      </div>
    </div>
  );
}

/* ───── 전광판 ───── */
function Scoreboard({ board, half, myName, oppName }) {
  const total = (arr) => arr.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  const rows = [
    { key: 'away', name: oppName, arr: board.away, top: true },
    { key: 'home', name: myName, arr: board.home, top: false },
  ];
  const leader = total(board.home) > total(board.away) ? 'home' : total(board.away) > total(board.home) ? 'away' : null;
  return (
    <div className="ui-cut ui-frame ui-glass2 overflow-x-auto px-3 py-2.5" style={{ '--c': '14px' }}>
      <table className="w-full min-w-[600px] border-collapse font-display">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            <th className="px-3 pb-1 text-left">Team</th>
            {Array.from({ length: 9 }, (_, i) => <th key={i} className="w-11 pb-1">{i + 1}</th>)}
            <th className="w-14 pb-1 text-[#10b981]">R</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-white/[0.07]">
              <td className="whitespace-nowrap px-3 py-1 font-sans text-base font-bold text-white">
                <span className="mr-2.5 inline-block h-5 w-1.5 -skew-x-12 align-middle" style={{ background: r.top ? '#f87171' : '#10b981' }} />
                <span className="mr-2 font-display text-[10px] font-semibold tracking-widest text-gray-500">{r.top ? 'AWAY' : 'HOME'}</span>{r.name}
              </td>
              {r.arr.map((v, i) => {
                const live = half && half.inning === i + 1 && half.isTop === r.top;
                return (
                  <td key={i} style={v !== null ? { animation: 'cellIn .8s ease-out' } : undefined}
                    className={`h-11 text-center text-2xl font-bold tabular-nums ${live ? 'bg-[#10b981]/15 shadow-[inset_0_-2px_0_#10b981]' : ''} ${v === null ? 'text-gray-700' : v === 0 ? 'text-gray-500' : 'text-white'}`}>
                    {v === null ? (live ? <span className="text-base text-[#10b981]">●</span> : '') : v}
                  </td>
                );
              })}
              <td className={`text-center text-3xl font-bold tabular-nums ${leader === r.key ? 'text-[#10b981] [text-shadow:0_0_14px_rgba(16,185,129,.6)]' : 'text-white'}`}>{total(r.arr)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───── 중계 로그 ───── */
function LiveLog({ logs, paused }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs.length]);
  return (
    <section className="ui-cut ui-frame ui-glass flex min-h-0 flex-col" style={{ '--c': '14px' }}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <h3 className="ui-lab font-display">Play-by-Play <span className="font-sans text-sm normal-case tracking-normal text-white">문자 중계</span></h3>
        {paused && <span className="text-xs font-bold text-[#10b981]">하이라이트 · 일시정지</span>}
      </div>
      <ol ref={ref} className="syn-scroll flex max-h-[26rem] flex-col gap-1 overflow-y-auto p-2">
        {logs.map((l) => {
          const inn = l.inning ? `${l.inning}회${l.isTop ? '초' : '말'}` : '';
          if (l.kind === 'augment') {
            const cut = l.text.indexOf('] ');
            return (
              <li key={l.id} className="animate-[rise_.3s_ease-out_both] bg-white/[0.045] px-3 py-2 text-sm" style={{ boxShadow: `inset 3px 0 0 ${TIER_NEON[l.tier]}` }}>
                <span className="mr-2 font-display text-xs font-semibold text-gray-500">{inn}</span>
                <span className="font-bold" style={{ color: TIER_NEON[l.tier] }}>{cut > 0 ? l.text.slice(0, cut + 1) : ''}</span>
                <span className="text-white"> {cut > 0 ? l.text.slice(cut + 2) : l.text}</span>
              </li>
            );
          }
          return (
            <li key={l.id} className={`grid grid-cols-[3.25rem_1fr_auto] items-baseline gap-2 rounded px-2 py-1 text-sm ${l.kind === 'system' ? 'text-gray-400' : l.kind === 'score' ? 'bg-white/[0.03] text-white' : 'text-gray-400'}`}>
              <span className="font-display text-xs font-semibold text-gray-500">{inn}</span>
              <span>{l.text}</span>
              {l.runs > 0 && <span className="font-display font-bold tabular-nums text-white">+{l.runs}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ───── 증강 발동 토스트 ───── */
/* 중계 하이라이트: 활약 선수 카드 그림 + 증강 이름을 굵은 기울임 글자로 */
function HighlightToast({ toast }) {
  const art = useArt(toast?.hero);
  if (!toast) return null;
  const { augment, text, hero } = toast;
  const acc = TIER_NEON[augment.tier];
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[16vh] z-40 flex justify-center px-4" aria-live="assertive">
      <div key={toast.key} className="flex w-full max-w-3xl animate-[toast_1.7s_ease_both] drop-shadow-[0_18px_40px_rgba(0,0,0,.6)]" style={{ '--a': acc }}>
        {hero && (
          <div className="ui-cut ui-frame relative hidden w-44 shrink-0 bg-[#0b1220] bg-cover bg-no-repeat sm:block"
            style={{ '--c': '18px', backgroundImage: art ? `url(${art})` : undefined, backgroundPosition: '60% 18%' }} />
        )}
        <div className={`ui-glass2 relative flex-1 py-5 pr-8 ${hero ? 'pl-10 sm:-ml-4' : 'pl-8'}`}
          style={{ clipPath: 'polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%)' }}>
          <p className="ui-lab font-display">Highlight · {TIER_EN[augment.tier]} Augment</p>
          <p className="mt-1 font-display text-5xl font-extrabold italic leading-none text-white" style={{ textShadow: `0 0 30px ${acc}`, textWrap: 'balance' }}>{augment.name}!</p>
          <p className="mt-2 text-base text-gray-100">{text}</p>
        </div>
      </div>
    </div>
  );
}

/* ───── 공통: 컷 코너 프로필 얼굴 ───── */
function Portrait({ player, className = 'h-10 w-8' }) {
  const bust = useBust(player, '300%');
  return (
    <span className={`ui-cut relative block shrink-0 bg-[#0b1220] bg-no-repeat ${className}`}
      style={{ '--c': '6px', ...bust, boxShadow: `inset 0 0 0 1px ${player && !player.isReplacement ? neonOf(player) : '#334155'}99` }} />
  );
}

/* ───── 경기 전 매치업: 두 팀 타순 · 선발 맞대결 · 예상 승리 확률 ───── */
const teamOvr = (team) => Math.round(avg(team.roster.map((p) => p.overall)));
const teamPower = (t) => t.offense * 0.45 + t.pitchValue(t.sps[0]) * 0.35 + t.defense * 0.2;
const winChance = (my, opp) => 1 / (1 + Math.exp(-(teamPower(my) - teamPower(opp)) / 3.2));

function MatchRow({ player, label, mine }) {
  return (
    <div className={`ui-cut flex h-11 items-center gap-2.5 bg-white/[0.045] px-2 ${mine ? '' : 'flex-row-reverse text-right'}`} style={{ '--c': '6px' }}>
      <span className="w-6 shrink-0 text-center font-display text-sm font-bold text-gray-500">{label}</span>
      <Portrait player={player} className="h-9 w-7" />
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{player.name} <small className="font-display text-[11px] font-semibold text-gray-500">{player.slot || player.position}</small></span>
      <span className="font-display text-lg font-bold tabular-nums" style={{ color: player.isReplacement ? '#64748b' : neonOf(player) }}>{player.overall}</span>
    </div>
  );
}

function DuelCard({ player, label }) {
  const bust = useBust(player, '260%');
  const acc = neonOf(player);
  return (
    <div className="ui-cut ui-frame relative h-[19rem] w-[13rem] overflow-hidden bg-[#0b1220] bg-no-repeat" style={{ '--c': '20px', '--a': acc, ...bust }}>
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#05080f] via-[#05080f]/90 to-transparent px-4 pb-3 pt-10 text-left">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: acc }}>{label}</p>
        <p className="text-2xl font-black text-white">{player.name}</p>
        <p className="text-xs text-gray-300">{player.year} {player.team} · 구위 {player.stats.stuff} · 체력 {player.stats.stamina}</p>
      </div>
    </div>
  );
}

function MatchupScreen({ roster, oppRoster, buff, oppBuff = 0, augments, onStart, onBack }) {
  const my = useMemo(() => buildTeam('나의 드림팀', fillRoster(roster), buff), [roster, buff]);
  const opp = useMemo(() => buildTeam('AI 올스타', fillRoster(oppRoster), oppBuff), [oppRoster, oppBuff]);
  const pct = Math.round(winChance(my, opp) * 100);
  const side = (team, name, acc, mine) => (
    <section className="ui-cut ui-frame ui-glass flex flex-col gap-1.5 p-4" style={{ '--c': '18px', '--a': acc }}>
      <div className={`mb-1 flex items-end justify-between border-b border-white/10 pb-2.5 ${mine ? '' : 'flex-row-reverse text-right'}`}>
        <div>
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.3em] text-gray-500">{mine ? 'My Team' : 'AI Opponent'}</p>
          <h3 className="text-2xl font-black text-white">{name}</h3>
        </div>
        <p className="font-display text-5xl font-extrabold leading-none tabular-nums" style={{ color: acc, textShadow: `0 0 22px ${acc}88` }}>{teamOvr(team)}</p>
      </div>
      {team.batters.map((b, i) => <MatchRow key={b.id} player={b} label={i + 1} mine={mine} />)}
      <p className={`mt-1 font-display text-[11px] font-bold tracking-[0.3em] text-gray-500 ${mine ? '' : 'text-right'}`}>MOUND</p>
      {[team.sps[0], team.mr, team.rp].filter(Boolean).map((x) => <MatchRow key={x.id} player={x} label={x.slot} mine={mine} />)}
    </section>
  );
  return (
    <section className="grid gap-5 animate-[fade_.3s_ease-out_both] lg:grid-cols-[21rem_minmax(0,1fr)_21rem]">
      {side(my, '나의 드림팀', '#10b981', true)}
      <div className="flex flex-col items-center text-center">
        <p className="ui-lab font-display">Play Ball</p>
        <h2 className="mt-1 text-4xl font-black text-white">선발 맞대결</h2>
        <div className="relative mt-6 flex items-end justify-center gap-5">
          <DuelCard player={my.sps[0]} label="My Starter" />
          <span className="absolute left-1/2 top-[42%] z-10 -translate-x-1/2 -translate-y-1/2 font-display text-7xl font-extrabold italic text-white [text-shadow:0_0_30px_rgba(255,255,255,.5),0_4px_0_rgba(0,0,0,.6)]">VS</span>
          <DuelCard player={opp.sps[0]} label="AI Starter" />
        </div>
        <div className="mt-6 w-full max-w-md">
          <div className="flex justify-between font-display text-2xl font-bold tabular-nums"><span className="text-[#10b981]">{pct}%</span><span className="text-red-400">{100 - pct}%</span></div>
          <div className="mt-1.5 flex h-3 gap-1">
            <i className="-skew-x-12 bg-[#10b981] shadow-[0_0_10px_#10b981]" style={{ flex: pct }} />
            <i className="-skew-x-12 bg-red-400" style={{ flex: 100 - pct }} />
          </div>
          <p className="mt-1.5 text-xs text-gray-400">예상 승리 확률 · 타선 · 에이스 · 수비력 비교 (증강 발동은 제외)</p>
        </div>
        {augments.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {augments.map((a) => <span key={a.id} className="ui-chip ui-cut" style={{ '--a': TIER_NEON[a.tier] }}><b className="font-display" style={{ color: TIER_NEON[a.tier] }}>{TIER_EN[a.tier]}</b>{a.name}</span>)}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" className="ui-btn ui-cut min-h-[3.25rem]" onClick={onBack}>라인업 다시 보기</button>
          <button type="button" className="ui-btn ui-cut pri min-h-[3.25rem] px-12 text-lg" onClick={onStart} autoFocus>경기 시작 ▶</button>
        </div>
      </div>
      {side(opp, 'AI 올스타', '#f87171', false)}
    </section>
  );
}

/* ───── 경기 중 중계 자막: 지금 타석의 타자 · 마운드의 투수 ───── */
function Plate({ player, label }) {
  const bust = useBust(player, '300%');
  if (!player) return <div />;
  const acc = player.isReplacement ? '#64748b' : neonOf(player);
  const keys = player.type === 'batter' ? ['power', 'contact', 'speed'] : ['stuff', 'control', 'stamina'];
  return (
    <div className="ui-cut ui-glass2 flex gap-3 p-2.5 animate-[fade_.25s_ease-out_both]" style={{ '--c': '14px' }}>
      <span className="ui-cut ui-frame relative block h-[5.5rem] w-[4.5rem] shrink-0 bg-[#0b1220] bg-no-repeat" style={{ '--c': '10px', '--a': acc, ...bust }} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: acc }}>{label}</p>
        <p className="truncate text-xl font-black leading-tight text-white">{player.name}</p>
        <p className="truncate text-xs text-gray-400">{player.year} {player.team} · {POS_LABEL[player.position]}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {keys.map((k) => (
            <span key={k} className="ui-cut bg-white/[0.05] px-2 py-0.5 text-[10px] text-gray-400" style={{ '--c': '4px' }}>{STAT_LABELS[k]} <b className="font-display text-sm text-white">{player.stats[k]}</b></span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BroadcastPlates({ log }) {
  if (!log) return null;
  const mineAtBat = !log.isTop; // 사용자 팀은 홈(말 공격)
  const batter = log.hero?.type === 'batter' ? log.hero : null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Plate key={`b-${batter?.id || 'none'}`} player={batter} label={`At Bat · ${mineAtBat ? '나의 드림팀' : 'AI 올스타'}`} />
      <Plate key={`p-${log.pitcher?.id || 'none'}`} player={log.pitcher} label={`Pitching · ${mineAtBat ? 'AI 올스타' : '나의 드림팀'}`} />
    </div>
  );
}

/* ───── 경기 결과: WIN/LOSE · MVP 카드 · 결정적 순간 · 선수 평점 ───── */
const gradeOf = (pts) => (pts >= 12 ? 'A+' : pts >= 8 ? 'A' : pts >= 5 ? 'B+' : pts >= 2.5 ? 'B' : pts >= 0 ? 'C' : 'D');

function ResultPanel({ result, record, logs, onRematch, onNewOpp, onNewDraft }) {
  const { winner, score, mvpPlayer: mvp, mvp: stat, credits = [] } = result;
  const tone = winner === 'my' ? '#10b981' : winner === 'opp' ? '#f87171' : '#cbd5e1';
  const moments = logs.filter((l) => l.kind === 'augment' || (l.kind === 'score' && l.runs >= 2)).slice(-3);
  const lines = mvp.type === 'pitcher'
    ? [['무실점 이닝', stat.zero], ['증강 발동', stat.fires], ['종합', mvp.overall]]
    : [['득점 이닝', stat.runs], ['증강 발동', stat.fires], ['종합', mvp.overall]];
  return (
    <section className="ui-cut ui-frame ui-glass2 grid gap-6 p-6 animate-[rise_.35s_ease-out_both] lg:grid-cols-[16rem_minmax(0,1fr)_19rem]" style={{ '--c': '26px', '--a': tone }}>
      <div className="flex flex-wrap items-end gap-6 border-b border-white/10 pb-4 lg:col-span-3">
        <p className="font-display text-8xl font-extrabold italic leading-[.8]" style={{ color: tone, textShadow: `0 0 40px ${tone}99` }}>{winner === 'my' ? 'WIN' : winner === 'opp' ? 'LOSE' : 'DRAW'}</p>
        <div>
          <p className="mb-1 text-xs text-gray-400">나의 드림팀 vs AI 올스타</p>
          <p className="font-display text-6xl font-extrabold leading-[.9] tabular-nums text-white">{score.my}<span className="mx-3 text-gray-600">:</span>{score.opp}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">Season</p>
          <p className="font-display text-4xl font-extrabold leading-none tabular-nums text-white">{record.w}승 {record.l}패{record.d ? ` ${record.d}무` : ''}</p>
        </div>
      </div>
      <div className="relative">
        <span className="ui-cut absolute -left-2 top-4 z-20 bg-amber-400 px-4 py-1 font-display text-lg font-extrabold tracking-[0.24em] text-[#05080f]" style={{ '--c': '8px' }}>MVP</span>
        <PlayerCard player={mvp} reason={null} onSelect={() => {}} style={{ animation: 'none' }} />
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-gray-500">MVP · {mvp.name}</p>
        <dl className="ui-cut grid grid-cols-3 bg-white/[0.045]" style={{ '--c': '10px' }}>
          {lines.map(([k, v], i) => (
            <div key={k} className={`px-4 py-2.5 ${i ? 'border-l border-white/10' : ''}`}>
              <dt className="text-[11px] text-gray-400">{k}</dt>
              <dd className="font-display text-3xl font-bold tabular-nums" style={{ color: neonOf(mvp) }}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 font-display text-xs font-bold uppercase tracking-[0.3em] text-gray-500">결정적 순간</p>
        {moments.length ? moments.map((l) => {
          const c = l.kind === 'augment' ? TIER_NEON[l.tier] : '#10b981';
          return (
            <div key={l.id} className="ui-cut grid grid-cols-[3.5rem_1fr] items-center gap-3 bg-white/[0.045] px-3 py-2" style={{ '--c': '8px', boxShadow: `inset 3px 0 0 ${c}` }}>
              <span className="font-display text-sm font-bold" style={{ color: c }}>{l.inning}회{l.isTop ? '초' : '말'}</span>
              <span className="text-sm text-gray-100">{l.text}</span>
            </div>
          );
        }) : <p className="text-sm text-gray-500">큰 장면 없이 끝난 경기입니다.</p>}
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-gray-500">선수 평점</p>
        {credits.slice(0, 7).map((c) => (
          <div key={c.player.id} className="grid grid-cols-[2rem_minmax(0,1fr)_2.75rem] items-center gap-2.5 py-1">
            <Portrait player={c.player} className="h-10 w-8" />
            <span className="min-w-0">
              <b className="block truncate text-sm text-white">{c.player.name}</b>
              <small className="block truncate text-[11px] text-gray-500">{c.player.slot || c.player.position} · {c.player.year} {c.player.team}</small>
            </span>
            <span className="text-center font-display text-2xl font-extrabold" style={{ color: neonOf(c.player) }}>{gradeOf(c.pts)}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-end gap-2 lg:col-span-3">
        <button type="button" className="ui-btn ui-cut" onClick={onNewDraft}>새 드래프트</button>
        <button type="button" className="ui-btn ui-cut" onClick={onNewOpp}>새 AI 상대와 경기</button>
        <button type="button" className="ui-btn ui-cut pri" onClick={onRematch}>같은 상대와 재경기 ▶</button>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   메인 컴포넌트 — 상태 관리 · 드래프트 핸들러 · 시뮬레이션 연결
   ════════════════════════════════════════════════════════════════════ */

/* ───── 첫 화면: 드래프트 모드 선택 (모드 탭 · 모드 안 시리즈 미리보기 · 경기 설정) ───── */
/** 모드에서 열리는 시리즈를 대표 선수 카드로. 레전드 모드는 시리즈가 하나라 대표 선수들을, 최근 시즌은 준비 중인 시즌까지 */
function ticketsOf(mode) {
  // 레전드가 한 묶음뿐일 때는 대표 선수로 티켓을 만든다 (구단별 레전드 시리즈가 생기면 시리즈 티켓)
  if (mode.id === 'legend' && mode.series.length === 1) {
    return [...mode.players].sort((a, b) => b.overall - a.overall).slice(0, 12)
      .map((p) => ({ key: p.id, year: p.year, title: p.name, sub: `${p.team} · ${POS_LABEL[p.position]} · 종합 ${p.overall}`, star: p }));
  }
  const list = mode.series.map((s) => ({
    key: s.id, year: s.year || 'ALL', title: s.title, sub: `${s.subtitle || SERIES_KIND_LABEL[s.kind]} · ${s.players.length}명`,
    star: [...s.players].sort((a, b) => b.overall - a.overall)[0], champ: !!s.champion,
  }));
  return [...list, ...(mode.planned || []).map((t) => ({ key: t, year: t.slice(0, 4), title: t.slice(5), sub: '데이터 조사 후 공개', locked: true }))];
}

function SeriesTicket({ t, acc }) {
  const art = useArt(t.star);
  return (
    <div className="ui-cut relative h-full min-h-[11rem] overflow-hidden bg-[#0b1220] bg-cover bg-no-repeat"
      style={{ '--c': '12px', backgroundImage: art ? `url(${art})` : undefined, backgroundPosition: '60% 18%' }}>
      <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.55),rgba(5,8,15,0) 30%,rgba(5,8,15,0) 45%,rgba(5,8,15,.92) 72%,#05080f)' }} />
      {t.locked && <span className="absolute inset-0 grid place-items-center bg-[repeating-linear-gradient(135deg,rgba(255,255,255,.03)_0_8px,transparent_8px_16px)] text-xs font-semibold text-gray-500">준비 중</span>}
      <span className={`absolute left-3 top-2 font-display text-3xl font-extrabold leading-none ${t.locked ? 'text-gray-600' : ''}`}
        style={t.locked ? undefined : { color: acc, textShadow: `0 0 16px ${acc}88, 0 2px 4px #000` }}>{t.year}</span>
      {t.champ && <span className="ui-cut absolute right-2.5 top-2.5 bg-amber-400 px-2 font-display text-[11px] font-extrabold tracking-[0.14em] text-[#05080f]" style={{ '--c': '5px' }} title="한국시리즈 우승">V</span>}
      <div className="absolute inset-x-3 bottom-2.5">
        <p className={`truncate text-base font-black ${t.locked ? 'text-gray-500' : 'text-white'}`}>{t.title}</p>
        <p className="truncate text-[11px] text-gray-400">{t.sub}</p>
      </div>
    </div>
  );
}

function SettingRow({ label, options, labels, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 py-2.5 text-sm text-gray-300">
      <span>{label}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)}
            className={`ui-cut px-2.5 py-0.5 font-display text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${value === o ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400 hover:text-white'}`}
            style={{ '--c': '5px', background: value === o ? 'var(--a)' : undefined }}>
            {labels ? labels[o] : o}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModeSelect({ initialMode, record, onStart }) {
  const [id, setId] = useState(initialMode);
  const mode = DRAFT_MODES.find((m) => m.id === id);
  const [cap, setCap] = useState(mode.cap);
  const [ai, setAi] = useState('normal');
  const [aug, setAug] = useState(SEASON_AUGMENTS);
  const pick = (m) => { setId(m.id); setCap(m.cap); };
  const tickets = ticketsOf(mode);
  const seen = new Set();
  const stars = [...mode.players].sort((a, b) => b.overall - a.overall).filter((p) => !seen.has(personKey(p)) && seen.add(personKey(p))).slice(0, 6);
  return (
    <div className="relative flex min-h-screen flex-col lg:h-dvh lg:min-h-0">
      <header className="relative z-10 flex h-16 shrink-0 items-center gap-8 border-b border-[#10b981]/25 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))] px-6">
        <span className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-64 bg-gradient-to-r from-[#10b981] to-transparent" aria-hidden="true" />
        <div className="leading-none">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">Legend Draft</p>
          <h1 className="mt-1 text-xl font-black leading-none text-white">레전드 드래프트</h1>
        </div>
        <ol className="hidden items-center gap-1.5 font-display text-xs font-bold tracking-[0.2em] text-gray-500 md:flex" aria-label="진행 단계">
          {['모드', '드래프트', '정비', '시즌'].map((s, i) => (
            <li key={s} className={`ui-cut px-2 py-0.5 ${i === 0 ? 'bg-[#10b981] text-[#05080f]' : 'shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]'}`} style={{ '--c': '4px' }}>0{i + 1} {s}</li>
          ))}
        </ol>
        {record && <p className="ml-auto text-sm text-gray-400">최근 기록 <b className="font-display text-lg text-white">{record}</b></p>}
      </header>

      <div role="tablist" aria-label="드래프트 모드" className="relative grid grid-cols-2 gap-2 px-6 pt-4 sm:grid-cols-3 lg:grid-cols-5">
        {DRAFT_MODES.map((m) => {
          const on = m.id === id;
          return (
            <button key={m.id} type="button" role="tab" aria-selected={on} onClick={() => pick(m)}
              className={`ui-cut relative flex h-[4.4rem] items-center gap-3 overflow-hidden px-3.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${on ? '' : 'ui-glass hover:brightness-125'}`}
              style={{ '--c': '10px', background: on ? `linear-gradient(180deg, ${m.neon}38, rgba(6,10,19,.92))` : undefined }}>
              <span className="ui-cut h-[3.2rem] w-11 shrink-0 bg-cover bg-center" style={{ '--c': '8px', backgroundImage: `url(modes/${m.id}.webp)`, filter: on ? undefined : 'saturate(.7) brightness(.75)' }} />
              <span className="min-w-0">
                <b className="block truncate text-base font-black text-white">{m.name}</b>
                <small className="font-display text-[11px] tracking-[0.12em] text-gray-400">{m.series.length} 시리즈 · {m.players.length}명</small>
              </span>
              {on && <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: m.neon, boxShadow: `0 0 12px ${m.neon}` }} />}
            </button>
          );
        })}
      </div>

      <div className="relative grid min-h-0 flex-1 gap-4 px-6 pb-6 pt-4 lg:grid-cols-[minmax(0,1fr)_24rem]" style={{ '--a': mode.neon }}>
        <section key={mode.id} className="ui-cut ui-frame ui-glass flex min-h-0 flex-col p-5 animate-[fade_.25s_ease-out_both]" style={{ '--c': '20px' }}>
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="ui-lab font-display">Series in Mode</p>
            <p className="text-sm text-gray-400">
              {mode.id === 'legend' && mode.series.length === 1 ? `레전드 ${mode.players.length}명 중 대표 선수 · 라운드마다 ${SHELF_SIZE}명이 열립니다` : `이 모드에서 라운드마다 열리는 시리즈 ${mode.series.length}개`}
              {mode.planned ? ` · ${mode.planned.length}개 준비 중` : ''}
            </p>
          </div>
          <div className="syn-scroll mt-3 grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4"
            style={{ gridAutoRows: tickets.length > 8 ? '12.5rem' : 'minmax(11rem, 1fr)' }}>
            {tickets.map((t) => <SeriesTicket key={t.key} t={t} acc={mode.neon} />)}
          </div>
        </section>

        <aside className="ui-cut ui-frame ui-glass flex flex-col gap-4 p-6" style={{ '--c': '20px' }}>
          <p className="ui-lab font-display">{mode.en}</p>
          <h2 className="-mt-2 text-3xl font-black text-white">{mode.name}</h2>
          <p className="text-sm leading-relaxed text-gray-300">{mode.desc}</p>
          <dl className="grid grid-cols-3 gap-1.5">
            {[['시리즈', mode.series.length], ['선수', mode.players.length], ['난이도', mode.tag]].map(([k, v]) => (
              <div key={k} className="ui-cut bg-white/[0.045] px-3 py-1.5" style={{ '--c': '7px' }}>
                <dt className="text-[10px] text-gray-400">{k}</dt>
                <dd className="font-display text-xl font-bold leading-tight text-white">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <SettingRow label="샐러리 캡" options={[mode.cap - 100, mode.cap, mode.cap + 100]} value={cap} onChange={setCap} />
            <SettingRow label="AI 난이도" options={['easy', 'normal', 'hard']} labels={{ easy: '쉬움', normal: '보통', hard: '강함' }} value={ai} onChange={setAi} />
            <SettingRow label="시즌 증강" options={[0, 2, 3]} labels={{ 0: '없음', 2: '2개', 3: '3개' }} value={aug} onChange={setAug} />
            <div className="flex items-center justify-between border-b border-white/10 py-2.5 text-sm text-gray-300">
              <span>다른 시리즈 새로고침</span>
              <span className="ui-cut bg-white/[0.06] px-2.5 font-display font-bold text-white" style={{ '--c': '5px' }}>×{START_REROLLS}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="이 모드의 대표 선수">
            {stars.map((p) => <Portrait key={p.id} player={p} className="h-12 w-10" />)}
          </div>
          <button type="button" className="ui-btn ui-cut pri mt-auto min-h-[3.5rem] w-full text-lg" onClick={() => onStart(mode.id, { cap, ai, aug })}>
            드래프트 시작 ▶
          </button>
        </aside>
      </div>
    </div>
  );
}

/* 드래프트 규칙: 탭(섹션) → 구역 { t 질문, s 한 줄 답, b 펼친 내용 }. 문장은 합니다체 */
const RL_REFUND_EX = { cost: 95 };
const RULE_TABS = [
  { id: 'entry', label: '엔트리',
    icon: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5" /><circle cx="17" cy="9" r="2.3" /><path d="M15.5 14.2c2.4.2 4.2 1.8 4.8 4.8" /></>,
    lead: <>선수 <b>{ROSTER_SIZE}명</b>으로 한 팀을 만듭니다. 포지션마다 정해진 자리에 한 명씩 채웁니다.</>,
    groups: [
      { t: '어떤 자리를 채우나요?', s: `투수 3명과 야수 9명, 모두 ${ROSTER_SIZE}자리입니다.`, b: <>
        <div className="rl-slots">
          <div><span>투수<i>3</i></span><span className="rl-chips"><span className="rl-chip">선발투수</span><span className="rl-chip">중간계투</span><span className="rl-chip">마무리</span></span></div>
          <div><span>내야<i>5</i></span><span className="rl-chips"><span className="rl-chip">포수</span><span className="rl-chip">1루수</span><span className="rl-chip">2루수</span><span className="rl-chip">3루수</span><span className="rl-chip">유격수</span></span></div>
          <div><span>외야<i>3</i></span><span className="rl-chips"><span className="rl-chip">외야수</span><span className="rl-chip">외야수</span><span className="rl-chip">외야수</span></span></div>
          <div><span>지명<i>1</i></span><span className="rl-chips"><span className="rl-chip g">지명타자 · 야수 누구나</span></span></div>
        </div>
        <p>자리가 모두 찬 포지션의 카드에는 <span className="rl-tag">유격수 마감</span>처럼 표시됩니다.</p>
      </> },
      { t: '외국인 선수는 몇 명까지 되나요?', s: `최대 ${FOREIGN_LIMIT}명까지 뽑을 수 있습니다.`, b: <>
        <p>외국인 선수가 {FOREIGN_LIMIT}명이 되면 남은 외국인 카드는 <span className="rl-tag">외국인 한도 {FOREIGN_LIMIT}/{FOREIGN_LIMIT}</span>으로 잠깁니다.</p>
        <p>한 명을 방출하면 다시 뽑을 수 있습니다.</p>
      </> },
      { t: '같은 선수를 또 뽑을 수 있나요?', s: '시즌이 달라도 한 사람은 한 번만 뽑습니다.', b: <>
        <div className="rl-yn">
          <div className="y"><span><b>2006 류현진</b>을 영입합니다.</span></div>
          <div className="n"><span><b>2010 류현진</b>은 <span className="rl-tag">동일인 영입됨</span>으로 잠깁니다.</span></div>
        </div>
      </> },
    ] },
  { id: 'draft', label: '드래프트',
    icon: <><rect x="4" y="5" width="7" height="10" rx="1" /><rect x="13" y="9" width="7" height="10" rx="1" /><path d="M7.5 18v2M16.5 5V3" /></>,
    lead: <><b>{ROSTER_SIZE}라운드</b> 동안 라운드마다 한 명씩 영입합니다. 정해진 CP 안에서 스타와 가성비 선수를 섞는 것이 핵심입니다.</>,
    groups: [
      { t: '한 라운드는 어떻게 진행되나요?', s: '시리즈를 보고, 고르고, 영입합니다.', b: <>
        <div className="rl-steps">
          <div><span>시리즈 하나가 열립니다. 구단의 한 시즌, 국가대표, 레전드 중 하나입니다.</span></div>
          <div><span>선수 카드를 누르면 <b>PICK</b>에 올라 능력치와 영입가를 볼 수 있습니다.</span></div>
          <div><span><b>영입</b>을 누르면 내 라인업에 들어가고 다음 라운드로 넘어갑니다.</span></div>
        </div>
        <div className="rl-tip"><span>마음에 드는 선수가 없으면 <b>새로고침</b>으로 다른 시리즈를 엽니다. 드래프트마다 {START_REROLLS}번 쓸 수 있습니다.</span></div>
      </> },
      { t: 'CP는 얼마나 쓸 수 있나요?', s: '모드 화면에서 정한 샐러리 캡만큼 씁니다.', b: <>
        <p>샐러리 캡은 <span className="rl-chip">700</span> <span className="rl-chip g">800</span> <span className="rl-chip">900</span> CP 중에서 고릅니다.</p>
        <p>영입할 때마다 영입가만큼 줄어들고, 남은 CP보다 비싼 선수는 <span className="rl-tag">CP 부족</span>으로 잠깁니다.</p>
        <div className="rl-tip"><span>PICK에 선수를 올리면 위쪽 캡 막대에 쓰일 CP가 미리 표시됩니다.</span></div>
      </> },
      { t: '영입가는 어떻게 정해지나요?', s: '종합이 높을수록 점수보다 더 비싸집니다.', b: <>
        <div className="rl-tbl">
          <span className="h">종합</span><span className="h">영입가</span><span className="h">차이</span>
          {[95, 90, 80, 65].map((o) => {
            const d = costOf(o) - o;
            return (
              <React.Fragment key={o}>
                <span className="n">{o}</span><span className="n">{costOf(o)}</span>
                <span className={d > 0 ? 'up' : d < 0 ? 'dn' : ''}>{d > 0 ? `${d} CP 더 비쌉니다` : d < 0 ? `${-d} CP 더 쌉니다` : '점수와 같습니다'}</span>
              </React.Fragment>
            );
          })}
        </div>
        <p><b>72~84</b>는 종합과 같은 값이고, <b>85 이상</b>은 비싸지며 <b>71 이하</b>는 쌉니다.</p>
      </> },
      { t: '다 채우지 못하면 어떻게 되나요?', s: '빈 자리는 퓨처스 유망주(종합 55)가 채웁니다.', b: <>
        <p>드래프트는 <b>{ROSTER_SIZE}라운드가 끝나거나</b>, <b>남은 CP로 뽑을 선수가 없으면</b> 끝납니다.</p>
        <p>이때 비어 있는 자리는 모두 종합 55의 퓨처스 유망주로 채워집니다.</p>
        <div className="rl-tip"><span>초반에 CP를 너무 많이 쓰면 마지막 자리를 유망주로 채우게 됩니다.</span></div>
      </> },
    ] },
  { id: 'swap', label: '방출 · 교체',
    icon: <path d="M5 8h13l-3-3M19 16H6l3 3" />,
    lead: <>뽑은 선수를 내보내거나, 이미 찬 자리에 더 좋은 선수를 바로 들일 수 있습니다. 대신 <b>손해</b>가 있습니다.</>,
    groups: [
      { t: '방출은 어떻게 하나요?', s: '내 라인업에서 선수를 누르고 방출을 두 번 누릅니다.', b: <>
        <div className="rl-steps">
          <div><span>내 라인업에서 내보낼 선수를 누릅니다.</span></div>
          <div><span><b>방출</b>을 누르면 <b>한 번 더 누르면 방출</b>로 바뀝니다.</span></div>
          <div><span>한 번 더 누르면 방출됩니다.</span></div>
        </div>
      </> },
      { t: '방출하면 무엇이 달라지나요?', s: '영입가의 절반을 돌려받지만 되돌릴 수 없습니다.', b: <>
        <div className="rl-yn">
          <div className="y"><span>영입가의 <b>절반</b>을 CP로 돌려받습니다. ({RL_REFUND_EX.cost} CP 선수 → {releaseRefund(RL_REFUND_EX)} CP)</span></div>
          <div className="n"><span>방출한 선수는 이번 드래프트에서 <b>다시 영입할 수 없습니다.</b></span></div>
          <div className="n"><span>이미 쓴 라운드는 <b>돌아오지 않습니다.</b></span></div>
          <div className="n"><span>드래프트가 끝난 뒤(정비 화면)에는 방출할 수 없습니다.</span></div>
        </div>
      </> },
      { t: '찬 자리에 선수를 데려오려면?', s: '교체 영입으로 한 번에 맞바꿉니다.', b: <>
        <p>이미 찬 포지션의 선수를 PICK에 올리면 버튼이 <span className="rl-tag">교체 영입 (+{releaseRefund(RL_REFUND_EX)} CP 환불)</span>처럼 바뀝니다.</p>
        <div className="rl-steps">
          <div><span>내 라인업에서 <b>자리를 먼저 눌러 두면</b> 그 자리 선수와 바꿉니다.</span></div>
          <div><span>누르지 않았다면 그 포지션에서 <b>가장 약한 선수</b>와 바꿉니다.</span></div>
        </div>
        <p>나가는 선수는 방출과 같이 처리되고, 교체 영입도 한 라운드를 씁니다.</p>
      </> },
    ] },
  { id: 'pos', label: '포지션',
    icon: <><path d="M12 20 4 12l8-8 8 8z" /><circle cx="12" cy="12" r="1.6" /></>,
    lead: <>선수는 <b>원래 포지션</b>에서 가장 잘합니다. 다른 자리에 세우면 종합이 떨어집니다.</>,
    groups: [
      { t: '다른 자리에 세우면 얼마나 약해지나요?', s: '원래 자리와 멀수록 많이 떨어집니다.', b: <>
        <div className="rl-ladder">
          {[
            ['0', 2, '#34d399', '제자리 · 야수가 지명타자일 때'],
            ['−3', 15, '#a3e635', '비슷한 자리 — 2루↔유격, 1루↔3루, 선발↔불펜, 1루↔지명'],
            ['−6', 30, '#fbbf24', '그 밖의 같은 계열 — 내야↔외야 등'],
            ['−8', 40, '#fb923c', '포수 자리로 가거나 포수가 다른 자리로'],
            ['−20', 100, '#f87171', '투수 ↔ 야수'],
          ].map(([v, w, k, txt]) => (
            <div key={v}><b style={{ color: k }}>{v}</b><i style={{ '--w': `${w}%`, '--k': k }} /><span>{txt}</span></div>
          ))}
        </div>
        <p>내 라인업 선수를 누르면 선 자리에서 달라진 능력치를 볼 수 있습니다.</p>
      </> },
      { t: '지명타자에는 누구를 세우나요?', s: '야수라면 누구든 감소 없이 설 수 있습니다.', b: <>
        <p>수비가 약하지만 방망이가 좋은 선수를 두기 좋은 자리입니다.</p>
      </> },
      { t: '선수 자리는 어떻게 바꾸나요?', s: '선수를 끌어서 다른 자리에 놓습니다.', b: <>
        <div className="rl-yn">
          <div className="y"><span>빈 자리에 놓으면 그 자리로 <b>이동</b>합니다.</span></div>
          <div className="y"><span>선수가 있는 자리에 놓으면 두 선수가 <b>맞교환</b>됩니다.</span></div>
        </div>
        <div className="rl-tip"><span>라인업의 자리를 누르면 선반에 그 포지션 선수만 모아 보여 줍니다.</span></div>
      </> },
    ] },
  { id: 'syn', label: '시너지',
    icon: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
    lead: <>실제로 함께 뛰었던 선수나 조건이 맞는 선수를 모으면 <b>그 선수들이 강해집니다.</b></>,
    groups: [
      { t: '시너지를 만들면 무엇이 좋아지나요?', s: '시너지에 속한 선수만 능력치가 오릅니다.', b: <>
        <p>팀 전체가 아니라 <b>조건을 채운 선수들만</b> 능력치가 오릅니다.</p>
        <p>여러 시너지가 겹쳐도 한 능력치는 <em>최대 +{SYNERGY_STAT_CAP}</em>까지만 오릅니다.</p>
      </> },
      { t: '실화 조합', s: '실제로 함께한 선수들을 모읍니다.', b: <>
        <div className="rl-syn"><span><b>클린업 트리오</b><small>이승엽 · 이대호 · 김동주 중 2명</small></span><em>파워 +5</em></div>
        <div className="rl-syn"><span><b>SK 왕조 배터리</b><small>김광현 · 박경완</small></span><em>안정 · 수비 +4</em></div>
        <p>카드 시즌이 달라도 같은 사람이면 인정됩니다.</p>
      </> },
      { t: '팀 구성', s: '조건에 맞는 선수가 많을수록 단계가 오릅니다.', b: <>
        <p><b>홈런 군단</b> — 파워 80 이상 타자</p>
        <div className="rl-tiers"><span><b>3명</b>파워 +2</span><span><b>4명</b>파워 +4</span><span><b>6명</b>파워 +7</span></div>
        <div className="rl-tip"><span>선반 카드의 시너지 칸에 그 선수를 뽑으면 채워질 칸이 표시됩니다.</span></div>
      </> },
      { t: '프랜차이즈의 기억', s: '가장 많이 뽑은 구단의 선수들이 강해집니다.', b: <>
        <div className="rl-tiers"><span><b>3명</b>능력치 +1</span><span><b>5명</b>+2 · 수비·안정 +2</span><span><b>7명</b>+4 · 수비·안정 +3</span></div>
        <p>드래프트 중에는 보이지 않고, <b>드래프트가 끝나면 공개</b>됩니다. 인원이 같은 구단이 여럿이면 모두 혜택을 받습니다.</p>
      </> },
    ] },
  { id: 'season', label: '시즌',
    icon: <><path d="M7 4h10v3a5 5 0 0 1-10 0z" /><path d="M7 5H4v1.5A3 3 0 0 0 7 9.5M17 5h3v1.5a3 3 0 0 1-3 3M12 12v4M8.5 20h7" /></>,
    lead: <>{ROSTER_SIZE}명을 모두 채우면 라인업을 다듬고, 증강을 골라 <b>AI 올스타</b>와 경기합니다.</>,
    groups: [
      { t: '드래프트가 끝나면 무엇을 하나요?', s: '정비 화면에서 선수 자리를 다듬습니다.', b: <>
        <div className="rl-yn">
          <div className="y"><span>선수를 끌어 자리를 옮길 수 있습니다.</span></div>
          <div className="n"><span>방출과 영입은 할 수 없습니다.</span></div>
        </div>
      </> },
      { t: '증강은 언제 고르나요?', s: '시즌을 시작할 때 모드에서 정한 개수만큼 고릅니다.', b: <>
        <p>증강 개수는 <span className="rl-chip">없음</span> <span className="rl-chip g">2개</span> <span className="rl-chip">3개</span> 중에서 정합니다.</p>
        <p>매번 <b>3장 중 1장</b>을 고르고, 경기 중 조건이 맞으면 발동합니다.</p>
      </> },
      { t: '상대는 누구인가요?', s: '같은 규칙으로 드래프트한 AI 올스타입니다.', b: <>
        <p>AI 난이도 <span className="rl-chip">쉬움</span> <span className="rl-chip g">보통</span> <span className="rl-chip">강함</span>에 따라 상대 능력치가 달라집니다.</p>
        <p>경기 결과는 전적에 쌓이고, 같은 상대와 다시 겨룰 수도 있습니다.</p>
      </> },
    ] },
];

export default function KboAugmentDraft() {
  // 드래프트 상태
  const [phase, setPhase] = useState('mode'); // mode | draft | ready | matchup | sim | result
  const [modeId, setModeId] = useState('champ'); // 고른 드래프트 모드
  const [match, setMatch] = useState({ cap: SALARY_CAP, ai: 'normal', aug: SEASON_AUGMENTS }); // 모드 화면 설정
  const mode = DRAFT_MODES.find((m) => m.id === modeId);
  const [roster, setRoster] = useState([]);
  const [cp, setCp] = useState(SALARY_CAP);
  const [rerolls, setRerolls] = useState(START_REROLLS);
  const [buff, setBuff] = useState(0);
  const [augments, setAugments] = useState([]);
  const [series, setSeries] = useState(null); // 모드를 고르고 드래프트를 시작할 때 첫 시리즈가 열린다
  const [round, setRound] = useState(1); // 드래프트 라운드 (영입·교체 영입마다 +1, 방출해도 되돌아가지 않음)
  const [autoFilled, setAutoFilled] = useState(0); // 드래프트가 끝날 때 퓨처스 유망주로 채운 자리 수
  const [seenSeries, setSeenSeries] = useState([]); // 이번 드래프트에서 이미 열린 시리즈 — 모드의 시리즈를 다 돌기 전에는 다시 나오지 않는다
  /** 다음 시리즈: 모드 안에서 영입 가능한 시리즈를 먼저, 모드 안에 더는 없으면(방출·교체로 늘어난 기회 등) 전체 시리즈에서 — 이미 나온 팀도 다시 나올 수 있다 */
  const nextSeries = (r, c, banned) => rollSeries(r, c, series?.id, banned, mode.series, seenSeries) || rollSeries(r, c, series?.id, banned, DRAFT_SERIES, seenSeries);
  /** 드래프트 종료: 빈 자리는 퓨처스 유망주(종합 55)로 자동으로 채우고 정비 화면으로 */
  const finishDraft = (r) => {
    const filled = fillRoster(r);
    setAutoFilled(filled.length - r.length);
    setRoster(filled); setSeries(null); setPicked(null); setPhase('ready');
  };
  /** 영입·교체 뒤: 12라운드를 다 썼거나 · 엔트리가 찼거나 · 캡 등으로 더 영입할 수 없으면 끝, 아니면 다음 라운드 */
  const advanceRound = (next, nextCp, banned) => {
    setPosFilter(null); // 영입했으면 빈 자리 거르기는 풀고 다음 라운드는 전체 선반으로
    if (round >= ROSTER_SIZE || next.length >= ROSTER_SIZE || !ALL_PLAYERS.some((p) => !getLockReason(p, next, nextCp, banned))) {
      finishDraft(next);
      return;
    }
    setRound(round + 1);
    openSeries(nextSeries(next, nextCp, banned));
  };
  const openSeries = (s) => {
    setSeries(s);
    if (s) setSeenSeries((v) => (v.includes(s.id) ? v : [...v, s.id]));
  };
  const [augPicksLeft, setAugPicksLeft] = useState(0);
  const [choice, setChoice] = useState(null); // { kind: 'augment' | 'event', options }
  const [shake, setShake] = useState(null);
  const [picked, setPicked] = useState(null); // 선반에서 살펴보는 후보
  const [modal, setModal] = useState(null); // 'rules' | 'synergy'
  const [focusSynergy, setFocusSynergy] = useState(null); // 누른 시너지 — 해당 선수를 화면에서 강조
  // PICK 에서 빠지는 카드: 잠깐 남겨 두고 사라지는 효과를 준다 (영입이면 sign, 그냥 해제면 drop)
  // 내 라인업에서 누른 선수: PICK 구역에 선 자리·시너지까지 반영한 스탯 카드로 보여 준다 (선반 후보가 있으면 후보가 먼저)
  const [inspectId, setInspectId] = useState(null);
  const [confirmOut, setConfirmOut] = useState(false); // PICK 의 방출 버튼은 두 번 눌러야 확정 — 다른 선수를 보면 처음으로
  useEffect(() => setConfirmOut(false), [inspectId]);
  const handleInspect = useCallback((id) => { setInspectId(id); if (id) setPicked(null); }, []);
  const inspected = useMemo(() => {
    const placed = withSlots(roster);
    const me = inspectId && placed.find((p) => p.id === inspectId);
    if (!me) return null;
    const on = placed.map(playAt);
    const eff = applySynergies(on, visibleSynergies(on, true)).find((p) => p.id === me.id); // PICK 카드는 드래프트 화면에만 있다
    return { player: me, owned: { eff, slotLabel: SLOTS.find((s) => s.id === me.slot)?.label } };
  }, [roster, inspectId]);
  /*
   * PICK 카드 뒤집기: 스켈레톤이 카드 뒷면. 빈 칸→카드는 뒷면이 돌아가며 카드가 나오고, 카드→빈 칸은 반대로,
   * 카드→다른 카드는 뒷면을 거치지 않고 한 번에(지금 카드가 옆면까지 돌면 새 카드가 이어서 돌아 나옴). 영입은 라인업 쪽으로 흘러가며 사라짐.
   */
  const PK_FLIP_MS = 440; // 한 번 뒤집기(반쪽 0.22초 × 2)
  const [pickLeave, setPickLeave] = useState(null); // 빠지는 카드 { player, owned, mode: 'flip' | 'sign', key }
  const [pickBack, setPickBack] = useState('shown'); // 뒷면(스켈레톤): shown · away · hidden · return
  const prevShownRef = useRef(null);
  const shown = picked ? { player: picked, kind: 'pick' } : inspected ? { ...inspected, kind: 'own' } : null;
  const shownKey = shown ? `${shown.kind}-${shown.player.id}` : '';
  // 레이아웃 단계에서 바로 정해야 카드가 한 프레임 비었다가 나타나는 깜빡임이 없다
  useLayoutEffect(() => {
    const prev = prevShownRef.current;
    prevShownRef.current = shown;
    if (!prev && !shown) return undefined;
    const timers = [];
    const leaveOf = (mode) => {
      const leave = { player: prev.player, owned: prev.owned, mode, key: `${prev.kind}-${prev.player.id}-${Date.now()}` };
      setPickLeave(leave);
      timers.push(setTimeout(() => setPickLeave((l) => (l === leave ? null : l)), mode === 'sign' ? 380 : PK_FLIP_MS));
    };
    if (shown && !prev) {
      setPickLeave(null);
      setPickBack('away');
      timers.push(setTimeout(() => setPickBack('hidden'), PK_FLIP_MS));
    } else if (shown && prev) {
      setPickBack('hidden');
      leaveOf('flip');
    } else {
      const signed = prev.kind === 'pick' && roster.some((p) => p.id === prev.player.id);
      leaveOf(signed ? 'sign' : 'flip');
      setPickBack(signed ? 'shown' : 'return');
      if (!signed) timers.push(setTimeout(() => setPickBack('shown'), PK_FLIP_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, [shownKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!focusSynergy) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFocusSynergy(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusSynergy]);
  const [released, setReleased] = useState([]); // 방출한 선수(동일인 키) — 이번 드래프트 동안 재영입 불가
  // 경기 상태
  const [opponent, setOpponent] = useState(null);
  const [board, setBoard] = useState(emptyBoard);
  const [half, setHalf] = useState(null);
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState(null);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState(null);
  const [record, setRecord] = useState({ w: 0, l: 0, d: 0 });
  const [speed, setSpeed] = useState(1);

  const speedRef = useRef(1);
  const runIdRef = useRef(0); // 값이 바뀌면 진행 중인 시뮬레이션은 스스로 중단
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => () => { runIdRef.current += 1; }, []);
  // 개발 전용 바로가기: ?demo=draft | ready | augment | matchup — 엔트리를 채워 그 단계 화면을 곧장 연다 (배포 빌드에서는 무시)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const demo = new URLSearchParams(window.location.search).get('demo');
    if (!demo) return;
    if (demo === 'draft') { // 늘 같은 8명(2루수 · 외야 둘 · 마무리는 빈 자리)으로 9라운드 드래프트 화면 — 디자인 비교용
      const r = [['송승준', 2010], ['심창민', 2014], ['강민호', 2008], ['강진성', 2020], ['김동주', 2008], ['이종범', 1993], ['이용규', 2008], ['에반스', 2016]]
        .map(([n, y]) => ALL_PLAYERS.find((p) => p.name === n && p.year === y)).filter(Boolean);
      const c = Math.max(0, SALARY_CAP - r.reduce((s, p) => s + p.cost, 0));
      setRoster(r); setCp(c); setRound(r.length + 1); openSeries(nextSeries(r, c, [])); setPhase('draft');
      return;
    }
    const r = aiDraft();
    setRoster(r);
    setCp(Math.max(0, SALARY_CAP - r.reduce((s, p) => s + p.cost, 0)));
    setSeries(null);
    if (demo === 'ready') setPhase('ready');
    if (demo === 'augment') { setPhase('sim'); setAugPicksLeft(SEASON_AUGMENTS); setChoice({ kind: 'augment', options: shuffle(AUGMENTS).slice(0, 3) }); }
    if (demo === 'matchup') { setAugments(shuffle(AUGMENTS).slice(0, SEASON_AUGMENTS)); setOpponent(aiDraft()); setPhase('matchup'); }
  }, []);

  const full = roster.length >= ROSTER_SIZE;
  const canPickAny = useMemo(() => ALL_PLAYERS.some((p) => !getLockReason(p, roster, cp, released)), [roster, cp, released]);
  const seriesCards = useMemo(() => (series
    ? [...series.players].sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position) || b.overall - a.overall)
    : []), [series]);
  const [shelfFilter, setShelfFilter] = useState('all'); // 선반: 전체 · 영입 가능만
  const [posFilter, setPosFilter] = useState(null); // 내 라인업의 자리를 누르면 { slot, pos } — 선반에 그 포지션만
  const [shelfLeaving, setShelfLeaving] = useState(null); // 거르기로 빠지는 카드 id — 잠깐 사라지는 효과 뒤에 실제로 거른다
  const leaveTimerRef = useRef(null);
  // 곧 바뀔 거르기 자리(빠지는 카드를 기다리는 0.18초 동안). 라인업의 지정 표시는 기다리지 않고 이 값을 바로 따른다 — 옛 자리 해제가 늦어 두 자리가 동시에 지정돼 보이지 않게
  const [pendingSlot, setPendingSlot] = useState(undefined);
  const shelfRef = useRef(null);
  const flipRef = useRef(null); // 거르기 직전 카드 위치 (id → rect) — 거른 뒤 남은 카드가 새 자리로 미끄러지게(FLIP)
  const openOnly = (p) => shelfFilter !== 'open' || !getLockReason(p, roster, cp, released);
  const shownCards = seriesCards.filter(openOnly).filter((p) => !posFilter || p.position === posFilter.pos);
  /** 자리 거르기 바꾸기: 빠질 카드는 먼저 사라지고(0.18초) 남는 카드가 다시 차례로 떠오른다. slot=null 이면 해제 */
  const handleSlotFilter = (slot, force = false) => {
    const cur = pendingSlot !== undefined ? pendingSlot : (posFilter?.slot ?? null);
    const next = slot == null || (!force && cur === slot) ? null : { slot, pos: slotPos(slot) };
    if ((next?.slot ?? null) === cur) return;
    const keep = new Set(seriesCards.filter(openOnly).filter((p) => !next || p.position === next.pos).map((p) => p.id));
    const leaving = new Set(shownCards.filter((p) => !keep.has(p.id)).map((p) => p.id));
    clearTimeout(leaveTimerRef.current);
    const commit = () => {
      const first = new Map();
      shelfRef.current?.querySelectorAll('[data-card]').forEach((el) => { if (!leaving.has(el.dataset.card)) first.set(el.dataset.card, el.getBoundingClientRect()); });
      flipRef.current = first;
      setShelfLeaving(null);
      setPendingSlot(undefined);
      setPosFilter(next);
    };
    if (!leaving.size) { commit(); return; }
    setPendingSlot(next?.slot ?? null);
    setShelfLeaving(leaving);
    leaveTimerRef.current = setTimeout(commit, 180);
  };
  // 거르기가 바뀐 직후: 남아 있던 카드는 옛 자리에서 새 자리로 슉 미끄러지고(제자리면 그대로), 새로 나타나는 카드는 rise 로 떠오른다
  useLayoutEffect(() => {
    const first = flipRef.current;
    flipRef.current = null;
    if (!first || !shelfRef.current) return;
    shelfRef.current.querySelectorAll('[data-card]').forEach((el) => {
      const a = first.get(el.dataset.card);
      if (!a) return;
      const b = el.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.getBoundingClientRect(); // 옛 자리를 먼저 그리게 한 번 계산
      el.style.transition = 'transform .38s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = '';
      const done = () => { el.style.transition = ''; el.removeEventListener('transitionend', done); };
      el.addEventListener('transitionend', done);
    });
  }, [posFilter]);
  const augmentOptions = (owned) => shuffle(AUGMENTS.filter((a) => !owned.some((x) => x.id === a.id))).slice(0, 3);
  const myTeam = useMemo(() => buildTeam('나의 드림팀', fillRoster(roster), buff), [roster, buff]);

  /* 드래프트 핸들러: 판정 레이어 → 영입 → 다음 라운드 / 증강 / 이벤트 */
  const handleSelectPlayer = useCallback((player) => {
    if (phase !== 'draft' || choice) return;
    const reason = getLockReason(player, roster, cp, released);
    if (reason) {
      setShake(player.id);
      setTimeout(() => setShake((s) => (s === player.id ? null : s)), 320);
      return;
    }
    const next = [...roster, { ...player, slot: freeSlot(roster, player.position).id }];
    const nextCp = cp - player.cost;
    setRoster(next);
    setCp(nextCp);
    setPicked(null);
    setFocusSynergy(null); // 다음 라운드로 넘어가면 시너지 강조는 풀고 다시 고르게 한다
    advanceRound(next, nextCp, released); // 끝나면 정비 화면(증강은 시즌을 시작할 때 고른다)
  }, [phase, choice, roster, cp, augments, series, released, mode, seenSeries, round]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChoose = (option) => {
    if (choice.kind === 'augment') {
      const owned = [...augments, option];
      const left = augPicksLeft - 1;
      setAugments(owned);
      setAugPicksLeft(left);
      setChoice(left > 0 ? { kind: 'augment', options: augmentOptions(owned) } : null);
      if (left <= 0) prepareMatch(false); // 마지막 증강을 고르면 경기 전 매치업 화면으로
      return;
    }
    const s = option.apply({ cp, rerolls, buff });
    setCp(Math.max(0, s.cp));
    setRerolls(s.rerolls);
    setBuff(s.buff);
    setChoice(null);
  };

  const handleReroll = () => {
    if (rerolls <= 0 || phase !== 'draft') return;
    setRerolls((r) => r - 1);
    setPicked(null);
    openSeries(nextSeries(roster, cp, released));
  };

  /* 라인업 자리 바꾸기: 빈 자리면 이동, 사람이 있으면 맞교환. 자리가 비고 차는 대로 후보 잠금이 다시 계산된다 */
  const handleMove = (from, to) => {
    if (phase !== 'draft' && phase !== 'ready') return;
    setRoster((r) => withSlots(r).map((p) => (p.slot === from ? { ...p, slot: to } : p.slot === to ? { ...p, slot: from } : p)));
  };

  /* 경기 시작: AI 드래프트 → 비동기 시뮬레이션 루프 */
  /* 시즌 시작: 경기 화면으로 들어가 증강을 고르고, 다 고르면 첫 경기가 열린다 */
  const startSeason = () => {
    if (augments.length >= match.aug) { prepareMatch(!!opponent); return; }
    runIdRef.current += 1;
    setPhase('sim');
    setBoard(emptyBoard());
    setHalf(null);
    setLogs([]);
    setResult(null);
    setToast(null);
    setAugPicksLeft(match.aug - augments.length);
    setChoice({ kind: 'augment', options: augmentOptions(augments) });
  };

  /* 경기 전 매치업 화면: 상대를 정해(재경기면 그대로) 두 팀을 비교한 뒤 경기 시작 */
  const prepareMatch = (rematch = false) => {
    runIdRef.current += 1;
    if (!(rematch && opponent)) setOpponent(aiDraft({ players: mode.players, cap: match.cap }));
    setChoice(null);
    setToast(null);
    setPhase('matchup');
  };

  const startGame = async (rematch = false, owned = augments) => {
    const oppRoster = rematch && opponent ? opponent : aiDraft({ players: mode.players, cap: match.cap });
    setOpponent(oppRoster);
    const my = buildTeam('나의 드림팀', fillRoster(roster), buff);
    const opp = buildTeam('AI 올스타', fillRoster(oppRoster), AI_BUFF[match.ai]);
    const runId = ++runIdRef.current;
    setPhase('sim');
    setBoard(emptyBoard());
    setHalf(null);
    setLogs([]);
    setResult(null);
    setToast(null);
    setPaused(false);

    const res = await runSimulation({
      my, opp, augments: owned,
      getSpeed: () => speedRef.current,
      isCancelled: () => runIdRef.current !== runId,
      onBoard: ({ board: b, half: h }) => { setBoard(b); setHalf(h); },
      onLog: (e) => setLogs((l) => [...l, e]),
      onHighlight: async ({ augment, text, hero }) => {
        const key = Date.now() + Math.random();
        setPaused(true);
        setToast({ key, augment, text, hero });
        setTimeout(() => setPaused(false), 500);
        setTimeout(() => setToast((t) => (t && t.key === key ? null : t)), 1700);
      },
    });
    if (!res || runIdRef.current !== runId) return;
    setResult(res);
    setHalf(null);
    setRecord((r) => ({ w: r.w + (res.winner === 'my'), l: r.l + (res.winner === 'opp'), d: r.d + (res.winner === 'draw') }));
    setPhase('result');
  };

  const newDraft = () => {
    runIdRef.current += 1;
    setPhase('mode'); setPicked(null); setChoice(null); setToast(null); setModal(null); // 모드 화면으로 돌아가 다시 고른다 (기록은 모드 화면에 남겨 둔다)
  };

  /* 모드 화면에서 시작: 그 모드의 시리즈와 설정으로 드래프트를 새로 연다 */
  const startDraft = (id, cfg) => {
    const m = DRAFT_MODES.find((x) => x.id === id);
    runIdRef.current += 1;
    setModeId(id); setMatch(cfg);
    setRoster([]); setPicked(null); setReleased([]); setRound(1); setAutoFilled(0); setPosFilter(null); setCp(cfg.cap); setRerolls(START_REROLLS); setBuff(0); setAugments([]);
    const first = rollSeries([], cfg.cap, null, [], m.series);
    setSeries(first); setSeenSeries(first ? [first.id] : []); setAugPicksLeft(0); setChoice(null); setOpponent(null);
    setBoard(emptyBoard()); setHalf(null); setLogs([]); setToast(null); setResult(null); setRecord({ w: 0, l: 0, d: 0 });
    setPhase('draft');
  };

  const fireCount = (a) => logs.filter((l) => l.kind === 'augment' && l.text.startsWith(`[증강 발동: ${a.name}!]`)).length;
  const btnGhost = 'ui-btn ui-cut';
  const btnPrimary = `${btnGhost} pri`;
  const pickedReason = picked ? getLockReason(picked, roster, cp, released) : null;
  const offPositionPlayers = withSlots(roster).map(playAt).filter((p) => p.naturalPosition);

  /* 시너지: 지금 상태 · 누른 시너지의 해당 선수 · 카드별로 영입하면 오르는 시너지 */
  const synergyNow = checkSynergies(roster);
  const focused = focusSynergy ? synergyNow.find((s) => s.id === focusSynergy) : null;
  const focusIds = focused ? new Set(focused.members.map((p) => p.id)) : null;
  // 시너지를 눌러 해당 선수를 볼 때는 PICK 에 올려 둔 선수를 내린다 (고른 카드의 초록 테두리와 헷갈리지 않게)
  const toggleFocus = (id) => {
    if (focusSynergy !== id) setPicked(null);
    setFocusSynergy(focusSynergy === id ? null : id);
  };
  const growsFor = (player) => {
    const after = previewSynergies(roster, player);
    return synergyNow.filter((s) => !(phase === 'draft' && DRAFT_HIDDEN.has(s.id)) && synergyGrows(s, after.get(s.id)));
  };
  /** 카드의 시너지 칸 표시: 이 선수가 채우는 진행 중 시너지 중 목록 정렬 기준으로 가장 위의 것 하나 ({ s, after }) */
  const hintFor = (player) => {
    const after = previewSynergies(roster, player);
    const [top] = sortSynergies(growsFor(player).filter((s) => s.cur > 0));
    return top ? { s: top, after: after.get(top.id) } : null;
  };
  const previewTarget = picked && !pickedReason ? picked : null;

  /* 방출: 영입가 절반 환불 · 동일인 재영입 금지 · 드래프트 중에만 */
  const releaseFrom = (base, slot) => {
    const placed = withSlots(base);
    const out = placed.find((p) => p.slot === slot);
    return out ? { out, roster: placed.filter((p) => p !== out), refund: releaseRefund(out), banned: [...released, personKey(out)] } : null;
  };
  const handleRelease = (slot) => {
    if (phase !== 'draft' || choice) return; // 정비 화면에서는 방출 불가
    const r = releaseFrom(roster, slot);
    if (!r) return;
    setRoster(r.roster);
    setCp(cp + r.refund);
    setReleased(r.banned);
    // 방출해도 라운드는 그대로. 지금 선반에 고를 선수가 없으면(방출로 자리·캡이 바뀐 뒤 등) 새 시리즈를 연다
    if (!series || !series.players.some((p) => !getLockReason(p, r.roster, cp + r.refund, r.banned))) {
      openSeries(nextSeries(r.roster, cp + r.refund, r.banned));
    }
  };
  /* 교체 영입: 마감된 포지션의 후보를 고르면, 그 자리에서 실전 종합이 가장 낮은 선수를 방출하고 곧바로 들인다 */
  const swapPlan = (() => {
    if (phase !== 'draft' || !picked || !pickedReason?.endsWith('마감')) return null;
    // 내 라인업에서 같은 포지션 자리를 골라 둔 상태면 그 자리 선수와, 아니면 그 포지션에서 실전 종합이 가장 낮은 선수와 바꾼다
    const samePos = withSlots(roster).filter((p) => slotPos(p.slot) === picked.position);
    const chosen = posFilter && samePos.find((p) => p.slot === posFilter.slot);
    const [weakest] = chosen ? [chosen] : samePos.sort((a, b) => playAt(a).overall - playAt(b).overall);
    const r = weakest && releaseFrom(roster, weakest.slot);
    return r ? { ...r, reason: getLockReason(picked, r.roster, cp + r.refund, r.banned) } : null;
  })();
  const handleSwapIn = () => {
    if (!swapPlan || swapPlan.reason || choice) return;
    const next = [...swapPlan.roster, { ...picked, slot: swapPlan.out.slot }];
    const nextCp = cp + swapPlan.refund - picked.cost;
    setRoster(next);
    setCp(nextCp);
    setReleased(swapPlan.banned);
    setPicked(null);
    setFocusSynergy(null);
    advanceRound(next, nextCp, swapPlan.banned);
  };

  return (
    // 드래프트는 넓은 화면(lg+)에서 창 높이에 딱 맞는 한 화면 앱으로: 스크롤 없이 머리 · 시리즈 · 영입+라인업이 들어간다
    <div className={`min-h-screen bg-[#05080f] font-sans text-gray-100 antialiased ${phase === 'draft' || phase === 'mode' ? 'lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden' : ''}`}>
      <style>{KEYFRAMES}</style>
      <div className={`ui-bg ${phase === 'sim' ? 'soft' : ''}`} style={{ backgroundImage: `url(ui/${PHASE_BG[phase]}.webp)` }} aria-hidden="true" />
      {phase === 'mode' && (
        <ModeSelect initialMode={modeId} onStart={startDraft}
          record={record.w + record.l + record.d ? `${record.w}승 ${record.l}패${record.d ? ` ${record.d}무` : ''} · ${mode.name}` : null} />
      )}
      {phase !== 'mode' && (
        <CapDashboard round={phase === 'draft' ? round : roster.length} cp={cp} cap={match.cap} roster={roster} phase={phase} onOpenRules={() => setModal('rules')} wide={phase === 'draft'} modeName={mode.name} modeNeon={mode.neon}
          capAfter={phase === 'draft' && picked ? (swapPlan ? (swapPlan.reason ? null : cp + swapPlan.refund - picked.cost) : (pickedReason ? null : cp - picked.cost)) : null} />
      )}

      {phase !== 'mode' && (
      <main className={`relative mx-auto grid px-4 ${phase === 'draft'
        ? 'w-full max-w-[1920px] gap-3 py-3 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)]'
        : phase === 'ready' ? 'max-w-7xl gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_20rem]' : 'w-full max-w-[1600px] gap-5 py-5'}`}>
        <div className="flex min-w-0 flex-col gap-5 lg:min-h-0">
          {phase === 'draft' && (
            // --card-w: 선수 카드 폭의 상한(창 높이 기준). 실제 폭은 선반 그리드가 판 안쪽 폭을 17칸으로 나눠 정하고 가운데 정렬 — 좌우 여백이 늘 같다
            <section className="flex flex-col gap-3 lg:min-h-0 lg:flex-1" style={{ '--card-w': 'clamp(4.2rem, 13vh, 8rem)' }}>
              {!canPickAny && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-3">
                  <p className="text-sm text-yellow-100">영입 가능한 선수가 남아 있지 않습니다. 빈 자리는 퓨처스 유망주(종합 55)로 채워집니다.</p>
                  <button type="button" className={btnPrimary} onClick={() => finishDraft(roster)}>이대로 정비하러 가기</button>
                </div>
              )}
              {/* 시리즈 묶음: 한 줄 머리 + 선수 카드 (중계 그래픽 판) */}
              <div className="bc-grp lg:!px-1.5" style={series ? { '--a': SERIES_NEON[series.kind] } : undefined}>
                <span className="bc-label font-display">SERIES</span>
              {series && (
                /* 시리즈 머리: 윤곽선 연도 워터마크 · 종류 · 팀명(네온 밑줄) · 한 줄 설명 태그 | 선반 보기 전환 · 새로고침 */
                <div key={series.id} className="ser-hd mb-2 flex animate-[rise_.35s_ease-out_both] flex-wrap items-center gap-x-3 gap-y-2 px-1.5 lg:flex-nowrap">
                  <span className="ser-wm font-display" aria-hidden="true">{series.year ?? 'LEGEND'}</span>
                  <div className="ser-ttl">
                    <span className="ser-kind">{SERIES_KIND_LABEL[series.kind]}</span>
                    <h2 className="ser-name">{series.year && <span className="sr-only">{series.year}년 </span>}{series.title}</h2>
                    {series.subtitle && <span className="ser-sub">{series.subtitle}</span>}
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2.5">
                    {posFilter && (
                      <button type="button" className="ser-pf" onClick={() => handleSlotFilter(null)} aria-label={`${SLOTS.find((s) => s.id === posFilter.slot)?.label} 자리 선수만 보기 해제`}>
                        {SLOTS.find((s) => s.id === posFilter.slot)?.label} 자리 <span aria-hidden="true">✕</span>
                      </button>
                    )}
                    <button type="button" className="ser-sw" aria-pressed={shelfFilter === 'open'} onClick={() => setShelfFilter((f) => (f === 'open' ? 'all' : 'open'))}>
                      <span className="tr" aria-hidden="true" />영입 가능한 선수만
                    </button>
                    <span className="h-5 w-px bg-white/10" aria-hidden="true" />
                    <button type="button" onClick={handleReroll} disabled={rerolls <= 0} className="ser-refresh"
                      title={rerolls > 0 ? `다른 시리즈로 새로고침 · ${rerolls}회 남음` : '새로고침을 모두 썼습니다'} aria-label={`다른 시리즈로 새로고침, ${rerolls}회 남음`}>
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M16.2 10.4A6.2 6.2 0 1 1 14.4 5.6" /><path d="M16.2 2.8v3.9h-3.9" />
                      </svg>
                      새로고침 <em>· {rerolls}회</em>
                    </button>
                  </div>
                </div>
              )}
              <div ref={shelfRef} className="grid grid-cols-[repeat(auto-fill,minmax(4.6rem,1fr))] gap-1.5 lg:grid-cols-[repeat(17,minmax(0,var(--card-w)))] lg:justify-center lg:gap-[3px]">
                {shownCards.length === 0 && (
                  <p className="col-span-full py-6 text-center text-sm text-gray-400">
                    {posFilter ? `이 시리즈에는 ${shelfFilter === 'open' ? '영입 가능한 ' : ''}${POS_LABEL[posFilter.pos]} 선수가 없습니다 — 새로고침으로 다른 시리즈를 열어 보세요` : '영입 가능한 선수가 없습니다'}
                  </p>
                )}
                {shownCards.map((p, i) => (
                  // 위치 이동(FLIP)은 감싸는 칸에 준다 — 카드 자체의 rise 애니메이션과 transform 이 겹치지 않게
                  <div key={p.id} data-card={p.id} className="min-w-0">
                  <MiniCard player={p} reason={getLockReason(p, roster, cp, released)} selected={picked?.id === p.id}
                    hint={getLockReason(p, roster, cp, released) ? null : hintFor(p)}
                    focus={focused ? (synergyGrows(focused, previewSynergies(roster, p).get(focused.id)) ? 'on' : 'off') : null}
                    onPick={(pl) => setPicked((cur) => (cur?.id === pl.id ? null : pl))} leaving={!!shelfLeaving?.has(p.id)}
                    style={{ animationDelay: shelfLeaving?.has(p.id) ? '0ms' : `${i * 25}ms` }} />
                  </div>
                ))}
              </div>
              </div>
              {/* 넓은 화면: 구장이 줄 높이를 정하고, 영입 카드 묶음은 그 높이에 맞춘다 */}
              <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[clamp(15rem,19vw,21rem)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
                <div className="bc-grp lg:min-h-0">
                  <span className="bc-label font-display">PICK</span>
                <div className="relative flex flex-col gap-2 lg:absolute lg:inset-x-2.5 lg:bottom-2.5 lg:top-[26px]">
                  {/* 카드 무대: 뒷면(스켈레톤) · 빠지는 카드 · 지금 카드가 같은 자리에 겹쳐 뒤집힌다 (실제 PICK 카드와 같은 감싸는 틀 → 늘 2:3) */}
                  <div className="flex min-h-0 justify-center lg:flex-1">
                    <div className="pk-stage aspect-[2/3] w-full lg:h-full lg:w-auto lg:max-w-full">
                      <div className={`pk-face pk-back ${pickBack}`} aria-hidden="true">
                        <div className="pk-empty aspect-[2/3] w-full">
                          {PK_SKELETON.map((s, i) => <span key={i} className="pk-sk" style={{ ...s, '--i': i }} />)}
                          <span className="pk-fr" />
                        </div>
                      </div>
                      {pickLeave && (
                        <div key={pickLeave.key} className={`pk-face pkf-out ${pickLeave.mode}`} aria-hidden="true">
                          <PlayerCard player={pickLeave.player} owned={pickLeave.owned} reason={null} onSelect={() => {}} style={{ animation: 'none' }} />
                        </div>
                      )}
                      {picked ? (
                        <div key={`pick-${picked.id}`} className="pk-face pkf-in">
                          <PlayerCard player={picked} reason={pickedReason} shaking={shake === picked.id} onSelect={() => setPicked(null)} hint={pickedReason ? null : hintFor(picked)} style={{ animation: 'none' }} />
                        </div>
                      ) : inspected ? (
                        <div key={`own-${inspected.player.id}`} className="pk-face pkf-in">
                          <PlayerCard player={inspected.player} owned={inspected.owned} onSelect={() => {}} style={{ animation: 'none' }} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {picked ? (
                    <>
                      {swapPlan ? (
                        <>
                          <button type="button" className="pk-go" disabled={!!swapPlan.reason} onClick={handleSwapIn}
                            title={swapPlan.reason ? undefined : `${swapPlan.out.name}(${playAt(swapPlan.out).overall}) 방출 · 영입가 절반 환불 · 다시 영입 불가`}>
                            <PickIcon kind={swapPlan.reason ? 'lock' : 'swap'} /><span>{swapPlan.reason ? `교체 불가 · ${swapPlan.reason}` : `교체 영입 (+${swapPlan.refund} CP 환불)`}</span>
                          </button>
                        </>
                      ) : (
                        <button type="button" className="pk-go" disabled={!!pickedReason} onClick={() => handleSelectPlayer(picked)}>
                          <PickIcon kind={pickedReason ? 'lock' : 'plus'} /><span>{pickedReason || '영입하기'}</span>
                        </button>
                      )}
                    </>
                  ) : inspected ? (
                    // 내 라인업 선수: 교체 영입 버튼과 같은 자리 · 같은 모양의 방출 버튼 (두 번 눌러 확정)
                    <button type="button" className={`pk-go out ${confirmOut ? 'confirm' : ''}`}
                      onClick={() => { if (!confirmOut) { setConfirmOut(true); return; } setConfirmOut(false); handleRelease(inspected.player.slot); }}
                      title={`${inspected.player.name} 방출 · 영입가 절반 환불 · 다시 영입 불가`}>
                      <PickIcon kind="out" />
                      <span>{confirmOut ? `한 번 더 누르면 방출 (+${releaseRefund(inspected.player)} CP)` : `방출 (+${releaseRefund(inspected.player)} CP 환불)`}</span>
                    </button>
                  ) : (
                    <>
                      <div className="pk-ghostbtn" aria-hidden="true" />
                      <span className="sr-only">위 선반에서 선수를 고르거나 내 라인업 선수를 누르면 여기에 표시됩니다</span>
                    </>
                  )}
                </div>
                </div>
                {/* 내 라인업: 구장이 판 전체의 배경, 시너지는 오른쪽 도크로 그 위에 얹힌다 */}
                <div className="bc-grp !px-0 !pb-0 lg:flex lg:min-h-0 lg:flex-col">
                  <span className="bc-label font-display">MY LINEUP</span>
                  <LineupField roster={roster} candidate={picked} candidateReason={pickedReason} onMove={handleMove} onInspect={handleInspect} onSlotFilter={handleSlotFilter} onClearCandidate={() => setPicked(null)} wantSlot={pendingSlot !== undefined ? pendingSlot : posFilter?.slot} draftView
                    highlight={focusIds} focusLabel={focused?.name} onClearFocus={() => setFocusSynergy(null)}
                    reserve={320} fill className="lg:min-h-0 lg:flex-1"
                    overlay={<SynergyTracker roster={roster} candidate={previewTarget} focusId={focusSynergy} onFocus={toggleFocus} onOpenAll={() => setModal('synergy')} />} />
                </div>
              </div>
            </section>
          )}

          {phase === 'ready' && (
            <section className="ui-cut ui-frame ui-glass p-6" style={{ '--c': '20px' }}>
              <p className="ui-lab font-display">Final Check</p>
              <h2 className="mt-2 text-3xl font-black text-white">정비 · 엔트리 {roster.length}/{ROSTER_SIZE}</h2>
              {autoFilled > 0 && <p className="mt-2 text-sm font-semibold text-amber-200">채우지 못한 {autoFilled}자리는 퓨처스 유망주(종합 55)로 채웠습니다.</p>}
              <p className="mt-2 text-sm text-gray-400">
                선수를 끌어 자리를 바꾸며 마지막 조정을 합니다. 방출은 드래프트 중에만 할 수 있습니다.
                {match.aug ? `시즌을 시작하면 증강 ${match.aug}개를 고른 뒤 매치업 화면으로 갑니다.` : '이번 모드는 증강 없이 바로 매치업 화면으로 갑니다.'} 잔여 {cp} CP · 상대는 같은 규칙으로 드래프트한 AI 올스타.
              </p>
              {offPositionPlayers.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {offPositionPlayers.map((p) => (
                    <li key={p.id} className="ui-chip ui-cut text-amber-200" style={{ '--a': '#fbbf24' }}>
                      {p.name} {p.naturalPosition}→{p.position} <b className="font-display">{p.overall}</b>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-5"><LineupField roster={roster} onMove={handleMove} highlight={focusIds} focusLabel={focused?.name} onClearFocus={() => setFocusSynergy(null)} /></div>
              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['타선 공격력', myTeam.offense.toFixed(1)],
                  ['야수 수비력', myTeam.defense.toFixed(1)],
                  ['에이스 투구', myTeam.pitchValue(myTeam.sps[0]).toFixed(1)],
                  ['우타 비중', `${Math.round(myTeam.rightRatio * 100)}%`],
                ].map(([k, v]) => (
                  <div key={k} className="ui-cut bg-white/[0.045] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" style={{ '--c': '10px' }}>
                    <dt className="text-xs text-gray-500">{k}</dt>
                    <dd className="font-display text-3xl font-bold tabular-nums text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} onClick={startSeason}>시즌 시작 · 증강 고르기</button>
                <button type="button" className={btnGhost} onClick={newDraft}>처음부터 다시 드래프트</button>
              </div>
            </section>
          )}

          {phase === 'matchup' && opponent && (
            <MatchupScreen roster={roster} oppRoster={opponent} buff={buff} oppBuff={AI_BUFF[match.ai]} augments={augments}
              onStart={() => startGame(true)} onBack={() => setPhase('ready')} />
          )}

          {(phase === 'sim' || phase === 'result') && (
            <>
              {result && (
                <ResultPanel result={result} record={record} logs={logs}
                  onRematch={() => prepareMatch(true)} onNewOpp={() => prepareMatch(false)} onNewDraft={newDraft} />
              )}

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="ui-lab font-display" style={{ '--a': phase === 'sim' ? '#f87171' : '#10b981' }}>{phase === 'sim' ? 'Live' : 'Final'}</p>
                  <h2 className="mt-1 text-2xl font-black text-white">AI 올스타 <span className="font-display text-gray-500">vs</span> 나의 드림팀</h2>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display text-lg tabular-nums text-gray-300">{record.w}승 {record.l}패 {record.d}무</span>
                  {phase === 'sim' && (
                    <div className="ui-cut ui-glass2 flex gap-1 p-1" style={{ '--c': '8px' }} role="group" aria-label="중계 배속">
                      {[1, 2, 4].map((s) => (
                        <button key={s} type="button" onClick={() => setSpeed(s)} aria-pressed={speed === s}
                          className={`ui-cut px-3.5 py-1 font-display text-sm font-bold ${speed === s ? 'bg-[#10b981] text-[#05080f]' : 'text-gray-400 hover:text-white'}`} style={{ '--c': '5px' }}>
                          ×{s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Scoreboard board={board} half={half} myName="나의 드림팀" oppName="AI 올스타" />
              {phase === 'sim' && <BroadcastPlates log={[...logs].reverse().find((l) => l.pitcher)} />}

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
                <LiveLog logs={logs} paused={paused} />
                <section className="ui-cut ui-frame ui-glass p-3" style={{ '--c': '12px' }}>
                  <PanelTitle>증강 리스너</PanelTitle>
                  {augments.length === 0 ? <p className="text-xs text-gray-500">보유한 증강이 없습니다.</p> : (
                    <ul className="flex flex-col gap-1.5">
                      {augments.map((a) => {
                        const n = fireCount(a);
                        return (
                          <li key={a.id} className={`rounded-md border px-2.5 py-2 ${n ? TIER[a.tier].chip : 'border-gray-700 bg-[#111827]'}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold">{a.name}</span>
                              <span className="font-display text-sm tabular-nums">{n}/{a.max}</span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-gray-400">[{a.cond}]</p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>

            </>
          )}
        </div>

        {phase === 'ready' && (
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[6.5rem] lg:self-start">
            <RosterPanel roster={roster} />
            <SynergyPanel roster={roster} focusId={focusSynergy} onFocus={toggleFocus} />
            <AugmentShelf augments={augments} total={match.aug} />
          </aside>
        )}
      </main>
      )}

      {modal === 'rules' && <RulesModal onClose={() => setModal(null)} />}
      {modal === 'synergy' && <Modal eyebrow="Synergy" title="전체 시너지" onClose={() => setModal(null)}><SynergySheet roster={roster} candidate={previewTarget} focusId={focusSynergy} draft={phase === 'draft'} onFocus={(id) => { setPicked(null); setFocusSynergy(id); setModal(null); }} /></Modal>}
      <ChoiceOverlay choice={choice} onChoose={handleChoose} picksLeft={augPicksLeft} total={match.aug} />
      <HighlightToast toast={toast} />
    </div>
  );
}
