import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SERIES } from './data/seriesPlayers.js';

/* ════════════════════════════════════════════════════════════════════
   KBO 드래프트 & 증강 시뮬레이터 — 단일 파일 (코어 엔진 + 대시보드 UI)
   ════════════════════════════════════════════════════════════════════ */

/* ───────────── 1. 규칙 상수 ───────────── */
export const SALARY_CAP = 900;
export const FOREIGN_LIMIT = 3;
export const SLOT_LIMITS = { SP: 3, RP: 1, C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 1, DH: 1 };
export const ROSTER_SIZE = Object.values(SLOT_LIMITS).reduce((a, b) => a + b, 0); // 11
export const POS_ORDER = ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'OF', 'DH'];
export const POS_LABEL = { SP: '선발', RP: '마무리', C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', OF: '외야수', DH: '지명타자' };
const SEASON_AUGMENTS = 2; // 엔트리를 모두 채운 뒤 시즌 개막 때 고르는 증강 수
const SERIES_KIND_LABEL = { team: '구단 시즌', national: '국가대표', legend: '레전드' };
const START_REROLLS = 3;

/* ───────────── 2. 선수 시드 데이터 ─────────────
   hand: 타자는 타석(L/R/S), 투수는 투구 손(L/R). 능력치는 40~99. */
const B = (id, name, year, team, position, hand, overall, [power, contact, speed, defense], o = {}) => ({
  id, name, year, team, position, hand, overall, type: 'batter',
  isNational: !!o.nat, isForeign: !!o.fgn, note: o.note || '', face: o.face,
  stats: { power, contact, speed, defense },
});
const P = (id, name, year, team, position, hand, overall, [stuff, control, stamina, stability], o = {}) => ({
  id, name, year, team, position, hand, overall, type: 'pitcher',
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
export function getLockReason(player, roster, cp) {
  if (roster.some((p) => p.id === player.id)) return '영입 완료';
  if (roster.some((p) => personKey(p) === personKey(player))) return '동일인 영입됨';
  if (roster.filter((p) => p.position === player.position).length >= SLOT_LIMITS[player.position]) return `${POS_LABEL[player.position]} 마감`;
  if (player.isForeign && roster.filter((p) => p.isForeign).length >= FOREIGN_LIMIT) return `외국인 한도 ${FOREIGN_LIMIT}/${FOREIGN_LIMIT}`;
  if (player.overall > cp) return `CP 부족 (${player.overall - cp} 모자람)`;
  return null;
}

/** 영입 가능한 선수가 한 명 이상 있는 시리즈 중 하나를 무작위로. 직전 시리즈는 가능하면 피한다. */
export function rollSeries(roster, cp, avoidId = null, rng = Math.random) {
  const open = DRAFT_SERIES.filter((s) => s.players.some((p) => !getLockReason(p, roster, cp)));
  const pool = open.length > 1 ? open.filter((s) => s.id !== avoidId) : open;
  return pool.length ? pickOne(rng, pool) : null;
}

/** 빈 자리를 퓨처스 유망주(능력치 55)로 채운다 */
export function fillRoster(roster) {
  const out = [...roster];
  for (const pos of POS_ORDER) {
    const need = SLOT_LIMITS[pos] - out.filter((p) => p.position === pos).length;
    for (let i = 0; i < need; i++) {
      const id = `rep-${pos}-${i}`;
      out.push(pos === 'SP' || pos === 'RP'
        ? { ...P(id, '퓨처스 유망주', 2026, '퓨처스', pos, 'R', 55, [55, 55, 60, 55]), isReplacement: true }
        : { ...B(id, '퓨처스 유망주', 2026, '퓨처스', pos, 'R', 55, [55, 55, 55, 55]), isReplacement: true });
    }
  }
  return out;
}

/** AI: 900 CP 안에서 남은 자리를 채울 여유분을 남기며 상위권 선수를 무작위로 고른다 */
export function aiDraft(rng = Math.random) {
  let roster = [];
  let cp = SALARY_CAP;
  for (const pos of shuffle(POS_ORDER.flatMap((p) => Array(SLOT_LIMITS[p]).fill(p)), rng)) {
    const slotsAfter = ROSTER_SIZE - roster.length - 1;
    const cands = ALL_PLAYERS.filter((p) => p.position === pos && !getLockReason(p, roster, cp) && cp - p.overall >= slotsAfter * 78)
      .sort((a, b) => b.overall - a.overall);
    const fallback = ALL_PLAYERS.filter((p) => p.position === pos && !getLockReason(p, roster, cp)).sort((a, b) => a.overall - b.overall);
    const choice = cands.length ? cands[Math.floor(rng() * Math.min(3, cands.length))] : fallback[0];
    if (choice) { roster = [...roster, choice]; cp -= choice.overall; }
  }
  return roster;
}

/* ───────────── 5. 시너지 체크 엔진 ───────────── */
const CLEANUP = ['이승엽', '이대호', '김동주'];
function dynastyGroup(roster) {
  const groups = {};
  roster.filter((p) => p.team !== KR && !p.isReplacement).forEach((p) => {
    const k = `${p.year} ${p.team}`;
    groups[k] = [...(groups[k] || []), p];
  });
  return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)[0] || ['', []];
}

export const SYNERGIES = [
  {
    id: 'beijing', name: '베이징 9전 전승', cond: '국가대표 4명 이상', effect: '전 선수 능력치 +3',
    progress: (r) => [r.filter((p) => p.isNational).length, 4], bonus: { bat: 3, pit: 3 },
  },
  {
    id: 'cleanup', name: '클린업 트리오', cond: '이승엽 · 이대호 · 김동주', effect: '타선 파워 +6',
    progress: (r) => [CLEANUP.filter((n) => r.some((p) => p.name === n)).length, 3], bonus: { power: 6 },
  },
  {
    id: 'mercenary', name: '용병 트리오', cond: '외국인 선수 3명', effect: '전 선수 능력치 +2',
    progress: (r) => [r.filter((p) => p.isForeign).length, 3], bonus: { bat: 2, pit: 2 },
  },
  {
    id: 'dynasty', name: '왕조의 기억', cond: '같은 팀·같은 연도 3명', effect: '수비 +4 · 투수 안정성 +4',
    progress: (r) => [dynastyGroup(r)[1].length, 3], bonus: { defense: 4, stability: 4 },
  },
];

export function checkSynergies(roster) {
  return SYNERGIES.map((s) => {
    const [cur, need] = s.progress(roster);
    return { ...s, cur: Math.min(cur, need), need, active: cur >= need };
  });
}

/* ───────────── 6. 팀 전력 산출 ───────────── */
export function buildTeam(name, roster, buff = 0) {
  const synergies = checkSynergies(roster);
  const bonus = { bat: buff, pit: buff, power: 0, defense: 0, stability: 0 };
  synergies.filter((s) => s.active).forEach((s) => Object.entries(s.bonus).forEach(([k, v]) => { bonus[k] += v; }));

  const batters = roster.filter((p) => p.type === 'batter');
  const sps = roster.filter((p) => p.position === 'SP').sort((a, b) => b.overall - a.overall);
  const rp = roster.find((p) => p.position === 'RP');
  const batValue = (p) => p.stats.contact * 0.4 + Math.min(99, p.stats.power + bonus.power) * 0.4 + p.stats.speed * 0.2;
  const handShare = (h) => (batters.length ? batters.reduce((s, p) => s + (p.hand === h ? 1 : p.hand === 'S' ? 0.5 : 0), 0) / batters.length : 0);

  return {
    name, roster, synergies, bonus, batters, sps, rp,
    offense: avg(batters.map(batValue)) + bonus.bat,
    defense: avg(batters.map((p) => p.stats.defense)) + bonus.defense,
    rightRatio: handShare('R'),
    pitchValue: (p) => p.stats.stuff * 0.4 + p.stats.control * 0.3 + Math.min(99, p.stats.stability + bonus.stability) * 0.3 + bonus.pit,
    topBatter: (stat) => [...batters].sort((a, b) => b.stats[stat] - a.stats[stat])[0],
  };
}

/** 이닝별 등판 투수: 에이스 → 2선발 → 9회 마무리 */
function pitcherFor(team, inning) {
  const ace = team.sps[0];
  const aceInnings = ace.stats.stamina >= 90 ? 7 : ace.stats.stamina >= 80 ? 6 : 5;
  if (inning === 9 && team.rp) return { pitcher: team.rp, tired: false };
  if (inning <= aceInnings) return { pitcher: ace, tired: inning === aceInnings };
  return { pitcher: team.sps[1] || ace, tired: !team.sps[1] };
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
    cond: '1~3회 수비 · 선발 종합 92+', desc: '40% 확률로 수비 이닝 무실점을 확정합니다. (경기당 2회)',
    when: (c) => c.inning <= 3 && c.myPitcher.overall >= 92,
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
@keyframes prism { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
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
/** 그림 파일이 있으면 경로, 없으면 null */
function useArt(player) {
  const src = player && !player.isReplacement ? `cards/${encodeURIComponent(player.id)}.webp` : null;
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
  const src = useArt(player);
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-md border border-white/25 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.9)] ${className}`}
      style={{ background: src ? `url(${src}) ${player.face || '50% 14%'} / 300% auto no-repeat, #111827` : `linear-gradient(150deg, ${teamColor(player)}, #111827 85%)` }}>
      {!src && <span className="absolute inset-0 grid place-items-center text-xl font-black text-white/75">{player.name[0]}</span>}
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
function CapDashboard({ round, cp, roster, rerolls, buff, phase }) {
  const pct = Math.max(0, Math.min(1, cp / SALARY_CAP));
  const fill = pct > 0.5 ? 'bg-[#10b981]' : pct > 0.2 ? 'bg-yellow-400' : 'bg-red-500';
  const cpText = pct > 0.5 ? 'text-[#10b981]' : pct > 0.2 ? 'text-yellow-300' : 'text-red-400';
  const foreign = roster.filter((p) => p.isForeign).length;
  const nat = roster.filter((p) => p.isNational).length;
  const phaseLabel = { draft: '드래프트', ready: '경기 준비', sim: '경기 중', result: '경기 종료' }[phase];

  return (
    <header className="sticky top-0 z-30 border-b border-gray-800 bg-[#111827]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3">
        <div className="leading-none">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500">KBO All-Time</p>
          <p className="mt-1 text-lg font-bold text-white">드래프트 &amp; 증강</p>
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

        <dl className="flex gap-5 text-center">
          {[
            ['외국인', `${foreign}/${FOREIGN_LIMIT}`, foreign >= FOREIGN_LIMIT],
            ['국가대표', nat, nat >= 4],
            ['새로고침', rerolls, false],
            ['팀 보정', buff >= 0 ? `+${buff}` : buff, buff > 0],
          ].map(([k, v, hot]) => (
            <div key={k}>
              <dt className="text-[11px] text-gray-500">{k}</dt>
              <dd className={`font-display text-xl font-bold tabular-nums ${hot ? 'text-[#10b981]' : 'text-gray-100'}`}>{v}</dd>
            </div>
          ))}
        </dl>
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
      aria-label={`${player.year} ${player.team} ${player.name}, ${POS_LABEL[player.position]}, 영입가 ${player.overall} CP${locked ? `, ${reason}` : ''}`}
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
                <span className="text-lg leading-none">{player.overall}</span>
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
  const rows = POS_ORDER.flatMap((pos) => {
    const mine = roster.filter((p) => p.position === pos);
    return Array.from({ length: SLOT_LIMITS[pos] }, (_, i) => ({ pos, key: `${pos}${i}`, player: mine[i] }));
  });
  const spent = roster.reduce((s, p) => s + p.overall, 0);
  return (
    <section className="rounded-lg border border-gray-800 bg-[#1f2937]/60 p-3">
      <PanelTitle aside={`${roster.length}/${ROSTER_SIZE} · ${spent} CP`}>나의 엔트리</PanelTitle>
      <ul className="flex flex-col gap-1">
        {rows.map(({ pos, key, player }) => (
          <li key={key} className={`flex items-center gap-2.5 rounded-md px-2 py-1 ${player ? 'bg-[#111827]' : 'border border-dashed border-gray-700'}`}>
            <span className="w-7 font-display text-sm font-bold text-gray-400">{pos}</span>
            {player ? (
              <>
                <FaceChip player={player} className="h-8 w-8" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{player.name}</span>
                  <span className="block font-display text-xs tabular-nums text-gray-500">{player.year} {player.team}</span>
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

function SynergyPanel({ roster }) {
  const list = checkSynergies(roster);
  return (
    <section className="rounded-lg border border-gray-800 bg-[#1f2937]/60 p-3">
      <PanelTitle aside={`${list.filter((s) => s.active).length} On`}>시너지</PanelTitle>
      <ul className="flex flex-col gap-1.5">
        {list.map((s) => (
          <li key={s.id} className={`rounded-md border px-2.5 py-2 ${s.active ? 'border-[#10b981]/60 bg-[#10b981]/10' : 'border-gray-700 bg-[#111827]'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-sm font-bold ${s.active ? 'text-[#10b981]' : 'text-gray-200'}`}>{s.name}</span>
              <span className="flex gap-0.5" aria-label={`${s.cur}/${s.need}`}>
                {Array.from({ length: s.need }, (_, i) => (
                  <i key={i} className={`h-2 w-3 rounded-sm ${i < s.cur ? (s.active ? 'bg-[#10b981]' : 'bg-gray-300') : 'bg-gray-700'}`} />
                ))}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-400"><span className="text-gray-300">[{s.cond}]</span> {s.effect}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AugmentShelf({ augments }) {
  return (
    <section className="rounded-lg border border-gray-800 bg-[#1f2937]/60 p-3">
      <PanelTitle aside={`${augments.length}/${SEASON_AUGMENTS}`}>보유 증강</PanelTitle>
      {augments.length === 0 ? (
        <p className="text-xs leading-relaxed text-gray-500">엔트리 {ROSTER_SIZE}명을 모두 뽑으면 시즌 개막과 함께 증강 {SEASON_AUGMENTS}개를 고릅니다.</p>
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

const RULES = ['SP 최대 3명', '그 외 포지션 1명', `외국인 최대 ${FOREIGN_LIMIT}명`, '동일인 1회만', '영입가 = 종합 능력치', `엔트리 완성 후 증강 ${SEASON_AUGMENTS}개`];

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
  const canPickAny = useMemo(() => ALL_PLAYERS.some((p) => !getLockReason(p, roster, cp)), [roster, cp]);
  const seriesCards = useMemo(() => (series
    ? [...series.players].sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position) || b.overall - a.overall)
    : []), [series]);
  const augmentOptions = (owned) => shuffle(AUGMENTS.filter((a) => !owned.some((x) => x.id === a.id))).slice(0, 3);
  const myTeam = useMemo(() => buildTeam('나의 드림팀', fillRoster(roster), buff), [roster, buff]);

  /* 드래프트 핸들러: 판정 레이어 → 영입 → 다음 라운드 / 증강 / 이벤트 */
  const handleSelectPlayer = useCallback((player) => {
    if (phase !== 'draft' || choice) return;
    const reason = getLockReason(player, roster, cp);
    if (reason) {
      setShake(player.id);
      setTimeout(() => setShake((s) => (s === player.id ? null : s)), 320);
      return;
    }
    const next = [...roster, player];
    const nextCp = cp - player.overall;
    setRoster(next);
    setCp(nextCp);
    if (next.length >= ROSTER_SIZE) {
      // 엔트리 완성 → 시즌 개막: 증강을 차례로 고른다
      setSeries(null);
      setPhase('ready');
      setAugPicksLeft(SEASON_AUGMENTS);
      setChoice({ kind: 'augment', options: augmentOptions(augments) });
    } else {
      setSeries(rollSeries(next, nextCp, series?.id));
    }
  }, [phase, choice, roster, cp, augments, series]);

  const handleChoose = (option) => {
    if (choice.kind === 'augment') {
      const owned = [...augments, option];
      const left = augPicksLeft - 1;
      setAugments(owned);
      setAugPicksLeft(left);
      setChoice(left > 0 ? { kind: 'augment', options: augmentOptions(owned) } : null);
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
    setSeries(rollSeries(roster, cp, series?.id));
  };

  /* 경기 시작: AI 드래프트 → 비동기 시뮬레이션 루프 */
  const startGame = async (rematch = false) => {
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
      my, opp, augments,
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
    setPhase('draft'); setRoster([]); setCp(SALARY_CAP); setRerolls(START_REROLLS); setBuff(0); setAugments([]);
    setSeries(rollSeries([], SALARY_CAP)); setAugPicksLeft(0); setChoice(null); setOpponent(null); setBoard(emptyBoard()); setHalf(null);
    setLogs([]); setToast(null); setResult(null); setRecord({ w: 0, l: 0, d: 0 });
  };

  const fireCount = (a) => logs.filter((l) => l.kind === 'augment' && l.text.startsWith(`[증강 발동: ${a.name}!]`)).length;
  const btn = 'rounded-md px-4 py-2.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] disabled:cursor-not-allowed disabled:opacity-40';
  const btnPrimary = `${btn} bg-[#10b981] text-[#062a1f] hover:bg-emerald-400`;
  const btnGhost = `${btn} border border-gray-600 bg-[#1f2937] text-gray-100 hover:border-gray-400`;

  return (
    <div className="min-h-screen bg-[#111827] font-sans text-gray-100 antialiased">
      <style>{KEYFRAMES}</style>
      <CapDashboard round={roster.length + (phase === 'draft' ? 1 : 0)} cp={cp} roster={roster} rerolls={rerolls} buff={buff} phase={phase} />

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          {phase === 'draft' && (
            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">시리즈 드래프트</h2>
                  <p className="mt-1 text-sm text-gray-400">라운드마다 시리즈 하나의 멤버 전원이 등장합니다. 한 명을 영입하면 다음 시리즈로 넘어갑니다.</p>
                </div>
                <button type="button" className={btnGhost} onClick={handleReroll} disabled={rerolls <= 0}>
                  다른 시리즈 <span className="ml-1 font-display tabular-nums text-gray-400">×{rerolls}</span>
                </button>
              </div>
              <ul className="mb-4 flex flex-wrap gap-1.5">
                {RULES.map((r) => <li key={r} className="rounded border border-gray-700 px-2 py-0.5 text-xs text-gray-400">{r}</li>)}
              </ul>
              {!canPickAny && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-3">
                  <p className="text-sm text-yellow-100">영입 가능한 선수가 남아 있지 않습니다. 빈 자리는 퓨처스 유망주(종합 55)로 채워집니다.</p>
                  <button type="button" className={btnPrimary} onClick={() => startGame()}>이대로 경기 시작</button>
                </div>
              )}
              {series && (
                <div key={series.id} className="mb-4 animate-[rise_.35s_ease-out_both] rounded-lg border border-gray-800 bg-[#1f2937]/60 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-[#10b981]/50 bg-[#10b981]/10 px-2 py-0.5 text-xs font-bold text-[#10b981]">{SERIES_KIND_LABEL[series.kind]}</span>
                    {series.subtitle && <span className="text-xs text-gray-400">{series.subtitle}</span>}
                    <span className="ml-auto font-display text-sm tabular-nums text-gray-400">
                      영입 가능 {seriesCards.filter((p) => !getLockReason(p, roster, cp)).length} / {seriesCards.length}명
                    </span>
                  </div>
                  <h3 className="mt-1.5 flex flex-wrap items-baseline gap-x-3 text-2xl font-black text-white">
                    {series.year && <span className="font-display text-3xl font-bold tabular-nums text-[#10b981]">{series.year}</span>}
                    {series.title}
                  </h3>
                  {series.blurb && <p className="mt-1 text-sm leading-relaxed text-gray-400">{series.blurb}</p>}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {seriesCards.map((p, i) => (
                  <PlayerCard key={p.id} player={p} reason={getLockReason(p, roster, cp)} shaking={shake === p.id}
                    onSelect={handleSelectPlayer} style={{ animationDelay: `${i * 30}ms` }} />
                ))}
              </div>
            </section>
          )}

          {phase === 'ready' && (
            <section className="rounded-xl border border-gray-800 bg-[#1f2937]/60 p-6">
              <p className="font-display text-sm font-semibold uppercase tracking-[0.35em] text-[#10b981]">Draft Complete</p>
              <h2 className="mt-2 text-3xl font-black text-white">엔트리 {ROSTER_SIZE}명 확정</h2>
              <p className="mt-2 text-sm text-gray-400">잔여 {cp} CP · 시너지와 팀 보정이 반영된 전력입니다. 상대는 같은 규칙으로 드래프트한 AI 올스타입니다.</p>
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
                <button type="button" className={btnPrimary} onClick={() => startGame()}>플레이볼</button>
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

        <aside className="flex flex-col gap-4 lg:sticky lg:top-[6.5rem] lg:self-start">
          <RosterPanel roster={roster} />
          <SynergyPanel roster={roster} />
          <AugmentShelf augments={augments} />
        </aside>
      </main>

      <ChoiceOverlay choice={choice} onChoose={handleChoose} />
      <HighlightToast toast={toast} />
    </div>
  );
}
