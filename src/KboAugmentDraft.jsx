import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import ReadyLocker from './myteam/ReadyLocker.jsx';
import { autoArrange } from './myteam/SquadBoard.jsx';
import { bannedAugIds, augLevels, favAugIds, loadAccount, myBanner, draftTickets, spendDraftTicket, augShopTickets, spendAugTicket, pledgedAugId, setPledgedAug } from './myteam/store.js';
import { withDraftTickets, DRAFT_TICKET_KO, DRAFT_TICKET_TIP, withAugTickets } from './myteam/shop.js';
import { BANNERS, flagByKey, teamFlag } from './myteam/teamArt.js';
import { statOf } from './myteam/teamColor.js';
import { statColor, statPct } from './myteam/teamColor.js';
import { createPortal } from 'react-dom';
import { SERIES, overallOf, costOf } from './data/seriesPlayers.js';
import BroadcastGame, { engineTeam } from './BroadcastGame.jsx';
import TournamentBracket from './myteam/TournamentBracket.jsx';
import { makeTournament, myOpponent as tourneyOpponent, advance as advanceTourney, ownerOf, seedByStrength, playStrength } from './myteam/tournament.js';
import * as Live from './draft/live.js';
import * as Gaunt from './draft/gauntlet.js';
import { NO_CAP, isNoCap, specialAiRoster, rosterOrigin } from './draft/special.js';
import GauntletScreen from './draft/GauntletScreen.jsx';
import { seriesName } from './myteam/aiTeam.js';
import { setMods, addRuns } from './engine/pitchSim.js';

/* ════════════════════════════════════════════════════════════════════
   KBO 드래프트 & 증강 시뮬레이터 — 단일 파일 (코어 엔진 + 대시보드 UI)
   ════════════════════════════════════════════════════════════════════ */

/* ───────────── 1. 규칙 상수 ───────────── */
export const SALARY_CAP = 1560; // 자리 20개 × 약 78 CP
export const FOREIGN_LIMIT = 3;
export const SLOT_LIMITS = { SP: 1, RP: 4, C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, DH: 1 };
export const BENCH_SIZE = 6; // 예비: 포지션을 가리지 않는 자리
export const POS_ORDER = ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'DH'];
export const POS_LABEL = { SP: '선발', RP: '불펜', C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', OF: '외야수', DH: '지명타자' };
const SEASON_AUGMENTS = 1; // 엔트리를 모두 채운 뒤 시즌 개막 때 고르는 증강 수
const FREE_REROLL = 1; // 선택지마다 거저 다시 굴릴 수 있는 횟수
/* 경기 중 증강은 두 번만 — 플레이볼 직후와 7회 시작 전. 자주 멈추면 경기 흐름이 끊긴다 */
const MID_AUG_INNINGS = [1, 7];
const SERIES_KIND_LABEL = { team: '구단 시즌', national: '국가대표', legend: '레전드' };
const SERIES_NEON = { team: '#10b981', national: '#60a5fa', legend: '#fbbf24' };
/** 단계별 화면 배경 (public/ui/*.webp, Higgsfield 생성) */
const PHASE_BG = { mode: 'stadium', draft: 'stadium', ready: 'ready', matchup: 'broadcast', sim: 'broadcast', result: 'stadium', bracket: 'stadium', gauntlet: 'gauntlet' };
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
  P('ryu06', '류현진', 2006, '한화', 'SP', 'L', 92, [91, 80, 93, 92], { note: '데뷔 시즌 투수 3관왕·MVP', face: '53% 12%' }),
  P('kkh08', '김광현', 2008, 'SK', 'SP', 'L', 88, [86, 66, 82, 91], { note: '정규시즌 MVP' }),
  P('choi84', '최동원', 1984, '롯데', 'SP', 'R', 95, [78, 82, 99, 90], { note: '한국시리즈 4승' }),
  P('yoon11', '윤석민', 2011, 'KIA', 'SP', 'R', 91, [91, 80, 86, 92], { note: '투수 4관왕·정규시즌 MVP' }),
  P('yang17', '양현종', 2017, 'KIA', 'SP', 'L', 89, [76, 83, 91, 86], { note: '20승·정규시즌 & KS MVP' }),
  P('nip16', '니퍼트', 2016, '두산', 'SP', 'R', 91, [80, 73, 86, 89], { fgn: 1, note: '22승·정규시즌 MVP' }),
  P('lind19', '린드블럼', 2019, '두산', 'SP', 'R', 92, [89, 90, 92, 90], { fgn: 1, note: '20승·정규시즌 MVP' }),
  P('alc20', '알칸타라', 2020, '두산', 'SP', 'R', 89, [92, 84, 90, 84], { fgn: 1, note: '20승 다승왕' }),
  P('ruc20', '루친스키', 2020, 'NC', 'SP', 'R', 88, [81, 75, 89, 88], { fgn: 1, note: '통합우승 에이스' }),
  P('yhk16', '유희관', 2016, '두산', 'SP', 'L', 78, [60, 76, 90, 72], { note: '느림의 미학' }),
  P('jws08', '장원삼', 2008, KR, 'SP', 'L', 80, [78, 82, 80, 80], { nat: 1 }),
  P('ssj08', '송승준', 2008, KR, 'SP', 'R', 79, [80, 76, 82, 78], { nat: 1 }),
  // 마무리
  P('sun93', '선동열', 1993, '해태', 'RP', 'R', 96, [96, 88, 58, 96], { note: '평균자책점 0.78' }),
  P('oh06', '오승환', 2006, '삼성', 'RP', 'R', 93, [96, 92, 55, 99], { note: '47세이브' }),
  P('koo06', '구대성', 2006, '한화', 'RP', 'L', 88, [90, 81, 55, 95], { note: '37세이브' }),
  P('jdh08', '정대현', 2008, KR, 'RP', 'R', 86, [74, 70, 50, 88], { nat: 1, note: '베이징 결승 9회 병살 마무리' }),
  P('jwr08', '정우람', 2008, 'SK', 'RP', 'L', 80, [78, 64, 60, 93], { note: '홀드왕' }),
  // 포수
  B('yej20', '양의지', 2020, 'NC', 'C', 'R', 91, [86, 88, 52, 92], { note: '한국시리즈 MVP' }),
  B('pkw00', '박경완', 2000, '현대', 'C', 'R', 89, [92, 72, 52, 92], { note: '4연타석 홈런·정규시즌 MVP' }),
  B('jgy08', '진갑용', 2008, KR, 'C', 'R', 82, [62, 73, 40, 80], { nat: 1 }),
  B('ktg24', '김태군', 2024, 'KIA', 'C', 'R', 74, [64, 68, 40, 82]),
  // 1루수
  B('lsy03', '이승엽', 2003, '삼성', '1B', 'L', 97, [99, 81, 58, 66], { note: '56홈런' }),
  B('thm15', '테임즈', 2015, 'NC', '1B', 'L', 97, [97, 97, 90, 74], { fgn: 1, note: '40-40·정규시즌 MVP' }),
  B('pbh14', '박병호', 2014, '넥센', '1B', 'R', 94, [99, 79, 58, 62], { note: '52홈런' }),
  B('ojl16', '오재일', 2016, '두산', '1B', 'L', 82, [82, 84, 42, 62]),
  // 2루수
  B('sgc14', '서건창', 2014, '넥센', '2B', 'L', 93, [54, 98, 94, 80], { note: '단일 시즌 201안타·MVP' }),
  B('nav14', '나바로', 2014, '삼성', '2B', 'R', 90, [83, 80, 80, 72], { fgn: 1, note: '통합 4연패 주역' }),
  B('jkw08', '정근우', 2008, KR, '2B', 'R', 85, [58, 84, 90, 82], { nat: 1 }),
  B('kym08', '고영민', 2008, KR, '2B', 'R', 83, [62, 76, 76, 90], { nat: 1 }),
  B('ksb24', '김선빈', 2024, 'KIA', '2B', 'R', 80, [59, 88, 52, 78]),
  // 3루수
  B('ldh10', '이대호', 2010, '롯데', '3B', 'R', 97, [96, 98, 40, 58], { note: '타격 7관왕·9경기 연속 홈런' }),
  B('kdy24', '김도영', 2024, 'KIA', '3B', 'R', 96, [93, 96, 93, 74], { note: '38홈런·40도루 MVP' }),
  B('kdj08', '김동주', 2008, KR, '3B', 'R', 87, [70, 82, 40, 72], { nat: 1 }),
  B('hkm16', '허경민', 2016, '두산', '3B', 'R', 78, [54, 75, 57, 84]),
  // 유격수
  B('ljb94', '이종범', 1994, '해태', 'SS', 'R', 97, [75, 99, 99, 90], { note: '타율 .393·84도루' }),
  B('kjh14', '강정호', 2014, '넥센', 'SS', 'R', 94, [93, 94, 50, 86], { note: '유격수 40홈런' }),
  B('pjm08', '박진만', 2008, KR, 'SS', 'R', 84, [50, 61, 55, 90], { nat: 1, note: '국민 유격수' }),
  B('pch24', '박찬호', 2024, 'KIA', 'SS', 'R', 80, [50, 82, 74, 88]),
  // 외야수
  B('ljh22', '이정후', 2022, '키움', 'OF', 'L', 96, [76, 94, 55, 86], { note: '타격 5관왕·정규시즌 MVP' }),
  B('roh20', '로하스', 2020, 'KT', 'OF', 'S', 95, [97, 92, 50, 74], { fgn: 1, note: '47홈런·정규시즌 MVP' }),
  B('khs08', '김현수', 2008, KR, 'OF', 'L', 88, [58, 96, 66, 68], { nat: 1, note: '베이징 금메달 멤버' }),
  B('ljw08', '이종욱', 2008, KR, 'OF', 'L', 86, [40, 80, 94, 86], { nat: 1, note: '47도루' }),
  B('lyk08', '이용규', 2008, KR, 'OF', 'L', 82, [40, 83, 82, 82], { nat: 1 }),
  B('phm23', '박해민', 2023, 'LG', 'OF', 'L', 78, [52, 75, 84, 94]),
  // 지명타자
  B('chw16', '최형우', 2016, '삼성', 'OF', 'L', 92, [83, 97, 42, 62], { note: '타격 3관왕' }),
  B('woo98', '우즈', 1998, 'OB', '1B', 'R', 91, [95, 82, 45, 62], { fgn: 1, note: '42홈런·정규시즌 MVP' }),
  B('hsh10', '홍성흔', 2010, '롯데', 'DH', 'R', 82, [80, 94, 44, 50]),
];

/** 드래프트 시리즈: 올타임 레전드 모음 + 시즌·대회별 실제 로스터 (src/data/series/*.json) */
export const LEGEND_SERIES = {
  id: 'legend-allstar', kind: 'legend', year: null, title: 'KBO 올타임 레전드',
  subtitle: '시대를 대표한 레전드 시즌',
  blurb: '연도와 구단을 가리지 않고 모은 역대 최고 시즌',
  players: PLAYERS.map((p) => ({ ...p, seriesId: 'legend-allstar' })),
};
export const DRAFT_SERIES = [LEGEND_SERIES, ...SERIES];
export const ALL_PLAYERS = DRAFT_SERIES.flatMap((s) => s.players);

/* 드래프트 모드: 첫 화면에서 고르는 시리즈 묶음. 드래프트·상대 AI 모두 그 모드의 시리즈만 쓴다. cap 은 기본 샐러리 캡 */
export const DRAFT_MODES = [
  { id: 'legend', group: 'special', rules: ['전원 레전드', '캡 없음'], name: '올타임 레전드', en: 'All-Time Legends', neon: '#fbbf24', tag: 'HARD', cap: 1580,
    desc: '레전드 시리즈만 나오는 모드', filter: (s) => s.kind === 'legend' },
  { id: 'champ', group: 'special', rules: ['우승팀만', '왕조 로스터'], name: '가을의 왕조', en: 'Champions', neon: '#ff5a67', tag: 'NORMAL', cap: 1560,
    desc: '역대 한국시리즈 우승 팀만 나오는 모드', filter: (s) => s.champion },
  { id: 'recent', group: 'basic', name: '최근 시즌', en: '2021 – 2026', neon: '#38e1ff', tag: 'NEW', cap: 1560,
    desc: '2021년부터 올해까지 구단 시즌만 나오는 모드', filter: (s) => s.kind === 'team' && s.year >= 2021 },
  { id: 'national', group: 'special', rules: ['국가대표만', '대회별 버전'], name: '태극마크', en: 'Team Korea', neon: '#60a5fa', tag: 'NORMAL', cap: 1270,
    desc: 'WBC·올림픽·프리미어12 국가대표만 나오는 모드', filter: (s) => s.kind === 'national' },
  { id: 'mix', group: 'basic', name: '전체 믹스', en: 'All Series', neon: '#10b981', tag: 'CLASSIC', cap: 1560,
    desc: '가진 시리즈 전체에서 무작위로 열리는 기본 모드', filter: () => true },
  // 연도별 시즌: 그해 구단 시즌이 둘 이상인 해마다 하나씩 (국가대표는 태극마크 모드에서만)
  ...[...new Set(DRAFT_SERIES.filter((x) => x.year && x.kind === 'team').map((x) => x.year))]
    .filter((y) => DRAFT_SERIES.filter((x) => x.year === y && x.kind === 'team').length >= 2)
    .sort((a, b) => b - a)
    .map((y) => ({ id: `y${y}`, group: 'year', year: y, name: `${y} 시즌`, en: `Season ${y}`, neon: '#a3e635', tag: 'SEASON', cap: 1560,
      desc: `${y}년 구단 로스터만 나오는 모드`, filter: (x) => x.year === y && x.kind === 'team' })),
].map((m) => {
  const series = DRAFT_SERIES.filter(m.filter);
  return { ...m, series, players: series.flatMap((s) => s.players) };
});
export const YEAR_MODES = DRAFT_MODES.filter((m) => m.group === 'year');
/** 모드 화면의 AI 난이도 → 상대 팀 능력치 보정 (경기 엔진: 타자 컨택·파워 · 투수 구위·제구에 더함) */
export const AI_BUFF = { easy: -3, normal: 0, hard: 3 };
/** 드래프트 토너먼트 구단 팀 전력 보정 상한: 모드 전체 AI 드래프트 팀과 엔진 전력이 벌어진 만큼 경기에서만 더하거나 뺀다 */
const HANDICAP_MAX = 8;
export const personKey = (p) => p.personId || p.name;

/* 필드 자리: 포지션마다 SLOT_LIMITS 만큼. 선수는 slot 에 서고, position 은 원래 포지션으로 남는다 */
/* 자리 20개 = 필드 14(투수 5 · 야수 9) + 예비 6. 투수는 역할(선발·롱릴리프·중간계투·셋업맨·마무리)로 나뉘고,
   pos 는 제자리로 받는 원래 포지션(불펜 넷은 RP, 외야 셋은 OF). 예비는 pos 가 없어 어느 포지션이든 받는다 */
export const FIELD_SLOTS = [
  { id: 'SP', pos: 'SP', label: '선발투수' },
  { id: 'LR', pos: 'RP', label: '롱릴리프' },
  { id: 'MR', pos: 'RP', label: '중간계투' },
  { id: 'SU', pos: 'RP', label: '셋업맨' },
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
export const BENCH_SLOTS = Array.from({ length: BENCH_SIZE }, (_, i) => ({ id: `BN${i + 1}`, pos: null, bench: true, label: `예비${i + 1}` }));
export const SLOTS = [...FIELD_SLOTS, ...BENCH_SLOTS];
export const ROSTER_SIZE = SLOTS.length; // 20
export const PITCH_SLOTS = ['SP', 'LR', 'MR', 'SU', 'CL']; // 투수 자리
export const RELIEF_SLOTS = ['LR', 'MR', 'SU', 'CL']; // 불펜 자리
export const isBenchSlot = (id) => !!id && id.startsWith('BN');
export const slotPos = (id) => SLOTS.find((s) => s.id === id)?.pos;

/** slot 이 없는 선수(AI 드래프트 등)는 원래 포지션의 빈 자리에 세운다 */
export function withSlots(roster) {
  const used = new Set(roster.map((p) => p.slot).filter(Boolean));
  return roster.map((p) => {
    if (p.slot) return p;
    const s = FIELD_SLOTS.find((x) => x.pos === p.position && !used.has(x.id)) || SLOTS.find((x) => !used.has(x.id));
    if (s) used.add(s.id);
    return { ...p, slot: s?.id };
  });
}

/** 해당 포지션의 빈 자리. 제 자리가 찼으면 예비 자리로, 그마저 없으면 null (= 그 포지션 후보는 잠김) */
export function freeSlot(roster, pos) {
  const used = new Set(withSlots(roster).map((p) => p.slot));
  return FIELD_SLOTS.find((s) => s.pos === pos && !used.has(s.id)) || BENCH_SLOTS.find((s) => !used.has(s.id)) || null;
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
  const overall = Math.max(50, p.overall - pen);
  const pitchSlot = pos === 'SP' || pos === 'RP';
  if ((p.type === 'pitcher') === pitchSlot) {
    const stats = Object.fromEntries(Object.entries(p.stats).map(([k, v]) => [k, Math.max(50, v - pen)]));
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
  if (!freeSlot(roster, player.position)) return roster.length >= ROSTER_SIZE ? '엔트리 마감' : `${POS_LABEL[player.position]} 마감`;
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

/** 빈 자리를 퓨처스 유망주(능력치 70)로 채운다 — 눈금 50~110 에서 아래쪽 15% 자리 */
export function fillRoster(roster) {
  const out = withSlots(roster);
  const used = new Set(out.map((p) => p.slot));
  for (const { id: slot, pos } of SLOTS) {
    if (used.has(slot)) continue;
    const id = `rep-${slot}`;
    out.push(pos === 'SP' || pos === 'RP'
      ? { ...P(id, '퓨처스 유망주', 2026, '퓨처스', pos, 'R', 70, [70, 70, 75, 70]), isReplacement: true, slot }
      : { ...B(id, '퓨처스 유망주', 2026, '퓨처스', pos || 'DH', 'R', 70, [70, 70, 70, 70]), isReplacement: true, slot });
  }
  return out;
}

/** AI: 캡 안에서 남은 자리를 채울 여유분을 남기며 상위권 선수를 무작위로 고른다. 주전 자리를 먼저 채우고 예비는 포지션을 가리지 않는다 */
export function aiDraft({ players = ALL_PLAYERS, cap = SALARY_CAP, rng = Math.random } = {}) {
  const roster = [];
  let cp = cap;
  // 자리마다 전체 후보를 거르므로 잠금 판정은 집합으로 가볍게 본다 (getLockReason 과 같은 규칙)
  const ids = new Set();
  const persons = new Set();
  let foreign = 0;
  const byPos = new Map();
  for (const p of players) { const a = byPos.get(p.position); if (a) a.push(p); else byPos.set(p.position, [p]); }
  const order = [...shuffle(POS_ORDER.flatMap((p) => Array(SLOT_LIMITS[p]).fill(p)), rng), ...Array(BENCH_SIZE).fill(null)];
  for (const pos of order) {
    const room = cp - (ROSTER_SIZE - roster.length - 1) * 55; // 남은 자리를 채울 몫을 남긴 상한
    const pool = pos === null ? players : byPos.get(pos) || [];
    const top = []; // 여유분을 지키는 후보 중 종합 상위 세 명
    let cheap = null; // 그마저 없으면 가장 싼 선수
    for (const p of pool) {
      if (p.cost > cp || ids.has(p.id) || persons.has(personKey(p)) || (p.isForeign && foreign >= FOREIGN_LIMIT)) continue;
      if (!cheap || p.cost < cheap.cost) cheap = p;
      if (p.cost > room) continue;
      if (top.length < 3 || p.overall > top[2].overall) {
        top.push(p);
        top.sort((a, b) => b.overall - a.overall);
        if (top.length > 3) top.pop();
      }
    }
    const choice = top.length ? top[Math.floor(rng() * top.length)] : cheap;
    if (!choice) continue;
    roster.push(choice);
    ids.add(choice.id);
    persons.add(personKey(choice));
    if (choice.isForeign) foreign++;
    cp -= choice.cost;
  }
  return roster;
}

/* ───────────── 5. 시너지 체크 엔진 ───────────── */
/* kind: story = 실제 있었던 일·선수 조합 (같은 선수면 카드 시즌과 상관없이 인정) · build = 팀 구성 */
const posOf = (p) => slotPos(p.slot) || p.position;
const realOnly = (r) => r.filter((p) => !p.isReplacement);
const battersOf = (r) => realOnly(r).filter((p) => p.type === 'batter' && !isBenchSlot(p.slot));
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
  build('power', '홈런 군단', '파워 80+ 타자', (r) => battersOf(r).filter((p) => p.stats.power >= 98), [
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
    const stats = Object.fromEntries(Object.entries(p.stats).map(([k, v]) => [k, Math.min(110, v + Math.min(SYNERGY_STAT_CAP, a.stats[k] || 0))]));
    const gain = overallOf(p.position, stats) - overallOf(p.position, p.stats);
    return { ...p, stats, overall: Math.min(110, p.overall + Math.max(0, gain)), synergyBoost: a.names };
  });
}

/* ───────────── 6. 팀 전력 산출 ───────────── */
/** 증강 팀 보너스를 공 단위 엔진에 넣을 때의 배율 (엔진 승률로 실측: scripts/augment-engine.test.mjs) */
export const ENGINE_EDGE = { bat: 1, pit: 1 };
export function buildTeam(name, roster, buff = 0, augments = [], env = {}) {
  const passives = augments.filter((a) => a.passive);
  const has = (flag) => passives.some((a) => a.flag === flag);
  // 선 자리 기준 능력치로 경기를 치른다 (포지션 파괴: 투수 ↔ 야수가 아니면 감소 없음)
  roster = withSlots(roster).map((p) => {
    if (!has('posFree')) return playAt(p);
    const pos = slotPos(p.slot);
    return pos && (p.type === 'pitcher') !== (pos === 'SP' || pos === 'RP') ? playAt(p) : p;
  });
  const synergies = checkSynergies(roster);
  if (has('synCopy')) { // 시너지 복사: 가장 높은 단계로 켜진 시너지를 팀 전원이 받음
    const best = synergies.filter((s) => s.active).sort((a, b) => b.level - a.level || Object.keys(b.bonus).length - Object.keys(a.bonus).length)[0];
    if (best) best.members = realOnly(roster);
  }
  roster = applySynergies(roster, synergies); // 시너지 보너스는 그 시너지를 만든 선수에게만
  const envX = { ...env, synergies };
  for (const a of passives) if (a.roster) roster = scaleRoster(roster, a.roster(roster, envX), augScale(a.lv));
  const t = { name, roster, synergies, buff, bonus: { bat: buff, pit: buff }, weights: { contact: 0.4, power: 0.4, speed: 0.2 }, defCoef: 0.01, usage: {} };
  for (const a of passives) {
    if (!a.team) continue;
    const was = snapTeam(t);
    a.team(t, envX);
    scaleTeam(t, was, augScale(a.lv));
  }
  roster = t.roster;
  const { bonus, weights: w } = t;

  // 타순: 정비 화면에서 정한 batOrder, 없으면 로스터 순서
  // 예비 자리(BN*)는 시너지·팀 보너스에만 기여하고 경기에는 나서지 않는다
  const batters = roster.map((p, i) => ({ p, i })).filter(({ p }) => p.type === 'batter' && !isBenchSlot(p.slot))
    .sort((a, b) => (a.p.batOrder ?? 99 + a.i) - (b.p.batOrder ?? 99 + b.i)).map(({ p }) => p);
  const sps = roster.filter((p) => p.slot === 'SP'); // 선발투수 자리
  const at = (id) => roster.find((p) => p.slot === id);
  const lr = at('LR'); // 롱릴리프
  const mr = at('MR'); // 중간계투
  const su = at('SU'); // 셋업맨
  const rp = at('CL'); // 마무리
  const batValue = (p) => p.stats.contact * w.contact + p.stats.power * w.power + p.stats.speed * w.speed;
  const handShare = (h) => (batters.length ? batters.reduce((s, p) => s + (p.hand === h ? 1 : p.hand === 'S' ? 0.5 : 0), 0) / batters.length : 0);
  const defense = avg(batters.map((p) => p.stats.defense));
  // 공 단위 엔진용 증강 팀 보너스(능력치 점수): 팀 보너스 + 타격 가중치가 바꾼 공격값 + 수비 계수가 바꾼 실점 (난이도 buff 는 엔진이 따로 더한다)
  const baseW = { contact: 0.4, power: 0.4, speed: 0.2 };
  const weightGain = avg(batters.map(batValue)) - avg(batters.map((p) => p.stats.contact * baseW.contact + p.stats.power * baseW.power + p.stats.speed * baseW.speed));
  const defGain = ((defense - 78) * (t.defCoef - 0.01)) / 0.04; // 옛 계산에서 투구 1점 = 기대 실점 0.04
  const edge = { bat: (bonus.bat - buff + weightGain) * ENGINE_EDGE.bat, pit: (bonus.pit - buff + defGain) * ENGINE_EDGE.pit };

  return Object.assign(t, {
    roster, batters, sps, lr, mr, su, rp, pen: [lr, mr, su, rp].filter(Boolean),
    offense: avg(batters.map(batValue)) + bonus.bat,
    defense,
    edge: { bat: Math.round(edge.bat * 10) / 10, pit: Math.round(edge.pit * 10) / 10 },
    rightRatio: handShare('R'),
    pitchValue: (p) => p.stats.stuff * 0.4 + p.stats.control * 0.3 + p.stats.stability * 0.3 + bonus.pit,
    topBatter: (stat) => [...batters].sort((a, b) => b.stats[stat] - a.stats[stat])[0],
  });
}

/** 효과형 증강이 상대를 보고 정하는 값: 상대 평균 종합 · 공격 · 투구, 이번 시즌 전적 */
export function teamEnv(opp, record) {
  const staffOf = [...opp.sps, ...opp.pen].filter(Boolean);
  return {
    oppAvg: avg(realOnly(opp.roster).map((p) => p.overall)),
    oppOffense: opp.offense,
    oppPitch: avg(staffOf.map((p) => opp.pitchValue(p))),
    record,
  };
}

/** 이닝별 등판 투수: 선발투수(체력만큼) → 롱릴리프 → 중간계투 → 8회 셋업맨 → 9회 마무리 */
function pitcherFor(team, inning) {
  const ace = team.sps[0];
  const u = team.usage || {}; // 효과형 증강: completeGame 완투 · extraInnings · aceMax 선발 상한 · noTired · bullpenAce
  let aceInnings = u.completeGame ? 9 : (ace.stats.stamina >= 101 ? 7 : ace.stats.stamina >= 91 ? 6 : 5) + (u.extraInnings || 0);
  if (u.aceMax) aceInnings = Math.min(aceInnings, u.aceMax);
  const tiredAt = u.noTired || u.completeGame ? 0 : aceInnings;
  const pen = team.pen;
  if (u.bullpenAce && pen.length && inning > aceInnings) return { pitcher: [...pen].sort((a, b) => team.pitchValue(b) - team.pitchValue(a))[0], tired: false };
  if (inning === 9 && team.rp && !u.completeGame) return { pitcher: team.rp, tired: false };
  if (inning <= aceInnings) return { pitcher: ace, tired: inning === tiredAt };
  if (inning === 8 && team.su) return { pitcher: team.su, tired: false };
  // 선발이 내려간 뒤 첫 이닝은 롱릴리프, 그다음은 중간계투 — 없는 자리는 남은 불펜으로 넘긴다
  const relay = (inning === aceInnings + 1 ? [team.lr, team.mr, team.su] : [team.mr, team.lr, team.su]).find(Boolean);
  if (relay) return { pitcher: relay, tired: false };
  return { pitcher: team.rp || ace, tired: !team.rp };
}

/* ───────────── 7. 증강 & 시즌 이벤트 정의 ─────────────
   side: offense(아군 공격 이닝) / defense(아군 수비 이닝)
   when(ctx): 리스너 조건, chance: 조건 충족 시 발동 확률, max: 경기당 발동 한도 */
/* 증강 등급은 하나다 — 예전 저장이 들고 있는 등급 이름도 여기로 모인다 */
export const TIER_RANK = { silver: 1 };
export const TIER_LABEL = { silver: '증강' };

/* ── 효과형 증강: 고르는 순간부터 경기 계산을 바꾼다. 효과 크기는 뽑은 선수 구성에 따라 크게 달라진다
   type: build 라인업 비례 · balance 약점 완화 · extreme 몰빵(대가 있음) · play 경기 운영 · luck 운
   roster(r, env) 선수 능력치 · team(t, env) 타격 가중치 · 투수 운용(usage) · 팀 보너스
   half(c, st) → { add, mul, pitch } 이번 반 이닝 기대 득점 · 수비 투수 보정 · runs(c, runs, st) → 이닝 점수 (또는 { runs, text }) · after(c, runs, st) 쌓이는 값
   clutch 승부처 추가 횟수 · clutchSure 조건이면 반드시 · clutchUp 판정 한 단계 위 · flag posFree / synCopy */
const BAT_STATS = ['power', 'contact', 'speed', 'defense'];
const PIT_STATS = ['stuff', 'control', 'stamina', 'stability'];
const isBat = (p) => p.type === 'batter';
const isPit = (p) => p.type === 'pitcher';
const clampN = (lo, hi, v) => Math.max(lo, Math.min(hi, v));
/** test 에 맞는 선수들 능력치를 delta 만큼 (delta 는 객체 또는 선수 → 객체) */
const bump = (r, test, delta) => r.map((p) => {
  if (!test(p)) return p;
  const d = typeof delta === 'function' ? delta(p) : delta;
  const stats = Object.fromEntries(Object.entries(p.stats).map(([k, v]) => [k, d[k] ? clampN(50, 110, Math.round(v + d[k])) : v]));
  const gain = overallOf(p.position, stats) - overallOf(p.position, p.stats);
  return { ...p, stats, overall: clampN(50, 110, p.overall + gain) };
});
const every = (n) => ({ power: n, contact: n, speed: n, defense: n, stuff: n, control: n, stamina: n, stability: n });
const bat3 = (n) => ({ power: n, contact: n, speed: n });
const pit3 = (n) => ({ stuff: n, control: n, stability: n });
const statMean = (ps, k) => avg(ps.map((p) => p.stats[k]));
const batPower = (p) => p.stats.contact * 0.4 + p.stats.power * 0.4 + p.stats.speed * 0.2;
const pitPower = (p) => p.stats.stuff * 0.4 + p.stats.control * 0.3 + p.stats.stability * 0.3;
const staff = (r) => r.filter((p) => PITCH_SLOTS.includes(p.slot) && isPit(p));
/** 타격이 리그 기준(78)보다 강한 정도 − 투구가 기준(86)보다 강한 정도: 양수면 타격 몰빵, 음수면 투수 몰빵 */
const skewOf = (r) => (avg(r.filter(isBat).map(batPower)) - 78) - (avg(staff(r).map(pitPower)) - 86);
const INFIELD = new Set(['1B', '2B', '3B', 'SS']); // 내야 네 자리
const CENTER = new Set(['C', '2B', 'SS', 'OF']); // 가운데를 지키는 자리
const bySlot = (r, slot) => r.find((p) => p.slot === slot);
const topBy = (ps, n, f) => [...ps].sort((a, b) => f(b) - f(a)).slice(0, n);
const isLegendCard = (p) => p.seriesId === 'legend-allstar';
const CHAMP_SERIES = new Set(DRAFT_SERIES.filter((s) => s.champion).map((s) => s.id));
const myOff = (c) => !c.isTop; // 우리 공격 반 이닝
const oppOff = (c) => c.isTop; // 상대 공격 반 이닝
const countOf = (ps, f) => ps.filter(f).length;
const isSP = (p) => p.slot === 'SP';
const isRelief = (p) => RELIEF_SLOTS.includes(p.slot) && isPit(p);
/** 타선에서 평균이 가장 높은 타격 능력치 */
const bestBatStat = (r) => BAT_STATS.map((k) => [k, statMean(r.filter(isBat), k)]).sort((a, b) => b[1] - a[1])[0][0];

const PASSIVE_AUGMENTS = [
  /* ─ 골고루 (3) — 대가 없이 조금 ─ */
  { id: 'muscle', name: '근력 운동', tier: 'silver', type: 'build', desc: '타자 파워 +10',
    roster: (r) => bump(r, isBat, { power: 10 }) },
  { id: 'eyeTrain', name: '선구안 훈련', tier: 'silver', type: 'build', desc: '타자 컨택 +10',
    roster: (r) => bump(r, isBat, { contact: 10 }) },
  { id: 'sprintTrain', name: '주루 특훈', tier: 'silver', type: 'build', desc: '타자 주루 +12',
    roster: (r) => bump(r, isBat, { speed: 12 }) },

  /* ─ 투수 (4) ─ */
  { id: 'stuffTrain', name: '구위 훈련', tier: 'silver', type: 'build', desc: '투수 구위 +10',
    roster: (r) => bump(r, isPit, { stuff: 10 }) },
  { id: 'ctrlTrain', name: '제구 훈련', tier: 'silver', type: 'build', desc: '투수 제구 +10',
    roster: (r) => bump(r, isPit, { control: 10 }) },
  { id: 'staminaTrain', name: '체력 훈련', tier: 'silver', type: 'build', desc: '투수 체력 +18',
    roster: (r) => bump(r, isPit, { stamina: 18 }) },
  { id: 'mentalCoach', name: '멘탈 코치', tier: 'silver', type: 'build', desc: '투수 안정 +12',
    roster: (r) => bump(r, isPit, { stability: 12 }) },

  /* ─ 맞바꾸기 (6) — 크게 올리고 한쪽을 내준다 ─ */
  { id: 'fullSwing', name: '풀스윙', tier: 'silver', type: 'extreme', desc: '타자 파워 +22 · 컨택 −8',
    roster: (r) => bump(r, isBat, { power: 22, contact: -8 }) },
  { id: 'toContact', name: '짧게 치기', tier: 'silver', type: 'extreme', desc: '타자 컨택 +22 · 파워 −8',
    roster: (r) => bump(r, isBat, { contact: 22, power: -8 }) },
  { id: 'allOutPitch', name: '전력투구', tier: 'silver', type: 'extreme', desc: '투수 구위 +22 · 체력 −18',
    roster: (r) => bump(r, isPit, { stuff: 22, stamina: -18 }) },
  { id: 'tempo', name: '완급 조절', tier: 'silver', type: 'extreme', desc: '투수 제구 +20 · 구위 −8',
    roster: (r) => bump(r, isPit, { control: 20, stuff: -8 }) },
  { id: 'speedRevolution', name: '발야구', tier: 'silver', type: 'extreme', desc: '타자 주루 +25 · 파워 −10',
    roster: (r) => bump(r, isBat, { speed: 25, power: -10 }) },
  { id: 'sluggerArmy', name: '거포 군단', tier: 'silver', type: 'extreme', desc: '타자 파워 +25 · 주루 −12',
    roster: (r) => bump(r, isBat, { power: 25, speed: -12 }) },

  /* ─ 몰아주기 (4) — 몇 명에게만 크게 ─ */
  { id: 'cleanupUp', name: '클린업 집중', tier: 'silver', type: 'build', desc: '파워 상위 3명 파워 +30',
    roster: (r) => { const top = new Set(topBy(r.filter(isBat), 3, (p) => p.stats.power)); return bump(r, (p) => top.has(p), { power: 30 }); } },
  { id: 'setterUp', name: '테이블세터', tier: 'silver', type: 'build', desc: '주루 상위 3명 주루 +25',
    roster: (r) => { const top = new Set(topBy(r.filter(isBat), 3, (p) => p.stats.speed)); return bump(r, (p) => top.has(p), { speed: 25 }); } },
  { id: 'aceFirst', name: '에이스 우대', tier: 'silver', type: 'extreme', desc: '가장 센 투수 능력치 +25 · 나머지 투수 −5',
    roster: (r) => { const [ace] = topBy(r.filter(isPit), 1, pitPower); return ace ? bump(r, isPit, (p) => (p === ace ? every(25) : every(-5))) : r; } },
  { id: 'bullpenBoost', name: '불펜 강화', tier: 'silver', type: 'build', desc: '불펜 투수 능력치 +15',
    roster: (r) => bump(r, isRelief, every(15)) },

  /* ─ 약점 메우기 (3) ─ */
  { id: 'weakFix', name: '약점 보강', tier: 'silver', type: 'balance', desc: '가장 낮은 능력치 +12',
    roster: (r) => { const [k, , who] = [...BAT_STATS.map((x) => [x, statMean(r.filter(isBat), x), isBat]), ...PIT_STATS.map((x) => [x, statMean(r.filter(isPit), x), isPit])]
      .sort((a, b) => a[1] - b[1])[0]; return bump(r, who, { [k]: 12 }); } },
  { id: 'bottomUp', name: '하위 타선', tier: 'silver', type: 'balance', desc: '종합 하위 타자 4명 능력치 +15',
    roster: (r) => { const low = new Set(topBy(r.filter(isBat), 4, (p) => -p.overall)); return bump(r, (p) => low.has(p), every(15)); } },
  { id: 'bullpenInsure', name: '불펜 보험', tier: 'silver', type: 'balance', desc: '가장 약한 불펜 투수 능력치 +18',
    roster: (r) => { const [weak] = topBy(r.filter(isRelief), 1, (p) => -pitPower(p)); return weak ? bump(r, (p) => p === weak, every(18)) : r; } },

  /* ─ 팀 구성 (3) — 그런 선수를 모았을 때 ─ */
  { id: 'mercContract', name: '용병 계약', tier: 'silver', type: 'build', desc: '외국인 선수 능력치 +12',
    roster: (r) => bump(r, (p) => p.isForeign, every(12)) },
  { id: 'legendAura', name: '전설의 기운', tier: 'silver', type: 'build', desc: '레전드 카드 선수 능력치 +12',
    roster: (r) => bump(r, isLegendCard, every(12)) },
  { id: 'veteran', name: '베테랑 대우', tier: 'silver', type: 'build', desc: '종합 88+ 선수 능력치 +10',
    roster: (r) => bump(r, (p) => p.overall >= 88, every(10)) },

  /* ─ 수비 (4) — 자리로 나눈다 ─ */
  { id: 'infieldWall', name: '내야 철벽', tier: 'silver', type: 'defense', desc: '내야수 수비 +18',
    roster: (r) => bump(r, (p) => INFIELD.has(p.position), { defense: 18 }) },
  { id: 'outfieldWall', name: '외야 철벽', tier: 'silver', type: 'defense', desc: '외야수 수비 +18',
    roster: (r) => bump(r, (p) => p.position === 'OF', { defense: 18 }) },
  { id: 'centerLine', name: '센터 라인', tier: 'silver', type: 'defense', desc: '포수 · 2루수 · 유격수 · 외야수 수비 +20',
    roster: (r) => bump(r, (p) => CENTER.has(p.position), { defense: 20 }) },
  { id: 'catcherLead', name: '포수 리드', tier: 'silver', type: 'defense', desc: '포수 수비 +15 · 투수 제구 +10',
    roster: (r) => bump(bump(r, (p) => p.position === 'C', { defense: 15 }), isPit, { control: 10 }) },

  /* ─ 경기 중 (4) — 반 이닝마다 확률이 오르내린다. 한 이닝을 통째로 정하지는 않는다 ─ */
  { id: 'focusLine', name: '집중 타선', tier: 'silver', type: 'fire', desc: '4회부터 우리 공격 안타 확률 +8%',
    half: (c) => (myOff(c) && c.inning >= 4 ? { add: 0.4 } : null) },
  { id: 'lateBlast', name: '뒷심', tier: 'silver', type: 'fire', desc: '8회부터 지고 있으면 안타 확률 +14%',
    half: (c) => (myOff(c) && c.inning >= 8 && c.score.opp > c.score.my ? { add: 0.7 } : null) },
  { id: 'closer', name: '마무리 투수', tier: 'silver', type: 'fire', desc: '8 · 9회 수비 투구 +14',
    half: (c) => (oppOff(c) && c.inning >= 8 ? { pitch: 14 } : null) },
  { id: 'starterFocus', name: '선발 집중', tier: 'silver', type: 'fire', desc: '1~4회 수비 투구 +10',
    half: (c) => (oppOff(c) && c.inning <= 4 ? { pitch: 10 } : null) },

  /* ─ 상황 (6) — 경기가 어떻게 흘러가느냐에 따라 켜지고 꺼진다 ─ */
  { id: 'firstBlood', name: '선취점', tier: 'silver', type: 'situ', desc: '1 · 2회 우리 공격 안타 확률 +12%',
    half: (c) => (myOff(c) && c.inning <= 2 ? { add: 0.6 } : null) },
  { id: 'holdLead', name: '리드 지키기', tier: 'silver', type: 'situ', desc: '앞서고 있으면 수비 투구 +12',
    half: (c) => (oppOff(c) && c.score.my > c.score.opp ? { pitch: 12 } : null) },
  { id: 'tieBreak', name: '동점 승부', tier: 'silver', type: 'situ', desc: '점수가 같으면 안타 확률 +10% · 수비 투구 +10',
    half: (c) => (c.score.my !== c.score.opp ? null : myOff(c) ? { add: 0.5 } : { pitch: 10 }) },
  { id: 'extraGame', name: '연장 승부', tier: 'silver', type: 'situ', desc: '10회부터 안타 확률 +16% · 수비 투구 +16',
    half: (c) => (c.inning < 10 ? null : myOff(c) ? { add: 0.8 } : { pitch: 16 }) },
  { id: 'aceKiller', name: '에이스 킬러', tier: 'silver', type: 'situ', desc: '상대 마운드가 종합 90+ 면 안타 확률 +12%',
    half: (c) => (myOff(c) && (c.oppPitcher?.overall || 0) >= 90 ? { add: 0.6 } : null) },
  { id: 'setupCrew', name: '필승조', tier: 'silver', type: 'situ', desc: '불펜이 던지는 이닝 수비 투구 +12',
    half: (c) => (oppOff(c) && c.myPitcher?.position === 'RP' ? { pitch: 12 } : null) },
].map((a) => ({ ...a, passive: true }));

/* 증강은 모두 평상시 효과다 — 한 이닝을 통째로 정하는 발동형은 두지 않는다 */
export const AUGMENTS = [
  ...PASSIVE_AUGMENTS,
];

/**
 * 증강 후보: 아직 안 가진 증강 가운데 최대 3개. 등급이 하나라 판을 따로 열지 않는다.
 *  pledge: 상점 지명권으로 찍어 둔 증강 id — 한 자리를 내준다
 *  favor:  즐겨찾기 우대권 — 즐겨찾기 증강을 먼저 채운다(최대 둘)
 */
export function rollAugmentOptions(owned = [], rng = Math.random, { pledge = null, favor = false, favs = null } = {}) {
  const banned = bannedAugIds(); // 내 증강 풀에서 제외한 증강은 선택지에 나오지 않는다
  const left = AUGMENTS.filter((a) => !owned.some((x) => x.id === a.id) && !banned.has(a.id));
  const want = pledge ? left.find((x) => x.id === pledge) : null; // 지명권으로 찍어 둔 증강
  const pool = shuffle(left, rng); // 등급이 하나라 전체에서 고른다
  const out = [];
  if (want) out.push(want);
  if (favor) {                                                      // 즐겨찾기를 먼저, 다만 셋을 다 채우지는 않는다
    const mine = favs || favAugIds();
    for (const a of pool) { if (out.length >= 2) break; if (mine.has(a.id) && !out.some((x) => x.id === a.id)) out.push(a); }
  }
  for (const a of pool) { if (out.length >= 3) break; if (!out.some((x) => x.id === a.id)) out.push(a); }
  return withAugLevels(out.slice(0, 3));
}

export const EVENTS = [
  { id: 'fund', name: '긴급 트레이드 자금', tier: 'silver', cond: '구단주 특별 지원', desc: '샐러리 캡 +60 CP', apply: (s) => ({ ...s, cp: s.cp + 60 }) },
  { id: 'scout', name: '스카우트 특명', tier: 'silver', cond: '전국 스카우트망 가동', desc: '상점 새로고침 +3회', apply: (s) => ({ ...s, rerolls: s.rerolls + 3 }) },
  { id: 'camp', name: '전지훈련 대성공', tier: 'silver', cond: '스프링캠프 부상자 0명', desc: '팀 전체 능력치 +2', apply: (s) => ({ ...s, buff: s.buff + 2 }) },
  { id: 'austerity', name: '긴축 경영', tier: 'silver', cond: '모기업 예산 삭감', desc: 'CP −30 · 상점 새로고침 +5회', apply: (s) => ({ ...s, cp: s.cp - 30, rerolls: s.rerolls + 5 }) },
  { id: 'rookie', name: '신인 드래프트 대박', tier: 'silver', cond: '1라운드 지명 적중', desc: 'CP +100 · 팀 능력치 −1', apply: (s) => ({ ...s, cp: s.cp + 100, buff: s.buff - 1 }) },
];

/* ───────────── 7-B. 효과형 증강 ↔ 공 단위 중계 엔진 ─────────────
   이닝 단위로 쓰던 훅을 타석 확률 보정으로 옮긴다.
   half 의 add(기대 득점) · mul 은 공격 팀의 안타 확률로, pitch 는 수비 투수의 구위 · 제구로,
   runs 는 반 이닝이 끝날 때 그 이닝 점수로 반영하고 중계 자막을 남긴다. */
const HIT_PER_RUN = 0.2; // 기대 득점 +1 ≈ 안타 확률 +0.2 (엔진으로 실측해 맞춘 값)

/* ───────────── 7-C. 증강 강화 — 레벨이 올라가면 그 증강의 이득이 커진다 ─────────────
   레벨 1칸에 +20%, 최대 +5 면 두 배다. 대가(능력치가 깎이는 쪽)는 그대로 둔다 —
   강화는 이득만 키운다. 증강 정의는 손대지 않고, 훅이 돌려준 결과를 배수로 다시 셈한다. */
export const AUG_LEVEL_STEP = 0.2;
export const augScale = (lv = 0) => 1 + Math.max(0, lv) * AUG_LEVEL_STEP;
/** 고른 증강에 내 강화 레벨을 붙인다 */
export const withAugLevels = (list = [], levels = augLevels()) => list.map((a) => ({ ...a, lv: levels[a.id] || 0 }));

/** 능력치형: 증강이 올려 준 만큼을 배수로 — 깎은 쪽은 그대로 */
function scaleRoster(before, after, k) {
  if (k === 1 || before === after || before.length !== after.length) return after;
  return after.map((p, i) => {
    const was = before[i];
    if (!was || was.id !== p.id || !p.stats || !was.stats) return p;
    let moved = false;
    const stats = Object.fromEntries(Object.entries(p.stats).map(([key, v]) => {
      const d = v - (was.stats[key] ?? v);
      if (d <= 0) return [key, v];
      moved = true;
      return [key, clampN(50, 110, Math.round((was.stats[key] ?? v) + d * k))];
    }));
    if (!moved) return p;
    const gain = overallOf(p.position, stats) - overallOf(was.position, was.stats);
    return { ...p, stats, overall: clampN(50, 110, was.overall + gain) };
  });
}
/** 팀형: 보너스 · 타격 가중치 · 수비 계수가 움직인 폭을 배수로 */
const TEAM_NUM = ['bat', 'pit'];
function snapTeam(t) { return { bonus: { ...t.bonus }, weights: { ...t.weights }, defCoef: t.defCoef, roster: t.roster }; }
function scaleTeam(t, was, k) {
  if (k === 1) return;
  TEAM_NUM.forEach((key) => { const d = (t.bonus[key] ?? 0) - (was.bonus[key] ?? 0); if (d) t.bonus[key] = (was.bonus[key] ?? 0) + d * k; });
  Object.keys(t.weights).forEach((key) => { const d = (t.weights[key] ?? 0) - (was.weights[key] ?? 0); if (d) t.weights[key] = (was.weights[key] ?? 0) + d * k; });
  const dc = (t.defCoef ?? 0) - (was.defCoef ?? 0); if (dc) t.defCoef = (was.defCoef ?? 0) + dc * k;
  if (t.roster !== was.roster) t.roster = scaleRoster(was.roster, t.roster, k);
}
/** 반 이닝형: 기대 득점 · 투수 보정은 그대로 배수, 곱 보정은 1 에서 벌어진 만큼 */
const scaleHalf = (r, k) => (!r || k === 1 ? r
  : { ...r, add: (r.add || 0) * k, pitch: (r.pitch || 0) * k, ...(r.mul != null ? { mul: 1 + (r.mul - 1) * k } : {}) });
/** 이닝 점수형: 증강이 바꾼 점수 폭을 배수로 (정수로 맞춘다) */
const scaleRuns = (base, next, k) => (k === 1 ? next : base + Math.round((next - base) * k));
/** 발동형: 레벨마다 발동 확률 +5%p, +3 부터 경기당 한도 +1 (+5 면 +2) */
/** 레벨이 반영된 효과 문구 — 이득 수치는 배수로, 발동형은 확률과 경기당 한도까지 */
const scaleNum = (n, k) => (Number.isInteger(n) ? Math.round(n * k) : Math.round(n * k * 100) / 100);
export function augDescAt(a, lv = a?.lv || 0) {
  if (!a?.desc || !lv) return a?.desc || '';
  const k = augScale(lv);
  let d = a.desc.replace(/\+(\d+(?:\.\d+)?)/g, (_, n) => `+${scaleNum(Number(n), k)}`);
  if (a.chance != null && a.when) {
    d = d.replace(/(\d+)%/g, (_, n) => `${Math.min(100, Math.round(Number(n) + lv * 5))}%`)
      .replace(/경기당 (\d+)회/g, () => `경기당 ${augMax({ ...a, lv })}회`);
  }
  return d;
}
export const augChance = (a) => Math.min(1, (a.chance ?? 0) + (a.lv || 0) * 0.05);
export const augMax = (a) => (a.max ?? 1) + ((a.lv || 0) >= 5 ? 2 : (a.lv || 0) >= 3 ? 1 : 0);

export function makeAugmentRuntime({ augments = [], my, opp, record }) {
  let list = augments;
  let mine = my;
  const state = {};
  const stFor = (a) => (state[a.id] ||= {});
  const passive = () => list.filter((a) => a.passive);
  const ctxOf = (g, inning = g.inning, isTop = g.top) => ({
    inning, isTop, my: mine, opp, rng: g.rng,
    score: { my: g.home.runs, opp: g.away.runs },
    myPitcher: g.home.pitcher, oppPitcher: g.away.pitcher,
  });

  return {
    /** 경기 중에 증강을 더 골랐을 때 */
    update(nextList, nextMy) { list = nextList; if (nextMy) mine = nextMy; },
    /** 반 이닝 시작: 이번 반 이닝에 걸릴 보정을 깐다 */
    beforeHalf(g) {
      const c = ctxOf(g);
      let add = 0; let mul = 1; let pitchAdd = 0;
      for (const a of passive()) {
        const r = scaleHalf(a.half?.(c, stFor(a)), augScale(a.lv));
        if (!r) continue;
        add += r.add || 0; mul *= r.mul ?? 1; pitchAdd += r.pitch || 0;
      }
      const off = { hit: add * HIT_PER_RUN, hitMul: 1 + (mul - 1) * 0.5, hr: Math.max(0, add) * 0.05, steal: Math.max(0, add) * 0.1 };
      const def = { pitch: pitchAdd };
      setMods(g, g.top ? { away: off, home: def } : { home: off, away: def });
    },
    /** 반 이닝 끝: 이닝 점수 보정 + 쌓이는 값. { runs, texts } 를 돌려준다 */
    afterHalf(g, runs, inning, isTop) {
      const c = ctxOf(g, inning, isTop);
      const texts = [];
      let out = runs;
      for (const a of passive()) {
        if (!a.runs) continue;
        const r = a.runs(c, out, stFor(a));
        const next = Math.max(0, Math.min(9, scaleRuns(out, typeof r === 'number' ? r : r.runs, augScale(a.lv))));
        if (typeof r === 'object' && r.text && next !== out) texts.push({ name: a.name, tier: a.tier, text: r.text });
        out = next;
      }
      const delta = addRuns(g, out - runs, inning, isTop ? 'away' : 'home');
      for (const a of passive()) a.after?.(c, out, stFor(a));
      return { runs: runs + delta, texts };
    },
  };
}

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

/* ───── 승부처 개입 (1단계: 판정 흐름만) ───── */
export const CLUTCH_MAX = 2; // 경기당 최대 발동
export const CLUTCH_CHANCE = 0.5; // 7·8회 조건 충족 시 발동 확률 (9회는 반드시)
/** 찬스: 7회 이후 말 공격, 지거나 동점인데 0~2점 차 · 위기: 8회 이후 초 수비, 동점이거나 0~2점 리드 */
export function clutchKind(inning, isTop, score) {
  const lead = score.my - score.opp;
  if (!isTop && inning >= 7 && lead <= 0 && lead >= -2) return 'chance';
  if (isTop && inning >= 8 && lead >= 0 && lead <= 2) return 'crisis';
  return null;
}
/** 개입 결과로 원래 굴린 득점을 보정 */
export function clutchRuns(kind, grade, base) {
  if (kind === 'chance') return { hr: base + 3, double: base + 2, single: base + 1, perfect: base + 2, good: base + 1 }[grade] ?? Math.floor(base / 2);
  const crisis = { k: 0, out: Math.max(0, base - 1), walk: base, single: base, double: base + 1, hr: base + 2, perfect: 0, good: Math.max(0, base - 1) };
  return crisis[grade] ?? base + 1;
}

/* ───── 그라운드 중계 대본: 하프 이닝 득점(확정값)에 맞춰 타석별 플레이를 만든다 ─────
   주자는 [1루, 2루, 3루]. 안타는 모든 주자가 친 만큼 진루, 볼넷은 밀어내기만. 득점이 정해진 수를 넘지 않게 고른다 */
export const PLAY_LABEL = { K: '삼진', GO: '땅볼 아웃', FO: '뜬공 아웃', BB: '볼넷', '1B': '안타', '2B': '2루타', '3B': '3루타', HR: '홈런' };
function advanceBases(bases, kind, batter) {
  const next = [null, null, null];
  const scored = [];
  if (kind === 'BB') {
    next[0] = batter;
    if (bases[0]) {
      if (bases[1]) { if (bases[2]) scored.push(bases[2]); next[2] = bases[1]; } else next[2] = bases[2];
      next[1] = bases[0];
    } else { next[1] = bases[1]; next[2] = bases[2]; }
    return { bases: next, scored };
  }
  const n = { '1B': 1, '2B': 2, '3B': 3, HR: 4 }[kind];
  for (let i = 2; i >= 0; i--) {
    if (!bases[i]) continue;
    if (i + n >= 3) scored.push(bases[i]); else next[i + n] = bases[i];
  }
  if (n === 4) scored.push(batter); else next[n - 1] = batter;
  return { bases: next, scored };
}
export function scriptHalf(runs, offense, startIdx = 0, rng = Math.random) {
  const lineup = offense.batters.length ? offense.batters : offense.roster;
  let idx = startIdx;
  let bases = [null, null, null];
  let outs = 0;
  let left = runs;
  const events = [];
  while (outs < 3 && events.length < 24) {
    const batter = lineup[idx % lineup.length];
    idx += 1;
    const pa = events.length;
    let kind;
    if (left <= 0) {
      const r = rng();
      kind = r < 0.3 ? 'K' : r < 0.65 ? 'GO' : 'FO';
    } else if (outs < 2 && pa < 14 && rng() < 0.35) {
      kind = rng() < 0.5 ? 'GO' : 'FO';
    } else {
      const opts = ['1B', '2B', '3B', 'HR', 'BB']
        .map((k) => ({ k, s: advanceBases(bases, k, batter).scored.length, w: { '1B': 5, '2B': 2, '3B': 0.4, HR: 1, BB: 1.5 }[k] }))
        .filter((o) => o.s <= left);
      const scoring = opts.filter((o) => o.s > 0);
      const pool = pa >= 14 && scoring.length ? scoring : opts; // 너무 길어지면 점수 나는 쪽으로
      let r = rng() * pool.reduce((a, o) => a + o.w * (o.s ? 1.6 : 1), 0);
      kind = pool[pool.length - 1].k;
      for (const o of pool) { r -= o.w * (o.s ? 1.6 : 1); if (r <= 0) { kind = o.k; break; } }
    }
    const before = bases;
    let scored = [];
    if (['K', 'GO', 'FO'].includes(kind)) outs += 1;
    else ({ bases, scored } = advanceBases(bases, kind, batter));
    left -= scored.length;
    events.push({ id: `${pa}`, batter, kind, before, bases, scored, outs, ms: kind === 'HR' ? 2600 : ['K', 'GO', 'FO'].includes(kind) ? 1500 : 1900 + scored.length * 250 });
  }
  return { events, nextIdx: idx };
}

/**
 * 비동기 경기 루프. 사용자 팀(my)은 홈(말 공격).
 * 매 하프 이닝마다 ① 증강 리스너 판정 → 발동 시 점수 확정·로그 주입·하이라이트 정지
 *                  ② 미발동 시 스탯 보정 포아송 난수 득점
 */
/** 승부처의 신: 개입 판정을 한 단계 좋게 */
const CLUTCH_UP = {
  chance: { miss: 'good', good: 'perfect', out: 'single', single: 'double', double: 'hr' },
  crisis: { miss: 'good', good: 'perfect', hr: 'double', double: 'single', single: 'out', walk: 'k', out: 'k' },
};

export async function runSimulation({
  my: myTeam, opp, augments = [], rng = Math.random,
  rebuildMy = null, // 경기 중 증강이 바뀌면 우리 팀 능력치를 다시 계산 (효과형 증강)
  fast = false, // 밸런스 시뮬레이션용: 기다림 없이
  getSpeed = () => 1, isCancelled = () => false,
  onBoard = () => {}, onLog = () => {}, onHighlight = async () => {},
  beforeInning = async () => null, // 이닝 시작 전 훅: 새 증강 목록을 돌려주면 그걸로 바꾼다
  onClutch = null, // 승부처 개입 훅: ({ kind, inning, isTop, score, baseRuns }) → 'perfect' | 'good' | 'miss'
  onPlay = null, // 그라운드 중계: 타석마다 { batter, kind, before, bases, scored, outs, inning, isTop, offense, defense } — 없으면 기존처럼 수치만
}) {
  let my = myTeam;
  let clutchUsed = 0;
  const augState = {}; // 효과형 증강이 경기 동안 쌓는 값
  const stFor = (a) => (augState[a.id] ||= {});
  const passive = () => augments.filter((a) => a.passive);
  const order = { my: 0, opp: 0 };
  const playHalf = async (runs, offense, defense, isTop, inning) => {
    if (!onPlay) return;
    const side = isTop ? 'opp' : 'my';
    const { events, nextIdx } = scriptHalf(runs, offense, order[side], rng);
    order[side] = nextIdx;
    for (const ev of events) {
      if (isCancelled()) return;
      onPlay({ ...ev, key: `${inning}${isTop ? 't' : 'b'}${ev.id}`, inning, isTop, offense, defense });
      await sleep(ev.ms / getSpeed());
    }
  };
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
  const halfDelay = () => (fast ? Promise.resolve() : sleep(900 / getSpeed()));
  const note = (a, text, inning, isTop, runs) => log({ kind: 'augment', tier: a.tier, inning, isTop, runs, text: `[증강: ${a.name}] ${text}` });

  log({ kind: 'system', inning: 0, text: `플레이볼! ${opp.name} vs ${my.name}` });

  for (let inning = 1; inning <= 9; inning++) {
    const nextAugs = await beforeInning(inning, augments);
    if (nextAugs) { augments = nextAugs; if (rebuildMy) my = rebuildMy(augments); }
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

      // 효과형 증강: 이번 반 이닝 기대 득점 보정({ add, mul }) · 수비 투수 보정(pitch)
      const hctx = { inning, isTop, my, opp, score: { ...score }, rng, myPitcher, oppPitcher };
      let lamAdd = 0; let lamMul = 1; let pitchAdd = 0;
      for (const a of passive()) {
        const r = scaleHalf(a.half?.(hctx, stFor(a)), augScale(a.lv));
        if (r) { lamAdd += r.add || 0; lamMul *= r.mul ?? 1; pitchAdd += r.pitch || 0; }
      }
      const afterHalf = (halfRuns) => { for (const a of passive()) a.after?.({ ...hctx, score: { ...score } }, halfRuns, stFor(a)); };

      const pitch = defense.pitchValue(defPitcher) - (tired ? 3 : 0) + pitchAdd;
      // 실제 드래프트 팀 분포(타선−투수 ≈ −6, 수비 80대) 기준으로 하프 이닝 기대 득점 ≈ 0.55 (경기 합계 약 10점)
      const base = Math.min(2.0, Math.max(0.15, 0.82 + ((offense.offense - 78) - (pitch - 86)) * 0.04 - (defense.defense - 78) * (defense.defCoef ?? 0.01)));
      const lambda = lamAdd || lamMul !== 1 ? Math.min(2.6, Math.max(0.1, (base + lamAdd) * lamMul)) : base;
      const baseRuns = Math.min(6, poisson(lambda, rng));

      onBoard({ board: { away: [...board.away], home: [...board.home] }, score: { ...score }, half: { inning, isTop } });

      // ⓪ 승부처 개입: 조건을 채우면 경기를 멈추고 결과(PERFECT/GOOD/MISS)로 이번 하프 이닝 득점을 보정. 이때는 증강 판정을 건너뛴다
      const side = isTop ? 'defense' : 'offense';
      const clutchCap = CLUTCH_MAX + passive().reduce((s, a) => s + (a.clutch || 0), 0);
      const clutch = onClutch && clutchUsed < clutchCap ? clutchKind(inning, isTop, score) : null;
      if (clutch && (inning === 9 || passive().some((a) => a.clutchSure) || rng() < CLUTCH_CHANCE)) {
        clutchUsed += 1;
        const batter = offense.batters[(inning * 2 + (isTop ? 0 : 1)) % Math.max(1, offense.batters.length)];
        let grade = await onClutch({ kind: clutch, inning, isTop, score: { ...score }, baseRuns, batter, pitcher: defPitcher, pitch });
        if (passive().some((a) => a.clutchUp)) grade = CLUTCH_UP[clutch]?.[grade] ?? grade;
        if (isCancelled()) return null;
        const runs = clutchRuns(clutch, grade, baseRuns);
        const d = describeHalf(runs, offense, defPitcher, rng);
        const label = { perfect: 'PERFECT', good: 'GOOD', miss: 'MISS', hr: '홈런', double: '2루타', single: '안타', out: '아웃', k: '삼진', walk: '볼넷' }[grade] || 'MISS';
        let text = d.text;
        let hero = d.hitter || batter;
        const clutchText = { hr: '승부처에서 담장을 넘기는 한 방!', double: '승부처 적시 2루타!', single: '승부처 적시타!', out: '잘 맞은 타구가 잡히고 말았다' };
        if (clutch === 'crisis' && batter && (grade === 'k' || grade === 'walk')) {
          text = grade === 'k' ? `${defPitcher.name}, 승부처에서 ${batter.name} 헛스윙 삼진!${runs ? ` 그래도 ${runs}실점` : ''}` : `${batter.name} 볼넷 출루${runs ? `, ${runs}실점` : ''}`;
        }
        if (clutch === 'chance' && batter && clutchText[grade]) {
          hero = batter;
          text = `${batter.name}, ${clutchText[grade]}${runs ? ` ${runs}점` : ''}`;
        }
        if (!isTop && runs) addCredit(hero, runs * 3 + (grade === 'hr' ? 3 : 0), 'runs');
        log({ kind: runs ? 'score' : 'normal', inning, isTop, runs, text: `[${clutch === 'chance' ? '찬스' : '위기'} ${label}] ${text}`, hero, pitcher: defPitcher });
        await playHalf(runs, offense, defense, isTop, inning);
        if (isCancelled()) return null;
        if (isTop) {
          board.away[inning - 1] = runs; score.opp += runs;
          addCredit(defPitcher, runs === 0 ? 1.5 : -runs, runs === 0 ? 'zero' : null);
        } else {
          board.home[inning - 1] = runs; score.my += runs;
        }
        onBoard({ board: { away: [...board.away], home: [...board.home] }, score: { ...score }, half: { inning, isTop } });
        afterHalf(runs);
        await halfDelay();
        continue;
      }

      // ① 증강 리스너 (우선순위: 등급 높은 순)
      const ctx = { inning, isTop, my, opp, score: { ...score }, rng, baseRuns, myPitcher, oppPitcher };
      const fired = augments.filter((a) => !a.passive)
        .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier])
        .find((a) => a.side === side && (used[a.id] || 0) < augMax(a) && a.when(ctx) && rng() < augChance(a));

      let runs;
      if (fired) {
        const res = fired.apply(ctx);
        runs = res.runs;
        used[fired.id] = (used[fired.id] || 0) + 1;
        addCredit(res.hero, 4, 'fires');
        if (!isTop) addCredit(res.hero, runs * 2, null);
        log({ kind: 'augment', tier: fired.tier, inning, isTop, runs, text: `[증강 발동: ${fired.name}!] ${res.text}`, hero: res.hero, pitcher: defPitcher });
        await onHighlight({ augment: fired, text: res.text, hero: res.hero });
        if (!fast) await sleep(500); // 하이라이트 일시정지 (배속 무관)
      } else {
        // ② 일반 난수 판정 → 효과형 증강의 이닝 점수 보정
        runs = baseRuns;
        for (const a of passive()) {
          if (!a.runs) continue;
          const r = a.runs({ ...hctx, score: { ...score } }, runs, stFor(a));
          const next = Math.max(0, Math.min(9, typeof r === 'number' ? r : r.runs));
          if (typeof r === 'object' && r.text) note(a, r.text, inning, isTop, next);
          runs = next;
        }
        const d = describeHalf(runs, offense, defPitcher, rng);
        if (!isTop && d.hitter) addCredit(d.hitter, runs * 3 + (d.text.includes('홈런') ? 2 : 0), 'runs');
        // 중계 자막용: 이 하프 이닝의 타석(득점 타자, 없으면 공격 팀 타순을 도는 타자)과 마운드 투수
        const atBat = d.hitter || offense.batters[(inning * 2 + (isTop ? 0 : 1)) % Math.max(1, offense.batters.length)];
        log({ kind: runs ? 'score' : 'normal', inning, isTop, runs, text: d.text, hero: atBat, pitcher: defPitcher });
      }

      await playHalf(runs, offense, defense, isTop, inning);
      if (isCancelled()) return null;
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
      afterHalf(runs);

      if (!isTop && inning === 9 && score.my > score.opp && runs > 0) {
        log({ kind: 'augment', tier: 'silver', inning, isTop, runs: 0, text: '끝내기! 홈 팬들이 그라운드로 쏟아집니다' });
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

export const KEYFRAMES = `
@keyframes rise { from { opacity: 0; transform: translateY(28px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes toast { 0% { opacity: 0; transform: scale(1.25); } 12% { opacity: 1; transform: scale(1); } 80% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.97) translateY(-12px); } }
@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
@keyframes cellIn { from { background-color: rgba(16,185,129,.35); } to { background-color: transparent; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes swap { from { transform: scale(.994); } to { transform: none; } }
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
.lf-tok { position: absolute; width: 214px; height: 72px; transform: translate(-50%, -50%) scale(.8); /* 구장 사진 위에서는 조금 작게 — JS 의 TOK_SCALE 과 같은 값 */ touch-action: none; user-select: none; cursor: grab; outline: none; }
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
/* 시너지 도크 아래 예비 여섯: 두 줄 세 칸씩 미니 칩. 필드 토큰과 같은 끌기·강조 규칙을 쓴다 */
.lf-bn { flex: none; margin-top: 10px; padding-top: 9px; border-top: 1px solid rgba(255,255,255,.1); }
.lf-bn-h { display: flex; align-items: baseline; gap: 7px; margin-bottom: 7px; padding-left: 4px; }
.lf-bn-h span { font-size: 12px; font-weight: 700; color: #cbd5e1; text-shadow: 0 1px 3px #000; }
.lf-bn-h em { font-family: 'Saira Condensed', sans-serif; font-size: 10px; font-style: normal; font-weight: 700; letter-spacing: .18em; color: #64748b; }
.lf-bn-h small { margin-left: auto; font-family: 'Saira Condensed', sans-serif; font-size: 11px; font-weight: 600; color: #64748b; }
.lf-bn-h small b { color: #cbd5e1; }
.lf-bn-g { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
.lf-bn + .lf-bn { margin-top: 8px; padding-top: 8px; }
.lf-bc { --n: #344055; position: relative; display: grid; grid-template-columns: 22px auto minmax(0, 1fr) auto; align-items: center; gap: 7px; height: 32px; padding: 0 8px 0 5px; background: rgba(15,23,42,.62); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); clip-path: polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px); touch-action: none; user-select: none; cursor: grab; outline: none; transition: background .12s, box-shadow .12s; }
.lf-bc-bp, .lf-bc-ph { width: 22px; height: 26px; background-repeat: no-repeat; -webkit-mask-image: linear-gradient(#000 84%, transparent); mask-image: linear-gradient(#000 84%, transparent); }
.lf-bc-ph { background: linear-gradient(180deg, #2c3749, #222c3e 70%); }
.lf-bc-pos { font-family: 'Saira Condensed', sans-serif; font-size: 10px; font-weight: 800; letter-spacing: .04em; color: var(--n); }
.lf-bc.empty .lf-bc-pos { color: #64748b; }
.lf-bc:not(:has(.lf-bc-pos)) { grid-template-columns: 22px minmax(0, 1fr) auto; }
.lf-bc b { min-width: 0; overflow: hidden; font-size: 12.5px; font-weight: 600; color: #e5e7eb; text-overflow: ellipsis; white-space: nowrap; }
.lf-bc em { font-size: 15px; font-weight: 800; color: #fff; text-shadow: 0 0 9px var(--n); }
.lf-bc em.up { color: #6ee7b7; }
.lf-bc i { position: absolute; right: 4px; top: 4px; width: 4px; height: 4px; background: #fbbf24; transform: rotate(45deg); }
.lf-bc.empty { cursor: pointer; background: rgba(10,15,26,.5); }
.lf-bc.empty b { color: #6b7280; font-weight: 500; }
.lf-bc.empty em { color: #3f4a5c; }
.lf-bc:focus-visible { outline: 2px solid #10b981; outline-offset: 2px; }
.lf-bc.mine { background: linear-gradient(90deg, color-mix(in srgb, var(--n) 26%, rgba(15,23,42,.62)), rgba(15,23,42,.62)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--n) 55%, transparent); }
.lf-bc.ghost { background: rgba(56,189,248,.16); box-shadow: inset 0 0 0 1px #38bdf8; }
.lf-bc:is(.picked, .want, .over) { background: rgba(56,189,248,.24); box-shadow: inset 0 0 0 2px #38bdf8, 0 0 14px rgba(56,189,248,.45); }
.lf-bc.lifted { opacity: .35; }
.lf-bc.dim { opacity: .3; }
.lf-bc.focus { box-shadow: inset 0 0 0 2px #38bdf8; }
.lf-bc.clash { box-shadow: inset 0 0 0 2px #fbbf24; }
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
.rl-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; } /* 탭 7개: 4 + 3 */
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
.rl-kind { display: grid; grid-template-columns: auto minmax(0, 1fr); margin: 4px 0 8px; font-size: 12.5px; background: rgba(255,255,255,.03); }
.rl-kind > div { display: contents; }
.rl-kind > div > span { padding: 6px 10px; border-top: 1px solid rgba(255,255,255,.05); line-height: 1.5; }
.rl-kind > div:first-child > span { border-top: 0; }
.rl-kind .rl-chip { margin: 0; }
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
/* 라이브: 내 차례면 선반 판 위로 내 색 빛이 차오르고, 차례가 끝나면 같은 속도로 잦아든다 */
/* 숨쉬는 빛은 그림자 세기로만 준다 — 투명도는 켜고 끄는 전환에만 쓰여야 뚝 끊기지 않는다 */
@keyframes myTurnPulse {
  0%, 100% { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--me, #e879f9) 45%, transparent), 0 0 18px -10px var(--me, #e879f9); }
  50% { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--me, #e879f9) 75%, transparent), 0 0 34px -4px var(--me, #e879f9); }
}
.bc-grp::before {
  content: ""; position: absolute; inset: 0; z-index: 6; pointer-events: none; opacity: 0;
  transition: opacity .5s ease;
  background: linear-gradient(180deg, color-mix(in srgb, var(--me, #e879f9) 12%, transparent), transparent 62%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--me, #e879f9) 55%, transparent), 0 0 30px -6px var(--me, #e879f9);
  clip-path: inherit;
}
.bc-grp.myturn::before { opacity: 1; animation: myTurnPulse 2.4s ease-in-out infinite .5s; }
@media (prefers-reduced-motion: reduce) { .bc-grp.myturn::before { animation: none; } }
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
/* 라이브 진행 배속 · 건너뛰기 */
.dr-sp { display: inline-flex; gap: 2px; }
.dr-sp button { padding: 2px 7px; font-family: 'Saira Condensed', sans-serif; font-size: 12px; font-weight: 700; color: #9ca3af;
  clip-path: polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px); background: rgba(255,255,255,.05); transition: color .15s, background .15s; }
.dr-sp button:hover { color: #fff; }
.dr-sp button.on { color: #05080f; background: #38e1ff; }
/* 드래프트 권 — 상점에서 산 장수를 달고 판에서 쓴다 */
.pk-was { margin-right: 4px; font-size: .62em; color: #64748b; text-decoration-thickness: 1px; }
.dr-tk { display: inline-flex; gap: 3px; }
.dr-tk button { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 11.5px; font-weight: 700; color: #fcd34d;
  clip-path: polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px);
  background: rgba(251,191,36,.12); box-shadow: inset 0 0 0 1px rgba(251,191,36,.3); transition: color .15s, background .15s, opacity .15s; }
.dr-tk button:hover:not(:disabled) { color: #05080f; background: #fbbf24; }
.dr-tk button:disabled { opacity: .32; cursor: default; }
.dr-tk button.on { color: #05080f; background: #fbbf24; }
.dr-tk em { font-family: 'Saira Condensed', sans-serif; font-style: normal; font-size: 12px; }
.dr-skip { display: grid; place-items: center; width: 26px; height: 21px; font-size: 12px; line-height: 1; color: #cbd5e1;
  clip-path: polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px);
  background: rgba(255,255,255,.1); transition: color .15s, background .15s; }
.dr-skip:hover:not(:disabled) { color: #fff; background: rgba(255,255,255,.12); }
.dr-skip:disabled { opacity: .35; cursor: default; }
/* 라이브 드래프트 뽑는 순서 표 — 머리 줄 가운데 */
/* 라이브: 한 판 두 층 */
.dr-panel { display: grid; gap: 4px; margin-top: -26px; padding: 5px 12px;
  clip-path: polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);
  background: rgba(255,255,255,.04); box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }
.dr-top { display: flex; align-items: center; gap: 12px; }
.dr-top .dr-toggle { margin-left: auto; }
.dr-bar { display: flex; align-items: center; gap: 10px; }
/* 가운데: 라운드와 샐러리 캡 잔여 */
.dr-meta.inline { position: static; transform: none; padding: 0; gap: 10px; background: none; box-shadow: none; }
.dr-meta.inline .dr-round b { font-size: 18px; }
.dr-meta.inline .dr-ticks i { height: 10px; }
.dr-meta.inline .dr-cap b { font-size: 14px; }
.dr-meta { position: absolute; left: 50%; top: 50%; z-index: 4; display: flex; align-items: center; gap: 14px; padding: 4px 12px; transform: translate(-50%, -50%);
  clip-path: polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);
  background: rgba(255,255,255,.04); box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }
.dr-round { display: flex; align-items: baseline; gap: 6px; }
.dr-round small { font-family: 'Saira Condensed', sans-serif; font-size: 10px; letter-spacing: .24em; color: #6b7280; }
.dr-round b { font-family: 'Saira Condensed', sans-serif; font-size: 22px; line-height: 1; color: #fff; }
.dr-round small + b + small { font-size: 11px; letter-spacing: 0; }
.dr-cap { display: flex; align-items: center; gap: 9px; }
.dr-cap b { font-family: 'Saira Condensed', sans-serif; font-size: 16px; color: var(--a); }
.dr-cap > small { font-family: 'Saira Condensed', sans-serif; font-size: 10.5px; color: #6b7280; }
.dr-ticks { display: flex; gap: 2px; }
.dr-ticks i { width: 4px; height: 13px; transform: skewX(-18deg); background: rgba(255,255,255,.12); }
.dr-ticks i.on { background: var(--a); box-shadow: 0 0 6px color-mix(in srgb, var(--a) 40%, transparent); }
.dr-ticks i.spend { background: rgba(148,163,184,.4); }
/* 오른쪽: 전체보기 토글을 순서 판 위에 작게 */
.dr-toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; color: #9ca3af; }
.dr-toggle .tr { position: relative; width: 22px; height: 12px; border-radius: 99px; background: rgba(255,255,255,.14); transition: background .15s; }
.dr-toggle .tr::after { content: ""; position: absolute; top: 2px; left: 2px; width: 8px; height: 8px; border-radius: 50%; background: #fff; transition: left .15s; }
.dr-toggle[aria-pressed="true"] { color: #e8ecf2; }
.dr-toggle[aria-pressed="true"] .tr { background: #10b981; }
.dr-toggle[aria-pressed="true"] .tr::after { left: 12px; }
.dr-div { width: 1px; height: 18px; background: rgba(255,255,255,.14); }
.dr-order { display: flex; align-items: center; pointer-events: none; }
.dr-clock { width: 34px; margin-left: 8px; text-align: right; font-family: 'Saira Condensed', sans-serif; font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--t); }
.dr-pc { position: relative; display: flex; align-items: center; justify-content: center; width: 72px; height: 24px; padding: 0 8px 0 14px; margin-left: -12px;
  clip-path: polygon(0 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,0 100%,14px 50%);
  background: rgba(255,255,255,.05); transition: background .3s ease, box-shadow .3s ease; }
.dr-pc:first-child { margin-left: 0; }
.dr-pc > i { position: absolute; inset: 0; background: center 28% / cover no-repeat; opacity: .1; mix-blend-mode: luminosity; }
.dr-pc > b { position: relative; font-size: 11.5px; font-weight: 700; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dr-pc.past { background: color-mix(in srgb, var(--t) 18%, transparent); }
.dr-pc.past > i { opacity: .18; }
.dr-pc.now { z-index: 2; background: var(--t); box-shadow: 0 0 18px -5px var(--t); }
.dr-pc.now > i { opacity: .5; }
.dr-pc.now > b { font-size: 12.5px; font-weight: 900; letter-spacing: -.01em; color: #05080f; text-shadow: 0 1px 2px rgba(255,255,255,.35); font-variant-numeric: tabular-nums; }
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
.mc.t90 .mc-ov { background: linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc) 0 50% / 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: none; -webkit-text-stroke: .6px rgba(0,0,0,.75); paint-order: stroke fill; animation: prism 3s linear infinite; }
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
/* 보기 단추로 카드가 드러나고 숨는 효과 — 카드가 아니라 감싸는 칸에 준다 (카드의 등장 애니와 겹치지 않게) */
@keyframes scIn { from { opacity: 0; transform: translateY(7px) scale(.94); } to { opacity: 1; transform: none; } }
@keyframes scOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(5px) scale(.96); } }
.sc-in { animation: scIn .36s cubic-bezier(.22,1,.36,1) both; }
.sc-out { animation: scOut .3s ease-in both; }
/* 라이브: 내 차례에 고를 수 있는 카드는 한 칸 떠오른다 */
/* 라이브: 지명된 카드가 선반에서 빠지는 연출 — 구단 색이 한 번 번지고 가라앉는다 */
@keyframes mcGone { 0%, 66% { opacity: 1; } 100% { opacity: 0; } }
.mc.gone { pointer-events: none; animation: mcGone 1s ease-out both; }
.mc.gone-keep { pointer-events: none; } /* 엠블럼만 지나가고 카드는 남는다 */
/* 엠블럼: 구단 상징이 카드를 덮고 아래에 구단 이름 (그림은 public/ui/clubs/<키>.webp) */
/* 엠블럼: 카드까지 사라질 때는 끝까지 덮고 있다가 카드와 함께 사라지고(뒤 카드가 다시 드러나지 않게),
   카드를 남길 때만 혼자 사라진다 */
@keyframes mcEmbIn { from { opacity: 0; transform: scale(1.07); } to { opacity: 1; transform: none; } }
@keyframes mcEmbInOut { 0% { opacity: 0; transform: scale(1.04); } 20% { opacity: 1; transform: none; } 66% { opacity: 1; } 100% { opacity: 0; } }
.mc-emb { position: absolute; inset: 0; z-index: 7; display: grid; align-content: end; justify-items: center;
  background: #05080f center / cover no-repeat; background-image: inherit; animation: mcEmbIn .18s ease-out both; }
.mc.gone-keep .mc-emb { animation: mcEmbInOut 1s ease-out both; }
.mc-emb::before { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,8,15,.2) 40%, rgba(5,8,15,.9)); }
.mc-emb::after { content: ""; position: absolute; inset: 0; box-shadow: inset 0 0 0 2px var(--t), inset 0 0 26px -6px var(--t); }
.mc-emb b { position: relative; padding-bottom: 9cqw; font-size: 17cqw; font-weight: 800; letter-spacing: -.02em; color: #fff; text-shadow: 0 2px 8px #000; }
/* 나간 자리는 빈 칸으로 남아 선반이 흔들리지 않는다 */
.mc-slot { display: block; width: 100%; aspect-ratio: 2 / 3; clip-path: polygon(10% 0,100% 0,100% 93.3%,90% 100%,0 100%,0 6.7%); background: rgba(255,255,255,.02); box-shadow: inset 0 0 0 1px rgba(148,163,184,.08); }
/* 라이브: 내 차례에 고를 수 있는 카드는 테두리로만 알린다 (자리를 움직이면 선반 전체가 들썩인다) */
.mc.hot { z-index: 2; }
/* 라이브: 다른 구단이 데려간 카드 — 사진은 더 죽이고, 아래 이름 자리를 구단이 가져간다 */
.mc.taken .mc-in { filter: grayscale(1) brightness(.3); }
.mc.taken .mc-tb { display: none; }
.mc.taken .mc-ov { color: #4b5563; text-shadow: none; background: none; animation: none; filter: none; -webkit-text-fill-color: currentColor; }
.mc-ttop { position: absolute; z-index: 5; left: 8cqw; right: 2.5cqw; top: 2.5cqw; height: 2cqw; background: var(--t); }
/* 데려간 카드의 사진 자리에 올라오는 구단 배너 — 아래 정보 줄(이름 · CP)은 그대로 둔다 */
/* 데려간 카드: 위는 선수 사진 그대로, 아래 절반만 구단 엠블럼으로 (둘 다 보인다) */
.mc-flag { position: absolute; z-index: 4; left: 0; right: 0; bottom: 38cqw; height: 52cqw; background: #070b14 center 30% / cover no-repeat; }
.mc-flag::after { content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(5,8,15,.3), rgba(5,8,15,.9));
  box-shadow: inset 0 1px 0 var(--t); }
.mc-tnm { position: absolute; z-index: 5; left: 7cqw; right: 7cqw; bottom: 40cqw; font-size: 15cqw; font-weight: 800; line-height: 1; letter-spacing: -.02em; color: #fff; text-shadow: 0 2px 6px #000; white-space: nowrap; overflow: hidden; }
/* 아래 줄은 죽은 톤으로 (카드가 살아 있는 것과 구분) */
/* 구단 이름과 겹치므로 포지션 칩과 영문 줄은 지운다 */
.mc.taken .mc-pos { display: none; }
.mc.taken .mc-nm { color: #94a3b8; }
.mc.taken .mc-cp b { color: var(--t); text-shadow: none; }
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
.pk.t90 .pk-ov { background: linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc) 0 50% / 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: none; -webkit-text-stroke: .6px rgba(0,0,0,.75); paint-order: stroke fill; animation: prism 3s linear infinite; }
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
/* 능력치 막대: 내 라커와 같은 규칙 — 낮으면 푸른 회색 → 높을수록 카드(구단) 색, 빛 번짐 없음 */
.pk-bar { display: block; flex-basis: 100%; height: 1.4cqw; margin-top: .8cqw; background: rgba(255,255,255,.08); }
.pk-bar b { display: block; height: 100%; }
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
.pkf-in { animation: pkFlipIn .26s ease-in-out both; } /* pk-in 은 PlayerCard 안쪽 층 이름이라 겹치지 않게 pkf- */
.pkf-out { pointer-events: none; }
.pkf-out.flip { animation: pkFlipOut .26s ease-in-out both; }
.pkf-out.sign { animation: pickSign .22s ease-in both; }
.pk-back.away { animation: pkBackAway .13s ease-in-out both; }
.pk-back.hidden { visibility: hidden; transform: rotateY(90deg); }
.pk-back.return { animation: pkBackReturn .13s ease-in-out .13s both; }
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
/* 넓은 화면: 시너지는 구장 바로 오른쪽(판 끝까지), 그늘은 옅게 해 사진이 뒤로 이어 보이게 */
.syn-dock.wide { right: auto; padding: 12px 16px 10px 22px; background: linear-gradient(90deg, rgba(5,8,15,0), rgba(5,8,15,.5) 16%, rgba(5,8,15,.7)); }
/* 오른쪽 LINEUP 명단: 묶음 상자 위 “선 위 라벨”(이름만) · 줄은 판 높이에 맞춰 늘고 줄어 12줄이 늘 들어감 */
/* 드래프트 화면 오른쪽 MY TEAM 판: 탭 [팀 분석 · 선수 기록] */
.mt-panel { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.mt-tabs { flex: none; display: flex; gap: 20px; padding: 0 4px; box-shadow: inset 0 -1px 0 rgba(148,163,184,.16); }
.mt-tabs button { position: relative; padding: 3px 1px 8px; font-size: 13px; font-weight: 600; color: #6b7280; transition: color .15s; }
.mt-tabs button:hover { color: #cbd5e1; }
.mt-tabs button.on { color: #fff; }
.mt-tabs button.on::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: #10b981; }
.mt-tabs button:focus-visible { outline: 2px solid #10b981; outline-offset: 2px; }
.mt-team { display: flex; flex-direction: column; justify-content: space-between; gap: 8px; padding: 2px 4px 0; }
.mt-trio { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 2px 0 8px; box-shadow: inset 0 -1px 0 rgba(148,163,184,.12); }
.mt-trio > div { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.mt-trio > div + div { box-shadow: inset 1px 0 0 rgba(148,163,184,.12); }
.mt-trio small { font-size: 11px; color: #6b7280; }
.mt-trio b { font-size: 30px; font-weight: 700; line-height: 1; color: #fff; }
.mt-radar { position: relative; }
.mt-rd { display: block; width: 100%; height: auto; }
.mt-rd text { font-size: 11px; fill: #cbd5e1; }
.mt-rd text.v { font-family: 'Saira Condensed', sans-serif; font-size: 15px; font-weight: 700; fill: #fff; }
.mt-rd tspan.d { font-family: 'Saira Condensed', sans-serif; font-size: 12px; font-weight: 700; }
.mt-lgd { position: absolute; right: 0; bottom: 2px; display: flex; flex-direction: column; align-items: flex-end; gap: 1px; font-size: 9.5px; color: #6b7280; pointer-events: none; }
.mt-lgd i { display: inline-block; width: 9px; margin-right: 4px; vertical-align: 2px; border-top: 2px solid #34d399; }
.mt-lgd i.ai { border-top: 2px dashed #f87171; }
.mt-lgd b { margin-left: 3px; font-size: 11px; font-weight: 700; color: #cbd5e1; }
.mt-style { font-size: 17px; font-weight: 700; color: #fff; }
.mt-style .g { color: #34d399; }
.mt-style .o { color: #fb923c; }
.mt-style i { margin: 0 6px; font-style: normal; color: #4b5563; }
.mt-chips { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
.mt-chips span { display: flex; align-items: baseline; justify-content: space-between; padding: 6px 8px; font-size: 12px; color: #cbd5e1; background: rgba(255,255,255,.03); box-shadow: inset 0 0 0 1px rgba(148,163,184,.1); }
.mt-chips b { font-size: 15px; font-weight: 700; }
.mt-chips .up b { color: #34d399; }
.mt-chips .dn b { color: #fb923c; }
.mt-rec { display: flex; flex-direction: column; gap: 10px; }
.mt-card { --c: 10px; --ac: #38bdf8; padding: 6px 8px 4px 11px; background: rgba(255,255,255,.028); box-shadow: inset 3px 0 0 var(--ac); clip-path: polygon(var(--c) 0,100% 0,100% calc(100% - var(--c)),calc(100% - var(--c)) 100%,0 100%,0 var(--c)); }
.mt-card.bat { --ac: #34d399; }
.mt-gh { display: flex; align-items: center; gap: 8px; height: 22px; padding: 0 2px; }
.mt-gh::after { content: ""; flex: 1; height: 1px; background: rgba(148,163,184,.2); order: 2; }
.mt-gh .en { font-size: 14px; font-weight: 800; letter-spacing: .18em; color: var(--ac); }
.mt-gh b { order: 1; font-size: 12px; color: #cbd5e1; }
.mt-gh em { order: 3; font-style: normal; font-size: 11px; color: #6b7280; }
.mt-rec table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.mt-rec th { height: 22px; padding: 0 4px; font-size: 10.5px; font-weight: 500; color: #6b7280; text-align: right; box-shadow: inset 0 -1px 0 rgba(148,163,184,.2); }
.mt-rec td { height: 29px; padding: 0 4px; font-size: 13px; text-align: right; color: #d1d5db; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: inset 0 -1px 0 rgba(148,163,184,.07); }
.mt-rec tbody tr:last-child td { box-shadow: none; }
.mt-rec .l { text-align: left; }
.mt-rec tbody tr { cursor: pointer; transition: background .12s; }
.mt-rec tbody tr:hover { background: rgba(255,255,255,.05); }
.mt-rec tbody tr:focus-visible { outline: 2px solid #38bdf8; outline-offset: -2px; }
/* 고른 줄: 바탕은 아주 옅게, 사진에 카드 색(투수 하늘 · 타자 초록) 빛 고리 · 이름은 카드 색 · 종합은 카드 색 알약 */
.mt-rec tr.on { background: rgba(255,255,255,.06); }
.mt-rec tr.on .mt-face { box-shadow: 0 0 0 2px var(--ac), 0 0 10px 1px color-mix(in srgb, var(--ac) 60%, transparent); }
.mt-rec tr.on .who b { color: var(--ac); }
.mt-rec tr.on td.ov b { display: inline-block; min-width: 26px; padding: 2px 4px; text-align: center; border-radius: 3px; background: color-mix(in srgb, var(--ac) 22%, transparent); }
.mt-rec tr.e td { height: 24px; font-size: 11.5px; color: #4b5563; }
.mt-rec .pos { font-size: 11.5px; color: #9ca3af; }
.mt-face { display: inline-block; width: 22px; height: 22px; vertical-align: middle; border-radius: 50%; background-color: #1b2537; background-repeat: no-repeat; box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }
.mt-rec .who { display: flex; flex-direction: column; min-width: 0; line-height: 1.15; }
.mt-rec .who b { font-size: 13px; color: #fff; overflow: hidden; text-overflow: ellipsis; }
.mt-rec .who small { font-size: 10px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; }
.mt-rec .st { font-size: 15px; font-weight: 600; }
.mt-rec .st.none { color: #4b5563; }
.mt-rec .st.best { font-weight: 700; color: #34d399; }
.mt-rec td.ov b { font-size: 17px; font-weight: 700; color: #fff; }
/* 종합 수치 색 등급 (선반 · PICK 카드와 같게) */
.mt-trio b.t75, .mt-rec td.ov b.t75 { color: #34d399; }
.mt-trio b.t90, .mt-rec td.ov b.t90 { background: linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc) 0 50% / 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: prism 3s linear infinite; }
/* 넓은 화면: 판 높이에 맞춰 늘어난다 — 레이더는 남는 높이만큼 커지고, 기록표 줄은 카드 높이를 나눠 가진다(한 줄 26~42px) */
@media (min-width: 1024px) {
  .mt-panel { flex: 1; }
  .mt-body { flex: 1; min-height: 0; overflow-y: auto; }
  .mt-team { height: 100%; justify-content: flex-start; gap: 14px; }
  .mt-radar { flex: 1 1 0; min-height: 200px; display: grid; place-items: center; container-type: size; }
  .mt-rd { width: min(100cqw, 100cqh * 340 / 294); }
  .mt-rec { height: 100%; }
  .mt-card { flex-shrink: 0; flex-basis: 0; min-height: calc(60px + var(--n) * 26px); container-type: size; }
  .mt-rec td, .mt-rec tr.e td { height: clamp(26px, calc((100cqh - 60px) / var(--n)), 42px); }
  /* 판이 큰 만큼 글자 · 사진도 한 단계 크게 */
  .mt-trio { padding-bottom: 12px; }
  .mt-trio small { font-size: 12px; }
  .mt-trio b { font-size: 36px; }
  .mt-style { font-size: 20px; }
  .mt-chips { gap: 6px; }
  .mt-chips span { padding: 10px; font-size: 13px; }
  .mt-chips b { font-size: 17px; }
  .mt-gh { height: 26px; }
  .mt-gh .en { font-size: 15.5px; }
  .mt-gh b { font-size: 13px; }
  .mt-rec th { font-size: 11px; }
  .mt-face { width: 28px; height: 28px; }
  .mt-rec .who b { font-size: 14px; }
  .mt-rec .who small { font-size: 10.5px; }
  .mt-rec .st { font-size: 17px; }
  .mt-rec td.ov b { font-size: 19px; }
}
.dock-row { display: block; width: 100%; text-align: left; padding: 8px 6px 8px 12px; border-bottom: 1px solid rgba(255,255,255,.07); background: none; }
.dock-row:hover { background: rgba(255,255,255,.03); }
.dock-row.on { background: linear-gradient(90deg, rgba(16,185,129,.16), transparent); box-shadow: inset 2px 0 0 #10b981; }
.dock-row.open { background: rgba(56,189,248,.07); box-shadow: inset 2px 0 0 #38bdf8; }
.dock-row.on.open { background: linear-gradient(90deg, rgba(16,185,129,.16), rgba(56,189,248,.06)); box-shadow: inset 2px 0 0 #10b981; }
.dock-row:focus-visible { outline: 2px solid #38bdf8; outline-offset: -2px; }
/* 시너지 아이콘 단계 색: 0 없음 · 1 브론즈 · 2 실버 · 3 골드 · 4 프리즘 */
.sy0 { --fr: linear-gradient(160deg, #2b3445, #161c27); --bd: #3a4556; --gc: #6b7280; }
.sy1 { --fr: linear-gradient(160deg, #d69a62, #8a5428); --bd: #e7b184; --gc: #1a0f07; }
.sy2 { --fr: linear-gradient(160deg, #eef2f6, #8d99a6); --bd: #f8fafc; --gc: #0f172a; }
.sy3 { --fr: linear-gradient(160deg, #fde68a, #c08a0e); --bd: #fef3c7; --gc: #1c1402; }
.sy4 { --fr: linear-gradient(135deg, #f0abfc, #7dd3fc 45%, #6ee7b7 70%, #fde68a); --bd: #fff; --gc: #0b0f1a; }
.sy-ico { position: relative; flex: none; width: 38px; height: 33px; display: grid; place-items: center; background: var(--bd); clip-path: polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%); }
.sy-ico::before { content: ""; position: absolute; inset: 2px 2.3px; background: var(--fr); clip-path: polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%); }
.sy-ico i { position: relative; width: 58%; height: 66%; background: var(--gc); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
/* 드래프트 시너지 도크 */
.sd { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; }
.syn-dock.wide .sd { padding-top: 60px; } /* 넓은 구장 사진의 전광판 조명 아래부터 */
.sd-hd { flex: none; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-left: 4px; }
.sd-lab { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; letter-spacing: .32em; color: #10b981; text-shadow: 0 1px 3px #000, 0 0 10px rgba(0,0,0,.95); }
.sd-lab::before { content: ""; width: 14px; height: 10px; background: currentColor; clip-path: polygon(0 0,60% 0,100% 100%,40% 100%); }
.sd-hd em { padding: 0 6px; font-style: normal; font-size: 12px; font-weight: 800; line-height: 16px; color: #05080f; background: #10b981; border-radius: 2px; }
.sd-hd button { margin-left: auto; padding: 2px 6px; font-size: 12px; font-weight: 600; color: #10b981; text-shadow: 0 1px 3px #000, 0 0 10px rgba(0,0,0,.95); border-radius: 3px; }
.sd-hd button:hover { background: rgba(16,185,129,.12); }
.sd-hd button:focus-visible { outline: 2px solid #10b981; outline-offset: 1px; }
.sd-list { flex: 1; min-height: 0; overflow-y: auto; padding-right: 2px; }
.sd-row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 5px 4px; text-align: left; border-radius: 3px; transition: background .12s; }
.sd-row:hover, .sd-row.hv { background: rgba(255,255,255,.06); }
.sd-row:focus-visible { outline: 2px solid #38bdf8; outline-offset: -2px; }
.sd-row.fo { background: rgba(56,189,248,.1); box-shadow: inset 0 0 0 1px rgba(56,189,248,.45); }
.sd-row.on .sy-ico { animation: synShine 3s ease-in-out infinite; }
@keyframes synShine { 50% { filter: brightness(1.22); } }
.sd-tx { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.sd-tx b { font-size: 13px; font-weight: 600; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sd-row.on .sd-tx b { color: #fff; }
.sd-stp { font-size: 12px; font-weight: 600; color: #4b5563; }
.sd-stp .ok { color: #e5e7eb; }
.sd-stp i { margin: 0 3px; font-style: normal; color: #374151; }
.sd-fr, .ss-fr { flex: none; font-size: 18px; font-weight: 700; color: #fff; }
.sd-fr small, .ss-fr small { font-size: 12px; color: #6b7280; }
.sd-row.sy0 .sd-fr { color: #6b7280; }
.sd-fr u, .ss-fr u { margin-left: 2px; font-size: .8em; text-decoration: none; color: #38bdf8; }
.sd-row.gr .sd-fr { color: #7dd3fc; }
.sd-tip { position: absolute; z-index: 30; right: calc(100% + 26px); width: 262px; padding: 12px 13px; background: rgba(6,10,19,.97); box-shadow: 0 0 0 1px rgba(148,163,184,.28), 0 18px 40px -8px rgba(0,0,0,.9); pointer-events: none; }
.sd-tip.up { right: auto; bottom: calc(100% + 10px); }
.sd-th { display: flex; align-items: center; gap: 9px; }
.sd-th b { font-size: 16px; color: #fff; }
.sd-th .sy-ico { width: 32px; height: 28px; }
.sd-tip p { margin: 9px 0 8px; font-size: 12px; line-height: 1.5; color: #9ca3af; }
.sd-tip p b { color: #fff; }
.sd-tip ul { margin: 0 0 10px; font-size: 12.5px; line-height: 1.6; color: #6b7280; }
.sd-tip li span { display: inline-block; min-width: 28px; font-weight: 700; }
.sd-tip li.ok { color: #fff; }
.sd-tip li.ok span { color: #34d399; }
.sd-tip li.nx { color: #9ca3af; }
.sd-pfs { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 6px 5px; }
.sd-pf { width: 44px; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.sd-pf i { width: 40px; height: 40px; border-radius: 3px; background-color: #1b2537; background-repeat: no-repeat; box-shadow: 0 0 0 2px var(--bd); }
.sy0 .sd-pf.in i { box-shadow: 0 0 0 2px #9ca3af; }
.sd-pf small { max-width: 44px; font-size: 10px; color: #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sd-pf.out i { filter: grayscale(1) brightness(.5); box-shadow: 0 0 0 1px #374151; }
.sd-pf.out small { color: #6b7280; }
.sd-pf.cd i { box-shadow: 0 0 0 2px #38bdf8; }
.sd-pf.cd small { color: #7dd3fc; }
/* 전체 시너지 창 */
.ss-flt { display: flex; gap: 6px; }
.ss-flt button { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; font-size: 12.5px; font-weight: 600; color: #9ca3af; background: rgba(255,255,255,.05); border-radius: 3px; }
.ss-flt button b { font-size: 14px; color: #e5e7eb; }
.ss-flt button.on { color: #05080f; background: #10b981; }
.ss-flt button.on b { color: #05080f; }
.ss-flt button:focus-visible { outline: 2px solid #10b981; outline-offset: 1px; }
.ss-list { display: flex; flex-direction: column; gap: 8px; }
.ss-card { display: flex; align-items: flex-start; gap: 14px; width: 100%; padding: 12px 14px 12px 12px; text-align: left; background: rgba(255,255,255,.03); box-shadow: inset 0 0 0 1px rgba(148,163,184,.1); transition: background .12s; }
.ss-card:hover { background: rgba(255,255,255,.06); }
.ss-card:focus-visible { outline: 2px solid #38bdf8; outline-offset: -2px; }
.ss-card.on { background: linear-gradient(90deg, color-mix(in srgb, var(--bd) 13%, transparent), rgba(255,255,255,.02)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bd) 45%, transparent); }
.ss-card.fo { box-shadow: inset 0 0 0 1px rgba(56,189,248,.6); }
.ss-card.zero { opacity: .72; }
.ss-card > .sy-ico { width: 48px; height: 42px; margin-top: 2px; }
.ss-body { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 7px; }
.ss-l1 { display: flex; align-items: baseline; gap: 8px; }
.ss-l1 b { font-size: 15.5px; color: #fff; }
.ss-card.sy0 .ss-l1 b { color: #cbd5e1; }
.ss-fr { margin-left: auto; font-size: 19px; }
.ss-cond { font-size: 12px; color: #6b7280; }
.ss-tiers { display: flex; flex-wrap: wrap; gap: 5px; }
.ss-tiers > span { display: inline-flex; align-items: center; gap: 6px; padding: 1px 8px 1px 2px; font-size: 12px; line-height: 19px; color: #6b7280; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(148,163,184,.16); }
.ss-tiers em { min-width: 19px; padding: 0 4px; font-style: normal; font-weight: 700; text-align: center; color: #9ca3af; background: rgba(148,163,184,.12); border-radius: 2px; }
.ss-tiers .ok { color: #fff; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bd) 60%, transparent); }
.ss-tiers .ok em { color: #05080f; background: var(--bd); }
.ss-tiers .nx { color: #cbd5e1; box-shadow: inset 0 0 0 1px rgba(56,189,248,.5); }
.ss-pfs { margin-top: 1px; }
.ss-pfs .sd-pf { width: 42px; }
.ss-pfs .sd-pf i { width: 36px; height: 36px; }
.ss-more { align-self: center; padding: 0 6px; font-size: 13px; font-weight: 700; color: #6b7280; }
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
/* ───── 정비 화면 (ReadyScreen): 왼쪽 타순 · 가운데 수비 포지션 · 오른쪽 투수 로테이션과 시너지 ───── */
.rd-top { display: flex; align-items: center; gap: 10px; }
.rd-tot { --a: #34d399; min-width: 150px; padding: 7px 14px; background: linear-gradient(180deg, rgba(10,18,30,.92), rgba(6,11,19,.86)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--a) 28%, transparent); }
.rd-tot > span { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; }
.rd-tot b { font-family: 'Saira Condensed', sans-serif; font-size: 28px; font-weight: 800; line-height: 1.05; color: var(--a); font-variant-numeric: tabular-nums; }
.rd-tot i { display: block; height: 3px; margin-top: 4px; background: rgba(255,255,255,.08); }
.rd-tot i::after { content: ""; display: block; width: var(--w); height: 100%; background: var(--a); }
.rd-dl { font-family: 'Saira Condensed', sans-serif; font-size: 13px; font-weight: 700; margin-left: 6px; color: #475569; }
.rd-dl.up { color: #34d399; }
.rd-dl.dn { color: #fbbf24; }
/* 판 */
.rd-pan { --a: #34d399; position: relative; display: flex; flex-direction: column; min-height: 0; min-width: 0; background: rgba(6,10,19,.74); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
.rd-pan::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(135deg, transparent calc(50% - 1px), var(--a) calc(50% - 1px), var(--a) calc(50% + 1px), transparent calc(50% + 1px)) left top / var(--c) var(--c) no-repeat,
    linear-gradient(135deg, transparent calc(50% - 1px), var(--a) calc(50% - 1px), var(--a) calc(50% + 1px), transparent calc(50% + 1px)) right bottom / var(--c) var(--c) no-repeat,
    linear-gradient(var(--a), var(--a)) left var(--c) top 0 / 56px 2px no-repeat,
    linear-gradient(var(--a), var(--a)) left 0 top var(--c) / 2px 30px no-repeat,
    linear-gradient(var(--a), var(--a)) right var(--c) bottom 0 / 56px 2px no-repeat,
    linear-gradient(var(--a), var(--a)) right 0 bottom var(--c) / 2px 30px no-repeat;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--a) 32%, transparent); }
/* 정비 사이드바: 모드 탭을 세운 버튼 모양의 합계 칸 */
.rd-side { display: flex; min-height: 0; flex-direction: column; gap: 8px; padding: 12px; }
.rd-side .rd-tot { position: relative; display: flex; min-height: 4.4rem; flex-direction: column; justify-content: center; padding: 6px 14px 6px 17px; background: linear-gradient(90deg, color-mix(in srgb, var(--a) 16%, transparent), rgba(6,10,19,.7)); box-shadow: none; }
.rd-side .rd-tot::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--a); box-shadow: 0 0 12px var(--a); }
.rd-ph { display: flex; align-items: flex-end; gap: 10px; padding: 12px 18px 10px; }
.rd-ph h3 { margin: 4px 0 0; font-size: 22px; font-weight: 900; line-height: 1; color: #fff; }
.rd-ph em { display: inline-flex; align-items: center; gap: 8px; font-family: 'Saira Condensed', sans-serif; font-size: 12px; font-weight: 700; font-style: normal; letter-spacing: .32em; text-transform: uppercase; color: var(--a); }
.rd-ph em::before { content: ""; width: 14px; height: 10px; background: currentColor; clip-path: polygon(0 0,60% 0,100% 100%,40% 100%); }
.rd-ph > div { display: flex; flex-direction: column-reverse; }
.rd-ph .sum { margin-left: auto; text-align: right; line-height: 1.1; }
.rd-ph .sum small { display: block; font-size: 11px; color: #94a3b8; }
.rd-ph .sum b { font-family: 'Saira Condensed', sans-serif; font-size: 26px; font-weight: 800; color: var(--a); font-variant-numeric: tabular-nums; }
/* 타순 줄 */
.rd-rows { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 5px; padding: 0 14px 14px; }
/* 타순 아래 예비 명단: 제목 줄 + 옅은 칸 */
.rd-bnh { display: flex; align-items: baseline; gap: 7px; margin: 0 14px; padding: 7px 0 6px; font-size: 13px; font-weight: 700; color: #cbd5e1; border-top: 1px solid rgba(255,255,255,.08); }
.rd-bnh em { font-family: 'Saira Condensed', sans-serif; font-size: 11px; font-style: normal; font-weight: 700; letter-spacing: .08em; color: #64748b; }
.rd-bnh small { margin-left: auto; font-size: 11px; color: #6b7280; }
.rd-rows .rd-row.empty { opacity: .45; }
.rd-rows .rd-row.empty .rd-nm { color: #6b7280; }
.rd-bn-g { flex: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; padding: 0 14px 14px; }
.rd-bc { position: relative; display: grid; grid-template-columns: 24px auto minmax(0, 1fr) auto; align-items: center; gap: 7px; height: 34px; padding: 0 9px 0 6px; background: linear-gradient(90deg, rgba(255,255,255,.05), transparent 70%); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); cursor: grab; user-select: none; touch-action: none; outline: none; transition: background .12s, box-shadow .12s; }
.rd-bc:hover { background: linear-gradient(90deg, rgba(255,255,255,.09), transparent 70%); }
.rd-bc-pos, .rd-bc .rd-bc-pos { font-family: 'Saira Condensed', sans-serif; font-size: 10px; font-weight: 800; letter-spacing: .04em; color: #94a3b8; }
.rd-bc b { min-width: 0; overflow: hidden; font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.rd-bc em { font-family: 'Saira Condensed', sans-serif; font-size: 16px; font-style: normal; font-weight: 800; }
.rd-bc-rest { font-family: 'Saira Condensed', sans-serif; font-size: 12px; font-weight: 800; color: #fb923c; }
.rd-bc-ph { width: 24px; height: 26px; background: linear-gradient(180deg, #2c3749, #222c3e 70%); }
.rd-bc.empty { opacity: .45; cursor: default; }
.rd-bc.empty b { color: #6b7280; font-weight: 500; }
.rd-bc.empty em { color: #4b5563; }
.rd-bc.on { background: rgba(56,189,248,.16); box-shadow: inset 0 0 0 1px #38bdf8; }
.rd-bc.over { background: rgba(16,185,129,.18); box-shadow: inset 0 0 0 1px #10b981; }
.rd-row { display: grid; grid-template-columns: 30px 38px 20px 34px minmax(0,1fr) 46px; align-items: center; gap: 10px; flex: 1; min-height: 0; max-height: 58px; padding: 0 12px; background: linear-gradient(90deg, rgba(255,255,255,.05), transparent 70%); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); cursor: grab; user-select: none; touch-action: none; outline: none; transition: background .12s, box-shadow .12s; }
.rd-row:hover { background: linear-gradient(90deg, rgba(56,189,248,.16), transparent 70%); }
.rd-row:is(.sel, .over) { background: linear-gradient(90deg, rgba(56,189,248,.26), rgba(56,189,248,.03)); box-shadow: inset 0 0 0 1px #38bdf8; }
.rd-row.lifted { opacity: .3; }
.rd-row:focus-visible { box-shadow: inset 0 0 0 1px #10b981; }
.rd-no { font-family: 'Saira Condensed', sans-serif; font-size: 24px; font-weight: 800; line-height: 1; text-align: center; color: #e2e8f0; font-variant-numeric: tabular-nums; }
.rd-pos { display: grid; place-items: center; height: 21px; font-family: 'Saira Condensed', sans-serif; font-size: 12px; font-weight: 800; line-height: 21px; color: #93c5fd; background: rgba(12,22,38,.9); box-shadow: inset 0 0 0 1px rgba(96,165,250,.45); }
.rd-pos.dh { color: #ffb27a; box-shadow: inset 0 0 0 1px rgba(255,138,61,.55); }
.rd-pos.p { color: #fca5a5; box-shadow: inset 0 0 0 1px rgba(248,113,113,.5); }
.rd-pos.off { color: #fbbf24; box-shadow: inset 0 0 0 1px rgba(251,191,36,.5); }
.rd-hand { font-family: 'Saira Condensed', sans-serif; font-size: 12px; font-weight: 700; color: #64748b; text-align: center; }
.rd-thumb { position: relative; overflow: hidden; background-color: #111827; background-repeat: no-repeat; box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }
.rd-nm { font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rd-ovr { font-family: 'Saira Condensed', sans-serif; font-size: 22px; font-weight: 800; line-height: 1; text-align: right; font-variant-numeric: tabular-nums; }
/* 카드 (수비 · 투수 공통) */
.rd-card { position: relative; display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden; background: linear-gradient(180deg, rgba(13,24,40,.55), rgba(5,9,16,.95)), #0b1220; box-shadow: inset 0 0 0 1.5px var(--cc, rgba(96,165,250,.55)), 0 12px 24px -14px #000; cursor: grab; user-select: none; touch-action: none; outline: none; transition: box-shadow .12s, filter .12s; }
.rd-card .art { position: absolute; inset: 0; background-position: 50% 6%; background-repeat: no-repeat; background-size: cover; }
.rd-card .sh { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,9,16,.12) 32%, rgba(5,9,16,.92) 76%); }
.rd-card .top { position: absolute; left: 0; right: 0; top: 0; z-index: 2; display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; }
.rd-card .top .rd-pos { background: none; box-shadow: none; }
.rd-card .ov { font-family: 'Saira Condensed', sans-serif; font-size: 17px; font-weight: 800; line-height: 1; color: #fff; text-shadow: 0 2px 6px #000; font-variant-numeric: tabular-nums; }
.rd-card .nmb { position: relative; z-index: 2; padding: 4px 7px 6px; text-align: center; }
.rd-card .nmb b { display: block; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rd-card .nmb small { display: block; font-family: 'Saira Condensed', sans-serif; font-size: 10px; font-weight: 700; color: #94a3b8; }
.rd-card.dh { --cc: rgba(255,138,61,.6); }
.rd-card.p { --cc: rgba(248,113,113,.6); }
.rd-card.off { --cc: rgba(251,191,36,.7); }
.rd-card:hover { filter: brightness(1.1); }
.rd-card:is(.sel, .over) { box-shadow: inset 0 0 0 2px #38bdf8, 0 0 22px -4px #38bdf8; }
.rd-card.lifted { opacity: .3; }
.rd-card:focus-visible { box-shadow: inset 0 0 0 2px #10b981; }
/* 구장 */
.rd-fieldbox { position: relative; flex: 1; min-height: 0; margin: 0 14px 14px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(96,165,250,.16); }
.rd-field { position: absolute; left: 50%; top: 50%; aspect-ratio: 1920 / 1433; height: 116%; transform: translate(-50%, -48%); background: url(ui/field.webp) center / cover no-repeat; }
.rd-field::after { content: ""; position: absolute; inset: 0; background: radial-gradient(76% 66% at 50% 52%, transparent, rgba(3,6,11,.62)); }
.rd-fc { position: absolute; z-index: 2; width: 104px; height: 120px; transform: translate(-50%, -50%); }
/* 투수 로테이션 */
.rd-rot { display: grid; gap: 10px; padding: 0 16px 14px; min-height: 0; }
.rd-slot { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
.rd-slot > span { display: flex; align-items: baseline; gap: 8px; font-size: 13px; font-weight: 700; color: #cbd5e1; }
.rd-slot > span em { font-family: 'Saira Condensed', sans-serif; font-size: 10px; font-weight: 700; font-style: normal; letter-spacing: .2em; color: #64748b; }
.rd-slot > div { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.rd-empty { display: grid; place-items: center; font-size: 20px; color: #475569; background: rgba(255,255,255,.02); box-shadow: inset 0 0 0 1.5px rgba(148,163,184,.22); }
/* 시너지 */
.rd-syn { display: flex; flex-direction: column; gap: 8px; padding: 0 16px 14px; min-height: 0; overflow-y: auto; }
.rd-sc { --s: #34d399; flex: none; display: grid; grid-template-columns: 42px minmax(0,1fr) auto; align-items: center; gap: 12px; padding: 10px 12px; background: linear-gradient(90deg, color-mix(in srgb, var(--s) 12%, rgba(6,11,19,.9)), rgba(6,11,19,.9)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--s) 38%, transparent); }
.rd-sc .ic { display: grid; place-items: center; width: 42px; height: 42px; font-family: 'Saira Condensed', sans-serif; font-size: 15px; font-weight: 800; color: var(--s); background: rgba(5,8,15,.65); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--s) 60%, transparent); }
.rd-sc b { display: block; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rd-sc .ef { font-family: 'Saira Condensed', sans-serif; font-size: 14px; font-weight: 800; color: var(--s); }
.rd-sc small { display: block; font-size: 11.5px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rd-sc.lock { --s: #64748b; opacity: .78; }
.rd-tag { padding: 3px 9px; font-size: 11.5px; font-weight: 700; color: #cbd5e1; background: rgba(255,255,255,.06); box-shadow: inset 0 0 0 1px rgba(255,255,255,.16); clip-path: polygon(5px 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%,0 5px); }
/* 추천 선수 (타순·수비 판 아래 띠) */
.rd-cond { position: absolute; left: 6px; right: 6px; bottom: 34px; z-index: 3; display: flex; align-items: center; gap: 4px; height: 15px; padding: 0 4px; background: rgba(5,8,15,.82); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--k) 55%, transparent); }
.rd-cond .bar { flex: 1; height: 4px; background: rgba(255,255,255,.1); }
.rd-cond .bar i { display: block; height: 100%; background: var(--k); box-shadow: 0 0 6px var(--k); }
.rd-cond b { font-family: 'Saira Condensed', sans-serif; font-size: 11px; font-weight: 800; color: var(--k); }
.rd-cond em { font-family: 'Saira Condensed', sans-serif; font-size: 11px; font-style: normal; font-weight: 700; color: #cbd5e1; }
.rd-gain { position: absolute; left: 6px; bottom: 34px; z-index: 3; padding: 0 6px; font-family: 'Saira Condensed', sans-serif; font-size: 12px; font-weight: 800; line-height: 17px; color: #04150e; background: #34d399; }
.rd-ghost { position: fixed; z-index: 60; pointer-events: none; transform-origin: 0 0; filter: drop-shadow(0 14px 18px rgba(0,0,0,.7)); }
.rd-ghost > * { box-shadow: inset 0 0 0 2px #38bdf8 !important; }
.prism-tx { background: linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc) 0 50% / 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: prism 3s linear infinite; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
`;

const SILVER = { border: 'border-slate-300/70', text: 'text-slate-200', glow: 'shadow-[0_0_28px_-10px_rgba(203,213,225,0.7)]', chip: 'border-slate-300/40 bg-slate-300/10 text-slate-200', bar: 'bg-slate-300' };
/* 등급이 하나뿐이라 어느 이름으로 물어도 같은 것이 나온다 */
const TIER = new Proxy({}, { get: () => SILVER });

/* 증강 네온 — 등급이 사라져 하나로 */
const AUG_NEON = '#cbd5e1';
const TIER_NEON = new Proxy({}, { get: () => AUG_NEON });
const TIER_EN = new Proxy({}, { get: () => '증강' });
const AUG_TYPE = { build: '키우기', defense: '수비', extreme: '맞바꾸기', balance: '약점 보강', fire: '경기 중', situ: '상황' };

/** 증강 테두리 — 등급이 하나라 모두 같은 테를 두른다 */
function TierFrame({ className = '', innerClassName = '', style, children }) {
  return <div style={style} className={`rounded-xl border-2 bg-[#111827] ${SILVER.border} ${SILVER.glow} ${className} ${innerClassName}`}>{children}</div>;
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
        <span className={`block h-full rounded-full ${value >= 100 ? 'bg-[#10b981]' : 'bg-gray-400'}`} style={{ width: `${statPct(value)}%` }} />
      </span>
      <span className={`text-right font-display text-sm font-semibold tabular-nums ${value >= 100 ? 'text-[#10b981]' : 'text-gray-200'}`}>{value}</span>
    </div>
  );
}

function Badge({ children }) {
  return <span className="rounded border border-gray-600 px-1.5 py-px text-[10px] font-semibold text-gray-300">{children}</span>;
}

/* ───── 상단 샐러리 캡 대시보드 ───── */
/** capAfter: PICK 에 올린 선수를 영입하면 남을 캡 — 있으면 “지금 → 영입 후” 숫자와, 깎일 칸이 노랗게 깜빡이는 게이지 */
function CapDashboard({ round, cp, cap = SALARY_CAP, roster, phase, onOpenRules, wide = false, modeName = null, modeNeon = '#10b981', capAfter = null, onExit, slim = false }) {
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
        {onExit && <button type="button" onClick={onExit} aria-label="메인으로" className="ui-cut grid h-9 w-9 shrink-0 place-items-center bg-white/[0.06] text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)] hover:bg-white/10" style={{ '--c': '7px' }}>←</button>}
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

        {!slim && <div className="flex items-baseline gap-2">
          <span className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-gray-500">Round</span>
          <span className="font-display text-[2.6rem] font-bold leading-none tabular-nums text-white [text-shadow:0_0_18px_rgba(16,185,129,.35)]">{String(Math.min(round, ROSTER_SIZE)).padStart(2, '0')}</span>
          <span className="font-display text-lg font-semibold text-gray-500">/ {ROSTER_SIZE}</span>
        </div>}

        {!slim && isNoCap(cap) && (
          <div className="min-w-[220px] flex-1">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs font-semibold text-gray-400">샐러리 캡</span>
              <b className="font-display text-2xl font-bold text-[#fbbf24]" style={{ textShadow: '0 0 14px rgba(251,191,36,.5)' }}>제한 없음</b>
            </div>
            <div className="ui-seg" style={{ '--a': '#fbbf24' }} aria-hidden="true">
              {Array.from({ length: 24 }, (_, i) => <i key={i} className="on" />)}
            </div>
          </div>
        )}
        {!slim && !isNoCap(cap) && <div className="min-w-[220px] flex-1">
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
        </div>}
        {slim && <span className="flex-1" aria-hidden="true" />}

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
export const PK_SKELETON = [
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
export function PlayerCard({ player, reason, shaking, onSelect, style, owned = null, hint = null, cost = null }) {
  const locked = !!reason;
  const art = useArt(player);
  const acc = neonOf(player);
  const eff = owned?.eff || player;
  const statKeys = eff.type === 'batter' ? ['power', 'contact', 'speed', 'defense'] : ['stuff', 'control', 'stamina', 'stability'];
  const overallDiff = owned ? eff.overall - player.overall : 0;
  const tier = eff.overall >= 100 ? 't90' : eff.overall >= 85 ? 't75' : '';
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
                  <dd className="font-display tabular-nums" style={{ color: statOf(k, v).num }}>{v}{diffTag(d)}</dd>
                  <i className="pk-bar"><b style={{ width: `${Math.min(100, v)}%`, background: statOf(k, v).bar }} /></i>
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
            : <span className="pk-cp font-display tabular-nums">
              <small>CP</small>
              {cost != null && cost !== player.cost && <s className="pk-was">{player.cost}</s>}
              <b style={cost != null && cost !== player.cost ? { color: '#fbbf24' } : undefined}>{cost ?? player.cost}</b>
            </span>}
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
/* 선반 머리 가운데: 라운드와 샐러리 캡 잔여 (칸 스물넷) */
function DraftMeta({ round, cp, cap, capAfter, inline = false }) {
  const preview = capAfter != null && capAfter !== cp;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const pct = clamp01((preview ? capAfter : cp) / cap);
  const tone = pct > 0.5 ? '#10b981' : pct > 0.2 ? '#fbbf24' : '#f87171';
  const now = Math.round(clamp01(cp / cap) * 24);
  const lit = preview ? Math.min(now, Math.round(pct * 24)) : now;
  return (
    <div className={`dr-meta ${inline ? "inline" : ""}`}>
      <span className="dr-round">
        <small>ROUND</small>
        <b>{String(Math.min(round, ROSTER_SIZE)).padStart(2, '0')}</b>
        <small>/ {ROSTER_SIZE}</small>
      </span>
      <i className="dr-div" aria-hidden="true" />
      {isNoCap(cap) ? (
        <span className="dr-cap" style={{ '--a': '#fbbf24' }}>
          <span className="dr-ticks" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => <i key={i} className="on" />)}
          </span>
          <b style={{ fontSize: '15px' }}>제한 없음</b>
        </span>
      ) : (
        <span className="dr-cap" style={{ '--a': tone }}>
          <span className="dr-ticks" role="meter" aria-label="샐러리 캡 잔여" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={cp}>
            {Array.from({ length: 24 }, (_, i) => <i key={i} className={i < lit ? 'on' : i < now ? 'spend' : ''} />)}
          </span>
          <b>{preview ? capAfter : cp}</b>
          <small>/ {cap}</small>
        </span>
      )}
    </div>
  );
}

/* 라이브 드래프트 · 뽑는 순서 표: 이번 바퀴의 자리 순서대로 구단 조각이 맞물린다 */
function TurnOrder({ live, clock, hold = false }) {
  // hold: 방금 지명된 카드가 아직 엠블럼에 덮여 있는 동안 (띠도 그 구단에 머문다).
  // 다만 바퀴가 넘어갔으면 기다리지 않는다 — 보드가 바뀌는 순간 새 순서를 보여 줘야 한다
  const sameLap = Live.lapOf(live.pick, live.order.length) === Live.lapOf(Math.max(0, live.pick - 1), live.order.length);
  const shown = Math.max(0, live.pick - (hold && sameLap ? 1 : 0));
  const start = shown - (shown % live.order.length);
  const at = shown % Live.CLUB_COUNT;
  const seq = Array.from({ length: live.order.length }, (_, k) => live.clubs[Live.clubAt(start + k, live.order)]);
  return (
    <div className="dr-order" aria-label="뽑는 순서">
      {/* 남은 시간은 조각 밖 제 칸에 — 조각 폭이 바뀌지 않아 줄이 흔들리지 않는다 */}
      {seq.map((c, k) => {
        const now = k === at;
        const past = k < at;
        return (
          <span key={k} className={`dr-pc ${now ? 'now' : past ? 'past' : ''}`} style={{ '--t': c.color }}>
            {c.emblem && <i style={{ backgroundImage: `url(${c.emblem})` }} aria-hidden="true" />}
            <b>{c.short}</b>
          </span>
        );
      })}
      <b className="dr-clock" style={{ '--t': live.clubs[Live.currentClub(live)].color }}>{clock}s</b>
    </div>
  );
}

function MiniCard({ player, reason, takenClub, gone = false, keepAfterGone = false, hot = false, myColor = null, selected, hint, focus, onPick, onSign, style, leaving = false }) {
  const art = useArt(player);
  const acc = neonOf(player);
  const locked = !!reason;
  const tier = player.overall >= 100 ? 't90' : player.overall >= 85 ? 't75' : '';
  return (
    <button type="button" onClick={() => onPick(player)} onDoubleClick={() => onSign?.(player)} aria-pressed={selected}
      aria-label={`${player.year} ${player.team} ${player.name}, ${POS_LABEL[player.position]}, 영입가 ${player.cost} CP${locked ? `, ${reason}` : ''}`}
      style={{ ...style, '--n': acc, ...(takenClub ? { '--t': takenClub.color } : {}), clipPath: 'polygon(10% 0,100% 0,100% 93.3%,90% 100%,0 100%,0 6.7%)' }}
      className={`mc ${tier} ${locked ? 'lock' : ''} ${takenClub ? 'taken' : ''} ${gone ? (keepAfterGone ? 'gone-keep' : 'gone') : ''} ${hot ? 'hot' : ''} ${player.cost >= 100 ? 'c3' : ''} ${leaving ? 'mc-leave' : ''} group relative block aspect-[2/3] w-full bg-[#05080f] text-left [container-type:inline-size] animate-[rise_.35s_ease-out_both] transition-transform duration-200 focus:outline-none focus-visible:-translate-y-1 ${selected ? '-translate-y-1' : 'hover:-translate-y-0.5'} ${focus === 'off' ? 'opacity-30' : ''}`}>
      <span className="mc-in">
        {art
          ? <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover object-[62%_18%]" />
          : <span className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${teamColor(player)}66, #05080f 70%)` }} />}
        <span className="mc-sh" />
        <span className="mc-tb" />
        <span className="mc-ov font-display tabular-nums">{player.overall}</span>
        {hint && <SynergyPips {...hint} />}
        {(
          <>
            <span className="mc-pos font-display"><em>{player.position}</em><span style={POS_FS[player.position] ? { fontSize: `${POS_FS[player.position]}cqw` } : undefined}>{POS_FULL[player.position]}</span></span>
            <span className="mc-rule" />
            <span className={`mc-nm ${player.name.length >= 6 ? 'l6' : player.name.length >= 5 ? 'l5' : player.name.length >= 4 ? 'l4' : ''}`}>{player.name}</span>
            <span className="mc-cp font-display tabular-nums"><small>CP</small><b>{player.cost}</b></span>
          </>
        )}
      </span>
      {/* 테두리(선택 초록 · 시너지 강조 하늘)는 무채색 필터 밖에 둬서 잠긴 카드도 고른 표시가 보이게 */}
      <span className={`pointer-events-none absolute inset-[2.5cqw] transition-colors duration-300 ${selected || focus === 'on' ? 'border-2' : 'border'}`}
        style={{ borderColor: selected ? '#10b981' : focus === 'on' ? '#38bdf8' : hot && myColor ? `${myColor}b3` : takenClub ? `${takenClub.color}66` : `${acc}66` }} />
      {/* 라이브에서 다른 구단이 데려간 카드: 선수는 작은 글씨로 올라가고 아래 이름 자리를 구단이 가져간다.
          회색 필터가 걸린 사진 바깥에 그려야 구단 색이 죽지 않는다 */}
      {takenClub && (
        <>
          <span className="mc-ttop" />
          <span className="mc-flag" style={takenClub.emblem ? { backgroundImage: `url(${takenClub.emblem})` } : undefined} aria-hidden="true" />
          <b className="mc-tnm">{takenClub.short}</b>
        </>
      )}
      {/* 사라지는 순간: 데려간 구단 엠블럼이 카드를 덮고 구단 이름과 함께 사라진다 */}
      {gone && takenClub && (
        <span className="mc-emb" aria-hidden="true"
          style={{ '--t': takenClub.color, backgroundImage: takenClub.emblem ? `url(${takenClub.emblem})` : undefined }}>
          <b>{takenClub.short}</b>
        </span>
      )}
      {/* 데려간 카드는 아래 줄이 이미 구단을 말하므로 잠금 알림을 따로 띄우지 않는다 */}
      {locked && !takenClub && <span className="mc-lk" title={reason}><LockIcon /><span>{reason.replace(/\s*\(.*\)$/, '')}</span></span>}
    </button>
  );
}

/* ───── 라인업 필드: 중계 자막 스타일 토큰 · 끌어서 자리 바꾸기 ─────
   900×580 설계 크기로 그리고 컨테이너 폭에 맞춰 축소한다. 초상은 지금 카드 그림의 얼굴 크롭(정면 상체 초상이 생기면 교체) */
const FIELD_W = 900;
const FIELD_H = 580;
/* 자리별 토큰 중심 (900×580 설계 좌표) — 구장 사진(ui/field-night.webp)의 실제 수비 위치에 맞춤:
   홈 (450,469) · 마운드 (450,341) · 1루 (611,332) · 2루 (450,235) · 3루 (288,330).
   외야 셋은 좌·중·우 잔디, 선발은 마운드, 포수는 홈 뒤, 지명은 3루 쪽 파울 지역, 불펜 둘은 1루 쪽 파울 지역 */
const SLOT_XY = {
  OF1: [220, 132], OF2: [450, 78], OF3: [680, 132],
  SS: [338, 228], '2B': [562, 228], '3B': [252, 306], '1B': [648, 306],
  SP: [450, 346], C: [450, 522], DH: [140, 470],
};
/* 마운드·수비 자리에 서지 않는 자리(불펜 넷 · 예비 여섯)는 시너지 도크 아래 미니 칩으로 모은다 */
const PEN_SLOTS = FIELD_SLOTS.filter((s) => !SLOT_XY[s.id]);
/** 이 구장에서 토큰 크기 (CSS .lf-tok 의 scale 과 같은 값 — 끌기 카드 크기도 여기에 맞춘다) */
const TOK_SCALE = 0.8;
/** 좌우로 넓힌 구장 사진(ui/field-wide.webp)이 필드 좌표(900×580)에서 차지하는 자리 — 원본 사진(field-night)과 구장이 정확히 겹치도록 정합한 값 */
const WIDE_ART = { l: -201.6, t: 7.35, w: 1303.5, h: 553 };
/** 토큰이 차지하는 구장 가로 폭 — 넓은 화면에서 시너지 도크 자리를 남기고 배율을 정할 때 쓴다 */
const FIELD_SPAN = 214 * TOK_SCALE + Math.max(...Object.values(SLOT_XY).map(([x]) => x)) - Math.min(...Object.values(SLOT_XY).map(([x]) => x));
const SLOT_MIN_X = Math.min(...Object.values(SLOT_XY).map(([x]) => x));
const SLOT_MAX_X = Math.max(...Object.values(SLOT_XY).map(([x]) => x));
/** 종합 수치 색 등급: 75 미만 흰색 · 75~89 초록 · 90 이상 무지개 (선반 · PICK 카드와 같은 기준) */
/* 등급 — 눈금 50~110 에서 위쪽 1%(프리즘) · 26%(상위) 자리 */
const tierOf = (v) => (v >= 100 ? 't90' : v >= 85 ? 't75' : '');

const Silhouette = () => (
  <svg className="lf-sil" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <circle cx="50" cy="40" r="18" /><path d="M12 104 C14 74 30 64 50 64 C70 64 86 74 88 104 Z" />
  </svg>
);
const bustStyle = (src, p, size = '300%') => (src ? { backgroundImage: `url(${src})`, backgroundSize: `${size} auto`, backgroundPosition: p.face || '50% 14%' } : undefined);

/* 야간 조명 아래 구장: 줄무늬 잔디 · 붉은 흙 내야 · 빛나는 파울 라인과 베이스 (카드 문법 UI와 같은 톤) */
/** 넓은 화면의 구장: 좌우로 넓힌 사진을 필드 좌표에 붙이고, fade=[시작%, 끝%] 구간에서 오른쪽(시너지 쪽)으로 어둠에 녹아든다 */
function WideFieldArt({ fade }) {
  const mask = `linear-gradient(90deg, #000 ${fade[0]}%, transparent ${fade[1]}%)`;
  return (
    <img src="ui/field-wide.webp" alt="" aria-hidden="true" draggable="false" className="pointer-events-none absolute max-w-none select-none"
      style={{ left: WIDE_ART.l, top: WIDE_ART.t, width: WIDE_ART.w, height: WIDE_ART.h, WebkitMaskImage: mask, maskImage: mask }} />
  );
}

function FieldArt() {
  // 조명탑 아래 밤 경기장을 위에서 내려다본 사진. 900×580 판을 꽉 채우고(위아래 약간 잘림) 가장자리는 둘레 야경으로 흐려진다
  return (
    <img src="ui/field-night.webp" alt="" aria-hidden="true" draggable="false"
      className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      style={{ WebkitMaskImage: 'radial-gradient(120% 110% at 50% 70%, #000 60%, transparent 100%)', maskImage: 'radial-gradient(120% 110% at 50% 70%, #000 60%, transparent 100%)' }} />
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

function BenchSlot({ slot, player, kind, flags, bind, boosted }) {
  const { eff, moved, color, boost } = tokenView(slot, player, kind, boosted);
  const bust = useBust(player, '210%');
  return (
    <div {...bind} data-slot={slot.id} role="button" tabIndex={0}
      aria-label={player ? `${slot.label} 자리 ${player.name} ${eff.overall}` : `${slot.label} 빈 자리`}
      className={`lf-bc ${player ? '' : 'empty'} ${kind} ${flags}`} style={{ '--n': color }}>
      {player ? <span className="lf-bc-bp" style={bust} /> : <span className="lf-bc-ph" />}
      {slot.pos && <span className="lf-bc-pos">{slot.id}</span>}
      <b>{player ? player.name : slot.pos ? slot.label : '빈 자리'}</b>
      <em className={`font-display not-italic tabular-nums ${boost ? 'up' : ''}`}>{eff ? eff.overall : '–'}</em>
      {moved && kind === 'mine' && <i title={`원래 ${moved}`} />}
    </div>
  );
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

function LineupField({ roster, candidate, candidateReason, onMove, onInspect, onSlotFilter, onClearCandidate, wantSlot = null, draftView = false, highlight, focusLabel, onClearFocus, reserve = 0, overlay = null, fill = false, wide = false, tapRef = null, className = '', locked = false }) {
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [box, setBox] = useState({ w: 0, h: 0 }); // wide: 판 크기 (시너지 · 평균 카드 자리 계산)
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
      if (wide && fitHeight) {
        // 넓힌 사진이 판 높이를 빈틈 없이 채우는 배율 · 가장 왼쪽 토큰이 판 왼쪽 끝에서 14px 에 오도록 왼쪽 정렬(사진 왼쪽 관중석은 판 밖으로)
        const kw = Math.min((h / WIDE_ART.h) * 1.003, Math.max(0.3, (e.contentRect.width - 30 - reserve) / FIELD_SPAN));
        const x = 14 - (SLOT_MIN_X - 107 * TOK_SCALE) * kw;
        const y = Math.min(Math.max((h - FIELD_H * kw) / 2, h - (WIDE_ART.t + WIDE_ART.h) * kw), -WIDE_ART.t * kw);
        setFilling(true); setScale(kw); setOffset({ x, y }); setBox({ w: e.contentRect.width, h });
        return;
      }
      setBox({ w: 0, h: 0 });
      const k = fitHeight ? Math.max(0.3, Math.min(1.3, room / FIELD_W, h / FIELD_H)) : Math.min(1, room / FIELD_W);
      setFilling(fitHeight);
      setScale(k);
      setOffset({ x: Math.max(0, (room - FIELD_W * k) / 2), y: fitHeight ? Math.max(0, (h - FIELD_H * k) / 2) : 0 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [reserve, fill, wide]);

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
  if (tapRef) tapRef.current = tap; // 오른쪽 LINEUP 명단에서 줄을 누르면 필드에서 그 자리를 누른 것과 같게

  // wide(넓은 화면): 구장 오른쪽 끝 토큰 바로 옆부터 시너지, 사진은 시너지 구역에 들어서며 어둠으로 녹아든다
  const dockL = wide && filling && box.w ? Math.round(offset.x + (SLOT_MAX_X + 107 * TOK_SCALE) * scale + 16) : null;
  const wideFade = dockL == null ? null : (() => {
    const imgL = offset.x + WIDE_ART.l * scale, imgW = WIDE_ART.w * scale;
    const pct = (px) => Math.min(100, Math.max(0, ((px - imgL) / imgW) * 100));
    return [pct(dockL + 40), pct(dockL + (box.w - dockL) * 0.8)];
  })();

  return (
    <div ref={wrapRef} className={`relative w-full overflow-hidden bg-[#05080f] ${className}`}
      style={filling ? undefined : { height: FIELD_H * scale }}>
      {/* 구장 둘레: 관중석·조명 야경을 은은하게 깔아 필드가 경기장 안에 있는 느낌을 준다 */}
      <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: 'url(ui/stadium.webp)' }} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_80%_at_45%_62%,transparent_30%,rgba(5,8,15,.85)_100%)]" aria-hidden="true" />
      <div className="lf-field" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
        {wideFade ? <WideFieldArt fade={wideFade} /> : <FieldArt />}
        {FIELD_SLOTS.filter((s) => SLOT_XY[s.id]).map((s) => <SlotToken key={s.id} slot={s} player={playerOf(s)} kind={kindOf(s)} flags={flagsOf(s)} bind={bind(s.id)} boosted={kindOf(s) === 'ghost' ? boostedPreview : boosted}
          swapIn={drag?.from === s.id ? dropPlan?.occ : null} />)}
      </div>
      {overlay && (
        <div className={`syn-dock ${dockL != null ? 'wide' : ''}`} style={dockL != null ? { left: dockL, width: box.w - dockL } : { width: reserve }}>
          {overlay}
          <div className="lf-bn">
            <div className="lf-bn-h"><span>불펜</span><em>BULLPEN</em><small><b>{PEN_SLOTS.filter((b) => at(b.id)).length}</b>/{PEN_SLOTS.length}</small></div>
            <div className="lf-bn-g">
              {PEN_SLOTS.map((b) => <BenchSlot key={b.id} slot={b} player={playerOf(b)} kind={kindOf(b)} flags={flagsOf(b)} bind={bind(b.id)}
                boosted={kindOf(b) === 'ghost' ? boostedPreview : boosted} />)}
            </div>
          </div>
          <div className="lf-bn">
            <div className="lf-bn-h"><span>예비</span><em>BENCH</em><small><b>{BENCH_SLOTS.filter((b) => at(b.id)).length}</b>/{BENCH_SIZE}</small></div>
            <div className="lf-bn-g">
              {BENCH_SLOTS.map((b) => <BenchSlot key={b.id} slot={b} player={playerOf(b)} kind={kindOf(b)} flags={flagsOf(b)} bind={bind(b.id)}
                boosted={kindOf(b) === 'ghost' ? boostedPreview : boosted} />)}
            </div>
          </div>
        </div>
      )}
      {highlight && (
        <button type="button" onClick={onClearFocus}
          className="absolute left-3 top-2 z-10 flex items-center gap-1.5 bg-sky-500/15 px-2 py-1 text-xs font-semibold text-sky-200 shadow-[inset_0_0_0_1px_rgba(56,189,248,.5)] hover:bg-sky-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
          {focusLabel} · {highlight.size}명 <span aria-hidden="true">✕</span>
        </button>
      )}
      {drag && at(drag.from) && (
        <DragGhost player={at(drag.from)} eff={boosted.get(at(drag.from).id) || playAt(at(drag.from))} from={drag.from} delta={dropPlan?.me} x={drag.x} y={drag.y} k={scale * TOK_SCALE}
          to={drag.over && drag.over !== drag.from ? { slot: drag.over, swap: !!at(drag.over) } : null} />
      )}
    </div>
  );
}

/* ───── 드래프트 화면 오른쪽 MY TEAM 판: 탭 [팀 분석 · 선수 기록] ───── */
const TEAM_AXES = [['파워', 'power'], ['컨택', 'contact'], ['주루', 'speed'], ['수비', 'defense'], ['선발', 'sp'], ['불펜', 'pen']];
const STYLE_STRONG = { 파워: '홈런 타선', 컨택: '컨택 타선', 주루: '발 빠른 야구', 수비: '짠물 수비', 선발: '선발 야구', 불펜: '철벽 불펜' };
const STYLE_WEAK = { 파워: '장타 부족', 컨택: '정교함 부족', 주루: '느린 발', 수비: '불안한 수비', 선발: '얇은 선발', 불펜: '불안한 뒷문' };
const meanOf = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const signed = (d) => `${d >= 0 ? '+' : ''}${Math.round(d)}`;
const pitchPower = (p) => p.stats.stuff * 0.4 + p.stats.control * 0.3 + p.stats.stability * 0.3; // buildTeam 의 pitchValue 와 같은 식

/** 팀 지표: 종합 · 투수 · 야수 평균과 레이더 여섯 축 (선 자리 · 시너지 반영) */
function teamMetrics(roster, draftView = false) {
  const on = withSlots(roster).map(playAt);
  const eff = applySynergies(on, visibleSynergies(on, draftView));
  const at = (slot) => eff.find((p) => p.slot === slot);
  const isPitch = (p) => PITCH_SLOTS.includes(p.slot);
  const bats = eff.filter((p) => p.type === 'batter' && !isBenchSlot(p.slot));
  const bat = (k) => meanOf(bats.map((p) => p.stats[k]));
  const pens = RELIEF_SLOTS.map(at).filter(Boolean);
  return {
    team: meanOf(eff.map((p) => p.overall)),
    pitch: meanOf(eff.filter(isPitch).map((p) => p.overall)),
    field: meanOf(eff.filter((p) => !isPitch(p) && !isBenchSlot(p.slot)).map((p) => p.overall)),
    power: bat('power'), contact: bat('contact'), speed: bat('speed'), defense: bat('defense'),
    sp: at('SP') ? pitchPower(at('SP')) : null,
    pen: meanOf(pens.map(pitchPower)),
  };
}
const seededRng = (seed) => () => { // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** 비교 기준: 같은 모드 · 같은 캡으로 AI 가 드래프트한 팀 24개의 평균 (고정 시드라 늘 같은 값, 한 번만 계산) */
const aiBenchCache = new Map();
function aiBenchmark(mode, cap) {
  const key = `${mode.id}:${cap}`;
  if (!aiBenchCache.has(key)) {
    const teams = Array.from({ length: 24 }, (_, i) => teamMetrics(aiDraft({ players: mode.players, cap, rng: seededRng(1000 + i * 7919) })));
    aiBenchCache.set(key, Object.fromEntries(['team', ...TEAM_AXES.map(([, k]) => k)].map((k) => [k, meanOf(teams.map((t) => t[k]).filter((v) => v != null))])));
  }
  return aiBenchCache.get(key);
}

/** 실제 시즌 기록(source 한 줄)에서 표 칸 값. 레전드 카드처럼 기록이 없으면 null */
function seasonRecord(p) {
  if (!p?.source) return null;
  const s = p.source.split('—')[0];
  const g = (re) => (s.match(re) || [])[1];
  return p.type === 'pitcher'
    ? { era: g(/ERA\s?([\d.]+)/), w: g(/(\d+)승/), sv: g(/(\d+)SV/), hld: g(/(\d+)HLD/), k: g(/(\d+)K\b/) }
    : { avg: g(/(\.\d{3})/), hr: g(/(\d+)HR/), sb: g(/(\d+)SB/), rbi: g(/(\d+)타점/) };
}
/** 표 열: 머리 · 보일 값 · 비교용 숫자(열마다 우리 팀 1등을 초록으로, ERA 는 낮을수록) */
const REC_COLS = {
  pitch: [
    { h: 'ERA', show: (r) => r.era, num: (r) => +r.era, low: true },
    { h: '승', show: (r) => r.w, num: (r) => +r.w },
    { h: 'S/H', show: (r) => (r.sv && +r.sv >= +(r.hld || 0) ? `${r.sv}S` : r.hld ? `${r.hld}H` : null), num: (r) => Math.max(+(r.sv || 0), +(r.hld || 0)) || NaN },
    { h: 'K', show: (r) => r.k, num: (r) => +r.k },
  ],
  bat: [
    { h: '타율', show: (r) => r.avg, num: (r) => +r.avg },
    { h: 'HR', show: (r) => r.hr, num: (r) => +r.hr },
    { h: '도루', show: (r) => r.sb, num: (r) => +r.sb },
    { h: '타점', show: (r) => r.rbi, num: (r) => +r.rbi },
  ],
};
/* 예비 자리는 투수·타자가 섞여 서므로 타자 열을 쓰고, 투수가 선 줄은 기록을 비운다 */
REC_COLS.bench = REC_COLS.bat;
const REC_GROUPS = [['pitch', 'PITCHERS', '투수', PITCH_SLOTS], ['bat', 'BATTERS', '타자', ['C', '1B', '2B', '3B', 'SS', 'OF1', 'OF2', 'OF3', 'DH']], ['bench', 'BENCH', '예비', BENCH_SLOTS.map((b) => b.id)]];
const REC_SLOT = { SP: '선발', MR: '중계', CL: '마무리', C: '포수', '1B': '1루', '2B': '2루', '3B': '3루', SS: '유격', OF1: '좌익', OF2: '중견', OF3: '우익', DH: '지명' };

function MyTeamPanel({ roster, mode, cap, selectedSlot, onTap }) {
  const [tab, setTab] = useState('team');
  return (
    <div className="mt-panel">
      <div className="mt-tabs" role="tablist">
        {[['team', '팀 분석'], ['rec', '선수 기록']].map(([k, t]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>
        ))}
      </div>
      <div className="mt-body" role="tabpanel">
        {tab === 'team' ? <TeamReport roster={roster} mode={mode} cap={cap} /> : <RecordCards roster={roster} selectedSlot={selectedSlot} onTap={onTap} />}
      </div>
    </div>
  );
}

/** 숫자 묶음이 바뀌면 그 자리에서 갈아치우지 않고 ms 동안 옛 값에서 새 값으로 미끄러진다. null(값 없음)은 곧바로 바뀐다 */
function useEased(target, ms = 520) {
  const [shown, setShown] = useState(target);
  const cur = useRef(target);
  const raf = useRef(0);
  const keys = Object.keys(target);
  const sig = keys.map((k) => target[k] ?? 'x').join(',');
  useEffect(() => {
    if (document.hidden || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { cur.current = target; setShown(target); return undefined; }
    const from = cur.current;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - (1 - k) ** 3; // 처음 빠르고 끝에서 잦아든다
      const next = {};
      for (const key of keys) {
        const b = target[key];
        const a = from[key];
        next[key] = b == null || a == null ? b : a + (b - a) * e;
      }
      cur.current = next;
      setShown(next);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [sig, ms]); // eslint-disable-line react-hooks/exhaustive-deps
  return shown;
}

function TeamReport({ roster, mode, cap }) {
  const target = useMemo(() => teamMetrics(roster, true), [roster]);
  const me = useEased(target);
  const ai = aiBenchmark(mode, cap);
  const axes = TEAM_AXES.map(([k, key]) => ({ k, m: me[key], a: ai[key], d: me[key] == null ? null : me[key] - ai[key] }));
  const ranked = axes.filter((x) => x.d != null).sort((x, y) => y.d - x.d);
  const fmt1 = (v) => (v == null ? '-' : v.toFixed(1));
  return (
    <div className="mt-team">
      <div className="mt-trio">
        {[['팀 종합', me.team], ['투수', me.pitch], ['야수', me.field]].map(([k, v]) => (
          <div key={k}><small>{k}</small><b className={`font-display tabular-nums ${v != null ? tierOf(v) : ''}`}>{fmt1(v)}</b></div>
        ))}
      </div>
      <div className="mt-radar">
        <TeamRadar axes={axes} />
        <div className="mt-lgd" aria-hidden="true">
          <span><i />우리 팀<b className="font-display tabular-nums">{fmt1(me.team)}</b></span>
          <span><i className="ai" />AI 평균<b className="font-display tabular-nums">{fmt1(ai.team)}</b></span>
        </div>
      </div>
      {ranked.length > 0 && (
        <div className="mt-style"><span className="g">{STYLE_STRONG[ranked[0].k]}</span><i>·</i><span className="o">{STYLE_WEAK[ranked[ranked.length - 1].k]}</span></div>
      )}
      <div className="mt-chips">
        {ranked.map((x) => (
          <span key={x.k} className={x.d >= 0 ? 'up' : 'dn'}>{x.d >= 0 ? '▲' : '▼'} {x.k}<b className="font-display tabular-nums">{signed(x.d)}</b></span>
        ))}
      </div>
    </div>
  );
}

/** 여섯 축 레이더: 초록 면 = 우리 팀, 붉은 점선 = AI 평균. 꼭짓점에 우리 값과 AI 평균과의 차이 */
function TeamRadar({ axes }) {
  const W = 340, H = 294, R = 106, lo = 40, cx = W / 2; // 옆 꼭짓점 글자가 틀 안에 드는 가장 큰 반지름
  const cy = R + 40 + Math.max(0, (H - R - 42 - (R + 40)) / 2); // 위 꼭짓점 이름과 아래 꼭짓점 값이 틀 안에 들도록
  const at = (i, r) => { const a = -Math.PI / 2 + (i * Math.PI * 2) / axes.length; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const rOf = (v) => (R * (Math.max(lo, Math.min(100, v ?? lo)) - lo)) / (100 - lo);
  const pts = (f) => axes.map((_, i) => at(i, f(i)).map((n) => n.toFixed(1)).join(',')).join(' ');
  return (
    <svg className="mt-rd" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={axes.map((x) => `${x.k} ${x.m == null ? '-' : Math.round(x.m)}`).join(', ')}>
      {[0.25, 0.5, 0.75, 1].map((k) => <polygon key={k} points={pts(() => R * k)} fill="none" stroke={`rgba(148,163,184,${k === 1 ? 0.3 : 0.12})`} />)}
      {axes.map((x, i) => { const [ex, ey] = at(i, R); return <line key={x.k} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(148,163,184,.12)" />; })}
      <polygon points={pts((i) => rOf(axes[i].a))} fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4 3" />
      <polygon points={pts((i) => rOf(axes[i].m))} fill="#34d399" fillOpacity=".2" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" />
      {axes.map((x, i) => {
        const [lx, ly] = at(i, R + 24);
        const anchor = Math.abs(lx - cx) < 4 ? 'middle' : lx > cx ? 'start' : 'end';
        const tx = lx + (anchor === 'start' ? -10 : anchor === 'end' ? 10 : 0);
        return (
          <g key={x.k}>
            <text x={tx} y={ly - 4} textAnchor={anchor}>{x.k}</text>
            <text className="v" x={tx} y={ly + 12} textAnchor={anchor}>
              {x.m == null ? '-' : Math.round(x.m)}
              {x.d != null && <tspan className="d" dx="4" fill={x.d >= 0 ? '#34d399' : '#fb923c'}>{signed(x.d)}</tspan>}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function RecordCards({ roster, selectedSlot, onTap }) {
  const placed = withSlots(roster);
  const on = placed.map(playAt);
  const effBySlot = new Map(applySynergies(on, visibleSynergies(on, true)).map((p) => [p.slot, p]));
  return (
    <div className="mt-rec">
      {REC_GROUPS.map(([kind, en, ko, slots]) => {
        const cols = REC_COLS[kind] || [];
        const rows = slots.map((slot) => {
          const player = placed.find((p) => p.slot === slot);
          // 투수 자리에 선 타자(또는 반대)는 표 열과 기록 종류가 달라 기록을 비운다
          const rec = player && (player.type === 'pitcher') === (kind === 'pitch') ? seasonRecord(player) : null;
          return { slot, player, rec };
        });
        const best = cols.map((c) => {
          const vals = rows.filter((x) => x.rec).map((x) => c.num(x.rec)).filter((n) => !Number.isNaN(n));
          return vals.length > 1 ? (c.low ? Math.min(...vals) : Math.max(...vals)) : null;
        });
        return (
          <section key={kind} className={`mt-card ${kind}`} style={{ '--n': slots.length, flexGrow: slots.length + 2 }}>
            <div className="mt-gh"><span className="en font-display">{en}</span><b>{ko}</b><em>{rows.filter((x) => x.player).length}/{slots.length}</em></div>
            <table>
              <colgroup><col style={{ width: 44 }} /><col style={{ width: 36 }} /><col />{cols.map((c) => <col key={c.h} style={{ width: 38 }} />)}<col style={{ width: 30 }} /></colgroup>
              <thead><tr><th className="l">자리</th><th /><th className="l">선수</th>{cols.map((c) => <th key={c.h}>{c.h}</th>)}<th>종합</th></tr></thead>
              <tbody>
                {rows.map(({ slot, player, rec }) => (
                  <RecordRow key={slot} slot={slot} player={player} eff={effBySlot.get(slot)} rec={rec} cols={cols} best={best} on={selectedSlot === slot} onTap={onTap} />
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
function RecordRow({ slot, player, eff, rec, cols, best, on, onTap }) {
  const bust = useBust(player, '260%');
  const tap = () => onTap?.(slot);
  return (
    <tr className={`${player ? '' : 'e'} ${on ? 'on' : ''}`} tabIndex={0} onClick={tap}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } }}>
      <td className="l pos">{REC_SLOT[slot]}</td>
      {player ? (
        <>
          <td className="l"><i className="mt-face" style={bust || undefined} aria-hidden="true" /></td>
          <td className="l"><span className="who"><b>{player.name}</b><small>{player.year} {player.team}</small></span></td>
          {cols.map((c, i) => {
            const v = rec ? c.show(rec) : null;
            return <td key={c.h}><span className={`st font-display tabular-nums ${v == null ? 'none' : best[i] != null && c.num(rec) === best[i] ? 'best' : ''}`}>{v ?? '-'}</span></td>;
          })}
          <td className="ov"><b className={`font-display tabular-nums ${eff ? tierOf(eff.overall) : ''}`}>{eff?.overall}</b></td>
        </>
      ) : (
        <><td /><td className="l" colSpan={cols.length + 2}>비어 있음</td></>
      )}
    </tr>
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
        : <p className="text-xs text-gray-500">완성된 시너지 없음</p>}
    </section>
  );
}

/** 드래프트 중에는 숨기고 드래프트가 끝난 뒤(정비·시즌)에만 보여 주는 시너지 — 최종 엔트리로 정해지는 것 */
const DRAFT_HIDDEN = new Set(['franchise']);

/* ───── 드래프트 시너지 도크 (롤토체스식): 단계 색 정육각 아이콘 · 이름 · 인원, 올리면 말풍선(조건 · 단계 효과 · 선수) ───── */
const SYN_ICON = (id) => `ui/synergy/${id}.png`;
/** 아이콘 테두리 단계: 0 없음 · 1 브론즈 · 2 실버 · 3 골드(최종) · 4 프리즘(3단계 이상 시너지의 최종) */
const synTier = (s) => (!s.level ? 0 : s.level === s.tiers.length ? (s.tiers.length >= 3 ? 4 : 3) : Math.min(s.level, 2));
const synRank = (a, b) => b.active - a.active || synTier(b) - synTier(a) || (b.count > 0) - (a.count > 0) || leftOf(a) - leftOf(b) || fillOf(b) - fillOf(a);
/** 시너지 선수 목록: 라인업 선수 → 고른 후보 → 아직 없는 선수(실화 조합만) 순 */
function synPeople(s, after, candidate) {
  const candKey = candidate && synergyGrows(s, after) ? personKey(candidate) : null;
  const mine = new Map(s.members.map((m) => [personKey(m), m]));
  const rank = { in: 0, cd: 1, out: 2 };
  const people = s.names
    ? s.names.map((k) => ({ key: k, player: mine.get(k) || (k === candKey ? candidate : ALL_PLAYERS.find((p) => personKey(p) === k) || null), st: mine.has(k) ? 'in' : k === candKey ? 'cd' : 'out' }))
    : [...s.members.map((m) => ({ key: m.id, player: m, st: 'in' })), ...(candKey && !mine.has(candKey) ? [{ key: 'cand', player: candidate, st: 'cd' }] : [])];
  return people.sort((a, b) => rank[a.st] - rank[b.st]).map((p) => ({ ...p, name: p.player?.name || p.key.replace(/\(.*\)$/, '') }));
}
const SynIcon = ({ id }) => (
  <span className="sy-ico" aria-hidden="true"><i style={{ WebkitMaskImage: `url(${SYN_ICON(id)})`, maskImage: `url(${SYN_ICON(id)})` }} /></span>
);
function SynFace({ p }) {
  const bust = useBust(p.player, '260%');
  return <span className={`sd-pf ${p.st}`}><i style={bust || undefined} /><small>{p.name}</small></span>;
}
const synCount = (s, after) => (
  <>{s.count}{synergyGrows(s, after) && after.count > s.count && <u>+{after.count - s.count}</u>}<small>/{s.need}</small></>
);

function SynergyDock({ roster, candidate, focusId, onFocus, onOpenAll }) {
  const rootRef = useRef(null);
  const [hover, setHover] = useState(null); // { id, top }
  const after = candidate ? previewSynergies(roster, candidate) : null;
  const list = checkSynergies(roster)
    .filter((s) => !DRAFT_HIDDEN.has(s.id) && (s.cur > 0 || synergyGrows(s, after?.get(s.id))))
    .sort(synRank);
  const show = (id, el) => setHover({ id, top: el.getBoundingClientRect().top - rootRef.current.getBoundingClientRect().top });
  const hv = hover && list.find((s) => s.id === hover.id);
  return (
    <section ref={rootRef} className="sd" onMouseLeave={() => setHover(null)}>
      <div className="sd-hd">
        <span className="sd-lab font-display">SYNERGY</span>
        <em className="font-display tabular-nums">{list.filter((s) => s.active).length}</em>
        <button type="button" onClick={onOpenAll}>전체 보기</button>
      </div>
      <ul className="sd-list syn-scroll">
        {list.map((s) => {
          const a = after?.get(s.id);
          return (
            <li key={s.id}>
              <button type="button" aria-expanded={focusId === s.id}
                className={`sd-row sy${synTier(s)} ${s.active ? 'on' : ''} ${focusId === s.id ? 'fo' : ''} ${hover?.id === s.id ? 'hv' : ''} ${synergyGrows(s, a) ? 'gr' : ''}`}
                onMouseEnter={(e) => show(s.id, e.currentTarget)} onFocus={(e) => show(s.id, e.currentTarget)} onBlur={() => setHover(null)}
                onClick={() => onFocus(s.id)}>
                <SynIcon id={s.id} />
                <span className="sd-tx">
                  <b>{s.name}</b>
                  <span className="sd-stp font-display">{s.tiers.map((t, k) => <React.Fragment key={t.need}>{k > 0 && <i>›</i>}<span className={k < s.level ? 'ok' : ''}>{t.need}</span></React.Fragment>)}</span>
                </span>
                <span className="sd-fr font-display tabular-nums">{synCount(s, a)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {hv && <SynergyTip s={hv} after={after?.get(hv.id)} candidate={candidate} top={hover.top} />}
    </section>
  );
}

export function SynergyTip({ s, after, candidate, top = 0, up = false, left = 0 }) {
  const ref = useRef(null);
  const [y, setY] = useState(Math.max(0, top - 12));
  const [x, setX] = useState(left);
  // 도크 밖으로 넘치면 안쪽으로 붙인다
  useLayoutEffect(() => {
    const el = ref.current; const box = el?.offsetParent;
    if (!el || !box) return;
    if (up) setX(Math.max(6, Math.min(left, box.clientWidth - el.offsetWidth - 6)));
    else setY(Math.max(0, Math.min(top - 12, box.clientHeight - el.offsetHeight - 6)));
  }, [top, left, up, s.id]);
  return (
    <div ref={ref} className={`sd-tip sy${synTier(s)} ${up ? 'up' : ''}`} style={up ? { left: x } : { top: y }} role="tooltip">
      <div className="sd-th"><SynIcon id={s.id} /><b>{s.name}</b></div>
      <p><b>{s.cond}</b><br />{s.kind === 'story' ? '한 라인업에 함께 모이면 이 선수들의 능력치 상승' : '라인업에 많을수록 이 선수들이 강해집니다.'}</p>
      <ul>{s.tiers.map((t, k) => <li key={t.need} className={k < s.level ? 'ok' : k === s.level ? 'nx' : ''}><span className="font-display">({t.need})</span>{t.effect}</li>)}</ul>
      <div className="sd-pfs">{synPeople(s, after, candidate).slice(0, 12).map((p) => <SynFace key={p.key} p={p} />)}</div>
    </div>
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

/** 전체 시너지 창: 도크와 같은 아이콘 · 단계 색, 카드마다 조건 · 단계 칩 · 선수 얼굴. 위에서 [전체 · 켜짐 · 진행 · 없음] 거르기 */
function SynergySheetModal({ roster, candidate, focusId, onFocus, onClose, draft = false }) {
  const [filter, setFilter] = useState('all');
  const after = candidate ? previewSynergies(roster, candidate) : null;
  const all = checkSynergies(roster).filter((s) => !(draft && DRAFT_HIDDEN.has(s.id))).sort(synRank);
  const groups = { all: all, on: all.filter((s) => s.active), go: all.filter((s) => !s.active && s.count > 0), none: all.filter((s) => s.count === 0) };
  const bar = (
    <nav className="ss-flt border-b border-white/10 px-6 pb-3" aria-label="시너지 거르기">
      {[['all', '전체'], ['on', '켜짐'], ['go', '진행'], ['none', '없음']].map(([k, t]) => (
        <button key={k} type="button" className={filter === k ? 'on' : ''} aria-pressed={filter === k} onClick={() => setFilter(k)}>{t}<b className="font-display tabular-nums">{groups[k].length}</b></button>
      ))}
    </nav>
  );
  return (
    <Modal eyebrow="Synergy" title="전체 시너지" onClose={onClose} bar={bar} bodyKey={filter}>
      <div className="ss-list">
        {groups[filter].map((s) => {
          const a = after?.get(s.id);
          const people = synPeople(s, a, candidate);
          return (
            <button key={s.id} type="button" onClick={() => onFocus(s.id)}
              className={`ss-card sy${synTier(s)} ${s.active ? 'on' : ''} ${s.count ? '' : 'zero'} ${focusId === s.id ? 'fo' : ''}`}>
              <SynIcon id={s.id} />
              <span className="ss-body">
                <span className="ss-l1"><b>{s.name}</b><span className="ss-fr font-display tabular-nums">{synCount(s, a)}</span></span>
                <span className="ss-cond">{s.cond}</span>
                <span className="ss-tiers">{s.tiers.map((t, k) => <span key={t.need} className={k < s.level ? 'ok' : k === s.level ? 'nx' : ''}><em className="font-display">{t.need}</em>{t.effect}</span>)}</span>
                {people.length > 0 && (
                  <span className="sd-pfs ss-pfs">
                    {people.slice(0, 9).map((p) => <SynFace key={p.key} p={p} />)}
                    {people.length > 9 && <span className="ss-more font-display">+{people.length - 9}</span>}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {!groups[filter].length && <p className="py-6 text-center text-gray-600">-</p>}
      </div>
    </Modal>
  );
}

function AugmentShelf({ augments, total = SEASON_AUGMENTS }) {
  return (
    <section className="ui-cut ui-frame ui-glass p-3" style={{ '--c': '12px' }}>
      <PanelTitle aside={`${augments.length}/${total}`}>보유 증강</PanelTitle>
      {augments.length === 0 ? (
        <p className="text-xs leading-relaxed text-gray-500">{total ? `정비를 마치고 시즌을 시작하면 증강 ${total}개 고르기` : '증강 없이 치르는 모드'}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {augments.map((a) => (
            <li key={a.id} className="ui-cut bg-white/[0.045] px-2.5 py-2 text-gray-100" style={{ '--c': '7px', boxShadow: `inset 3px 0 0 ${TIER_NEON[a.tier]}` }}>
              <span className="text-sm font-bold">{a.name}{a.lv ? <b className="ml-1 font-display" style={{ color: TIER_NEON[a.tier] }}>+{a.lv}</b> : null}</span>
              <p className="mt-0.5 text-xs text-gray-400">{augDescAt(a)}</p>
              {a.cond && <p className="text-[11px] text-gray-500">조건 · {a.cond}</p>}
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
        <h3 className="text-[1.7rem] font-black leading-tight text-white" style={{ textShadow: `0 0 24px ${acc}88, 0 2px 8px #000`, textWrap: 'balance' }}>
          {o.name}{o.lv ? <b className="ml-1.5 font-display" style={{ color: acc }}>+{o.lv}</b> : null}
        </h3>
        <p className="mt-2 min-h-[2.75rem] text-sm leading-relaxed text-gray-200 [text-shadow:0_1px_4px_#000]">{augDescAt(o)}</p>
        <p className="mt-3 border-t pt-2.5 text-xs font-semibold" style={{ borderColor: `${acc}55`, color: acc }}>{o.cond ? `조건 · ${o.cond}` : AUG_TYPE[o.type] || ''}</p>
        <button type="button" onClick={() => onChoose(o)} className="ui-btn ui-cut mt-3 w-full">선택</button>
      </div>
    </section>
  );
}

function ChoiceOverlay({ choice, onChoose, picksLeft = 0, total = SEASON_AUGMENTS, rerolls = 0, onReroll = null }) {
  const free = choice?.free || 0; // 거저 주는 다시 굴리기
  if (!choice) return null;
  const isAug = choice.kind === 'augment';
  const nth = total - picksLeft + 1;
  const tier = isAug && choice.options[0]?.tier;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label={isAug ? '증강 선택' : '시즌 돌발 이벤트'}>
      <div className="ui-bg" style={{ backgroundImage: `url(ui/${isAug ? 'field' : 'tunnel'}.webp)` }} />
      <div className="fixed inset-0 bg-[#03050a]/70 backdrop-blur-[3px]" />
      <div className="relative flex min-h-full flex-col items-center justify-center gap-8 px-4 py-10">
        <div className="text-center animate-[rise_.4s_ease-out_both]">
          <p className="ui-lab font-display" style={{ '--a': '#e879f9' }}>{isAug ? 'Season Augment' : 'Season Event'}</p>
          <h2 className="mt-2 text-4xl font-black text-white">
            {isAug ? (choice.inning ? `${choice.inning}회 증강 고르기` : '시즌 증강 고르기') : '시즌 돌발 이벤트'}
            {isAug && !choice.inning && picksLeft > 0 && total > 1 && <span className="ml-3 font-display font-extrabold text-fuchsia-400">{nth} / {total}</span>}
            {tier && <span className="ml-3 font-display font-extrabold" style={{ color: TIER_NEON[tier] }}>{TIER_EN[tier]}</span>}
          </h2>
          {!isAug && <p className="mt-2 text-sm text-gray-400">구단 운영 방향 고르기 · 되돌리기 없음</p>}
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          {choice.options.map((o, i) => <ChoiceCard key={o.id} option={o} index={i} onChoose={onChoose} />)}
        </div>
        {isAug && onReroll && (free > 0 || rerolls > 0) && (
          <button type="button" onClick={onReroll} className="ui-btn ui-cut animate-[rise_.4s_ease-out_both]" style={{ '--c': '9px' }}>
            ↺ 다시 굴리기
            <em className="ml-1.5 font-display not-italic text-fuchsia-300">
              {free > 0 ? '· 이번 한 번은 거저' : `· 리롤권 ${rerolls}장`}
            </em>
          </button>
        )}
      </div>
    </div>
  );
}

/* ───── 승부처 개입 창 (1단계 임시: 결과를 직접 고른다. 2·3단계에서 스페이스 키 미니게임으로 바뀐다) ───── */
/* 찬스 타격 미니게임: 3구 삼진 전에 공이 존에 닿는 순간 스페이스.
   판정 폭은 타자 컨택·파워, 공 속도는 투수 구위가 정한다. 링은 정직하고 공은 구종마다 속인다 */
const PITCH_TYPES = [
  { id: 'fast', name: '직구', key: 'q', desc: '빠르고 곧다', color: '#e5e7eb', cells: [0, 1, 2, 4], dur: 620, ease: (p) => p },
  { id: 'slider', name: '슬라이더', key: 'w', desc: '바깥으로 휜다', color: '#7dd3fc', cells: [5, 8, 7], dur: 740, ease: (p) => Math.sqrt(p) * 0.6 + p * 0.4, curve: 1 }, // 빨리 오다 휘며 늦게 닿는다
  { id: 'change', name: '체인지업', key: 'e', desc: '느리게 떨어진다', color: '#c4b5fd', cells: [6, 7, 8], dur: 860, ease: (p) => p * p * 0.55 + p * 0.45 }, // 느리게 오다 막판에 들어온다
];
/** 투수의 구종 비율: 구위가 좋을수록 직구가 많다 (노림수 카드에 그대로 보여 주고, 실제 투구도 이 비율로 뽑는다) */
export function pitchMix(pitcher) {
  const fast = Math.max(0.3, Math.min(0.65, 0.4 + ((pitcher?.stats?.stuff ?? 80) - 80) * 0.015));
  return { fast, slider: (1 - fast) * 0.6, change: (1 - fast) * 0.4 };
}
const PITCH_ICON = {
  fast: <><circle cx="40" cy="32" r="11" fill="currentColor" /><path d="M6 32H24M8 25H20M8 39H20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".45" /></>,
  slider: <><path d="M8 12Q44 16 50 48" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="4 4" /><circle cx="50" cy="48" r="8" fill="currentColor" /></>,
  change: <><path d="M10 14Q34 12 38 48" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="2 6" /><circle cx="38" cy="48" r="8" fill="currentColor" /></>,
};
const BALL_R = 24; // 공 요소 반지름(px, scale 1 기준)
const RING_R0 = 110; // 링 시작 반지름(px)
const RING_SPEED = 0.153; // 링이 좁아지는 속도(px/ms) — 직구면 공이 존의 90% 지점일 때 접한다
/** 맞힌 타구의 결과. 잘 칠수록(PERFECT)·컨택이 높을수록 아웃이 줄고, 파워가 높을수록 장타가 는다 */
export function rollContact(quality, batter, rng = Math.random, shift = 0) {
  const s = batter?.stats || {};
  const contact = s.contact ?? 70;
  const power = s.power ?? 70;
  const perfect = quality === 'perfect';
  const out = Math.max(0.03, (perfect ? Math.max(0.05, 0.4 - (contact - 60) * 0.012) : Math.max(0.25, 0.68 - (contact - 60) * 0.013)) + shift);
  const hr = perfect ? Math.max(0.05, 0.12 + (power - 60) * 0.013) : Math.max(0, (power - 78) * 0.006);
  const dbl = perfect ? 0.3 : 0.18;
  const r = rng();
  if (r < out) {
    return rng() < 0.5 + (power - 70) * 0.01
      ? { grade: 'out', label: 'FLY OUT', tone: '#f87171', sub: perfect ? '잘 맞았는데 펜스 앞에서 잡혔다' : '높이 떴지만 외야 뜬공' }
      : { grade: 'out', label: 'GROUND OUT', tone: '#f87171', sub: perfect ? '총알 타구가 내야수 정면으로' : '땅볼, 1루에서 아웃' };
  }
  const h = (r - out) / (1 - out);
  if (h < hr) return { grade: 'hr', label: 'HOME RUN!', tone: '#fde047', sub: '담장 너머로!' };
  if (h < hr + dbl) return { grade: 'double', label: '2루타', tone: '#34d399', sub: '외야 틈을 가르는 장타' };
  return { grade: 'single', label: '안타', tone: '#34d399', sub: '깔끔한 적시타' };
}

export function battingWindows(batter, pitch = 86) {
  const s = batter?.stats || {};
  const perfect = Math.max(22, Math.min(70, 34 + ((s.contact || 70) - 75) * 0.9 + ((s.power || 70) - 75) * 0.5));
  return { perfect, good: perfect * 2.6, speed: Math.max(0.8, Math.min(1.25, 1 + (pitch - 86) * 0.015)) };
}

/** 작은 3×3 존: 노린 칸(하늘색 테두리)과 방금 공이 들어온 칸(흰 점) */
function MiniZone({ guess, last }) {
  return (
    <span className="grid h-10 w-9 grid-cols-3 grid-rows-3 border border-white/50">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="relative grid place-items-center border border-white/10" style={i === guess ? { boxShadow: 'inset 0 0 0 1.5px #7dd3fc', background: 'rgba(125,211,252,.2)' } : undefined}>
          {i === last && <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />}
        </span>
      ))}
    </span>
  );
}

/* 타석 준비(노림수): 왼쪽 구종 카드 3장(키 · 궤적 · 이 투수의 비율), 오른쪽 존 판(구종별 코스 경향 점 · 노림 칸) */
function BattingPrep({ mix, guess, setGuess, pitcher }) {
  const typeOn = PITCH_TYPES.find((t) => t.id === guess.type);
  const cellName = guess.cell == null ? null : `${['높은', '가운데', '낮은'][Math.floor(guess.cell / 3)]} ${['몸쪽', '한가운데', '바깥쪽'][guess.cell % 3]}`;
  return (
    <div className="flex w-full max-w-4xl flex-wrap items-start justify-center gap-10">
      <div>
        <p className="font-display text-xs tracking-[0.3em] text-gray-400">① 구종 노리기 <span className="text-gray-600">Q · W · E</span></p>
        <div className="mt-6 flex gap-3">
          {PITCH_TYPES.map((t) => {
            const on = guess.type === t.id;
            const pct = Math.round(mix[t.id] * 100);
            return (
              <button key={t.id} type="button" onClick={() => setGuess((g) => ({ ...g, type: on ? null : t.id }))}
                className="ui-cut relative flex h-[12.5rem] w-[9.5rem] flex-col p-3 text-left transition-transform"
                style={{ '--c': '14px', transform: on ? 'translateY(-10px)' : undefined, background: on ? `linear-gradient(180deg, color-mix(in srgb, ${t.color} 26%, #0b1220), rgba(5,8,15,.95))` : 'linear-gradient(180deg, rgba(17,24,39,.9), rgba(5,8,15,.95))', boxShadow: on ? `inset 0 0 0 2px ${t.color}` : 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
                {on && <span className="absolute left-3 top-3 px-1.5 font-display text-[11px] font-extrabold tracking-[0.2em] text-[#05080f]" style={{ background: t.color }}>노림</span>}
                <span className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center font-display text-sm font-extrabold text-[#05080f]" style={{ background: on ? t.color : '#e5e7eb' }}>{t.key.toUpperCase()}</span>
                <svg viewBox="0 0 64 64" className="mb-1.5 mt-7 h-14 w-14" style={{ color: t.color }}>{PITCH_ICON[t.id]}</svg>
                <b className="text-lg text-white">{t.name}</b>
                <small className="text-xs text-gray-400">{t.desc}</small>
                <span className="mt-auto flex items-end justify-between"><small className="text-[11px] text-gray-500">{pitcher?.name}</small><b className="font-display text-3xl leading-none" style={{ color: on ? t.color : '#fff' }}>{pct}%</b></span>
                <span className="mt-1.5 h-1 bg-white/10"><span className="block h-full" style={{ width: `${pct}%`, background: t.color }} /></span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <p className="bg-emerald-400/10 px-3 py-2 shadow-[inset_3px_0_0_#34d399]"><span className="font-display text-[11px] tracking-[0.3em] text-emerald-400">맞히면</span><b className="block text-white">PERFECT 폭 ×1.5</b></p>
          <p className="bg-red-400/10 px-3 py-2 shadow-[inset_3px_0_0_#f87171]"><span className="font-display text-[11px] tracking-[0.3em] text-red-400">틀리면</span><b className="block text-white">PERFECT 폭 ×0.6</b></p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <p className="font-display text-xs tracking-[0.3em] text-gray-400">② 코스 노리기 <span className="text-gray-600">방향키 · 선택</span></p>
        <div className="relative mt-6 grid h-[16.5rem] w-[14rem] grid-cols-3 grid-rows-3 border-2 border-white/70 bg-white/[0.04]">
          {Array.from({ length: 9 }, (_, i) => {
            const on = guess.cell === i;
            return (
              <button key={i} type="button" onClick={() => setGuess((g) => ({ ...g, cell: on ? null : i }))} className="relative border border-white/15"
                style={on ? { background: 'rgba(125,211,252,.22)', boxShadow: 'inset 0 0 0 2px #7dd3fc, inset 0 0 22px rgba(125,211,252,.45)' } : undefined}>
                {/* 구종별 코스 경향 점 */}
                <span className="absolute inset-0 flex flex-wrap content-center justify-center gap-1">
                  {PITCH_TYPES.filter((t) => t.cells.includes(i)).map((t) => (
                    <span key={t.id} className="rounded-full" style={{ width: 6 + mix[t.id] * 12, height: 6 + mix[t.id] * 12, background: t.color, opacity: !typeOn || typeOn.id === t.id ? 0.9 : 0.2 }} />
                  ))}
                </span>
                {on && <span className="absolute bottom-1 right-1 px-1.5 font-display text-[10px] font-extrabold tracking-[0.2em] text-[#05080f] bg-sky-300">노림</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">점 = 구종별로 자주 들어오는 코스 · 노린 칸으로 오면 맞혔을 때 아웃 확률 −12%p</p>
        <p className="mt-4 font-display text-lg text-white">노림수 <b style={{ color: typeOn?.color || '#9ca3af' }}>{typeOn?.name || '구종 없음'}</b>{cellName && <> · <b className="text-sky-300">{cellName}</b></>}</p>
      </div>
    </div>
  );
}

function ClutchBatting({ clutch, onPick }) {
  const { batter, pitcher, score, inning } = clutch;
  const win = useMemo(() => battingWindows(batter, clutch.pitch), [batter, clutch.pitch]);
  const [strikes, setStrikes] = useState(0);
  const [phase, setPhase] = useState('ready'); // ready → windup → flight → judged → done
  const [flash, setFlash] = useState(null); // { label, tone, sub }
  const [pitchType, setPitchType] = useState(null);
  const [guess, setGuess] = useState({ type: null, cell: null }); // 노림수: 구종(Q·W·E) · 코스(방향키, 3×3 칸)
  const [lastCell, setLastCell] = useState(null); // 방금 공이 들어온 칸
  const mix = useMemo(() => pitchMix(pitcher), [pitcher]);
  const ballRef = useRef(null);
  const ringRef = useRef(null);
  const st = useRef({ t0: 0, dur: 0, type: null, swung: false, raf: 0, timers: [] });
  const strikesRef = useRef(0);
  const doneRef = useRef(false);

  const later = (fn, ms) => st.current.timers.push(setTimeout(fn, ms));
  useEffect(() => () => { cancelAnimationFrame(st.current.raf); st.current.timers.forEach(clearTimeout); }, []);

  const finish = (grade) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('done');
    later(() => onPick(grade), grade === 'miss' ? 1100 : 1500);
  };

  const nextPitch = () => {
    setFlash(null);
    setPhase('windup');
    const roll = Math.random();
    const type = roll < mix.fast ? PITCH_TYPES[0] : roll < mix.fast + mix.slider ? PITCH_TYPES[1] : PITCH_TYPES[2];
    const cell = type.cells[Math.floor(Math.random() * type.cells.length)];
    // 노린 구종이 오면 판정 폭 ×1.5, 틀리면 ×0.6 · 노린 칸으로 오면 맞혔을 때 아웃 확률 −12%p
    const k = guess.type ? (guess.type === type.id ? 1.5 : 0.6) : 1;
    st.current.perfect = win.perfect * k;
    st.current.good = win.good * k;
    st.current.guessHit = guess.type === type.id;
    st.current.cellHit = guess.cell === cell;
    st.current.cell = cell;
    later(() => {
      const dur = type.dur / win.speed;
      // 링은 공을 따라다니며 일정한 속도로 좁아지고, 공은 구종마다 다르게 커진다 → 링이 공에 접하는 순간이 PERFECT
      const v = RING_SPEED * win.speed;
      const ballR = (t) => BALL_R * (0.18 + 0.95 * type.ease(Math.min(1, t / dur)));
      let target = dur;
      for (let t = 0; t < dur * 1.15; t += 1) if (RING_R0 - v * t <= ballR(t)) { target = t; break; }
      st.current = { ...st.current, t0: performance.now(), dur: target, type, swung: false };
      setPitchType(type);
      setPhase('flight');
      const tick = (now) => {
        const t = now - st.current.t0;
        const p = Math.min(1.15, t / dur);
        const e = p <= 1 ? type.ease(p) : p;
        const x = type.curve ? Math.sin(Math.min(1, p) * Math.PI) * 38 * (1 - p * 0.3) : 0;
        const y = -150 + e * 150;
        if (ballRef.current) {
          ballRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${0.18 + e * 0.95})`;
          ballRef.current.style.opacity = p > 1.08 ? '0' : '1';
        }
        if (ringRef.current) {
          const r = Math.max(0, RING_R0 - v * t);
          ringRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${r / 60})`;
          ringRef.current.style.opacity = t > target + st.current.good ? '0' : String(Math.min(1, 0.35 + t / target * 0.65));
        }
        if (!st.current.swung && t > target + st.current.good) { judge(null); return; }
        if (p < 1.15) st.current.raf = requestAnimationFrame(tick);
      };
      st.current.raf = requestAnimationFrame(tick);
    }, 650 + Math.random() * 900); // 와인드업 길이를 흔들어 박자로 못 치게
  };

  const judge = (err) => {
    st.current.swung = true;
    setPhase('judged');
    setLastCell(st.current.cell);
    const abs = err == null ? Infinity : Math.abs(err);
    const wP = st.current.perfect ?? win.perfect;
    const wG = st.current.good ?? win.good;
    // 맞힘(PERFECT 또는 살짝 빠른 GOOD): 타이밍 판정을 먼저 보여 주고, 타구 결과(선수 능력치 + 난수)를 이어서 공개
    if (abs <= wP || (err < 0 && abs <= wG)) {
      const quality = abs <= wP ? 'perfect' : 'good';
      const hit = rollContact(quality, batter, Math.random, st.current.cellHit ? -0.12 : 0);
      const read = st.current.guessHit ? ' · 노림수 적중' : '';
      setFlash(quality === 'perfect' ? { label: 'PERFECT', tone: '#fde047', sub: `제대로 걸렸다!${read}` } : { label: 'GOOD', tone: '#34d399', sub: `살짝 빨랐다…${read}` });
      later(() => setFlash(hit), 700);
      later(() => finish(hit.grade), 700);
      return;
    }
    // 링이 공보다 조금 좁을 때(살짝 늦음): 파울 — 2스트라이크면 카운트 유지
    if (err > 0 && abs <= wG) {
      const f = Math.min(2, strikesRef.current + 1);
      strikesRef.current = f;
      setStrikes(f);
      setFlash({ label: 'FOUL', tone: '#fbbf24', sub: `${Math.round(err)}ms 늦어 뒤로 튀었다` });
      later(nextPitch, 1000);
      return;
    }
    const k = strikesRef.current + 1;
    strikesRef.current = k;
    setStrikes(k);
    const sub = err == null ? '루킹 스트라이크' : err <= -999 ? '공이 오기도 전에 휘둘렀다' : err < 0 ?`헛스윙 · ${Math.round(-err)}ms 빨랐다` : `헛스윙 · ${Math.round(err)}ms 늦었다`;
    setFlash({ label: k >= 3 ? 'STRIKE OUT' : 'STRIKE', tone: '#f87171', sub });
    if (k >= 3) finish('miss');
    else later(nextPitch, 1000);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (phase === 'ready' || phase === 'judged') { // 투구 사이에도 노림수를 바꿀 수 있다
        const t = PITCH_TYPES.find((x) => x.key === e.key.toLowerCase());
        if (t) { setGuess((g) => ({ ...g, type: g.type === t.id ? null : t.id })); return; }
        const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[e.key];
        if (mv) {
          e.preventDefault();
          setGuess((g) => {
            if (g.cell == null) return { ...g, cell: 4 };
            const col = g.cell % 3;
            if ((mv === -1 && col === 0) || (mv === 1 && col === 2)) return g;
            const n = g.cell + mv;
            return n < 0 || n > 8 ? g : { ...g, cell: n };
          });
          return;
        }
        if (e.key === 'Backspace') { setGuess((g) => ({ ...g, cell: null })); return; }
      }
      if (e.code !== 'Space' && e.key !== ' ') return;
      e.preventDefault();
      if (e.repeat) return;
      if (phase === 'ready') { nextPitch(); return; }
      if (phase === 'windup') { st.current.timers.forEach(clearTimeout); st.current.timers = []; judge(-999); return; } // 공도 안 왔는데 휘두름
      if (phase === 'flight' && !st.current.swung) { cancelAnimationFrame(st.current.raf); judge(performance.now() - st.current.t0 - st.current.dur); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const s = batter?.stats || {};
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#03050a]/85 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-label="승부처 개입">
      <style>{`
        @keyframes clutchPulse { 0%,100% { box-shadow: inset 0 0 80px rgba(16,185,129,.18); } 50% { box-shadow: inset 0 0 160px rgba(16,185,129,.42); } }
        @keyframes clutchPop { 0% { transform: scale(2.2); opacity: 0; } 60% { transform: scale(.92); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes clutchShake { 0%,100% { transform: translate(0,0); } 20% { transform: translate(-8px,4px); } 40% { transform: translate(7px,-5px); } 60% { transform: translate(-5px,-3px); } 80% { transform: translate(4px,5px); } }
        @keyframes clutchFlash { 0% { opacity: .85; } 100% { opacity: 0; } }
      `}</style>
      <div className="fixed inset-0 bg-cover bg-[50%_35%]" style={{ backgroundImage: 'url(ui/clutch-bat.webp)', filter: phase === 'ready' ? 'brightness(.5) saturate(.8)' : 'brightness(.3)' }} />
      <div className="fixed inset-0" style={{ animation: 'clutchPulse 1.1s ease-in-out infinite' }} />
      {flash?.label === 'PERFECT' && <div className="pointer-events-none absolute inset-0 bg-yellow-100" style={{ animation: 'clutchFlash .5s ease-out forwards' }} />}
      <div className="relative flex min-h-full flex-col items-center justify-center gap-5 px-4 py-6" style={flash?.label === 'PERFECT' ? { animation: 'clutchShake .45s' } : undefined}>
        <div className="text-center">
          <p className="ui-lab font-display" style={{ '--a': '#10b981' }}>Clutch Chance · {inning}회말</p>
          <p className="mt-1 font-display text-2xl tabular-nums text-gray-300">나 {score.my} : {score.opp} 상대</p>
          <h2 className="mt-1 text-3xl font-black text-white">{batter?.name || '타자'} <span className="text-lg font-bold text-gray-400">vs {pitcher?.name || '투수'}</span></h2>
          <p className="mt-1 text-xs text-gray-400">컨택 {s.contact ?? '-'} · 파워 {s.power ?? '-'} · PERFECT ±{Math.round(win.perfect)}ms</p>
        </div>

        {phase === 'ready' ? <BattingPrep mix={mix} guess={guess} setGuess={setGuess} pitcher={pitcher} /> : (<div className="flex flex-col items-center gap-5">
        <div className="relative h-[20rem] w-[18rem]">
          <div className="absolute left-1/2 top-[8%] h-3 w-10 -translate-x-1/2 rounded-full bg-amber-900/60" />
          <div className="absolute left-1/2 top-[62%] h-[7.5rem] w-[6.5rem] -translate-x-1/2 -translate-y-1/2 border-2 border-white/40 bg-white/[0.03]" />
          <div ref={ringRef} className="absolute left-1/2 top-[62%] h-[7.5rem] w-[7.5rem] rounded-full border-4 border-emerald-400" style={{ opacity: 0, transform: 'translate(-50%,-50%) scale(3)' }} />
          <div ref={ballRef} className="absolute left-1/2 top-[62%] h-12 w-12 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,.8)]"
            style={{ opacity: phase === 'flight' ? 1 : 0, transform: 'translate(-50%, calc(-50% - 150px)) scale(.18)' }}>
            <span className="absolute inset-[18%] rounded-full border-2 border-dashed border-red-500/70" />
          </div>
          {flash && (
            <div className="absolute inset-x-0 top-[40%] text-center" key={`${flash.label}${strikes}`} style={{ animation: 'clutchPop .35s ease-out both' }}>
              <b className="font-display text-5xl font-black" style={{ color: flash.tone, textShadow: `0 0 24px ${flash.tone}` }}>{flash.label}</b>
              <p className="mt-1 text-sm font-semibold text-white [text-shadow:0_1px_4px_#000]">{flash.sub}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="font-display text-sm tracking-widest text-gray-400">STRIKE</span>
          {[0, 1, 2].map((i) => <span key={i} className={`h-4 w-4 rounded-full ${i < strikes ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-white/15'}`} />)}
          {pitchType && phase !== 'ready' && <span className="ml-3 text-sm text-gray-400">{phase === 'windup' ? '와인드업…' : pitchType.name}</span>}
          <MiniZone guess={guess.cell} last={phase === 'judged' || phase === 'done' ? lastCell : null} />
          <span className="text-sm text-gray-400">노림 <b style={{ color: PITCH_TYPES.find((t) => t.id === guess.type)?.color || '#9ca3af' }}>{PITCH_TYPES.find((t) => t.id === guess.type)?.name || '없음'}</b></span>
        </div>
        </div>)}
        <p className="h-6 text-base font-bold text-emerald-300">
          {phase === 'ready' ? '[Q·W·E] 구종 노리기 · [←↑↓→] 코스 노리기 · [SPACE] 타석에 들어서기' : phase === 'windup' ? '기다려…' : phase === 'flight' ? '링이 공에 딱 붙는 순간 [SPACE]!' : ''}
        </p>
      </div>
    </div>
  );
}

/* 위기 투구판: 1·2·3 구종 → 방향키로 5×5 판에 공 놓기 → SPACE 게이지 출발 → 가운데에서 SPACE.
   판 가운데 3×3 이 스트라이크 존, 바깥 칸은 유인구. 칸마다 상대 타자의 강·약(타율)이 보이고 구종마다 추천 칸이 있다.
   노란 칸 너비는 내 투수 제구·안정(추천 칸이면 넓어짐), 게이지 속도는 상대 컨택. 3S 삼진 · 4B 볼넷 · 맞으면 구위·파워·칸 타율로 결과 */
const PITCH_COURSES = [
  { id: 'in', name: '몸쪽 하이 직구', short: '직구', rec: [6, 7, 11], width: 0.8, outBonus: 0.08 },
  { id: 'out', name: '바깥쪽 슬라이더', short: '슬라이더', rec: [18, 19, 23], width: 1, outBonus: 0.04 },
  { id: 'low', name: '낮은 체인지업', short: '체인지업', rec: [17, 21, 22], width: 1.2, outBonus: -0.02 },
];
const inZone = (i) => { const r = Math.floor(i / 5); const c = i % 5; return r >= 1 && r <= 3 && c >= 1 && c <= 3; };
const hashStr = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
/** 타자의 5×5 칸별 타율(추정). 컨택이 전체 높이를, 파워가 몸쪽 높은 쪽 강세를 정하고 이름으로 고정된 흔들림을 준다. 바깥 칸(유인구)은 null */
export function batterHeatmap(batter) {
  const s = batter?.stats || {};
  const base = 0.2 + ((s.contact ?? 70) - 60) * 0.004;
  const pw = ((s.power ?? 70) - 70) * 0.003;
  let h = hashStr(batter?.name || 'x');
  return Array.from({ length: 25 }, (_, i) => {
    if (!inZone(i)) return null;
    const r = Math.floor(i / 5) - 1; // 0 위 ~ 2 아래
    const c = (i % 5) - 1; // 0 몸쪽 ~ 2 바깥
    h = Math.imul(h ^ (h >>> 13), 1103515245) >>> 0;
    const noise = ((h % 1000) / 1000 - 0.5) * 0.06;
    return Math.max(0.08, Math.min(0.45, base + pw * (2 - r - c) + (1 - r) * 0.015 + noise));
  });
}
export function pitchingWindows(pitcher, batter) {
  const p = pitcher?.stats || {};
  const b = batter?.stats || {};
  const perfect = Math.max(0.05, Math.min(0.16, 0.09 + ((p.control ?? 75) - 80) * 0.003 + ((p.stability ?? 75) - 80) * 0.0015));
  return { perfect, good: perfect * 2.4, ball: 0.62, period: Math.max(700, Math.min(1400, 1100 - ((b.contact ?? 70) - 70) * 12)) };
}
/** 상대가 맞힌 타구. quality: 'good'(결정구가 조금 빗나감) | 'bad'(한가운데 실투). shift: 아웃 확률 보정(구종·칸 타율) */
export function rollPitchContact(quality, pitcher, batter, shift = 0, rng = Math.random) {
  const p = pitcher?.stats || {};
  const b = batter?.stats || {};
  const base = quality === 'good' ? 0.66 : 0.34;
  const out = Math.max(0.12, Math.min(0.9, base + ((p.stuff ?? 80) - 80) * 0.01 - ((b.contact ?? 70) - 75) * 0.008 + shift));
  if (rng() < out) {
    return rng() < 0.5
      ? { grade: 'out', label: 'FLY OUT', tone: '#34d399', sub: '높이 뜬 공, 외야수가 잡았다' }
      : { grade: 'out', label: 'GROUND OUT', tone: '#34d399', sub: '빗맞은 땅볼, 1루에서 아웃' };
  }
  const hr = Math.max(0.03, ((b.power ?? 70) - 60) * 0.012) * (quality === 'bad' ? 1.6 : 0.6);
  const h = rng();
  if (h < hr) return { grade: 'hr', label: 'HOME RUN', tone: '#f87171', sub: '실투가 담장 밖으로…' };
  if (h < hr + 0.28) return { grade: 'double', label: '2루타 허용', tone: '#f87171', sub: '외야 틈을 갈랐다' };
  return { grade: 'single', label: '안타 허용', tone: '#fbbf24', sub: '내야를 빠져나갔다' };
}
const cellShift = (heat, i, course) => course.outBonus + (heat[i] == null ? 0 : (0.27 - heat[i]) * 1.6);

function ClutchPitching({ clutch, onPick }) {
  const { batter, pitcher, score, inning } = clutch;
  const win = useMemo(() => pitchingWindows(pitcher, batter), [pitcher, batter]);
  const heat = useMemo(() => batterHeatmap(batter), [batter]);
  const [course, setCourse] = useState(1);
  const [cell, setCell] = useState(18);
  const [count, setCount] = useState({ b: 0, s: 0 });
  const [phase, setPhase] = useState('aim'); // aim → gauge → judged → done
  const [flash, setFlash] = useState(null);
  const [stopAt, setStopAt] = useState(null);
  const markerRef = useRef(null);
  const st = useRef({ t0: 0, raf: 0, timers: [] });
  const countRef = useRef({ b: 0, s: 0 });
  const doneRef = useRef(false);
  const later = (fn, ms) => st.current.timers.push(setTimeout(fn, ms));
  useEffect(() => () => { cancelAnimationFrame(st.current.raf); st.current.timers.forEach(clearTimeout); }, []);

  const c = PITCH_COURSES[course];
  const isRec = c.rec.includes(cell);
  const perfectW = win.perfect * c.width * (isRec ? 1.3 : 1);
  const goodW = win.good * c.width * (isRec ? 1.3 : 1);
  const shift = cellShift(heat, cell, c);
  const chase = Math.max(0.15, Math.min(0.7, 0.5 - ((batter?.stats?.contact ?? 70) - 70) * 0.012 + (isRec ? 0.1 : 0)));
  // 이 자리에 GOOD 로 들어갔을 때 기준 예상치(판에 보여 주는 숫자)
  const oddsOut = inZone(cell)
    ? Math.round(Math.max(0.12, Math.min(0.9, 0.66 + ((pitcher?.stats?.stuff ?? 80) - 80) * 0.01 - ((batter?.stats?.contact ?? 70) - 75) * 0.008 + shift)) * 100)
    : Math.round(chase * 100);
  const oddsXbh = inZone(cell) ? Math.round((1 - oddsOut / 100) * (Math.max(0.03, ((batter?.stats?.power ?? 70) - 60) * 0.012) * 0.6 + 0.28) * 100) : 0;

  const posAt = (t) => { const x = (t / win.period) % 2; return x < 1 ? -1 + 2 * x : 3 - 2 * x; }; // 시간만으로 −1~1 핑퐁

  const finish = (grade) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('done');
    later(() => onPick(grade), 1500);
  };
  const setC = (n) => { countRef.current = n; setCount(n); };
  const again = () => later(() => { setFlash(null); setStopAt(null); setPhase('aim'); }, 1000);
  const contact = (quality, lead) => {
    const hit = rollPitchContact(quality, pitcher, batter, quality === 'good' ? shift : c.outBonus);
    setFlash(lead);
    later(() => setFlash(hit), 700);
    later(() => finish(hit.grade), 700);
  };
  const strike = (sub) => {
    const n = { ...countRef.current, s: countRef.current.s + 1 };
    setC(n);
    if (n.s >= 3) { setFlash({ label: 'STRIKE OUT!', tone: '#fde047', sub: `${c.short}에 헛스윙 삼진` }); finish('k'); return; }
    setFlash({ label: 'STRIKE', tone: '#fde047', sub });
    again();
  };
  const ball = (sub) => {
    const n = { ...countRef.current, b: countRef.current.b + 1 };
    setC(n);
    if (n.b >= 4) { setFlash({ label: '볼넷', tone: '#f87171', sub: '밀어내기 위기…' }); finish('walk'); return; }
    setFlash({ label: 'BALL', tone: '#94a3b8', sub });
    again();
  };

  const start = () => {
    setFlash(null);
    setStopAt(null);
    setPhase('gauge');
    st.current.t0 = performance.now();
    const tick = (now) => {
      if (markerRef.current) markerRef.current.style.left = `${50 + posAt(now - st.current.t0) * 50}%`;
      st.current.raf = requestAnimationFrame(tick);
    };
    st.current.raf = requestAnimationFrame(tick);
  };

  const judge = () => {
    cancelAnimationFrame(st.current.raf);
    const pos = posAt(performance.now() - st.current.t0);
    setStopAt(pos);
    setPhase('judged');
    const d = Math.abs(pos);
    if (d > win.ball) { ball('손에서 빠졌다'); return; }
    if (d > goodW) { contact('bad', { label: '실투', tone: '#f87171', sub: '공이 한가운데로 몰렸다!' }); return; }
    const perfect = d <= perfectW;
    if (!inZone(cell)) { // 유인구: 잘 던질수록 속아서 헛스윙, 아니면 볼
      if (Math.random() < (perfect ? chase : chase * 0.5)) strike(perfect ? '유인구에 헛스윙!' : '겨우 속았다');
      else ball('참아냈다');
      return;
    }
    if (perfect) { strike('헛스윙 스트라이크!'); return; }
    if (Math.random() < 0.5) {
      setC({ ...countRef.current, s: Math.min(2, countRef.current.s + 1) });
      setFlash({ label: 'FOUL', tone: '#fbbf24', sub: '겨우 걷어냈다' });
      again();
      return;
    }
    contact('good', { label: 'GOOD', tone: '#34d399', sub: '방망이가 나왔다…' });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (phase === 'aim') {
        const n = { 1: 0, 2: 1, 3: 2 }[e.key];
        if (n != null) { setCourse(n); setCell(PITCH_COURSES[n].rec[0]); return; }
        const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 }[e.key];
        if (mv) {
          e.preventDefault();
          setCell((v) => {
            const col = v % 5;
            if ((mv === -1 && col === 0) || (mv === 1 && col === 4)) return v;
            return Math.max(0, Math.min(24, v + mv));
          });
          return;
        }
      }
      if (e.code !== 'Space' && e.key !== ' ') return;
      e.preventDefault();
      if (e.repeat) return;
      if (phase === 'aim') start();
      else if (phase === 'gauge') judge();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const p = pitcher?.stats || {};
  const b = batter?.stats || {};
  const pct = (v) => `${v * 50}%`;
  const hotIdx = heat.map((v, i) => [v, i]).filter(([v]) => v != null).sort((x, y) => y[0] - x[0]);
  const hot = hotIdx[0];
  const cold = hotIdx[hotIdx.length - 1];
  const where = (i) => `${['높은', '가운데', '낮은'][Math.floor(i / 5) - 1]} ${['몸쪽', '한가운데', '바깥쪽'][(i % 5) - 1]}`;
  const recHot = c.rec.some((i) => heat[i] != null && heat[i] >= 0.33);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-[#03050a]" role="dialog" aria-modal="true" aria-label="승부처 개입">
      <style>{`
        @keyframes crisisPulse { 0%,100% { box-shadow: inset 0 0 80px rgba(248,113,113,.18); } 50% { box-shadow: inset 0 0 170px rgba(248,113,113,.45); } }
        @keyframes clutchPop { 0% { transform: scale(2.2); opacity: 0; } 60% { transform: scale(.92); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes recPulse { 50% { box-shadow: inset 0 0 0 2px #fde047, inset 0 0 26px rgba(253,224,71,.85); } }
      `}</style>
      {/* 16:9 무대: 배경 그림의 포수 미트 위치에 판을 맞춘다 */}
      <div className="relative aspect-video" style={{ width: 'min(100vw, 177.78vh)' }}>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(ui/clutch-mound.webp)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(30% 45% at 50% 45%, transparent, rgba(3,5,10,.4))', animation: 'crisisPulse .9s ease-in-out infinite' }} />

        <div className="absolute right-[2%] top-[3%] text-right">
          <p className="ui-lab font-display" style={{ '--a': '#f87171' }}>{inning}회초 위기</p>
          <p className="font-display text-4xl font-extrabold tabular-nums text-white">{score.my} : {score.opp}</p>
          <div className="mt-1 flex justify-end gap-3 font-display text-sm text-gray-300">
            <span className="flex items-center gap-1">B {[0, 1, 2, 3].map((i) => <span key={i} className={`h-3 w-3 rounded-full ${i < count.b ? 'bg-emerald-400' : 'bg-white/15'}`} />)}</span>
            <span className="flex items-center gap-1">S {[0, 1, 2].map((i) => <span key={i} className={`h-3 w-3 rounded-full ${i < count.s ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-white/15'}`} />)}</span>
          </div>
        </div>

        <div className="absolute left-[1.8%] top-[10%] flex w-[20%] min-w-[13rem] flex-col gap-2">
          <div className="bg-[#05080f]/80 px-3 py-2 text-[13px] leading-relaxed">
            <span className="ui-lab font-display">Batter</span>
            <p className="text-lg font-black text-white">{batter?.name} <small className="text-xs font-normal text-gray-400">컨택 {b.contact ?? '-'} · 파워 {b.power ?? '-'}</small></p>
            {hot && <p className="text-red-300">{where(hot[1])} {hot[0].toFixed(3).slice(1)}</p>}
            {cold && <p className="text-sky-300">{where(cold[1])} {cold[0].toFixed(3).slice(1)}</p>}
          </div>
          {PITCH_COURSES.map((o, i) => {
            const warn = o.rec.some((k) => heat[k] != null && heat[k] >= 0.33);
            return (
              <button key={o.id} type="button" disabled={phase !== 'aim'} onClick={() => { setCourse(i); setCell(o.rec[0]); }}
                className={`ui-cut px-3 py-2 text-left ${i === course ? 'bg-red-950/80 shadow-[inset_0_0_0_2px_#f87171]' : 'bg-[#05080f]/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)]'}`} style={{ '--c': '10px' }}>
                <span className="float-right font-display text-xs font-extrabold text-red-400">{i + 1}</span>
                <b className="text-sm text-white">{o.name}</b>
                <small className="block text-xs text-gray-400">{warn ? '추천 칸이 강한 코스와 겹침 ⚠' : '추천 칸이 약한 코스 ✔'}</small>
              </button>
            );
          })}
          <p className="text-[11px] text-gray-400">투수 {pitcher?.name} · 제구 {p.control ?? '-'} · 구위 {p.stuff ?? '-'}</p>
        </div>

        {/* 5×5 판 (가운데 3×3 = 스트라이크 존) */}
        <div className="absolute grid grid-cols-5 grid-rows-5 gap-[2px]" style={{ left: '50.6%', top: '45.8%', width: '19.5%', height: '40.3%', transform: 'translate(-50%,-50%)' }}>
          {heat.map((v, i) => {
            const z = inZone(i);
            const rec = c.rec.includes(i);
            return (
              <div key={i} onClick={() => phase === 'aim' && setCell(i)}
                className="relative grid cursor-pointer place-items-center font-display text-[clamp(9px,0.9vw,13px)] font-bold text-white/85 [text-shadow:0_1px_3px_#000]"
                style={{
                  background: v == null ? 'rgba(5,8,15,.18)' : v >= 0.33 ? 'rgba(248,113,113,.4)' : v < 0.2 ? 'rgba(125,211,252,.3)' : 'rgba(5,8,15,.3)',
                  border: `1px solid ${z ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.12)'}`,
                  boxShadow: rec ? 'inset 0 0 0 2px #fde047, inset 0 0 14px rgba(253,224,71,.5)' : undefined,
                  animation: rec ? 'recPulse 1.4s ease-in-out infinite' : undefined,
                }}>
                {v != null && v.toFixed(3).slice(1)}
                {i === cell && <span className="absolute h-[70%] w-auto aspect-square rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d6d3d1)] shadow-[0_0_16px_#fff,0_0_0_3px_rgba(248,113,113,.7)]" />}
              </div>
            );
          })}
        </div>
        {recHot && <p className="absolute text-sm font-bold text-amber-300 [text-shadow:0_1px_4px_#000]" style={{ left: '61.5%', top: '28%' }}>⚠ 추천 칸이 이 타자의 강한 코스</p>}

        <div className="absolute right-[2%] bottom-[16%] w-[14%] min-w-[9rem] bg-[#05080f]/80 px-3 py-2 text-right">
          <span className="ui-lab font-display">{inZone(cell) ? '이 자리' : '유인구'}</span>
          <p><b className="font-display text-3xl text-emerald-400">{oddsOut}%</b> <small className="text-xs text-gray-400">{inZone(cell) ? '범타' : '헛스윙'}</small></p>
          {inZone(cell) && <p><b className="font-display text-3xl text-red-400">{oddsXbh}%</b> <small className="text-xs text-gray-400">장타</small></p>}
        </div>

        {/* 게이지 */}
        <div className="absolute left-1/2 bottom-[9%] w-[46%] -translate-x-1/2">
          {flash && (
            <div className="pointer-events-none absolute inset-x-0 -top-24 text-center" key={`${flash.label}${count.b}${count.s}`} style={{ animation: 'clutchPop .35s ease-out both' }}>
              <b className="font-display text-5xl font-black" style={{ color: flash.tone, textShadow: `0 0 24px ${flash.tone}` }}>{flash.label}</b>
              <p className="mt-1 text-sm font-semibold text-white [text-shadow:0_1px_4px_#000]">{flash.sub}</p>
            </div>
          )}
          <div className="relative h-7 overflow-hidden bg-[#05080f]/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]">
            <div className="absolute inset-y-0 bg-red-500/30" style={{ left: `calc(50% - ${pct(win.ball)})`, width: pct(win.ball * 2) }} />
            <div className="absolute inset-y-0 bg-emerald-400/40" style={{ left: `calc(50% - ${pct(goodW)})`, width: pct(goodW * 2) }} />
            <div className="absolute inset-y-0 bg-yellow-300" style={{ left: `calc(50% - ${pct(perfectW)})`, width: pct(perfectW * 2) }} />
            <div ref={markerRef} className="absolute inset-y-[-4px] w-1.5 -translate-x-1/2 bg-white shadow-[0_0_12px_#fff]"
              style={{ left: stopAt != null ? `${50 + stopAt * 50}%` : '0%', opacity: phase === 'aim' ? 0.3 : 1 }} />
          </div>
        </div>
        <p className="absolute inset-x-0 bottom-[3%] text-center text-sm font-bold text-red-200 [text-shadow:0_1px_4px_#000]">
          {phase === 'aim' ? '[1·2·3] 구종 · [←↑↓→] 공 놓기 · [SPACE] 투구' : phase === 'gauge' ? '가운데 노란 칸에서 [SPACE]!' : ''}
        </p>
      </div>
    </div>
  );
}

function ClutchOverlay({ clutch, onPick }) {
  if (!clutch) return null;
  const chance = clutch.kind === 'chance';
  if (chance && clutch.batter) return <ClutchBatting key={`${clutch.inning}${clutch.isTop}`} clutch={clutch} onPick={onPick} />;
  if (!chance && clutch.batter) return <ClutchPitching key={`${clutch.inning}${clutch.isTop}`} clutch={clutch} onPick={onPick} />;
  const acc = chance ? '#10b981' : '#f87171';
  const opts = chance
    ? [['perfect', 'PERFECT', '+2점'], ['good', 'GOOD', '+1점'], ['miss', 'MISS', '득점 절반']]
    : [['perfect', 'PERFECT', '무실점'], ['good', 'GOOD', '실점 −1'], ['miss', 'MISS', '실점 +1']];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#03050a]/75 px-4 backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-label="승부처 개입">
      <div className="ui-cut ui-frame ui-glass w-full max-w-lg p-6 text-center animate-[rise_.35s_ease-out_both]" style={{ '--c': '18px', '--a': acc }}>
        <p className="ui-lab font-display" style={{ '--a': acc }}>{chance ? 'Clutch Chance' : 'Clutch Crisis'}</p>
        <h2 className="mt-2 text-3xl font-black text-white">{clutch.inning}회{clutch.isTop ? '초' : '말'} {chance ? '찬스' : '위기'}</h2>
        <p className="mt-1 font-display text-xl tabular-nums text-gray-300">나 {clutch.score.my} : {clutch.score.opp} 상대</p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {opts.map(([g, label, sub]) => (
            <button key={g} type="button" onClick={() => onPick(g)} className="ui-btn ui-cut flex flex-col py-3">
              <b className="font-display text-lg">{label}</b><small className="text-xs text-gray-400">{sub}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───── 그라운드 중계: 수비 9명 배치, 타구가 날아가고 수비수가 쫓고 주자가 베이스를 돈다 ───── */
const FIELD_SPOT = { P: [200, 262], C: [200, 372], '1B': [288, 240], '2B': [246, 184], SS: [154, 184], '3B': [112, 240], LF: [82, 122], CF: [200, 72], RF: [318, 122] };
const BASE_SPOT = [[272, 272], [200, 200], [128, 272], [200, 344]]; // 1루 · 2루 · 3루 · 홈
const shortName = (p) => (p?.name || '').slice(0, 3);
/** 수비 팀 로스터를 자리에 앉힌다: 선발 투수 · 포수 · 내야 · 외야 3명(좌·중·우) */
function fieldersOf(team) {
  if (!team) return [];
  const pool = [...(team.roster || [])];
  const take = (pos) => { const i = pool.findIndex((p) => p.position === pos); return i < 0 ? null : pool.splice(i, 1)[0]; };
  const out = [['P', take('SP') || take('RP')], ['C', take('C')], ['1B', take('1B')], ['2B', take('2B')], ['SS', take('SS')], ['3B', take('3B')]];
  ['LF', 'CF', 'RF'].forEach((s) => out.push([s, take('OF') || take('DH')]));
  return out.map(([spot, p]) => ({ spot, p }));
}
/** 타구가 떨어지는 곳(결과마다 방향을 조금씩 흔든다) */
function landingOf(play) {
  const h = [...play.key].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const pick = (arr) => arr[h % arr.length];
  switch (play.kind) {
    case 'GO': return { at: FIELD_SPOT[pick(['SS', '2B', '3B', '1B'])], chaser: pick(['SS', '2B', '3B', '1B']) };
    case 'FO': { const s = pick(['LF', 'CF', 'RF']); return { at: FIELD_SPOT[s], chaser: s }; }
    case '1B': { const s = pick([[140, 140], [260, 140], [200, 120]]); return { at: s, chaser: s[0] < 200 ? 'LF' : s[0] > 200 ? 'RF' : 'CF' }; }
    case '2B': { const s = pick([[130, 70], [270, 70]]); return { at: s, chaser: s[0] < 200 ? 'LF' : 'RF' }; }
    case '3B': { const s = pick([[40, 110], [360, 110]]); return { at: s, chaser: s[0] < 200 ? 'LF' : 'RF' }; }
    case 'HR': return { at: pick([[110, 6], [200, -4], [290, 6]]), chaser: null };
    case 'K': return { at: FIELD_SPOT.C, chaser: null };
    default: return null;
  }
}

function FieldView({ play, myName }) {
  const land = play ? landingOf(play) : null;
  const fielders = fieldersOf(play?.defense);
  const offColor = play?.isTop ? '#f87171' : '#10b981';
  const runners = play ? play.bases.map((p, i) => (p ? { p, i } : null)).filter(Boolean) : [];
  const good = play && !['K', 'GO', 'FO'].includes(play.kind);
  return (
    <section className="ui-cut ui-frame ui-glass2 relative overflow-hidden p-2" style={{ '--c': '14px' }}>
      <div className="flex flex-col items-center gap-3 md:flex-row md:items-stretch">
        <svg viewBox="-10 -20 420 410" className="w-full max-w-[34rem] shrink-0">
          <defs>
            <radialGradient id="fvGrass" cx="50%" cy="85%" r="90%"><stop offset="0" stopColor="#15803d" /><stop offset="1" stopColor="#052e16" /></radialGradient>
          </defs>
          {/* 외야 · 파울 라인 · 담장 */}
          <path d="M200 372 L-2 170 A 290 290 0 0 1 402 170 Z" fill="url(#fvGrass)" />
          {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M200 372 L${-2 + i * 67} 60`} stroke="rgba(255,255,255,.035)" strokeWidth="26" />)}
          <path d="M-2 170 A 290 290 0 0 1 402 170" fill="none" stroke="#fde047" strokeOpacity=".55" strokeWidth="3" />
          <path d="M200 372 L-2 170 M200 372 L402 170" stroke="rgba(255,255,255,.55)" strokeWidth="1.5" />
          {/* 내야 흙 · 잔디 · 마운드 */}
          <path d="M200 372 L296 276 A 130 130 0 0 0 104 276 Z" fill="#92400e" fillOpacity=".75" />
          <path d="M200 334 L262 272 L200 210 L138 272 Z" fill="#166534" />
          <circle cx="200" cy="266" r="12" fill="#92400e" />
          {BASE_SPOT.map(([x, y], i) => <rect key={i} x={x - 5} y={y - 5} width="10" height="10" fill={play?.bases[i] ? offColor : '#fff'} transform={`rotate(45 ${x} ${y})`} />)}

          {/* 수비수: 타구 쪽 수비수는 공을 쫓아 달려간다 */}
          {fielders.map(({ spot, p }) => {
            const [x, y] = FIELD_SPOT[spot];
            const chase = land && land.chaser === spot;
            const [tx, ty] = chase ? [x + (land.at[0] - x) * 0.8, y + (land.at[1] - y) * 0.8] : [x, y];
            return (
              <g key={spot} style={{ transform: `translate(${tx}px, ${ty}px)`, transition: 'transform .7s cubic-bezier(.3,.7,.3,1)' }}>
                <circle r="7" fill={play?.isTop ? '#10b981' : '#f87171'} stroke="#05080f" strokeWidth="2" />
                <text y="19" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" style={{ paintOrder: 'stroke', stroke: '#05080f', strokeWidth: 3 }}>{shortName(p) || spot}</text>
              </g>
            );
          })}

          {/* 주자: 선수별로 이어서 움직인다 (득점한 주자는 홈으로 들어가 사라진다) */}
          {runners.map(({ p, i }) => (
            <g key={p.id} style={{ transform: `translate(${BASE_SPOT[i][0]}px, ${BASE_SPOT[i][1] - 12}px)`, transition: 'transform .9s ease-in-out' }}>
              <circle r="7" fill={offColor} stroke="#fff" strokeWidth="2" />
              <text y="-11" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" style={{ paintOrder: 'stroke', stroke: '#05080f', strokeWidth: 3 }}>{shortName(p)}</text>
            </g>
          ))}
          {play && (
            <g key={`bat${play.key}`}>
              <circle cx="186" cy="352" r="7" fill={offColor} stroke="#fde047" strokeWidth="2" opacity={play.kind === 'K' ? 1 : 0.35} />
              <text x="186" y="336" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fde047" style={{ paintOrder: 'stroke', stroke: '#05080f', strokeWidth: 3 }}>{shortName(play.batter)}</text>
            </g>
          )}

          {/* 공: 투수 → 홈 → 타구 */}
          {play && (
            <g key={`ball${play.key}`}>
              <circle r="4" fill="#fff" style={{ filter: 'drop-shadow(0 0 4px #fff)' }}>
                <animateMotion dur=".35s" fill="freeze" path="M200 262 L200 350" />
              </circle>
              {land && play.kind !== 'K' && (
                <circle r="4.5" fill="#fff" opacity="0" style={{ filter: 'drop-shadow(0 0 6px #fde047)' }}>
                  <set attributeName="opacity" to="1" begin=".35s" fill="freeze" />
                  <animateMotion begin=".35s" dur={play.kind === 'HR' ? '1.1s' : '.7s'} fill="freeze"
                    path={`M200 350 Q ${(200 + land.at[0]) / 2} ${play.kind === 'GO' ? (350 + land.at[1]) / 2 : Math.min(land.at[1], 350) - (play.kind === 'HR' ? 160 : 90)} ${land.at[0]} ${land.at[1]}`} />
                </circle>
              )}
            </g>
          )}
        </svg>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-3 pb-3 md:py-4">
          {!play ? <p className="text-sm text-gray-500">플레이볼을 기다리는 중…</p> : (
            <>
              <p className="font-display text-xs tracking-[0.3em] text-gray-400">{play.inning}회{play.isTop ? '초' : '말'} · {play.isTop ? 'AI 올스타' : myName} 공격</p>
              <div className="flex items-center gap-2 font-display text-sm text-gray-300">
                OUT {[0, 1, 2].map((i) => <span key={i} className={`h-3.5 w-3.5 rounded-full ${i < play.outs ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-white/15'}`} />)}
              </div>
              <div key={play.key} className="animate-[rise_.35s_ease-out_both]">
                <p className="text-lg font-bold text-white">{play.batter?.name}</p>
                <p className="font-display text-4xl font-extrabold" style={{ color: play.kind === 'HR' ? '#fde047' : good ? offColor : '#9ca3af', textShadow: play.kind === 'HR' ? '0 0 24px rgba(253,224,71,.7)' : undefined }}>
                  {PLAY_LABEL[play.kind]}{play.scored.length ? <span className="ml-2 text-2xl text-white">+{play.scored.length}</span> : null}
                </p>
                {play.scored.length > 0 && <p className="mt-1 text-sm text-gray-300">홈인 · {play.scored.map((p) => p.name).join(', ')}</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
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

function MatchupScreen({ roster, oppRoster, buff, oppBuff = 0, augments, onStart, onBack, startLabel = '경기 시작 ▶', oppName = 'AI 올스타' }) {
  const my = useMemo(() => buildTeam('나의 드림팀', fillRoster(roster), buff), [roster, buff]);
  const opp = useMemo(() => buildTeam(oppName, fillRoster(oppRoster), oppBuff), [oppRoster, oppBuff, oppName]);
  const pct = Math.round(winChance(my, opp) * 100);
  const avg = (xs) => (xs.length ? Math.round(xs.reduce((t, p) => t + p.overall, 0) / xs.length) : 0);
  const teamTile = (team, name, acc, mine) => (
    <div className="ui-cut relative flex min-h-[4.4rem] shrink-0 items-center gap-3 overflow-hidden px-3.5" style={{ '--c': '10px', background: `linear-gradient(90deg,${acc}30,rgba(6,10,19,.92))` }}>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: acc, boxShadow: `0 0 12px ${acc}` }} />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-base font-black text-white">{name}</b>
        <small className="font-display text-[11px] tracking-[0.12em] text-gray-400">{mine ? 'MY TEAM' : 'AI OPPONENT'} · 타선 {avg(team.batters)} · 마운드 {avg([team.sps[0], ...team.pen].filter(Boolean))}</small>
      </span>
      <b className="font-display text-4xl font-extrabold leading-none" style={{ color: acc, textShadow: `0 0 18px ${acc}88` }}>{teamOvr(team)}</b>
    </div>
  );
  const lineup = (team, name, acc, mine) => (
    <div className="flex min-h-0 flex-col" style={{ '--a': acc }}>
      <div className="mb-1.5 flex items-baseline gap-3 border-b border-white/10 pb-2">
        <p className="ui-lab font-display" style={{ '--a': acc }}>{mine ? 'My Lineup' : 'AI Lineup'}</p>
        <b className="text-lg font-black text-white">{name}</b>
      </div>
      <div className="syn-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {team.batters.map((b, i) => <MatchRow key={b.id} player={b} label={i + 1} mine />)}
        <p className="ui-lab font-display mt-1.5" style={{ '--a': acc, fontSize: 10 }}>Mound</p>
        {[team.sps[0], ...team.pen].filter(Boolean).map((x) => <MatchRow key={x.id} player={x} label={x.slot} mine />)}
      </div>
    </div>
  );
  return (
    <section className="grid min-h-0 flex-1 gap-4 animate-[fade_.3s_ease-out_both]" style={{ gridTemplateColumns: '17rem minmax(0,1fr) 24rem', gridTemplateRows: 'minmax(0,1fr)' }}>
      {/* 왼쪽 사이드바: 두 팀 · 뒤로 */}
      <nav className="ui-cut ui-frame ui-glass flex min-h-0 flex-col gap-2 p-3" style={{ '--c': '20px' }}>
        <p className="ui-lab font-display px-1 pt-1">Match Prep</p>
        {teamTile(my, '나의 드림팀', '#10b981', true)}
        <p className="py-0.5 text-center font-display text-sm font-extrabold italic text-gray-500">VS</p>
        {teamTile(opp, 'AI 올스타', '#f87171', false)}
        {augments.length > 0 && (
          <div className="mt-2">
            <p className="ui-lab font-display px-1 pb-2" style={{ fontSize: 10, '--a': '#c4b5fd' }}>Augments</p>
            <div className="flex flex-col gap-1.5">
              {augments.map((au) => (
                <span key={au.id} className="ui-cut flex items-center gap-2 bg-white/[0.045] px-2.5 py-1.5 text-sm text-gray-200" style={{ '--c': '6px' }}>
                  <b className="font-display text-[11px]" style={{ color: TIER_NEON[au.tier] }}>{TIER_EN[au.tier]}</b><span className="truncate">{au.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        <button type="button" className="ui-btn ui-cut sm mt-auto" onClick={onBack}>라인업 다시 보기</button>
      </nav>

      {/* 가운데: 선발 맞대결 + 두 팀 라인업 */}
      <section className="ui-cut ui-frame ui-glass flex min-h-0 flex-col p-5" style={{ '--c': '20px' }}>
        <div className="flex items-baseline gap-3">
          <p className="ui-lab font-display">Play Ball</p>
          <p className="text-sm text-gray-400">선발 맞대결</p>
        </div>
        <div className="grid min-h-0 flex-1 gap-5" style={{ gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', gridTemplateRows: 'minmax(0,1fr)' }}>
          {lineup(my, '나의 드림팀', '#10b981', true)}
          <div className="relative flex items-center gap-4 self-center">
            <DuelCard player={my.sps[0]} label="My Starter" />
            <span className="absolute left-1/2 top-[42%] z-10 -translate-x-1/2 -translate-y-1/2 font-display text-6xl font-extrabold italic text-white [text-shadow:0_0_30px_rgba(255,255,255,.5),0_4px_0_rgba(0,0,0,.6)]">VS</span>
            <DuelCard player={opp.sps[0]} label="AI Starter" />
          </div>
          {lineup(opp, 'AI 올스타', '#f87171', false)}
        </div>
      </section>

      {/* 오른쪽: 예상 승률 · 경기 시작 */}
      <aside className="ui-cut ui-frame ui-glass flex flex-col gap-4 p-6" style={{ '--c': '20px' }}>
        <p className="ui-lab font-display">Win Chance</p>
        <h2 className="-mt-2 text-3xl font-black text-white">나의 드림팀 <span className="font-display text-gray-500">vs</span> AI 올스타</h2>
        <dl className="grid grid-cols-3 gap-1.5">
          {[['팀 OVR', teamOvr(my)], ['상대 OVR', teamOvr(opp)], ['증강', augments.length]].map(([k, v]) => (
            <div key={k} className="ui-cut bg-white/[0.045] px-3 py-1.5" style={{ '--c': '7px' }}>
              <dt className="text-[10px] text-gray-400">{k}</dt><dd className="font-display text-xl font-bold leading-tight text-white">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <div className="flex justify-between font-display text-3xl font-bold tabular-nums"><span className="text-[#10b981]">{pct}%</span><span className="text-red-400">{100 - pct}%</span></div>
          <div className="mt-1.5 flex h-3 gap-1">
            <i className="-skew-x-12 bg-[#10b981] shadow-[0_0_10px_#10b981]" style={{ flex: pct }} />
            <i className="-skew-x-12 bg-red-400" style={{ flex: 100 - pct }} />
          </div>
        </div>
        <div>
          {[['선발', my.sps[0]?.name, opp.sps[0]?.name], ['타선 평균', avg(my.batters), avg(opp.batters)]].map(([k, m, o]) => (
            <div key={k} className="flex items-center justify-between border-b border-white/10 py-2.5 text-sm text-gray-300">
              <span>{k}</span><b className="font-display text-lg"><span className="text-[#10b981]">{m}</span> <span className="text-gray-600">·</span> <span className="text-red-400">{o}</span></b>
            </div>
          ))}
        </div>
        <button type="button" className="ui-btn ui-cut pri mt-auto min-h-[3.5rem] w-full text-lg" onClick={onStart} autoFocus>{startLabel}</button>
      </aside>
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

function ResultPanel({ result, record, logs, onRematch, onNewOpp, onNewDraft, gauntlet = null }) {
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
        <p className="ui-lab font-display">MVP · {mvp.name}</p>
        <dl className="ui-cut grid grid-cols-3 bg-white/[0.045]" style={{ '--c': '10px' }}>
          {lines.map(([k, v], i) => (
            <div key={k} className={`px-4 py-2.5 ${i ? 'border-l border-white/10' : ''}`}>
              <dt className="text-[11px] text-gray-400">{k}</dt>
              <dd className="font-display text-3xl font-bold tabular-nums" style={{ color: neonOf(mvp) }}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="ui-lab font-display mt-2">결정적 순간</p>
        {moments.length ? moments.map((l) => {
          const c = l.kind === 'augment' ? TIER_NEON[l.tier] : '#10b981';
          return (
            <div key={l.id} className="ui-cut grid grid-cols-[3.5rem_1fr] items-center gap-3 bg-white/[0.045] px-3 py-2" style={{ '--c': '8px', boxShadow: `inset 3px 0 0 ${c}` }}>
              <span className="font-display text-sm font-bold" style={{ color: c }}>{l.inning}회{l.isTop ? '초' : '말'}</span>
              <span className="text-sm text-gray-100">{l.text}</span>
            </div>
          );
        }) : <p className="text-sm text-gray-500">큰 장면 없이 끝난 경기</p>}
      </div>
      <div className="flex flex-col gap-1">
        <p className="ui-lab font-display">선수 평점</p>
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
      <div className="flex flex-wrap items-center justify-end gap-2 lg:col-span-3">
        <button type="button" className="ui-btn ui-cut" onClick={onNewDraft}>새 드래프트</button>
        {gauntlet ? (
          <>
            <span className="mr-auto font-display text-sm text-gray-400">{gauntlet.label}</span>
            <button type="button" className="ui-btn ui-cut pri" onClick={onRematch}>{gauntlet.cta} ▶</button>
          </>
        ) : (
          <>
            <button type="button" className="ui-btn ui-cut" onClick={onNewOpp}>새 AI 상대와 경기</button>
            <button type="button" className="ui-btn ui-cut pri" onClick={onRematch}>같은 상대와 재경기 ▶</button>
          </>
        )}
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
    key: s.id, year: s.year || 'ALL', title: s.title, kind: s.kind, sub: `${s.subtitle || SERIES_KIND_LABEL[s.kind]} · ${s.players.length}명`,
    star: [...s.players].sort((a, b) => b.overall - a.overall)[0], champ: !!s.champion,
  }));
  return [...list, ...(mode.planned || []).map((t) => ({ key: t, year: t.slice(0, 4), title: t.slice(5), sub: '데이터 조사 후 공개', locked: true }))];
}

/** 티켓을 종류별로 묶는다: 레전드 · 구단 시즌 · 국가대표. 종류가 없으면 한 묶음 */
function groupTickets(list) {
  const out = ['legend', 'team', 'national'].map((k) => [SERIES_KIND_LABEL[k], list.filter((t) => t.kind === k)]).filter(([, l]) => l.length);
  const rest = list.filter((t) => !t.kind);
  if (rest.length) out.push(['그 밖의 시리즈', rest]);
  return out.length ? out : [['그 밖의 시리즈', list]];
}

/* 연도별 시즌: 그 해 주인공 = 우승 구단 → 없으면 가장 센 구단 시즌 → 구단이 없으면 첫 시리즈 */
const seriesOvr = (x) => Math.round(x.players.reduce((n, p) => n + p.overall, 0) / Math.max(1, x.players.length));
/** 진행 중인 시즌이면 부제의 순위("9월 중순 5위")를 읽어 1위에 가까운 구단을 세운다 */
const rankOfSeries = (x) => Number((/(\d+)위/.exec(x.subtitle || '') || [])[1] || 99);
function yearHero(list) {
  const clubs = list.filter((x) => x.kind === 'team');
  const champ = clubs.find((x) => x.champion);
  if (champ) return champ;
  const ranked = clubs.filter((x) => rankOfSeries(x) < 99).sort((a, b) => rankOfSeries(a) - rankOfSeries(b));
  return ranked[0] || [...clubs].sort((a, b) => seriesOvr(b) - seriesOvr(a))[0] || list[0] || null;
}
/** 그 해 대표 선수 n명 (같은 사람은 한 번만) */
function yearStars(list, n) {
  const seen = new Set();
  return list.flatMap((x) => x.players).sort((a, b) => b.overall - a.overall)
    .filter((p) => !seen.has(personKey(p)) && seen.add(personKey(p))).slice(0, n);
}
function YearFace({ p, w = 70, h = 92 }) {
  const art = useArt(p);
  return (
    <div className="ui-cut relative shrink-0 overflow-hidden bg-[#0b1220] bg-cover" title={`${p.name} ${p.overall}`}
      style={{ '--c': '7px', width: w, height: h, backgroundImage: art ? `url(${art})` : undefined, backgroundPosition: '60% 12%' }}>
      <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,0) 40%,#05080f)' }} />
      <b className="absolute left-1.5 top-0.5 font-display text-[13px]" style={{ color: rdTone(p.overall) === 'prism' ? '#fde047' : rdTone(p.overall) }}>{p.overall}</b>
      <b className="absolute inset-x-1 bottom-0.5 truncate text-center text-[11px] text-white">{p.name}</b>
    </div>
  );
}
/** 전체 믹스 · 최근 시즌 — 왼쪽 판에 대표 구단과 묶음별 시리즈, 오른쪽에 대표 선수.
 *  대표 구단은 그 모드의 우승 구단들 사이에서 8초마다 바뀌고 배경 그림도 함께 바뀐다 */
const FADE = 420; // 대표 구단이 바뀔 때 흐려지고 떠오르는 시간(ms)
function BasicHero({ mode, tickets, acc }) {
  const pool = useMemo(() => {
    const clubs = tickets.filter((t) => t.kind === 'team' && !t.locked && teamFlag(t.title));
    const champs = clubs.filter((t) => t.champ);
    const list = champs.length >= 3 ? champs : clubs;
    return shuffle(list.length ? list : tickets.slice(0, 1));
  }, [tickets]);
  // 배경 · 대표 카드 · 대표 선수는 한 몸으로 움직인다: 먼저 다 같이 흐려지고, 다 바뀐 뒤 같이 떠오른다
  const [turn, setTurn] = useState(0);
  const [dim, setDim] = useState(false);
  useEffect(() => {
    setTurn(0);
    setDim(false);
    if (pool.length < 2) return undefined;
    let out;
    const id = setInterval(() => {
      setDim(true);
      out = setTimeout(() => { setTurn((n) => n + 1); setDim(false); }, FADE);
    }, 8000);
    return () => { clearInterval(id); clearTimeout(out); };
  }, [pool]);
  const hero = pool[turn % Math.max(1, pool.length)] || tickets[0];
  const flag = teamFlag(hero?.title || '');
  const rest = tickets.filter((t) => t.key !== hero?.key);
  // 대표 선수도 그 구단 시리즈에서 뽑는다 (구단 시리즈가 아니면 모드 전체)
  const heroSeries = mode.series.find((s) => s.id === hero?.key);
  const [one, ...more] = yearStars(heroSeries ? [heroSeries] : mode.series, 5);
  const veil = { transition: `opacity ${FADE}ms ease`, opacity: dim ? 0 : 1 };
  return (
    <>
      {flag && (
        <span className="pointer-events-none absolute inset-0" style={{ zIndex: 0, ...veil }}>
          <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(ui/teams/bg-${flag.key}.webp)`, opacity: 0.6 }} />
          <span className="absolute inset-0" style={{ background: `radial-gradient(60% 80% at 20% 75%, ${flag.color}2e, transparent 70%)` }} />
        </span>
      )}
      <span className="pointer-events-none absolute inset-0" style={{ zIndex: 0, background: 'linear-gradient(90deg,rgba(5,8,15,.92) 8%,rgba(5,8,15,.4) 55%,rgba(5,8,15,.12)), linear-gradient(0deg,rgba(5,8,15,.8),rgba(5,8,15,0) 45%)' }} />
      <div className="relative z-10 grid min-h-0 flex-1 gap-5" style={{ gridTemplateColumns: '520px minmax(0,1fr)' }}>
        <div className="ui-cut ui-frame ui-glass mt-4 flex min-h-0 flex-col p-4" style={{ '--c': '14px', '--a': acc }}>
          <div className="flex items-end gap-4">
            <div className="min-w-0 flex-1">
              <b className="font-display text-[13px] tracking-[0.25em]" style={{ color: acc }}>{mode.en}</b>
              <b className="mt-2 block text-5xl font-black leading-none text-white">{mode.name}</b>
              <span className="mt-2 block text-[15px] text-gray-300">{mode.series.length} 시리즈 · {mode.players.length}명</span>
            </div>
            {hero && <div className="shrink-0" style={{ width: 176, height: 112, ...veil }}><SeriesTicket t={hero} acc={acc} fit /></div>}
          </div>
          <SeriesFolds groups={groupTickets(rest)} acc={acc} />
        </div>
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <p className="ui-lab font-display" style={{ '--a': acc }}>Stars</p>
          <div className="mt-1.5 flex items-end gap-1.5" style={veil}>
            {one && <YearBig p={one} w={212} h={248} />}
            <div className="grid min-w-0 flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, more.length)},minmax(0,1fr))` }}>
              {more.map((p) => <YearFace key={personKey(p)} p={p} w="100%" h={168} />)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** 이 모드에 열리는 시리즈 — 묶음 머리만 보이고, 누른 묶음 하나만 칩으로 펼친다 */
function SeriesFolds({ groups, acc }) {
  const [open, setOpen] = useState(groups[0]?.[0] || '');
  return (
    <div className="syn-scroll min-h-0 overflow-y-auto pr-1">
      {groups.map(([ko, list]) => {
        const on = open === ko;
        return (
          <React.Fragment key={ko}>
            <button type="button" onClick={() => setOpen(on ? '' : ko)}
              className="mt-3 flex w-full items-center gap-2 text-left transition hover:brightness-125">
              <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: acc }}>SERIES</span>
              <b className="text-[12px] text-gray-300">{ko} {list.length}</b>
              <span className="h-px flex-1 bg-white/10" />
              <span className="font-display text-[11px] text-gray-500">{on ? '접기 ▲' : '펼치기 ▼'}</span>
            </button>
            {on && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {list.map((t) => (
                  <span key={t.key} className="ui-cut inline-flex items-center gap-1.5 bg-white/[0.055] px-2.5 py-1 text-[12.5px] text-gray-200"
                    style={{ '--c': '5px' }} title={t.sub || t.title}>
                    {Number.isFinite(t.year) && <b className="font-display text-[12px]" style={{ color: acc }}>{t.year}</b>}
                    {seriesChipName(t.title)}
                  </span>
                ))}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
/** 칩에 들어갈 짧은 이름 — 구단 별명은 떼고 앞말만 */
const seriesChipName = (title = '') => title.replace(/ (타이거즈|라이온즈|트윈스|베어스|이글스|자이언츠|다이노스|위즈|랜더스|히어로즈|유니콘스|와이번스)$/, '');

/** 그 해 최고 한 명 — 얼굴을 크게, 아래에 포지션 · 소속 · 그 해 기록 */
function YearBig({ p, w, h }) {
  const art = useArt(p);
  const c = rdTone(p.overall) === 'prism' ? '#fde047' : rdTone(p.overall);
  return (
    <div className="ui-cut relative shrink-0 overflow-hidden bg-[#0b1220] bg-cover" style={{ '--c': '12px', width: w, height: h, backgroundImage: art ? `url(${art})` : undefined, backgroundPosition: '60% 8%' }}>
      <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.2),rgba(5,8,15,0) 35%,rgba(5,8,15,.92) 74%,#05080f)' }} />
      <b className="absolute right-2.5 top-2 font-display text-2xl" style={{ color: c, textShadow: '0 2px 6px #000' }}>{p.overall}</b>
      <div className="absolute inset-x-3 bottom-2.5">
        <span className="font-display text-[11px] tracking-[0.18em] text-gray-400">{POS_LABEL[p.position] || p.position} · {p.team}</span>
        <b className="mt-0.5 block truncate text-2xl font-black text-white">{p.name}</b>
        {p.note && <span className="mt-0.5 block truncate text-[11.5px] text-gray-400">{p.note}</span>}
      </div>
    </div>
  );
}
/** 연도 고르개 — 10년대 탭 + 그 안의 연도. 연도마다 그 해 주인공 구단 색 점을 찍는다(우승이면 진하게) */
function YearPicker({ yearId, onPick }) {
  const decadeOf = (y) => Math.floor(y / 10) * 10;
  const cur = YEAR_MODES.find((m) => m.id === yearId) || YEAR_MODES[0];
  const decades = [...new Set(YEAR_MODES.map((m) => decadeOf(m.year)))].sort((a, b) => b - a);
  const inDecade = (d) => YEAR_MODES.filter((m) => decadeOf(m.year) === d).sort((a, b) => b.year - a.year);
  const here = decadeOf(cur.year);
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="시즌 연대">
        {decades.map((d) => {
          const on = d === here;
          return (
            <button key={d} type="button" role="radio" aria-checked={on} onClick={() => onPick(inDecade(d)[0].id)}
              className={`ui-cut px-3 py-1 font-display text-sm font-bold ${on ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400 hover:text-white'}`}
              style={{ '--c': '5px', background: on ? '#a3e635' : undefined }}>{d}년대</button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="시즌 연도">
        {inDecade(here).map((m) => {
          const on = m.id === yearId;
          const hero = yearHero(m.series);
          const flag = teamFlag(hero?.title || '');
          return (
            <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => onPick(m.id)}
              title={hero ? `${m.year} ${hero.title}` : String(m.year)}
              className={`ui-cut flex items-center gap-1.5 px-3 py-1 font-display text-sm ${on ? 'font-bold text-white' : 'text-gray-400 hover:text-white'}`}
              style={{ '--c': '5px', background: 'rgba(255,255,255,.06)', boxShadow: on ? 'inset 0 0 0 1px #a3e635' : 'none' }}>
              {m.year}
              <span className="block rounded-full" style={{ width: 5, height: 5, background: flag?.color || '#475569', opacity: hero?.champion ? 1 : 0.45 }} />
            </button>
          );
        })}
      </div>
    </>
  );
}

function YearHero({ mode, acc }) {
  const list = mode.series;
  const hero = yearHero(list);
  const rest = list.filter((x) => x !== hero);
  // 우승이 아직 없고 그 해 순위만 있으면 진행 중인 시즌
  const flag = teamFlag(hero?.title || ''); // 그 해 주인공 구단의 상징 그림 · 색 (배경)
  const live = !!hero && !hero.champion && (rankOfSeries(hero) < 99 || /진행/.test(hero.subtitle || ''));
  const tickets = ticketsOf(mode); // 시리즈 카드는 다른 모드와 같은 티켓을 쓴다
  const heroT = tickets.find((t) => t.key === hero?.id);
  const restT = tickets.filter((t) => t.key !== hero?.id);
  const [one, ...more] = yearStars(list, 7);
  return (
    <>
      {/* 그 해 주인공 구단의 상징이 연기 속에서 떠오르는 배경 — 글자가 놓이는 왼쪽 아래만 어둡게 */}
      {/* 연도를 바꿀 때 툭 끊기지 않게, 배경과 내용이 같이 떠오른다 */}
      {flag && (
        <React.Fragment key={flag.key}>
          <span className="pointer-events-none absolute inset-0 animate-[swap_.4s_ease-out_both] bg-cover bg-center" style={{ zIndex: 0, backgroundImage: `url(ui/teams/bg-${flag.key}.webp)`, opacity: 0.6 }} />
          <span className="pointer-events-none absolute inset-0" style={{ zIndex: 0, background: `linear-gradient(90deg,rgba(5,8,15,.92) 8%,rgba(5,8,15,.4) 55%,rgba(5,8,15,.12)), linear-gradient(0deg,rgba(5,8,15,.8),rgba(5,8,15,0) 45%), radial-gradient(60% 80% at 20% 75%, ${flag.color}2e, transparent 70%)` }} />
        </React.Fragment>
      )}
      <div key={mode.id} className="relative z-10 grid min-h-0 flex-1 animate-[swap_.4s_ease-out_both] gap-5" style={{ gridTemplateColumns: '392px minmax(0,1fr)' }}>
        {/* 왼쪽 판 — 제목 · 주인공 구단 카드 · 그 해 나머지 시리즈 */}
        <div className="ui-cut ui-frame ui-glass mt-4 flex min-h-0 flex-col p-4" style={{ '--c': '14px', '--a': acc }}>
          <span className="flex items-center gap-2">
            {hero?.champion && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" />
                <path d="M12 14v3" /><path d="M9 20.5h6" /><path d="M10 17.5h4l1 3H9l1-3Z" />
              </svg>
            )}
            <b className="font-display text-[13px] tracking-[0.25em]" style={{ color: hero?.champion ? '#fcd34d' : acc }}>
              {mode.year} {hero?.champion ? 'CHAMPION' : live ? 'IN PROGRESS' : 'SEASON'}
            </b>
          </span>
          <b className="mt-2 block text-5xl font-black leading-none text-white">{hero?.title || mode.name}</b>
          <span className="mt-2 block text-[15px] text-gray-300">{hero?.subtitle || `${list.length} 시리즈 · ${mode.players.length}명`}</span>
          {heroT && <div className="mt-4 shrink-0" style={{ height: 176 }}><SeriesTicket t={heroT} acc={acc} /></div>}
          <p className="ui-lab font-display" style={{ '--a': acc }}>Series {rest.length}</p>
          <div className="syn-scroll mt-1.5 grid min-h-0 gap-1.5 overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gridAutoRows: '82px' }}>
            {restT.map((t) => <SeriesTicket key={t.key} t={t} acc={acc} sm />)}
          </div>
        </div>
        {/* 오른쪽 — 그 해 얼굴 하나를 크게, 나머지는 그 옆으로 한 줄 */}
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <p className="ui-lab font-display" style={{ '--a': acc }}>Best of the year</p>
          <div className="mt-1.5 flex items-end gap-1.5">
            {one && <YearBig p={one} w={212} h={248} />}
            <div className="grid min-w-0 flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, more.length)},minmax(0,1fr))` }}>
              {more.map((p) => <YearFace key={personKey(p)} p={p} w="100%" h={168} />)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SeriesTicket({ t, acc, sm = false, fit = false }) {
  const art = useArt(t.star);
  return (
    <div className={`ui-cut relative h-full overflow-hidden bg-[#0b1220] bg-cover bg-no-repeat ${sm || fit ? '' : 'min-h-[11rem]'}`}
      style={{ '--c': sm ? '8px' : '12px', backgroundImage: art ? `url(${art})` : undefined, backgroundPosition: '60% 18%' }}>
      <span className="absolute inset-0" style={{ background: sm ? 'linear-gradient(180deg,rgba(5,8,15,.82),rgba(5,8,15,.9))' : 'linear-gradient(180deg,rgba(5,8,15,.55),rgba(5,8,15,0) 30%,rgba(5,8,15,0) 45%,rgba(5,8,15,.92) 72%,#05080f)' }} />
      {t.locked && <span className="absolute inset-0 grid place-items-center bg-[repeating-linear-gradient(135deg,rgba(255,255,255,.03)_0_8px,transparent_8px_16px)] text-xs font-semibold text-gray-500">준비 중</span>}
      {!sm && (
        <span className={`absolute left-3 top-2 font-display text-3xl font-extrabold leading-none ${t.locked ? 'text-gray-600' : ''}`}
          style={t.locked ? undefined : { color: acc, textShadow: `0 0 16px ${acc}88, 0 2px 4px #000` }}>{t.year}</span>
      )}
      {/* 한국시리즈 우승 — 작은 트로피로 조용하게 */}
      {t.champ && (
        <span className={`absolute ${sm ? 'right-1.5 top-1.5' : 'right-2.5 top-2.5'}`} title="한국시리즈 우승" aria-label="한국시리즈 우승">
          <svg width={sm ? 12 : 15} height={sm ? 12 : 15} viewBox="0 0 24 24" fill="none" stroke="#fcd34d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: 0.7, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.8))' }}>
            <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" />
            <path d="M12 14v3" /><path d="M9 20.5h6" /><path d="M10 17.5h4l1 3H9l1-3Z" />
          </svg>
        </span>
      )}
      <div className={sm ? 'absolute inset-x-2 bottom-1.5' : 'absolute inset-x-3 bottom-2.5'}>
        {sm && <b className={`block truncate font-display text-[11.5px] ${t.locked ? 'text-gray-600' : ''}`} style={t.locked ? undefined : { color: acc }}>{t.year}</b>}
        <p className={`truncate font-black ${sm ? 'text-[12.5px]' : 'text-base'} ${t.locked ? 'text-gray-500' : 'text-white'}`}>{t.title}</p>
        {!sm && <p className="truncate text-[11px] text-gray-400">{t.sub}</p>}
      </div>
    </div>
  );
}

/** fixed 를 주면 고를 수 없는 줄 — 줄을 빼면 모드를 바꿀 때 줄 수가 출렁여서, 값만 적어 둔다 */
function SettingRow({ label, options, labels, value, onChange, fixed = null }) {
  if (fixed != null) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-white/10 py-2.5 text-sm text-gray-300">
        <span>{label}</span>
        <b className="font-display text-[15px] text-gray-400">{fixed}</b>
      </div>
    );
  }
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

function ModeSelect({ initialMode, record, onStart, onExit, normal, normalView = null, onNormalView }) {
  // 사이드 네비: normal(일반 대결 · 랭크전) · mix · recent · year(연도별) · special(특별 모드)
  const plays = normal || [];
  const firstMode = DRAFT_MODES.find((m) => m.id === initialMode) || DRAFT_MODES[0];
  // normalView: 처음 열 탭 — 플레이 탭(duel · ranked) 또는 드래프트 탭(mix · recent · year · special)
  const [view, setView] = useState(plays.length ? (normalView && (plays.some((x) => x.key === normalView) || ['mix', 'recent', 'year', 'special'].includes(normalView)) ? normalView : plays[0].key) : (firstMode.group === 'basic' ? firstMode.id : firstMode.group));
  const play = plays.find((x) => x.key === view) || null;
  const [yearId, setYearId] = useState(firstMode.group === 'year' ? firstMode.id : YEAR_MODES[0]?.id);
  const [specialId, setSpecialId] = useState(firstMode.group === 'special' ? firstMode.id : 'legend');
  const modeId = view === 'year' ? yearId : view === 'special' ? specialId : play ? null : view;
  const mode = DRAFT_MODES.find((m) => m.id === modeId) || firstMode;
  const [cap, setCap] = useState(mode.cap);
  const [ai, setAi] = useState('normal');
  const [live, setLive] = useState(mode.group !== 'special'); // 특별 모드는 혼자 자유 영입, 그 밖은 8구단 라이브
  const [aug, setAug] = useState(SEASON_AUGMENTS);
  const haveFirst = withDraftTickets(draftTickets()).first;   // 상점에서 산 우선 지명권
  const [useFirst, setUseFirst] = useState(false);
  const haveFavor = withAugTickets(augShopTickets()).favor;   // 즐겨찾기 우대권
  const [useFavor, setUseFavor] = useState(false);
  const [format, setFormat] = useState('single'); // 단판 · 16 · 32 · 64강
  useEffect(() => { setCap(mode.cap); }, [mode.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const tickets = ticketsOf(mode);
  const specials = DRAFT_MODES.filter((m) => m.group === 'special');
  const special = mode.group === 'special';
  useEffect(() => { setLive(mode.group !== 'special'); setCap(mode.cap); }, [mode.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const yearMode = DRAFT_MODES.find((m) => m.id === yearId);
  const NAV = [
    ...(plays.length ? [{ group: 'Play', items: plays.map(({ key, label, sub, img, neon }) => ({ key, label, sub, img, neon })) }] : []),
    { group: 'Basic', items: [
      { key: 'mix', label: '전체 믹스', sub: `${DRAFT_MODES.find((m) => m.id === 'mix').series.length} 시리즈 · 무작위`, img: 'modes/mix.webp', neon: '#10b981' },
      { key: 'recent', label: '최근 시즌', sub: '2021 – 2026', img: 'modes/recent.webp', neon: '#38e1ff' },
      { key: 'year', label: '연도별 시즌', sub: `${YEAR_MODES.length}개 시즌 · 한 해 고르기`, img: 'modes/recent.webp', neon: '#a3e635' },
    ] },
    { group: 'Special', items: [{ key: 'special', label: '특별 모드', sub: `규칙이 다른 ${specials.length}개`, img: 'modes/legend.webp', neon: '#fbbf24' }] },
  ];
  const acc = play ? play.neon : mode.neon;

  return (
    <div className="relative flex min-h-screen flex-col lg:h-dvh lg:min-h-0">
      <header className="relative z-10 flex h-16 shrink-0 items-center gap-8 border-b border-[#10b981]/25 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))] px-6">
        <span className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-64 bg-gradient-to-r from-[#10b981] to-transparent" aria-hidden="true" />
        {onExit && <button type="button" onClick={onExit} aria-label="메인으로" className="ui-cut grid h-9 w-9 shrink-0 -mr-4 place-items-center bg-white/[0.06] text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)] hover:bg-white/10" style={{ '--c': '7px' }}>←</button>}
        <div className="leading-none">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gray-500">Play</p>
          <h1 className="mt-1 text-xl font-black leading-none text-white">플레이</h1>
        </div>
        {record && <p className="ml-auto text-sm text-gray-400">최근 기록 <b className="font-display text-lg text-white">{record}</b></p>}
      </header>

      <div className="relative grid min-h-0 flex-1 gap-4 px-6 pb-6 pt-4 lg:grid-cols-[17rem_minmax(0,1fr)_24rem] lg:grid-rows-[minmax(0,1fr)]" style={{ '--a': acc }}>
        {/* 사이드 네비 */}
        <nav className="ui-cut ui-frame ui-glass flex min-h-0 flex-col gap-2 p-3" style={{ '--c': '20px' }} aria-label="플레이 모드">
          {NAV.map((g) => (
            <React.Fragment key={g.group}>
              <p className="ui-lab font-display px-1 pt-1" style={{ '--a': g.items[0].neon }}>{g.group}</p>
              {g.items.map((it) => {
                const on = view === it.key;
                return (
                  <button key={it.key} type="button" onClick={() => { setView(it.key); onNormalView?.(it.key); }} aria-pressed={on}
                    className={`ui-cut relative flex h-[4.4rem] shrink-0 items-center gap-3 overflow-hidden px-3.5 text-left transition ${on ? '' : 'bg-white/[0.03] hover:brightness-125'}`}
                    style={{ '--c': '10px', background: on ? `linear-gradient(90deg, ${it.neon}38, rgba(6,10,19,.92))` : undefined }}>
                    <span className="ui-cut h-[3.2rem] w-11 shrink-0 bg-cover bg-center" style={{ '--c': '8px', backgroundImage: `url(${it.img})`, filter: on ? undefined : 'saturate(.7) brightness(.75)' }} />
                    <span className="min-w-0">
                      <b className={`block truncate text-base font-black ${on ? 'text-white' : 'text-gray-300'}`}>{it.label}</b>
                      <small className="font-display text-[11px] tracking-[0.12em] text-gray-400">{it.sub}</small>
                    </span>
                    {on && <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: it.neon, boxShadow: `0 0 12px ${it.neon}` }} />}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        {play ? play.main : (
          <section key={view} className="ui-cut ui-frame ui-glass relative flex min-h-0 flex-col overflow-hidden p-5 animate-[swap_.35s_ease-out_both]" style={{ '--c': '20px' }}>
            <div className="relative z-10 flex flex-wrap items-baseline gap-3">
              <p className="ui-lab font-display">{view === 'special' ? 'Special Mode' : view === 'year' ? 'Season' : `${mode.en} Season`}</p>
              {(view === 'special' || (mode.id === 'legend' && mode.series.length === 1)) && (
                <p className="text-sm text-gray-400">
                  {view === 'special' ? `규칙이 다른 모드 ${specials.length}개` : `레전드 ${mode.players.length}명 중 대표 선수`}
                </p>
              )}
            </div>
            {view === 'year' && <div className="relative z-10"><YearPicker yearId={yearId} onPick={setYearId} /></div>}
            {view === 'year' ? <YearHero mode={mode} acc="#a3e635" /> : view === 'special' ? (
              <div className="syn-scroll mt-3 grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
                {specials.map((m) => {
                  const on = specialId === m.id;
                  return (
                    <button key={m.id} type="button" onClick={() => setSpecialId(m.id)} aria-pressed={on}
                      className={`ui-cut ${on ? 'ui-frame' : ''} relative aspect-square overflow-hidden bg-[#0b1220] bg-cover text-left transition hover:brightness-110`}
                      style={{ '--c': '14px', '--a': m.neon, backgroundImage: `url(modes/${m.id}.webp)`, backgroundPosition: '60% 20%' }}>
                      <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,8,15,.3),rgba(5,8,15,.1) 35%,rgba(5,8,15,.95) 75%)' }} />
                      <span className="absolute left-4 top-3 font-display text-sm font-extrabold tracking-[0.2em]" style={{ color: m.neon, textShadow: `0 0 12px ${m.neon}` }}>{m.tag}</span>
                      <span className="absolute inset-x-4 bottom-3 block">
                        <b className="block text-2xl font-black text-white">{m.name}</b>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          {m.rules.map((r) => <span key={r} className="ui-cut px-2 py-0.5 text-[11px] font-bold text-[#05080f]" style={{ '--c': '4px', background: m.neon }}>{r}</span>)}
                        </span>
                      </span>
                    </button>
                  );
                })}
                <div className="ui-cut grid aspect-square place-items-center bg-white/[0.03] text-sm text-gray-500 shadow-[inset_0_0_0_1px_rgba(148,163,184,.18)]" style={{ '--c': '14px' }}>+ 다음 시즌 공개</div>
              </div>
            ) : (
              <BasicHero mode={mode} tickets={tickets} acc={mode.neon} />
            )}
          </section>
        )}

        {play ? play.aside : (
          <aside className="ui-cut ui-frame ui-glass flex flex-col gap-4 p-6" style={{ '--c': '20px' }}>
            <p className="ui-lab font-display">{mode.en}</p>
            <h2 className="-mt-2 text-3xl font-black text-white">{view === 'year' && yearMode ? yearMode.name : mode.name}</h2>
            <p className="text-sm leading-relaxed text-gray-300">{mode.desc}</p>
            {/* 어느 모드든 같은 다섯 줄 — 고를 수 없는 값은 줄을 빼지 않고 오른쪽에 그대로 적는다 */}
            <div>
              <SettingRow label="드래프트 방식" options={[true, false]} labels={{ true: '8구단 라이브', false: '혼자 뽑기' }} value={live} onChange={setLive}
                fixed={special ? '자유 영입' : null} />
              <SettingRow label="샐러리 캡" options={[mode.cap - 100, mode.cap, mode.cap + 100]} value={cap} onChange={setCap}
                fixed={special ? '없음' : null} />
              {!special && live && haveFirst > 0 && (
                <SettingRow label={`우선 지명권 · ${haveFirst}장`} options={[false, true]} labels={{ false: '아껴 둔다', true: '이번 판에 쓴다' }} value={useFirst} onChange={setUseFirst} />
              )}
              <SettingRow label="AI 난이도" options={['easy', 'normal', 'hard']} labels={{ easy: '쉬움', normal: '보통', hard: '강함' }} value={ai} onChange={setAi} />
              <SettingRow label="시즌 증강" options={[0, 1]} labels={{ 0: '없음', 1: '있음' }} value={aug} onChange={setAug} />
              {aug > 0 && haveFavor > 0 && (
                <SettingRow label={`즐겨찾기 우대권 · ${haveFavor}장`} options={[false, true]} labels={{ false: '아껴 둔다', true: '이번 판에 쓴다' }} value={useFavor} onChange={setUseFavor} />
              )}
              <SettingRow label="경기 방식" options={['single', 16, 32, 64]} labels={{ single: '단판', 16: '16강', 32: '32강', 64: '64강' }} value={format} onChange={setFormat} />
            </div>
            <button type="button" className="ui-btn ui-cut pri mt-auto min-h-[3.5rem] w-full text-lg" onClick={() => onStart(mode.id, { cap: special ? NO_CAP : cap, ai, aug, format, live: special ? false : live, firstPick: !special && live && useFirst && haveFirst > 0, augFavor: aug > 0 && useFavor && haveFavor > 0 })}>
              드래프트 시작 ▶
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}

/* 드래프트 규칙: 탭(섹션) → 구역 { t 질문, s 한 줄 답, b 펼친 내용 }. 문장은 합니다체 */
const RL_REFUND_EX = { cost: 95 };
const RULE_TABS = [
  { id: 'entry', label: '엔트리',
    icon: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5" /><circle cx="17" cy="9" r="2.3" /><path d="M15.5 14.2c2.4.2 4.2 1.8 4.8 4.8" /></>,
    lead: <>선수 <b>{ROSTER_SIZE}명</b>으로 꾸리는 한 팀 · 필드 14자리는 포지션마다, 예비 {BENCH_SIZE}자리는 포지션 상관없음</>,
    groups: [
      { t: '어떤 자리를 채우나요?', s: `투수 5 · 야수 9 · 예비 ${BENCH_SIZE}, 모두 ${ROSTER_SIZE}자리`, b: <>
        <div className="rl-slots">
          <div><span>투수<i>5</i></span><span className="rl-chips"><span className="rl-chip">선발투수</span><span className="rl-chip">롱릴리프</span><span className="rl-chip">중간계투</span><span className="rl-chip">셋업맨</span><span className="rl-chip">마무리</span></span></div>
          <div><span>내야<i>5</i></span><span className="rl-chips"><span className="rl-chip">포수</span><span className="rl-chip">1루수</span><span className="rl-chip">2루수</span><span className="rl-chip">3루수</span><span className="rl-chip">유격수</span></span></div>
          <div><span>외야<i>3</i></span><span className="rl-chips"><span className="rl-chip">외야수</span><span className="rl-chip">외야수</span><span className="rl-chip">외야수</span></span></div>
          <div><span>지명<i>1</i></span><span className="rl-chips"><span className="rl-chip g">지명타자 · 야수 누구나</span></span></div>
          <div><span>예비<i>{BENCH_SIZE}</i></span><span className="rl-chips"><span className="rl-chip g">포지션 상관없음 · 경기에는 나서지 않고 시너지에만 보탬</span></span></div>
        </div>
        <p>자리가 모두 찬 포지션의 카드에는 <span className="rl-tag">유격수 마감</span>처럼 표시</p>
      </> },
      { t: '외국인 선수는 몇 명까지 되나요?', s: `최대 ${FOREIGN_LIMIT}명`, b: <>
        <p>외국인 선수가 {FOREIGN_LIMIT}명이 되면 남은 외국인 카드는 <span className="rl-tag">외국인 한도 {FOREIGN_LIMIT}/{FOREIGN_LIMIT}</span>으로 잠김</p>
        <p>한 명을 방출하면 다시 뽑기 가능</p>
      </> },
      { t: '같은 선수를 또 뽑을 수 있나요?', s: '시즌이 달라도 한 사람은 한 번만', b: <>
        <div className="rl-yn">
          <div className="y"><span><b>2006 류현진</b> 영입</span></div>
          <div className="n"><span><b>2010 류현진</b>은 <span className="rl-tag">동일인 영입됨</span>으로 잠김</span></div>
        </div>
      </> },
    ] },
  { id: 'draft', label: '드래프트',
    icon: <><rect x="4" y="5" width="7" height="10" rx="1" /><rect x="13" y="9" width="7" height="10" rx="1" /><path d="M7.5 18v2M16.5 5V3" /></>,
    lead: <><b>{ROSTER_SIZE}라운드</b> · 라운드마다 한 명씩 영입 · 정해진 CP 안에서 스타와 가성비 섞기</>,
    groups: [
      { t: '한 라운드는 어떻게 진행되나요?', s: '시리즈 열기 · 고르기 · 영입', b: <>
        <div className="rl-steps">
          <div><span>시리즈 하나 열림 — 구단의 한 시즌 · 국가대표 · 레전드 중 하나</span></div>
          <div><span>선수 카드를 누르면 <b>PICK</b>에 올라 능력치와 영입가 확인</span></div>
          <div><span><b>영입</b>을 누르면 라인업에 들어가고 다음 라운드로</span></div>
        </div>
        <div className="rl-tip"><span>마음에 드는 선수가 없으면 <b>새로고침</b>으로 다른 시리즈 · 드래프트마다 {START_REROLLS}번</span></div>
      </> },
      { t: 'CP는 얼마나 쓸 수 있나요?', s: '모드 화면에서 정한 샐러리 캡만큼', b: <>
        <p>샐러리 캡은 <span className="rl-chip">700</span> <span className="rl-chip g">800</span> <span className="rl-chip">900</span> CP 중 하나</p>
        <p>영입할 때마다 영입가만큼 줄고, 남은 CP보다 비싼 선수는 <span className="rl-tag">CP 부족</span>으로 잠김</p>
        <div className="rl-tip"><span>PICK에 선수를 올리면 위쪽 캡 막대에 쓰일 CP 미리 표시</span></div>
      </> },
      { t: '영입가는 어떻게 정해지나요?', s: '종합이 높을수록 점수보다 비쌈', b: <>
        <div className="rl-tbl">
          <span className="h">종합</span><span className="h">영입가</span><span className="h">차이</span>
          {[95, 90, 80, 65].map((o) => {
            const d = costOf(o) - o;
            return (
              <React.Fragment key={o}>
                <span className="n">{o}</span><span className="n">{costOf(o)}</span>
                <span className={d > 0 ? 'up' : d < 0 ? 'dn' : ''}>{d > 0 ? `${d} CP 비쌈` : d < 0 ? `${-d} CP 쌈` : '점수와 같음'}</span>
              </React.Fragment>
            );
          })}
        </div>
        <p><b>72~84</b>는 종합과 같은 값 · <b>85 이상</b>은 비싸고 <b>71 이하</b>는 쌈</p>
      </> },
      { t: '다 채우지 못하면 어떻게 되나요?', s: '빈 자리는 퓨처스 유망주(종합 70)', b: <>
        <p>드래프트는 <b>{ROSTER_SIZE}라운드가 끝나거나</b>, <b>남은 CP로 뽑을 선수가 없을 때</b> 종료</p>
        <p>이때 비어 있는 자리는 모두 종합 70의 퓨처스 유망주</p>
        <div className="rl-tip"><span>초반에 CP를 너무 많이 쓰면 마지막 자리는 유망주</span></div>
      </> },
    ] },
  { id: 'swap', label: '방출 · 교체',
    icon: <path d="M5 8h13l-3-3M19 16H6l3 3" />,
    lead: <>뽑은 선수 내보내기 · 찬 자리에 더 좋은 선수 바로 들이기 · 대신 <b>손해</b> 있음</>,
    groups: [
      { t: '방출은 어떻게 하나요?', s: '라인업에서 선수 누르고 방출 두 번', b: <>
        <div className="rl-steps">
          <div><span>라인업에서 내보낼 선수 누르기</span></div>
          <div><span><b>방출</b>을 누르면 <b>한 번 더 누르면 방출</b>로 바뀜</span></div>
          <div><span>한 번 더 누르면 방출</span></div>
        </div>
      </> },
      { t: '방출하면 무엇이 달라지나요?', s: '영입가 절반 환급 · 되돌리기 없음', b: <>
        <div className="rl-yn">
          <div className="y"><span>영입가의 <b>절반</b>을 CP로 환급 ({RL_REFUND_EX.cost} CP 선수 → {releaseRefund(RL_REFUND_EX)} CP)</span></div>
          <div className="n"><span>방출한 선수는 이번 드래프트에서 <b>다시 영입 불가</b></span></div>
          <div className="n"><span>이미 쓴 라운드는 <b>돌아오지 않음</b></span></div>
          <div className="n"><span>드래프트가 끝난 뒤(정비 화면)에는 방출 불가</span></div>
        </div>
      </> },
      { t: '찬 자리에 선수를 데려오려면?', s: '교체 영입으로 한 번에 맞바꾸기', b: <>
        <p>이미 찬 포지션의 선수를 PICK에 올리면 버튼이 <span className="rl-tag">교체 영입 (+{releaseRefund(RL_REFUND_EX)} CP 환불)</span>처럼 바뀝니다.</p>
        <div className="rl-steps">
          <div><span>내 라인업에서 <b>자리를 먼저 눌러 두면</b> 그 자리 선수와 교체</span></div>
          <div><span>누르지 않았다면 그 포지션에서 <b>가장 약한 선수</b>와 교체</span></div>
        </div>
        <p>나가는 선수는 방출과 같은 처리 · 교체 영입도 한 라운드</p>
      </> },
    ] },
  { id: 'pos', label: '포지션',
    icon: <><path d="M12 20 4 12l8-8 8 8z" /><circle cx="12" cy="12" r="1.6" /></>,
    lead: <>선수는 <b>원래 포지션</b>에서 가장 잘함 · 다른 자리에 세우면 종합 하락</>,
    groups: [
      { t: '다른 자리에 세우면 얼마나 약해지나요?', s: '원래 자리와 멀수록 큰 하락', b: <>
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
        <p>라인업 선수를 누르면 선 자리에서 달라진 능력치 확인</p>
      </> },
      { t: '지명타자에는 누구를 세우나요?', s: '야수 누구나 · 능력치 감소 없음', b: <>
        <p>수비가 약하고 방망이가 좋은 선수를 두는 자리</p>
      </> },
      { t: '선수 자리는 어떻게 바꾸나요?', s: '선수를 끌어 다른 자리에 놓기', b: <>
        <div className="rl-yn">
          <div className="y"><span>빈 자리에 놓으면 그 자리로 <b>이동</b></span></div>
          <div className="y"><span>선수가 있는 자리에 놓으면 두 선수가 <b>맞교환</b></span></div>
        </div>
        <div className="rl-tip"><span>라인업 자리를 누르면 선반에 그 포지션 선수만</span></div>
      </> },
    ] },
  { id: 'syn', label: '시너지',
    icon: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
    lead: <>실제로 함께 뛰었던 선수나 조건이 맞는 선수를 모으면 <b>그 선수들 강화</b></>,
    groups: [
      { t: '시너지를 만들면 무엇이 좋아지나요?', s: '시너지에 속한 선수만 능력치 상승', b: <>
        <p>팀 전체가 아니라 <b>조건을 채운 선수들만</b> 능력치 상승</p>
        <p>여러 시너지가 겹쳐도 한 능력치는 <em>최대 +{SYNERGY_STAT_CAP}</em>까지만</p>
      </> },
      { t: '실화 조합', s: '실제로 함께한 선수 모으기', b: <>
        <div className="rl-syn"><span><b>클린업 트리오</b><small>이승엽 · 이대호 · 김동주 중 2명</small></span><em>파워 +5</em></div>
        <div className="rl-syn"><span><b>SK 왕조 배터리</b><small>김광현 · 박경완</small></span><em>안정 · 수비 +4</em></div>
        <p>카드 시즌이 달라도 같은 사람이면 인정</p>
      </> },
      { t: '팀 구성', s: '조건에 맞는 선수가 많을수록 단계 상승', b: <>
        <p><b>홈런 군단</b> — 파워 80 이상 타자</p>
        <div className="rl-tiers"><span><b>3명</b>파워 +2</span><span><b>4명</b>파워 +4</span><span><b>6명</b>파워 +7</span></div>
        <div className="rl-tip"><span>선반 카드의 시너지 칸에 그 선수를 뽑으면 채워질 칸 표시</span></div>
      </> },
      { t: '아이콘 테두리 색은 무엇인가요?', s: '단계가 오를수록 바뀌는 색', b: <>
        <div className="rl-tiers"><span><b>회색</b>아직 없음</span><span><b>브론즈</b>1단계</span><span><b>실버</b>2단계</span><span><b>골드</b>최종 단계</span><span><b>프리즘</b>3단계 이상 시너지의 최종</span></div>
        <p>이름 아래 <b>3 › 5 › 7</b>은 단계마다 필요한 인원 · 오른쪽 숫자는 지금 인원 / 다음 단계 인원</p>
        <p>시너지에 마우스를 올리면 조건 · 단계별 효과 · 해당 선수가 나오고, 누르면 구장에서 그 선수들 표시</p>
      </> },
      { t: '프랜차이즈의 기억', s: '가장 많이 뽑은 구단의 선수 강화', b: <>
        <div className="rl-tiers"><span><b>3명</b>능력치 +1</span><span><b>5명</b>+2 · 수비·안정 +2</span><span><b>7명</b>+4 · 수비·안정 +3</span></div>
        <p>드래프트 중에는 숨김 · <b>드래프트가 끝나면 공개</b> · 인원이 같은 구단이 여럿이면 모두 적용</p>
      </> },
    ] },
  { id: 'season', label: '시즌',
    icon: <><path d="M7 4h10v3a5 5 0 0 1-10 0z" /><path d="M7 5H4v1.5A3 3 0 0 0 7 9.5M17 5h3v1.5a3 3 0 0 1-3 3M12 12v4M8.5 20h7" /></>,
    lead: <>{ROSTER_SIZE}명을 모두 채우면 라인업 다듬기 · 증강 고르기 · <b>AI 올스타</b>와 경기</>,
    groups: [
      { t: '드래프트가 끝나면 무엇을 하나요?', s: '정비 화면에서 자리 다듬기', b: <>
        <div className="rl-yn">
          <div className="y"><span>선수를 끌어 자리 옮기기</span></div>
          <div className="n"><span>방출과 영입 불가</span></div>
        </div>
      </> },
      { t: '증강은 언제 고르나요?', s: '시즌 시작 때 모드가 정한 개수만큼', b: <>
        <p>증강 개수는 <span className="rl-chip">없음</span> <span className="rl-chip g">2개</span> <span className="rl-chip">3개</span> 중 하나</p>
        <p>매번 <b>3장 중 1장</b> · 3장은 <span className="rl-chip">실버</span> <span className="rl-chip g">골드</span> <span className="rl-chip">프리즘</span> 중 한 등급</p>
        <p>경기 중에는 <b>플레이볼 직후</b>와 <b>7회 시작</b>에 그 경기에서만 쓰는 증강 하나씩 더</p>
      </> },
      { t: '증강은 어떤 종류가 있나요?', s: '같은 증강도 선수 구성에 따라 효과가 크게 다름', b: <>
        <div className="rl-kind">
          <div><span className="rl-chip g">라인업 비례</span><span>조건에 맞는 선수가 많을수록 강함 · 맞는 선수가 없으면 효과도 적음</span></div>
          <div><span className="rl-chip g">약점 완화</span><span>팀의 가장 약한 곳 보강 · 한쪽으로 치우친 팀일수록 큰 효과</span></div>
          <div><span className="rl-chip g">몰빵</span><span>강한 쪽을 더 키우는 대신 대가 · 극단적인 팀에서 가장 큰 효과</span></div>
          <div><span className="rl-chip g">경기 운영</span><span>투수 교체 · 승부처 개입 · 위기 탈출처럼 흐름을 바꾸는 쪽</span></div>
          <div><span className="rl-chip g">운</span><span>경기마다 크게 갈리는 결과</span></div>
        </div>
        <p>조건이 적힌 증강은 조건이 맞을 때 확률로 발동 · 나머지는 고른 순간부터 계속 적용</p>
      </> },
      { t: '상대는 누구인가요?', s: '같은 규칙으로 드래프트한 AI 올스타', b: <>
        <p>AI 난이도 <span className="rl-chip">쉬움</span> <span className="rl-chip g">보통</span> <span className="rl-chip">강함</span>에 따라 달라지는 상대 능력치</p>
        <p>경기 결과는 전적에 쌓임 · 같은 상대와 다시 겨루기 가능</p>
      </> },
    ] },
  { id: 'team', label: '내 팀',
    icon: <><path d="M12 3.5 19.5 8v8L12 20.5 4.5 16V8z" /><path d="M12 8.5 15.5 10.5v3L12 15.5 8.5 13.5v-3z" /></>,
    lead: <>드래프트 화면 오른쪽 <b>MY TEAM</b> 판 — 지금 라인업의 전력과 선수들의 실제 시즌 기록</>,
    groups: [
      { t: '팀 분석의 숫자는 무엇인가요?', s: '팀 종합 · 투수 · 야수는 라인업 평균 종합', b: <>
        <p>선수를 세운 자리와 시너지가 반영된 종합의 평균 · 빈 자리는 빼고 계산</p>
        <p>육각형은 <span className="rl-chip">파워</span> <span className="rl-chip">컨택</span> <span className="rl-chip">주루</span> <span className="rl-chip">수비</span> <span className="rl-chip">선발</span> <span className="rl-chip">불펜</span> 여섯 가지</p>
        <p>타자 넷은 야수 평균 능력치 · 선발과 불펜은 구위 · 제구 · 안정으로 매긴 투수력</p>
      </> },
      { t: '초록 면과 붉은 점선은 무엇인가요?', s: '초록 면은 우리 팀 · 붉은 점선은 AI 평균', b: <>
        <p>AI 평균은 <b>같은 모드 · 같은 샐러리 캡</b>으로 AI가 드래프트한 팀들의 평균</p>
        <p>꼭짓점 숫자 옆의 <em>+9</em>와 같은 값은 AI 평균보다 높거나 낮은 만큼 · 아래 칩은 차이가 큰 순서</p>
      </> },
      { t: '홈런 타선 · 불안한 뒷문은 무엇인가요?', s: 'AI 평균보다 가장 앞서는 능력과 가장 밀리는 능력', b: <>
        <div className="rl-tbl">
          <span className="h">능력</span><span className="h">가장 앞설 때</span><span className="h">가장 밀릴 때</span>
          {TEAM_AXES.map(([k]) => (
            <React.Fragment key={k}><span>{k}</span><span className="up">{STYLE_STRONG[k]}</span><span className="dn">{STYLE_WEAK[k]}</span></React.Fragment>
          ))}
        </div>
      </> },
      { t: '선수 기록은 어떻게 보나요?', s: '투수와 타자의 실제 시즌 기록을 따로', b: <>
        <p>투수는 <b>ERA · 승 · 세이브(S) 또는 홀드(H) · 삼진</b>, 타자는 <b>타율 · 홈런 · 도루 · 타점</b></p>
        <p>초록 기록은 그 열에서 <b>우리 팀 1등</b> · ERA는 가장 낮은 값이 초록</p>
        <p>레전드 카드처럼 시즌 기록 자료가 없는 선수는 <b>-</b>로 표시</p>
        <div className="rl-tip"><span>기록 줄을 누르면 라인업에서 그 자리를 누른 것과 같음</span></div>
      </> },
    ] },
];

/* ───────────── 정비 화면: 타순 · 수비 포지션 · 투수 로테이션 · 시너지 ───────────── */
const RD_ROT = [['SP', '선발 투수', 'STARTING'], ['LR', '롱릴리프', 'LONG RELIEF'], ['MR', '중간 계투', 'MIDDLE RELIEF'], ['SU', '셋업맨', 'SETUP'], ['CL', '마무리', 'CLOSER']];
const RD_CHIP = { OF1: 'LF', OF2: 'CF', OF3: 'RF', LR: 'RP', MR: 'RP', SU: 'RP', CL: 'RP', ...Object.fromEntries(BENCH_SLOTS.map((b, i) => [b.id, `BN${i + 1}`])) };
/* 구장 사진(ui/field.webp) 위 자리 (% 좌표) */
const RD_XY = { OF1: [24, 30], OF2: [50, 17], OF3: [76, 30], SS: [38, 41], '2B': [62, 41], '3B': [26, 57], '1B': [74, 57], C: [50, 81], SP: [50, 60], DH: [76, 82] };
const RD_ORDER_W = [1.1, 1.08, 1.07, 1.06, 1, 0.97, 0.94, 0.92, 0.9];
const RD_SYN_TONES = ['#34d399', '#fbbf24', '#60a5fa', '#e879f9', '#f472b6', '#a78bfa', '#2dd4bf', '#ff8a3d'];
const rdBat = (p) => p.stats.contact * 0.4 + p.stats.power * 0.4 + p.stats.speed * 0.2;
/* 수치 구간 색: 낮을수록 빨강, 높을수록 초록, 90 이상은 카드 최상위 등급과 같은 프리즘 */
/* 능력치 색 — 예전 눈금의 90·80·70·60·50 과 같은 자리 */
const rdTone = (v) => (v >= 100 ? 'prism' : v >= 90 ? '#34d399' : v >= 80 ? '#a3e635' : v >= 70 ? '#facc15' : v >= 59 ? '#f97316' : '#ef4444');
const rdToneStyle = (v) => (rdTone(v) === 'prism' ? undefined : { color: rdTone(v) });
const rdToneCls = (v) => (rdTone(v) === 'prism' ? 'prism-tx' : '');

/** 타순: batOrder 가 있으면 그 순서, 없으면 로스터 순서 (buildTeam 과 같은 규칙) */
const lineupOf = (roster) => withSlots(roster).map((p, i) => ({ p, i })).filter(({ p }) => !PITCH_SLOTS.includes(p.slot) && !isBenchSlot(p.slot))
  .sort((a, b) => (a.p.batOrder ?? 99 + a.i) - (b.p.batOrder ?? 99 + b.i)).map(({ p }) => p);

/** 정비 화면 지표: 경기 계산(buildTeam)과 같은 값 + 합계 · 타순 가중 */
function readyStats(roster, buff) {
  const t = buildTeam('나의 드림팀', roster, buff);
  const b = t.batters;
  const w = b.map((_, i) => RD_ORDER_W[i] ?? 0.9);
  const pitchers = [t.sps[0], ...t.pen].filter(Boolean);
  return {
    t, off: t.offense, def: t.defense, R: t.rightRatio, power: teamPower(t),
    flow: b.reduce((s, p, i) => s + rdBat(p) * w[i], 0) / (w.reduce((x, y) => x + y, 0) || 1),
    ace: t.sps[0] ? t.pitchValue(t.sps[0]) : 0,
    bull: avg(t.pen.map(t.pitchValue)),
    batSum: Math.round(b.reduce((s, p) => s + p.overall, 0)),
    defSum: Math.round(b.filter((p) => p.position !== 'DH').reduce((s, p) => s + p.stats.defense, 0)),
    pitSum: Math.round(pitchers.reduce((s, p) => s + p.overall, 0)),
  };
}

function RdDelta({ v, v0 }) {
  const d = Math.round(v - v0);
  return <span className={`rd-dl ${d > 0 ? 'up' : d < 0 ? 'dn' : ''}`}>{d ? `${d > 0 ? '▲' : '▼'}${Math.abs(d)}` : '±0'}</span>;
}
function RdFace({ player, className }) {
  const bust = useBust(player, '260%');
  return <span className={`rd-thumb ${className}`} style={bust}>{!bust && <Silhouette />}</span>;
}
const RdBatIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" style={{ width: 11, height: 11 }}><path d="M2.5 13.5l2-2M4 12L12.5 3.5a1.8 1.8 0 0 1 2.5 2.5L6.5 14.5z" fill="currentColor" /><circle cx="3" cy="3.5" r="1.8" fill="currentColor" /></svg>
);

/** 수비 · 투수 카드: 그림 위 포지션 칩과 종합, 아래 이름과 소속 (세 구역이 같은 카드 문법) */
function RdCard({ player, slot, ovr, off, moved, drop, gain, bind = {} }) {
  const bust = useBust(player, '260%');
  const dh = slot === 'DH', pitch = PITCH_SLOTS.includes(slot);
  const kind = dh ? 'dh' : off ? 'off' : pitch ? 'p' : '';
  return (
    <div {...bind} className={`rd-card ${kind} ${bind.className || ''}`}
      title={off ? `원래 ${moved} · 종합 ${player.overall} → ${drop}` : undefined}>
      <span className="art" style={bust}>{!bust && <Silhouette />}</span>
      <span className="sh" />
      <span className="top">
        <span className={`rd-pos ${kind}`}>{dh && <RdBatIcon />}{RD_CHIP[slot] || slot}</span>
        <b className={`ov ${rdToneCls(ovr)}`} style={rdToneStyle(ovr)}>{ovr}</b>
      </span>
      {gain > 0 && <span className="rd-gain">▲{gain}</span>}
      {player.condition != null && player.condition < 100 && (
        <span className="rd-cond" style={{ '--k': player.condition >= 85 ? '#a3e635' : player.condition >= 70 ? '#facc15' : '#fb923c' }} title={`컨디션 ${player.condition}% · 휴식 ${player.rest}경기 남음`}>
          <span className="bar"><i style={{ width: `${player.condition}%` }} /></span><b>{player.condition}%</b><em>−{player.rest}</em>
        </span>
      )}
      <span className="nmb"><b>{player.name}</b><small>{player.year} {player.team} · {player.hand}</small></span>
    </div>
  );
}

/**
 * 정비 화면: 왼쪽 타순 라인업 · 가운데 구장 위 수비 포지션 카드 · 오른쪽 투수 로테이션과 시너지.
 * 줄 · 카드를 차례로 누르거나 끌어다 놓으면 자리가 맞바뀐다.
 */
/* 구장 자리 이름: 드래프트(OF1·OF2·OF3) ↔ 라커 판(LF·CF·RF) */
const BOARD_SLOT = { OF1: 'LF', OF2: 'CF', OF3: 'RF' };
const DRAFT_SLOT = { LF: 'OF1', CF: 'OF2', RF: 'OF3' };
/* 라커 판의 불펜 순서 = 마무리 → 셋업 → 중간 → 롱릴리프 */
const PEN_ORDER = ['CL', 'SU', 'MR', 'LR'];

export function ReadyScreen({ roster, buff = 0, autoFilled = 0, opponent = null, onMove, onOrder, onReplace, onStart, onRestart, startLabel = '시즌 시작 ▶', restartLabel = '다시 드래프트' }) {
  const init = useRef(roster);
  const now = useMemo(() => readyStats(roster, buff), [roster, buff]);
  const was = useMemo(() => readyStats(init.current, buff), [buff]);
  const slotted = useMemo(() => withSlots(roster), [roster]);
  const lineup = useMemo(() => lineupOf(roster), [roster]);

  const benchIds = slotted.filter((p) => isBenchSlot(p.slot)).map((p) => p.id);
  const order = {
    lineup: lineup.map((p) => ({ id: p.id, slot: BOARD_SLOT[p.slot] || p.slot })),
    rotation: slotted.filter((p) => p.slot === 'SP').map((p) => p.id),
    bullpen: PEN_ORDER.map((sl) => slotted.find((p) => p.slot === sl)).filter(Boolean).map((p) => p.id),
  };
  const team = { name: '나의 드림팀', squad: roster, bench: benchIds, order, pitchFatigue: {} };

  /** 라커 판이 바꾼 순서를 드래프트 자리(slot) · 타순(batOrder)으로 되돌려 저장한다 */
  const commit = (next) => {
    const o = next?.order || order;
    const put = new Map();
    (o.lineup || []).forEach((x, i) => put.set(x.id, { slot: DRAFT_SLOT[x.slot] || x.slot, batOrder: i }));
    const pitchers = [...(o.rotation || []), ...(o.bullpen || [])];
    pitchers.forEach((id, i) => { if (i === 0) put.set(id, { slot: 'SP' }); else if (PEN_ORDER[i - 1]) put.set(id, { slot: PEN_ORDER[i - 1] }); });
    let bn = 0;
    onReplace(roster.map((p) => {
      const hit = put.get(p.id);
      if (hit) return { ...p, batOrder: undefined, ...hit };
      bn += 1;
      return { ...p, slot: `BN${bn}`, batOrder: undefined };
    }));
  };

  const play = new Set([...order.lineup.map((x) => x.id), ...order.rotation, ...order.bullpen]);
  const on = roster.filter((p) => play.has(p.id));
  const teamInfo = {
    ovr: on.length ? Math.round(on.reduce((s2, p) => s2 + p.overall, 0) / on.length) : 0,
    count: roster.length,
    cap: ROSTER_SIZE,
    foreign: roster.filter((p) => p.isForeign).length,
  };
  const d = (a, b) => Math.round(a - b);

  return (
    <ReadyLocker
      team={team} squad={roster} bench={benchIds} synergies={now.t.synergies} opponent={opponent} autoFilled={autoFilled}
      sums={{ bat: now.batSum, def: now.defSum, pit: now.pitSum }}
      teamInfo={teamInfo}
      onCommit={commit}
      onAutoLineup={() => commit({ order: autoArrange(roster, benchIds, {}) })}
      onReset={() => onReplace(init.current)}
      onStart={onStart} onRestart={onRestart} startLabel={startLabel} restartLabel={restartLabel} />
  );
}

/* 화면을 옮길 때 큰 그림이 뒤늦게 나타나며 번쩍이지 않도록, 한가할 때 미리 받아 둔다 */
const WARM_ART = [
  ...BANNERS.map((b) => `ui/teams/bg-${b.key}.webp`),
  'ui/broadcast-field.webp', 'ui/tour/tunnel.webp', 'ui/tour/panel-trophy.webp', 'ui/rank2/dusk.webp', 'ui/rank2/panel.webp',
];
function useWarmArt() {
  useEffect(() => {
    const t = setTimeout(() => WARM_ART.forEach((src) => { const img = new Image(); img.src = src; }), 600);
    return () => clearTimeout(t);
  }, []);
}

export default function KboAugmentDraft({ onExit, normal, normalView = null, onNormalView } = {}) {
  useWarmArt();
  // 드래프트 상태
  const [phase, setPhase] = useState('mode'); // mode | draft | ready | matchup | sim | result
  const [modeId, setModeId] = useState('champ'); // 고른 드래프트 모드
  const [match, setMatch] = useState({ cap: SALARY_CAP, ai: 'normal', aug: SEASON_AUGMENTS }); // 모드 화면 설정
  const mode = DRAFT_MODES.find((m) => m.id === modeId);
  const [roster, setRoster] = useState([]);
  const [cp, setCp] = useState(SALARY_CAP);
  const [rerolls, setRerolls] = useState(START_REROLLS);
  /* 상점에서 산 드래프트 권 — 계정에 쌓여 있고 판에서 한 장씩 쓴다 */
  const [tickets, setTickets] = useState(() => withDraftTickets(draftTickets()));
  const [seriesPick, setSeriesPick] = useState(false); // 시리즈 지정권 고르개가 열렸는지
  /* 상점에서 산 증강 권 — 리롤은 선택 창에서, 우대는 판이 열릴 때 한 번 */
  const [augTickets, setAugTickets] = useState(() => withAugTickets(augShopTickets()));
  const [augFavor, setAugFavor] = useState(false);   // 이번 판에 즐겨찾기 우대가 걸려 있는지
  const [buff, setBuff] = useState(0);
  const [augments, setAugments] = useState([]);
  const [series, setSeries] = useState(null); // 모드를 고르고 드래프트를 시작할 때 첫 시리즈가 열린다
  const [round, setRound] = useState(1); // 드래프트 라운드 (영입·교체 영입마다 +1, 방출해도 되돌아가지 않음)
  const [autoFilled, setAutoFilled] = useState(0); // 드래프트가 끝날 때 퓨처스 유망주로 채운 자리 수
  const [seenSeries, setSeenSeries] = useState([]); // 이번 드래프트에서 이미 열린 시리즈 — 모드의 시리즈를 다 돌기 전에는 다시 나오지 않는다
  /* 라이브 드래프트(8구단이 같은 보드를 스네이크로 나눠 갖는 판) — 규칙은 src/draft/live.js · null 이면 지금까지의 혼자 드래프트 */
  const [live, setLive] = useState(null);
  const [clock, setClock] = useState(Live.PICK_SECONDS); // 내 차례 남은 시간(초)
  const [skipNote, setSkipNote] = useState(false);       // 캡 소진 — 남은 라운드를 넘긴다는 알림
  const skipAt = useRef(null);                           // 남은 판을 접을 픽 번호 (이번 바퀴가 끝나는 자리)
  const [gone, setGone] = useState(() => new Set()); // 방금 지명돼 사라지는 중인 카드 (잠깐 구단 엠블럼이 덮인다)
  const [liveSpeed, setLiveSpeed] = useState(1); // 라이브 진행 배속 (1 · 2 · 4)
  const liveMine = live ? Live.myIndex(live) : -1;
  const myTurn = !live || Live.isMyTurn(live);
  /* 방금 지명된 카드가 엠블럼에 덮여 있는 동안에는 순서 띠가 그 구단에 머문다(바퀴가 넘어갔으면 예외).
     선반 빛 · 카드 테두리 같은 화면 표시도 띠와 같은 박자로 켜져야 눈이 따라간다 */
  const holdTurn = !!live && gone.size > 0 && Live.lapOf(live.pick, live.order.length) === Live.lapOf(Math.max(0, live.pick - 1), live.order.length);
  const myTurnLit = !live || (holdTurn ? Live.clubAt(live.pick - 1, live.order) === liveMine : myTurn);
  /** 이 선수를 지금 지명할 수 없는 이유 — 라이브면 다른 구단이 데려간 것과 막판 자리 강제까지 본다 */
  const lockOf = (p) => (live ? Live.lockReason(live, p, liveMine) : getLockReason(p, roster, cp, released));
  /** 다음 시리즈: 모드 안에서 영입 가능한 시리즈를 먼저, 모드 안에 더는 없으면(방출·교체로 늘어난 기회 등) 전체 시리즈에서 — 이미 나온 팀도 다시 나올 수 있다 */
  const nextSeries = (r, c, banned) => rollSeries(r, c, series?.id, banned, mode.series, seenSeries) || rollSeries(r, c, series?.id, banned, DRAFT_SERIES, seenSeries);
  /** 드래프트 종료: 빈 자리는 퓨처스 유망주(종합 70)로 자동으로 채우고 정비 화면으로 */
  const finishDraft = (r) => {
    const filled = fillRoster(r);
    setAutoFilled(filled.length - r.length);
    const g = live ? Gaunt.makeGauntlet(live) : null;   // 라이브 판이었으면 여덟 구단으로 도장깨기 탑을 세운다
    if (g) setGaunt(g);
    setRoster(filled); setSeries(null); setPicked(null);
    // 상대를 먼저 정한다 — 증강과 정비는 그 뒤에. 베이직은 탑, 스페셜은 매치업, 토너먼트는 대진표
    if (g) { prepareMatch(false, g); return; }
    if (tourMode) { setDtour(makeDraftTournament(filled)); setPhase('bracket'); return; }
    setOpponent(isNoCap(match.cap) ? specialAiRoster({ series: mode.series }) : aiDraft({ players: mode.players, cap: match.cap }));
    setPhase('matchup');
  };
  /** 영입·교체 뒤: 라운드를 다 썼거나 · 엔트리가 찼거나 · 캡 등으로 더 영입할 수 없으면 끝, 아니면 다음 라운드 */
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
  const lineupTapRef = useRef(null); // 내 라인업 필드의 자리 누르기 — 오른쪽 LINEUP 명단에서도 같은 동작을 부른다
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
  const PK_FLIP_MS = 260; // 한 번 뒤집기(반쪽 0.13초 × 2)
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
      timers.push(setTimeout(() => setPickLeave((l) => (l === leave ? null : l)), mode === 'sign' ? 240 : PK_FLIP_MS));
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
  const [dtour, setDtour] = useState(null); // 경기 방식이 16 · 32 · 64강이면 이 판의 토너먼트 (저장하지 않음)
  const [tourEntry, setTourEntry] = useState(null); // 대진표에서 고른 이번 상대 (정비를 거쳐 경기로 들고 간다)
  /* 도장깨기 — 라이브 드래프트로 뽑은 판에서는 토너먼트 대신 일곱 구단을 약한 순서로 하나씩 친다 */
  const [gaunt, setGaunt] = useState(null);
  const tourMode = !!match.format && match.format !== 'single';
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
  // 개발 전용 바로가기: ?demo=draft | ready | gauntlet | tourney16 · 32 · 64 | augment | matchup — 엔트리를 채워 그 단계 화면을 곧장 연다 (배포 빌드에서는 무시)
  // 페이지를 연 뒤 한 번만: 메인으로 나갔다가 플레이를 다시 눌러도 또 열리지 않게 주소에서 demo 를 지운다
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const url = new URL(window.location.href);
    const demo = url.searchParams.get('demo');
    if (!demo) return;
    url.searchParams.delete('demo');
    window.history.replaceState(null, '', url);
    if (demo === 'draft') { // 늘 같은 8명(2루수 · 외야 둘 · 마무리는 빈 자리)으로 9라운드 드래프트 화면 — 디자인 비교용
      const r = [['송승준', 2010], ['심창민', 2014], ['강민호', 2008], ['강진성', 2020], ['김동주', 2008], ['이종범', 1993], ['이용규', 2008], ['에반스', 2016]]
        .map(([n, y]) => ALL_PLAYERS.find((p) => p.name === n && p.year === y)).filter(Boolean);
      const c = Math.max(0, SALARY_CAP - r.reduce((s, p) => s + p.cost, 0));
      setRoster(r); setCp(c); setRound(r.length + 1); openSeries(nextSeries(r, c, [])); setPhase('draft');
      return;
    }
    const r = aiDraft();
    setRoster(r);
    const cpParam = Number(new URLSearchParams(window.location.search).get('cp'));
    setCp(cpParam > 0 ? cpParam : Math.max(0, SALARY_CAP - r.reduce((s, p) => s + p.cost, 0))); // ?cp=300 으로 잔여 CP를 정해 정비 화면 교체를 시험한다
    setSeries(null);
    if (demo === 'gauntlet') { // 라이브 판을 끝까지 자동으로 돌려 도장깨기 탑만 바로 본다
      let s0 = Live.createLive({ cap: match.cap, series: mode.series, myEmblem: Live.bannerEmblem(myBanner()) });
      let g = 0;
      while (!Live.isDone(s0) && g++ < Live.CLUB_COUNT * ROSTER_SIZE + 10) s0 = Live.pick(s0, Live.autoPick(s0), { auto: true });
      setLive(s0); setRoster(fillRoster(Live.myRoster(s0))); setGaunt(Gaunt.makeGauntlet(s0)); setPhase('gauntlet');
    }
    if (demo === 'ready') setPhase('ready');
    if (/^tourney(16|32|64)$/.test(demo)) { // 대진표부터 — 상대를 보고 정비로 들어가는 차례 그대로
      const size = Number(demo.slice(7));
      setMatch((m) => ({ ...m, aug: 0, format: size }));
      setPhase('ready');
    }
    if (demo === 'crisis') { // 승부처 제구 미니게임만 바로 띄워 보기
      const opp = aiDraft().filter((p) => p.type === 'batter').sort((a, b) => b.stats.power - a.stats.power)[0];
      setPhase('sim');
      setClutch({ kind: 'crisis', inning: 9, isTop: true, score: { my: 4, opp: 3 }, batter: opp, pitcher: r.find((p) => p.type !== 'batter'), pitch: 86, resolve: (g) => console.log('crisis', g) });
    }
    if (demo === 'clutch') { // 승부처 타격 미니게임만 바로 띄워 보기
      const bat = r.filter((p) => p.type === 'batter').sort((a, b) => b.stats.contact - a.stats.contact)[0];
      setPhase('sim');
      setClutch({ kind: 'chance', inning: 9, isTop: false, score: { my: 3, opp: 4 }, batter: bat, pitcher: r.find((p) => p.type !== 'batter'), pitch: 86, resolve: (g) => console.log('clutch', g) });
    }
    if (demo === 'augment') { setPhase('sim'); setAugPicksLeft(SEASON_AUGMENTS); setChoice({ kind: 'augment', options: rollAugmentOptions(), free: FREE_REROLL }); }
    if (demo === 'matchup') { setAugments(shuffle(AUGMENTS).slice(0, SEASON_AUGMENTS)); setOpponent(aiDraft()); setPhase('matchup'); }
  }, []);

  const full = roster.length >= ROSTER_SIZE;
  const canPickAny = useMemo(() => (live ? true : ALL_PLAYERS.some((p) => !getLockReason(p, roster, cp, released))), [roster, cp, released, live]);
  const seriesCards = useMemo(() => (series
    ? [...series.players].sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position) || b.overall - a.overall)
    : []), [series]);
  const [shelfFilter, setShelfFilter] = useState('open'); // 선반: 영입 가능만(기본) · 전부
  const [reveal, setReveal] = useState(null); // 보기 단추를 눌러 카드가 드러나는 중('in') · 숨는 중('out')
  const revealRef = useRef(0);
  const [posFilter, setPosFilter] = useState(null); // 내 라인업의 자리를 누르면 { slot, pos } — 선반에 그 포지션만
  const [shelfLeaving, setShelfLeaving] = useState(null); // 거르기로 빠지는 카드 id — 잠깐 사라지는 효과 뒤에 실제로 거른다
  const leaveTimerRef = useRef(null);
  // 곧 바뀔 거르기 자리(빠지는 카드를 기다리는 0.18초 동안). 라인업의 지정 표시는 기다리지 않고 이 값을 바로 따른다 — 옛 자리 해제가 늦어 두 자리가 동시에 지정돼 보이지 않게
  const [pendingSlot, setPendingSlot] = useState(undefined);
  const shelfRef = useRef(null);
  const flipRef = useRef(null); // 거르기 직전 카드 위치 (id → rect) — 거른 뒤 남은 카드가 새 자리로 미끄러지게(FLIP)
  /** 보기 단추로 감추는 대상 — 라이브에서는 남이 데려간 선수만. 내 자리가 차서 못 뽑는 선수는 남겨 둬야 다른 구단이 그 자리를 채우는 것이 보인다 */
  const hideTarget = (pl) => (live ? Live.takenBy(live, pl) != null : !!lockOf(pl));
  /** 이 카드를 지금 선반에 보일지 — 감춘 카드는 빈 칸으로 남아 남은 카드의 크기와 자리가 변하지 않는다 */
  const hiddenCard = (pl) => {
    if (gone.has(pl.id)) return false;               // 지명돼 사라지는 중인 카드는 끝까지 보여 준다
    if (reveal === 'out' && hideTarget(pl)) return false; // 숨는 효과가 도는 동안은 아직 보인다
    return shelfFilter === 'open' && hideTarget(pl);
  };
  const shownCards = seriesCards.filter((p) => !posFilter?.pos || p.position === posFilter.pos);
  const shelfCols = Math.max(17, seriesCards.length); // 칸 수는 이 보드 인원으로 고정 — 거르기를 해도 카드가 커지지 않는다
  /** 자리 거르기 바꾸기: 빠질 카드는 먼저 사라지고(0.18초) 남는 카드가 다시 차례로 떠오른다. slot=null 이면 해제 */
  const handleSlotFilter = (slot, force = false) => {
    const cur = pendingSlot !== undefined ? pendingSlot : (posFilter?.slot ?? null);
    const next = slot == null || (!force && cur === slot) ? null : { slot, pos: slotPos(slot) };
    if ((next?.slot ?? null) === cur) return;
    const keep = new Set(seriesCards.filter((p) => !hiddenCard(p)).filter((p) => !next?.pos || p.position === next.pos).map((p) => p.id));
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
  /* 선택지 뽑기 — 지명해 둔 증강은 한 번만 끼고 바로 지운다 */
  const augmentOptions = (owned) => {
    const pledge = pledgedAugId();
    const out = rollAugmentOptions(owned, Math.random, { pledge, favor: augFavor });
    if (pledge && out.some((a) => a.id === pledge)) setPledgedAug(null);
    return out;
  };
  /* 다시 굴리기 — 거저 주는 한 번을 먼저 쓰고, 떨어지면 리롤권을 쓴다 */
  const rerollAugments = () => {
    if (!choice || choice.kind !== 'augment') return;
    const roll = (c) => ({ ...c, options: rollAugmentOptions(augments, Math.random, { favor: augFavor }) });
    if ((choice.free || 0) > 0) {
      setChoice((c) => (c && c.kind === 'augment' ? { ...roll(c), free: (c.free || 0) - 1 } : c));
      return;
    }
    if (!spendAugTicket('reroll')) return;
    setAugTickets(withAugTickets(augShopTickets()));
    setChoice((c) => (c && c.kind === 'augment' ? roll(c) : c));
  };
  const midPickRef = useRef(null); // 경기 중 증강 선택을 기다리는 resolve
  const [clutch, setClutch] = useState(null); // 승부처 개입 대기 { kind, inning, isTop, score, resolve }
  const [play, setPlay] = useState(null); // 그라운드 중계의 지금 타석
  const [liveTeams, setLiveTeams] = useState(null); // 중계 화면에 넘길 두 팀
  const pickClutch = (grade) => { const c = clutch; setClutch(null); c?.resolve(grade); };
  const myTeam = useMemo(() => buildTeam('나의 드림팀', fillRoster(roster), buff), [roster, buff]);

  /* 드래프트 핸들러: 판정 레이어 → 영입 → 다음 라운드 / 증강 / 이벤트 */
  const handleSelectPlayer = useCallback((player) => {
    if (phase !== 'draft' || choice) return;
    if (live && !Live.isMyTurn(live)) return; // 라이브: 내 차례가 아니면 아무것도 지명하지 않는다
    const reason = lockOf(player);
    if (reason) {
      setShake(player.id);
      setTimeout(() => setShake((s) => (s === player.id ? null : s)), 320);
      return;
    }
    setPicked(null);
    setFocusSynergy(null); // 다음 라운드로 넘어가면 시너지 강조는 풀고 다시 고르게 한다
    if (live) { // 라이브: 내 지명도 판에 넣고 차례를 넘긴다 (다음 보드·라운드는 판이 정한다)
      const next = Live.pick(live, player);
      if (next === live) return;
      setLive(next);
      setRoster(Live.myRoster(next));
      setCp(next.clubs[liveMine].cp);
      setRound(Live.myRoster(next).length + 1);
      return;
    }
    const next = [...roster, { ...player, slot: freeSlot(roster, player.position).id }];
    const nextCp = cp - player.cost;
    setRoster(next);
    setCp(nextCp);
    advanceRound(next, nextCp, released); // 끝나면 정비 화면(증강은 시즌을 시작할 때 고른다)
  }, [phase, choice, roster, cp, augments, series, released, mode, seenSeries, round, live, liveMine]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 라이브 드래프트 진행: 다른 구단 차례는 잠깐 뜸을 들였다 스스로 뽑고, 내 차례에는 시계가 돈다 ── */
  useEffect(() => { // 보드(시리즈)는 판이 정한다
    if (live && phase === 'draft' && !Live.isDone(live)) setSeries(Live.currentSeries(live));
  }, [live, phase]);
  useEffect(() => { // AI 차례
    if (!live || phase !== 'draft' || choice || skipNote || Live.isDone(live) || Live.isMyTurn(live)) return undefined;
    // 한 픽 사이 1초 — 구단마다 같은 간격으로 (배속을 올리면 그만큼 짧아진다)
    const t = setTimeout(() => setLive((s) => (s && !Live.isMyTurn(s) && !Live.isDone(s) ? Live.stepAi(s) : s)), 1000 / liveSpeed);
    return () => clearTimeout(t);
  }, [live, phase, choice, liveSpeed]);
  useEffect(() => { // 내 차례: 25초 시계 · 고를 선수가 없으면 곧바로 패스 · 시간을 넘기면 알아서 한 명
    if (!live || phase !== 'draft' || choice || skipNote || Live.isDone(live) || !Live.isMyTurn(live)) return undefined;
    if (!Live.pickable(live, liveMine).length) { const p = setTimeout(() => setLive((s) => Live.pick(s, null)), 700); return () => clearTimeout(p); }
    setClock(Live.PICK_SECONDS);
    const id = setInterval(() => setClock((c) => {
      if (c > 1) return c - 1;
      clearInterval(id);
      setLive((s) => (s && Live.isMyTurn(s) ? Live.pick(s, Live.autoPick(s, Live.myIndex(s)), { auto: true }) : s));
      return 0;
    }), 1000);
    return () => clearInterval(id);
  }, [live, phase, choice, liveMine]);
  useEffect(() => {
    /* 캡을 다 써 더 데려올 수 없으면 이번 바퀴까지만 보고, 알림을 띄운 뒤 남은 라운드를 한 번에 넘긴다 */
    if (!live || phase !== 'draft' || choice || Live.isDone(live)) { skipAt.current = null; return undefined; }
    if (skipAt.current == null) {
      if (!Live.cannotPickMore(live)) return undefined;
      const lap = Live.CLUB_COUNT;
      skipAt.current = Math.ceil(live.pick / lap) * lap;   // 지금 바퀴가 끝나는 픽
    }
    if (live.pick < skipAt.current) return undefined;      // 아직 이번 바퀴가 돌고 있다
    setSkipNote(true);
    const t = setTimeout(() => {
      skipAt.current = null;
      setSkipNote(false);
      setLive((s) => (s && !Live.isDone(s) ? Live.finishAll(s) : s));
    }, 1000);
    return () => clearTimeout(t);
  }, [live, phase, choice]);
  useEffect(() => { // 자동 지명으로 내 선수가 늘었으면 화면의 엔트리도 따라간다
    if (!live || phase !== 'draft') return;
    const mine = Live.myRoster(live);
    if (mine.length !== roster.length) { setRoster(mine); setCp(live.clubs[liveMine].cp); setRound(mine.length + 1); }
  }, [live, phase]); // eslint-disable-line react-hooks/exhaustive-deps
  /* 누가 지명하면 그 카드에 구단 엠블럼이 덮였다가 0.98초 뒤 벗겨진다.
     타이머는 카드마다 따로 둔다 — 다음 지명이 곧바로 이어져도 앞 카드의 엠블럼이 남지 않게 */
  const goneTimers = useRef([]);
  useEffect(() => () => goneTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    const last = live?.picks[live.picks.length - 1];
    if (!last) return;
    const id = last.player.id;
    setGone((g) => new Set(g).add(id));
    goneTimers.current.push(setTimeout(() => setGone((g) => { const n = new Set(g); n.delete(id); return n; }), 1020 / liveSpeed));
  }, [live?.picks.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // 판이 끝나면 지금까지처럼 정비 화면으로
    if (live && phase === 'draft' && Live.isDone(live)) finishDraft(Live.myRoster(live));
  }, [live, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 내 차례가 올 때까지 단숨에 진행 (마지막 한 장만 사라지는 연출을 본다) */
  const skipToMyTurn = () => {
    if (!live || Live.isMyTurn(live) || Live.isDone(live)) return;
    setLive((s0) => { let s1 = s0; let guard = 0; while (!Live.isMyTurn(s1) && !Live.isDone(s1) && guard++ < Live.CLUB_COUNT * 2) s1 = Live.stepAi(s1); return s1; });
  };

  const handleChoose = (option) => {
    if (choice.kind === 'augment' && choice.inning) {
      const owned = [...augments, option];
      setAugments(owned);
      setChoice(null);
      const resolve = midPickRef.current;
      midPickRef.current = null;
      resolve?.(owned);
      return;
    }
    if (choice.kind === 'augment') {
      const owned = [...augments, option];
      const left = augPicksLeft - 1;
      setAugments(owned);
      setAugPicksLeft(left);
      setChoice(left > 0 ? { kind: 'augment', options: augmentOptions(owned), free: FREE_REROLL } : null);
      if (left <= 0) {                                   // 마지막 증강을 고르면 경기로
        if (gaunt && !gaunt.done) gauntletGo(owned);
        else if (!live && opponent) startGame(true, owned.slice(0, match.aug), tourEntry);
        else prepareMatch(false);
      }
      return;
    }
    const s = option.apply({ cp, rerolls, buff });
    setCp(Math.max(0, s.cp));
    setRerolls(s.rerolls);
    setBuff(s.buff);
    setChoice(null);
  };

  /* 권 한 장 쓰기 — 계정에서 빼고 화면 수를 다시 읽는다 */
  const spendTicket = (key) => {
    if (!spendDraftTicket(key)) return false;
    setTickets(withDraftTickets(draftTickets()));
    return true;
  };
  const useReport = () => { if (phase === 'draft' && spendTicket('reroll')) setRerolls((r) => r + 3); };
  const useProtect = () => {
    if (!live || !picked || Live.takenBy(live, picked) != null || live.protect) return;
    if (spendTicket('protect')) setLive((x) => Live.protectPlayer(x, picked));
  };
  const useAgent = () => { if (live && !live.agent && spendTicket('agent')) setLive((x) => Live.useAgent(x)); };
  const useSeriesTicket = (chosen) => {
    setSeriesPick(false);
    if (!live || !chosen) return;
    if (spendTicket('series')) setLive((x) => Live.setBoardSeries(x, chosen));
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
  /* 정비 화면 타순: 선수 id 순서대로 batOrder 를 매긴다 */
  const handleOrder = (ids) => setRoster((r) => r.map((p) => (ids.includes(p.id) ? { ...p, batOrder: ids.indexOf(p.id) } : p)));

  /* 경기 시작: AI 드래프트 → 비동기 시뮬레이션 루프 */
  /* 시즌 시작: 경기 화면으로 들어가 증강을 고르고, 다 고르면 첫 경기가 열린다 */
  /** 시즌 증강 고르기 판 — 다 고르면 handleChoose 가 다음으로 넘긴다 */
  const openAugmentPicks = () => {
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
  const startSeason = (g = gaunt) => {
    if (augments.length >= match.aug) { prepareMatch(!!opponent, g); return; }
    openAugmentPicks();
  };

  /* 경기 전 매치업 화면: 상대를 정해(재경기면 그대로) 두 팀을 비교한 뒤 경기 시작 */
  const prepareMatch = (rematch = false, g = gaunt) => {
    runIdRef.current += 1;
    if (g && !g.done) { // 도장깨기: 탑으로 (지금 칠 단을 고르고 시작한다)
      setChoice(null);
      setToast(null);
      setPhase('gauntlet');
      return;
    }
    if (tourMode) { // 토너먼트: 대진표로 (끝난 판이면 새 대진)
      if (!dtour || dtour.done) setDtour(makeDraftTournament());
      setChoice(null);
      setToast(null);
      setPhase('bracket');
      return;
    }
    // 라이브 판이었으면 그 판의 구단, 스페셜이면 나와 같은 방식으로 시리즈를 굴려 꾸린 팀
    if (!(rematch && opponent)) {
      setOpponent(live
        ? Live.rosterOf(live, Live.opponentOf(live))
        : isNoCap(match.cap) ? specialAiRoster({ series: mode.series }) : aiDraft({ players: mode.players, cap: match.cap }));
    }
    setChoice(null);
    setToast(null);
    setPhase('matchup');
  };

  /*
   * 드래프트 토너먼트 참가 팀: 모드 안의 구단 시즌 · 국가대표 · 레전드 시리즈마다 그 멤버 안에서만 같은 캡으로 AI 가 드래프트한 팀.
   * 시리즈가 모자라면 남는 자리는 모드 전체 선수로 드래프트한 팀. 대진은 비슷한 전력끼리 첫 판에서 만나게(흔들림 조금)
   */
  const makeDraftTournament = (myRoster = roster) => {
    const size = match.format;
    const others = [];
    // 전력 보정: 구단 멤버만으로 뽑은 팀은 모드에 따라 훨씬 강하거나 약하다(레전드 테마 시리즈 등). 표시 종합 · 선수 능력치는 그대로 두고 경기 보정만
    const baseline = Array.from({ length: 6 }, () => playStrength(buildTeam('', fillRoster(aiDraft({ players: mode.players, cap: match.cap }))))).reduce((a, b) => a + b, 0) / 6;
    const handicap = (team) => { team.buff += Math.max(-HANDICAP_MAX, Math.min(HANDICAP_MAX, Math.round(baseline - playStrength(team)))); return team; };
    // 구단 팀: 그 멤버로 15명 이상 뽑히는 시리즈만 (너무 적으면 유망주로 채워진 빈 팀이 된다)
    for (const series of shuffle(mode.series.filter((x) => x.id !== LEGEND_SERIES.id))) {
      if (others.length >= size - 1) break;
      const roster = aiDraft({ players: series.players, cap: match.cap });
      if (roster.length < 15) continue;
      const name = seriesName(series);
      others.push({ id: `dr-${others.length}`, name, roster, seriesId: series.id, team: handicap(buildTeam(name, fillRoster(roster), AI_BUFF[match.ai])) });
    }
    const owners = new Set();
    while (others.length < size - 1) {
      let owner = ownerOf(Math.random);
      while (owners.has(owner)) owner = ownerOf(Math.random);
      owners.add(owner);
      const roster = aiDraft({ players: mode.players, cap: match.cap });
      const name = `${owner} 드림팀`;
      others.push({ id: `dr-${others.length}`, name, roster, team: buildTeam(name, fillRoster(roster), AI_BUFF[match.ai]) });
    }
    const mine = { me: true, team: buildTeam('나의 드림팀', fillRoster(myRoster), buff, augments) };
    const order = seedByStrength([...others, mine], (e) => playStrength(e.team) + (e.team.buff || 0));
    const meAt = order.indexOf(mine);
    return makeTournament({ size, myName: '나의 드림팀', others: order.filter((e) => e !== mine), meAt });
  };

  /* 도장깨기: 지금 칠 칸(내 바로 윗 칸)의 구단과 경기를 연다 */
  const inGauntlet = !!gaunt && !gaunt.done && !!Gaunt.currentRung(gaunt);
  /** 로스터 하나를 정비 왼쪽 스카우팅 판이 읽는 모양으로 */
  const scoutOf = ({ roster: ros, name, color, emblem }) => {
    const full = fillRoster(ros);
    const by = {};
    full.forEach((pl) => { if (pl.slot) by[pl.slot] = pl; });
    const batSlots = FIELD_SLOTS.filter((x) => !PITCH_SLOTS.includes(x.id)).map((x) => x.id);
    return { name, color, emblem, roster: full, starter: by.SP || null, batters: batSlots.map((id) => by[id]).filter(Boolean) };
  };
  /** 스페셜: 지금 붙을 AI 팀 */
  const specialOpponent = () => (opponent ? scoutOf({
    roster: opponent,
    name: isNoCap(match.cap) ? `${rosterOrigin(opponent)} 연합` : 'AI 올스타',
    color: '#f87171',
    emblem: Live.bannerEmblem('legend'),
  }) : null);
  /** 스페셜: 정비에서 누르는 경기 시작 — 증강을 아직 안 골랐으면 먼저 고른다 */
  const startSpecialMatch = () => {
    if (augments.length < match.aug) { openAugmentPicks(); return; }
    startGame(true, augments.slice(0, match.aug), tourEntry);
  };
  /** 정비 왼쪽 스카우팅 판에 넣을 상대 — 이름 · 엠블럼 · 선발 · 타순까지 */
  const gauntOpponent = () => {
    const r = Gaunt.currentRung(gaunt);
    if (!r) return null;
    const full = fillRoster(r.roster);
    const by = {};
    full.forEach((pl) => { if (pl.slot) by[pl.slot] = pl; });
    const batSlots = FIELD_SLOTS.filter((x) => !PITCH_SLOTS.includes(x.id)).map((x) => x.id);
    return {
      name: r.name,
      color: r.color,
      emblem: r.key ? Live.emblemOf(r.key) : Live.bannerEmblem(myBanner()),
      roster: full,
      starter: by.SP || null,
      batters: batSlots.map((id) => by[id]).filter(Boolean),
    };
  };
  const gauntletGo = (owned) => {
    const r = Gaunt.currentRung(gaunt);
    startGame(false, owned.slice(0, match.aug), { roster: r.roster, team: buildTeam(r.name, fillRoster(r.roster), AI_BUFF[match.ai]) });
  };
  const startGauntletMatch = () => {
    if (augments.length < match.aug) { openAugmentPicks(); return; }  // 시즌 증강을 아직 안 골랐으면 여기서 고른다
    gauntletGo(augments);
  };

  /* entry: 토너먼트 상대(그 팀 그대로) */
  const startGame = (rematch = false, owned = augments.slice(0, match.aug), entry = null) => {
    setAugments(owned); // 지난 경기 중에 고른 증강은 그 경기에서만 — 시즌 증강만 남긴다
    setClutch(null);
    setPlay(null);
    const oppRoster = entry ? entry.roster
      : rematch && opponent ? opponent
        : isNoCap(match.cap) ? specialAiRoster({ series: mode.series }) : aiDraft({ players: mode.players, cap: match.cap });
    setOpponent(oppRoster);
    const opp = entry ? entry.team
      : buildTeam(isNoCap(match.cap) ? `${rosterOrigin(oppRoster)} 연합` : 'AI 올스타', fillRoster(oppRoster), AI_BUFF[match.ai]);
    // 효과형 증강은 고르는 순간부터 능력치 · 투수 운용을 바꾼다 (상대 · 전적을 보는 증강까지)
    const env = teamEnv(opp, record);
    const makeMy = (augs) => buildTeam('나의 드림팀', fillRoster(roster), buff, augs, env);
    const liveMy = makeMy(owned);
    setLiveTeams({ my: liveMy, opp, makeMy, augments: owned, aug: makeAugmentRuntime({ augments: owned, my: liveMy, opp, record }) });
    runIdRef.current += 1;
    setBoard(emptyBoard());
    setHalf(null);
    setLogs([]);
    setResult(null);
    setToast(null);
    setPaused(false);
    setPhase('live'); // 공 하나 단위 중계 화면
  };

  /* 중계 화면이 끝나면 기존 결과 화면으로 */
  const finishLive = (res) => {
    setLiveTeams(null);
    if (gaunt && !gaunt.done) { // 도장깨기: 이기면 다음 단, 지면 같은 단을 다시
      setGaunt((g) => Gaunt.settle(g, { win: res.winner === 'my', my: res.score?.my, opp: res.score?.opp }));
      setRecord((r) => ({ w: r.w + (res.winner === 'my'), l: r.l + (res.winner === 'opp'), d: r.d + (res.winner === 'draw') }));
      setResult(res);
      setLogs(res.logs);
      setBoard(res.board);
      setPhase('result');
      return;
    }
    if (tourMode && dtour && !dtour.done) { // 토너먼트: 결과를 넣고 대진표로
      setTourEntry(null);
      setDtour(advanceTourney(dtour, res.score, buildTeam('나의 드림팀', fillRoster(roster), buff, augments)));
      setRecord((r) => ({ w: r.w + (res.winner === 'my'), l: r.l + (res.winner === 'opp'), d: r.d + (res.winner === 'draw') }));
      setPhase('bracket');
      return;
    }
    setResult(res);
    setLogs(res.logs);
    setBoard(res.board);
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
    /* 라이브: 8구단이 같은 보드를 나눠 갖는 판을 열고 첫 보드를 선반에 올린다 */
    const me = loadAccount();
    const banner = myBanner(); // 프로필에서 고른 배너 구단 — 내가 지명한 카드에 그 구단 그림이 뜬다
    const useFirst = !!(cfg.live && cfg.firstPick && spendDraftTicket('first'));
    const favorOn = !!(cfg.augFavor && spendAugTicket('favor'));
    setAugFavor(favorOn);
    setAugTickets(withAugTickets(augShopTickets()));
    setTickets(withDraftTickets(draftTickets()));
    setSeriesPick(false);
    const liveNow = cfg.live ? Live.createLive({
      cap: cfg.cap, series: m.series, firstPick: useFirst,
      myName: me?.team?.name || me?.nick || '나의 드림팀',
      myShort: me?.nick,
      myColor: flagByKey(banner)?.color || '#e879f9',
      myEmblem: Live.bannerEmblem(banner),
    }) : null;
    setLive(liveNow); setClock(Live.PICK_SECONDS);
    const first = liveNow ? Live.currentSeries(liveNow) : rollSeries([], cfg.cap, null, [], m.series);
    setSeries(first); setSeenSeries(first ? [first.id] : []); setAugPicksLeft(0); setChoice(null);
    // 지난 판의 상대 · 탑 · 대진은 모두 버린다 (베이직을 하다 스페셜을 시작해도 도장깨기가 따라오지 않게)
    setOpponent(null); setDtour(null); setGaunt(null); setTourEntry(null); setSkipNote(false); setGone(new Set()); setShelfFilter('open');
    setBoard(emptyBoard()); setHalf(null); setLogs([]); setToast(null); setResult(null); setRecord({ w: 0, l: 0, d: 0 });
    setPhase('draft');
  };

  /* 시리즈 지정권 고르개에 올릴 목록 — 이번 모드의 시리즈 중 사람이 열 만한 것 */
  const seriesChoices = useMemo(() => (mode?.series || DRAFT_SERIES).filter((x) => x.players.length >= Live.BOARD_SIZE), [mode]);

  /* 지금 이 선수를 데려오는 값 — 협상 대리인을 켜 두었으면 깎인 값 */
  const costNow = (p) => (live ? Live.costOf(live, p, liveMine) : p.cost);

  const fireCount = (a) => logs.filter((l) => l.kind === 'augment' && l.text.startsWith(`[증강 발동: ${a.name}!]`)).length;
  const btnGhost = 'ui-btn ui-cut';
  const btnPrimary = `${btnGhost} pri`;
  const pickedReason = picked ? lockOf(picked) : null;
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
    <div className={`min-h-screen bg-[#05080f] font-sans text-gray-100 antialiased ${phase === 'draft' || phase === 'mode' || phase === 'ready' || phase === 'matchup' ? 'lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden' : ''}`}>
      <style>{KEYFRAMES}</style>
      <div className={`ui-bg ${phase === 'sim' ? 'soft' : ''}`} style={{ backgroundImage: `url(ui/${PHASE_BG[phase]}.webp)` }} aria-hidden="true" />
      {phase === 'mode' && (
        <ModeSelect initialMode={modeId} onStart={startDraft} onExit={onExit} normal={normal} normalView={normalView} onNormalView={onNormalView}
          record={record.w + record.l + record.d ? `${record.w}승 ${record.l}패${record.d ? ` ${record.d}무` : ''} · ${mode.name}` : null} />
      )}
      {skipNote && (
        <div className="pointer-events-none fixed inset-x-0 top-[22vh] z-40 flex justify-center px-4" aria-live="assertive">
          <div className="ui-cut flex items-center gap-3 px-6 py-3.5 animate-[rise_.3s_ease-out_both]"
            style={{ '--c': '12px', background: 'rgba(8,12,20,.94)', boxShadow: 'inset 0 0 0 1px rgba(251,191,36,.5), 0 18px 40px rgba(0,0,0,.6)' }}>
            <b className="font-display text-lg tracking-[0.12em] text-[#fbbf24]">샐러리 캡 소진</b>
            <span className="h-4 w-px bg-white/20" />
            <b className="text-[0.95rem] text-[#e8ecf2]">남은 라운드를 건너뜁니다</b>
          </div>
        </div>
      )}
      {phase === 'gauntlet' && gaunt && (
        <GauntletScreen gaunt={gaunt}
          me={{ name: live ? live.clubs[Live.myIndex(live)].name : '나의 드림팀', short: live ? live.clubs[Live.myIndex(live)].short : '나', emblem: Live.bannerEmblem(myBanner()), stats: Gaunt.teamStats(roster) }}
          onBack={newDraft}
          onPlay={() => setPhase('ready')} />
      )}
      {phase === 'bracket' && dtour && (
        <div className="fixed inset-0 z-30">
          <TournamentBracket t={dtour} myTeam={buildTeam('나의 드림팀', fillRoster(roster), buff, augments)} title={`${mode.name} 토너먼트`} rewards={false} playLabel="정비하기 ▶"
            onBack={() => setPhase('ready')}
            onPlay={() => { const e = tourneyOpponent(dtour); setTourEntry(e); setOpponent(e?.roster || null); setPhase('ready'); }}
            onRestart={() => setDtour(makeDraftTournament())} />
        </div>
      )}

      {phase !== 'mode' && phase !== 'bracket' && phase !== 'gauntlet' && (
        <CapDashboard round={phase === 'draft' ? round : roster.length} cp={cp} cap={match.cap} roster={roster} phase={phase} onOpenRules={() => setModal('rules')} wide={phase === 'draft'} slim={phase === 'draft'} modeName={mode.name} modeNeon={mode.neon}
          onExit={onExit} capAfter={phase === 'draft' && picked ? (swapPlan ? (swapPlan.reason ? null : cp + swapPlan.refund - picked.cost) : (pickedReason ? null : cp - picked.cost)) : null} />
      )}

      {phase !== 'mode' && phase !== 'bracket' && phase !== 'gauntlet' && (
      <main className={`relative mx-auto grid px-4 ${phase === 'draft' || phase === 'ready' || phase === 'matchup'
        ? 'w-full max-w-[1920px] gap-3 py-3 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)]'
        : 'w-full max-w-[1600px] gap-5 py-5'}`}>
        <div className="flex min-w-0 flex-col gap-5 lg:min-h-0">
          {phase === 'draft' && (
            // --card-w: 선수 카드 폭의 상한(창 높이 기준). 실제 폭은 선반 그리드가 판 안쪽 폭을 17칸으로 나눠 정하고 가운데 정렬 — 좌우 여백이 늘 같다
            <section className="flex flex-col gap-3 lg:min-h-0 lg:flex-1" style={{ '--card-w': 'clamp(4.2rem, 13vh, 8rem)' }}>
              {!canPickAny && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-3">
                  <p className="text-sm text-yellow-100">영입 가능한 선수가 남아 있지 않습니다. 빈 자리는 퓨처스 유망주(종합 70)로 채워집니다.</p>
                  <button type="button" className={btnPrimary} onClick={() => finishDraft(roster)}>이대로 정비하러 가기</button>
                </div>
              )}
              {/* 시리즈 묶음: 한 줄 머리 + 선수 카드 (중계 그래픽 판) */}
              <div className={`bc-grp lg:!px-1.5 ${live && myTurnLit ? 'myturn' : ''}`}
                style={series ? { '--a': SERIES_NEON[series.kind], ...(live ? { '--me': live.clubs[liveMine].color } : {}) } : undefined}>
                <span className="bc-label font-display">SERIES</span>
              {series && (
                /* 시리즈 머리: 윤곽선 연도 워터마크 · 종류 · 팀명(네온 밑줄) · 한 줄 설명 태그 | 선반 보기 전환 · 새로고침 */
                <div key={series.id} className="ser-hd mb-2 flex animate-[rise_.35s_ease-out_both] flex-wrap items-center gap-x-3 gap-y-2 px-1.5 lg:flex-nowrap">
                  <span className="ser-wm font-display" aria-hidden="true">{series.year ?? 'LEGEND'}</span>
                  {!live && <DraftMeta round={round} cp={cp} cap={match.cap} capAfter={picked ? (swapPlan ? (swapPlan.reason ? null : cp + swapPlan.refund - costNow(picked)) : (pickedReason ? null : cp - costNow(picked))) : null} />}
                  <div className="ser-ttl">
                    <span className="ser-kind">{SERIES_KIND_LABEL[series.kind]}</span>
                    <h2 className="ser-name">{series.year && <span className="sr-only">{series.year}년 </span>}{series.title}</h2>
                    {series.subtitle && <span className="ser-sub">{series.subtitle}</span>}
                  </div>
                  <div className={`ml-auto flex shrink-0 gap-2.5 ${live ? 'flex-col items-end gap-y-0.5' : 'items-center'}`}>
                    {posFilter?.pos && (
                      <button type="button" className="ser-pf" onClick={() => handleSlotFilter(null)} aria-label={`${SLOTS.find((s) => s.id === posFilter.slot)?.label} 자리 선수만 보기 해제`}>
                        {SLOTS.find((s) => s.id === posFilter.slot)?.label} 자리 <span aria-hidden="true">✕</span>
                      </button>
                    )}
                    {!live && <button type="button" className="ser-sw" aria-pressed={shelfFilter === 'all'} onClick={() => setShelfFilter((f) => {
                      const next = f === 'open' ? 'all' : 'open';
                      setReveal(next === 'all' ? 'in' : 'out');
                      clearTimeout(revealRef.current);
                      revealRef.current = setTimeout(() => setReveal(null), next === 'all' ? 520 : 380);
                      return next;
                    })}>
                      <span className="tr" aria-hidden="true" />전체보기 {shelfFilter === 'all' ? 'ON' : 'OFF'}
                    </button>}
                    {live ? null : (
                      <>
                    <span className="h-5 w-px bg-white/10" aria-hidden="true" />
                    <button type="button" onClick={handleReroll} disabled={rerolls <= 0} className="ser-refresh"
                      title={rerolls > 0 ? `다른 시리즈로 새로고침 · ${rerolls}회 남음` : '남은 새로고침 없음'} aria-label={`다른 시리즈로 새로고침, ${rerolls}회 남음`}>
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M16.2 10.4A6.2 6.2 0 1 1 14.4 5.6" /><path d="M16.2 2.8v3.9h-3.9" />
                      </svg>
                      새로고침 <em>· {rerolls}회</em>
                    </button>
                    {tickets.reroll > 0 && (
                      <span className="dr-tk">
                        <button type="button" onClick={useReport} title="스카우트 리포트 — 새로고침 +3회">
                          리포트 <em>· {tickets.reroll}장</em>
                        </button>
                      </span>
                    )}
                      </>
                    )}
                    {/* 라이브: 한 판 두 층 — 위층은 라운드 · 캡 · 전체보기, 아래층은 뽑는 순서와 조작 */}
                    {live && (
                      <span className="dr-panel">
                        <span className="dr-top">
                          <DraftMeta inline round={round} cp={cp} cap={match.cap}
                            capAfter={picked ? (swapPlan ? (swapPlan.reason ? null : cp + swapPlan.refund - costNow(picked)) : (pickedReason ? null : cp - costNow(picked))) : null} />
                          <button type="button" className="dr-toggle" aria-pressed={shelfFilter === 'all'}
                            onClick={() => setShelfFilter((f) => {
                              const next = f === 'open' ? 'all' : 'open';
                              setReveal(next === 'all' ? 'in' : 'out');
                              clearTimeout(revealRef.current);
                              revealRef.current = setTimeout(() => setReveal(null), next === 'all' ? 520 : 380);
                              return next;
                            })}>
                            <span className="tr" aria-hidden="true" />전체보기 {shelfFilter === 'all' ? 'ON' : 'OFF'}
                          </button>
                        </span>
                        <span className="dr-bar">
                        <TurnOrder live={live} clock={clock} hold={holdTurn} />
                        {/* 진행 속도와 건너뛰기 — 같은 판 안, 가는 선으로만 나눈다 */}
                        <i className="dr-div" aria-hidden="true" />
                        <span className="dr-sp" role="group" aria-label="진행 배속">
                          {[1, 2, 4].map((v) => (
                            <button key={v} type="button" aria-pressed={liveSpeed === v} className={liveSpeed === v ? 'on' : ''} onClick={() => setLiveSpeed(v)}>×{v}</button>
                          ))}
                        </span>
                        <button type="button" className="dr-skip" onClick={skipToMyTurn} disabled={myTurn || Live.isDone(live)}
                          title="내 차례로 건너뛰기" aria-label="내 차례로 건너뛰기">⏭</button>
                        {(tickets.protect > 0 || tickets.agent > 0 || tickets.series > 0 || live.protect || live.agent) && (
                          <>
                            <i className="dr-div" aria-hidden="true" />
                            <span className="dr-tk" role="group" aria-label="드래프트 권">
                              {(tickets.protect > 0 || live.protect) && (
                                <button type="button" onClick={useProtect} className={live.protect ? 'on' : ''}
                                  disabled={!!live.protect || !picked || Live.takenBy(live, picked) != null}
                                  title={live.protect ? '이미 보호 중' : picked ? `${picked.name} 을(를) 내 다음 차례까지 지킨다` : '지킬 선수 먼저 고르기'}>
                                  보호 <em>· {tickets.protect}장</em>
                                </button>
                              )}
                              {(tickets.agent > 0 || live.agent) && (
                                <button type="button" onClick={useAgent} className={live.agent ? 'on' : ''} disabled={!!live.agent}
                                  title={live.agent ? '다음 영입 한 번이 15% 싸집니다' : '협상 대리인 — 다음 영입 한 번을 15% 싸게'}>
                                  대리인 <em>· {tickets.agent}장</em>
                                </button>
                              )}
                              {tickets.series > 0 && (
                                <button type="button" onClick={() => setSeriesPick(true)} disabled={Live.boardNo(live) + 1 >= live.pool.length}
                                  title="시리즈 지정권 — 다음 보드에 열릴 시리즈를 고른다">
                                  시리즈 <em>· {tickets.series}장</em>
                                </button>
                              )}
                            </span>
                          </>
                        )}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* 선반은 늘 한 줄 · 칸 수는 이 보드의 인원으로 고정한다 — 카드가 빠져도 남은 카드 크기가 변하지 않는다 */}
              <div ref={shelfRef} className="mx-auto grid w-full grid-cols-[repeat(auto-fill,minmax(4.6rem,1fr))] gap-1.5 lg:grid-cols-[repeat(var(--n),minmax(0,1fr))] lg:gap-[3px]"
                style={{ '--n': shelfCols, maxWidth: `calc(${shelfCols} * var(--card-w) + ${shelfCols - 1} * 3px)` }}>
                {shownCards.length === 0 && (
                  <p className="col-span-full py-6 text-center text-sm text-gray-400">
                    {posFilter?.pos ? `이 시리즈에는 ${shelfFilter === 'open' ? '영입 가능한 ' : ''}${POS_LABEL[posFilter.pos]} 선수 없음 · 새로고침으로 다른 시리즈` : '영입할 선수 없음'}
                  </p>
                )}
                {shownCards.map((p, i) => (
                  // 위치 이동(FLIP)은 감싸는 칸에 준다 — 카드 자체의 rise 애니메이션과 transform 이 겹치지 않게
                  <div key={p.id} data-card={p.id}
                    className={`relative min-w-0 ${reveal && hideTarget(p) && !gone.has(p.id) ? (reveal === 'in' ? 'sc-in' : 'sc-out') : ''}`}
                    style={reveal && hideTarget(p) ? { animationDelay: `${i * 16}ms` } : undefined}>
                  {/* 감춘 카드도 지우지 않고 빈 칸만 덮어씌운다 — 다시 켤 때 등장 효과가 돌지 않는다 */}
                  {hiddenCard(p) && <span className="mc-slot absolute inset-0" aria-hidden="true" />}
                  <MiniCard player={p} reason={lockOf(p)} gone={gone.has(p.id)} keepAfterGone={shelfFilter === 'all'} hot={!!live && myTurnLit && !lockOf(p)} myColor={live ? live.clubs[liveMine].color : null} takenClub={live ? (Live.takenBy(live, p) != null ? live.clubs[Live.takenBy(live, p)] : null) : null} selected={picked?.id === p.id}
                    hint={lockOf(p) ? null : hintFor(p)}
                    focus={focused ? (synergyGrows(focused, previewSynergies(roster, p).get(focused.id)) ? 'on' : 'off') : null}
                    onPick={(pl) => setPicked((cur) => (cur?.id === pl.id ? null : pl))} leaving={!!shelfLeaving?.has(p.id)}
                    // 더블클릭: 영입할 수 있으면 곧바로 영입, 잠긴 카드(마감 교체 등)는 PICK 에 올려 버튼으로 고르게
                    onSign={(pl) => (lockOf(pl) ? setPicked(pl) : handleSelectPlayer(pl))}
                    style={{ animationDelay: shelfLeaving?.has(p.id) ? '0ms' : `${i * 25}ms`, ...(hiddenCard(p) ? { visibility: 'hidden' } : null) }} />
                  </div>
                ))}
              </div>
              </div>
              {/* 넓은 화면: 구장이 줄 높이를 정하고, 영입 카드 묶음은 그 높이에 맞춘다 */}
              <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[clamp(15rem,19vw,21rem)_minmax(0,1fr)_clamp(20rem,21vw,25rem)] lg:grid-rows-[minmax(0,1fr)]">
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
                          <PlayerCard player={picked} reason={pickedReason} shaking={shake === picked.id} cost={costNow(picked)} onSelect={() => setPicked(null)} hint={pickedReason ? null : hintFor(picked)} style={{ animation: 'none' }} />
                        </div>
                      ) : inspected ? (
                        <div key={`own-${inspected.player.id}`} className="pk-face pkf-in">
                          <PlayerCard player={inspected.player} owned={inspected.owned} onSelect={() => {}} style={{ animation: 'none' }} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {live && !myTurnLit ? (
                    /* 라이브: 내 차례가 아니면 이 자리는 비워 둔다 (누구 차례인지는 위 순서 띠가 말한다) */
                    <div className="pk-ghostbtn" aria-hidden="true" />
                  ) : picked ? (
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
                          <PickIcon kind={pickedReason ? 'lock' : 'plus'} /><span>{pickedReason || (live ? `지명하기 · ${clock}초` : '영입하기')}</span>
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
                      <span className="sr-only">선반이나 내 라인업에서 선수 고르기</span>
                    </>
                  )}
                </div>
                </div>
                {/* 내 라인업: 구장이 판 전체의 배경, 시너지는 오른쪽 도크로 그 위에 얹힌다 */}
                <div className="bc-grp !px-0 !pb-0 lg:flex lg:min-h-0 lg:flex-col">
                  <span className="bc-label font-display">MY LINEUP</span>
                  <LineupField roster={roster} candidate={picked} candidateReason={pickedReason} onMove={handleMove} onInspect={handleInspect} onSlotFilter={handleSlotFilter} onClearCandidate={() => setPicked(null)} wantSlot={pendingSlot !== undefined ? pendingSlot : posFilter?.slot} draftView
                    highlight={focusIds} focusLabel={focused?.name} onClearFocus={() => setFocusSynergy(null)}
                    reserve={320} fill wide tapRef={lineupTapRef} className="lg:min-h-0 lg:flex-1"
                    overlay={<SynergyDock roster={roster} candidate={previewTarget} focusId={focusSynergy} onFocus={toggleFocus} onOpenAll={() => setModal('synergy')} />} />
                </div>
                {/* MY TEAM: 팀 분석 · 선수 기록 탭. 기록 줄을 누르면 필드에서 그 자리를 누른 것과 같다 */}
                <div className="bc-grp lg:flex lg:min-h-0 lg:flex-col">
                  <span className="bc-label font-display">MY TEAM</span>
                  <MyTeamPanel roster={roster} mode={mode} cap={match.cap}
                    selectedSlot={inspected?.player.slot ?? (pendingSlot !== undefined ? pendingSlot : posFilter?.slot) ?? null}
                    onTap={(slot) => lineupTapRef.current?.(slot)} />
                </div>
              </div>
            </section>
          )}

          {phase === 'ready' && (() => {
            const special = !live && !!opponent;   // 상대를 이미 알고 정비에 왔다 (스페셜 · 토너먼트)
            return (
              <ReadyScreen roster={roster} buff={buff} autoFilled={autoFilled}
                opponent={inGauntlet ? gauntOpponent() : special ? specialOpponent() : null}
                startLabel={inGauntlet || special ? '경기 시작 ▶' : '시즌 시작 ▶'}
                restartLabel={inGauntlet ? '탑으로 ◀' : special ? (tourMode ? '대진표로 ◀' : '상대 다시 보기 ◀') : '다시 드래프트'}
                onMove={handleMove} onOrder={handleOrder} onReplace={setRoster}
                onStart={inGauntlet ? startGauntletMatch : special ? startSpecialMatch : startSeason}
                onRestart={inGauntlet ? () => setPhase('gauntlet') : special ? () => setPhase(tourMode ? 'bracket' : 'matchup') : newDraft} />
            );
          })()}

          {phase === 'matchup' && opponent && (
            <MatchupScreen roster={roster} oppRoster={opponent} buff={buff} oppBuff={AI_BUFF[match.ai]} augments={augments}
              startLabel="정비하기 ▶" oppName={isNoCap(match.cap) ? `${rosterOrigin(opponent)} 연합` : 'AI 올스타'}
              onStart={() => setPhase('ready')}
              onBack={() => setOpponent(isNoCap(match.cap) ? specialAiRoster({ series: mode.series }) : aiDraft({ players: mode.players, cap: match.cap }))} />
          )}

          {(phase === 'sim' || phase === 'result') && (
            <>
              {result && (
                <ResultPanel result={result} record={record} logs={logs}
                  gauntlet={gaunt ? {
                    label: gaunt.done ? '탑 꼭대기에 올라섰다' : `${Gaunt.myPos(gaunt) + 1}칸 · ${Gaunt.currentRung(gaunt).name}`,
                    cta: gaunt.done ? '탑으로' : result.winner === 'my' ? '한 칸 위로' : '다시 도전',
                  } : null}
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
              {phase === 'sim' && <FieldView play={play} myName="나의 드림팀" />}
              {phase === 'sim' && <BroadcastPlates log={[...logs].reverse().find((l) => l.pitcher)} />}

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
                <LiveLog logs={logs} paused={paused} />
                <section className="ui-cut ui-frame ui-glass p-3" style={{ '--c': '12px' }}>
                  <PanelTitle>증강 리스너</PanelTitle>
                  {augments.length === 0 ? <p className="text-xs text-gray-500">보유 증강 없음</p> : (
                    <ul className="flex flex-col gap-1.5">
                      {augments.map((a) => {
                        const n = fireCount(a);
                        return (
                          <li key={a.id} className={`rounded-md border px-2.5 py-2 ${n ? TIER[a.tier].chip : 'border-gray-700 bg-[#111827]'}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold">{a.name}</span>
                              {!a.passive && <span className="font-display text-sm tabular-nums">{n}/{augMax(a)}</span>}
                            </div>
                            <p className="mt-0.5 text-[11px] text-gray-400">{augDescAt(a)}</p>
                            {a.cond && <p className="text-[11px] text-gray-500">조건 · {a.cond}</p>}
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

      </main>
      )}

      {seriesPick && live && (
        <Modal eyebrow="Draft Ticket" title="다음 보드에 열 시리즈" onClose={() => setSeriesPick(false)}>
          <div className="mt-scroll grid max-h-[54vh] grid-cols-2 gap-1.5 overflow-y-auto pr-1">
            {seriesChoices.map((x) => (
              <button key={x.id} type="button" onClick={() => useSeriesTicket(x)}
                className="ui-cut flex items-center gap-3 bg-white/[0.05] px-3 py-2.5 text-left transition hover:bg-white/[0.1]" style={{ '--c': '8px' }}>
                <span className="font-display text-sm text-[#fbbf24]">{x.year ?? 'LEG'}</span>
                <span className="min-w-0">
                  <b className="block truncate text-sm text-white">{x.title}</b>
                  <small className="block truncate text-[11.5px] text-gray-400">{SERIES_KIND_LABEL[x.kind]} · {x.players.length}명</small>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === 'rules' && <RulesModal onClose={() => setModal(null)} />}
      {modal === 'synergy' && <SynergySheetModal roster={roster} candidate={previewTarget} focusId={focusSynergy} draft={phase === 'draft'} onClose={() => setModal(null)} onFocus={(id) => { setPicked(null); setFocusSynergy(id); setModal(null); }} />}
      <ChoiceOverlay choice={choice} onChoose={handleChoose} picksLeft={augPicksLeft} total={match.aug} rerolls={augTickets.reroll} onReroll={rerollAugments} />
      <ClutchOverlay clutch={phase === 'sim' ? clutch : null} onPick={pickClutch} />
      {phase === 'live' && liveTeams && (
        <BroadcastGame my={liveTeams.my} opp={liveTeams.opp} aug={liveTeams.aug} rebuildMy={liveTeams.makeMy}
          midPickInnings={match.aug ? MID_AUG_INNINGS : []}
          onMidPick={(inning) => {
            const options = rollAugmentOptions(augments);
            if (!options.length) return null;
            return new Promise((resolve) => { midPickRef.current = resolve; setChoice({ kind: 'augment', inning, options }); });
          }}
          onFinish={finishLive} onExit={() => { setLiveTeams(null); setPhase(gaunt && !gaunt.done ? 'gauntlet' : tourMode ? 'bracket' : 'matchup'); }} />
      )}
      <HighlightToast toast={toast} />
    </div>
  );
}
