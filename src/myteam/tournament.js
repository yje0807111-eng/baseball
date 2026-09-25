/*
 * 토너먼트 — 16강 · 32강(64강은 고르는 칸에서 뺐고, 엔진은 그대로 받는다). 언제든 새로 열 수 있고, 열 때마다 대진이 새로 정해진다.
 * 지금은 서버가 없어 참가 팀이 AI 시리즈 팀(구단 시즌 · 국가대표 · 레전드 멤버 그대로)이다. 나중에 다른 유저 팀 스냅샷을 받으면 entrantsFor() 만 바꿔 끼우면 된다
 * (유저 팀이 모자라면 남는 자리를 AI 팀으로 채운다).
 * 드래프트 모드는 참가 팀을 직접 만들어 넘긴다(entry.team) — 저장하지 않는 한 판짜리 토너먼트.
 * 내 경기는 중계 화면에서 직접 치르고, 나머지 경기는 같은 엔진으로 바로 계산한다. 비기면 팀 종합이 높은 쪽이 올라간다.
 */
import { buildMyTeam, teamRating } from './match.js';
import { AI_SERIES, seriesTeam, seriesName } from './aiTeam.js';
import { engineTeam } from '../BroadcastGame.jsx';
import { simulateGame } from '../engine/pitchSim.js';
import { roundsOf, finishOf } from './rewards.js';

export { roundsOf, finishOf };

export const SIZES = [16, 32];

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

/** 새 대진: size 강 · 내 자리는 무작위(meAt 으로 정할 수 있다). others 를 주면(드래프트 모드) 그 팀들로 채운다 */
export function makeTournament({ size = 32, myName = '나의 드림팀', key = newKey(), others = null, meAt = null } = {}) {
  const list = others || entrantsFor(key, size - 1);
  const rng = seeded(hash(`tourney:${key}:me`));
  const at = meAt ?? Math.floor(rng() * size);
  const entrants = [...list.slice(0, at), { id: 'me', name: myName, owner: '나', me: true }, ...list.slice(at, size - 1)];
  return { key, size, entrants, round: 0, winners: [], results: [], done: false, place: null, claimed: false };
}

/**
 * 비슷한 전력끼리 첫 라운드에서 만나게: 팀 종합에 흔들림(jitter)을 조금 섞어 줄 세우고 → 위에서부터 두 팀씩 짝 → 짝의 자리는 섞는다.
 * 흔들림 덕에 늘 같은 짝이 되지는 않고, 강팀끼리 한쪽에 몰리지도 않는다
 */
export function seedByStrength(list, ratingOf, rng = Math.random, jitter = 6) {
  const ranked = list.map((x) => ({ x, r: ratingOf(x) + (rng() - 0.5) * jitter })).sort((a, b) => b.r - a.r).map((o) => o.x);
  const pairs = [];
  for (let i = 0; i < ranked.length; i += 2) pairs.push(ranked.slice(i, i + 2));
  for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
  return pairs.flat();
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

/**
 * 경기 엔진 기준 전력: 실제로 나서는 타순 9명의 컨택·파워 + 선발(55%) · 앞선 불펜 셋(45%)의 구위·제구.
 * 팀 종합(예비·유망주까지 평균)보다 승률과 잘 맞는다
 */
export function playStrength(team) {
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const s = (p, k, d) => p?.stats?.[k] ?? d;
  const e = engineTeam(team);
  const bat = avg(e.batters.map((p) => (s(p, 'contact', 70) + s(p, 'power', 70)) / 2));
  const pv = (p) => (s(p, 'stuff', 80) + s(p, 'control', 75)) / 2;
  const [ace, ...pen] = e.pitchers.slice(0, 4);
  const pit = pen.length ? pv(ace) * 0.55 + avg(pen.map(pv)) * 0.45 : pv(ace);
  return (bat + pit) / 2;
}

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
