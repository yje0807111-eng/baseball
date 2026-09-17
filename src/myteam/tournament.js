/*
 * 토너먼트 — 16강 · 32강 · 64강. 언제든 새로 열 수 있고, 열 때마다 대진이 새로 정해진다.
 * 지금은 서버가 없어 참가 팀이 AI 시리즈 팀(구단 시즌 · 국가대표 · 레전드 멤버 그대로)이다. 나중에 다른 유저 팀 스냅샷을 받으면 entrantsFor() 만 바꿔 끼우면 된다
 * (유저 팀이 모자라면 남는 자리를 AI 팀으로 채운다).
 * 드래프트 모드는 참가 팀을 직접 만들어 넘긴다(entry.team) — 저장하지 않는 한 판짜리 토너먼트.
 * 내 경기는 중계 화면에서 직접 치르고, 나머지 경기는 같은 엔진으로 바로 계산한다. 비기면 팀 종합이 높은 쪽이 올라간다.
 */
import { buildMyTeam, teamRating } from './match.js';
import { AI_SERIES, seriesTeam, seriesName } from './aiTeam.js';
import { engineTeam } from '../BroadcastGame.jsx';
import { simulateGame } from '../engine/pitchSim.js';

export const SIZES = [16, 32, 64];

const ROUND_NAME = (n) => (n === 2 ? { ko: '결승', en: 'FINAL' } : n === 4 ? { ko: '4강', en: 'SEMIFINAL' } : n === 8 ? { ko: '8강', en: 'QUARTERFINAL' } : { ko: `${n}강`, en: `ROUND OF ${n}` });
/** 참가 수별 라운드: 64 → 64강 · 32강 · 16강 · 8강 · 4강 · 결승 */
export function roundsOf(size = 32) {
  const out = [];
  for (let n = size; n >= 2; n >>= 1) out.push({ key: `r${n}`, ...ROUND_NAME(n) });
  return out;
}

/* 최종 성적 보상: 뒤에서부터 우승 · 준우승 · 4강 … (큰 대회일수록 조금 더) */
const REWARD_TAIL = [
  { gold: 1200 }, { gold: 800 }, { gold: 500 }, { gold: 350 }, { gold: 200 }, { gold: 100 }, { gold: 60 },
];
const SIZE_MUL = { 16: 0.8, 32: 1, 64: 1.25 };
/** 최종 성적(0: 첫 라운드 탈락 … rounds−1: 준우승 · rounds: 우승)별 보상 */
export function finishOf(size = 32) {
  const rounds = roundsOf(size);
  const n = rounds.length;
  const mul = SIZE_MUL[size] || 1;
  return Array.from({ length: n + 1 }, (_, place) => ({
    ko: place === n ? '우승' : place === n - 1 ? '준우승' : `${rounds[place].ko} 탈락`,
    gold: Math.round((REWARD_TAIL[n - place]?.gold || 50) * mul / 10) * 10,
  }));
}

const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const seeded = (seed) => () => { // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const newKey = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
export const hashKey = hash;

export const OWNERS = ['홈런왕', '불펜장인', '도루머신', '직관러', '야구덕후', '9회말2아웃', '끝내기', '에이스', '포수리드', '타격왕', '무실점', '클러치', '번트장인', '골든글러브', '신인왕', '명승부'];
export const ownerOf = (rng) => `${OWNERS[Math.floor(rng() * OWNERS.length)]}${Math.floor(rng() * 90) + 10}`;

/** 참가 AI 팀 n개: 서로 다른 시리즈 (서버가 생기면 여기서 유저 팀 스냅샷을 먼저 넣고, 모자라는 자리만 AI 로 채운다) */
export function entrantsFor(key, n) {
  const rng = seeded(hash(`tourney:${key}`));
  const pool = [...AI_SERIES];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return Array.from({ length: n }, (_, i) => {
    const series = pool[i % pool.length];
    return {
      id: `ai-${i}`,
      seriesId: series.id,
      name: i < pool.length ? seriesName(series) : `${seriesName(series)} II`,
      owner: ownerOf(rng),
      seed: hash(`tourney:${key}:team:${i}`),
    };
  });
}

/** 새 대진: size 강 · 내 자리는 무작위. others 를 주면(드래프트 모드) 그 팀들로 채운다 */
export function makeTournament({ size = 32, myName = '나의 드림팀', key = newKey(), others = null } = {}) {
  const list = others || entrantsFor(key, size - 1);
  const rng = seeded(hash(`tourney:${key}:me`));
  const at = Math.floor(rng() * size);
  const entrants = [...list.slice(0, at), { id: 'me', name: myName, owner: '나', me: true }, ...list.slice(at, size - 1)];
  return { key, size, entrants, round: 0, winners: [], results: [], done: false, place: null, claimed: false };
}

const cache = new Map();
/** 참가 팀의 경기용 팀. AI 팀은 seed 로 언제든 같은 로스터를 다시 만든다. myTeam 은 라커 팀(squad) 또는 이미 만든 경기용 팀(roster) */
export function teamOf(entry, myTeam) {
  if (entry.me) return myTeam?.squad ? { ...buildMyTeam(myTeam), name: myTeam.name || entry.name } : myTeam;
  if (entry.team) return entry.team;
  if (!cache.has(entry.id + entry.seed)) {
    const series = AI_SERIES.find((x) => x.id === entry.seriesId) || AI_SERIES[entry.seed % AI_SERIES.length];
    cache.set(entry.id + entry.seed, { ...seriesTeam(series, seeded(entry.seed)), name: entry.name, owner: entry.owner });
  }
  return cache.get(entry.id + entry.seed);
}

/** 라운드 r 의 대진: 참가 순번 쌍 [[a, b], ...] */
export function pairsOf(t, r = t.round) {
  const list = r === 0 ? t.entrants.map((_, i) => i) : t.winners[r - 1] || [];
  const out = [];
  for (let i = 0; i + 1 < list.length; i += 2) out.push([list[i], list[i + 1]]);
  return out;
}

export const meIndex = (t) => t.entrants.findIndex((e) => e.me);
/** 이번 라운드 내 상대 (탈락했거나 끝났으면 null) */
export function myOpponent(t) {
  if (t.done) return null;
  const me = meIndex(t);
  const pair = pairsOf(t).find(([a, b]) => a === me || b === me);
  return pair ? t.entrants[pair[0] === me ? pair[1] : pair[0]] : null;
}

/** 비기면 팀 종합이 높은 쪽, 같으면 앞 순번 */
export const decide = (aRuns, bRuns, aTeam, bTeam) => {
  if (aRuns !== bRuns) return { aWin: aRuns > bRuns, tiebreak: false };
  return { aWin: teamRating(aTeam.roster) >= teamRating(bTeam.roster), tiebreak: true };
};

/** 두 팀 한 경기 계산 (a 홈) */
export function simulate(A, B, rng) {
  const g = simulateGame({ home: engineTeam(A), away: engineTeam(B), rng, maxInnings: 9 });
  return { as: g.home.runs, bs: g.away.runs };
}

/** 내 경기 결과(score: { my, opp })를 넣고 이번 라운드 나머지 경기를 계산해 다음 라운드로 */
export function advance(t, myScore, myTeam) {
  const r = t.round;
  const me = meIndex(t);
  const rounds = roundsOf(t.size || 32);
  const rng = seeded(hash(`tourney:${t.key || t.date}:round:${r}`));
  const results = pairsOf(t, r).map(([a, b]) => {
    const A = teamOf(t.entrants[a], myTeam), B = teamOf(t.entrants[b], myTeam);
    let as, bs;
    if (a === me || b === me) {
      as = a === me ? myScore.my : myScore.opp;
      bs = a === me ? myScore.opp : myScore.my;
    } else {
      ({ as, bs } = simulate(A, B, rng));
    }
    const { aWin, tiebreak } = decide(as, bs, A, B);
    return { a, b, as, bs, winner: aWin ? a : b, tiebreak };
  });
  const winners = results.map((x) => x.winner);
  const alive = winners.includes(me);
  const last = r === rounds.length - 1;
  return {
    ...t,
    results: [...t.results.slice(0, r), results],
    winners: [...t.winners.slice(0, r), winners],
    round: alive && !last ? r + 1 : r,
    done: !alive || last,
    place: !alive ? r : last ? rounds.length : null,
  };
}
