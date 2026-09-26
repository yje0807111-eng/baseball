import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import ReadyLocker from './myteam/ReadyLocker.jsx';
import { autoArrange } from './myteam/SquadBoard.jsx';
import { bannedAugIds, augLevels, favAugIds, loadAccount, myBanner, draftTickets, spendDraftTicket, augShopTickets, spendAugTicket, addToClub, ownsInAccount, bumpWeek } from './myteam/store.js';
import { CLUB_MAX } from './myteam/rules.js';
import { roundsOf } from './myteam/rewards.js';
import { mementoOptions, tourneyMemento, SINGLE_MEMENTO, GAUNTLET_MEMENTO, GAUNTLET_MID_MEMENTO, GAUNTLET_MID_AT, asClubPlayer } from './draft/memento.js';
import { withDraftTickets, DRAFT_TICKET_KO, DRAFT_TICKET_TIP, withAugTickets } from './myteam/shop.js';
import { BANNERS, flagByKey, teamFlag } from './myteam/teamArt.js';
import { statOf } from './myteam/teamColor.js';
import { statColor, statPct, teamNeon } from './myteam/teamColor.js';
import { createPortal } from 'react-dom';
import { SERIES, overallOf, costOf } from './data/seriesPlayers.js';
import BroadcastGame, { engineTeam } from './BroadcastGame.jsx';
import TournamentBracket from './myteam/TournamentBracket.jsx';
import { makeTournament, myOpponent as tourneyOpponent, advance as advanceTourney, ownerOf, seedByStrength, playStrength } from './myteam/tournament.js';
import * as Live from './draft/live.js';
import * as Gaunt from './draft/gauntlet.js';
import { NO_CAP, isNoCap, specialAiRoster, rosterOrigin } from './draft/special.js';
import GauntletScreen from './draft/GauntletScreen.jsx';
import { setScene } from './audio/bgm.js';
import BgmButton from './audio/BgmButton.jsx';
import { seriesName } from './myteam/aiTeam.js';
import { setMods, addRuns } from './engine/pitchSim.js';
import { Axes as VsAxes } from './myteam/MatchPreview.jsx';
import MatchResult from './play/MatchResult.jsx';
import { Flip, flyGhost, useExitGhost, navTo } from './ui/motion.jsx';
import { play } from './audio/sfx.js';
import { faceAt } from './data/cardFace.js';
import { artId } from './data/artAlias.js';
import { recordCells, playerTraits } from './myteam/traits.js';

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
export const FREE_REROLL = 1; // 선택지마다 거저 다시 굴릴 수 있는 횟수
/* 경기 중 증강은 두 번만 — 플레이볼 직후와 7회 시작 전. 자주 멈추면 경기 흐름이 끊긴다 */
/* 경기 중 증강을 묻는 회 — 1회 몫은 정비를 마치며 이미 골랐으니 7회 한 번만 */
const MID_AUG_INNINGS = [7];
const SERIES_KIND_LABEL = { team: '구단 시즌', national: '국가대표', legend: '레전드' };
const SERIES_NEON = { team: '#10b981', national: '#60a5fa', legend: '#fbbf24' };
/** 단계별 화면 배경 (public/ui/*.webp, Higgsfield 생성) */
const PHASE_BG = { mode: 'stadium', draft: 'stadium', ready: 'ready', sim: 'broadcast', result: 'stadium', bracket: 'stadium', gauntlet: 'gauntlet' };
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
  { id: 'champ', group: 'special', rules: ['각 시즌 우승팀', '왕조 로스터'], name: '가을의 왕조', en: 'Champions', neon: '#ff5a67', tag: 'NORMAL', cap: 1560,
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
const pitchersOf = (r) => realOnly(r).filter((p) => p.type === 'pitcher' && !isBenchSlot(p.slot));
const INFIELD_POS = new Set(['1B', '2B', '3B', 'SS']);
const DEF_GOOD = { C: 90, '1B': 58, '2B': 84, '3B': 80, SS: 95, OF: 88 }; // 포지션별 수비 상위 20% 안팎
const goodGlove = (p) => p.stats.defense >= (DEF_GOOD[posOf(p)] ?? 999);
const handIs = (h) => (p) => p.hand === h || p.hand === 'S'; // 스위치 히터는 좌우 모두로 센다
/* 스타일은 선수 안에서 무엇이 두드러지는가로 가른다 — 종합이 높다고 켜지지 않게 (카드 풀에서 각 38% 안팎, 종합과 상관없음) */
const STYLE_GAP = 5;
const slugger = (p) => p.stats.power >= p.stats.contact + STYLE_GAP;
const hitter = (p) => p.stats.contact >= p.stats.power + STYLE_GAP;
const burner = (p) => p.stats.speed >= Math.max(p.stats.power, p.stats.contact) + STYLE_GAP;
const flamer = (p) => p.stats.stuff >= p.stats.control + STYLE_GAP;
const painter = (p) => p.stats.control >= p.stats.stuff + STYLE_GAP;
/** 수비 좋은 포수가 주전이면 그 포수와 제구형 투수들 */
function batteryOf(roster) {
  const c = battersOf(roster).find((p) => posOf(p) === 'C' && goodGlove(p));
  return c ? [c, ...pitchersOf(roster).filter(painter)] : [];
}
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
   bonus 키 → 타자: bat(파워·컨택) power contact speed defense / 투수: pit(구위·제구·안정) stability control
   단계 인원의 상한은 포지션별로 실제로 뽑을 수 있는 카드 수를 보고 정했다 (예: 주루 75+ 는 포수·지명 카드가 없어 4명이 끝) */
export const SYNERGIES = [
  // ── 실화 · 선수 조합 (같은 선수면 카드 시즌과 상관없이 인정)
  story('beijing', '베이징 9전 전승', '베이징 금메달 멤버', BEIJING_2008, [
    tier(3, '능력치 +1', { bat: 1, pit: 1 }), tier(5, '능력치 +2', { bat: 2, pit: 2 }), tier(7, '능력치 +3', { bat: 3, pit: 3 }),
  ]),
  story('cleanup', '클린업 트리오', '이승엽·이대호·김동주 중 2명', ['이승엽', '이대호', '김동주'], [tier(2, '파워·컨택 +6', { power: 6, contact: 6 })]),
  story('skMound', 'SK 왕조 마운드', '김광현·정우람·정대현 (2008 선발·셋업·마무리)', ['김광현', '정우람', '정대현'], [
    tier(2, '투수 +2', { pit: 2 }), tier(3, '투수 +3', { pit: 3 }),
  ]),
  story('haitai', '해태 왕조의 원투', '선동열 · 이종범', ['선동열', '이종범'], [tier(2, '능력치 +2', { bat: 2, pit: 2 })]),
  story('tableSetter', '국민 테이블세터', '이용규 · 정근우', ['이용규', '정근우'], [tier(2, '컨택·주루 +8', { contact: 8, speed: 8 })]),
  story('nexen14', '2014 넥센 핵타선', '박병호·강정호·서건창 중 2명', ['박병호', '강정호', '서건창'], [tier(2, '파워·컨택 +6', { power: 6, contact: 6 })]),
  story('skBattery', 'SK 왕조 배터리', '김광현 · 박경완', ['김광현', '박경완'], [tier(2, '안정·수비 +6', { stability: 6, defense: 6 })]),
  story('doosanBattery', '22승 배터리', '니퍼트 · 양의지', ['니퍼트', '양의지'], [tier(2, '안정·수비 +6', { stability: 6, defense: 6 })]),
  story('samsungDuo', '삼성 왕조의 투타', '오승환 · 이승엽', ['오승환', '이승엽'], [tier(2, '투수 +5 · 파워·컨택 +5', { pit: 5, power: 5, contact: 5 })]),
  story('changeup', '체인지업 전수', '구대성 · 류현진 (2006 한화)', ['구대성', '류현진'], [tier(2, '투수 +3', { pit: 3 })]),
  story('premier12', '프리미어12 초대 우승', '2015 대표팀 멤버', PREMIER12_2015, [
    tier(3, '능력치 +1', { bat: 1, pit: 1 }), tier(5, '능력치 +3', { bat: 3, pit: 3 }),
  ]),
  story('beijingFinal', '베이징 결승전', '류현진 · 정대현 (선발과 병살 마무리)', ['류현진', '정대현'], [tier(2, '투수 +3', { pit: 3 })]),
  story('doosanMound', '2016 두산 마운드', '니퍼트·정재훈·이현승 (선발·셋업·마무리)', ['니퍼트', '정재훈', '이현승'], [
    tier(2, '투수 +2', { pit: 2 }), tier(3, '투수 +3', { pit: 3 }),
  ]),
  story('lotte10', '2010 롯데 폭격', '이대호·홍성흔·강민호·손아섭·전준우', ['이대호', '홍성흔', '강민호', '손아섭', '전준우'], [
    tier(2, '파워·컨택 +3', { power: 3, contact: 3 }), tier(3, '파워·컨택 +5', { power: 5, contact: 5 }),
  ]),
  story('samsung14', '통합 4연패', '최형우·박석민·나바로·채태인·박해민', ['최형우', '박석민', '나바로', '채태인', '박해민'], [
    tier(2, '파워·컨택 +2', { power: 2, contact: 2 }), tier(3, '파워·컨택 +4', { power: 4, contact: 4 }),
  ]),
  story('nc20', 'NC 창단 첫 우승', '양의지·나성범·박민우·알테어·루친스키', ['양의지', '나성범', '박민우', '알테어', '루친스키'], [
    tier(2, '능력치 +2', { bat: 2, pit: 2 }), tier(3, '능력치 +3', { bat: 3, pit: 3 }),
  ]),
  story('lg23', 'LG 29년의 한', '오지환·김현수·박해민·홍창기·오스틴', ['오지환', '김현수', '박해민', '홍창기', '오스틴'], [
    tier(2, '컨택 +3', { contact: 3 }), tier(3, '컨택 +5 · 수비 +3', { contact: 5, defense: 3 }),
  ]),
  story('kia24', 'KIA V12', '김도영·최형우·양현종·나성범·소크라테스', ['김도영', '최형우', '양현종', '나성범', '소크라테스'], [
    tier(2, '능력치 +2', { bat: 2, pit: 2 }), tier(3, '능력치 +3', { bat: 3, pit: 3 }),
  ]),
  // ── 팀 구성 (인원이 늘면 단계가 오른다)
  build('power', '홈런 군단', '파워형 타자 (파워가 컨택보다 5+)', (r) => battersOf(r).filter(slugger), [
    tier(4, '파워 +2', { power: 2 }), tier(5, '파워 +4', { power: 4 }), tier(6, '파워 +7', { power: 7 }),
  ]),
  build('mercenary', '용병 트리오', '외국인 선수', (r) => realOnly(r).filter((p) => p.isForeign), [
    tier(2, '능력치 +1', { bat: 1, pit: 1 }), tier(3, '능력치 +2', { bat: 2, pit: 2 }),
  ]),
  // 가장 많이 뽑힌 구단의 인원 수로 단계가 정해지고, 그 구단(동률이면 모두) 선수들이 혜택을 받는다
  build('franchise', '프랜차이즈의 기억', '가장 많이 뽑은 구단', (r) => topFranchises(r).players, [
    tier(4, '능력치 +1', { bat: 1, pit: 1 }),
    tier(5, '능력치 +2 · 수비·안정 +2', { bat: 2, pit: 2, defense: 2, stability: 2 }),
    tier(6, '능력치 +3 · 수비·안정 +3', { bat: 3, pit: 3, defense: 3, stability: 3 }),
  ]),
  // ── 타선 색깔 (문턱은 카드 풀 상위 10% 안팎)
  build('contactLine', '교타 군단', '교타형 타자 (컨택이 파워보다 5+)', (r) => battersOf(r).filter(hitter), [
    tier(4, '컨택 +2', { contact: 2 }), tier(5, '컨택 +4', { contact: 4 }), tier(6, '컨택 +7', { contact: 7 }),
  ]),
  build('speedLine', '발야구', '준족형 타자 (주루가 파워·컨택보다 5+)', (r) => battersOf(r).filter(burner), [
    tier(3, '주루 +4 · 컨택 +1', { speed: 4, contact: 1 }), tier(4, '주루 +6 · 컨택 +2', { speed: 6, contact: 2 }), tier(5, '주루 +8 · 컨택 +3', { speed: 8, contact: 3 }),
  ]),
  build('leftLine', '좌타 라인', '좌타자 (스위치 포함)', (r) => battersOf(r).filter(handIs('L')), [
    tier(5, '컨택 +2', { contact: 2 }), tier(7, '컨택 +4', { contact: 4 }),
  ]),
  build('rightLine', '우타 라인', '우타자 (스위치 포함)', (r) => battersOf(r).filter(handIs('R')), [
    tier(7, '파워 +3', { power: 3 }), tier(9, '파워 +5', { power: 5 }),
  ]),
  build('switchHit', '스위치 히터', '양타 타자', (r) => battersOf(r).filter((p) => p.hand === 'S'), [
    tier(2, '컨택·주루 +3', { contact: 3, speed: 3 }), tier(3, '컨택·주루 +5', { contact: 5, speed: 5 }),
  ]),
  // ── 수비
  build('infieldNet', '내야 그물', '수비 상위 내야수', (r) => battersOf(r).filter((p) => INFIELD_POS.has(posOf(p)) && goodGlove(p)), [
    tier(3, '수비 +6 · 컨택 +4', { defense: 6, contact: 4 }), tier(4, '수비 +8 · 컨택 +7', { defense: 8, contact: 7 }),
  ]),
  build('outfieldNet', '외야 수비망', '수비 88+ 외야수', (r) => battersOf(r).filter((p) => posOf(p) === 'OF' && goodGlove(p)), [
    tier(2, '수비 +5 · 컨택 +2', { defense: 5, contact: 2 }), tier(3, '수비 +8 · 컨택 +4', { defense: 8, contact: 4 }),
  ]),
  build('battery', '안방마님', '수비 좋은 포수와 제구형 투수', batteryOf, [
    tier(3, '수비·제구 +4', { defense: 4, control: 4 }), tier(4, '수비·제구 +6', { defense: 6, control: 6 }), tier(5, '수비·제구 +8', { defense: 8, control: 8 }),
  ]),
  // ── 마운드 (주전 투수는 선발 1 · 불펜 4)
  build('fireball', '파이어볼러', '구위형 투수 (구위가 제구보다 5+)', (r) => pitchersOf(r).filter(flamer), [
    tier(3, '구위 +3', { stuff: 3 }), tier(4, '구위 +5', { stuff: 5 }), tier(5, '구위 +8', { stuff: 8 }),
  ]),
  build('finesse', '기교파', '제구형 투수 (제구가 구위보다 5+)', (r) => pitchersOf(r).filter(painter), [
    tier(3, '제구·안정 +2', { control: 2, stability: 2 }), tier(4, '제구·안정 +3', { control: 3, stability: 3 }), tier(5, '제구·안정 +4', { control: 4, stability: 4 }),
  ]),
  build('southpaw', '좌완 군단', '좌투수', (r) => pitchersOf(r).filter((p) => p.hand === 'L'), [
    tier(2, '안정 +3', { stability: 3 }), tier(3, '안정 +5', { stability: 5 }), tier(4, '안정 +7', { stability: 7 }),
  ]),
];

/** 시너지 현황: level(넘은 단계 수) · cur(채운 칸, 최종 단계에서 멈춤) · top(최종 단계 인원) · 지금 단계의 effect/bonus */
export function checkSynergies(roster) {
  return SYNERGIES.map((s) => {
    const extra = s.id === 'franchise' ? FRANCHISE_EXTRA : s.condOf ? { count: (r) => s.members(r).length, condOf: s.condOf } : null;
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
export const SYNERGY_STAT_MAX = 115; // 시너지로는 능력치 상한 110 을 이만큼까지 넘길 수 있다 — 최상급 카드끼리 조합이 헛돌지 않게

const BONUS_STATS = {
  batter: { bat: ['power', 'contact'], power: ['power'], contact: ['contact'], speed: ['speed'], defense: ['defense'] },
  pitcher: { pit: ['stuff', 'control', 'stability'], stability: ['stability'], control: ['control'], stuff: ['stuff'] },
};
/** 완성된 시너지의 보너스를 그 시너지를 만든 선수에게만 더한다. 오른 선수에게는 synergyBoost(시너지 이름 목록)가 붙는다 */
/* 무리형 — 많은 인원이 한꺼번에 받는 시너지. 한 선수에게는 이 가운데 가장 큰 것 하나만 붙는다 (FC온라인 팀컬러처럼) */
const CROWD_SYNERGIES = new Set(['beijing', 'premier12', 'franchise']);
const bonusSize = (b) => Object.values(b).reduce((s, v) => s + v, 0);
export function applySynergies(roster, synergies = checkSynergies(roster)) {
  const adds = new Map();
  const crowdBest = new Map(); // 선수 id → 가장 큰 무리형 시너지
  const give = (m, s) => {
    const a = adds.get(m.id) || { stats: {}, names: [] };
    Object.entries(s.bonus).forEach(([k, v]) => (BONUS_STATS[m.type][k] || []).forEach((stat) => { a.stats[stat] = (a.stats[stat] || 0) + v; }));
    a.names.push(s.name);
    adds.set(m.id, a);
  };
  synergies.filter((s) => s.active).forEach((s) => s.members.forEach((m) => {
    if (!CROWD_SYNERGIES.has(s.id)) { give(m, s); return; }
    const was = crowdBest.get(m.id);
    if (!was || bonusSize(s.bonus) > bonusSize(was.s.bonus)) crowdBest.set(m.id, { m, s });
  }));
  crowdBest.forEach(({ m, s }) => give(m, s));
  return roster.map((p) => {
    const a = adds.get(p.id);
    if (!a) return p;
    const stats = Object.fromEntries(Object.entries(p.stats).map(([k, v]) => [k, Math.min(Math.max(v, SYNERGY_STAT_MAX), v + Math.min(SYNERGY_STAT_CAP, a.stats[k] || 0))]));
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
    note: '타구가 더 멀리 뻗어 장타가 늘어남',
    roster: (r) => bump(r, isBat, { power: 10 }) },
  { id: 'eyeTrain', name: '선구안 훈련', tier: 'silver', type: 'build', desc: '타자 컨택 +10',
    note: '헛스윙이 줄고 출루가 늘어남',
    roster: (r) => bump(r, isBat, { contact: 10 }) },
  { id: 'sprintTrain', name: '주루 특훈', tier: 'silver', type: 'build', desc: '타자 주루 +12 · 주루 비중 +15%',
    note: '한 베이스를 더 가고 도루가 늘어남',
    roster: (r) => bump(r, isBat, { speed: 12 }),
    team: (t) => { t.weights.speed += 0.03; } },

  /* ─ 투수 (4) ─ */
  { id: 'stuffTrain', name: '구위 훈련', tier: 'silver', type: 'build', desc: '투수 구위 +10',
    note: '공이 덜 맞아 나가고 삼진이 늘어남',
    roster: (r) => bump(r, isPit, { stuff: 10 }) },
  { id: 'ctrlTrain', name: '제구 훈련', tier: 'silver', type: 'build', desc: '투수 제구 +10',
    note: '볼넷이 줄고 유리한 카운트가 늘어남',
    roster: (r) => bump(r, isPit, { control: 10 }) },
  { id: 'staminaTrain', name: '체력 훈련', tier: 'silver', type: 'build', desc: '6회부터 수비 투구 +10',
    note: '후반에도 투수 공이 살아 있음',
    half: (c) => (oppOff(c) && c.inning >= 6 ? { pitch: 10 } : null) },
  { id: 'mentalCoach', name: '멘탈 코치', tier: 'silver', type: 'build', desc: '투수 안정 +12',
    note: '한 번 맞아도 무너지지 않는 마운드',
    roster: (r) => bump(r, isPit, { stability: 12 }) },

  /* ─ 맞바꾸기 (6) — 크게 올리고 한쪽을 내준다 ─ */
  { id: 'fullSwing', name: '풀스윙', tier: 'silver', type: 'extreme', desc: '타자 파워 +22 · 컨택 −8',
    note: '장타가 크게 늘고 헛스윙도 함께 늘어남',
    roster: (r) => bump(r, isBat, { power: 22, contact: -8 }) },
  { id: 'toContact', name: '짧게 치기', tier: 'silver', type: 'extreme', desc: '타자 컨택 +22 · 파워 −8',
    note: '맞히는 타석이 크게 늘고 장타는 줄어듦',
    roster: (r) => bump(r, isBat, { contact: 22, power: -8 }) },
  { id: 'allOutPitch', name: '전력투구', tier: 'silver', type: 'extreme', desc: '투수 구위 +22 · 체력 −18',
    note: '공이 세지는 대신 투수가 빨리 지침',
    roster: (r) => bump(r, isPit, { stuff: 22, stamina: -18 }) },
  { id: 'tempo', name: '완급 조절', tier: 'silver', type: 'extreme', desc: '투수 제구 +24 · 구위 −3',
    note: '볼넷이 크게 줄고 공의 힘은 빠짐',
    roster: (r) => bump(r, isPit, { control: 24, stuff: -3 }) },
  { id: 'speedRevolution', name: '발야구', tier: 'silver', type: 'extreme', desc: '타자 주루 +35 · 파워 −8 · 주루 비중 +15%',
    note: '발로 뽑는 점수가 늘고 장타는 줄어듦',
    roster: (r) => bump(r, isBat, { speed: 35, power: -8 }),
    team: (t) => { t.weights.speed += 0.03; } },
  { id: 'sluggerArmy', name: '거포 군단', tier: 'silver', type: 'extreme', desc: '타자 파워 +25 · 주루 −12',
    note: '한 방으로 뽑는 점수가 늘고 발은 느려짐',
    roster: (r) => bump(r, isBat, { power: 25, speed: -12 }) },

  /* ─ 몰아주기 (4) — 몇 명에게만 크게 ─ */
  { id: 'cleanupUp', name: '클린업 집중', tier: 'silver', type: 'build', desc: '파워 상위 4명 파워 +30',
    note: '중심 타선에서 큰 것이 자주 나옴',
    roster: (r) => { const top = new Set(topBy(r.filter(isBat), 4, (p) => p.stats.power)); return bump(r, (p) => top.has(p), { power: 30 }); } },
  { id: 'setterUp', name: '테이블세터', tier: 'silver', type: 'build', desc: '주루 상위 4명 주루 +25 · 주루 비중 +15%',
    note: '앞 타순이 자주 나가 밥상이 차려짐',
    roster: (r) => { const top = new Set(topBy(r.filter(isBat), 4, (p) => p.stats.speed)); return bump(r, (p) => top.has(p), { speed: 25 }); },
    team: (t) => { t.weights.speed += 0.03; } },
  { id: 'aceFirst', name: '에이스 우대', tier: 'silver', type: 'extreme', desc: '가장 센 투수 능력치 +25 · 나머지 투수 −2',
    note: '1선발 경기가 크게 유리해지고 나머지는 조금 불리해짐',
    roster: (r) => { const [ace] = topBy(r.filter(isPit), 1, pitPower); return ace ? bump(r, isPit, (p) => (p === ace ? every(25) : every(-2))) : r; } },
  { id: 'bullpenBoost', name: '불펜 강화', tier: 'silver', type: 'build', desc: '불펜 투수 능력치 +15',
    note: '후반에 뒤집히는 일이 줄어듦',
    roster: (r) => bump(r, isRelief, every(15)) },

  /* ─ 약점 메우기 (3) ─ */
  { id: 'weakFix', name: '약점 보강', tier: 'silver', type: 'balance', desc: '가장 낮은 능력치 +25',
    note: '팀에서 가장 처진 구멍이 메워짐',
    roster: (r) => { const [k, , who] = [...BAT_STATS.map((x) => [x, statMean(r.filter(isBat), x), isBat]), ...PIT_STATS.map((x) => [x, statMean(r.filter(isPit), x), isPit])]
      .sort((a, b) => a[1] - b[1])[0]; return bump(r, who, { [k]: 25 }); } },
  { id: 'bottomUp', name: '하위 타선', tier: 'silver', type: 'balance', desc: '종합 하위 타자 4명 능력치 +15',
    note: '하위 타선에서 끊기던 흐름이 이어짐',
    roster: (r) => { const low = new Set(topBy(r.filter(isBat), 4, (p) => -p.overall)); return bump(r, (p) => low.has(p), every(15)); } },
  { id: 'bullpenInsure', name: '불펜 보험', tier: 'silver', type: 'balance', desc: '가장 약한 불펜 투수 능력치 +18',
    note: '불펜이 무너지는 최악의 경기가 줄어듦',
    roster: (r) => { const [weak] = topBy(r.filter(isRelief), 1, (p) => -pitPower(p)); return weak ? bump(r, (p) => p === weak, every(18)) : r; } },

  /* ─ 팀 구성 (3) — 그런 선수를 모았을 때 ─ */
  { id: 'mercContract', name: '용병 계약', tier: 'silver', type: 'build', desc: '외국인 선수 능력치 +12',
    note: '외국인 선수가 많을수록 강해짐',
    roster: (r) => bump(r, (p) => p.isForeign, every(12)) },
  { id: 'legendAura', name: '전설의 기운', tier: 'silver', type: 'build', desc: '레전드 카드 선수 능력치 +12',
    note: '레전드 카드가 많을수록 강해짐',
    roster: (r) => bump(r, isLegendCard, every(12)) },
  { id: 'veteran', name: '베테랑 대우', tier: 'silver', type: 'build', desc: '종합 88+ 선수 능력치 +10',
    note: '이미 좋은 주전들이 더 좋아짐',
    roster: (r) => bump(r, (p) => p.overall >= 88, every(10)) },

  /* ─ 수비 (4) — 자리로 나눈다 ─ */
  { id: 'infieldWall', name: '내야 철벽', tier: 'silver', type: 'defense', desc: '내야수 수비 +28',
    note: '내야를 빠져나가는 안타가 줄어듦',
    roster: (r) => bump(r, (p) => INFIELD.has(p.position), { defense: 28 }) },
  { id: 'outfieldWall', name: '외야 철벽', tier: 'silver', type: 'defense', desc: '외야수 수비 +28',
    note: '외야로 떨어지는 안타가 줄어듦',
    roster: (r) => bump(r, (p) => p.position === 'OF', { defense: 28 }) },
  { id: 'centerLine', name: '센터 라인', tier: 'silver', type: 'defense', desc: '포수 · 2루수 · 유격수 · 외야수 수비 +30',
    note: '가운데로 가는 타구가 대부분 잡힘',
    roster: (r) => bump(r, (p) => CENTER.has(p.position), { defense: 30 }) },
  { id: 'catcherLead', name: '포수 리드', tier: 'silver', type: 'defense', desc: '포수 수비 +15 · 투수 제구 +10',
    note: '도루를 막고 투수 볼넷도 줄어듦',
    roster: (r) => bump(bump(r, (p) => p.position === 'C', { defense: 15 }), isPit, { control: 10 }) },

  /* ─ 경기 중 (4) — 반 이닝마다 확률이 오르내린다. 한 이닝을 통째로 정하지는 않는다 ─ */
  { id: 'focusLine', name: '집중 타선', tier: 'silver', type: 'fire', desc: '4회부터 우리 공격 안타 확률 +5%',
    note: '4회부터 우리 공격이 살아남',
    half: (c) => (myOff(c) && c.inning >= 4 ? { add: 0.25 } : null) },
  { id: 'lateBlast', name: '뒷심', tier: 'silver', type: 'fire', desc: '8회부터 지고 있으면 안타 확률 +14%',
    note: '8회부터 지고 있을 때 뒤집을 힘이 생김',
    half: (c) => (myOff(c) && c.inning >= 8 && c.score.opp > c.score.my ? { add: 0.7 } : null) },
  { id: 'closer', name: '마무리 투수', tier: 'silver', type: 'fire', desc: '8 · 9회 수비 투구 +14',
    note: '경기 마지막 두 이닝을 지키기 쉬워짐',
    half: (c) => (oppOff(c) && c.inning >= 8 ? { pitch: 14 } : null) },
  { id: 'starterFocus', name: '선발 집중', tier: 'silver', type: 'fire', desc: '1~4회 수비 투구 +10',
    note: '초반에 먼저 실점하는 일이 줄어듦',
    half: (c) => (oppOff(c) && c.inning <= 4 ? { pitch: 10 } : null) },

  /* ─ 상황 (6) — 경기가 어떻게 흘러가느냐에 따라 켜지고 꺼진다 ─ */
  { id: 'firstBlood', name: '선취점', tier: 'silver', type: 'situ', desc: '1 · 2회 우리 공격 안타 확률 +12%',
    note: '1 · 2회에 먼저 점수를 낼 확률이 오름',
    half: (c) => (myOff(c) && c.inning <= 2 ? { add: 0.6 } : null) },
  { id: 'holdLead', name: '리드 지키기', tier: 'silver', type: 'situ', desc: '앞서고 있으면 수비 투구 +12',
    note: '앞서고 있을 때 따라잡히지 않음',
    half: (c) => (oppOff(c) && c.score.my > c.score.opp ? { pitch: 12 } : null) },
  { id: 'tieBreak', name: '동점 승부', tier: 'silver', type: 'situ', desc: '점수가 같으면 안타 확률 +10% · 수비 투구 +10',
    note: '동점 상황에서 먼저 균형을 깸',
    half: (c) => (c.score.my !== c.score.opp ? null : myOff(c) ? { add: 0.5 } : { pitch: 10 }) },
  { id: 'extraGame', name: '연장 승부', tier: 'silver', type: 'situ', desc: '9회부터 동점이면 안타 확률 +16% · 수비 투구 +16',
    note: '9회 동점부터 연장까지 유리해짐',
    half: (c) => (c.inning < 9 || c.score.my !== c.score.opp ? null : myOff(c) ? { add: 0.8 } : { pitch: 16 }) },
  { id: 'aceKiller', name: '에이스 킬러', tier: 'silver', type: 'situ', desc: '상대 마운드가 종합 93+ 면 안타 확률 +6%',
    note: '상대 에이스를 만나도 밀리지 않음',
    half: (c) => (myOff(c) && (c.oppPitcher?.overall || 0) >= 93 ? { add: 0.3 } : null) },
  { id: 'setupCrew', name: '필승조', tier: 'silver', type: 'situ', desc: '불펜이 던지는 이닝 수비 투구 +12',
    note: '불펜이 던지는 이닝이 단단해짐',
    half: (c) => (oppOff(c) && c.myPitcher?.position === 'RP' ? { pitch: 12 } : null) },
].map((a) => ({ ...a, passive: true }));

/* 증강은 모두 평상시 효과다 — 한 이닝을 통째로 정하는 발동형은 두지 않는다 */
export const AUGMENTS = [
  ...PASSIVE_AUGMENTS,
];

/** 즐겨찾기한 증강이 뽑힐 무게 — 다른 증강의 두 배 */
export const FAV_WEIGHT = 2;
/**
 * 증강 후보: 아직 안 가진 증강 가운데 최대 3개. 등급이 하나라 판을 따로 열지 않는다.
 * 내 증강 풀에서 제외한 증강은 나오지 않고, 즐겨찾기한 증강은 두 배 잘 나온다(무게를 준 비복원 추출).
 * 지명권 · 우대권은 없앴다 — 원하는 증강은 즐겨찾기 하나로 모은다.
 */
export function rollAugmentOptions(owned = [], rng = Math.random, { favs = null } = {}) {
  const banned = bannedAugIds();
  const mine = favs || favAugIds();
  const left = AUGMENTS.filter((a) => !owned.some((x) => x.id === a.id) && !banned.has(a.id));
  /* Efraimidis–Spirakis: 열쇠 = 난수^(1/무게) 가 큰 순서 — 무게 2 면 두 배 잘 뽑힌다 */
  const keyed = left.map((a) => ({ a, key: rng() ** (1 / (mine.has(a.id) ? FAV_WEIGHT : 1)) }));
  keyed.sort((x, y) => y.key - x.key);
  return withAugLevels(keyed.slice(0, 3).map((x) => x.a));
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
    /** 지금 걸려 있는 증강 (중계 화면 머리에 보여 준다) */
    get list() { return list; },
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
.lf-chip { position: absolute; left: 58px; top: 0; z-index: 3; padding: 0 7px; font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 800; letter-spacing: .04em; line-height: 16px; color: var(--n); background: rgba(5,8,15,.85); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--n) 55%, transparent); transition: background .09s, color .09s; }
.lf-bar { position: absolute; left: 0; right: 0; top: 15px; height: 52px; display: flex; align-items: center; gap: 8px; padding: 0 12px 0 60px; border-radius: 14px; background: rgba(8,12,22,.72); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); box-shadow: inset 0 0 0 1px rgba(255,255,255,.12), 0 12px 24px -10px color-mix(in srgb, var(--n) 60%, transparent); transition: background .09s, box-shadow .09s; }
.lf-bar::after { content: ""; position: absolute; left: 14px; right: 14px; bottom: 0; height: 2px; border-radius: 2px; background: linear-gradient(90deg, transparent, var(--n) 30%, var(--n) 70%, transparent); opacity: .7; }
.lf-bp { position: absolute; left: 8px; top: 19px; width: 44px; height: 44px; z-index: 2; border-radius: 50%; background-color: #0b1220; background-repeat: no-repeat; box-shadow: 0 0 0 2px #05080f, 0 0 0 3.5px var(--n); }
/* 빈 사진 칸: 흉상과 같은 자리 · 크기. 불투명하게 칠해 뒤 판 테두리를 가리고 아래는 판 속으로 흐려져 네모 두 개로 겹쳐 보이지 않게 */
.lf-ph { position: absolute; left: 8px; top: 19px; width: 44px; height: 44px; z-index: 2; border-radius: 50%; background: linear-gradient(180deg, #2c3749, #222c3e 70%); box-shadow: 0 0 0 1.5px rgba(148,163,184,.3); }
.lf-ph::before { content: ""; position: absolute; left: 50%; top: 50%; width: 24px; height: 26px; transform: translate(-50%, -46%); background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 44'%3E%3Ccircle cx='20' cy='13' r='8.5' fill='%2394a3b8'/%3E%3Cpath d='M4 44c0-11 7-18 16-18s16 7 16 18z' fill='%2394a3b8'/%3E%3C/svg%3E") center / contain no-repeat; opacity: .55; }
.lf-bx { min-width: 0; flex: 1; line-height: 1.25; }
.lf-bx b { display: block; font-size:17px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lf-bx small { display: block; font-size:14px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lf-ov { font-size:32px; font-weight: 700; line-height: 1; color: var(--n); text-shadow: 0 0 12px color-mix(in srgb, var(--n) 60%, transparent); }
.lf-ov.up { color: #34d399; text-shadow: 0 0 12px rgba(52,211,153,.6); }
.lf-tok.empty .lf-bar { background: rgba(8,12,22,.55); box-shadow: inset 0 0 0 1.5px rgba(52,211,153,.55), 0 0 18px -6px rgba(52,211,153,.5); }
.lf-tok.empty .lf-bar::after { display: none; }
.lf-tok.empty .lf-bx b { color: #6ee7b7; font-weight: 700; }
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
.lf-ovx s { font-size:18px; color: #94a3b8; text-decoration-thickness: 2px; }
.lf-ovx i { font-style: normal; font-size:14px; color: #7dd3fc; }
.lf-ovx em { font-style: normal; font-size:28px; color: #fff; }
.lf-ovx.up em { color: #34d399; }
.lf-ovx.dn em { color: #fbbf24; }
.lf-ovx.dn2 em { color: #f87171; }
.lf-sil { position: absolute; inset: 0; width: 100%; height: 100%; fill: #26324a; }
/* 시너지 도크 아래 예비 여섯: 두 줄 세 칸씩 미니 칩. 필드 토큰과 같은 끌기·강조 규칙을 쓴다 */
.lf-bn { flex: none; margin-top: 12px; padding-top: 11px; border-top: 1px solid rgba(255,255,255,.08); }
.lf-bn-h { display: flex; align-items: baseline; gap: 7px; margin-bottom: 7px; padding-left: 4px; }
.lf-bn-h span { font-size:12px; font-weight: 700; color: #cbd5e1; text-shadow: 0 1px 3px #000; }
.lf-bn-h em { font-family: 'Saira Condensed', sans-serif; font-size:12px; font-style: normal; font-weight: 700; letter-spacing: .18em; color: #64748b; }
.lf-bn-h small { margin-left: auto; font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 600; color: #64748b; }
.lf-bn-h small b { color: #cbd5e1; }
.lf-bn-g { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
.lf-bn + .lf-bn { margin-top: 8px; padding-top: 8px; }
.lf-bc { --n: #344055; position: relative; display: grid; grid-template-columns: 22px auto minmax(0, 1fr) auto; align-items: center; gap: 7px; height: 32px; padding: 0 8px 0 5px; background: rgba(255,255,255,.05); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); border-radius: 10px; box-shadow: inset 0 1px 0 rgba(255,255,255,.07); clip-path: inset(0 round 10px); touch-action: none; user-select: none; cursor: grab; outline: none; transition: background .12s, box-shadow .12s; }
.lf-bc-bp, .lf-bc-ph { width: 22px; height: 22px; border-radius: 50%; background-repeat: no-repeat; }
.lf-bc-ph { background: linear-gradient(180deg, #2c3749, #222c3e 70%); }
.lf-bc-pos { font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 800; letter-spacing: .04em; color: var(--n); }
.lf-bc.empty .lf-bc-pos { color: #64748b; }
.lf-bc:not(:has(.lf-bc-pos)) { grid-template-columns: 22px minmax(0, 1fr) auto; }
.lf-bc b { min-width: 0; overflow: hidden; font-size:12px; font-weight: 600; color: #e5e7eb; text-overflow: ellipsis; white-space: nowrap; }
.lf-bc em { font-size:14px; font-weight: 800; color: #fff; text-shadow: 0 0 9px var(--n); }
.lf-bc em.up { color: #6ee7b7; }
.lf-bc i { position: absolute; right: 4px; top: 4px; width: 4px; height: 4px; background: #fbbf24; transform: rotate(45deg); }
.lf-bc.empty { cursor: pointer; background: rgba(255,255,255,.025); }
.lf-bc.empty:has(.lf-bc-pos) { box-shadow: inset 0 0 0 1px rgba(52,211,153,.45); }
.lf-bc.empty:has(.lf-bc-pos) b { color: #6ee7b7; }
.lf-bc.empty b { color: #6b7280; font-weight: 500; }
.lf-bc.empty em { color: #3f4a5c; }
.lf-bc:focus-visible { outline: 2px solid #10b981; outline-offset: 2px; }
.lf-bc.mine { background: linear-gradient(90deg, color-mix(in srgb, var(--n) 22%, rgba(255,255,255,.05)), rgba(255,255,255,.05)); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), inset 0 0 0 1px color-mix(in srgb, var(--n) 40%, transparent); }
.lf-bc.ghost { background: rgba(56,189,248,.16); box-shadow: inset 0 0 0 1px #38bdf8; }
.lf-bc:is(.picked, .want, .over) { background: rgba(56,189,248,.24); box-shadow: inset 0 0 0 2px #38bdf8, 0 0 14px rgba(56,189,248,.45); }
.lf-bc.lifted { opacity: .35; }
.lf-bc.dim { opacity: .3; }
.lf-bc.focus { box-shadow: inset 0 0 0 2px #38bdf8; }
.lf-bc.clash { box-shadow: inset 0 0 0 2px #fbbf24; }
.lf-rot { position: absolute; width: 196px; transform: translate(-50%, -50%); background: linear-gradient(180deg, #141d2b, #0b111b); box-shadow: 0 8px 18px rgba(0,0,0,.5), inset 0 2px 0 #cbd5e1; }
.lf-rh { display: flex; justify-content: space-between; padding: 6px 10px; font-size:12px; font-weight: 700; letter-spacing: .14em; color: #cbd5e1; border-bottom: 1px solid #243044; }
.lf-row { position: relative; display: grid; grid-template-columns: 12px 34px minmax(0,1fr) auto; align-items: end; gap: 8px; height: 46px; padding: 0 10px; border-bottom: 1px solid #1a2333; box-shadow: inset 3px 0 0 var(--n); touch-action: none; user-select: none; cursor: grab; outline: none; }
.lf-row:focus-visible { outline: 2px solid #10b981; outline-offset: -2px; }
.lf-row.empty { cursor: pointer; }
.lf-row .rn { align-self: center; font-size:14px; color: #8791a3; }
.lf-row .rb { position: relative; display: block; width: 34px; height: 42px; overflow: hidden; background-repeat: no-repeat; }
.lf-row .nm { align-self: center; min-width: 0; font-size:14px; font-weight: 700; color: #fff; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lf-row .nm small { display: block; font-size:12px; font-weight: 600; color: #8791a3; }
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
.rl-wrap { display: grid; grid-template-columns: 236px minmax(0, 1fr); height: min(520px, 74vh); border-top: 1px solid rgba(255,255,255,.08); }
.rl-nav { display: flex; flex-direction: column; gap: 4px; padding: 14px 12px; overflow-y: auto; background: rgba(0,0,0,.22); border-right: 1px solid rgba(255,255,255,.06); }
.rl-nav button { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 12px; text-align: left; border-radius: 10px; color: #cbd5e1; transition: background .15s, color .15s; }
.rl-nav button:hover { color: #fff; background: rgba(255,255,255,.05); }
.rl-nav button:focus-visible { outline: 2px solid #38bdf8; outline-offset: -2px; }
.rl-nav svg { width: 20px; height: 20px; flex: none; fill: none; stroke: #6b7280; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.rl-nav b { font-size: 14px; font-weight: 700; }
.rl-nav button.on { color: #fff; background: linear-gradient(90deg, rgba(245,210,122,.16), rgba(245,210,122,.03)); box-shadow: inset 3px 0 0 #f5d27a; }
.rl-nav button.on svg { stroke: #f5d27a; }
.rl-page { min-width: 0; overflow-y: auto; padding: 18px 22px 22px; animation: fade .18s ease-out both; }
.rl-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 0 0 14px; }
.rl-facts > div { display: grid; justify-items: center; gap: 2px; padding: 12px 8px 10px; border-radius: 12px; background: linear-gradient(180deg, rgba(245,210,122,.1), rgba(245,210,122,.02)); box-shadow: inset 0 0 0 1px rgba(245,210,122,.22); }
.rl-facts b { font-family: 'Saira Condensed', sans-serif; font-size: 28px; font-weight: 800; line-height: 1; color: #f5d27a; }
.rl-facts span { font-size: 12px; font-weight: 700; color: #cbd5e1; }
.rl-flow { display: flex; gap: 22px; margin: 0 0 14px; padding: 0; list-style: none; }
.rl-flow li { position: relative; flex: 1; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 14px; font-weight: 700; color: #fff; background: rgba(255,255,255,.04); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
.rl-flow li + li::before { content: "›"; position: absolute; left: -16px; top: 50%; transform: translateY(-52%); font-size: 20px; color: #f5d27a; }
.rl-flow i { display: grid; place-items: center; flex: none; width: 22px; height: 22px; border-radius: 50%; font-family: 'Saira Condensed', sans-serif; font-size: 13px; font-style: normal; color: #05080f; background: #f5d27a; }
.rl-lead { margin: 0 0 14px; padding: 12px 14px; border-radius: 10px; font-size: 14px; line-height: 1.65; color: #e5e7eb; background: rgba(245,210,122,.07); box-shadow: inset 3px 0 0 #f5d27a; }
.rl-lead b, .rl-bd b { color: #fff; font-weight: 700; }
.rl-cards { columns: 2 320px; column-gap: 14px; }
.rl-card { break-inside: avoid; margin: 0 0 14px; padding: 14px 16px; border-radius: 12px; background: rgba(255,255,255,.035); box-shadow: inset 0 0 0 1px rgba(255,255,255,.07); }
.rl-t { margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #f5d27a; }
.rl-sm { margin: 2px 0 10px; font-size: 12px; color: #d6c08a; }
.rl-bd { font-size: 14px; line-height: 1.7; color: #d1d5db; }
.rl-bd p { margin: 0 0 8px; }
.rl-bd > :last-child { margin-bottom: 0; }
.rl-bd em { font-style: normal; font-weight: 600; color: #6ee7b7; }
.rl-tag { display: inline-block; padding: 0 6px; font-size:12px; font-weight: 600; line-height: 1.6; color: #fcd34d; background: rgba(251,191,36,.1); box-shadow: inset 0 0 0 1px rgba(251,191,36,.3); }
.rl-chip { display: inline-block; padding: 1px 8px; font-size:12px; font-weight: 600; line-height: 1.6; color: #e5e7eb; background: rgba(255,255,255,.06); box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }
.rl-chip.g { color: #f5d27a; background: rgba(245,210,122,.1); box-shadow: inset 0 0 0 1px rgba(245,210,122,.35); }
.rl-tip { display: flex; gap: 8px; margin: 10px 0 2px; padding: 7px 10px; font-size:12px; line-height: 1.6; color: #bae6fd; background: rgba(56,189,248,.07); }
.rl-tip::before { content: "팁"; flex: none; padding-top: 1px; font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 800; letter-spacing: .06em; color: #38bdf8; }
.rl-slots { display: grid; gap: 6px; margin: 4px 0 10px; }
.rl-slots > div { display: grid; grid-template-columns: 58px minmax(0, 1fr); align-items: center; gap: 8px; }
.rl-slots > div > span:first-child { font-size:12px; font-weight: 700; color: #9ca3af; }
.rl-slots i { margin-left: 3px; font-style: normal; font-family: 'Saira Condensed', sans-serif; color: #10b981; }
.rl-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.rl-steps { display: grid; gap: 6px; margin: 4px 0 8px; counter-reset: rl; }
.rl-steps > div { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 8px; align-items: start; }
.rl-steps > div::before { counter-increment: rl; content: counter(rl); display: grid; place-items: center; width: 22px; height: 22px; margin-top: 1px; font-family: 'Saira Condensed', sans-serif; font-size:14px; font-weight: 800; color: #04150e; background: #10b981; clip-path: inset(0 round 5px); }
.rl-yn { display: grid; gap: 4px; margin: 4px 0 8px; }
.rl-yn > div { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 6px; }
.rl-yn > div::before { font-weight: 800; text-align: center; }
.rl-yn .y::before { content: "✓"; color: #34d399; }
.rl-yn .n::before { content: "✕"; color: #f87171; }
.rl-tbl { display: grid; grid-template-columns: auto auto minmax(0, 1fr); margin: 4px 0 8px; font-size:12px; background: rgba(255,255,255,.03); }
.rl-tbl > span { padding: 5px 10px; border-top: 1px solid rgba(255,255,255,.05); }
.rl-tbl > span.h { border-top: 0; font-size:12px; font-weight: 700; color: #6b7280; background: rgba(255,255,255,.03); }
.rl-tbl .n { font-family: 'Saira Condensed', sans-serif; font-size:14px; font-weight: 700; color: #fff; text-align: right; }
.rl-tbl .up { color: #fca5a5; }
.rl-tbl .dn { color: #6ee7b7; }
.rl-kind { display: grid; grid-template-columns: auto minmax(0, 1fr); margin: 4px 0 8px; font-size:12px; background: rgba(255,255,255,.03); }
.rl-kind > div { display: contents; }
.rl-kind > div > span { padding: 6px 10px; border-top: 1px solid rgba(255,255,255,.05); line-height: 1.5; }
.rl-kind > div:first-child > span { border-top: 0; }
.rl-kind .rl-chip { margin: 0; }
.rl-ladder { display: grid; gap: 5px; margin: 4px 0 8px; }
.rl-ladder > div { display: grid; grid-template-columns: 34px 56px minmax(0, 1fr); align-items: center; gap: 8px; font-size:12px; line-height: 1.45; }
.rl-ladder b { font-family: 'Saira Condensed', sans-serif; font-size:18px; font-weight: 800; text-align: right; }
.rl-ladder i { display: block; height: 6px; background: rgba(255,255,255,.06); }
.rl-ladder i::after { content: ""; display: block; height: 100%; width: var(--w); background: var(--k); }
.rl-tiers { display: flex; gap: 4px; margin: 6px 0 8px; }
.rl-tiers > span { flex: 1; min-width: 0; padding: 5px 4px; text-align: center; font-size:12px; line-height: 1.35; color: #d1d5db; background: rgba(255,255,255,.04); box-shadow: inset 0 2px 0 rgba(16,185,129,.35); }
.rl-tiers > span b { display: block; font-family: 'Saira Condensed', sans-serif; font-size:14px; }
.rl-tiers > span:nth-child(2) { box-shadow: inset 0 2px 0 rgba(16,185,129,.65); }
.rl-tiers > span:nth-child(3) { background: rgba(16,185,129,.08); box-shadow: inset 0 2px 0 #10b981; }
.rl-syn { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 6px 0; padding: 7px 10px; background: rgba(255,255,255,.035); }
.rl-syn b { display: block; font-size:14px; }
.rl-syn small { font-size:12px; color: #9ca3af; }
.rl-syn em { flex: none; font-size:12px; }
/* ───── 카드 문법 UI (선수 카드와 같은 언어): 컷 코너 · 네온 HUD 브래킷 · 짙은 네이비 유리 · 스캔라인 ─────
   --a 는 강조색(기본 초록, 구단·등급 색으로 바꿔 쓴다), --c 는 컷 크기 */
.ui-cut { --c: 14px; clip-path: inset(0 round min(var(--c), 22px)); }
.ui-glass { background: linear-gradient(180deg,rgba(30,26,56,.74),rgba(10,9,22,.86)); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); box-shadow: inset 0 1px 0 rgba(255,255,255,.1); }
.ui-glass2 { background: linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02)),rgba(9,14,26,.88); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); box-shadow: inset 0 1px 0 rgba(255,255,255,.1); }
/* 프레임: 얇은 외곽선 + 좌상·우하 굵은 브래킷 + 컷 대각선. 자식 위에 얹히는 가상 요소라 내용과 상관없이 붙는다 */
.ui-frame { position: relative; }
.ui-frame::after { content: ""; position: absolute; inset: 0; z-index: 7; pointer-events: none; border-radius: inherit; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--a, #10b981) 12%, rgba(245,210,122,.3)); }
.ui-frame.hot::after { box-shadow: inset 0 0 0 1.5px var(--a, #10b981), inset 0 0 36px color-mix(in srgb, var(--a, #10b981) 24%, transparent); }
.ui-lab { display: inline-flex; align-items: center; gap: 8px; font-family: 'IBM Plex Sans KR', 'Malgun Gothic', sans-serif !important; font-size:14px !important; font-weight: 800; letter-spacing: .02em; color: var(--a, #10b981); }
.ui-lab::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
.ui-btn { --c: 12px; position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 44px; padding: 0 20px; border-radius: 12px; font-size:14px; font-weight: 700; color: #e8ecf2; white-space: nowrap; background: rgba(255,255,255,.07); box-shadow: inset 0 1px 0 rgba(255,255,255,.1), inset 0 0 0 1px rgba(255,255,255,.06); transition: background .15s, box-shadow .15s, filter .15s, transform .15s; }
.ui-btn:not(.pri):hover:not(:disabled) { color: #fff; background: rgba(245,210,122,.1); box-shadow: inset 0 1px 0 rgba(255,255,255,.12), inset 0 0 0 1px rgba(245,210,122,.5), 0 8px 20px -10px rgba(245,210,122,.5); } /* 금빛 테두리 · 옅은 금빛 바탕 (주 단추는 따로) */
.ui-btn:focus-visible { outline: none; box-shadow: inset 0 0 0 2px #38bdf8; }
.ui-btn:disabled { opacity: .4; cursor: not-allowed; }
.ui-btn.pri { color:#1a1408; font-weight:800; background:linear-gradient(180deg,#fbe7a8,#e3b24a 55%,#b7832a); box-shadow:0 10px 26px -8px rgba(227,178,74,.65), inset 0 1px 0 rgba(255,255,255,.7), inset 0 -2px 0 rgba(0,0,0,.2); }
.ui-btn.pri:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
.ui-btn.pri:focus-visible { box-shadow: inset 0 0 0 2px #05080f; }
.ui-btn.sm { --c: 10px; min-height: 32px; padding: 0 12px; border-radius: 10px; font-size:14px; }
.ui-chip { --c: 999px; display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size:12px; font-weight: 600; color: #cbd5e1; background: rgba(255,255,255,.05); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--a, #94a3b8) 40%, transparent); }
.ui-seg { display: grid; grid-template-columns: repeat(24, 1fr); gap: 3px; height: 10px; }
.ui-seg i { border-radius: 3px; background: rgba(255,255,255,.07); transition: background .4s, box-shadow .4s; }
.ui-seg i.on { background: var(--a, #10b981); box-shadow: 0 0 8px var(--a, #10b981); }
.ui-scan { background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px); }
/* 화면 배경: 단계마다 Higgsfield 구장 이미지 + 가장자리 암부 + 스캔라인 */
.ui-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; background: #05080f center / cover no-repeat; }
.ui-bg::after { content: ""; position: absolute; inset: 0; background: radial-gradient(60% 50% at 50% 40%, rgba(124,58,237,.22), transparent 70%), radial-gradient(120% 90% at 50% 38%, rgba(7,9,19,.45), rgba(5,6,14,.94) 78%); }
.ui-bg.soft::after { background: radial-gradient(120% 90% at 50% 40%, rgba(5,8,15,.15), rgba(5,8,15,.8) 80%); }
/* 중계 그래픽 묶음 → HUD 판: 컷 코너 유리 판 + 브래킷 프레임 + 왼쪽 위 라벨 */
.bc-grp { --c: 22px; --a: #10b981; position: relative; padding: 34px 12px 12px; border-radius: 22px; background: linear-gradient(180deg,rgba(30,26,56,.74),rgba(10,9,22,.86)); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); box-shadow: 0 30px 60px -30px rgba(0,0,0,.9); clip-path: inset(0 round 22px); }
.bc-grp::after { content: ""; position: absolute; inset: 0; z-index: 7; pointer-events: none; border-radius: inherit; box-shadow: inset 0 1px 0 rgba(255,255,255,.08), inset 0 0 0 1px rgba(245,210,122,.3); }
/* 판 모서리 장식 — 왼쪽 위 · 오른쪽 아래 금빛 괄호(내 차례 빛은 ::before 가 쓰므로 이름표 뒤에 단다) */
.bc-grp > .bc-label::after { content: ""; position: absolute; left: -13px; top: -3px; width: 24px; height: 24px; border: 2px solid #f5d27a; border-right: 0; border-bottom: 0; border-radius: 12px 0 0 0; opacity: .85; filter: drop-shadow(0 0 5px rgba(245,210,122,.6)); pointer-events: none; }
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
.bc-label { position: absolute; z-index: 8; left: 20px; top: 10px; display: inline-flex; align-items: center; gap: 8px; font-family: 'IBM Plex Sans KR', 'Malgun Gothic', sans-serif !important; font-size:14px; font-weight: 700; color: var(--a, #10b981); }
.bc-label::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
/* 시리즈 머리: 뒤에 윤곽선 연도(흐름 안에 두고 오른쪽을 겹쳐 연도 유무·길이에 맞춰 제목이 따라붙음) · 위계 = 팀명 > 설명 태그 > 종류 */
.ser-wm { flex: none; margin: 0 -30px -18px -2px; font-size: 60px; font-weight: 800; line-height: 1; white-space: nowrap; color: transparent; -webkit-text-stroke: 1px color-mix(in srgb, var(--a) 45%, transparent); pointer-events: none; user-select: none; }
.ser-ttl { position: relative; min-width: 0; display: flex; align-items: center; gap: 12px; }
/* 선반 포지션 탭 — 알약 틀 · 고른 탭만 떠오름 · 후보 수 · 내 라인업에 빈 자리가 있으면 초록 점 */
.ser-tabs { display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: rgba(255,255,255,.05); }
.ser-tabs button { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 14px; border-radius: 8px; font-size: 14px; font-weight: 700; color: #9ca3af; transition: color .2s, background .2s; }
.ser-tabs button:hover { color: #e5e7eb; }
.ser-tabs button.on { color: #fff; background: linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.06)); box-shadow: inset 0 1px 0 rgba(255,255,255,.2); }
.ser-tabs small { font-family: 'Saira Condensed', sans-serif; font-size: 12px; font-weight: 700; color: #6b7280; }
.ser-tabs i { width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399; }
/* 고른 선수 — 카드 아래 시즌 기록(있는 칸만) · 강점/약점 */
.pk-rec { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; border-top: 1px solid rgba(255,255,255,.08); border-bottom: 1px solid rgba(255,255,255,.08); }
.pk-rec div { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0; }
.pk-rec div + div { box-shadow: inset 1px 0 0 rgba(255,255,255,.06); }
.pk-rec span { font-size: 12px; color: #6b7280; }
.pk-rec b { font-family: 'Saira Condensed', sans-serif; font-size: 14px; font-weight: 700; color: #fff; }
.pk-trs { display: flex; flex-wrap: wrap; gap: 6px; }
.pk-trs span { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 9px; border-radius: 999px; font-size: 12px; font-weight: 700; color: #e5e7eb; background: rgba(255,255,255,.05); box-shadow: inset 0 0 0 1px var(--c); }
.pk-trs b { color: var(--c); }
.ser-kind { flex: none; font-size:12px; font-weight: 700; letter-spacing: .16em; color: var(--a); }
.ser-name { flex: none; margin: 0; padding-bottom: 5px; font-size:28px; font-weight: 900; line-height: 1; white-space: nowrap; color: #fff; background: linear-gradient(90deg, var(--a), transparent) left bottom / 100% 3px no-repeat; }
.ser-sub { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 2px 14px 2px 9px; font-size:14px; font-weight: 600; line-height: 1.25; color: #e5e7eb; background: linear-gradient(90deg, color-mix(in srgb, var(--a) 16%, transparent), transparent 92%); box-shadow: inset 2px 0 0 var(--a); clip-path: inset(0 round 0 8px 8px 0); }
/* 선반 보기 스위치: 켜면 영입 가능한 선수만 */
.ser-sw { display: inline-flex; align-items: center; gap: 9px; font-size:14px; font-weight: 600; color: #cbd5e1; }
/* 라이브 진행 배속 · 건너뛰기 */
.dr-sp { display: inline-flex; gap: 2px; }
.dr-sp button { padding: 2px 7px; font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 700; color: #9ca3af;
  clip-path: inset(0 round 4px); background: rgba(255,255,255,.05); transition: color .15s, background .15s; }
.dr-sp button:hover { color: #fff; }
.dr-sp button.on { color: #05080f; background: #38e1ff; }
/* 드래프트 권 — 상점에서 산 장수를 달고 판에서 쓴다 */
.pk-was { margin-right: 4px; font-size: .62em; color: #64748b; text-decoration-thickness: 1px; }
.dr-tk { display: inline-flex; gap: 3px; }
.dr-tk button { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size:12px; font-weight: 700; color: #fcd34d;
  clip-path: inset(0 round 4px);
  background: rgba(251,191,36,.12); box-shadow: inset 0 0 0 1px rgba(251,191,36,.3); transition: color .15s, background .15s, opacity .15s; }
.dr-tk button:hover:not(:disabled) { color: #05080f; background: #fbbf24; }
.dr-tk button:disabled { opacity: .32; cursor: default; }
.dr-tk button.on { color: #05080f; background: #fbbf24; }
.dr-tk em { font-family: 'Saira Condensed', sans-serif; font-style: normal; font-size:12px; }
.dr-skip { display: grid; place-items: center; width: 26px; height: 21px; font-size:12px; line-height: 1; color: #cbd5e1;
  clip-path: inset(0 round 4px);
  background: rgba(255,255,255,.1); transition: color .15s, background .15s; }
.dr-skip:hover:not(:disabled) { color: #fff; background: rgba(255,255,255,.12); }
.dr-skip:disabled { opacity: .35; cursor: default; }
/* 라이브 드래프트 뽑는 순서 표 — 머리 줄 가운데 */
/* 라이브: 한 판 두 층 */
.dr-panel { display: grid; gap: 4px; margin-top: -26px; padding: 5px 12px;
  clip-path: inset(0 round 8px);
  background: rgba(255,255,255,.04); box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }
.dr-top { display: flex; align-items: center; gap: 12px; }
.dr-top .dr-toggle { margin-left: auto; }
.dr-bar { display: flex; align-items: center; gap: 10px; }
/* 가운데: 라운드와 샐러리 캡 잔여 */
.dr-meta.inline { position: static; transform: none; padding: 0; gap: 10px; background: none; box-shadow: none; }
.dr-meta.inline .dr-round b { font-size:18px; }
.dr-meta.inline .dr-ticks i { height: 10px; }
.dr-meta.inline .dr-cap b { font-size:14px; }
.dr-meta { position: absolute; left: 50%; top: 50%; z-index: 4; display: flex; align-items: center; gap: 14px; padding: 4px 12px; transform: translate(-50%, -50%);
  clip-path: inset(0 round 8px);
  background: rgba(255,255,255,.04); box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }
.dr-round { display: flex; align-items: baseline; gap: 6px; }
.dr-round small { font-family: 'IBM Plex Sans KR', 'Malgun Gothic', sans-serif; font-size:12px; font-weight: 700; color: #6b7280; }
.dr-round b { font-family: 'Saira Condensed', sans-serif; font-size:18px; line-height: 1; color: #fff; }
.dr-round small + b + small { font-size:12px; letter-spacing: 0; }
.dr-cap { display: flex; align-items: center; gap: 9px; }
.dr-cap b { font-family: 'Saira Condensed', sans-serif; font-size:18px; color: var(--a); }
.dr-cap > small { font-family: 'Saira Condensed', sans-serif; font-size:12px; color: #6b7280; }
.dr-ticks { display: flex; gap: 2px; }
.dr-ticks i { width: 4px; height: 13px; transform: skewX(-18deg); background: rgba(255,255,255,.12); }
.dr-ticks i.on { background: var(--a); box-shadow: 0 0 6px color-mix(in srgb, var(--a) 40%, transparent); }
.dr-ticks i.spend { background: rgba(148,163,184,.4); }
/* 오른쪽: 전체보기 토글을 순서 판 위에 작게 */
.dr-toggle { display: inline-flex; align-items: center; gap: 6px; font-size:12px; font-weight: 700; color: #9ca3af; }
.dr-toggle .tr { position: relative; width: 22px; height: 12px; border-radius: 99px; background: rgba(255,255,255,.14); transition: background .15s; }
.dr-toggle .tr::after { content: ""; position: absolute; top: 2px; left: 2px; width: 8px; height: 8px; border-radius: 50%; background: #fff; transition: left .15s; }
.dr-toggle[aria-pressed="true"] { color: #e8ecf2; }
.dr-toggle[aria-pressed="true"] .tr { background: #10b981; }
.dr-toggle[aria-pressed="true"] .tr::after { left: 12px; }
.dr-div { width: 1px; height: 18px; background: rgba(255,255,255,.14); }
.dr-order { display: flex; align-items: center; pointer-events: none; }
.dr-clock { width: 34px; margin-left: 8px; text-align: right; font-family: 'Saira Condensed', sans-serif; font-size:14px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--t); }
.dr-pc { position: relative; display: flex; align-items: center; justify-content: center; width: 72px; height: 24px; padding: 0 8px 0 14px; margin-left: -12px;
  clip-path: polygon(0 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,0 100%,14px 50%);
  background: rgba(255,255,255,.05); transition: background .3s ease, box-shadow .3s ease; }
.dr-pc:first-child { margin-left: 0; }
.dr-pc > i { position: absolute; inset: 0; background: center 28% / cover no-repeat; opacity: .1; mix-blend-mode: luminosity; }
.dr-pc > b { position: relative; font-size:12px; font-weight: 700; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dr-pc.past { background: color-mix(in srgb, var(--t) 18%, transparent); }
.dr-pc.past > i { opacity: .1; }
.dr-pc.now { z-index: 2; background: var(--t); box-shadow: 0 0 18px -5px var(--t); }
/* 내 차례가 온 순간 — 칩이 한 번 커지며 환해졌다 돌아온다 */
.dr-pc.now.me { animation: drMe .7s var(--fx-out) both; }
@keyframes drMe { 35% { transform: scale(1.22); filter: brightness(1.7); } } /* 칩은 모양대로 잘려 있어 빛 테두리 대신 밝기로 */
.dr-clock.low { color: #f87171; animation: drTick .35s var(--fx-out); }
@keyframes drTick { 40% { transform: scale(1.3); } }
@media (prefers-reduced-motion: reduce) { .dr-pc.now.me, .dr-clock.low { animation: none; } }
.dr-pc.now > i { opacity: .16; } /* 지금 차례 칩: 엠블럼 무늬가 글자를 가리지 않게 옅게 */
.dr-pc.now > b { font-size:12px; font-weight: 900; letter-spacing: -.01em; color: #05080f; text-shadow: 0 1px 2px rgba(255,255,255,.35); font-variant-numeric: tabular-nums; }
.ser-sw .tr { position: relative; width: 34px; height: 18px; border-radius: 9px; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); transition: background-color .2s, box-shadow .2s; }
.ser-sw .tr::after { content: ""; position: absolute; left: 3px; top: 3px; width: 12px; height: 12px; border-radius: 50%; background: #9ca3af; transition: transform .2s, background-color .2s; }
.ser-sw:hover { color: #fff; }
.ser-sw[aria-pressed="true"] { color: #fff; }
.ser-sw[aria-pressed="true"] .tr { background: color-mix(in srgb, var(--a) 35%, transparent); box-shadow: inset 0 0 0 1px var(--a); }
.ser-sw[aria-pressed="true"] .tr::after { transform: translateX(16px); background: var(--a); }
/* 새로고침: 네온 테두리 텍스트 버튼 “새로고침 · N회” */
.ser-refresh { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px; font-size:14px; font-weight: 700; white-space: nowrap; color: var(--a); background: color-mix(in srgb, var(--a) 8%, transparent); box-shadow: inset 0 0 0 1px var(--a); transition: background-color .15s; }
.ser-refresh em { font-style: normal; font-weight: 600; color: #cbd5e1; }
.ser-refresh svg { width: 16px; height: 16px; transition: transform .45s cubic-bezier(.3,0,.2,1); }
.ser-refresh:hover:not(:disabled) { background: color-mix(in srgb, var(--a) 18%, transparent); }
.ser-refresh:hover:not(:disabled) svg { transform: rotate(200deg); }
.ser-refresh:disabled { opacity: .4; cursor: not-allowed; }
.ser-sw:focus-visible, .ser-refresh:focus-visible { outline: 2px solid var(--a); outline-offset: 2px; }
/* 빈 자리 포지션 거르기 칩 (누르면 해제) */
.ser-pf { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px; font-size:14px; font-weight: 700; white-space: nowrap; color: #bae6fd; background: rgba(12,34,51,.85); box-shadow: inset 0 0 0 1px #38bdf8; transition: background-color .15s; }
.ser-pf:hover { background: rgba(17,48,74,.95); }
.ser-pf span { font-size:12px; color: #7dd3fc; }
.ser-pf:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }
/* 선반 카드 (MiniCard) — 단위는 카드 폭 기준 cqw */
.mc-in { position: absolute; inset: 0; }
/* 자리 거르기로 선반에서 빠지는 카드: 살짝 가라앉으며 사라짐 (남는 카드는 선반을 다시 그려 rise 로 차례로 떠오름) */
@keyframes mcLeave { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(10px) scale(.9); } }
.mc.mc-leave { pointer-events: none; animation: mcLeave .18s ease-in both; }
.mc-sh { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,8,15,.62) 0, rgba(5,8,15,0) 26%, rgba(5,8,15,0) 44%, rgba(5,8,15,.88) 70%, #05080f 100%); }
.mc-tb { display: none; }
.mc.t75 .mc-tb { background: #34d399; box-shadow: 0 0 4px rgba(52,211,153,.7); }
.mc.t90 .mc-tb { background: linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc) 0 50% / 200% 100%; animation: prism 3s linear infinite; box-shadow: 0 0 5px rgba(125,211,252,.7); }
.mc-ov { position: absolute; left: 8cqw; top: 6cqw; font-size: 28cqw; font-weight: 800; line-height: .9; background: linear-gradient(180deg,#fff,#b6c2d1); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 2px 4px rgba(0,0,0,.7)); }
.mc.t75 .mc-ov { background: linear-gradient(180deg,#d1fae5,#34d399); -webkit-background-clip: text; background-clip: text; }
.mc.t90 .mc-ov { background: linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc) 0 50% / 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: none; -webkit-text-stroke: .6px rgba(0,0,0,.75); paint-order: stroke fill; animation: prism 3s linear infinite; }
.mc-pos { position: absolute; right: 6cqw; top: 8cqw; display: flex; line-height: 1; }
.mc-pos em { padding: 2.5cqw 5cqw; border-radius: 999px; font-style: normal; font-size: max(12px, 10cqw); font-weight: 700; color: #e5e7eb; background: rgba(5,8,15,.72); }
.mc-pos span { display: none; }
.mc-rule { display: none; }
.mc-nm { position: absolute; left: 8cqw; right: 8cqw; bottom: 19cqw; font-size: 17cqw; font-weight: 700; line-height: 1.1; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -.02em; }
.mc-cp { position: absolute; left: 8cqw; bottom: 7cqw; display: flex; align-items: baseline; gap: 2cqw; line-height: 1; }
.mc-cp small { order: 2; font-size: max(12px, 9cqw); font-weight: 600; color: #9ca3af; }
.mc-cp b { font-size: 12cqw; font-weight: 800; color: #fbbf24; }
.mc.c3 .mc-cp b { font-size: 12cqw; }
.mc:not(.c3) .mc-nm { right: 8cqw; }
/* 긴 이름(외국인 등)은 글자 수만큼 줄여 한 줄에 다 보이게 */
.mc-nm.l4 { font-size: 15cqw; }
.mc-nm.l5 { font-size: 12.5cqw; }
.mc-nm.l6 { font-size: max(12px, 11cqw); }
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
.mc-slot { display: block; width: 100%; aspect-ratio: 2 / 3; clip-path: inset(0 round 7% / 4.7%); background: rgba(255,255,255,.02); box-shadow: inset 0 0 0 1px rgba(148,163,184,.08); }
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
.mc-lk { position: absolute; z-index: 6; left: 6cqw; right: 6cqw; top: 58cqw; display: flex; align-items: center; justify-content: center; gap: 2cqw; padding: 3.5cqw 1cqw; font-size: max(12px, 10.5cqw); font-weight: 800; line-height: 1; color: #f9fafb; background: rgba(5,8,15,.9); box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.75), 0 2px 10px rgba(0,0,0,.7); }
.mc-lk svg { width: 10cqw; height: 10cqw; flex: none; }
.mc-lk span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 시너지 칸 (선반 카드 오른쪽 위) */
@keyframes mcPip { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
/* 선반 카드: 얼굴을 가리지 않게 오른쪽 아래 — CP 줄 오른쪽 */
.mc-syn { position: absolute; z-index: 5; right: 5cqw; bottom: 8cqw; display: flex; align-items: center; gap: 1.2cqw; padding: 2cqw 2.4cqw; border-radius: 999px; line-height: 1; background: rgba(5,8,15,.8); box-shadow: inset 0 0 0 1px rgba(52,211,153,.4); }
.mc-syn svg { width: 8cqw; height: 8cqw; margin-right: .6cqw; color: #6ee7b7; }
.mc-syn i { width: 3.2cqw; height: 5.5cqw; background: rgba(255,255,255,.25); transform: skewX(-12deg); }
.mc-syn i.on { background: #e5e7eb; }
.mc-syn i.max { background: #10b981; }
.mc-syn i.nx { background: #38bdf8; animation: mcPip 1.2s ease-in-out infinite; }
.mc-syn em { margin-left: .6cqw; font-style: normal; font-size: max(12px, 7.5cqw); font-weight: 800; color: #7dd3fc; }
/* 상단 샐러리 캡: PICK 선수를 영입하면 깎일 칸 */
@keyframes capBlink { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
.ui-seg i.spend { background: #fbbf24; box-shadow: 0 0 8px #fbbf24; animation: capBlink 1.2s ease-in-out infinite; }
/* PICK 카드 (PlayerCard) — 막대 그래프 판. 단위는 카드 폭 기준 cqw */
.pk { container-type: inline-size; background: #05080f; clip-path: inset(0 round 6% / 4%); }
.pk-body, .pk-in { position: absolute; inset: 0; }
.pk-in { overflow: hidden; }
.pk-art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 60% 20%; transition: transform .5s; }
.pk:hover .pk-art { transform: scale(1.04); }
.pk-sh { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,8,15,.55) 0, rgba(5,8,15,0) 24%, rgba(5,8,15,0) 44%, rgba(5,8,15,.9) 70%, #05080f 100%), linear-gradient(90deg, rgba(5,8,15,.5) 0, rgba(5,8,15,0) 50%); }
.pk-fr { position: absolute; inset: 0; z-index: 5; border-radius: 6% / 4%; border: 1px solid color-mix(in srgb, var(--n) 30%, rgba(255,255,255,.14)); box-shadow: inset 0 1px 0 rgba(255,255,255,.18); pointer-events: none; }
/* 빛줄기 — 반짝이 카드(내 라커 상세 카드와 같은 결) */
@keyframes pkSheen { 0% { background-position: -160% 0; } 100% { background-position: 260% 0; } }
.pk-in::after { content: ""; position: absolute; inset: 0; z-index: 4; pointer-events: none; mix-blend-mode: screen; background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.26) 47%, rgba(125,211,252,.18) 52%, transparent 64%) 0 0 / 220% 100% no-repeat; animation: pkSheen 4.5s ease-in-out infinite; }
.pk.lock .pk-in::after { animation: none; opacity: 0; }
@media (prefers-reduced-motion: reduce) { .pk-in::after { animation: none; opacity: 0; } }
.pk-tb { display: none; }
.pk.t75 .pk-tb { background: #34d399; box-shadow: 0 0 5px rgba(52,211,153,.7); }
.pk.t90 .pk-tb { background: linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc) 0 50% / 200% 100%; animation: prism 3s linear infinite; }
.pk-ov { position: absolute; left: 6cqw; top: 6cqw; font-size: 24cqw; font-weight: 800; line-height: .85; color: #f3f4f6; text-shadow: 0 0 2px #000, 0 2px 10px #000; }
.pk.t75 .pk-ov { color: #34d399; }
.pk.t90 .pk-ov { background: linear-gradient(90deg, #f0abfc, #7dd3fc, #6ee7b7, #fde68a, #f0abfc) 0 50% / 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: none; -webkit-text-stroke: .6px rgba(0,0,0,.75); paint-order: stroke fill; animation: prism 3s linear infinite; }
.pk-ov em { margin-left: 1cqw; font-style: normal; font-size: .32em; vertical-align: top; -webkit-text-fill-color: currentColor; }
.pk-ov em.dn, .pk-st dd em.dn { color: #fbbf24; }
.pk-ov em.up { color: #34d399; }
.pk-meta { position: absolute; left: 6.5cqw; top: 28cqw; font-size: max(12px, 4.2cqw); font-weight: 600; letter-spacing: .08em; color: rgba(255,255,255,.75); white-space: nowrap; text-shadow: 0 1px 4px #000; }
.pk-stats { position: absolute; left: 5cqw; top: 35cqw; width: 42cqw; margin: 0; padding: 2.4cqw 3cqw 1cqw; border-radius: 2.6cqw; background: rgba(5,8,15,.6); backdrop-filter: blur(6px); box-shadow: inset 0 1px 0 rgba(255,255,255,.08); }
.pk-st { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; padding-bottom: 1.6cqw; }
.pk-st dt { font-size: max(12px, 4cqw); font-weight: 600; color: #cbd5e1; }
.pk-st dd { margin: 0; font-size: max(12px, 6cqw); font-weight: 700; line-height: 1; color: #f3f4f6; }
.pk-st dd.hi { color: var(--n); }
.pk-st dd em { margin-left: .8cqw; font-style: normal; font-size: .62em; }
.pk-st dd em.up { color: #34d399; }
/* 능력치 막대: 내 라커와 같은 규칙 — 낮으면 푸른 회색 → 높을수록 카드(구단) 색, 빛 번짐 없음 */
.pk-bar { display: block; flex-basis: 100%; height: 1.4cqw; margin-top: .8cqw; border-radius: 1cqw; overflow: hidden; background: rgba(255,255,255,.08); }
.pk-bar b { display: block; height: 100%; }
.pk .mc-syn { right: 4cqw; top: 5cqw; bottom: auto; gap: .8cqw; padding: 1.4cqw 1.8cqw; }
.pk .mc-syn svg { width: 5cqw; height: 5cqw; margin-right: .4cqw; }
.pk .mc-syn i { width: 2cqw; height: 3.6cqw; }
.pk .mc-syn em { font-size: max(12px, 3.6cqw); }
.mc-syn b { margin-left: 1cqw; font-size: max(12px, 3.6cqw); font-weight: 700; color: #a7f3d0; white-space: nowrap; }
.pk-chips { position: absolute; left: 6cqw; right: 6cqw; bottom: 50cqw; display: flex; flex-wrap: wrap; gap: 1.2cqw; }
.pk-chips span { padding: .8cqw 2.2cqw; border-radius: 999px; font-size: max(12px, 3.4cqw); font-weight: 700; line-height: 1.1; background: rgba(5,8,15,.72); }
.pk-chips .sy { color: #a7f3d0; box-shadow: inset 0 0 0 1px rgba(52,211,153,.55); }
.pk-chips .off { color: #fde68a; box-shadow: inset 0 0 0 1px rgba(251,191,36,.55); }
.pk-note { position: absolute; left: 6cqw; right: 6cqw; bottom: 43cqw; font-size: max(12px, 4cqw); font-weight: 500; color: #d1d5db; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 4px #000; }
.pk-pos { position: absolute; left: 6cqw; right: 6cqw; bottom: 35.5cqw; display: flex; align-items: center; gap: 1.8cqw; line-height: 1; white-space: nowrap; }
.pk-pos em { flex: none; padding: .8cqw 2cqw; border-radius: 1.4cqw; font-style: normal; font-size: max(12px, 4.4cqw); font-weight: 800; color: #05080f; background: var(--n); }
.pk-pos > span:not(.tg) { min-width: 0; overflow: hidden; font-size: max(12px, 4.6cqw); font-weight: 500; letter-spacing: .07em; color: #e5e7eb; }
.pk-pos .tg { margin-left: auto; display: flex; gap: 1cqw; }
.pk-pos .tg b { padding: .7cqw 2cqw; border-radius: 999px; font-family: 'IBM Plex Sans KR', system-ui, sans-serif; font-size: max(12px, 3.6cqw); font-weight: 700; color: #fff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.4); }
.pk-rule { position: absolute; left: 6cqw; right: 6cqw; bottom: 32.5cqw; height: 1px; background: linear-gradient(90deg, var(--n), color-mix(in srgb, var(--n) 15%, transparent)); }
.pk-nm { position: absolute; left: 6cqw; right: 25cqw; bottom: 7cqw; font-size: 14cqw; font-weight: 800; line-height: 1.05; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -.02em; text-shadow: 0 2px 8px #000; }
.pk-nm.l5 { font-size: max(12px, 11cqw); }
.pk-cp { position: absolute; right: 6cqw; bottom: 7.5cqw; text-align: right; line-height: .9; }
.pk-cp small { display: block; font-size: max(12px, 3.8cqw); font-weight: 700; letter-spacing: .1em; color: #9ca3af; }
.pk-cp b { display: block; font-size: 12cqw; font-weight: 800; color: var(--n); text-shadow: 0 0 10px color-mix(in srgb, var(--n) 55%, transparent); }
.pk-slot { position: absolute; right: 6cqw; bottom: 9cqw; padding: 1.2cqw 2.6cqw; font-size: max(12px, 4.4cqw); font-weight: 800; line-height: 1; color: #05080f; background: var(--n); clip-path: inset(0 round 1.6cqw); }
.pk.lock .pk-in { filter: grayscale(1) brightness(.55); }
.pk.lock .pk-ov, .pk.lock .pk-tb { animation: none; }
.pk-lk { position: absolute; z-index: 6; left: 10cqw; right: 10cqw; top: 64cqw; display: flex; align-items: center; justify-content: center; gap: 2cqw; padding: 3cqw 1cqw; font-size: max(12px, 5.6cqw); font-weight: 800; line-height: 1; color: #f9fafb; white-space: nowrap; background: rgba(5,8,15,.9); box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.75), 0 4px 16px rgba(0,0,0,.7); }
.pk-lk svg { width: 5.5cqw; height: 5.5cqw; flex: none; }
/* PICK 카드 무대 · 뒤집기 (반쪽 0.22초, 옆면일 때 4% 들어 올림) */
.pk-stage { position: relative; perspective: 1000px; filter: drop-shadow(0 22px 28px rgba(0,0,0,.65)); }
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
.pk-empty { --n: #64748b; position: relative; container-type: inline-size; background: conic-gradient(from var(--pkr), transparent 0 75%, rgba(52,211,153,.9) 88%, transparent 100%); clip-path: inset(0 round 6% / 4%); animation: pkRing 4.5s linear infinite; }
.pk-empty::before { content: ""; position: absolute; inset: 1.5px; clip-path: inset(0 round 6% / 4%); background: linear-gradient(180deg, #0a1120, #070c16); } /* 카드 면: 둘레 1.5px 만 남겨 빛이 잘린 모서리까지 따라 돎 */
.pk-sk { position: absolute; background: rgba(148,163,184,.09); }
.pk-ghostbtn { flex: none; height: 44px; background: rgba(255,255,255,.03); box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); clip-path: inset(0 round 10px); animation: pkBtnBreath 2.4s ease-in-out 1.6s infinite; }
/* 빈 PICK 대기 움직임: 스켈레톤 블록이 위(종합)→아래(이름·CP) 차례로 밝아졌다 가라앉고(끝에 버튼 틀이 초록으로 살짝),
   카드 둘레를 초록 빛 한 점이 4.5초에 한 바퀴 돈다(.pk-empty 배경의 회전 빛 + 1.5px 안쪽 카드 면) — 카드 크기 · 2:3 비율은 그대로 */
@property --pkr { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
.pk-sk { animation: pkSkBreath 2.4s ease-in-out infinite; animation-delay: calc(var(--i) * .09s); }
.pk-back.hidden .pk-empty, .pk-back.hidden .pk-sk { animation-play-state: paused; }
@keyframes pkRing { to { --pkr: 360deg; } }
@keyframes pkSkBreath { 0%, 100% { filter: brightness(1); } 30% { filter: brightness(2.1); } }
@keyframes pkBtnBreath { 0%, 100% { box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); } 30% { box-shadow: inset 0 0 0 1px rgba(110,231,183,.35); } }
/* PICK 영입 버튼: 이름·코스트는 카드에 있으니 “+ 영입하기”만 */
.pk-go { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 48px; padding: 0 12px; font-size:14px; font-weight: 800; color:#1a1408; font-weight:800; background:linear-gradient(180deg,#fbe7a8,#e3b24a 55%,#b7832a); box-shadow:0 10px 26px -8px rgba(227,178,74,.65), inset 0 1px 0 rgba(255,255,255,.7), inset 0 -2px 0 rgba(0,0,0,.2); clip-path: inset(0 round 14px); transition: filter .15s; }
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
/* 아래에서 솟아오르며 자리를 잡는다 */
@keyframes augIn { from { opacity: 0; transform: translateY(54px) scale(.9); } to { opacity: 1; transform: none; } }
/* 고른 카드 — 한 번 눌렸다가 빛을 머금고 천천히 떠오른다 */
@keyframes augTake {
  0% { transform: translateY(-20px) scale(1.085); filter: brightness(1); }
  14% { transform: translateY(-12px) scale(1.03); filter: brightness(1.1); }
  46% { transform: translateY(-30px) scale(1.14); filter: brightness(1.5) saturate(1.25); }
  100% { transform: translateY(-78px) scale(1.2); filter: brightness(2.1) saturate(1.1); opacity: 0; } }
/* 고르지 않은 카드 — 뒤로 가라앉는다 */
@keyframes augDrop { 0% { opacity: .5; } 100% { opacity: 0; transform: translateY(34px) scale(.86); filter: brightness(.35) blur(2px); } }
/* 고른 자리에서 두 겹으로 퍼지는 고리 */
@keyframes augRing { 0% { opacity: 0; transform: scale(.7); } 18% { opacity: .95; } 100% { opacity: 0; transform: scale(2.1); } }
.aug-card { animation: augIn .5s cubic-bezier(.2,.9,.3,1) both; transition: transform .3s cubic-bezier(.18,.9,.28,1), opacity .3s, filter .3s; }
/* 금테 증강 카드 */
.aug-gold .aug-face { position: absolute; inset: 0; overflow: hidden; border-radius: 24px; background: linear-gradient(180deg, #1a1633, #0b0a18 60%);
  box-shadow: inset 0 0 0 1px rgba(245,210,122,.45), inset 0 0 0 5px rgba(11,10,24,.9), inset 0 0 0 6px rgba(196,181,253,.22), 0 36px 60px -24px rgba(0,0,0,.95); transition: box-shadow .3s; }
.aug-gold .aug-face::before, .aug-gold .aug-face::after { content: ""; position: absolute; z-index: 5; width: 28px; height: 28px; border: 2px solid #f5d27a; pointer-events: none; filter: drop-shadow(0 0 6px rgba(245,210,122,.7)); }
.aug-gold .aug-face::before { left: 10px; top: 10px; border-right: 0; border-bottom: 0; border-radius: 12px 0 0 0; }
.aug-gold .aug-face::after { right: 10px; bottom: 10px; border-left: 0; border-top: 0; border-radius: 0 0 12px 0; }
.aug-gold.hot .aug-face, .aug-gold:focus-visible .aug-face { box-shadow: inset 0 0 0 2px #f5d27a, inset 0 0 0 5px rgba(11,10,24,.9), inset 0 0 0 6px rgba(196,181,253,.4), 0 40px 70px -24px rgba(0,0,0,.95), 0 0 80px -10px rgba(167,139,250,.75); }
.aug-gold .aug-art { -webkit-mask: linear-gradient(#000 62%, transparent); mask: linear-gradient(#000 62%, transparent); }
.aug-gold .aug-veil { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(11,10,24,.35) 0, transparent 22%, transparent 42%, rgba(11,10,24,.85) 62%, #0b0a18 82%); }
.aug-gold .aug-shine { position: absolute; inset: 0; z-index: 3; pointer-events: none; mix-blend-mode: screen; opacity: 0; transition: opacity .3s; background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.3) 47%, rgba(196,181,253,.24) 52%, transparent 64%) 0 0 / 220% 100% no-repeat; animation: augSheen 4.5s ease-in-out infinite; }
.aug-gold.hot .aug-shine { opacity: 1; }
@keyframes augSheen { 0% { background-position: -160% 0; } 100% { background-position: 260% 0; } }
.aug-gold .aug-top { position: absolute; z-index: 6; left: 50%; top: -1px; width: 64px; height: 54px; margin-left: -32px; display: grid; place-items: center; clip-path: polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%); background: linear-gradient(135deg, #fbe7a8, #b7832a); }
.aug-gold .aug-body { position: absolute; z-index: 4; left: 26px; right: 26px; bottom: 26px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
.aug-gold .aug-tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
.aug-gold .aug-area { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 800; color: var(--k); background: color-mix(in srgb, var(--k) 16%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--k) 45%, transparent); }
.aug-gold .aug-note { font-size: 14px; line-height: 1.45; color: #9ca3af; text-wrap: balance; }
.aug-gold .aug-tag { display: inline-flex; align-items: center; height: 24px; padding: 0 12px; border-radius: 999px; font-size: 12px; font-weight: 800; color: #c4b5fd; background: rgba(196,181,253,.14); }
.aug-gold .aug-name { font-size: 30px; font-weight: 900; line-height: 1.1; color: #fff; text-shadow: 0 0 24px rgba(167,139,250,.55), 0 2px 8px #000; text-wrap: balance; }
.aug-gold .aug-rule { width: 100%; height: 1px; background: linear-gradient(90deg, transparent, rgba(245,210,122,.6), transparent); }
.aug-gold .aug-desc { font-size: 18px; line-height: 1.5; color: #e5e7eb; }
.aug-gold .aug-hint { font-size: 12px; font-weight: 700; color: #f5d27a; }
.aug-gem { display: block; width: 20px; height: 20px; border-radius: 4px; transform: rotate(45deg); background: linear-gradient(135deg, #ede9fe, #a78bfa 45%, #7c3aed); box-shadow: 0 0 12px #a78bfa, inset 0 0 0 1px rgba(255,255,255,.5); }
.aug-num { font-family: 'Saira Condensed', sans-serif; font-weight: 800; color: #e9d5ff; text-shadow: 0 0 12px rgba(167,139,250,.75); }
.aug-gold .aug-burst { position: absolute; left: 50%; top: 32%; width: 560px; height: 560px; margin: -280px 0 0 -280px; border-radius: 50%; pointer-events: none; opacity: 0; transition: opacity .4s;
  background: repeating-conic-gradient(rgba(245,210,122,.2) 0 6deg, transparent 6deg 18deg); -webkit-mask: radial-gradient(circle, #000 5%, transparent 62%); mask: radial-gradient(circle, #000 5%, transparent 62%); animation: augSpin 30s linear infinite; }
.aug-gold.hot .aug-burst { opacity: 1; }
@keyframes augSpin { to { transform: rotate(360deg); } }
.aug-sky { position: absolute; inset: 0; background: radial-gradient(60% 50% at 50% 45%, rgba(124,58,237,.3), transparent 70%); }
.aug-rays { position: absolute; left: 50%; top: 45%; width: 1700px; height: 1700px; margin: -850px 0 0 -850px; border-radius: 50%; background: repeating-conic-gradient(rgba(196,181,253,.07) 0 4deg, transparent 4deg 14deg); animation: augSpin 90s linear infinite; -webkit-mask: radial-gradient(circle, #000 8%, transparent 60%); mask: radial-gradient(circle, #000 8%, transparent 60%); }
.aug-dust { position: absolute; inset: 0; background-image: radial-gradient(1.5px 1.5px at 12% 20%, #fff8, transparent), radial-gradient(1px 1px at 30% 70%, #fff6, transparent), radial-gradient(1.5px 1.5px at 55% 30%, #c4b5fd99, transparent), radial-gradient(2px 2px at 85% 45%, #c4b5fdaa, transparent), radial-gradient(1px 1px at 44% 88%, #fff6, transparent), radial-gradient(1.5px 1.5px at 92% 18%, #fff7, transparent); }
@media (prefers-reduced-motion: reduce) { .aug-rays, .aug-gold .aug-burst, .aug-gold .aug-shine { animation: none; } }
.aug-hd { display: flex; align-items: center; gap: 14px; width: 520px; font-size: 14px; font-weight: 800; color: #f5d27a; }
.aug-hd::before, .aug-hd::after { content: ""; height: 1px; flex: 1; background: linear-gradient(90deg, transparent, rgba(245,210,122,.6)); }
.aug-hd::after { background: linear-gradient(90deg, rgba(245,210,122,.6), transparent); }
.aug-reroll { height: 50px; padding: 0 28px; border-radius: 14px; font-weight: 800; color: #fff; background: linear-gradient(180deg, rgba(196,181,253,.28), rgba(124,58,237,.3)); box-shadow: inset 0 0 0 1px rgba(196,181,253,.6), 0 10px 26px -10px #a78bfa; }
.aug-reroll:hover { filter: brightness(1.15); }
/* 올려 둔 카드는 눈에 띄게 커지고, 나머지는 뒤로 물러선다 */
.aug-card.hot { transform: translateY(-20px) scale(1.085); z-index: 2; }
.aug-card.cold { opacity: .5; filter: saturate(.4) brightness(.68); transform: translateY(6px) scale(.94); }
.aug-card.take { animation: augTake .74s cubic-bezier(.22,.66,.3,1) both; z-index: 3; }
.aug-card.gone { animation: augDrop .5s cubic-bezier(.4,0,.7,.4) both; }
.aug-ring { position: absolute; inset: -6%; border-radius: 30px; pointer-events: none; z-index: 4;
  box-shadow: 0 0 0 3px var(--a), 0 0 70px -6px var(--a); animation: augRing .7s cubic-bezier(.2,.7,.3,1) both; }
.aug-ring.late { animation-delay: .12s; box-shadow: 0 0 0 1px var(--a), 0 0 40px -10px var(--a); }
/* 올려 두면 그림이 천천히 밀려 들어온다 */
.aug-card .aug-art { transition: transform .6s cubic-bezier(.2,.9,.3,1), filter .3s; }
.aug-card.hot .aug-art { transform: scale(1.06); }
/* 구장 위 시너지 도크: 오른쪽 그늘 위에 줄 목록 */
.syn-dock { position: absolute; z-index: 6; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; padding: 24px 26px 22px 30px; }
.syn-dock::before { content: ""; position: absolute; z-index: -1; inset: 12px 12px 12px 16px; border-radius: 20px; background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03)), rgba(6,10,19,.7); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); box-shadow: inset 0 1px 0 rgba(255,255,255,.12), inset 0 0 0 1px rgba(255,255,255,.06), 0 24px 44px -24px rgba(0,0,0,.9); }
/* 넓은 화면: 시너지는 구장 바로 오른쪽(판 끝까지), 그늘은 옅게 해 사진이 뒤로 이어 보이게 */
.syn-dock.wide { right: auto; padding: 24px 26px 22px 28px; }
/* 오른쪽 LINEUP 명단: 묶음 상자 위 “선 위 라벨”(이름만) · 줄은 판 높이에 맞춰 늘고 줄어 12줄이 늘 들어감 */
/* 드래프트 화면 오른쪽 MY TEAM 판: 탭 [팀 분석 · 선수 기록] */
.mt-panel { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.mtp-tabs { flex: none; display: flex; gap: 20px; padding: 0 4px; box-shadow: inset 0 -1px 0 rgba(148,163,184,.16); }
.mtp-tabs button { position: relative; padding: 3px 1px 8px; font-size:14px; font-weight: 600; color: #6b7280; transition: color .15s; }
.mtp-tabs button:hover { color: #cbd5e1; }
.mtp-tabs button.on { color: #fff; }
.mtp-tabs button.on::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: #10b981; }
.mtp-tabs button:focus-visible { outline: 2px solid #10b981; outline-offset: 2px; }
.mt-team { display: flex; flex-direction: column; justify-content: space-between; gap: 8px; padding: 2px 4px 0; }
.mt-trio { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 2px 0 8px; box-shadow: inset 0 -1px 0 rgba(148,163,184,.12); }
.mt-trio > div { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.mt-trio > div + div { box-shadow: inset 1px 0 0 rgba(148,163,184,.12); }
.mt-trio small { font-size:12px; color: #6b7280; }
.mt-trio b { font-size:28px; font-weight: 700; line-height: 1; color: #fff; }
.mt-radar { position: relative; }
.mt-bars { display: flex; flex-direction: column; gap: 12px; padding: 6px 2px; }
.mt-bhd { display: flex; justify-content: flex-end; align-items: baseline; gap: 6px; font-size: 12px; color: #6b7280; }
.mt-bhd b { font-size: 14px; color: #cbd5e1; }
.mt-bar { display: grid; grid-template-columns: 34px minmax(0,1fr) 34px 34px; align-items: center; gap: 10px; }
.mt-bar > span { font-size: 12px; color: #9ca3af; }
.mt-bar > i { position: relative; height: 6px; border-radius: 6px; background: rgba(255,255,255,.08); }
.mt-bar > i > b { position: absolute; inset: 0 auto 0 0; border-radius: 6px; transition: width .5s cubic-bezier(.2,.8,.2,1); }
.mt-bar > i > em { position: absolute; top: -4px; bottom: -4px; width: 2px; margin-left: -1px; border-radius: 2px; background: rgba(255,255,255,.75); }
.mt-bar > b { text-align: right; font-size: 18px; font-weight: 700; color: #fff; }
.mt-bar > small { font-size: 12px; font-weight: 700; }
.mt-rd { display: block; width: 100%; height: auto; }
.mt-rd text { font-size:12px; fill: #cbd5e1; }
.mt-rd text.v { font-family: 'Saira Condensed', sans-serif; font-size:14px; font-weight: 700; fill: #fff; }
.mt-rd tspan.d { font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 700; }
.mt-lgd { position: absolute; right: 0; bottom: 2px; display: flex; flex-direction: column; align-items: flex-end; gap: 1px; font-size:12px; color: #6b7280; pointer-events: none; }
.mt-lgd i { display: inline-block; width: 9px; margin-right: 4px; vertical-align: 2px; border-top: 2px solid #34d399; }
.mt-lgd i.ai { border-top: 2px dashed #f87171; }
.mt-lgd b { margin-left: 3px; font-size:12px; font-weight: 700; color: #cbd5e1; }
.mt-style { font-size:14px; font-weight: 700; color: #fff; }
.mt-style .g { color: #34d399; }
.mt-style .o { color: #fb923c; }
.mt-style i { margin: 0 6px; font-style: normal; color: #4b5563; }
.mt-chips { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
.mt-chips span { display: flex; align-items: baseline; justify-content: space-between; padding: 6px 8px; font-size:12px; color: #cbd5e1; background: rgba(255,255,255,.03); box-shadow: inset 0 0 0 1px rgba(148,163,184,.1); }
.mt-chips b { font-size:14px; font-weight: 700; }
.mt-chips .up b { color: #34d399; }
.mt-chips .dn b { color: #fb923c; }
.mt-rec { display: flex; flex-direction: column; gap: 10px; }
.mt-card { --c: 10px; --ac: #38bdf8; padding: 6px 8px 4px 11px; background: rgba(255,255,255,.028); box-shadow: inset 3px 0 0 var(--ac); clip-path: inset(0 round min(var(--c), 22px)); }
.mt-card.bat { --ac: #34d399; }
.mt-gh { display: flex; align-items: center; gap: 8px; height: 22px; padding: 0 2px; }
.mt-gh::after { content: ""; flex: 1; height: 1px; background: rgba(148,163,184,.2); order: 2; }
.mt-gh .en { font-size:14px; font-weight: 800; letter-spacing: .18em; color: var(--ac); }
.mt-gh b { order: 1; font-size:12px; color: #cbd5e1; }
.mt-gh em { order: 3; font-style: normal; font-size:12px; color: #6b7280; }
.mt-rec table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.mt-rec th { height: 22px; padding: 0 4px; font-size:12px; font-weight: 500; color: #6b7280; text-align: right; box-shadow: inset 0 -1px 0 rgba(148,163,184,.2); }
.mt-rec td { height: 29px; padding: 0 4px; font-size:14px; text-align: right; color: #d1d5db; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: inset 0 -1px 0 rgba(148,163,184,.07); }
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
.mt-rec tr.e td { height: 24px; font-size:12px; color: #4b5563; }
.mt-rec .pos { font-size:12px; color: #9ca3af; }
.mt-face { display: inline-block; width: 22px; height: 22px; vertical-align: middle; border-radius: 50%; background-color: #1b2537; background-repeat: no-repeat; box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }
.mt-rec .who { display: flex; flex-direction: column; min-width: 0; line-height: 1.15; }
.mt-rec .who b { font-size:14px; color: #fff; overflow: hidden; text-overflow: ellipsis; }
.mt-rec .who small { font-size:12px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; }
.mt-rec .st { font-size:14px; font-weight: 600; }
.mt-rec .st.none { color: #4b5563; }
.mt-rec .st.best { font-weight: 700; color: #34d399; }
.mt-rec td.ov b { font-size:18px; font-weight: 700; color: #fff; }
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
  .mt-trio small { font-size:12px; }
  .mt-trio b { font-size: 36px; }
  .mt-style { font-size:18px; }
  .mt-chips { gap: 6px; }
  .mt-chips span { padding: 10px; font-size:14px; }
  .mt-chips b { font-size:18px; }
  .mt-gh { height: 26px; }
  .mt-gh .en { font-size:14px; }
  .mt-gh b { font-size:14px; }
  .mt-rec th { font-size:12px; }
  .mt-face { width: 28px; height: 28px; }
  .mt-rec .who b { font-size:14px; }
  .mt-rec .who small { font-size:12px; }
  .mt-rec .st { font-size:18px; }
  .mt-rec td.ov b { font-size:18px; }
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
.syn-dock.wide .sd { padding-top: 0; }
.sd-hd { flex: none; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-left: 4px; }
.sd-lab { display: inline-flex; align-items: center; gap: 8px; font-family: 'IBM Plex Sans KR', 'Malgun Gothic', sans-serif !important; font-size:14px; font-weight: 800; letter-spacing: .02em; color: #10b981; text-shadow: 0 1px 3px #000, 0 0 10px rgba(0,0,0,.95); }
.sd-lab::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
.sd-hd em { min-width: 20px; padding: 0 7px; border-radius: 999px; text-align: center; font-style: normal; font-size:12px; font-weight: 800; line-height: 18px; color: #03140c; background: linear-gradient(180deg, #34d399, #0e9f6e); }
.sd-hd button { margin-left: auto; padding: 3px 10px; border-radius: 999px; font-size:12px; font-weight: 700; color: #9ca3af; background: rgba(255,255,255,.06); }
.sd-hd button:hover { color: #fff; background: rgba(255,255,255,.12); }
.sd-hd button:focus-visible { outline: 2px solid #10b981; outline-offset: 1px; }
.sd-list { flex: 1; min-height: 0; overflow-y: auto; padding-right: 2px; }
.sd-row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px 8px; text-align: left; border-radius: 12px; transition: background .15s, box-shadow .15s; }
.sd-row:hover, .sd-row.hv { background: rgba(255,255,255,.06); }
.sd-row:focus-visible { outline: 2px solid #38bdf8; outline-offset: -2px; }
.sd-row.fo { background: rgba(56,189,248,.1); box-shadow: inset 0 0 0 1px rgba(56,189,248,.45); }
.sd-row.on { background: rgba(255,255,255,.04); }
.sd-row.on .sy-ico { animation: synShine 3s ease-in-out infinite; }
@keyframes synShine { 50% { filter: brightness(1.22); } }
.sd-tx { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.sd-tx b { font-size:14px; font-weight: 600; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sd-row.on .sd-tx b { color: #fff; }
.sd-stp { font-size:12px; font-weight: 600; color: #4b5563; }
.sd-stp .ok { color: #e5e7eb; }
.sd-stp i { margin: 0 3px; font-style: normal; color: #374151; }
.sd-fr, .ss-fr { flex: none; font-size:18px; font-weight: 700; color: #fff; }
.sd-fr small, .ss-fr small { font-size:12px; color: #6b7280; }
.sd-row.sy0 .sd-fr { color: #6b7280; }
.sd-fr u, .ss-fr u { margin-left: 2px; font-size: .8em; text-decoration: none; color: #38bdf8; }
.sd-row.gr .sd-fr { color: #7dd3fc; }
.sd-tip { position: absolute; z-index: 30; right: calc(100% + 26px); width: 262px; padding: 12px 13px; background: rgba(6,10,19,.97); box-shadow: 0 0 0 1px rgba(148,163,184,.28), 0 18px 40px -8px rgba(0,0,0,.9); pointer-events: none; }
.sd-tip.up { right: auto; bottom: calc(100% + 10px); }
.sd-th { display: flex; align-items: center; gap: 9px; }
.sd-th b { font-size:18px; color: #fff; }
.sd-th .sy-ico { width: 32px; height: 28px; }
.sd-tip p { margin: 9px 0 8px; font-size:12px; line-height: 1.5; color: #9ca3af; }
.sd-tip p b { color: #fff; }
.sd-tip ul { margin: 0 0 10px; font-size:12px; line-height: 1.6; color: #6b7280; }
.sd-tip li span { display: inline-block; min-width: 28px; font-weight: 700; }
.sd-tip li.ok { color: #fff; }
.sd-tip li.ok span { color: #34d399; }
.sd-tip li.nx { color: #9ca3af; }
.sd-pfs { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 6px 5px; }
.sd-pf { width: 44px; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.sd-pf i { width: 40px; height: 40px; border-radius: 3px; background-color: #1b2537; background-repeat: no-repeat; box-shadow: 0 0 0 2px var(--bd); }
.sy0 .sd-pf.in i { box-shadow: 0 0 0 2px #9ca3af; }
.sd-pf small { max-width: 44px; font-size:12px; color: #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sd-pf.out i { filter: grayscale(1) brightness(.5); box-shadow: 0 0 0 1px #374151; }
.sd-pf.out small { color: #6b7280; }
.sd-pf.cd i { box-shadow: 0 0 0 2px #38bdf8; }
.sd-pf.cd small { color: #7dd3fc; }
/* 전체 시너지 창 */
.ss-flt { display: flex; gap: 6px; }
.ss-flt button { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; font-size:12px; font-weight: 600; color: #9ca3af; background: rgba(255,255,255,.05); border-radius: 3px; }
.ss-flt button b { font-size:14px; color: #e5e7eb; }
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
.ss-l1 b { font-size:14px; color: #fff; }
.ss-card.sy0 .ss-l1 b { color: #cbd5e1; }
.ss-fr { margin-left: auto; font-size:18px; }
.ss-cond { font-size:12px; color: #6b7280; }
.ss-tiers { display: flex; flex-wrap: wrap; gap: 5px; }
.ss-tiers > span { display: inline-flex; align-items: center; gap: 6px; padding: 1px 8px 1px 2px; font-size:12px; line-height: 19px; color: #6b7280; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(148,163,184,.16); }
.ss-tiers em { min-width: 19px; padding: 0 4px; font-style: normal; font-weight: 700; text-align: center; color: #9ca3af; background: rgba(148,163,184,.12); border-radius: 2px; }
.ss-tiers .ok { color: #fff; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bd) 60%, transparent); }
.ss-tiers .ok em { color: #05080f; background: var(--bd); }
.ss-tiers .nx { color: #cbd5e1; box-shadow: inset 0 0 0 1px rgba(56,189,248,.5); }
.ss-pfs { margin-top: 1px; }
.ss-pfs .sd-pf { width: 42px; }
.ss-pfs .sd-pf i { width: 36px; height: 36px; }
.ss-more { align-self: center; padding: 0 6px; font-size:14px; font-weight: 700; color: #6b7280; }
.lf-row .ov { align-self: center; font-size:18px; font-weight: 700; color: var(--n); }
/* 끌기 카드(body 포털): 토큰과 같은 판을 반투명 + 하늘색 브래킷으로. 커서는 흉상 가슴께, 크기는 필드 배율에 맞춘 뒤 조금 작게(×0.92)
   판 위 칩이 “SS ››› 2B” 로 놓을 자리까지 이어진다 — 셰브론이 차례로 흐르고 놓을 자리 칩이 톡 튀어나옴, 사람이 있으면 양쪽 셰브론(맞바꿈) */
.lf-drag { position: fixed; z-index: 60; left: 0; top: 0; width: 214px; height: 72px; pointer-events: none; transform-origin: 0 0; transform: scale(calc(var(--k, 1) * .92)) translate(-30px, -44px); filter: drop-shadow(0 14px 18px rgba(0,0,0,.7)); }
.lf-drag .lf-bar { background: rgba(15,23,42,.62); box-shadow: inset 0 0 0 1px rgba(56,189,248,.7); }
.lf-drag .lf-bar::after { background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
.lf-drag .lf-ov, .lf-drag .lf-ov.up { color: #fff; text-shadow: 0 0 10px rgba(56,189,248,.8); }
.lf-drag::after { content: ""; position: absolute; left: -7px; right: -7px; top: -5px; bottom: -3px;
  background: linear-gradient(#38bdf8, #38bdf8) 0 0 / 14px 2px no-repeat, linear-gradient(#38bdf8, #38bdf8) 0 0 / 2px 14px no-repeat, linear-gradient(#38bdf8, #38bdf8) 100% 0 / 14px 2px no-repeat, linear-gradient(#38bdf8, #38bdf8) 100% 0 / 2px 14px no-repeat,
    linear-gradient(#38bdf8, #38bdf8) 0 100% / 14px 2px no-repeat, linear-gradient(#38bdf8, #38bdf8) 0 100% / 2px 14px no-repeat, linear-gradient(#38bdf8, #38bdf8) 100% 100% / 14px 2px no-repeat, linear-gradient(#38bdf8, #38bdf8) 100% 100% / 2px 14px no-repeat; }
.lf-route { position: absolute; left: 58px; top: 0; z-index: 3; display: flex; align-items: center; gap: 4px; font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 800; letter-spacing: .04em; line-height: 16px; white-space: nowrap; }
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
.rd-tot > span { display: block; font-size:12px; font-weight: 700; color: #94a3b8; }
.rd-tot b { font-family: 'Saira Condensed', sans-serif; font-size:28px; font-weight: 800; line-height: 1.05; color: var(--a); font-variant-numeric: tabular-nums; }
.rd-tot i { display: block; height: 3px; margin-top: 4px; background: rgba(255,255,255,.08); }
.rd-tot i::after { content: ""; display: block; width: var(--w); height: 100%; background: var(--a); }
.rd-dl { font-family: 'Saira Condensed', sans-serif; font-size:14px; font-weight: 700; margin-left: 6px; color: #475569; }
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
.rd-ph h3 { margin: 4px 0 0; font-size:18px; font-weight: 900; line-height: 1; color: #fff; }
.rd-ph em { display: inline-flex; align-items: center; gap: 8px; font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 700; font-style: normal; letter-spacing: .32em; text-transform: uppercase; color: var(--a); }
.rd-ph em::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
.rd-ph > div { display: flex; flex-direction: column-reverse; }
.rd-ph .sum { margin-left: auto; text-align: right; line-height: 1.1; }
.rd-ph .sum small { display: block; font-size:12px; color: #94a3b8; }
.rd-ph .sum b { font-family: 'Saira Condensed', sans-serif; font-size:28px; font-weight: 800; color: var(--a); font-variant-numeric: tabular-nums; }
/* 타순 줄 */
.rd-rows { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 5px; padding: 0 14px 14px; }
/* 타순 아래 예비 명단: 제목 줄 + 옅은 칸 */
.rd-bnh { display: flex; align-items: baseline; gap: 7px; margin: 0 14px; padding: 7px 0 6px; font-size:14px; font-weight: 700; color: #cbd5e1; border-top: 1px solid rgba(255,255,255,.08); }
.rd-bnh em { font-family: 'Saira Condensed', sans-serif; font-size:12px; font-style: normal; font-weight: 700; letter-spacing: .08em; color: #64748b; }
.rd-bnh small { margin-left: auto; font-size:12px; color: #6b7280; }
.rd-rows .rd-row.empty { opacity: .45; }
.rd-rows .rd-row.empty .rd-nm { color: #6b7280; }
.rd-bn-g { flex: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; padding: 0 14px 14px; }
.rd-bc { position: relative; display: grid; grid-template-columns: 24px auto minmax(0, 1fr) auto; align-items: center; gap: 7px; height: 34px; padding: 0 9px 0 6px; background: linear-gradient(90deg, rgba(255,255,255,.05), transparent 70%); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); cursor: grab; user-select: none; touch-action: none; outline: none; transition: background .12s, box-shadow .12s; }
.rd-bc:hover { background: linear-gradient(90deg, rgba(255,255,255,.09), transparent 70%); }
.rd-bc-pos, .rd-bc .rd-bc-pos { font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 800; letter-spacing: .04em; color: #94a3b8; }
.rd-bc b { min-width: 0; overflow: hidden; font-size:14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.rd-bc em { font-family: 'Saira Condensed', sans-serif; font-size:18px; font-style: normal; font-weight: 800; }
.rd-bc-rest { font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 800; color: #fb923c; }
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
.rd-no { font-family: 'Saira Condensed', sans-serif; font-size:28px; font-weight: 800; line-height: 1; text-align: center; color: #e2e8f0; font-variant-numeric: tabular-nums; }
.rd-pos { display: grid; place-items: center; height: 21px; font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 800; line-height: 21px; color: #93c5fd; background: rgba(12,22,38,.9); box-shadow: inset 0 0 0 1px rgba(96,165,250,.45); }
.rd-pos.dh { color: #ffb27a; box-shadow: inset 0 0 0 1px rgba(255,138,61,.55); }
.rd-pos.p { color: #fca5a5; box-shadow: inset 0 0 0 1px rgba(248,113,113,.5); }
.rd-pos.off { color: #fbbf24; box-shadow: inset 0 0 0 1px rgba(251,191,36,.5); }
.rd-hand { font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 700; color: #64748b; text-align: center; }
.rd-thumb { position: relative; overflow: hidden; background-color: #111827; background-repeat: no-repeat; box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }
.rd-nm { font-size:14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rd-ovr { font-family: 'Saira Condensed', sans-serif; font-size:18px; font-weight: 800; line-height: 1; text-align: right; font-variant-numeric: tabular-nums; }
/* 카드 (수비 · 투수 공통) */
.rd-card { position: relative; display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden; background: linear-gradient(180deg, rgba(13,24,40,.55), rgba(5,9,16,.95)), #0b1220; box-shadow: inset 0 0 0 1.5px var(--cc, rgba(96,165,250,.55)), 0 12px 24px -14px #000; cursor: grab; user-select: none; touch-action: none; outline: none; transition: box-shadow .12s, filter .12s; }
.rd-card .art { position: absolute; inset: 0; background-position: 50% 6%; background-repeat: no-repeat; background-size: cover; }
.rd-card .sh { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,9,16,.12) 32%, rgba(5,9,16,.92) 76%); }
.rd-card .top { position: absolute; left: 0; right: 0; top: 0; z-index: 2; display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; }
.rd-card .top .rd-pos { background: none; box-shadow: none; }
.rd-card .ov { font-family: 'Saira Condensed', sans-serif; font-size:18px; font-weight: 800; line-height: 1; color: #fff; text-shadow: 0 2px 6px #000; font-variant-numeric: tabular-nums; }
.rd-card .nmb { position: relative; z-index: 2; padding: 4px 7px 6px; text-align: center; }
.rd-card .nmb b { display: block; font-size:14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rd-card .nmb small { display: block; font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 700; color: #94a3b8; }
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
.rd-slot > span { display: flex; align-items: baseline; gap: 8px; font-size:14px; font-weight: 700; color: #cbd5e1; }
.rd-slot > span em { font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 700; font-style: normal; letter-spacing: .2em; color: #64748b; }
.rd-slot > div { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.rd-empty { display: grid; place-items: center; font-size:18px; color: #475569; background: rgba(255,255,255,.02); box-shadow: inset 0 0 0 1.5px rgba(148,163,184,.22); }
/* 시너지 */
.rd-syn { display: flex; flex-direction: column; gap: 8px; padding: 0 16px 14px; min-height: 0; overflow-y: auto; }
.rd-sc { --s: #34d399; flex: none; display: grid; grid-template-columns: 42px minmax(0,1fr) auto; align-items: center; gap: 12px; padding: 10px 12px; background: linear-gradient(90deg, color-mix(in srgb, var(--s) 12%, rgba(6,11,19,.9)), rgba(6,11,19,.9)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--s) 38%, transparent); }
.rd-sc .ic { display: grid; place-items: center; width: 42px; height: 42px; font-family: 'Saira Condensed', sans-serif; font-size:14px; font-weight: 800; color: var(--s); background: rgba(5,8,15,.65); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--s) 60%, transparent); }
.rd-sc b { display: block; font-size:14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rd-sc .ef { font-family: 'Saira Condensed', sans-serif; font-size:14px; font-weight: 800; color: var(--s); }
.rd-sc small { display: block; font-size:12px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rd-sc.lock { --s: #64748b; opacity: .78; }
.rd-tag { padding: 3px 9px; font-size:12px; font-weight: 700; color: #cbd5e1; background: rgba(255,255,255,.06); box-shadow: inset 0 0 0 1px rgba(255,255,255,.16); clip-path: inset(0 round 5px); }
/* 추천 선수 (타순·수비 판 아래 띠) */
.rd-cond { position: absolute; left: 6px; right: 6px; bottom: 34px; z-index: 3; display: flex; align-items: center; gap: 4px; height: 15px; padding: 0 4px; background: rgba(5,8,15,.82); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--k) 55%, transparent); }
.rd-cond .bar { flex: 1; height: 4px; background: rgba(255,255,255,.1); }
.rd-cond .bar i { display: block; height: 100%; background: var(--k); box-shadow: 0 0 6px var(--k); }
.rd-cond b { font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 800; color: var(--k); }
.rd-cond em { font-family: 'Saira Condensed', sans-serif; font-size:12px; font-style: normal; font-weight: 700; color: #cbd5e1; }
.rd-gain { position: absolute; left: 6px; bottom: 34px; z-index: 3; padding: 0 6px; font-family: 'Saira Condensed', sans-serif; font-size:12px; font-weight: 800; line-height: 17px; color: #04150e; background: #34d399; }
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
/** 증강이 도움 되는 영역 — 색은 작전 판(타격 · 마운드 · 수비)과 같은 뜻 */
export const AUG_AREA = { bat: ['타격', '#34d399'], run: ['주루', '#fbbf24'], pit: ['투구', '#f87171'], def: ['수비', '#60a5fa'], all: ['팀 전체', '#c4b5fd'] };
/** 효과 글에서 영역을 읽는다 — 능력치 이름 · 대상(타자 · 투수 · 불펜 · 수비) 기준. 특정 선수 묶음(외국인 · 레전드 · 88+ · 가장 낮은)은 팀 전체 */
export function augAreas(a) {
  const d = a?.desc || '';
  const out = new Set();
  /* 오르는 쪽(+)만 본다 — '파워 −8' 처럼 깎이는 능력치는 영역이 아니다. '수비 투구 +' 는 수비 반 이닝의 투구라 투구 */
  if (/외국인|레전드 카드|88\+|가장 낮은/.test(d)) out.add('all');
  if (/(파워|컨택) \+|안타 확률 \+|타자[^·]*능력치 \+/.test(d)) out.add('bat');
  if (/주루 \+/.test(d)) out.add('run');
  if (/(구위|제구|안정|투구|체력) \+|투수[^·]*능력치 \+|불펜[^·]*능력치 \+/.test(d)) out.add('pit');
  if (/수비 \+/.test(d)) out.add('def');
  if (!out.size) out.add('all');
  return [...out];
}

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
    const src = `cards/${encodeURIComponent(artId(p.id))}.webp`;
    if (artCache.has(src)) { resolve(); return; }
    const img = new Image();
    img.onload = () => { artCache.set(src, true); resolve(); };
    img.onerror = () => { artCache.set(src, false); resolve(); };
    img.src = src;
  })));
}
/** 카드 그림(public/cards/<id>.webp) 경로. 없으면 null */
function useArt(player) {
  return useImage(player && !player.isReplacement ? `cards/${encodeURIComponent(artId(player.id))}.webp` : null);
}
/** 정면 상체 프로필(public/profiles/<id>.webp, 3:4) 경로. 없으면 null */
function useProfile(player) {
  return useImage(player && !player.isReplacement ? `profiles/${encodeURIComponent(artId(player.id))}.webp` : null);
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
      {!src && !profile && <span className="absolute inset-0 grid place-items-center text-t2 font-black text-white/75">{player.name[0]}</span>}
    </div>
  );
}

/* 카드 프레임 네온 색: 그림의 림 라이트와 같은 계열로 맞춘다 (구단 컬러를 어두운 배경에서 빛나게 올린 값) */
const TEAM_NEON = {
  한화: '#ff8a3d', 대한민국: '#60a5fa', SK: '#ff5a67', 롯데: '#7cb4ff', KIA: '#ff5a67', 해태: '#ff5a67', 두산: '#a5a3ff', OB: '#a5a3ff',
  NC: '#6cc0ff', 삼성: '#5aa2ff', 넥센: '#ff6b9a', 키움: '#ff6b9a', KT: '#e5e7eb', LG: '#ff5c95', 현대: '#6f97ff',
};
const neonOf = (p) => TEAM_NEON[p.team] || '#10b981';
const cutCorners = (n) => `inset(0 round ${n}px)`;
const POS_EN = { SP: 'Starter', RP: 'Closer', C: 'Catcher', '1B': '1st Base', '2B': '2nd Base', '3B': '3rd Base', SS: 'Shortstop', OF: 'Outfield', DH: 'Designated' };
const handLabel = (p) => (p.hand === 'S' ? '양타' : p.type === 'batter' ? `${p.hand === 'L' ? '좌' : '우'}타` : `${p.hand === 'L' ? '좌' : '우'}투`);

const STAT_LABELS = { power: '파워', contact: '컨택', speed: '주루', defense: '수비', stuff: '구위', control: '제구', stamina: '체력', stability: '안정' };

function StatBar({ label, value }) {
  return (
    <div className="grid grid-cols-[2rem_1fr_1.5rem] items-center gap-1.5">
      <span className="text-t4 text-gray-400">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-gray-800">
        <span className={`block h-full rounded-full ${value >= 100 ? 'bg-[#10b981]' : 'bg-gray-400'}`} style={{ width: `${statPct(value)}%` }} />
      </span>
      <span className={`text-right font-display text-t3 font-semibold tabular-nums ${value >= 100 ? 'text-[#10b981]' : 'text-gray-200'}`}>{value}</span>
    </div>
  );
}

function Badge({ children }) {
  return <span className="rounded border border-gray-600 px-1.5 py-px text-t4 font-semibold text-gray-300">{children}</span>;
}

/* ───── 상단 샐러리 캡 대시보드 ───── */
/** capAfter: PICK 에 올린 선수를 영입하면 남을 캡 — 있으면 “지금 → 영입 후” 숫자와, 깎일 칸이 노랗게 깜빡이는 게이지 */
function CapDashboard({ round, cp, cap = SALARY_CAP, roster, phase, onOpenRules, wide = false, modeName = null, modeNeon = '#10b981', capAfter = null, onExit, slim = false, series = null }) {
  const preview = capAfter != null && capAfter !== cp;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const pct = clamp01((preview ? capAfter : cp) / cap);
  const tone = pct > 0.5 ? '#10b981' : pct > 0.2 ? '#fbbf24' : '#f87171';
  const now = Math.round(clamp01(cp / cap) * 24);
  const lit = preview ? Math.min(now, Math.round(pct * 24)) : now;
  const foreign = roster.filter((p) => p.isForeign).length;

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-[#f5d27a]/20 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.74))] backdrop-blur">
      <span className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-64 bg-gradient-to-r from-[#f5d27a] to-transparent" aria-hidden="true" />
      {/* 배경음악 — 모든 화면과 같은 자리(위 바 오른쪽 28px · 위 18px). 이 바는 단계에 따라 가운데 정렬이라 바 기준으로 고정 */}
      <BgmButton className="!absolute right-7 top-[18px] z-10" />
      <div className={`mx-auto flex flex-wrap items-center gap-x-8 gap-y-3 px-4 ${wide ? 'max-w-[1920px] py-2.5 pr-20' : 'max-w-7xl py-3'}`}>
        {onExit && <button type="button" onClick={onExit} aria-label="메인으로" className="ui-cut grid h-9 w-9 shrink-0 place-items-center bg-white/[0.06] text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)] hover:bg-white/10" style={{ '--c': '7px' }}>←</button>}
        {series ? (() => {
          /* 드래프트 중: 지금 열린 시리즈를 시즌 표로 — 어느 구단 · 어느 해인지 한눈에 */
          const flag = teamFlag(series.title || '');
          const c = flag?.color || SERIES_NEON[series.kind] || '#10b981';
          return (
            <div className="flex items-center gap-4 py-0.5">
              <i className="block h-14 w-1.5 shrink-0 rounded-full" style={{ background: `linear-gradient(${c}, ${c}44)`, boxShadow: `0 0 18px ${c}` }} aria-hidden="true" />
              {series.year && <b className="font-display text-[60px] font-extrabold leading-[.85] text-white">{series.year}</b>}
              <div className="min-w-0 leading-tight">
                <span className="flex items-center gap-2">
                  {flag && <i className="block h-7 w-7 shrink-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(ui/clubs/${flag.key}.webp)` }} aria-hidden="true" />}
                  <h1 className="truncate text-t1 font-black text-white">{series.title}</h1>
                </span>
                <p className="mt-0.5 truncate text-t4 text-gray-400">{series.subtitle || SERIES_KIND_LABEL[series.kind]}</p>
              </div>
              {modeName && (
                <p className="ml-2 shrink-0 border-l border-dashed border-white/20 pl-5 text-t4 leading-snug text-gray-400">
                  드래프트<br /><b className="text-t3" style={{ color: modeNeon }}>{modeName}</b>
                </p>
              )}
            </div>
          );
        })() : (
        <div className="leading-none">
          <p className="text-t4 font-bold tracking-[0.04em] text-gray-400">메인</p>
          <h1 className="mt-1 text-t2 font-black leading-none text-white">레전드 드래프트</h1>
        </div>
        )}

        {/* 지금 드래프트 모드 (가을의 왕조 · 전체 믹스 …) */}
        {modeName && !series && (
          <div className="border-l border-white/10 pl-6 leading-none">
            <p className="text-t4 font-bold tracking-[0.04em] text-gray-400">드래프트 모드</p>
            <p className="mt-1 whitespace-nowrap text-t2 font-black leading-none" style={{ color: modeNeon, textShadow: `0 0 14px ${modeNeon}66` }}>{modeName}</p>
          </div>
        )}

        {!slim && <div className="flex items-baseline gap-2">
          <span className="text-t4 font-bold text-gray-400">지명</span>
          <span className="font-display text-[2.6rem] font-bold leading-none tabular-nums text-white [text-shadow:0_0_18px_rgba(16,185,129,.35)]">{String(Math.min(round, ROSTER_SIZE)).padStart(2, '0')}</span>
          <span className="font-display text-t2 font-semibold text-gray-400">/ {ROSTER_SIZE}</span>
        </div>}

        {!slim && isNoCap(cap) && (
          <div className="min-w-[220px] flex-1">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-t4 font-semibold text-gray-400">샐러리 캡</span>
              <b className="font-display text-t1 font-bold text-[#fbbf24]" style={{ textShadow: '0 0 14px rgba(251,191,36,.5)' }}>제한 없음</b>
            </div>
            <div className="ui-seg" style={{ '--a': '#fbbf24' }} aria-hidden="true">
              {Array.from({ length: 24 }, (_, i) => <i key={i} className="on" />)}
            </div>
          </div>
        )}
        {!slim && !isNoCap(cap) && <div className="min-w-[220px] flex-1">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-t4 font-semibold text-gray-400">샐러리 캡 잔여</span>
            <span className="font-display tabular-nums">
              {preview ? (
                <>
                  <span className="text-t2 font-bold text-gray-400">{cp}</span>
                  <span className="mx-1 text-t3 font-bold text-gray-400" aria-hidden="true">→</span>
                  <span className="text-t1 font-bold text-[#34d399]" style={{ textShadow: '0 0 14px rgba(52,211,153,.5)' }} aria-label={`영입하면 ${capAfter}`}>{capAfter}</span>
                </>
              ) : (
                <span className="text-t1 font-bold transition-colors" style={{ color: tone, textShadow: `0 0 14px ${tone}80` }}>{cp}</span>
              )}
              <span className="text-t3 text-gray-400"> / {cap} CP</span>
            </span>
          </div>
          <div className="ui-seg" style={{ '--a': tone }} role="meter" aria-label="샐러리 캡 잔여" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={cp}>
            {Array.from({ length: 24 }, (_, i) => <i key={i} className={i < lit ? 'on' : i < now ? 'spend' : ''} />)}
          </div>
        </div>}
        {slim && <span className="flex-1" aria-hidden="true" />}

        <div className="flex items-center gap-3">
          {foreign > 0 && (
            <span title={foreign >= FOREIGN_LIMIT ? '외국인 한도 · 외국인 후보 잠김' : `외국인 선수는 최대 ${FOREIGN_LIMIT}명`}
              className="ui-chip ui-cut font-display text-t3 font-bold tabular-nums" style={{ '--a': foreign >= FOREIGN_LIMIT ? '#fbbf24' : '#94a3b8' }}>
              <span className="font-sans text-t4 font-semibold text-gray-400">외국인</span>
              <span style={{ color: foreign >= FOREIGN_LIMIT ? '#fbbf24' : '#fff' }}>{foreign}/{FOREIGN_LIMIT}</span>
            </span>
          )}
          <button type="button" onClick={onOpenRules} className="ui-btn ui-cut sm">
            <span className="grid h-5 w-5 place-items-center rounded-full border border-gray-500 font-display text-t4 leading-none" aria-hidden="true">?</span>
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

/** 고른 선수 카드 아래 — 시즌 기록(기록 있는 칸만) · 강점/약점 칩 셋. 능력치는 카드 안에 있다 */
function PickInfo({ player }) {
  const rec = recordCells(player).filter(([, v]) => v != null && v !== '').slice(0, 6);
  const tr = playerTraits(player);
  const chips = [...tr.good.map((t) => [t, true]), ...tr.bad.map((t) => [t, false])].slice(0, 3);
  if (!rec.length && !chips.length) return null;
  return (
    <div key={player.id} className="flex shrink-0 animate-[rise_.3s_ease-out_both] flex-col gap-2">
      {rec.length > 0 && (
        <div className="pk-rec">
          {rec.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
        </div>
      )}
      {chips.length > 0 && (
        <div className="pk-trs">
          {chips.map(([t, good]) => (
            <span key={t.id} title={t.why} style={{ '--c': good ? 'rgba(52,211,153,.55)' : 'rgba(248,113,113,.55)' }}>
              <b style={{ color: good ? '#34d399' : '#f87171' }}>{good ? '▲' : '▼'}</b>{t.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── 드래프트 선반 미니 카드 (누르면 살펴보기, 영입은 왼쪽 판에서) ───── */
const POS_FULL = { SP: '선발 투수', RP: '불펜 투수', C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', OF: '외야수', DH: '지명타자' };
/** 칩 옆 한 줄에 다 들어가게 줄이는 긴 포지션의 글자 크기(cqw, 기본 9.5) — Saira Condensed 500 · 자간 .07em 기준으로 잰 값 */
const POS_FS = { SP: 9.3, DH: 8.4 };
/** 선반 카드 포지션 알약 — 짧게 */
const POS_SHORT = { SP: '선발', RP: '불펜', C: '포수', '1B': '1루', '2B': '2루', '3B': '3루', SS: '유격', OF: '외야', DH: '지명' };

/**
 * 선반 카드 오른쪽 아래 시너지 칸(얼굴을 가리지 않게 CP 줄 오른쪽): 목록(도크)의 단계 칸을 축소한 것.
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
/* 선반 포지션 탭 — 묶음별 포지션 */
const GROUP_POS = { 투수: ['SP', 'RP'], 포수: ['C'], 내야: ['1B', '2B', '3B', 'SS'], 외야: ['OF', 'DH'] };

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
        <small>지명</small>
        <b>{String(Math.min(round, ROSTER_SIZE)).padStart(2, '0')}</b>
        <small>/ {ROSTER_SIZE}</small>
      </span>
      <i className="dr-div" aria-hidden="true" />
      {isNoCap(cap) ? (
        <span className="dr-cap" style={{ '--a': '#fbbf24' }}>
          <span className="dr-ticks" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => <i key={i} className="on" />)}
          </span>
          <b style={{ fontSize: 14 }}>제한 없음</b>
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
  const me = Live.myIndex(live);
  const mineNow = Live.currentClub(live) === me && !hold;
  const low = mineNow && clock <= 5;
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
        const isMe = live.clubs[Live.myIndex(live)] === c;
        return (
          <span key={k} className={`dr-pc ${now ? 'now' : past ? 'past' : ''} ${now && isMe ? 'me' : ''}`} style={{ '--t': c.color }}>
            {c.emblem && <i style={{ backgroundImage: `url(${c.emblem})` }} aria-hidden="true" />}
            <b>{c.short}</b>
          </span>
        );
      })}
      {/* 남은 5초: 붉게 · 초마다 한 번 톡(깜빡이지 않음) */}
      <b key={low ? clock : 'n'} className={`dr-clock ${low ? 'low' : ''}`} style={{ '--t': live.clubs[Live.currentClub(live)].color }}>{clock}s</b>
    </div>
  );
}

function MiniCard({ player, reason, takenClub, gone = false, keepAfterGone = false, hot = false, myColor = null, selected, hint, focus, onPick, onSign, style, leaving = false, need = false }) {
  const art = useArt(player);
  const acc = neonOf(player);
  const locked = !!reason;
  const tier = player.overall >= 100 ? 't90' : player.overall >= 85 ? 't75' : '';
  return (
    <button type="button" onClick={() => onPick(player)} onDoubleClick={() => onSign?.(player)} aria-pressed={selected}
      aria-label={`${player.year} ${player.team} ${player.name}, ${POS_LABEL[player.position]}, 영입가 ${player.cost} CP${locked ? `, ${reason}` : ''}`}
      style={{ ...style, '--n': acc, ...(takenClub ? { '--t': takenClub.color } : {}), clipPath: 'inset(0 round 7% / 4.7%)' }}
      className={`mc ${tier} ${locked ? 'lock' : ''} ${takenClub ? 'taken' : ''} ${gone ? (keepAfterGone ? 'gone-keep' : 'gone') : ''} ${hot ? 'hot' : ''} ${player.cost >= 100 ? 'c3' : ''} ${leaving ? 'mc-leave' : ''} group relative block aspect-[2/3] w-full bg-[#05080f] text-left [container-type:inline-size] animate-[rise_.35s_ease-out_both] transition-transform duration-200 focus:outline-none focus-visible:-translate-y-1 ${selected ? '-translate-y-1' : 'hover:-translate-y-0.5'} ${focus === 'off' ? 'opacity-30' : ''}`}>
      <span className="mc-in">
        {art
          ? <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover object-[62%_18%]" />
          : <span className="absolute inset-0 bg-cover bg-top" style={{ backgroundImage: `linear-gradient(160deg, ${teamColor(player)}55, transparent 60%), url(ui/mt/silhouette-player.webp)`, backgroundColor: '#0b1220' }} />}
        <span className="mc-sh" />
        <span className="mc-tb" />
        <span className="mc-ov font-display tabular-nums">{player.overall}</span>
        {hint && <SynergyPips {...hint} />}
        {(
          <>
            <span className="mc-pos"><em>{POS_SHORT[player.position] || player.position}</em></span>
            <span className="mc-rule" />
            <span className={`mc-nm ${player.name.length >= 6 ? 'l6' : player.name.length >= 5 ? 'l5' : player.name.length >= 4 ? 'l4' : ''}`}>{player.name}</span>
            <span className="mc-cp font-display tabular-nums"><b>{player.cost}</b><small>CP</small></span>
          </>
        )}
      </span>
      {/* 테두리(선택 초록 · 시너지 강조 하늘)는 무채색 필터 밖에 둬서 잠긴 카드도 고른 표시가 보이게 */}
      <span className={`pointer-events-none absolute inset-0 transition-[border-color,box-shadow] duration-300 ${selected || focus === 'on' || (need && !takenClub) ? 'border-2' : 'border'}`}
        style={{ borderRadius: '7% / 4.7%', borderColor: selected ? '#34d399' : focus === 'on' ? '#38bdf8' : need && !takenClub ? 'rgba(52,211,153,.8)' : hot && myColor ? `${myColor}b3` : takenClub ? `${takenClub.color}66` : 'rgba(255,255,255,.1)',
          boxShadow: need && !takenClub && !selected ? 'inset 0 0 16px -4px rgba(52,211,153,.6)' : 'none' }} />
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
            {boost && <span className="mr-0.5 text-t4">▲</span>}{eff.overall}
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
          : <em className={`lf-ov font-display not-italic tabular-nums ${boost ? 'up' : ''}`}>{boost && <span className="mr-0.5 text-t4">▲</span>}{eff.overall}</em>}
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
            <div className="lf-bn-h"><span>불펜</span><small><b>{PEN_SLOTS.filter((b) => at(b.id)).length}</b>/{PEN_SLOTS.length}</small></div>
            <div className="lf-bn-g">
              {PEN_SLOTS.map((b) => <BenchSlot key={b.id} slot={b} player={playerOf(b)} kind={kindOf(b)} flags={flagsOf(b)} bind={bind(b.id)}
                boosted={kindOf(b) === 'ghost' ? boostedPreview : boosted} />)}
            </div>
          </div>
          <div className="lf-bn">
            <div className="lf-bn-h"><span>예비</span><small><b>{BENCH_SLOTS.filter((b) => at(b.id)).length}</b>/{BENCH_SIZE}</small></div>
            <div className="lf-bn-g">
              {BENCH_SLOTS.map((b) => <BenchSlot key={b.id} slot={b} player={playerOf(b)} kind={kindOf(b)} flags={flagsOf(b)} bind={bind(b.id)}
                boosted={kindOf(b) === 'ghost' ? boostedPreview : boosted} />)}
            </div>
          </div>
        </div>
      )}
      {highlight && (
        <button type="button" onClick={onClearFocus}
          className="absolute left-3 top-2 z-10 flex items-center gap-1.5 bg-sky-500/15 px-2 py-1 text-t4 font-semibold text-sky-200 shadow-[inset_0_0_0_1px_rgba(56,189,248,.5)] hover:bg-sky-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
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
      <div className="mtp-tabs" role="tablist">
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
      {/* 여섯 축 — 막대는 우리 팀, 흰 눈금은 AI 평균, 오른쪽은 차이 */}
      <div className="mt-bars">
        <div className="mt-bhd"><span>AI 평균</span><b className="font-display tabular-nums">{fmt1(ai.team)}</b></div>
        {axes.map((x) => {
          const pos = (v) => `${Math.max(3, Math.min(100, ((v - 40) / 80) * 100))}%`;
          const up = x.d == null || x.d >= 0;
          return (
            <div key={x.k} className="mt-bar">
              <span>{x.k}</span>
              <i>{x.m != null && <b style={{ width: pos(x.m), background: up ? '#34d399' : '#f87171' }} />}{x.a != null && <em style={{ left: pos(x.a) }} />}</i>
              <b className="font-display tabular-nums">{x.m == null ? '-' : Math.round(x.m)}</b>
              <small className="font-display tabular-nums" style={{ color: x.d == null ? '#6b7280' : up ? '#34d399' : '#f87171' }}>{x.d == null ? '' : signed(x.d)}</small>
            </div>
          );
        })}
      </div>
      {ranked.length > 0 && (
        <div className="mt-style"><span className="g">{STYLE_STRONG[ranked[0].k]}</span><i>·</i><span className="o">{STYLE_WEAK[ranked[ranked.length - 1].k]}</span></div>
      )}
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
            <div className="mt-gh"><b>{ko}</b><em>{rows.filter((x) => x.player).length}/{slots.length}</em></div>
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
      <h3 className="text-t3 font-bold text-white">{children}</h3>
      {aside && <span className="font-display text-t3 tabular-nums text-gray-400">{aside}</span>}
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
            <span className="w-9 shrink-0 font-display text-t3 font-bold text-gray-400">{pos}</span>
            {player ? (
              <>
                <FaceChip player={player} className="h-8 w-8" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-t3 font-semibold text-white">{player.name}</span>
                  <span className="block font-display text-t4 tabular-nums text-gray-400">{player.year} {player.team}{player.naturalPosition && <span className="text-amber-300"> · 원래 {player.naturalPosition}</span>}</span>
                </span>
                <span className="font-display text-t2 font-bold tabular-nums text-gray-100">{player.overall}</span>
              </>
            ) : <span className="py-2 text-t4 text-gray-500">빈 자리</span>}
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
          <span className={`whitespace-nowrap text-t3 font-bold ${s.active ? 'text-[#10b981]' : 'text-gray-100'}`}>{s.name}</span>
          {s.tiers.length > 1 && s.level > 0 && <span className="shrink-0 font-display text-t4 font-bold text-[#10b981]">{s.level}단계</span>}
          <span className="ml-auto flex shrink-0 items-center gap-1"
            aria-label={`${maxed ? '최종 단계' : `${stage + 1}단계까지 ${to - s.cur}명`}${next > s.cur ? `, 영입하면 ${Math.min(next, to) - s.cur}칸` : ''}${nextExtra > extra ? ', 영입하면 추가 혜택' : ''}`}>
            <span className="flex gap-0.5">
              {Array.from({ length: to - from }, (_, i) => (
                <i key={`${stage}-${i}`} className={`h-2 w-3 rounded-sm ${i < s.cur - from ? (maxed ? 'bg-[#10b981]' : 'bg-gray-300') : i < Math.min(next, to) - from ? 'bg-sky-400' : 'bg-gray-700'}`} />
              ))}
            </span>
            {nextExtra > 0 && (
              <span className={`rounded-sm px-1 font-display text-t4 font-bold leading-4 ${nextExtra > extra ? 'bg-sky-400/20 text-sky-300' : 'bg-[#10b981]/20 text-[#10b981]'}`}>+{nextExtra}</span>
            )}
          </span>
        </span>
        {focused ? (
          <span className="mt-1.5 block">
            {s.names ? (
              <span className="flex flex-wrap gap-x-2 gap-y-0.5 text-t4">
                {s.names.map((k) => (
                  <span key={k} className={mine.has(k) ? 'font-semibold text-gray-100' : k === candKey ? 'font-semibold text-sky-300' : 'text-gray-400'}>{k}</span>
                ))}
              </span>
            ) : (
              <span className="block text-t4">
                <span className="text-gray-400">{s.cond}</span>
                {inLineup.length > 0 && (
                  <span className="mt-0.5 flex flex-wrap gap-x-2">{inLineup.map((x) => <span key={x.key} className={x.cls}>{x.label}</span>)}</span>
                )}
              </span>
            )}
            <span className="mt-1 block text-t4 font-semibold text-[#10b981]">{s.effect}</span>
          </span>
        ) : (
          <span className="mt-0.5 block truncate text-t4">
            {inLineup.length
              ? inLineup.map((x, i) => <span key={x.key} className={x.cls}>{i ? ' · ' : ''}{x.label}</span>)
              : <span className="text-gray-400">{s.cond}</span>}
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
        : <p className="text-t4 text-gray-400">완성된 시너지 없음</p>}
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
        <span className="sd-lab font-display">시너지</span>
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
function Modal({ title, eyebrow, onClose, bar, bodyKey, wide, children }) {
  const rootRef = useRef(null);
  useExitGhost(rootRef);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div ref={rootRef} className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#03050a]/70 px-4 py-10 backdrop-blur-[5px] animate-[fade_.15s_ease-out_both]" onClick={onClose} role="presentation">
      <section role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={`ui-cut ui-frame ui-glass2 w-full ${wide ? 'max-w-[1160px]' : 'max-w-lg'} animate-[rise_.25s_ease-out_both] shadow-[0_24px_60px_-12px_rgba(0,0,0,.8)]`} style={{ '--c': '22px' }}>
        <header className={`flex items-start justify-between gap-4 px-6 pt-5 ${bar ? 'pb-3' : 'border-b border-white/10 pb-4'}`}>
          <div>
            {eyebrow && <p className="ui-lab font-display">{eyebrow}</p>}
            <h2 className="mt-1 text-t1 font-black text-white">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" autoFocus
            className="grid h-9 w-9 place-items-center text-gray-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </header>
        {bar}
        {/* bodyKey 가 바뀌면(규칙 탭 전환) 스크롤을 맨 위로 */}
        {wide ? children : <div key={bodyKey} className="pop-scroll max-h-[70vh] overflow-y-auto py-4 pl-6 pr-5">{children}</div>}
      </section>
    </div>
  );
}

/* 드래프트 규칙 팝업: 위 큰 탭 카드(3×2)로 섹션을 고르고, 섹션 안 구역은 눌러 열고 닫는다 (섹션을 열면 첫 구역만 펼침) */
function RulesModal({ onClose }) {
  const [tab, setTab] = useState(RULE_TABS[0].id);
  const sec = RULE_TABS.find((x) => x.id === tab);
  return (
    <Modal eyebrow="도움말" title="드래프트 규칙" onClose={onClose} wide>
      <div className="rl-wrap">
        <nav className="rl-nav" role="tablist" aria-label="규칙 목차" aria-orientation="vertical">
          {RULE_TABS.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={x.id === tab} className={x.id === tab ? 'on' : ''} onClick={() => setTab(x.id)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{x.icon}</svg>
              <b>{x.label}</b>
            </button>
          ))}
        </nav>
        <div key={tab} className="rl-page pop-scroll" role="tabpanel">
          {sec.facts && (
            <div className="rl-facts">
              {sec.facts.map(([n, k]) => <div key={k}><b>{n}</b><span>{k}</span></div>)}
            </div>
          )}
          {sec.flow && (
            <ol className="rl-flow">
              {sec.flow.map((x, i) => <li key={x}><i>{i + 1}</i>{x}</li>)}
            </ol>
          )}
          <div className="rl-cards">
            {sec.groups.map((g) => (
              <article key={g.t} className="rl-card">
                <h3 className="rl-t">{g.t}</h3>
                <div className="rl-bd">{g.b}</div>
              </article>
            ))}
          </div>
        </div>
      </div>
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
    <Modal eyebrow="시너지 도감" title="전체 시너지" onClose={onClose} bar={bar} bodyKey={filter}>
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
        {!groups[filter].length && <p className="py-6 text-center text-gray-500">-</p>}
      </div>
    </Modal>
  );
}

function AugmentShelf({ augments, total = SEASON_AUGMENTS }) {
  return (
    <section className="ui-cut ui-frame ui-glass p-3" style={{ '--c': '12px' }}>
      <PanelTitle aside={`${augments.length}/${total}`}>보유 증강</PanelTitle>
      {augments.length === 0 ? (
        <p className="text-t4 leading-relaxed text-gray-400">{total ? `정비를 마치고 시즌을 시작하면 증강 ${total}개 고르기` : '증강 없이 치르는 모드'}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {augments.map((a) => (
            <li key={a.id} className="ui-cut bg-white/[0.045] px-2.5 py-2 text-gray-100" style={{ '--c': '7px', boxShadow: `inset 3px 0 0 ${TIER_NEON[a.tier]}` }}>
              <span className="text-t3 font-bold">{a.name}{a.lv ? <b className="ml-1 font-display" style={{ color: TIER_NEON[a.tier] }}>+{a.lv}</b> : null}</span>
              <p className="mt-0.5 text-t4 text-gray-400">{augDescAt(a)}</p>
              {a.cond && <p className="text-t4 text-gray-400">조건 · {a.cond}</p>}
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

/** 효과 글 속 숫자만 빛나게 */
const LitNums = ({ text }) => <>{String(text).split(/([+\-−]?\d+(?:\.\d+)?%?p?)/g).map((t, i) => (i % 2 ? <b key={i} className="aug-num">{t}</b> : t))}</>;

function ChoiceCard({ option: o, index, onChoose, state = '', onHot }) {
  const art = useImage(`augments/${o.id}.webp`);
  return (
    <button type="button" onClick={() => onChoose(o)} aria-label={`${o.name} 고르기`}
      style={{ '--a': '#a78bfa', animationDelay: state ? '0ms' : `${120 + index * 110}ms` }}
      onMouseEnter={() => onHot?.(index)} onMouseLeave={() => onHot?.(-1)}
      onFocus={() => onHot?.(index)} onBlur={() => onHot?.(-1)}
      className={`aug-card aug-gold group relative block h-[32rem] w-[21rem] text-left focus:outline-none ${state}`}>
      {state === 'take' && <><span className="aug-ring" /><span className="aug-ring late" /></>}
      <span className="aug-burst" aria-hidden="true" />
      <span className="aug-face">
        {art
          ? <img src={art} alt="" className="aug-art absolute inset-x-0 top-0 h-[60%] w-full object-cover object-[50%_18%]" />
          : <span className="absolute inset-x-0 top-0 h-[60%]" style={{ background: 'radial-gradient(80% 60% at 50% 40%, rgba(167,139,250,.35), transparent 70%)' }} />}
        <span className="aug-veil" />
        <span className="aug-shine" />
        <span className="aug-top" aria-hidden="true"><i className="aug-gem" /></span>
        <span className="aug-body">
          {/* 종류(또는 강화 레벨) · 도움 되는 영역 */}
          <span className="aug-tags">
            <span className="aug-tag">{o.lv ? `+${o.lv} 레벨` : AUG_TYPE[o.type] || '증강'}</span>
            {augAreas(o).map((k) => <span key={k} className="aug-area" style={{ '--k': AUG_AREA[k][1] }}>{AUG_AREA[k][0]}</span>)}
          </span>
          <b className="aug-name">{o.name}{o.lv ? <em className="ml-1.5 font-display not-italic text-[#e9d5ff]">+{o.lv}</em> : null}</b>
          <span className="aug-rule" />
          <span className="aug-desc"><LitNums text={augDescAt(o)} /></span>
          {o.note && <span className="aug-note">{o.note}</span>}
          {o.cond && <span className="aug-hint">조건 · {o.cond}</span>}
        </span>
      </span>
    </button>
  );
}

/** 드래프트 기념 카드 — 판에서 뽑은 선수 가운데 한 명을 내 팀 보관함으로 (draft/memento.js) */
function MementoOverlay({ memento, onTake, onSkip }) {
  const [took, setTook] = useState(null);
  useEffect(() => { setTook(null); }, [memento]);
  if (!memento) return null;
  const FLIP0 = 260, FLIP_STEP = 140; // 첫 장 뒤집힘 · 다음 장 간격(ms)
  return (
    <div className="fx-fade fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="드래프트 기념 카드">
      <div className="ui-bg" style={{ backgroundImage: 'url(ui/field.webp)' }} />
      <div className="fixed inset-0 bg-[#03050a]/75 backdrop-blur-[3px]" />
      <div className="relative flex min-h-full flex-col items-center justify-center gap-7 px-4 py-10">
        <div className="fx-rise text-center">
          <p className="ui-lab font-display" style={{ '--a': '#fbbf24' }}>드래프트 기념 카드 · {memento.why}</p>
          <h2 className="mt-2 text-4xl font-black text-white">한 명 데려오기</h2>
          {memento.full && <p className="mt-2 text-t3 font-bold text-[#f87171]">보관함 가득 ({CLUB_MAX}명)</p>}
        </div>
        <div className="flex flex-wrap justify-center gap-5">
          {memento.options.map((p, i) => {
            const mine = took === p.id;
            const other = took && !mine;
            return (
              <div key={p.id} className="flex w-[216px] flex-col gap-2"
                style={{ opacity: other ? 0.3 : 1, transform: mine ? 'translateY(-14px) scale(1.07)' : other ? 'translateY(10px) scale(.95)' : 'none', transition: 'opacity .35s var(--fx-out), transform .45s var(--fx-out)', zIndex: mine ? 2 : 1 }}>
                <Flip delay={FLIP0 + i * FLIP_STEP} className="aspect-[2/3] w-full">
                  <div className="h-full w-full" style={{ borderRadius: 14, boxShadow: mine ? '0 0 0 2px #f5d27a, 0 0 46px -4px #f5d27a' : 'none', transition: 'box-shadow .35s' }}>
                    <PlayerCard player={p} reason={null} onSelect={() => {}} style={{ animation: 'none' }} />
                  </div>
                </Flip>
                <button type="button" className="fx-fade ui-btn ui-cut pri" disabled={memento.full || !!took} style={{ '--c': '9px', '--d': `${FLIP0 + i * FLIP_STEP + 380}ms` }}
                  onClick={() => { setTook(p.id); setTimeout(() => onTake(p), 620); }}>{mine ? '데려옴' : '데려오기'}</button>
              </div>
            );
          })}
        </div>
        <button type="button" className="fx-fade ui-btn ui-cut" style={{ '--c': '9px', '--d': `${FLIP0 + memento.options.length * FLIP_STEP + 300}ms` }} disabled={!!took} onClick={onSkip}>받지 않기</button>
      </div>
    </div>
  );
}

/** 증강 · 돌발 이벤트 고르기 창. eyebrow · heading 은 경기 전 증강처럼 '시즌'이 아닌 곳에서 바꿔 쓴다 */
export function ChoiceOverlay({ choice, onChoose, picksLeft = 0, total = SEASON_AUGMENTS, rerolls = 0, onReroll = null, eyebrow = '시즌 증강', heading = '시즌 증강 고르기' }) {
  const free = choice?.free || 0; // 거저 주는 다시 굴리기
  const [hot, setHot] = useState(-1); // 지금 올려 둔 카드
  const [took, setTook] = useState(-1); // 고른 카드 — 결이 끝난 뒤에 넘긴다
  useEffect(() => { setHot(-1); setTook(-1); if (choice) play('augReveal', { n: choice.options.length }); }, [choice]); // 새로 뜰 때 · 다시 굴렸을 때
  if (!choice) return null;
  const isAug = choice.kind === 'augment';
  const nth = total - picksLeft + 1;
  /* 증강 등급은 하나로 합쳤다 — 제목 뒤에 등급 이름을 붙이지 않는다 ("… 고르기 증강"으로 겹쳐 읽혔다) */
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label={isAug ? '증강 선택' : '시즌 돌발 이벤트'}>
      <div className="ui-bg" style={{ backgroundImage: `url(ui/${isAug ? 'field' : 'tunnel'}.webp)` }} />
      <div className="fixed inset-0 bg-[#03050a]/70 backdrop-blur-[3px]" />
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <span className="aug-sky" /><span className="aug-rays" /><span className="aug-dust" />
      </div>
      <div className="relative flex min-h-full flex-col items-center justify-center gap-8 px-4 py-10">
        <div className="flex flex-col items-center text-center animate-[rise_.4s_ease-out_both]">
          <p className="aug-hd">{isAug ? eyebrow : '돌발 상황'}</p>
          <h2 className="mt-2 text-[44px] font-black text-white [text-shadow:0_0_30px_rgba(167,139,250,.6)]">
            {isAug ? (choice.inning ? `${choice.inning}회 증강 고르기` : heading) : '시즌 돌발 이벤트'}
            {isAug && !choice.inning && picksLeft > 0 && total > 1 && <span className="ml-3 font-display font-extrabold text-[#e9d5ff]">{nth} / {total}</span>}
          </h2>
          {!isAug && <p className="mt-2 text-t3 text-gray-400">구단 운영 방향 고르기 · 되돌리기 없음</p>}
        </div>
        <div className="flex flex-wrap justify-center gap-9" data-sfx="none">
          {choice.options.map((o, i) => (
            <ChoiceCard key={o.id} option={o} index={i} onHot={took < 0 ? setHot : null}
              state={took >= 0 ? (took === i ? 'take' : 'gone') : hot === i ? 'hot' : hot >= 0 ? 'cold' : ''}
              onChoose={(pick) => { if (took >= 0) return; setTook(i); play('augPick'); setTimeout(() => onChoose(pick), 620); }} />
          ))}
        </div>
        {isAug && onReroll && (free > 0 || rerolls > 0) && (
          <button type="button" onClick={onReroll} data-sfx="augReroll" className="aug-reroll animate-[rise_.4s_ease-out_both]">
            ↺ 다시 굴리기
            <em className="ml-1.5 not-italic opacity-75">
              {free > 0 ? '· 이번 한 번 무료' : `· 리롤권 ${rerolls}장`}
            </em>
          </button>
        )}
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
          <tr className="text-t4 font-semibold uppercase tracking-widest text-gray-400">
            <th className="px-3 pb-1 text-left">팀</th>
            {Array.from({ length: 9 }, (_, i) => <th key={i} className="w-11 pb-1">{i + 1}</th>)}
            <th className="w-14 pb-1 text-[#10b981]">R</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-white/[0.07]">
              <td className="whitespace-nowrap px-3 py-1 font-sans text-t3 font-bold text-white">
                <span className="mr-2.5 inline-block h-5 w-1.5 -skew-x-12 align-middle" style={{ background: r.top ? '#f87171' : '#10b981' }} />
                <span className="mr-2 font-display text-t4 font-semibold tracking-widest text-gray-400">{r.top ? '원정' : '홈'}</span>{r.name}
              </td>
              {r.arr.map((v, i) => {
                const live = half && half.inning === i + 1 && half.isTop === r.top;
                return (
                  <td key={i} style={v !== null ? { animation: 'cellIn .8s ease-out' } : undefined}
                    className={`h-11 text-center text-t1 font-bold tabular-nums ${live ? 'bg-[#10b981]/15 shadow-[inset_0_-2px_0_#10b981]' : ''} ${v === null ? 'text-gray-700' : v === 0 ? 'text-gray-400' : 'text-white'}`}>
                    {v === null ? (live ? <span className="text-t3 text-[#10b981]">●</span> : '') : v}
                  </td>
                );
              })}
              <td className={`text-center text-t1 font-bold tabular-nums ${leader === r.key ? 'text-[#10b981] [text-shadow:0_0_14px_rgba(16,185,129,.6)]' : 'text-white'}`}>{total(r.arr)}</td>
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
        <h3 className="ui-lab font-display">문자 중계</h3>
        {paused && <span className="text-t4 font-bold text-[#10b981]">하이라이트 · 일시정지</span>}
      </div>
      <ol ref={ref} className="syn-scroll flex max-h-[26rem] flex-col gap-1 overflow-y-auto p-2">
        {logs.map((l) => {
          const inn = l.inning ? `${l.inning}회${l.isTop ? '초' : '말'}` : '';
          if (l.kind === 'augment') {
            const cut = l.text.indexOf('] ');
            return (
              <li key={l.id} className="animate-[rise_.3s_ease-out_both] bg-white/[0.045] px-3 py-2 text-t3" style={{ boxShadow: `inset 3px 0 0 ${TIER_NEON[l.tier]}` }}>
                <span className="mr-2 font-display text-t4 font-semibold text-gray-400">{inn}</span>
                <span className="font-bold" style={{ color: TIER_NEON[l.tier] }}>{cut > 0 ? l.text.slice(0, cut + 1) : ''}</span>
                <span className="text-white"> {cut > 0 ? l.text.slice(cut + 2) : l.text}</span>
              </li>
            );
          }
          return (
            <li key={l.id} className={`grid grid-cols-[3.25rem_1fr_auto] items-baseline gap-2 rounded px-2 py-1 text-t3 ${l.kind === 'system' ? 'text-gray-400' : l.kind === 'score' ? 'bg-white/[0.03] text-white' : 'text-gray-400'}`}>
              <span className="font-display text-t4 font-semibold text-gray-400">{inn}</span>
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
          style={{ clipPath: 'inset(0 round 18px)' }}>
          <p className="ui-lab font-display">증강 발동</p>
          <p className="mt-1 font-display text-5xl font-extrabold italic leading-none text-white" style={{ textShadow: `0 0 30px ${acc}`, textWrap: 'balance' }}>{augment.name}!</p>
          <p className="mt-2 text-t3 text-gray-100">{text}</p>
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
/**
 * 정비 화면의 상대(스카우팅 모양 { name, roster, batters?, starter? }) → 승률 계산용 팀.
 * 드래프트 로스터(자리 있음)는 그대로, 시리즈 · 감독 팀처럼 큰 로스터는 타순 9 · 선발 · 불펜 넷만 추려 자리를 앉힌다
 */
export function oppTeamFor(opp, buff = 0) {
  const ros = opp?.roster || [];
  const drafted = ros.length <= ROSTER_SIZE && ros.every((p) => p.slot);
  const arms = ros.filter((p) => p.type === 'pitcher' && p.id !== opp?.starter?.id).sort((a, b) => b.overall - a.overall);
  const bats = opp?.batters?.length ? opp.batters : ros.filter((p) => p.type === 'batter').sort((a, b) => b.overall - a.overall);
  const pick = drafted ? ros : withSlots([...bats.slice(0, 9), ...(opp?.starter ? [{ ...opp.starter, slot: 'SP' }] : []), ...arms.slice(0, 4)]);
  return buildTeam(opp?.name || '상대', pick, buff);
}
/** 예상 승률(%) — 내 팀 · 상대 모두 buildTeam 모양 */
export const winPct = (my, opp) => Math.round(winChance(my, opp) * 100);

/** 경기 내내 승률이 그린 선 — 반 위는 우리 쪽, 아래는 상대 쪽 */
function WinCurve({ flow, tone, h = 96 }) {
  const w = 1000;
  const xs = flow.length > 1 ? flow : [...flow, ...flow];
  const step = w / (xs.length - 1);
  const y = (v) => h - v * h;
  const d = xs.map((v, i) => `${i ? 'L' : 'M'} ${(i * step).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const top = `${d} L ${w} 0 L 0 0 Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block h-[96px] w-full">
      <rect x="0" y="0" width={w} height={h} fill="rgba(255,255,255,.035)" />
      <clipPath id="wc-up"><path d={top} /></clipPath>
      <rect x="0" y="0" width={w} height={h} fill={tone} opacity=".16" clipPath="url(#wc-up)" />
      <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="rgba(255,255,255,.28)" strokeWidth="1" strokeDasharray="6 5" />
      <path d={d} fill="none" stroke={tone} strokeWidth="2.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** 감독이 한 일 — 승률 곡선 · 내 지시의 몫 · 가장 크게 움직인 지시 */

/** 모드에서 열리는 시리즈를 대표 선수 카드로. 레전드 모드는 시리즈가 하나라 대표 선수들을, 최근 시즌은 준비 중인 시즌까지 */
function ticketsOf(mode) {
  // 레전드가 한 묶음뿐일 때는 대표 선수로 티켓을 만든다 (구단별 레전드 시리즈가 생기면 시리즈 티켓)
  if (mode.id === 'legend' && mode.series.length === 1) {
    return [...mode.players].sort((a, b) => b.overall - a.overall).slice(0, 12)
      .map((p) => ({ key: p.id, year: p.year, title: p.name, sub: `${p.team} · ${POS_LABEL[p.position]} · 종합 ${p.overall}`, star: p }));
  }
  const list = mode.series.map((s) => ({
    key: s.id, year: s.year || '역대', title: s.title, kind: s.kind, sub: `${s.subtitle || SERIES_KIND_LABEL[s.kind]} · ${s.players.length}명`,
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
      <b className="absolute left-1.5 top-0.5 font-display text-t3" style={{ color: rdTone(p.overall) === 'prism' ? '#fde047' : rdTone(p.overall) }}>{p.overall}</b>
      <b className="absolute inset-x-1 bottom-0.5 truncate text-center text-t4 text-white">{p.name}</b>
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
              <b className="text-t3 font-extrabold" style={{ color: acc }}>{mode.group === 'special' ? '특별 모드' : '베이직 모드'}</b>
              <b className="mt-2 block text-5xl font-black leading-none text-white">{mode.name}</b>
              <span className="mt-2 block text-t3 text-gray-300">{mode.series.length} 시리즈 · {mode.players.length}명</span>
            </div>
            {hero && <div className="shrink-0" style={{ width: 176, height: 112, ...veil }}><SeriesTicket t={hero} acc={acc} fit /></div>}
          </div>
          <SeriesFolds groups={groupTickets(rest)} acc={acc} />
        </div>
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <p className="ui-lab font-display" style={{ '--a': acc }}>대표 선수</p>
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
              <b className="text-t4 text-gray-300">{ko} {list.length}</b>
              <span className="h-px flex-1 bg-white/10" />
              <span className="font-display text-t4 text-gray-400">{on ? '접기 ▲' : '펼치기 ▼'}</span>
            </button>
            {on && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {list.map((t) => (
                  <span key={t.key} className="ui-cut inline-flex items-center gap-1.5 bg-white/[0.055] px-2.5 py-1 text-t4 text-gray-200"
                    style={{ '--c': '5px' }} title={t.sub || t.title}>
                    {Number.isFinite(t.year) && <b className="font-display text-t4" style={{ color: acc }}>{t.year}</b>}
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
      <b className="absolute right-2.5 top-2 font-display text-t1" style={{ color: c, textShadow: '0 2px 6px #000' }}>{p.overall}</b>
      <div className="absolute inset-x-3 bottom-2.5">
        <span className="font-display text-t4 tracking-[0.18em] text-gray-400">{POS_LABEL[p.position] || p.position} · {p.team}</span>
        <b className="mt-0.5 block truncate text-t1 font-black text-white">{p.name}</b>
        {p.note && <span className="mt-0.5 block truncate text-t4 text-gray-400">{p.note}</span>}
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
              className={`ui-cut px-3 py-1 font-display text-t3 font-bold ${on ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400 hover:text-white'}`}
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
              className={`ui-cut flex items-center gap-1.5 px-3 py-1 font-display text-t3 ${on ? 'font-bold text-white' : 'text-gray-400 hover:text-white'}`}
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
            <b className="font-display text-t3 tracking-[0.25em]" style={{ color: hero?.champion ? '#fcd34d' : acc }}>
              {mode.year} {hero?.champion ? '우승' : live ? '진행 중' : '시즌'}
            </b>
          </span>
          <b className="mt-2 block text-5xl font-black leading-none text-white">{hero?.title || mode.name}</b>
          <span className="mt-2 block text-t3 text-gray-300">{hero?.subtitle || `${list.length} 시리즈 · ${mode.players.length}명`}</span>
          {heroT && <div className="mt-4 shrink-0" style={{ height: 176 }}><SeriesTicket t={heroT} acc={acc} /></div>}
          <p className="ui-lab font-display" style={{ '--a': acc }}>시리즈 {rest.length}</p>
          <div className="syn-scroll mt-1.5 grid min-h-0 gap-1.5 overflow-y-auto pr-1" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gridAutoRows: '82px' }}>
            {restT.map((t) => <SeriesTicket key={t.key} t={t} acc={acc} sm />)}
          </div>
        </div>
        {/* 오른쪽 — 그 해 얼굴 하나를 크게, 나머지는 그 옆으로 한 줄 */}
        <div className="flex min-h-0 flex-col justify-end pb-1">
          <p className="ui-lab font-display" style={{ '--a': acc }}>그해 최고 선수</p>
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
      {t.locked && <span className="absolute inset-0 grid place-items-center bg-[repeating-linear-gradient(135deg,rgba(255,255,255,.03)_0_8px,transparent_8px_16px)] text-t4 font-semibold text-gray-400">준비 중</span>}
      {!sm && (
        <span className={`absolute left-3 top-2 font-display text-t1 font-extrabold leading-none ${t.locked ? 'text-gray-500' : ''}`}
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
        {sm && <b className={`block truncate font-display text-t4 ${t.locked ? 'text-gray-500' : ''}`} style={t.locked ? undefined : { color: acc }}>{t.year}</b>}
        <p className={`truncate font-black ${sm ? 'text-t4' : 'text-t3'} ${t.locked ? 'text-gray-400' : 'text-white'}`}>{t.title}</p>
        {!sm && <p className="truncate text-t4 text-gray-400">{t.sub}</p>}
      </div>
    </div>
  );
}

/** fixed 를 주면 고를 수 없는 줄 — 줄을 빼면 모드를 바꿀 때 줄 수가 출렁여서, 값만 적어 둔다 */
function SettingRow({ label, options, labels, value, onChange, fixed = null }) {
  if (fixed != null) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-white/10 py-2.5 text-t3 text-gray-300">
        <span>{label}</span>
        <b className="font-display text-t3 text-gray-400">{fixed}</b>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 py-2.5 text-t3 text-gray-300">
      <span>{label}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)}
            className={`ui-cut px-2.5 py-0.5 font-display text-t3 font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${value === o ? 'text-[#05080f]' : 'bg-white/[0.06] text-gray-400 hover:text-white'}`}
            style={{ '--c': '5px', background: value === o ? 'var(--a)' : undefined }}>
            {labels ? labels[o] : o}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModeSelect({ initialMode, record, onStart, onExit, normal, normalView = null, onNormalView }) {
  // 사이드 네비: normal(일반 대결 · 랭크전) · mix · recent · year(연도별) · 특별 모드 하나씩
  const plays = normal || [];
  const firstMode = DRAFT_MODES.find((m) => m.id === initialMode) || DRAFT_MODES[0];
  const specialIds = DRAFT_MODES.filter((m) => m.group === 'special').map((m) => m.id);
  // normalView: 처음 열 탭 — 플레이 탭(duel · ranked) 또는 드래프트 탭(mix · recent · year · 특별 모드 id)
  const openAt = (v) => (v === 'special' ? specialIds[0] : v); // 예전에 묶어 두던 '특별 모드' 칸은 첫 특별 모드로
  const [view, setView] = useState(plays.length
    ? (normalView && (plays.some((x) => x.key === normalView) || ['mix', 'recent', 'year', 'special', ...specialIds].includes(normalView)) ? openAt(normalView) : plays[0].key)
    : (firstMode.group === 'year' ? 'year' : firstMode.id));
  const play = plays.find((x) => x.key === view) || null;
  const [yearId, setYearId] = useState(firstMode.group === 'year' ? firstMode.id : YEAR_MODES[0]?.id);
  const modeId = view === 'year' ? yearId : play ? null : view;
  const mode = DRAFT_MODES.find((m) => m.id === modeId) || firstMode;
  const [cap, setCap] = useState(mode.cap);
  const [ai, setAi] = useState('normal');
  const aug = SEASON_AUGMENTS; // 시즌 증강은 늘 있다
  const [format, setFormat] = useState('single'); // 단판 · 16 · 32강
  useEffect(() => { setCap(mode.cap); }, [mode.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const tickets = ticketsOf(mode);
  const specials = DRAFT_MODES.filter((m) => m.group === 'special');
  const special = mode.group === 'special';
  const yearMode = DRAFT_MODES.find((m) => m.id === yearId);
  const NAV = [
    ...(plays.length ? [{ group: '플레이', items: plays.map(({ key, label, sub, img, neon }) => ({ key, label, sub, img, neon })) }] : []),
    { group: '베이직 모드', items: [
      { key: 'mix', label: '전체 믹스', sub: `${DRAFT_MODES.find((m) => m.id === 'mix').series.length} 시리즈 · 무작위`, img: 'modes/mix.webp', neon: '#10b981' },
      { key: 'recent', label: '최근 시즌', sub: '2021 – 2026', img: 'modes/recent.webp', neon: '#38e1ff' },
      { key: 'year', label: '연도별 시즌', sub: `${YEAR_MODES.length}개 시즌 · 한 해 고르기`, img: 'modes/recent.webp', neon: '#a3e635' },
    ] },
    { group: '특별 모드', items: specials.map((m) => ({ key: m.id, label: m.name, sub: m.rules.join(' · '), img: `modes/${m.id}.webp`, neon: m.neon })) },
  ];
  const acc = play ? play.neon : mode.neon;

  return (
    <div className="relative flex min-h-screen flex-col lg:h-dvh lg:min-h-0">
      <header className="relative z-10 flex h-[4.75rem] shrink-0 items-center gap-8 border-b border-[#f5d27a]/20 bg-[linear-gradient(180deg,rgba(5,8,15,.94),rgba(5,8,15,.6))] px-7" style={{ viewTransitionName: 'mode-head' }}>
        <span className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-64 bg-gradient-to-r from-[#f5d27a] to-transparent" aria-hidden="true" />
        {onExit && <button type="button" onClick={onExit} aria-label="메인으로" className="ui-cut grid h-9 w-9 shrink-0 -mr-4 place-items-center bg-white/[0.06] text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)] hover:bg-white/10" style={{ '--c': '7px' }}>←</button>}
        <div className="leading-none">
          <p className="text-t4 font-bold tracking-[0.04em] text-gray-400">메인</p>
          <h1 className="mt-1 text-t2 font-black leading-none text-white">플레이</h1>
        </div>
        {record && <p className="ml-auto text-t3 text-gray-400">최근 기록 <b className="font-display text-t2 text-white">{record}</b></p>}
        <BgmButton className={record ? '' : 'ml-auto'} />
      </header>

      <div className="relative grid min-h-0 flex-1 gap-4 px-6 pb-6 pt-4 lg:grid-cols-[17rem_minmax(0,1fr)_24rem] lg:grid-rows-[minmax(0,1fr)]" style={{ '--a': acc }}>
        {/* 사이드 네비 */}
        <nav className="ui-cut ui-frame ui-glass flex min-h-0 flex-col gap-2 p-3" style={{ '--c': '20px', viewTransitionName: 'mode-nav' }} aria-label="플레이 모드">
          {NAV.map((g) => (
            <React.Fragment key={g.group}>
              <p className="ui-lab font-display px-1 pt-1" style={{ '--a': g.items[0].neon }}>{g.group}</p>
              {g.items.map((it) => {
                const on = view === it.key;
                return (
                  <button key={it.key} type="button" aria-pressed={on}
                    onClick={() => {
                      if (on) return;
                      const order = NAV.flatMap((x) => x.items.map((y) => y.key));
                      navTo(() => { setView(it.key); onNormalView?.(it.key); }, order.indexOf(it.key) > order.indexOf(view) ? 'tab-r' : 'tab-l');
                    }}
                    className={`ui-cut relative flex h-[4.4rem] shrink-0 items-center gap-3 overflow-hidden px-3.5 text-left transition ${on ? '' : 'bg-white/[0.03] hover:brightness-125'}`}
                    style={{ '--c': '10px' }}>
                    {on && <i className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(90deg, ${it.neon}38, rgba(6,10,19,.92))`, viewTransitionName: 'mode-ink' }} aria-hidden="true" />}
                    <span className="ui-cut relative h-[3.2rem] w-11 shrink-0 bg-cover bg-center" style={{ '--c': '8px', backgroundImage: `url(${it.img})`, filter: on ? undefined : 'saturate(.7) brightness(.75)' }} />
                    <span className="relative min-w-0">
                      <b className={`block truncate text-t2 font-black ${on ? 'text-white' : 'text-gray-300'}`}>{it.label}</b>
                      <small className="font-display text-t4 tracking-[0.12em] text-gray-400">{it.sub}</small>
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
              <p className="ui-lab font-display">{special ? '모드 규칙' : view === 'year' ? '시즌 고르기' : '나오는 시리즈'}</p>
              {special && (
                <span className="flex flex-wrap gap-1.5">
                  {mode.rules.map((r) => <span key={r} className="ui-cut px-2 py-0.5 text-t4 font-bold text-[#05080f]" style={{ '--c': '4px', background: mode.neon }}>{r}</span>)}
                </span>
              )}
              {mode.id === 'legend' && mode.series.length === 1 && (
                <p className="text-t3 text-gray-400">{`레전드 ${mode.players.length}명 중 대표 선수`}</p>
              )}
            </div>
            {view === 'year' && <div className="relative z-10"><YearPicker yearId={yearId} onPick={setYearId} /></div>}
            {view === 'year' ? <YearHero mode={mode} acc="#a3e635" /> : <BasicHero mode={mode} tickets={tickets} acc={mode.neon} />}
          </section>
        )}

        {play ? play.aside : (
          <aside className="ui-cut ui-frame ui-glass flex flex-col gap-4 p-6" style={{ '--c': '20px' }}>
            <p className="ui-lab font-display">고른 모드</p>
            <h2 className="-mt-2 text-t1 font-black text-white">{view === 'year' && yearMode ? yearMode.name : mode.name}</h2>
            <p className="text-t3 leading-relaxed text-gray-300">{mode.desc}</p>
            {/* 어느 모드든 같은 줄 — 고를 수 없는 값은 줄을 빼지 않고 오른쪽에 그대로 적는다 */}
            <div>
              {/* 베이직은 여덟 구단이 같이 뽑고 구단 정복으로, 특별은 혼자 자유 영입 뒤 단판 · 토너먼트 */}
              <SettingRow label="드래프트 방식" fixed={special ? '자유 영입' : '같이 뽑기'} />
              <SettingRow label="샐러리 캡" options={[mode.cap - 100, mode.cap, mode.cap + 100]} value={cap} onChange={setCap}
                fixed={special ? '없음' : null} />
              <SettingRow label="AI 난이도" options={['easy', 'normal', 'hard']} labels={{ easy: '쉬움', normal: '보통', hard: '강함' }} value={ai} onChange={setAi} />
              <SettingRow label="경기 방식" options={['single', 16, 32]} labels={{ single: '단판', 16: '16강', 32: '32강' }} value={format} onChange={setFormat}
                fixed={special ? null : '구단 정복'} />
            </div>
            <button type="button" className="ui-btn ui-cut pri mt-auto min-h-[3.5rem] w-full text-t2" onClick={() => onStart(mode.id, { cap: special ? NO_CAP : cap, ai, aug, format: special ? format : 'single', live: !special })}>
              드래프트 시작 ▶
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}

/* 드래프트 규칙 — 탭마다 숫자 칩(facts) · 흐름(flow) · 카드(groups: 제목 t · 그림 b) */
const RL_REFUND_EX = { cost: 95 };
const AUG_TYPE_RULE = {
  build: '늘 조금',
  defense: '수비 크게',
  extreme: '하나 키우고 하나 깎기',
  balance: '약한 곳 메우기',
  fire: '정해진 이닝부터',
  situ: '점수 상황 맞을 때',
};

/*
 * 규칙 창 — 다른 게임 도움말을 견줘 줄인 틀
 *  facts : 큰 숫자 칩 3~4개(마블 스냅 "6턴 · 3지역"처럼 먼저 숫자)
 *  flow  : 순서가 있는 규칙은 화살표 세 칸(TFT · 전장 튜토리얼처럼 한 칸에 한 마디)
 *  groups: 카드 2~4장 — 제목 + 그림(표 · 사다리 · 칩) 위주, 글은 한 줄
 */
const RULE_TABS = [
  { id: 'entry', label: '엔트리',
    icon: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5" /><circle cx="17" cy="9" r="2.3" /><path d="M15.5 14.2c2.4.2 4.2 1.8 4.8 4.8" /></>,
    facts: [[ROSTER_SIZE, '선수'], [14, '필드 자리'], [BENCH_SIZE, '예비'], [FOREIGN_LIMIT, '외국인 최대']],
    groups: [
      { t: '자리', b: <>
        <div className="rl-slots">
          <div><span>투수<i>5</i></span><span className="rl-chips"><span className="rl-chip">선발</span><span className="rl-chip">롱릴리프</span><span className="rl-chip">중간</span><span className="rl-chip">셋업</span><span className="rl-chip">마무리</span></span></div>
          <div><span>내야<i>5</i></span><span className="rl-chips"><span className="rl-chip">포수</span><span className="rl-chip">1루</span><span className="rl-chip">2루</span><span className="rl-chip">3루</span><span className="rl-chip">유격</span></span></div>
          <div><span>외야<i>3</i></span><span className="rl-chips"><span className="rl-chip">외야 ×3</span></span></div>
          <div><span>지명<i>1</i></span><span className="rl-chips"><span className="rl-chip g">야수 누구나</span></span></div>
          <div><span>예비<i>{BENCH_SIZE}</i></span><span className="rl-chips"><span className="rl-chip g">포지션 상관없음 · 시너지만</span></span></div>
        </div>
      </> },
      { t: '한 사람은 한 번', b: <>
        <div className="rl-yn">
          <div className="y"><span><b>2006 류현진</b> 영입</span></div>
          <div className="n"><span><b>2010 류현진</b> 잠김</span></div>
        </div>
      </> },
    ] },
  { id: 'draft', label: '드래프트',
    icon: <><rect x="4" y="5" width="7" height="10" rx="1" /><rect x="13" y="9" width="7" height="10" rx="1" /><path d="M7.5 18v2M16.5 5V3" /></>,
    facts: [[ROSTER_SIZE, '라운드'], [SALARY_CAP, 'CP 캡 ±100'], [Live.BOARD_SIZE, '보드 선수'], [`${Live.PICK_SECONDS}초`, '내 차례']],
    flow: ['보드 한 시리즈', '순번대로 1명씩', '먼저 뽑으면 끝'],
    groups: [
      { t: '영입가', b: <>
        <div className="rl-tbl">
          <span className="h">종합</span><span className="h">영입가</span><span className="h" />
          {[95, 90, 80, 65].map((o) => {
            const d = costOf(o) - o;
            return (
              <React.Fragment key={o}>
                <span className="n">{o}</span><span className="n">{costOf(o)}</span>
                <span className={d > 0 ? 'up' : d < 0 ? 'dn' : ''}>{d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '='}</span>
              </React.Fragment>
            );
          })}
        </div>
      </> },
      { t: '드래프트 권', b: <>
        <div className="rl-kind">
          <div><span className="rl-chip g">스카우트 리포트</span><span>새로고침 +3</span></div>
          <div><span className="rl-chip g">시리즈 지정권</span><span>다음 보드 고르기</span></div>
        </div>
      </> },
      { t: '특별 모드 · 혼자 뽑기', b: <>
        <p>캡 없음 · 시리즈 새로고침 {START_REROLLS}번</p>
      </> },
      { t: '못 채운 자리', b: <>
        <p>종합 70 퓨처스 유망주</p>
      </> },
    ] },
  { id: 'swap', label: '방출 · 교체',
    icon: <path d="M5 8h13l-3-3M19 16H6l3 3" />,
    facts: [['½', 'CP 환급'], ['1', '라운드 소모']],
    groups: [
      { t: '방출', b: <>
        <div className="rl-yn">
          <div className="y"><span>{RL_REFUND_EX.cost} CP 선수 → <b>{releaseRefund(RL_REFUND_EX)} CP</b> 환급</span></div>
          <div className="n"><span>다시 영입 · 되돌리기 없음</span></div>
          <div className="n"><span>정비 화면에서는 불가</span></div>
        </div>
      </> },
      { t: '교체 영입', b: <>
        <div className="rl-yn">
          <div className="y"><span>찬 포지션 선수 고르면 맞바꾸기</span></div>
          <div className="y"><span>자리를 먼저 누르면 그 선수와 · 아니면 가장 약한 선수와</span></div>
        </div>
      </> },
    ] },
  { id: 'pos', label: '포지션',
    icon: <><path d="M12 20 4 12l8-8 8 8z" /><circle cx="12" cy="12" r="1.6" /></>,
    groups: [
      { t: '다른 자리에 세우면', b: <>
        <div className="rl-ladder">
          {[
            ['0', 2, '#34d399', '제자리 · 지명타자'],
            ['−3', 15, '#a3e635', '2루↔유격 · 1루↔3루 · 선발↔불펜'],
            ['−6', 30, '#fbbf24', '내야↔외야'],
            ['−8', 40, '#fb923c', '포수 자리 드나들기'],
            ['−20', 100, '#f87171', '투수↔야수'],
          ].map(([v, w, k, txt]) => (
            <div key={v}><b style={{ color: k }}>{v}</b><i style={{ '--w': `${w}%`, '--k': k }} /><span>{txt}</span></div>
          ))}
        </div>
      </> },
      { t: '자리 바꾸기', b: <>
        <div className="rl-yn">
          <div className="y"><span>빈 자리에 끌어 놓기 → <b>이동</b></span></div>
          <div className="y"><span>선수 위에 끌어 놓기 → <b>맞교환</b></span></div>
        </div>
      </> },
    ] },
  { id: 'syn', label: '시너지',
    icon: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
    facts: [[`+${SYNERGY_STAT_CAP}`, '한 능력치 최대']],
    groups: [
      { t: '실화 조합', b: <>
        <div className="rl-syn"><span><b>클린업 트리오</b><small>이승엽 · 이대호 · 김동주 중 2</small></span><em>파워 +5</em></div>
        <div className="rl-syn"><span><b>SK 왕조 배터리</b><small>김광현 · 박경완</small></span><em>안정 · 수비 +4</em></div>
      </> },
      { t: '팀 구성 · 홈런 군단', b: <>
        <div className="rl-tiers"><span><b>3명</b>파워 +2</span><span><b>4명</b>파워 +4</span><span><b>6명</b>파워 +7</span></div>
      </> },
      { t: '테두리 색', b: <>
        <div className="rl-tiers"><span><b>회색</b>없음</span><span><b>브론즈</b>1단계</span><span><b>실버</b>2단계</span><span><b>골드</b>최종</span><span><b>프리즘</b>3단계+ 최종</span></div>
      </> },
      { t: '프랜차이즈의 기억', b: <>
        <div className="rl-tiers"><span><b>3명</b>+1</span><span><b>5명</b>+2</span><span><b>7명</b>+4</span></div>
        <p>가장 많이 뽑은 구단 · 드래프트 뒤 공개</p>
      </> },
    ] },
  { id: 'season', label: '경기 · 보상',
    icon: <><path d="M7 4h10v3a5 5 0 0 1-10 0z" /><path d="M7 5H4v1.5A3 3 0 0 0 7 9.5M17 5h3v1.5a3 3 0 0 1-3 3M12 12v4M8.5 20h7" /></>,
    flow: ['정비', `증강 ${SEASON_AUGMENTS}장`, `경기 · ${MID_AUG_INNINGS.join(' · ')}회 증강`],
    groups: [
      { t: '구단 정복 · 베이직', b: <>
        <div className="rl-yn">
          <div className="y"><span>약한 구단부터 7곳 · 이기면 한 칸 앞으로</span></div>
          <div className="n"><span>지면 같은 구단 재도전</span></div>
        </div>
        <div className="rl-kind">
          <div><span className="rl-chip g">{GAUNTLET_MID_AT}구단 통과</span><span>기념 카드 {GAUNTLET_MID_MEMENTO.n}장 중 1</span></div>
          <div><span className="rl-chip g">정복 완료</span><span>기념 카드 {GAUNTLET_MEMENTO.n}장 중 1</span></div>
        </div>
      </> },
      { t: 'AI 난이도', b: <>
        <div className="rl-tbl">
          <span className="h">난이도</span><span className="h">일곱 구단</span><span className="h">보정</span>
          <span>쉬움</span><span>탄탄 1 · 평범 2 · 약체 4</span><span className="dn">−{AI_BUFF.hard}</span>
          <span>보통</span><span>강호 1 · 탄탄 2 · 평범 2 · 약체 2</span><span>0</span>
          <span>강함</span><span>강호 2 · 탄탄 3 · 평범 2</span><span className="up">+{AI_BUFF.hard}</span>
        </div>
      </> },
      { t: '증강 · 3장 중 1', b: <>
        <div className="rl-kind">
          {Object.entries(AUG_TYPE).map(([k, v]) => <div key={k}><span className="rl-chip g">{v}</span><span>{AUG_TYPE_RULE[k]}</span></div>)}
        </div>
      </> },
      { t: '특별 모드', b: <>
        <div className="rl-kind">
          <div><span className="rl-chip g">단판</span><span>첫 승리 기념 카드 {SINGLE_MEMENTO.n}장 중 1</span></div>
          <div><span className="rl-chip g">16강 · 32강</span><span>순위별 기념 카드 2~5장 중 1</span></div>
        </div>
      </> },
    ] },
  { id: 'team', label: '내 팀',
    icon: <><path d="M12 3.5 19.5 8v8L12 20.5 4.5 16V8z" /><path d="M12 8.5 15.5 10.5v3L12 15.5 8.5 13.5v-3z" /></>,
    groups: [
      { t: '육각형', b: <>
        <div className="rl-kind">
          <div><span className="rl-chip g">초록 면</span><span>우리 팀</span></div>
          <div><span className="rl-chip">붉은 점선</span><span>같은 캡 AI 평균</span></div>
          <div><span className="rl-chip">+9</span><span>AI 평균과 차이</span></div>
        </div>
      </> },
      { t: '팀 색깔', b: <>
        <div className="rl-tbl">
          <span className="h">능력</span><span className="h">앞설 때</span><span className="h">밀릴 때</span>
          {TEAM_AXES.map(([k]) => (
            <React.Fragment key={k}><span>{k}</span><span className="up">{STYLE_STRONG[k]}</span><span className="dn">{STYLE_WEAK[k]}</span></React.Fragment>
          ))}
        </div>
      </> },
      { t: '선수 기록', b: <>
        <div className="rl-kind">
          <div><span className="rl-chip">투수</span><span>ERA · 승 · S/H · 삼진</span></div>
          <div><span className="rl-chip">타자</span><span>타율 · 홈런 · 도루 · 타점</span></div>
          <div><span className="rl-chip g">초록</span><span>팀 1등</span></div>
        </div>
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
export function readyStats(roster, buff) {
  const t = buildTeam('내 팀', roster, buff);
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

export function ReadyScreen({ roster, buff = 0, autoFilled = 0, opponent = null, oppBuff = 0, onMove, onOrder, onReplace, onStart, onRestart, startLabel = '시즌 시작 ▶', restartLabel = '다시 드래프트', startBlock = null, cards = null }) {
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
  const team = { name: '내 팀', squad: roster, bench: benchIds, order, pitchFatigue: {} };

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
      win={opponent ? winPct(now.t, oppTeamFor(opponent, oppBuff)) : null}
      sums={{ bat: now.batSum, def: now.defSum, pit: now.pitSum }}
      teamInfo={teamInfo}
      onCommit={commit}
      onAutoLineup={() => commit({ order: autoArrange(roster, benchIds, {}) })}
      onReset={() => onReplace(init.current)}
      onStart={onStart} onRestart={onRestart} startLabel={startLabel} restartLabel={restartLabel} startBlock={startBlock} cards={cards} />
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
  const [phase, setPhase] = useState('mode'); // mode | draft | ready | sim | result | bracket | gauntlet
  /* 배경음악: 경기 중계는 경기 곡, 나머지(모드 고르기 · 드래프트 · 정비 · 결과)는 메뉴 곡 */
  useEffect(() => { setScene(phase === 'sim' || phase === 'live' ? 'game' : 'menu'); }, [phase]);
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
  /* 효과음: 내 차례 칩이 켜지는 순간 알림 종, 남은 5초부터 초마다 틱(남을수록 높게) */
  const turnBell = !!live && phase === 'draft' && myTurnLit && !Live.isDone(live);
  useEffect(() => { if (turnBell) play('turn'); }, [turnBell]);
  useEffect(() => { if (live && phase === 'draft' && myTurn && clock >= 1 && clock <= 5) play('tick', { sec: clock }); }, [clock]); // eslint-disable-line react-hooks/exhaustive-deps
  /** 이 선수를 지금 지명할 수 없는 이유 — 라이브면 다른 구단이 데려간 것과 막판 자리 강제까지 본다 */
  const lockOf = (p) => (live ? Live.lockReason(live, p, liveMine) : getLockReason(p, roster, cp, released));
  /** 다음 시리즈: 모드 안에서 영입 가능한 시리즈를 먼저, 모드 안에 더는 없으면(방출·교체로 늘어난 기회 등) 전체 시리즈에서 — 이미 나온 팀도 다시 나올 수 있다 */
  const nextSeries = (r, c, banned) => rollSeries(r, c, series?.id, banned, mode.series, seenSeries) || rollSeries(r, c, series?.id, banned, DRAFT_SERIES, seenSeries);
  /** 드래프트 종료: 빈 자리는 퓨처스 유망주(종합 70)로 자동으로 채우고 정비 화면으로 */
  const finishDraft = (r) => {
    const filled = fillRoster(r);
    setAutoFilled(filled.length - r.length);
    const g = live ? Gaunt.makeGauntlet(live) : null;   // 라이브 판이었으면 여덟 구단으로 구단 정복 탑을 세운다
    if (g) setGaunt(g);
    setRoster(filled); setSeries(null); setPicked(null);
    // 상대를 먼저 정한다 — 증강과 정비는 그 뒤에. 베이직은 탑, 스페셜은 매치업, 토너먼트는 대진표
    if (g) { prepareMatch(false, g); return; }
    if (tourMode) { setDtour(makeDraftTournament(filled)); setPhase('bracket'); return; }
    setOpponent(isNoCap(match.cap) ? specialAiRoster({ series: mode.series }) : aiDraft({ players: mode.players, cap: match.cap }));
    setPhase('ready'); // 상대 비교는 정비 화면 왼쪽 판(상대 · 선발 · 경계 타자 · 전력 비교 · 예상 승률)에서
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
  const [dtour, setDtour] = useState(null); // 경기 방식이 16 · 32강이면 이 판의 토너먼트 (저장하지 않음)
  const [tourEntry, setTourEntry] = useState(null); // 대진표에서 고른 이번 상대 (정비를 거쳐 경기로 들고 간다)
  /* 구단 정복 — 라이브 드래프트로 뽑은 판에서는 토너먼트 대신 일곱 구단을 약한 순서로 하나씩 친다 */
  const [gaunt, setGaunt] = useState(null);
  const tourMode = !!match.format && match.format !== 'single';
  const [board, setBoard] = useState(emptyBoard);
  const [half, setHalf] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logOpen, setLogOpen] = useState(false); // 결과 화면의 라인 스코어 · 문자 중계 창
  const [oppLabel, setOppLabel] = useState('상대'); // 이번 경기 상대 이름 — 결과 판 · 라인 스코어에
  const [toast, setToast] = useState(null);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState(null);
  const [record, setRecord] = useState({ w: 0, l: 0, d: 0 });
  const [speed, setSpeed] = useState(1);

  const speedRef = useRef(1);
  const runIdRef = useRef(0); // 값이 바뀌면 진행 중인 시뮬레이션은 스스로 중단
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => () => { runIdRef.current += 1; }, []);
  // 개발 전용 바로가기: ?demo=draft | ready | gauntlet | tourney16 · 32 · 64 | augment — 엔트리를 채워 그 단계 화면을 곧장 연다 (배포 빌드에서는 무시)
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
    if (demo === 'gauntlet') { // 라이브 판을 끝까지 자동으로 돌려 구단 정복 탑만 바로 본다
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
    if (demo === 'augment') { setPhase('sim'); setAugPicksLeft(SEASON_AUGMENTS); setChoice({ kind: 'augment', options: rollAugmentOptions(), free: FREE_REROLL }); }
    if (demo === 'memento') { setPhase('mode'); setMemento({ ...GAUNTLET_MEMENTO, options: aiDraft().filter((p) => p.overall >= 85).slice(0, 5), full: false }); } // 기념 카드 창만 바로
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
  /** 거르기 한 벌: { slot, pos } = 라인업 자리를 눌러 그 포지션만 · { group } = 위 포지션 탭 */
  const fitsFilter = (f, p) => !f || (f.pos ? p.position === f.pos : !f.group || GROUP_POS[f.group].includes(p.position));
  const shownCards = seriesCards.filter((p) => fitsFilter(posFilter, p));
  /** 내 라인업에서 아직 빈 필드 자리의 포지션 — 선반 카드 · 탭에 초록으로 */
  const needPos = useMemo(() => {
    const filled = new Set(withSlots(roster).map((p) => p.slot));
    return new Set(FIELD_SLOTS.filter((sl) => !filled.has(sl.id)).map((sl) => sl.pos));
  }, [roster]);
  const shelfCols = Math.max(17, seriesCards.length); // 칸 수는 이 보드 인원으로 고정 — 거르기를 해도 카드가 커지지 않는다
  /** 자리 거르기 바꾸기: 빠질 카드는 먼저 사라지고(0.18초) 남는 카드가 다시 차례로 떠오른다. slot=null 이면 해제 */
  const handleSlotFilter = (slot, force = false) => {
    const cur = pendingSlot !== undefined ? pendingSlot : (posFilter?.slot ?? null);
    const next = slot == null || (!force && cur === slot) ? null : { slot, pos: slotPos(slot) };
    if ((next?.slot ?? null) === cur && !posFilter?.group) return;
    applyShelfFilter(next);
  };
  /** 위 포지션 탭 — '전체' 면 거르기 해제 */
  const handleGroupFilter = (g) => {
    const next = g === '전체' ? null : { group: g };
    if (!posFilter?.slot && (posFilter?.group ?? null) === (next?.group ?? null)) return;
    applyShelfFilter(next);
  };
  const applyShelfFilter = (next) => {
    const keep = new Set(seriesCards.filter((p) => !hiddenCard(p)).filter((p) => fitsFilter(next, p)).map((p) => p.id));
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
    return rollAugmentOptions(owned);
  };
  /* 다시 굴리기 — 거저 주는 한 번을 먼저 쓰고, 떨어지면 리롤권을 쓴다 */
  const rerollAugments = () => {
    if (!choice || choice.kind !== 'augment') return;
    const roll = (c) => ({ ...c, options: rollAugmentOptions(augments) });
    if ((choice.free || 0) > 0) {
      setChoice((c) => (c && c.kind === 'augment' ? { ...roll(c), free: (c.free || 0) - 1 } : c));
      return;
    }
    if (!spendAugTicket('reroll')) return;
    setAugTickets(withAugTickets(augShopTickets()));
    setChoice((c) => (c && c.kind === 'augment' ? roll(c) : c));
  };
  const midPickRef = useRef(null); // 경기 중 증강 선택을 기다리는 resolve
  const [play, setPlay] = useState(null); // 그라운드 중계의 지금 타석
  const [liveTeams, setLiveTeams] = useState(null); // 중계 화면에 넘길 두 팀
  const planRef = useRef(null); // 정비 전략실에서 고른 계획 — 경기의 첫 전술
  /* 드래프트 기념 카드 — 한 판에 한 번 (draft/memento.js) */
  const [memento, setMemento] = useState(null);
  const [introFor, setIntroFor] = useState(null); // 등장 연출을 마친 결과 — 기념 카드 창은 그 뒤에 연다
  const mementoDone = useRef(new Set()); // 이 판에서 이미 준 기념 카드(이유별) — 구단 정복은 중간 · 완주 둘
  const openMemento = (rule) => {
    if (!rule || mementoDone.current.has(rule.why)) return;
    const me = loadAccount();
    if (!me) return;
    mementoDone.current.add(rule.why);
    const options = mementoOptions(roster, rule, (p) => ownsInAccount(asClubPlayer(p)));
    if (!options.length) return;
    setMemento({ ...rule, options, full: (me.team?.club || []).length >= CLUB_MAX });
  };
  /* 드래프트 판의 내 팀 이름 = 내 구단 이름(프로필에서 지은 것 · 없으면 감독 이름) */
  const myClub = useMemo(() => { const a = loadAccount(); return a?.team?.name || a?.nick || '내 팀'; }, []);
  const myTeam = useMemo(() => buildTeam(myClub, fillRoster(roster), buff), [roster, buff, myClub]);

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
    /* 고른 카드가 구장의 제 자리로 날아가 '합류(회색 → 색 채움)'로 이어진다 */
    flyGhost(document.querySelector(`[data-card="${CSS.escape(String(player.id))}"]`), () => document.querySelector('.lf-tok.joined, .lf-bc.joined'));
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
    if (g) { // 구단 정복: 원정길로 (끝났으면 정복 완료 판 — 다른 상대와의 경기로 새지 않게)
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
    setPhase('ready');
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
    const mine = { me: true, team: buildTeam(myClub, fillRoster(myRoster), buff, augments) };
    const order = seedByStrength([...others, mine], (e) => playStrength(e.team) + (e.team.buff || 0));
    const meAt = order.indexOf(mine);
    return makeTournament({ size, myName: myClub, others: order.filter((e) => e !== mine), meAt });
  };

  /* 구단 정복: 지금 칠 칸(내 바로 윗 칸)의 구단과 경기를 연다 */
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
    setPlay(null);
    const oppRoster = entry ? entry.roster
      : rematch && opponent ? opponent
        : isNoCap(match.cap) ? specialAiRoster({ series: mode.series }) : aiDraft({ players: mode.players, cap: match.cap });
    setOpponent(oppRoster);
    const opp = entry ? entry.team
      : buildTeam(isNoCap(match.cap) ? `${rosterOrigin(oppRoster)} 연합` : 'AI 올스타', fillRoster(oppRoster), AI_BUFF[match.ai]);
    setOppLabel(opp.name || '상대');
    setLogOpen(false);
    // 효과형 증강은 고르는 순간부터 능력치 · 투수 운용을 바꾼다 (상대 · 전적을 보는 증강까지)
    const env = teamEnv(opp, record);
    const makeMy = (augs) => Object.assign(buildTeam(myClub, fillRoster(roster), buff, augs, env), planRef.current ? { plan: { sides: planRef.current.sides } } : {});
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
    /* 주간 과제: 드래프트 경기도 센다 */
    bumpWeek('game');
    if (res.winner === 'my') bumpWeek('win');
    if ((res.gain || 0) >= 0.1) bumpWeek('gain10');
    bumpWeek('aug', (liveTeams?.aug?.list || []).length);
    setLiveTeams(null);
    if (gaunt && !gaunt.done) { // 구단 정복: 이기면 다음 단, 지면 같은 단을 다시
      const ng = Gaunt.settle(gaunt, { win: res.winner === 'my', my: res.score?.my, opp: res.score?.opp });
      setGaunt(ng);
      if (ng.done) openMemento(GAUNTLET_MEMENTO); // 구단 정복 완료
      else if (Gaunt.myPos(ng) >= GAUNTLET_MID_AT) openMemento(GAUNTLET_MID_MEMENTO); // 중간 보상 — 한 번만
      setRecord((r) => ({ w: r.w + (res.winner === 'my'), l: r.l + (res.winner === 'opp'), d: r.d + (res.winner === 'draw') }));
      setResult(res);
      setLogs(res.logs);
      setBoard(res.board);
      setPhase('result');
      return;
    }
    if (tourMode && dtour && !dtour.done) { // 토너먼트: 결과를 넣고 대진표로
      setTourEntry(null);
      const nt = advanceTourney(dtour, res.score, buildTeam(myClub, fillRoster(roster), buff, augments));
      setDtour(nt);
      if (nt.done) openMemento(tourneyMemento(nt.place, roundsOf(nt.size).length)); // 토너먼트가 끝났다
      setRecord((r) => ({ w: r.w + (res.winner === 'my'), l: r.l + (res.winner === 'opp'), d: r.d + (res.winner === 'draw') }));
      setPhase('bracket');
      return;
    }
    setResult(res);
    setLogs(res.logs);
    setBoard(res.board);
    setRecord((r) => ({ w: r.w + (res.winner === 'my'), l: r.l + (res.winner === 'opp'), d: r.d + (res.winner === 'draw') }));
    setPhase('result');
    if (res.winner === 'my') openMemento(SINGLE_MEMENTO); // 단판: 판의 첫 승리
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
    mementoDone.current = new Set(); setMemento(null);
    setRoster([]); setPicked(null); setReleased([]); setRound(1); setAutoFilled(0); setPosFilter(null); setCp(cfg.cap); setRerolls(START_REROLLS); setBuff(0); setAugments([]);
    /* 라이브: 8구단이 같은 보드를 나눠 갖는 판을 열고 첫 보드를 선반에 올린다 */
    const me = loadAccount();
    const banner = myBanner(); // 프로필에서 고른 배너 구단 — 내가 지명한 카드에 그 구단 그림이 뜬다
    setAugTickets(withAugTickets(augShopTickets()));
    setTickets(withDraftTickets(draftTickets()));
    setSeriesPick(false);
    const liveNow = cfg.live ? Live.createLive({
      cap: cfg.cap, series: m.series,
      myName: me?.team?.name || me?.nick || myClub,
      myShort: me?.nick,
      myColor: flagByKey(banner)?.color || '#e879f9',
      myEmblem: Live.bannerEmblem(banner),
      ai: cfg.ai,
    }) : null;
    setLive(liveNow); setClock(Live.PICK_SECONDS);
    const first = liveNow ? Live.currentSeries(liveNow) : rollSeries([], cfg.cap, null, [], m.series);
    setSeries(first); setSeenSeries(first ? [first.id] : []); setAugPicksLeft(0); setChoice(null);
    // 지난 판의 상대 · 탑 · 대진은 모두 버린다 (베이직을 하다 스페셜을 시작해도 구단 정복가 따라오지 않게)
    setOpponent(null); setDtour(null); setGaunt(null); setTourEntry(null); setSkipNote(false); setGone(new Set()); setShelfFilter('open');
    setBoard(emptyBoard()); setHalf(null); setLogs([]); setToast(null); setResult(null); setRecord({ w: 0, l: 0, d: 0 });
    setPhase('draft');
  };

  /* 시리즈 지정권 고르개에 올릴 목록 — 이번 모드의 시리즈 중 사람이 열 만한 것 */
  const seriesChoices = useMemo(() => (mode?.series || DRAFT_SERIES).filter((x) => x.players.length >= Live.BOARD_SIZE), [mode]);

  /* 지금 이 선수를 데려오는 값 — 협상 대리인을 켜 두었으면 깎인 값 */
  const costNow = (p) => (live ? Live.costOf(live, p, liveMine) : p.cost);

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
    <div className={`min-h-screen bg-[#05080f] font-sans text-gray-100 antialiased ${phase === 'draft' || phase === 'mode' || phase === 'ready' ? 'lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden' : ''}`}>
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
            <b className="font-display text-t2 tracking-[0.12em] text-[#fbbf24]">샐러리 캡 소진</b>
            <span className="h-4 w-px bg-white/20" />
            <b className="text-t3 text-[#e8ecf2]">남은 라운드 건너뜀</b>
          </div>
        </div>
      )}
      {phase === 'gauntlet' && gaunt && (
        <GauntletScreen gaunt={gaunt}
          me={{ name: live ? live.clubs[Live.myIndex(live)].name : myClub, short: live ? live.clubs[Live.myIndex(live)].short : '나', color: live ? live.clubs[Live.myIndex(live)].color : null, emblem: Live.bannerEmblem(myBanner()), stats: Gaunt.teamStats(roster) }}
          onBack={() => setPhase('ready')} onExit={newDraft} oppBuff={AI_BUFF[match.ai] || 0}
          onPlay={() => setPhase('ready')} />
      )}
      {phase === 'bracket' && dtour && (
        <div className="fixed inset-0 z-30">
          <TournamentBracket t={dtour} myTeam={buildTeam(myClub, fillRoster(roster), buff, augments)} title={`${mode.name} 토너먼트`} rewards={false} playLabel="정비하기 ▶"
            onBack={() => setPhase('ready')}
            onPlay={() => { const e = tourneyOpponent(dtour); setTourEntry(e); setOpponent(e?.roster || null); setPhase('ready'); }}
            onRestart={() => setDtour(makeDraftTournament())} />
        </div>
      )}

      {phase !== 'mode' && phase !== 'bracket' && phase !== 'gauntlet' && (
        <CapDashboard round={phase === 'draft' ? round : roster.length} cp={cp} cap={match.cap} roster={roster} phase={phase} onOpenRules={() => setModal('rules')} wide={phase === 'draft'} slim={phase === 'draft'} modeName={mode.name} modeNeon={mode.neon} series={phase === 'draft' ? series : null}
          onExit={onExit} capAfter={phase === 'draft' && picked ? (swapPlan ? (swapPlan.reason ? null : cp + swapPlan.refund - picked.cost) : (pickedReason ? null : cp - picked.cost)) : null} />
      )}

      {phase !== 'mode' && phase !== 'bracket' && phase !== 'gauntlet' && (
      <main className={`relative mx-auto grid px-4 ${phase === 'draft' || phase === 'ready'
        ? 'w-full max-w-[1920px] gap-3 py-3 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)]'
        : 'w-full max-w-[1600px] gap-5 py-5'}`}>
        <div className="flex min-w-0 flex-col gap-5 lg:min-h-0">
          {phase === 'draft' && (
            // --card-w: 선수 카드 폭의 상한(창 높이 기준). 실제 폭은 선반 그리드가 판 안쪽 폭을 17칸으로 나눠 정하고 가운데 정렬 — 좌우 여백이 늘 같다
            <section className="flex flex-col gap-3 lg:min-h-0 lg:flex-1" style={{ '--card-w': 'clamp(4.2rem, 13vh, 8rem)' }}>
              {!canPickAny && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-3">
                  <p className="text-t3 text-yellow-100">영입 가능한 선수 없음 · 빈 자리는 퓨처스 유망주(종합 70)</p>
                  <button type="button" className={btnPrimary} onClick={() => finishDraft(roster)}>이대로 정비 ▶</button>
                </div>
              )}
              {/* 시리즈 묶음: 한 줄 머리 + 선수 카드 (중계 그래픽 판) */}
              <div className={`bc-grp lg:!px-1.5 ${live && myTurnLit ? 'myturn' : ''}`}
                style={series ? { '--a': SERIES_NEON[series.kind], ...(live ? { '--me': live.clubs[liveMine].color } : {}) } : undefined}>
                <span className="bc-label font-display">영입 후보</span>
              {series && (
                /* 시리즈 머리: 윤곽선 연도 워터마크 · 종류 · 팀명(네온 밑줄) · 한 줄 설명 태그 | 선반 보기 전환 · 새로고침 */
                <div className="ser-hd relative mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 px-1.5 lg:flex-nowrap">
                  {!live && <DraftMeta round={round} cp={cp} cap={match.cap} capAfter={picked ? (swapPlan ? (swapPlan.reason ? null : cp + swapPlan.refund - costNow(picked)) : (pickedReason ? null : cp - costNow(picked))) : null} />}
                  <div className="ser-tabs" role="group" aria-label="포지션">
                    {['전체', ...Object.keys(GROUP_POS)].map((g) => {
                      const list = seriesCards.filter((p) => !hiddenCard(p) && (g === '전체' || GROUP_POS[g].includes(p.position)));
                      const on = g === '전체' ? !posFilter?.group && !posFilter?.slot : posFilter?.group === g;
                      const need = g !== '전체' && GROUP_POS[g].some((pos) => needPos.has(pos));
                      return (
                        <button key={g} type="button" className={on ? 'on' : ''} aria-pressed={on} onClick={() => handleGroupFilter(g)}>
                          {g}<small>{list.length}</small>{need && <i aria-label="빈 자리" />}
                        </button>
                      );
                    })}
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
                        {tickets.series > 0 && (
                          <>
                            <i className="dr-div" aria-hidden="true" />
                            <span className="dr-tk" role="group" aria-label="드래프트 권">
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
                  <p className="col-span-full py-6 text-center text-t3 text-gray-400">
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
                    hint={lockOf(p) ? null : hintFor(p)} need={!lockOf(p) && needPos.has(p.position)}
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
              <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[clamp(18rem,21vw,25rem)_minmax(0,1fr)_clamp(20rem,21vw,25rem)] lg:grid-rows-[minmax(0,1fr)]">
                <div className="bc-grp lg:min-h-0">
                  <span className="bc-label font-display">고른 선수</span>
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
                  {(picked || inspected) && <PickInfo player={picked || inspected.player} />}
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
                  <span className="bc-label font-display">포지션 배치</span>
                  <LineupField roster={roster} candidate={picked} candidateReason={pickedReason} onMove={handleMove} onInspect={handleInspect} onSlotFilter={handleSlotFilter} onClearCandidate={() => setPicked(null)} wantSlot={pendingSlot !== undefined ? pendingSlot : posFilter?.slot} draftView
                    highlight={focusIds} focusLabel={focused?.name} onClearFocus={() => setFocusSynergy(null)}
                    reserve={320} fill wide tapRef={lineupTapRef} className="lg:min-h-0 lg:flex-1"
                    overlay={<SynergyDock roster={roster} candidate={previewTarget} focusId={focusSynergy} onFocus={toggleFocus} onOpenAll={() => setModal('synergy')} />} />
                </div>
                {/* 팀 분석: 팀 분석 · 선수 기록 탭. 기록 줄을 누르면 필드에서 그 자리를 누른 것과 같다 */}
                <div className="bc-grp lg:flex lg:min-h-0 lg:flex-col">
                  <span className="bc-label font-display">팀 분석</span>
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
                restartLabel={inGauntlet ? '구단 정복 ◀' : special && tourMode ? '대진표로 ◀' : '다시 드래프트'}
                oppBuff={AI_BUFF[match.ai] || 0}
                onMove={handleMove} onOrder={handleOrder} onReplace={setRoster}
                onStart={(plan) => { planRef.current = plan || null; (inGauntlet ? startGauntletMatch : special ? startSpecialMatch : startSeason)(); }}
                onRestart={inGauntlet ? () => setPhase('gauntlet') : special && tourMode ? () => setPhase('bracket') : newDraft} />
            );
          })()}

          {(phase === 'sim' || phase === 'result') && (
            <>
              {result && (
                <MatchResult result={result} myName={myClub} oppName={oppLabel} onLog={() => setLogOpen(true)} onIntroEnd={() => setIntroFor(result)}
                  context={`드래프트 · ${mode.name}`}
                  tally={gaunt ? [
                    { k: '구단 정복', v: gaunt.done ? '완료' : `${Gaunt.myPos(gaunt)} / ${gaunt.tower.length - 1} 구단`, c: '#f5d27a' },
                    ...(!gaunt.done && Gaunt.currentRung(gaunt) ? [{ k: '다음 상대', v: Gaunt.currentRung(gaunt).short || Gaunt.currentRung(gaunt).name }] : []),
                    { k: '이 판 전적', v: `${record.w}승 ${record.l}패${record.d ? ` ${record.d}무` : ''}` },
                  ] : [
                    { k: '이 판 전적', v: `${record.w}승 ${record.l}패${record.d ? ` ${record.d}무` : ''}` },
                  ]}
                  actions={gaunt ? [
                    { label: '새 드래프트', onClick: newDraft },
                    { label: `${gaunt.done ? '구단 정복' : result.winner === 'my' ? '다음 구단' : '다시 도전'} ▶`, onClick: () => prepareMatch(true), pri: true },
                  ] : [
                    { label: '새 드래프트', onClick: newDraft },
                    { label: '새 상대와 경기', onClick: () => prepareMatch(false) },
                    { label: '같은 상대와 재경기 ▶', onClick: () => prepareMatch(true), pri: true },
                  ]} />
              )}

              {/* 라인 스코어 · 문자 중계 — 결과 판 아래로 길게 늘이지 않고(한 화면) 창으로 */}
              {logOpen && (
                <Modal eyebrow="경기 끝" title={`${myClub} vs ${oppLabel}`} onClose={() => setLogOpen(false)}>
                  <div className="flex flex-col gap-4">
                    <Scoreboard board={board} half={half} myName={myClub} oppName={oppLabel} />
                    <LiveLog logs={logs} paused={false} />
                  </div>
                </Modal>
              )}
            </>
          )}
        </div>

      </main>
      )}

      {seriesPick && live && (
        <Modal eyebrow="시리즈 지정권" title="다음 보드에 열 시리즈" onClose={() => setSeriesPick(false)}>
          <div className="mt-scroll grid max-h-[54vh] grid-cols-2 gap-1.5 overflow-y-auto pr-1">
            {seriesChoices.map((x) => (
              <button key={x.id} type="button" onClick={() => useSeriesTicket(x)}
                className="ui-cut flex items-center gap-3 bg-white/[0.05] px-3 py-2.5 text-left transition hover:bg-white/[0.1]" style={{ '--c': '8px' }}>
                <span className="font-display text-t3 text-[#fbbf24]">{x.year ?? '레전드'}</span>
                <span className="min-w-0">
                  <b className="block truncate text-t3 text-white">{x.title}</b>
                  <small className="block truncate text-t4 text-gray-400">{SERIES_KIND_LABEL[x.kind]} · {x.players.length}명</small>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === 'rules' && <RulesModal onClose={() => setModal(null)} />}
      {modal === 'synergy' && <SynergySheetModal roster={roster} candidate={previewTarget} focusId={focusSynergy} draft={phase === 'draft'} onClose={() => setModal(null)} onFocus={(id) => { setPicked(null); setFocusSynergy(id); setModal(null); }} />}
      <ChoiceOverlay choice={choice} onChoose={handleChoose} picksLeft={augPicksLeft} total={match.aug} rerolls={augTickets.reroll} onReroll={rerollAugments} />
      <MementoOverlay memento={phase === 'result' && result && introFor !== result ? null : memento} onTake={(p) => { if (addToClub(asClubPlayer(p))) bumpWeek('memento'); setMemento(null); }} onSkip={() => setMemento(null)} />
      {phase === 'live' && liveTeams && (
        <BroadcastGame my={liveTeams.my} opp={liveTeams.opp} aug={liveTeams.aug} rebuildMy={liveTeams.makeMy}
          midPickInnings={match.aug ? MID_AUG_INNINGS : []}
          onMidPick={(inning) => {
            const options = rollAugmentOptions(augments);
            if (!options.length) return null;
            return new Promise((resolve) => { midPickRef.current = resolve; setChoice({ kind: 'augment', inning, options }); });
          }}
          onFinish={finishLive} onExit={() => { setLiveTeams(null); setPhase(gaunt && !gaunt.done ? 'gauntlet' : tourMode ? 'bracket' : 'ready'); }} />
      )}
      <HighlightToast toast={toast} />
    </div>
  );
}
