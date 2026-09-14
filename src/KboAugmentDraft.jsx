import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
export function rollSeries(roster, cp, avoidId = null, banned = [], rng = Math.random) {
  const open = DRAFT_SERIES.filter((s) => s.players.some((p) => !getLockReason(p, roster, cp, banned)));
  const pool = open.length > 1 ? open.filter((s) => s.id !== avoidId) : open;
  if (!pool.length) return null;
  const s = pickOne(rng, pool);
  return s.id === LEGEND_SERIES.id ? sampleLegend(roster, cp, banned, rng) : s;
}

export const LEGEND_SHOWN = 28; // 선반 14칸 × 두 줄
/** 올타임 레전드는 나올 때마다 28명만: 포지션마다 2명(선발 4명)을 먼저 채우고 나머지는 무작위. 영입 가능한 선수가 최소 1명은 들어간다 */
function sampleLegend(roster, cp, banned, rng) {
  const all = shuffle(LEGEND_SERIES.players, rng);
  const picked = POS_ORDER.flatMap((pos) => all.filter((p) => p.position === pos).slice(0, pos === 'SP' ? 4 : 2));
  picked.push(...all.filter((p) => !picked.includes(p)).slice(0, Math.max(0, LEGEND_SHOWN - picked.length)));
  if (!picked.some((p) => !getLockReason(p, roster, cp, banned))) {
    const open = all.find((p) => !getLockReason(p, roster, cp, banned));
    if (open) picked[picked.length - 1] = open;
  }
  return { ...LEGEND_SERIES, players: picked };
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
export function aiDraft(rng = Math.random) {
  let roster = [];
  let cp = SALARY_CAP;
  for (const pos of shuffle(POS_ORDER.flatMap((p) => Array(SLOT_LIMITS[p]).fill(p)), rng)) {
    const slotsAfter = ROSTER_SIZE - roster.length - 1;
    const cands = ALL_PLAYERS.filter((p) => p.position === pos && !getLockReason(p, roster, cp) && cp - p.cost >= slotsAfter * 70)
      .sort((a, b) => b.overall - a.overall);
    const fallback = ALL_PLAYERS.filter((p) => p.position === pos && !getLockReason(p, roster, cp)).sort((a, b) => a.cost - b.cost);
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
        log({ kind: 'augment', tier: fired.tier, inning, isTop, runs, text: `[증강 발동: ${fired.name}!] ${res.text}` });
        await onHighlight({ augment: fired, text: res.text, hero: res.hero });
        await sleep(500); // 하이라이트 일시정지 (배속 무관)
      } else {
        // ② 일반 난수 판정
        runs = baseRuns;
        const d = describeHalf(runs, offense, defPitcher, rng);
        if (!isTop && d.hitter) addCredit(d.hitter, runs * 3 + (d.text.includes('홈런') ? 2 : 0), 'runs');
        log({ kind: runs ? 'score' : 'normal', inning, isTop, runs, text: d.text });
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

  return { board, score, winner, logs, used, mvpPlayer: mvp.player, mvp };
}

/* ════════════════════════════════════════════════════════════════════
   UI — 다크 스포츠 대시보드 (Tailwind)
   ════════════════════════════════════════════════════════════════════ */

const KEYFRAMES = `
@keyframes rise { from { opacity: 0; transform: translateY(28px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes toast { 0% { opacity: 0; transform: scale(1.25); } 12% { opacity: 1; transform: scale(1); } 80% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.97) translateY(-12px); } }
@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
@keyframes cellIn { from { background-color: rgba(16,185,129,.35); } to { background-color: #111827; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes prism { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
/* PICK 카드가 빠질 때: 지정 해제는 가라앉으며 흐려지고, 영입은 초록으로 번쩍인 뒤 라인업 쪽(오른쪽 아래)으로 빨려 든다 */
@keyframes pickDrop { from { opacity: 1; transform: none; filter: blur(0); } to { opacity: 0; transform: translateY(22px) scale(.93); filter: blur(3px); } }
@keyframes pickSign {
  0% { opacity: 1; transform: none; filter: drop-shadow(0 0 0 rgba(16,185,129,0)); }
  28% { opacity: 1; transform: scale(1.04); filter: drop-shadow(0 0 22px rgba(52,211,153,.95)) brightness(1.25); }
  100% { opacity: 0; transform: translate(70%, 38%) scale(.35); filter: drop-shadow(0 0 10px rgba(52,211,153,.6)) brightness(1.1); }
}
.pick-leave { pointer-events: none; }
.pick-leave.drop { animation: pickDrop .26s ease-in both; }
.pick-leave.sign { animation: pickSign .55s cubic-bezier(.5,0,.75,.2) both; }
/* 라인업에 막 들어온 선수: 상체가 솟아오르고, 자막 바가 초록으로 번쩍, 원형 파동 + '영입' 꼬리표 */
@keyframes tokBust { 0% { opacity: 0; transform: translateY(26px) scale(.8); } 60% { opacity: 1; transform: translateY(-4px) scale(1.06); } 100% { opacity: 1; transform: none; } }
@keyframes tokBar {
  0% { transform: skewX(-10deg) scale(.7); opacity: 0; }
  35% { transform: skewX(-10deg) scale(1.1); opacity: 1; background: linear-gradient(90deg, #0f4a36, #1b6b50); box-shadow: inset 4px 0 0 #34d399, 0 0 0 3px #34d399, 0 0 38px rgba(16,185,129,.95); }
  100% { transform: skewX(-10deg); }
}
@keyframes tokRing { 0% { opacity: .95; transform: translate(-50%, -50%) scale(.2); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.9); } }
@keyframes tokTag { 0% { opacity: 0; transform: translate(-50%, 8px) scale(.6); } 18% { opacity: 1; transform: translate(-50%, -6px) scale(1.08); } 75% { opacity: 1; transform: translate(-50%, -10px); } 100% { opacity: 0; transform: translate(-50%, -22px); } }
/* 라인업 필드 토큰 (중계 자막 스타일) */
.lf-field { position: absolute; left: 0; top: 0; width: 900px; height: 580px; transform-origin: 0 0; }
.lf-tok { position: absolute; width: 168px; height: 84px; transform: translate(-50%, -50%); touch-action: none; user-select: none; cursor: grab; outline: none; }
.lf-tok.empty { cursor: pointer; }
.lf-tok:focus-visible .lf-bar { outline: 2px solid #10b981; outline-offset: 2px; }
.lf-bp { position: absolute; left: 2px; bottom: 10px; width: 62px; height: 82px; z-index: 2; background-repeat: no-repeat; -webkit-mask-image: linear-gradient(#000 72%, transparent); mask-image: linear-gradient(#000 72%, transparent); }
.lf-bar { position: absolute; left: 14px; right: 0; bottom: 0; height: 48px; display: flex; align-items: center; gap: 6px; padding: 0 10px 0 54px; background: linear-gradient(90deg, #0f1724, #1a2436); box-shadow: inset 4px 0 0 var(--n), 0 6px 14px rgba(0,0,0,.5); transform: skewX(-10deg); transition: box-shadow .15s, background .15s; }
.lf-bar > * { transform: skewX(10deg); }
.lf-bx { min-width: 0; flex: 1; line-height: 1.15; }
.lf-bx small { display: block; font-size: 10px; letter-spacing: .04em; color: #8791a3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lf-bx b { display: block; font-size: 14px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lf-ov { font-size: 22px; font-weight: 700; line-height: 1; color: var(--n); }
.lf-tok.empty .lf-bar { background: rgba(12,18,28,.85); box-shadow: inset 4px 0 0 #3b4656; }
.lf-tok.empty .lf-bx b { color: #5b6577; font-weight: 500; }
.lf-tok.ghost .lf-bx small, .lf-row.ghost .nm small { color: #10b981; }
.lf-tok.clash .lf-bx small, .lf-row.clash .nm small, .lf-off { color: #fbbf24 !important; }
.lf-tok.picked .lf-bar, .lf-tok.over .lf-bar { background: linear-gradient(90deg, #0f2a22, #15352b); box-shadow: inset 4px 0 0 #10b981, 0 0 0 2px #10b981; }
.lf-tok.lifted, .lf-row.lifted { opacity: .35; }
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
.lf-tok.focus .lf-bar { box-shadow: inset 4px 0 0 #38bdf8, 0 0 0 2px #38bdf8, 0 0 22px rgba(56,189,248,.45); }
.lf-row.focus { background: rgba(56,189,248,.16); box-shadow: inset 3px 0 0 #38bdf8, inset 0 0 0 1px #38bdf8; }
.lf-tok.dim, .lf-row.dim { opacity: .28; }
.lf-tok.joined { z-index: 5; }
.lf-tok.joined .lf-bp { animation: tokBust .6s cubic-bezier(.2,.8,.3,1.2) .12s both; }
.lf-tok.joined .lf-bar { animation: tokBar 1.1s ease-out .05s both; }
.lf-tok.joined::after { content: ''; position: absolute; left: 50%; top: 62%; width: 150px; height: 150px; border-radius: 50%; border: 3px solid #34d399; box-shadow: 0 0 24px rgba(52,211,153,.7), inset 0 0 18px rgba(52,211,153,.5); pointer-events: none; animation: tokRing .9s ease-out .15s both; }
.lf-tok.joined::before { content: '영입!'; position: absolute; left: 50%; top: -14px; z-index: 3; padding: 2px 10px; background: #10b981; color: #04150e; font-size: 13px; font-weight: 800; letter-spacing: .08em; white-space: nowrap; pointer-events: none; box-shadow: 0 4px 14px rgba(16,185,129,.55); animation: tokTag 1.6s ease-out .2s both; }
/* 시너지 목록 스크롤: 얇은 캡슐 손잡이, 트랙은 거의 보이지 않게 */
.syn-scroll { overscroll-behavior: contain; }
.syn-scroll::-webkit-scrollbar { width: 6px; }
.syn-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,.035); border-radius: 99px; margin: 4px 0; }
.syn-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(52,211,153,.55), rgba(16,185,129,.35)); border-radius: 99px; border: 1px solid rgba(5,8,15,.6); }
.syn-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, rgba(110,231,183,.85), rgba(52,211,153,.6)); }
@supports not selector(::-webkit-scrollbar) { .syn-scroll { scrollbar-width: thin; scrollbar-color: rgba(52,211,153,.5) transparent; } }
/* 중계 그래픽 묶음: 각진 판 + 초록 윗줄 + 라벨 탭 */
.bc-grp { position: relative; border-top: 3px solid #10b981; background: #0b111b; padding: 26px 10px 10px; }
.bc-label { position: absolute; left: 0; top: -3px; padding: 3px 14px 3px 10px; background: #10b981; color: #04150e; font-size: 11px; font-weight: 700; letter-spacing: .2em; clip-path: polygon(0 0,100% 0,88% 100%,0 100%); }
/* 구장 위 시너지 도크: 오른쪽 그늘 위에 줄 목록 */
.syn-dock { position: absolute; z-index: 6; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; padding: 12px 14px 10px 52px; background: linear-gradient(90deg, rgba(5,8,15,0) 0, rgba(5,8,15,.82) 24%, rgba(5,8,15,.92) 100%); }
.dock-row { display: block; width: 100%; text-align: left; padding: 8px 6px 8px 12px; border-bottom: 1px solid rgba(255,255,255,.07); background: none; }
.dock-row:hover { background: rgba(255,255,255,.03); }
.dock-row.on { background: linear-gradient(90deg, rgba(16,185,129,.16), transparent); box-shadow: inset 2px 0 0 #10b981; }
.dock-row.open { background: rgba(56,189,248,.07); box-shadow: inset 2px 0 0 #38bdf8; }
.dock-row.on.open { background: linear-gradient(90deg, rgba(16,185,129,.16), rgba(56,189,248,.06)); box-shadow: inset 2px 0 0 #10b981; }
.dock-row:focus-visible { outline: 2px solid #38bdf8; outline-offset: -2px; }
.lf-row .ov { align-self: center; font-size: 20px; font-weight: 700; color: var(--n); }
.lf-drag { position: fixed; z-index: 60; pointer-events: none; transform: translate(-50%, -60%) rotate(-3deg); display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; background: #0f1724; box-shadow: 0 0 0 2px #10b981, 0 12px 28px rgba(0,0,0,.6); color: #fff; font-weight: 700; font-size: 14px; }
.lf-drag i { width: 36px; height: 44px; background-color: #0b111b; background-repeat: no-repeat; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
`;

const TIER = {
  silver: { border: 'border-slate-300/70', text: 'text-slate-200', glow: 'shadow-[0_0_28px_-10px_rgba(203,213,225,0.7)]', chip: 'border-slate-300/40 bg-slate-300/10 text-slate-200', bar: 'bg-slate-300' },
  gold: { border: 'border-amber-400', text: 'text-amber-300', glow: 'shadow-[0_0_36px_-8px_rgba(251,191,36,0.6)]', chip: 'border-amber-400/50 bg-amber-400/10 text-amber-300', bar: 'bg-amber-400' },
  prismatic: { border: 'border-transparent', text: 'text-fuchsia-200', glow: 'shadow-[0_0_44px_-8px_rgba(232,121,249,0.6)]', chip: 'border-fuchsia-300/50 bg-fuchsia-400/10 text-fuchsia-200', bar: 'bg-gradient-to-b from-fuchsia-400 via-sky-300 to-emerald-400' },
};

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
function CapDashboard({ round, cp, roster, phase, onOpenRules, wide = false }) {
  const pct = Math.max(0, Math.min(1, cp / SALARY_CAP));
  const fill = pct > 0.5 ? 'bg-[#10b981]' : pct > 0.2 ? 'bg-yellow-400' : 'bg-red-500';
  const cpText = pct > 0.5 ? 'text-[#10b981]' : pct > 0.2 ? 'text-yellow-300' : 'text-red-400';
  const foreign = roster.filter((p) => p.isForeign).length;
  const phaseLabel = { draft: '드래프트', ready: '경기 준비', sim: '경기 중', result: '경기 종료' }[phase];

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-gray-800 bg-[#111827]/95 backdrop-blur">
      <div className={`mx-auto flex flex-wrap items-center gap-x-8 gap-y-3 px-4 ${wide ? 'max-w-[1920px] py-2' : 'max-w-7xl py-3'}`}>
        <div className="leading-none">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500">Legend Draft</p>
          <h1 className="mt-1 text-xl font-black leading-none text-white">레전드 드래프트</h1>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Round</span>
          <span className="font-display text-4xl font-bold leading-none tabular-nums text-white">{String(Math.min(round, ROSTER_SIZE)).padStart(2, '0')}</span>
          <span className="font-display text-lg font-semibold text-gray-500">/ {ROSTER_SIZE}</span>
          <span className="ml-2 rounded border border-gray-700 px-2 py-0.5 text-xs font-semibold text-gray-300">{phaseLabel}</span>
        </div>

        <div className="min-w-[260px] flex-1">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-gray-400">샐러리 캡 잔여</span>
            <span className="font-display tabular-nums">
              <span className={`text-2xl font-bold ${cpText}`}>{cp}</span>
              <span className="text-sm text-gray-500"> / {SALARY_CAP} CP</span>
            </span>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-gray-800">
            <div className={`h-full rounded-full transition-all duration-500 ${fill}`} style={{ width: `${pct * 100}%` }} />
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <span key={i} className="absolute top-0 h-full w-px bg-[#111827]/80" style={{ left: `${(i * 100) / 9}%` }} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {foreign > 0 && (
            <span title={foreign >= FOREIGN_LIMIT ? '외국인 한도에 도달해 외국인 후보는 잠깁니다' : `외국인 선수는 최대 ${FOREIGN_LIMIT}명`}
              className={`rounded-md border px-2.5 py-1.5 font-display text-base font-bold tabular-nums ${foreign >= FOREIGN_LIMIT ? 'border-amber-400/50 bg-amber-400/10 text-amber-300' : 'border-gray-700 bg-[#1f2937] text-gray-100'}`}>
              <span className="mr-1.5 font-sans text-xs font-semibold text-gray-400">외국인</span>{foreign}/{FOREIGN_LIMIT}
            </span>
          )}
          <button type="button" onClick={onOpenRules}
            className="flex items-center gap-2 rounded-md border border-gray-600 bg-[#1f2937] px-3 py-2 text-sm font-bold text-gray-100 transition hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]">
            <span className="grid h-5 w-5 place-items-center rounded-full border border-gray-500 font-display text-xs leading-none" aria-hidden="true">?</span>
            드래프트 규칙
          </button>
        </div>
      </div>
    </header>
  );
}

/* ───── 드래프트 상점 카드 ───── */
export function PlayerCard({ player, reason, shaking, onSelect, style }) {
  const locked = !!reason;
  const art = useArt(player);
  const acc = neonOf(player);
  const statKeys = player.type === 'batter' ? ['power', 'contact', 'speed', 'defense'] : ['stuff', 'control', 'stamina', 'stability'];
  return (
    <button type="button" onClick={() => onSelect(player)} aria-disabled={locked}
      aria-label={`${player.year} ${player.team} ${player.name}, ${POS_LABEL[player.position]}, 영입가 ${player.cost} CP${locked ? `, ${reason}` : ''}`}
      style={{ ...style, clipPath: cutCorners(18) }}
      className={`group relative block aspect-[2/3] w-full bg-[#05080f] text-left animate-[rise_.35s_ease-out_both] transition-transform duration-200 focus:outline-none
        ${locked ? 'cursor-not-allowed' : 'hover:-translate-y-1'}`}>
      <div className="absolute inset-0" style={shaking ? { animation: 'shake .3s' } : undefined}>
        {/* ① 전신 일러스트 */}
        <div className={`absolute inset-0 overflow-hidden ${locked ? 'opacity-45 grayscale' : ''}`}>
          {art ? (
            <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover object-[60%_20%] transition duration-500 group-hover:scale-[1.05]" />
          ) : (
            <div className="absolute inset-0" style={{ background: `radial-gradient(90% 60% at 65% 35%, ${acc}40, transparent 70%), linear-gradient(160deg, ${teamColor(player)}66, #05080f 70%)` }}>
              <span className="absolute right-4 top-1/4 select-none text-[9rem] font-black leading-none text-white/[0.07]">{player.name[0]}</span>
            </div>
          )}
          {/* 그림과 UI를 한 장으로 묶는 톤: 구단 네온 광원 + 좌상단·하단 암부 + 스캔라인 */}
          <div className="absolute inset-0 mix-blend-screen" style={{ background: `radial-gradient(70% 45% at 75% 25%, ${acc}26, transparent 70%)` }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,8,15,.5) 0%, rgba(5,8,15,0) 28%, rgba(5,8,15,0) 50%, rgba(5,8,15,.82) 76%, #05080f 100%), linear-gradient(90deg, rgba(5,8,15,.55) 0%, rgba(5,8,15,0) 48%)' }} />
          <div className="absolute inset-0 opacity-60" style={{ background: 'repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px)' }} />
        </div>

        {/* ② HUD 프레임 */}
        <svg viewBox="0 0 200 300" preserveAspectRatio="none" aria-hidden="true"
          className={`pointer-events-none absolute inset-[6px] h-[calc(100%-12px)] w-[calc(100%-12px)] transition-opacity duration-200 ${locked ? 'opacity-30' : 'opacity-70 group-hover:opacity-100 group-focus-visible:opacity-100'}`}>
          <path d="M13 1H199V287L187 299H1V13Z" fill="none" stroke={acc} strokeOpacity=".45" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d="M1 46V13L13 1H62" fill="none" stroke={acc} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <path d="M199 254V287L187 299H138" fill="none" stroke={acc} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <path d="M199 70V104M199 112V118" fill="none" stroke={acc} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <path d="M1 196V230" fill="none" stroke={acc} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className={`absolute inset-0 ${locked ? 'opacity-50' : ''}`}>
          {/* ③ 좌상단: 종합 · 포지션 · 스탯 패널 */}
          <div className="absolute left-5 top-5 w-[44%] [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]">
            <p className="font-display text-5xl font-bold leading-[0.85] tabular-nums" style={{ color: acc, textShadow: `0 0 18px ${acc}99, 0 2px 6px #000` }}>{player.overall}</p>
            <p className="mt-1 font-display text-[13px] font-bold uppercase tracking-[0.18em] text-white">{POS_EN[player.position]}</p>
            {/* 시즌 캡션: 인물은 오른쪽 절반에 배치되므로 왼쪽 열에 둔다 */}
            <p className="mt-0.5 whitespace-nowrap font-display text-[11px] font-semibold tracking-[0.12em] text-white/60">{player.year} · {player.team} · {handLabel(player)}</p>
            <dl className="mt-2.5 px-2.5 py-1.5 backdrop-blur-[3px]"
              style={{ background: 'rgba(5,8,15,.58)', boxShadow: `inset 0 0 0 1px ${acc}4d`, clipPath: cutCorners(7) }}>
              {statKeys.map((k) => {
                const v = player.stats[k];
                return (
                  <div key={k} className="flex items-baseline justify-between gap-2 py-[2px]">
                    <dt className="text-[11px] font-semibold text-gray-300">{STAT_LABELS[k]}</dt>
                    <dd className="font-display text-[15px] font-bold leading-none tabular-nums" style={{ color: v >= 90 ? acc : '#f3f4f6' }}>{v}</dd>
                  </div>
                );
              })}
            </dl>
          </div>


          {/* ⑤ 하단: 이름 · 노트 · 영입가 */}
          <div className="absolute inset-x-5 bottom-5">
            {player.note && <p className="mb-1 truncate text-xs font-medium text-gray-200 [text-shadow:0_1px_4px_#000]">{player.note}</p>}
            <h3 className="truncate text-[2rem] font-bold leading-none tracking-tight text-white" style={{ textShadow: `0 0 22px ${acc}80, 0 2px 8px #000` }}>{player.name}</h3>
            <div className="mt-2.5 h-px" style={{ background: `linear-gradient(90deg, ${acc}, ${acc}33 60%, transparent)` }} />
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex gap-1">
                <span className="px-1.5 py-0.5 font-display text-[11px] font-bold text-white" style={{ boxShadow: `inset 0 0 0 1px ${acc}80` }}>{player.position}</span>
                {player.isNational && <span className="px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.4)' }}>국대</span>}
                {player.isForeign && <span className="px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.4)' }}>외인</span>}
              </div>
              <span className="flex items-baseline gap-1 px-2.5 py-1 font-display font-bold tabular-nums text-[#05080f]" style={{ background: acc, clipPath: cutCorners(5) }}>
                <span className="text-[10px] font-semibold tracking-widest">영입</span>
                <span className="text-lg leading-none">{player.cost}</span>
                <span className="text-[10px]">CP</span>
              </span>
            </div>
          </div>
        </div>

        {locked && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="flex items-center gap-1.5 bg-[#05080f]/90 px-3 py-1.5 text-xs font-semibold text-gray-100" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.3)', clipPath: cutCorners(5) }}><LockIcon />{reason}</span>
          </div>
        )}
      </div>
    </button>
  );
}

/* ───── 드래프트 선반 미니 카드 (누르면 살펴보기, 영입은 왼쪽 판에서) ───── */
function MiniCard({ player, reason, selected, hint, focus, onPick, style }) {
  const art = useArt(player);
  const acc = neonOf(player);
  const locked = !!reason;
  return (
    <button type="button" onClick={() => onPick(player)} aria-pressed={selected}
      aria-label={`${player.year} ${player.team} ${player.name}, ${POS_LABEL[player.position]}, 영입가 ${player.cost} CP${locked ? `, ${reason}` : ''}`}
      style={{ ...style, clipPath: 'polygon(10% 0,100% 0,100% 93.3%,90% 100%,0 100%,0 6.7%)' }}
      className={`group relative block aspect-[2/3] w-full bg-[#05080f] text-left [container-type:inline-size] animate-[rise_.35s_ease-out_both] transition-transform duration-200 focus:outline-none focus-visible:-translate-y-1 ${selected ? '-translate-y-1' : 'hover:-translate-y-0.5'} ${focus === 'off' ? 'opacity-30' : ''}`}>
      {art
        ? <img src={art} alt="" className={`absolute inset-0 h-full w-full object-cover object-[62%_18%] ${locked ? 'opacity-40 grayscale' : ''}`} />
        : <span className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${teamColor(player)}66, #05080f 70%)` }} />}
      <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,8,15,.55) 0, rgba(5,8,15,0) 30%, rgba(5,8,15,0) 52%, rgba(5,8,15,.85) 80%, #05080f 100%)' }} />
      <span className={`pointer-events-none absolute inset-[2.5cqw] ${selected || focus === 'on' ? 'border-2' : 'border'}`}
        style={{ borderColor: selected ? '#10b981' : focus === 'on' ? '#38bdf8' : `${acc}66` }} />
      <span className={`absolute left-[8cqw] top-[6cqw] font-display text-[26cqw] font-bold leading-[.85] tabular-nums ${locked ? 'opacity-50' : ''}`} style={{ color: acc, textShadow: '0 1px 3px #000' }}>{player.overall}</span>
      <span className="absolute left-[8cqw] top-[31cqw] font-display text-[8.5cqw] font-bold tracking-[0.1em] text-white [text-shadow:0_1px_3px_#000]">{player.position}</span>
      {hint && <span className="absolute right-[6cqw] top-[6cqw] rounded-sm bg-[#10b981] px-[2.5cqw] py-[1cqw] text-[7.5cqw] font-bold leading-none text-[#062a1f]" title="진행 중인 시너지를 채웁니다">시너지</span>}
      <span className={`absolute inset-x-[8cqw] bottom-[19cqw] truncate text-[14cqw] font-bold leading-none tracking-tight text-white [text-shadow:0_1px_4px_#000] ${locked ? 'opacity-60' : ''}`}>{player.name}</span>
      {locked ? (
        <span className="absolute inset-x-[5cqw] bottom-[6cqw] truncate bg-[#05080f]/90 py-[2cqw] text-center text-[8cqw] font-semibold leading-none text-gray-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,.28)]">{reason}</span>
      ) : (
        <span className="absolute inset-x-[8cqw] bottom-[6.5cqw] flex items-center justify-between">
          <span className="font-display text-[8cqw] font-bold text-white/80">{player.isForeign ? '외인' : player.isNational ? '국대' : handLabel(player)}</span>
          <span className="px-[3.4cqw] py-[1.2cqw] font-display text-[10cqw] font-bold leading-none text-[#05080f]" style={{ background: acc }}>{player.cost}</span>
        </span>
      )}
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

function FieldArt() {
  const hx = 450, hy = 560, s = 180, R = 520, r = R / Math.SQRT2, q = s * 0.3;
  const fair = `M${hx} ${hy} L${hx - r} ${hy - r} A${R} ${R} 0 0 1 ${hx + r} ${hy - r} Z`;
  const base = (x, y) => <rect key={`${x}-${y}`} x={x - 7} y={y - 7} width="14" height="14" transform={`rotate(45 ${x} ${y})`} />;
  return (
    <svg className="absolute inset-0" width={FIELD_W} height={FIELD_H} viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} aria-hidden="true">
      <defs><pattern id="lf-mow" width="64" height="64" patternUnits="userSpaceOnUse"><rect width="32" height="64" fill="#fff" opacity=".022" /></pattern></defs>
      <path d={fair} fill="#10231a" /><path d={fair} fill="url(#lf-mow)" />
      <path d={`M${hx - r} ${hy - r} A${R} ${R} 0 0 1 ${hx + r} ${hy - r}`} fill="none" stroke="#2f4a3a" strokeWidth="10" />
      <polygon points={`${hx},${hy + q} ${hx + s + q},${hy - s} ${hx},${hy - 2 * s - q} ${hx - s - q},${hy - s}`} fill="#2a2119" opacity=".85" />
      <polygon points={`${hx},${hy - q} ${hx + s - q},${hy - s} ${hx},${hy - 2 * s + q} ${hx - s + q},${hy - s}`} fill="#10231a" />
      <path d={`M${hx} ${hy} L${hx - r} ${hy - r} M${hx} ${hy} L${hx + r} ${hy - r}`} stroke="#ffffff38" strokeWidth="2" />
      <circle cx={hx} cy={hy - s} r={s * 0.11} fill="#2a2119" />
      <g fill="#e5e7eb" opacity=".85">{base(hx + s, hy - s)}{base(hx, hy - 2 * s)}{base(hx - s, hy - s)}<path d={`M${hx - 9} ${hy - 6} h18 v7 l-9 8 l-9 -8 Z`} /></g>
    </svg>
  );
}

/** 토큰 한 칸의 표시값: 색 · 보조 문구 · 실전 종합 */
function tokenView(slot, player, kind, boosted) {
  const base = player && kind !== 'ghost' ? playAt({ ...player, slot: slot.id }) : player;
  const eff = ((kind === 'mine' || kind === 'clash') && boosted?.get(player.id)) || base; // 시너지 보너스까지 반영한 종합
  const moved = base?.naturalPosition;
  const color = kind === 'ghost' ? '#10b981' : kind === 'clash' ? '#fbbf24' : player ? neonOf(player) : '#344055';
  const sub = kind === 'ghost' ? '영입 시'
    : kind === 'clash' ? '마감'
      : moved ? `원래 ${moved} −${player.overall - base.overall}`
        : player ? `${player.year} ${player.team}` : slot.label;
  return { eff, moved, color, sub, boost: eff?.synergyBoost };
}

function SlotToken({ slot, player, kind, flags, bind, boosted }) {
  const bust = useBust(player, '260%');
  const { eff, moved, color, sub, boost } = tokenView(slot, player, kind, boosted);
  const [x, y] = SLOT_XY[slot.id];
  return (
    <div {...bind} data-slot={slot.id} role="button" tabIndex={0}
      aria-label={player ? `${slot.label} 자리 ${player.name} ${eff.overall}` : `${slot.label} 빈 자리`}
      className={`lf-tok ${player ? '' : 'empty'} ${kind} ${flags}`} style={{ left: x, top: y, '--n': color }}>
      <div className="lf-bp" style={bust}>{!bust && <Silhouette />}</div>
      <div className="lf-bar">
        <div className="lf-bx"><small className={moved && kind === 'mine' ? 'lf-off' : ''}>{slot.id} · {sub}</small><b>{player ? player.name : '빈 자리'}</b></div>
        {eff && (
          <em className="lf-ov font-display not-italic tabular-nums" style={boost ? { color: '#34d399' } : undefined} title={boost ? `시너지: ${boost.join(', ')}` : undefined}>
            {boost && <span className="mr-0.5 text-xs">▲</span>}{eff.overall}
          </em>
        )}
      </div>
    </div>
  );
}

function DragGhost({ player, x, y }) {
  const bust = useBust(player, '300%');
  return <div className="lf-drag" style={{ left: x, top: y }}><i style={bust} />{player.name}</div>;
}

/**
 * 내 라인업 필드. 선수를 끌어 다른 자리에 놓거나(빈 자리면 이동, 사람이 있으면 맞교환),
 * 한 명을 누른 뒤 다른 자리를 눌러도 바뀐다. candidate 가 있으면 들어갈 자리를 초록으로 미리 보여준다.
 */
function LineupField({ roster, candidate, candidateReason, onMove, onRelease, highlight, focusLabel, onClearFocus, reserve = 0, overlay = null, fill = false, className = '', locked = false }) {
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // 오른쪽 도크(reserve)를 뺀 영역 안에서 구장을 가운데로
  // fill + 넓은 화면: 부모 높이를 채우고 구장을 그 안에 맞춘다. 첫 렌더부터 켜 둬야 고정 높이를 한 번 거치지 않는다
  const [filling, setFilling] = useState(() => fill && typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  const [pick, setPick] = useState(null);
  const [drag, setDrag] = useState(null);
  const [confirmOut, setConfirmOut] = useState(false); // 방출은 두 번 눌러야 확정
  useEffect(() => setConfirmOut(false), [pick]);
  // 막 영입된 선수의 자리: 이전 엔트리에 없던 id 가 생기면 잠깐 'joined' 효과 (자리 이동·교환은 id 가 그대로라 제외)
  const [joined, setJoined] = useState(() => new Set());
  const prevIdsRef = useRef(null);
  useEffect(() => {
    const ids = new Set(roster.map((p) => p.id));
    const prev = prevIdsRef.current;
    prevIdsRef.current = ids;
    if (!prev) return undefined;
    const fresh = new Set(withSlots(roster).filter((p) => !prev.has(p.id)).map((p) => p.slot));
    if (!fresh.size) return undefined;
    setJoined(fresh);
    const t = setTimeout(() => setJoined(new Set()), 1800);
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
  const boosted = new Map(applySynergies(placed.map(playAt)).map((p) => [p.id, p]));
  const target = candidate && !candidateReason ? freeSlot(roster, candidate.position)?.id : null;
  const clashPos = candidate && candidateReason?.endsWith('마감') ? candidate.position : null;
  const kindOf = (s) => (at(s.id) ? (clashPos === s.pos ? 'clash' : 'mine') : s.id === target ? 'ghost' : 'empty');
  const playerOf = (s) => at(s.id) || (s.id === target ? candidate : null);
  const flagsOf = (s) => [joined.has(s.id) && at(s.id) && 'joined', pick === s.id && 'picked', drag && drag.over === s.id && drag.from !== s.id && 'over', drag?.from === s.id && 'lifted', highlight && (highlight.has(at(s.id)?.id) ? 'focus' : 'dim')].filter(Boolean).join(' ');
  const slotUnder = (e) => document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot]')?.dataset.slot || null;

  const tap = (id) => {
    if (locked) return;
    if (pick) { if (pick !== id) onMove(pick, id); setPick(null); } else if (at(id)) setPick(id);
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
      if (to && to !== d.from) onMove(d.from, to);
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
    <div ref={wrapRef} className={`relative w-full overflow-hidden bg-[radial-gradient(120%_95%_at_32%_62%,#13291e_0,#0c1711_52%,#070c09_100%)] ${className}`}
      style={filling ? undefined : { height: FIELD_H * scale }}>
      <div className="lf-field" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
        <FieldArt />
        {SLOTS.map((s) => <SlotToken key={s.id} slot={s} player={playerOf(s)} kind={kindOf(s)} flags={flagsOf(s)} bind={bind(s.id)} boosted={boosted} />)}
      </div>
      {overlay && <div className="syn-dock" style={{ width: reserve }}>{overlay}</div>}
      {highlight && (
        <button type="button" onClick={onClearFocus}
          className="absolute left-3 top-2 z-10 flex items-center gap-1.5 bg-sky-500/15 px-2 py-1 text-xs font-semibold text-sky-200 shadow-[inset_0_0_0_1px_rgba(56,189,248,.5)] hover:bg-sky-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
          {focusLabel} · {highlight.size}명 <span aria-hidden="true">✕</span>
        </button>
      )}
      {!locked && !highlight && (
        <p className="pointer-events-none absolute left-3 top-2 bg-[#05080f]/70 px-2 py-0.5 text-[11px] text-gray-300">
          {pick ? '바꿀 자리를 누르세요 · Esc 취소' : '선수를 끌어 다른 자리에 놓으면 자리를 바꿉니다 · 제 포지션 밖이면 종합 −3~−20'}
        </p>
      )}
      {onRelease && pick && at(pick) && (
        <div className="absolute left-3 top-9 z-10 flex items-center gap-2 bg-[#05080f]/90 px-2 py-1.5 text-xs text-gray-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]">
          <span>{at(pick).name} 방출 시 <b className="font-display text-sm text-white">+{releaseRefund(at(pick))}</b> CP 환불 · 다시 영입 불가</span>
          <button type="button"
            onClick={() => { if (!confirmOut) { setConfirmOut(true); return; } onRelease(pick); setPick(null); }}
            className={`px-2 py-1 font-bold ${confirmOut ? 'bg-red-500 text-white' : 'border border-red-400/60 text-red-300 hover:bg-red-500/10'}`}>
            {confirmOut ? '한 번 더 누르면 방출' : '방출'}
          </button>
        </div>
      )}
      {drag && at(drag.from) && <DragGhost player={at(drag.from)} x={drag.x} y={drag.y} />}
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
  const spent = roster.reduce((s, p) => s + p.cost, 0);
  return (
    <section className="rounded-lg border border-gray-800 bg-[#1f2937]/60 p-3">
      <PanelTitle aside={`${roster.length}/${ROSTER_SIZE} · ${spent} CP`}>나의 엔트리</PanelTitle>
      <ul className="flex flex-col gap-1">
        {rows.map(({ pos, key, player }) => (
          <li key={key} className={`flex items-center gap-2.5 rounded-md px-2 py-1 ${player ? 'bg-[#111827]' : 'border border-dashed border-gray-700'}`}>
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
const sortSynergies = (list) => [...list].sort((a, b) => b.active - a.active || b.level - a.level || b.cur / b.top - a.cur / a.top);

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
    <section className="rounded-lg border border-gray-800 bg-[#1f2937]/60 p-3">
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
function Modal({ title, eyebrow, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-[2px] animate-[fade_.15s_ease-out_both]" onClick={onClose} role="presentation">
      <section role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-[rise_.25s_ease-out_both] rounded-xl border border-gray-700 bg-[#111827] shadow-[0_24px_60px_-12px_rgba(0,0,0,.8)]">
        <header className="flex items-start justify-between gap-4 border-b border-gray-800 px-5 py-4">
          <div>
            {eyebrow && <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-[#10b981]">{eyebrow}</p>}
            <h2 className="mt-0.5 text-xl font-black text-white">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" autoFocus
            className="grid h-8 w-8 place-items-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      </section>
    </div>
  );
}

function RulesSheet() {
  return (
    <div className="flex flex-col gap-4">
      {RULE_SECTIONS.map((sec) => (
        <section key={sec.title}>
          <h3 className="mb-1.5 font-display text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">{sec.title}</h3>
          <ul className="flex flex-col gap-1">
            {sec.items.map((t) => (
              <li key={t} className="flex gap-2 text-sm leading-relaxed text-gray-200">
                <span className="mt-[0.6rem] h-1 w-1 shrink-0 rounded-full bg-[#10b981]" aria-hidden="true" />{t}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
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

function AugmentShelf({ augments }) {
  return (
    <section className="rounded-lg border border-gray-800 bg-[#1f2937]/60 p-3">
      <PanelTitle aside={`${augments.length}/${SEASON_AUGMENTS}`}>보유 증강</PanelTitle>
      {augments.length === 0 ? (
        <p className="text-xs leading-relaxed text-gray-500">엔트리를 채우고 정비를 마친 뒤 시즌을 시작하면 증강 {SEASON_AUGMENTS}개를 고릅니다.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {augments.map((a) => (
            <li key={a.id} className={`rounded-md border px-2.5 py-2 ${TIER[a.tier].chip}`}>
              <span className="text-sm font-bold">{a.name}</span>
              <p className="mt-0.5 text-xs text-gray-400">[{a.cond}]</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ───── TFT 스타일 증강 / 이벤트 선택 오버레이 ───── */
function ChoiceOverlay({ choice, onChoose }) {
  if (!choice) return null;
  const isAug = choice.kind === 'augment';
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={isAug ? '증강 선택' : '시즌 돌발 이벤트'}>
      <div className="flex min-h-full flex-col items-center justify-center gap-8 px-4 py-10">
        <div className="text-center animate-[rise_.4s_ease-out_both]">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.4em] text-[#10b981]">{isAug ? 'Choose an Augment' : 'Season Event'}</p>
          <h2 className="mt-2 text-3xl font-black text-white">{isAug ? '증강을 하나 선택하세요' : '시즌 돌발 이벤트 발생'}</h2>
          <p className="mt-2 text-sm text-gray-400">{isAug ? '경기 중 조건이 충족되면 난수 판정을 무시하고 이닝 결과를 확정합니다.' : '구단 운영 방향을 결정하세요. 선택은 되돌릴 수 없습니다.'}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-5">
          {choice.options.map((o, i) => (
            <TierFrame key={o.id} tier={o.tier} style={{ animationDelay: `${120 + i * 110}ms` }}
              className="w-[15.5rem] animate-[rise_.45s_ease-out_both] transition hover:-translate-y-1.5" innerClassName="flex h-[25rem] flex-col items-center p-5 text-center">
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${TIER[o.tier].chip}`}>{TIER_LABEL[o.tier]}</span>
              <div className="relative mt-6 grid h-20 w-20 place-items-center">
                <span className={`absolute h-14 w-14 rotate-45 rounded-md border-2 ${o.tier === 'prismatic' ? 'border-fuchsia-300' : TIER[o.tier].border}`} />
                <span className={`absolute h-7 w-7 rotate-45 rounded-sm ${TIER[o.tier].bar}`} />
              </div>
              <h3 className={`mt-5 text-xl font-black leading-tight ${TIER[o.tier].text}`} style={{ textWrap: 'balance' }}>{o.name}</h3>
              <p className="mt-3 rounded border border-[#10b981]/40 bg-[#10b981]/10 px-2 py-1 text-[13px] font-semibold text-[#10b981]">[{o.cond}]</p>
              <p className="mt-3 text-sm leading-relaxed text-gray-300">{o.desc}</p>
              <button type="button" onClick={() => onChoose(o)}
                className="mt-auto w-full rounded-md border border-gray-600 bg-[#1f2937] py-2.5 text-sm font-bold text-white transition hover:border-[#10b981] hover:text-[#10b981] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981]">
                선택
              </button>
            </TierFrame>
          ))}
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
    <div className="overflow-x-auto rounded-lg border border-gray-800 bg-[#0b1120] p-2 shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]">
      <table className="w-full min-w-[600px] border-separate border-spacing-1 font-display">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            <th className="px-2 text-left">Team</th>
            {Array.from({ length: 9 }, (_, i) => <th key={i} className="w-12">{i + 1}</th>)}
            <th className="w-16 text-[#10b981]">R</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="whitespace-nowrap rounded bg-[#111827] px-3 text-base font-bold text-white">
                <span className="mr-2 text-[10px] font-semibold tracking-widest text-gray-500">{r.top ? 'AWAY' : 'HOME'}</span>{r.name}
              </td>
              {r.arr.map((v, i) => {
                const live = half && half.inning === i + 1 && half.isTop === r.top;
                return (
                  <td key={i} style={v !== null ? { animation: 'cellIn .8s ease-out' } : undefined}
                    className={`h-12 rounded bg-[#111827] text-center text-2xl font-bold tabular-nums ${live ? 'ring-2 ring-[#10b981]' : ''} ${v === null ? 'text-gray-700' : v === 0 ? 'text-gray-400' : 'text-white'}`}>
                    {v === null ? (live ? <span className="text-base text-[#10b981]">●</span> : '') : v}
                  </td>
                );
              })}
              <td className={`rounded bg-[#1f2937] text-center text-3xl font-bold tabular-nums ${leader === r.key ? 'text-[#10b981]' : 'text-white'}`}>{total(r.arr)}</td>
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
    <section className="flex min-h-0 flex-col rounded-lg border border-gray-800 bg-[#1f2937]/60">
      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
        <h3 className="text-sm font-bold text-white">문자 중계</h3>
        {paused && <span className="text-xs font-bold text-[#10b981]">하이라이트 · 일시정지</span>}
      </div>
      <ol ref={ref} className="flex max-h-[26rem] flex-col gap-1 overflow-y-auto p-2">
        {logs.map((l) => {
          const inn = l.inning ? `${l.inning}회${l.isTop ? '초' : '말'}` : '';
          if (l.kind === 'augment') {
            const cut = l.text.indexOf('] ');
            return (
              <li key={l.id} className={`animate-[rise_.3s_ease-out_both] rounded-md border-l-4 bg-[#111827] px-3 py-2 text-sm ${l.tier === 'prismatic' ? 'border-fuchsia-300' : TIER[l.tier].border}`}>
                <span className="mr-2 font-display text-xs font-semibold text-gray-500">{inn}</span>
                <span className="font-bold text-[#10b981]">{cut > 0 ? l.text.slice(0, cut + 1) : ''}</span>
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
function HighlightToast({ toast }) {
  if (!toast) return null;
  const { augment, text } = toast;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-black/40 px-4" aria-live="assertive">
      <div key={toast.key} className="w-full max-w-lg animate-[toast_1.7s_ease_both]">
        <TierFrame tier={augment.tier} innerClassName="px-8 py-7 text-center">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.45em] text-[#10b981]">Augment Activated</p>
          <p className={`mt-3 text-4xl font-black leading-tight ${TIER[augment.tier].text}`} style={{ textWrap: 'balance' }}>{augment.name}!</p>
          <p className="mt-3 text-base text-gray-200">{text}</p>
        </TierFrame>
      </div>
    </div>
  );
}

/* ───── 경기 정산 · 오늘의 MVP ───── */
function MvpStage({ result }) {
  const { mvp, mvpPlayer: p } = result;
  const art = useArt(p);
  const lines = p.type === 'pitcher'
    ? [['무실점 이닝', mvp.zero], ['증강 발동', mvp.fires], ['종합', p.overall]]
    : [['득점 이닝', mvp.runs], ['증강 발동', mvp.fires], ['종합', p.overall]];
  return (
    <section className="grid overflow-hidden rounded-xl border border-[#10b981]/30 bg-[#1f2937]/70 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="relative aspect-[4/5] max-h-[30rem] w-full overflow-hidden bg-gradient-to-br from-emerald-500/10 to-transparent md:aspect-auto md:min-h-[26rem]"
        style={art ? undefined : { background: `radial-gradient(90% 70% at 40% 20%, ${teamColor(p)}55, transparent 70%), linear-gradient(135deg, rgba(16,185,129,0.1), transparent)` }}>
        <span className="absolute -bottom-6 -left-2 select-none font-display text-[12rem] font-black leading-none text-white/[0.05]">MVP</span>
        {art
          ? <img src={art} alt={`${p.year} ${p.team} ${p.name}`} className="absolute inset-0 h-full w-full object-cover object-[50%_15%]" />
          : <span className="absolute inset-0 grid place-items-center text-[7rem] font-black text-white/15">{p.name[0]}</span>}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#1f2937]/70" />
        <span className="absolute left-7 top-7 rounded bg-[#10b981] px-2.5 py-1 font-display text-xs font-bold uppercase tracking-[0.3em] text-[#111827]">Today&apos;s MVP</span>
      </div>
      <div className="flex flex-col justify-center gap-5 p-7">
        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-[#10b981]">오늘의 MVP</p>
          <h2 className="mt-2 text-5xl font-black leading-none text-white">{p.name}</h2>
          <p className="mt-2 font-display text-lg tabular-nums text-gray-400">{p.year} {p.team} · {POS_LABEL[p.position]}</p>
          {p.note && <p className="mt-3 text-sm text-gray-300">{p.note}</p>}
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {lines.map(([k, v]) => (
            <div key={k} className="rounded-md border border-gray-700 bg-[#111827] px-3 py-2">
              <dt className="text-[11px] text-gray-500">{k}</dt>
              <dd className="font-display text-3xl font-bold tabular-nums text-white">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   메인 컴포넌트 — 상태 관리 · 드래프트 핸들러 · 시뮬레이션 연결
   ════════════════════════════════════════════════════════════════════ */

const RULE_SECTIONS = [
  { title: '엔트리', items: [`총 ${ROSTER_SIZE}명 — 투수는 선발투수·중간계투·마무리, 야수는 포지션마다 1명(외야수만 3명)`, `외국인 선수는 최대 ${FOREIGN_LIMIT}명`, '같은 선수(동일인)는 시즌이 달라도 한 번만'] },
  { title: '영입가', items: [`샐러리 캡 ${SALARY_CAP} CP 안에서 영입`, '종합 85 이상 스타는 영입가 할증, 71 이하는 할인', '라운드마다 시리즈 하나가 열리고, 한 명을 뽑으면 다음 시리즈로 넘어감'] },
  { title: '라인업', items: ['필드에서 선수를 끌어 자리를 옮기거나 맞교환', '제 포지션이 아니면 종합 감소 — 비슷한 자리(2루↔유격, 1루↔3루, 선발↔불펜) −3 · 같은 계열 −6 · 포수 −8 · 투수↔야수 −20', '야수를 지명타자에 세우면 감소 없음'] },
  { title: '방출', items: ['드래프트 중에만 가능 (정비 화면에서는 불가)', '영입가의 절반을 CP로 돌려받음', '방출한 선수는 이번 드래프트에서 다시 영입할 수 없음', '마감된 포지션의 후보를 고르면 “교체 영입”으로 그 자리 가장 약한 선수와 바로 교체'] },
  { title: '시너지', items: ['완성하면 그 시너지를 만든 선수만 능력치가 오름 (필드에 초록 ▲로 표시)', '선수 조합(실화)은 카드 시즌과 상관없이 같은 선수면 인정', '“시너지” 표시가 붙은 카드는 진행 중인 시너지를 채움', '시너지를 누르면 해당 선수 강조 · 카드를 고르면 오를 칸이 파랗게 표시', '팀 구성 시너지는 인원이 늘면 단계가 올라 더 강해짐', `한 선수가 시너지로 받는 보너스는 능력치마다 최대 +${SYNERGY_STAT_CAP}`] },
  { title: '시즌', items: [`${ROSTER_SIZE}명을 채우면 정비 화면에서 마지막 조정`, `시즌을 시작하면 경기 화면에서 증강 ${SEASON_AUGMENTS}개를 고름`, '채우지 못한 자리는 퓨처스 유망주(종합 55)가 맡음'] },
];

export default function KboAugmentDraft() {
  // 드래프트 상태
  const [phase, setPhase] = useState('draft'); // draft | ready | sim | result
  const [roster, setRoster] = useState([]);
  const [cp, setCp] = useState(SALARY_CAP);
  const [rerolls, setRerolls] = useState(START_REROLLS);
  const [buff, setBuff] = useState(0);
  const [augments, setAugments] = useState([]);
  const [series, setSeries] = useState(() => rollSeries([], SALARY_CAP));
  const [augPicksLeft, setAugPicksLeft] = useState(0);
  const [choice, setChoice] = useState(null); // { kind: 'augment' | 'event', options }
  const [shake, setShake] = useState(null);
  const [picked, setPicked] = useState(null); // 선반에서 살펴보는 후보
  const [modal, setModal] = useState(null); // 'rules' | 'synergy'
  const [focusSynergy, setFocusSynergy] = useState(null); // 누른 시너지 — 해당 선수를 화면에서 강조
  // PICK 에서 빠지는 카드: 잠깐 남겨 두고 사라지는 효과를 준다 (영입이면 sign, 그냥 해제면 drop)
  const [pickLeave, setPickLeave] = useState(null);
  const prevPickRef = useRef(null);
  useEffect(() => {
    const prev = prevPickRef.current;
    prevPickRef.current = picked;
    if (!prev || picked) { if (picked) setPickLeave(null); return undefined; }
    const mode = roster.some((p) => p.id === prev.id) ? 'sign' : 'drop';
    const leave = { player: prev, mode, key: `${prev.id}-${Date.now()}` };
    setPickLeave(leave);
    const t = setTimeout(() => setPickLeave((l) => (l === leave ? null : l)), mode === 'sign' ? 560 : 270);
    return () => clearTimeout(t);
  }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps
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

  const full = roster.length >= ROSTER_SIZE;
  const canPickAny = useMemo(() => ALL_PLAYERS.some((p) => !getLockReason(p, roster, cp, released)), [roster, cp, released]);
  const seriesCards = useMemo(() => (series
    ? [...series.players].sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position) || b.overall - a.overall)
    : []), [series]);
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
    if (next.length >= ROSTER_SIZE) {
      // 엔트리 완성 → 정비 화면. 증강은 시즌을 시작할 때 고른다
      setSeries(null);
      setPhase('ready');
    } else {
      setSeries(rollSeries(next, nextCp, series?.id, released));
    }
  }, [phase, choice, roster, cp, augments, series, released]);

  const handleChoose = (option) => {
    if (choice.kind === 'augment') {
      const owned = [...augments, option];
      const left = augPicksLeft - 1;
      setAugments(owned);
      setAugPicksLeft(left);
      setChoice(left > 0 ? { kind: 'augment', options: augmentOptions(owned) } : null);
      if (left <= 0) startGame(false, owned); // 마지막 증강을 고르면 곧바로 플레이볼
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
    setSeries(rollSeries(roster, cp, series?.id, released));
  };

  /* 라인업 자리 바꾸기: 빈 자리면 이동, 사람이 있으면 맞교환. 자리가 비고 차는 대로 후보 잠금이 다시 계산된다 */
  const handleMove = (from, to) => {
    if (phase !== 'draft' && phase !== 'ready') return;
    setRoster((r) => withSlots(r).map((p) => (p.slot === from ? { ...p, slot: to } : p.slot === to ? { ...p, slot: from } : p)));
  };

  /* 경기 시작: AI 드래프트 → 비동기 시뮬레이션 루프 */
  /* 시즌 시작: 경기 화면으로 들어가 증강을 고르고, 다 고르면 첫 경기가 열린다 */
  const startSeason = () => {
    if (augments.length >= SEASON_AUGMENTS) { startGame(); return; }
    runIdRef.current += 1;
    setPhase('sim');
    setBoard(emptyBoard());
    setHalf(null);
    setLogs([]);
    setResult(null);
    setToast(null);
    setAugPicksLeft(SEASON_AUGMENTS - augments.length);
    setChoice({ kind: 'augment', options: augmentOptions(augments) });
  };

  const startGame = async (rematch = false, owned = augments) => {
    const oppRoster = rematch && opponent ? opponent : aiDraft();
    setOpponent(oppRoster);
    const my = buildTeam('나의 드림팀', fillRoster(roster), buff);
    const opp = buildTeam('AI 올스타', fillRoster(oppRoster), 0);
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
      onHighlight: async ({ augment, text }) => {
        const key = Date.now() + Math.random();
        setPaused(true);
        setToast({ key, augment, text });
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
    setPhase('draft'); setRoster([]); setPicked(null); setReleased([]); setCp(SALARY_CAP); setRerolls(START_REROLLS); setBuff(0); setAugments([]);
    setSeries(rollSeries([], SALARY_CAP)); setAugPicksLeft(0); setChoice(null); setOpponent(null); setBoard(emptyBoard()); setHalf(null);
    setLogs([]); setToast(null); setResult(null); setRecord({ w: 0, l: 0, d: 0 });
  };

  const fireCount = (a) => logs.filter((l) => l.kind === 'augment' && l.text.startsWith(`[증강 발동: ${a.name}!]`)).length;
  const btn = 'rounded-md px-4 py-2.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] disabled:cursor-not-allowed disabled:opacity-40';
  const btnPrimary = `${btn} bg-[#10b981] text-[#062a1f] hover:bg-emerald-400`;
  const btnGhost = `${btn} border border-gray-600 bg-[#1f2937] text-gray-100 hover:border-gray-400`;
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
  };
  /* 교체 영입: 마감된 포지션의 후보를 고르면, 그 자리에서 실전 종합이 가장 낮은 선수를 방출하고 곧바로 들인다 */
  const swapPlan = (() => {
    if (phase !== 'draft' || !picked || !pickedReason?.endsWith('마감')) return null;
    const [weakest] = withSlots(roster).filter((p) => slotPos(p.slot) === picked.position).sort((a, b) => playAt(a).overall - playAt(b).overall);
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
    setSeries(rollSeries(next, nextCp, series?.id, swapPlan.banned));
  };

  return (
    // 드래프트는 넓은 화면(lg+)에서 창 높이에 딱 맞는 한 화면 앱으로: 스크롤 없이 머리 · 시리즈 · 영입+라인업이 들어간다
    <div className={`min-h-screen bg-[#111827] font-sans text-gray-100 antialiased ${phase === 'draft' ? 'lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden' : ''}`}>
      <style>{KEYFRAMES}</style>
      <CapDashboard round={roster.length + (phase === 'draft' ? 1 : 0)} cp={cp} roster={roster} phase={phase} onOpenRules={() => setModal('rules')} wide={phase === 'draft'} />

      <main className={`mx-auto grid px-4 ${phase === 'draft'
        ? 'w-full max-w-[1920px] gap-3 py-3 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)]'
        : 'max-w-7xl gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_20rem]'}`}>
        <div className="flex min-w-0 flex-col gap-5 lg:min-h-0">
          {phase === 'draft' && (
            // --card-w: 선수 카드 폭을 창 높이에 맞추되, 한 시리즈 14장이 한 줄에 들어가도록 창 폭으로도 제한
            <section className="flex flex-col gap-3 lg:min-h-0 lg:flex-1" style={{ '--card-w': 'min(clamp(4.2rem, 10.5vh, 6.4rem), calc((100vw - 140px) / 14))' }}>
              {!canPickAny && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-3">
                  <p className="text-sm text-yellow-100">영입 가능한 선수가 남아 있지 않습니다. 빈 자리는 퓨처스 유망주(종합 55)로 채워집니다.</p>
                  <button type="button" className={btnPrimary} onClick={() => { setSeries(null); setPhase('ready'); }}>이대로 정비하러 가기</button>
                </div>
              )}
              {/* 시리즈 묶음: 한 줄 머리 + 선수 카드 (중계 그래픽 판) */}
              <div className="bc-grp">
                <span className="bc-label font-display">SERIES</span>
              {series && (
                <div key={series.id} className="mb-2 flex animate-[rise_.35s_ease-out_both] flex-wrap items-center gap-x-2.5 gap-y-1 px-1">
                  <span className="rounded border border-[#10b981]/50 bg-[#10b981]/10 px-1.5 py-px text-[11px] font-bold text-[#10b981]">{SERIES_KIND_LABEL[series.kind]}</span>
                  {series.year && <span className="font-display text-lg font-bold leading-none tabular-nums text-[#10b981]">{series.year}</span>}
                  <h2 className="text-base font-black leading-none text-white">{series.title}</h2>
                  {series.subtitle && <span className="min-w-0 truncate text-xs text-gray-400">{series.subtitle}</span>}
                  <span className="ml-auto font-display text-xs tabular-nums text-gray-400">
                    영입 가능 {seriesCards.filter((p) => !getLockReason(p, roster, cp, released)).length} / {seriesCards.length}명
                  </span>
                  <button type="button" onClick={handleReroll} disabled={rerolls <= 0}
                    className="rounded-md border border-gray-600 bg-[#1f2937] px-2.5 py-1 text-xs font-bold text-gray-100 transition hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] disabled:cursor-not-allowed disabled:opacity-40">
                    다른 시리즈 <span className="ml-0.5 font-display tabular-nums text-gray-400">×{rerolls}</span>
                  </button>
                </div>
              )}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(4.6rem,1fr))] gap-1.5 lg:grid-cols-[repeat(auto-fill,var(--card-w))]">
                {seriesCards.map((p, i) => (
                  <MiniCard key={p.id} player={p} reason={getLockReason(p, roster, cp, released)} selected={picked?.id === p.id}
                    hint={!getLockReason(p, roster, cp, released) && growsFor(p).some((s) => s.cur > 0)}
                    focus={focused ? (synergyGrows(focused, previewSynergies(roster, p).get(focused.id)) ? 'on' : 'off') : null}
                    onPick={setPicked} style={{ animationDelay: `${i * 20}ms` }} />
                ))}
              </div>
              </div>
              {/* 넓은 화면: 구장이 줄 높이를 정하고, 영입 카드 묶음은 그 높이에 맞춘다 */}
              <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[clamp(15rem,19vw,21rem)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
                <div className="bc-grp lg:min-h-0">
                  <span className="bc-label font-display">PICK</span>
                <div className="relative flex flex-col gap-2 lg:absolute lg:inset-x-2.5 lg:bottom-2.5 lg:top-[26px]">
                  {picked ? (
                    <>
                      <div className="flex min-h-0 justify-center lg:flex-1">
                        <div key={picked.id} className="aspect-[2/3] w-full lg:h-full lg:w-auto lg:max-w-full">
                          <PlayerCard player={picked} reason={pickedReason} shaking={shake === picked.id} onSelect={handleSelectPlayer} />
                        </div>
                      </div>
                      {swapPlan ? (
                        <>
                          <button type="button" className={btnPrimary} disabled={!!swapPlan.reason} onClick={handleSwapIn}>
                            {swapPlan.reason ? `교체 불가 · ${swapPlan.reason}` : `교체 영입 · ${swapPlan.out.name} 방출`}
                          </button>
                          <p className="text-xs leading-relaxed text-gray-400">
                            {swapPlan.out.name}({playAt(swapPlan.out).overall}) 방출 → <b className="text-gray-200">+{swapPlan.refund} CP</b> 환불(영입가 절반), 다시 영입할 수 없습니다.
                            {' '}{picked.name} 영입 {picked.cost} CP.
                          </p>
                        </>
                      ) : (
                        <button type="button" className={btnPrimary} disabled={!!pickedReason} onClick={() => handleSelectPlayer(picked)}>
                          {pickedReason || `${picked.name} 영입 · ${picked.cost} CP`}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="grid aspect-[2/3] animate-[fade_.3s_ease-out_both] place-items-center rounded-lg border border-dashed border-gray-700 p-4 text-center text-sm leading-relaxed text-gray-500 lg:aspect-auto lg:flex-1">
                        위 카드를 누르면 여기서 자세히 보고 영입합니다. 들어갈 자리는 필드에 초록으로 표시됩니다.
                      </div>
                      {pickLeave && (
                        <div key={pickLeave.key} className="pointer-events-none absolute inset-x-0 top-0 flex justify-center lg:bottom-[calc(2.5rem+0.5rem)]" aria-hidden="true">
                          <div className={`pick-leave ${pickLeave.mode} aspect-[2/3] w-full lg:h-full lg:w-auto lg:max-w-full`}>
                            <PlayerCard player={pickLeave.player} reason={null} onSelect={() => {}} style={{ animation: 'none' }} />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                </div>
                {/* 내 라인업: 구장이 판 전체의 배경, 시너지는 오른쪽 도크로 그 위에 얹힌다 */}
                <div className="bc-grp !px-0 !pb-0 lg:flex lg:min-h-0 lg:flex-col">
                  <span className="bc-label font-display">MY LINEUP</span>
                  <LineupField roster={roster} candidate={picked} candidateReason={pickedReason} onMove={handleMove} onRelease={handleRelease}
                    highlight={focusIds} focusLabel={focused?.name} onClearFocus={() => setFocusSynergy(null)}
                    reserve={320} fill className="lg:min-h-0 lg:flex-1"
                    overlay={<SynergyTracker roster={roster} candidate={previewTarget} focusId={focusSynergy} onFocus={toggleFocus} onOpenAll={() => setModal('synergy')} />} />
                </div>
              </div>
            </section>
          )}

          {phase === 'ready' && (
            <section className="rounded-xl border border-gray-800 bg-[#1f2937]/60 p-6">
              <p className="font-display text-sm font-semibold uppercase tracking-[0.35em] text-[#10b981]">Final Check</p>
              <h2 className="mt-2 text-3xl font-black text-white">정비 · 엔트리 {roster.length}/{ROSTER_SIZE}</h2>
              <p className="mt-2 text-sm text-gray-400">
                선수를 끌어 자리를 바꾸며 마지막 조정을 합니다. 방출은 드래프트 중에만 할 수 있습니다.
                시즌을 시작하면 경기 화면에서 증강 {SEASON_AUGMENTS}개를 고르고 곧바로 플레이볼합니다. 잔여 {cp} CP · 상대는 같은 규칙으로 드래프트한 AI 올스타.
              </p>
              {offPositionPlayers.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {offPositionPlayers.map((p) => (
                    <li key={p.id} className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">
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
                  <div key={k} className="rounded-lg border border-gray-700 bg-[#111827] px-4 py-3">
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

          {(phase === 'sim' || phase === 'result') && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-display text-sm font-semibold uppercase tracking-[0.35em] text-gray-500">{phase === 'sim' ? 'Live' : 'Final'}</p>
                  <h2 className="text-2xl font-bold text-white">AI 올스타 <span className="text-gray-500">vs</span> 나의 드림팀</h2>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display text-lg tabular-nums text-gray-400">{record.w}승 {record.l}패 {record.d}무</span>
                  {phase === 'sim' && (
                    <div className="flex rounded-md border border-gray-700 bg-[#1f2937] p-0.5" role="group" aria-label="중계 배속">
                      {[1, 2, 4].map((s) => (
                        <button key={s} type="button" onClick={() => setSpeed(s)}
                          className={`rounded px-3 py-1 font-display text-sm font-bold ${speed === s ? 'bg-[#111827] text-[#10b981]' : 'text-gray-400 hover:text-white'}`}>
                          {s}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {result && (
                <div className={`rounded-xl border px-6 py-5 text-center ${result.winner === 'my' ? 'border-[#10b981]/50 bg-[#10b981]/10' : result.winner === 'opp' ? 'border-red-500/40 bg-red-500/10' : 'border-gray-700 bg-[#1f2937]'}`}>
                  <p className={`text-4xl font-black ${result.winner === 'my' ? 'text-[#10b981]' : result.winner === 'opp' ? 'text-red-400' : 'text-gray-200'}`}>
                    {result.winner === 'my' ? '승리' : result.winner === 'opp' ? '패배' : '무승부'}
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">{result.score.my} : {result.score.opp}</p>
                </div>
              )}

              <Scoreboard board={board} half={half} myName="나의 드림팀" oppName="AI 올스타" />

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
                <LiveLog logs={logs} paused={paused} />
                <section className="rounded-lg border border-gray-800 bg-[#1f2937]/60 p-3">
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

              {result && (
                <>
                  <MvpStage result={result} />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btnPrimary} onClick={() => startGame(true)}>같은 상대와 재경기</button>
                    <button type="button" className={btnGhost} onClick={() => startGame(false)}>새 AI 상대와 경기</button>
                    <button type="button" className={btnGhost} onClick={newDraft}>새 드래프트</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {phase !== 'draft' && (
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[6.5rem] lg:self-start">
            <RosterPanel roster={roster} />
            <SynergyPanel roster={roster} focusId={focusSynergy} onFocus={toggleFocus} />
            <AugmentShelf augments={augments} />
          </aside>
        )}
      </main>

      {modal === 'rules' && <Modal eyebrow="How to Draft" title="드래프트 규칙" onClose={() => setModal(null)}><RulesSheet /></Modal>}
      {modal === 'synergy' && <Modal eyebrow="Synergy" title="전체 시너지" onClose={() => setModal(null)}><SynergySheet roster={roster} candidate={previewTarget} focusId={focusSynergy} draft={phase === 'draft'} onFocus={(id) => { setPicked(null); setFocusSynergy(id); setModal(null); }} /></Modal>}
      <ChoiceOverlay choice={choice} onChoose={handleChoose} />
      <HighlightToast toast={toast} />
    </div>
  );
}
